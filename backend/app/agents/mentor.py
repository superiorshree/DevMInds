# File:        backend/app/agents/mentor.py
# Owner:       Devyani
# Purpose:     Mentor agent that turns a user's repository question into a concise,
#              evidence-grounded answer with validated source references.
# Contains:    MentorAgent, get_private_ai_hint()
# Status:      REAL
# Depends on:  backend/app/ai/gateway.py, backend/app/ai/errors.py,
#              backend/app/ai/ollama_provider.py, backend/app/core/config.py,
#              backend/app/services/context_retrieval.py,
#              backend/app/services/ai_response.py,
#              backend/app/schemas/contracts.py

"""Mentor agent for DevMinds codebase questions.

Orchestration pipeline:
1. Prepare mode-appropriate context (company items allowed only in 'company' mode).
2. Retrieve relevant evidence using keyword-based retrieval.
3. Classify request and determine provider routing via the AI gateway.
4. Build safe model messages with untrusted-data context blocks and citation instructions.
5. Call gateway.complete() once (never fallback, secret-filtering enforced).
6. Parse and strictly validate the model's JSON response.
7. Resolve source IDs against retrieved items using sources_from_ids().
8. Return the established AIAnswer contract with validated sources or a recognized error.
"""

from __future__ import annotations

import json
from typing import Any, Literal, Union

from app.ai import gateway
from app.ai.errors import ExternalNotAllowed, PrivateAIUnavailable, ProviderError
from app.ai.ollama_provider import OllamaProvider
from app.core.config import get_settings
from app.schemas.contracts import (
    AIAnswer,
    AIError,
    CompanyItem,
    RepoFile,
    SourceRef,
)
from app.services.ai_response import build_messages, sources_from_ids
from app.services.context_retrieval import retrieve

_UNANSWERABLE_FALLBACK: str = (
    "I cannot find the answer in the provided repository facts."
)


async def get_private_ai_hint() -> str:
    """Explain why Ollama failed, with the exact command to fix it if model missing."""
    import app.ai as ai_module
    ollama_cls = getattr(ai_module, "OllamaProvider", OllamaProvider)
    if await ollama_cls().health() == "model_missing":
        model = get_settings().ollama_model
        return f"Model '{model}' is not installed. Run `ollama pull {model}` and try again."
    return "Private AI is not running. Start Ollama on this laptop."


def _normalize_repo_context(repository_context: Any) -> Any:
    """Ensure repository_context has a files attribute or dictionary key."""
    if repository_context is None:
        return {"visibility": "public", "files": []}
    if isinstance(repository_context, dict):
        return repository_context
    if not hasattr(repository_context, "files"):
        return {
            "visibility": getattr(repository_context, "visibility", "public"),
            "analysis": getattr(repository_context, "analysis", {}),
            "files": [],
        }
    return repository_context


def _normalize_company_items(company_context: Any, mode: str) -> list[CompanyItem]:
    """Extract and adapt CompanyItem list, strictly filtered by server-side mode.

    Company context items must NEVER enter retrieval or prompt context when
    mode is 'open_source'.
    """
    if mode != "company" or not company_context:
        return []
    raw_items: list[Any] = []
    if isinstance(company_context, (list, tuple)):
        raw_items = list(company_context)
    else:
        items = getattr(company_context, "items", None)
        if isinstance(items, list):
            raw_items = list(items)
        elif isinstance(company_context, dict):
            items_dict = company_context.get("items")
            if isinstance(items_dict, list):
                raw_items = list(items_dict)

    normalized: list[CompanyItem] = []
    for it in raw_items:
        if isinstance(it, CompanyItem):
            normalized.append(it)
        elif isinstance(it, dict):
            normalized.append(CompanyItem(**it))
        else:
            # Stand-in or duck-typed object (e.g. _CompanyItem in test_gateway.py)
            normalized.append(
                CompanyItem(
                    source_type=getattr(it, "source_type", "jira"),
                    title=getattr(it, "title", "company item"),
                    content=getattr(it, "content", ""),
                    url=getattr(it, "url", "https://example.com/company_item"),
                    metadata=getattr(it, "metadata", {}),
                )
            )
    return normalized


