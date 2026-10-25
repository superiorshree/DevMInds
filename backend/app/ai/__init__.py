# File:        backend/app/ai/__init__.py
# Owner:       Devyani
# Purpose:     AI module public interface — AIService with answer() and health()
# Contains:    AIAnswer/AIError re-exports from contracts, AIService, get_ai_service()
# Status:      REAL
# Depends on:  backend/app/core/config.py (get_settings),
#              backend/app/schemas/contracts.py (AIAnswer, AIError),
#              backend/app/ai/gateway.py, backend/app/ai/ollama_provider.py,
#              backend/app/ai/external_provider.py, backend/app/agents/mentor.py

from typing import Any, Dict, List, Literal, Optional

from app.ai.external_provider import ExternalLLMProvider
from app.ai.ollama_provider import OllamaProvider
from app.core.config import get_settings
from app.schemas.contracts import AIAnswer, AIError

__all__ = ["AIAnswer", "AIError", "AIService", "get_ai_service"]
HealthStatus = Literal["up", "down", "model_missing", "not_configured"]


class AIService:
    """Answers questions about a repository, respecting the privacy rule.

    The backend decides everything from the saved session; the browser never
    picks a provider. Every provider call goes through gateway.complete(), which
    routes private data to Ollama ONLY, public data to the external AI, and
    removes secrets from the messages first. We NEVER fall back to the other
    provider.
    """

    def __init__(self, mentor_agent: Optional[Any] = None):
        self._mentor_agent = mentor_agent

    def _agent(self) -> Any:
        if self._mentor_agent is None:
            from app.agents.mentor import MentorAgent
            self._mentor_agent = MentorAgent()
        return self._mentor_agent

    async def answer(
        self,
        question: str,
        repository_context: Any,
        company_context: List[Any],
        mode: str,
    ) -> AIAnswer:
        """Answer `question` about the given repository/company context.

        Delegates orchestration to the Mentor Agent (retrieval, privacy classification,
        prompt construction, model completion, JSON validation, and citation resolution).

        Args:
            question: the user's question (untrusted text, treat as data).
            repository_context: frozen RepositoryContext (or dict) with
                visibility, analysis and files.
            company_context: list of frozen CompanyItem (Jira/Slack/Confluence).
            mode: the server-side session mode.

        Returns:
            AIAnswer with the text, sources, provider and, on failure, an AIError
            using only the frozen codes: AI_DISABLED,
            PRIVATE_AI_UNAVAILABLE, EXTERNAL_AI_NOT_ALLOWED, PROVIDER_ERROR.
        """
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

        from app.agents.mentor import answer_mentor_question
        return await answer_mentor_question(
            question=question,
            repository_context=repository_context,
            company_context=company_context,
            mode=mode,
        )

    async def health(self) -> Dict[str, HealthStatus]:
        """Report both providers: {"ollama": ..., "external": ...}.

        Status values: up | down | model_missing | not_configured.
        """
        return {
            "ollama": await OllamaProvider().health(),
            "external": await ExternalLLMProvider().health(),
        }


_AI_SERVICE = AIService()


def get_ai_service() -> AIService:
    """Return the shared AIService instance (singleton)."""
    return _AI_SERVICE
