# File:        backend/app/agents/mentor.py
# Owner:       Devyani
# Purpose:     Mentor agent that answers repo questions in plain English with cited sources (the "friendly mentor" behavior).
# Contains:    MentorAgent, answer_mentor_question(), prompt building, response parsing, and citation grounding.
# Status:      REAL — connects to gateway.complete(), respects privacy rules, and verifies cited sources.
# Depends on:  backend/app/ai/gateway.py, backend/app/ai/errors.py, backend/app/core/modes.py,
#              backend/app/schemas/contracts.py (AIAnswer, SourceRef, AIError, RepoFile, CompanyItem),
#              backend/app/schemas/common.py (ChatResponse, SourceLink)

"""Mentor agent.

Answers developer questions in plain English with grounded sources.
Follows DevMinds core principles:
1. The backend finds and verifies facts, the AI explains them.
2. Privacy routing: private repositories and company integration items
   are routed exclusively to Ollama and never leave the machine.
3. Secret filtering is enforced on all prompt data before leaving the machine.
4. Source citations must be grounded in verified repository files or company items.
"""

import json
import logging
import re
from pathlib import Path
from typing import Any, List, Optional, Union

from app.ai import gateway
from app.ai.errors import ExternalNotAllowed, PrivateAIUnavailable, ProviderError
from app.core.config import get_settings
from app.core.modes import UserMode
from app.schemas.contracts import (
    AIAnswer,
    AIError,
    CompanyItem,
    RepoFile,
    RepositoryContext,
    SourceRef,
)

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts"

PROMPT_FILES: dict[str, str] = {
    "open_source": "contributor_prompt.md",
    "company": "onboarding_prompt.md",
}