def _parse_and_validate_response(text: str) -> tuple[str, list[str]]:
    """Parse model output as strict JSON and validate required fields.

    Rejects:
    - Non-JSON or malformed text (including markdown fences)
    - Top-level values that are not objects
    - Missing, non-string, or empty 'answer'
    - Missing, non-list, or invalid 'source_ids'
    - Non-string items inside 'source_ids'
    """
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, TypeError) as exc:
        raise ProviderError(
            code="PROVIDER_ERROR",
            message=f"Model response was not valid JSON: {exc}",
        ) from exc

    if not isinstance(data, dict):
        raise ProviderError(
            code="PROVIDER_ERROR",
            message="Model response must be a JSON object.",
        )

    answer = data.get("answer")
    if not isinstance(answer, str) or not answer.strip():
        raise ProviderError(
            code="PROVIDER_ERROR",
            message="Model response must contain a non-empty string 'answer'.",
        )

    source_ids = data.get("source_ids")
    if not isinstance(source_ids, list):
        raise ProviderError(
            code="PROVIDER_ERROR",
            message="Model response must contain a 'source_ids' list.",
        )

    if not all(isinstance(sid, str) for sid in source_ids):
        raise ProviderError(
            code="PROVIDER_ERROR",
            message="Model source_ids must contain only strings.",
        )

    return answer.strip(), source_ids


class MentorAgent:
    """Orchestrates question answering grounded in repository and company context."""

    async def answer(
        self,
        question: str,
        repository_context: Any,
        company_context: Any,
        mode: str,
    ) -> AIAnswer:
        """Answer a question about the repository using evidence-grounded AI completion.

        Args:
            question: The user's question (untrusted text, treated as data).
            repository_context: RepositoryContext model or dict containing files and visibility.
            company_context: CompanyContext, list of CompanyItem, or None.
            mode: Server-side mode ('open_source' or 'company').

        Returns:
            AIAnswer with the answer, verified sources, actual provider, or an AIError.
        """
        # Guard: AI chat disabled
        if not get_settings().ai_chat_enabled:
            return AIAnswer(
                answer=None,
                sources=[],
                provider=None,
                error=AIError(
                    code="AI_DISABLED",
                    message="AI chat is disabled by configuration.",
                ),
            )

        # 1. Prepare mode-appropriate context
        normalized_repo = _normalize_repo_context(repository_context)
        effective_company_items = _normalize_company_items(company_context, mode)

        # 2. Retrieve relevant evidence
        retrieved_files, retrieved_items = retrieve(
            question=question,
            repository_context=normalized_repo,
            company_context=effective_company_items,
            mode=mode,
        )
        used: list[Union[RepoFile, CompanyItem]] = [*retrieved_files, *retrieved_items]

        # 3. Apply privacy classification and provider routing
        classification = gateway.classify(normalized_repo, effective_company_items)
        provider_name: Literal["ollama", "external"] = gateway.choose_provider(classification)

        # 4. Build prompt messages
        messages = build_messages(question, retrieved_files, retrieved_items)

        # 5. Call gateway.complete() once and parse/validate
        try:
            raw_text = await gateway.complete(
                messages, normalized_repo, effective_company_items
            )
            answer_text, source_ids = _parse_and_validate_response(raw_text)
        except PrivateAIUnavailable:
            return AIAnswer(
                answer=None,
                sources=[],
                provider="ollama",
                error=AIError(
                    code="PRIVATE_AI_UNAVAILABLE",
                    message=await get_private_ai_hint(),
                ),
            )
        except ExternalNotAllowed as exc:
            return AIAnswer(
                answer=None,
                sources=[],
                provider="external",
                error=AIError(
                    code="EXTERNAL_AI_NOT_ALLOWED",
                    message=exc.message,
                ),
            )
        except ProviderError as exc:
            return AIAnswer(
                answer=None,
                sources=[],
                provider=provider_name,
                error=AIError(
                    code="PROVIDER_ERROR",
                    message=exc.message,
                ),
            )

        # 6 & 7. Handle unanswerable responses and resolve source IDs
        if answer_text == _UNANSWERABLE_FALLBACK:
            return AIAnswer(
                answer=answer_text,
                sources=[],
                provider=provider_name,
            )

        sources = sources_from_ids(source_ids, used)
        return AIAnswer(
            answer=answer_text,
            sources=sources,
            provider=provider_name,
        )