class MentorAgent:
    """Mentor Agent for DevMinds."""

    def __init__(self) -> None:
        pass

    async def answer(
        self,
        question: str,
        repository_context: Any,
        company_context: List[Any],
        mode: Union[UserMode, str] = "open_source",
    ) -> AIAnswer:
        """Answer a question about a repository, citing verified sources."""
        settings = get_settings()
        if not getattr(settings, "ai_chat_enabled", True):
            return AIAnswer(
                error=AIError(
                    code="AI_DISABLED",
                    message="AI chat is switched off on this server.",
                )
            )

        mode_str = mode.value if hasattr(mode, "value") else str(mode)
        is_private = gateway.classify(repository_context, company_context) == "private"
        provider_name = "ollama" if is_private else "external"

        # 1. Build messages with prompt and context
        messages = self._build_messages(question, repository_context, company_context, mode_str)

        # 2. Call gateway.complete
        try:
            raw_text = await gateway.complete(messages, repository_context, company_context)
        except PrivateAIUnavailable:
            hint = await self._private_hint()
            return AIAnswer(
                provider="ollama",
                error=AIError(code="PRIVATE_AI_UNAVAILABLE", message=hint),
            )
        except ExternalNotAllowed as exc:
            return AIAnswer(
                provider="external",
                error=AIError(code="EXTERNAL_AI_NOT_ALLOWED", message=exc.message),
            )
        except ProviderError as exc:
            return AIAnswer(
                provider=provider_name,
                error=AIError(code="PROVIDER_ERROR", message=exc.message),
            )

        # 3. Parse JSON or text
        answer_text, source_ids = self._parse_reply(raw_text)

        # 4. Ground sources against verified repository files and company items
        sources = self._ground_sources(
            source_ids=source_ids,
            answer_text=answer_text,
            repository_context=repository_context,
            company_context=company_context,
        )

        return AIAnswer(
            answer=answer_text,
            sources=sources,
            provider=provider_name,
        )

    def _build_messages(
        self,
        question: str,
        repository_context: Any,
        company_context: List[Any],
        mode_str: str,
    ) -> List[dict[str, str]]:
        """Construct prompt messages for the AI provider."""
        prompt_file = PROMPT_FILES.get(mode_str, "contributor_prompt.md")
        system_template = ""
        prompt_path = PROMPTS_DIR / prompt_file
        if prompt_path.is_file():
            system_template = prompt_path.read_text(encoding="utf-8")

        # Format facts
        facts = self._format_facts(repository_context, company_context, mode_str)
        facts_json = json.dumps(facts, indent=2)

        if system_template:
            filled_prompt = (
                system_template
                .replace("{mode_context_json}", json.dumps({"mode": mode_str}))
                .replace("{facts_json}", facts_json)
                .replace("{question}", question)
            )
            return [
                {"role": "system", "content": filled_prompt},
                {"role": "user", "content": question},
            ]

        # Fallback if prompt template is absent
        user_content = (
            f"Mode: {mode_str}\n"
            f"Verified Facts:\n{facts_json}\n\n"
            f"Question: {question}"
        )
        return [{"role": "user", "content": user_content}]

    def _format_facts(
        self,
        repository_context: Any,
        company_context: List[Any],
        mode_str: str,
    ) -> dict[str, Any]:
        """Convert repository and company context into facts JSON."""
        facts: dict[str, Any] = {}

        # Repository facts
        if hasattr(repository_context, "analysis") and isinstance(repository_context.analysis, dict):
            facts.update(repository_context.analysis)
        elif isinstance(repository_context, dict):
            analysis = repository_context.get("analysis", {})
            if isinstance(analysis, dict):
                facts.update(analysis)

        # File list
        files: List[Any] = []
        if hasattr(repository_context, "files"):
            files = getattr(repository_context, "files", []) or []
        elif isinstance(repository_context, dict):
            files = repository_context.get("files", []) or []

        file_list = []
        for f in files:
            path = getattr(f, "path", None) or (f.get("path") if isinstance(f, dict) else str(f))
            if path:
                file_list.append(path)
        if file_list and "files" not in facts:
            facts["files"] = file_list[:30]

        # Company items (only in company mode)
        if mode_str == "company" and company_context:
            jira_items = []
            confluence_items = []
            slack_items = []
            for item in company_context:
                st = getattr(item, "source_type", None) or (item.get("source_type") if isinstance(item, dict) else "")
                title = getattr(item, "title", None) or (item.get("title") if isinstance(item, dict) else "")
                url = getattr(item, "url", None) or (item.get("url") if isinstance(item, dict) else "")
                if st == "jira":
                    jira_items.append({"key": title, "title": title, "url": url})
                elif st == "confluence":
                    confluence_items.append({"title": title, "url": url})
                elif st == "slack":
                    slack_items.append({"title": title, "url": url})

            facts["related_context"] = {
                "jira_issues": jira_items,
                "confluence_pages": confluence_items,
                "slack_threads": slack_items,
            }

        return facts

    def _parse_reply(self, raw_text: str) -> tuple[str, list[str]]:
        """Extract answer string and cited source IDs from the AI response."""
        text = raw_text.strip()
        # Strip potential markdown code fence
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        candidate = match.group(1) if match else text

        try:
            data = json.loads(candidate)
            if isinstance(data, dict):
                ans = data.get("answer")
                sources = data.get("source_ids") or []
                if isinstance(ans, str) and ans.strip():
                    return ans.strip(), [str(s) for s in sources if s]
        except Exception:
            pass

        # If not JSON, return plain text
        return text, []

    def _ground_sources(
        self,
        source_ids: list[str],
        answer_text: str,
        repository_context: Any,
        company_context: List[Any],
    ) -> list[SourceRef]:
        """Convert source_ids and mentioned items into verified SourceRef objects."""
        sources: list[SourceRef] = []
        seen_titles: set[str] = set()

        files: List[Any] = []
        if hasattr(repository_context, "files"):
            files = getattr(repository_context, "files", []) or []
        elif isinstance(repository_context, dict):
            files = repository_context.get("files", []) or []

        # Map file paths
        for f in files:
            path = getattr(f, "path", None) or (f.get("path") if isinstance(f, dict) else str(f))
            url = getattr(f, "url", None) or (f.get("url") if isinstance(f, dict) else "")
            if not path:
                continue

            # Check if source_id matches or path mentioned in answer
            path_base = path.split("/")[-1]
            if any(sid.lower() in path.lower() for sid in source_ids) or path in answer_text or (len(path_base) > 5 and path_base in answer_text):
                if path not in seen_titles:
                    seen_titles.add(path)
                    sources.append(
                        SourceRef(
                            title=path_base or path,
                            url=url or f"https://github.com/{path}",
                            source_type="github",
                        )
                    )

        # Map company items
        if company_context:
            for item in company_context:
                title = getattr(item, "title", None) or (item.get("title") if isinstance(item, dict) else "")
                url = getattr(item, "url", None) or (item.get("url") if isinstance(item, dict) else "")
                st = getattr(item, "source_type", None) or (item.get("source_type") if isinstance(item, dict) else "unknown")
                if not title:
                    continue

                if any(sid.lower() in title.lower() for sid in source_ids) or title in answer_text:
                    if title not in seen_titles:
                        seen_titles.add(title)
                        sources.append(
                            SourceRef(
                                title=title,
                                url=url or "",
                                source_type=st,
                            )
                        )

        return sources

    async def _private_hint(self) -> str:
        """Friendly error hint when Ollama fails."""
        import app.ai as ai
        if await ai.OllamaProvider().health() == "model_missing":
            model = get_settings().ollama_model
            return f"Model '{model}' is not installed. Run `ollama pull {model}` and try again."
        return "Private AI is not running. Start Ollama on this laptop."


_MENTOR = MentorAgent()


def get_mentor_agent() -> MentorAgent:
    """Return shared MentorAgent singleton."""
    return _MENTOR


async def answer_mentor_question(
    question: str,
    repository_context: Any,
    company_context: List[Any],
    mode: Union[UserMode, str] = "open_source",
) -> AIAnswer:
    """Entry point for asking the Mentor Agent a question."""
    return await _MENTOR.answer(
        question=question,
        repository_context=repository_context,
        company_context=company_context,
        mode=mode,
    )
