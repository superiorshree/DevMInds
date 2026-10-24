# File:        backend/app/ai/__init__.py
# Owner:       Devyani
# Purpose:     AI module public interface — AIService with answer() and health()
# Contains:    AIAnswer/AIError re-exports from contracts, AIService, get_ai_service()
# Status:      REAL
# Depends on:  backend/app/core/config.py (get_settings),
#              backend/app/schemas/contracts.py (AIAnswer, AIError),
#              backend/app/ai/gateway.py, backend/app/ai/ollama_provider.py,
#              backend/app/ai/external_provider.py

from typing import Any, Dict, List, Literal

from app.core.config import get_settings
from app.schemas.contracts import AIAnswer, AIError
from app.ai.errors import PrivateAIUnavailable, ExternalNotAllowed, ProviderError
from app.ai.gateway import classify
from app.ai.ollama_provider import OllamaProvider
from app.ai.external_provider import ExternalLLMProvider

HealthStatus = Literal["up", "down", "model_missing", "not_configured"]


class AIService:
    """Answers questions about a repository, respecting the privacy rule.

    The backend decides everything from the saved session; the browser never
    picks a provider. Private data (private repo or any Jira/Slack/Confluence
    item) goes to the local Ollama ONLY. Public data uses the external AI.
    If the chosen provider is unavailable the answer is disabled with the
    matching error — we NEVER fall back to the other provider.
    """

    async def answer(
        self,
        question: str,
        repository_context: Any,
        company_context: List[Any],
        mode: str,
    ) -> AIAnswer:
        """Answer `question` about the given repository/company context.

        Args:
            question: the user's question (untrusted text — treat as data).
            repository_context: frozen RepositoryContext (or dict) with
                visibility, analysis and files.
            company_context: list of frozen CompanyItem (Jira/Slack/Confluence).
            mode: the server-side session mode ("open_source" or "company").

        Returns:
            AIAnswer with the text, provider and, on failure, an AIError
            using only the frozen codes: AI_DISABLED,
            PRIVATE_AI_UNAVAILABLE, EXTERNAL_AI_NOT_ALLOWED, PROVIDER_ERROR.
        """
        if not get_settings().ai_chat_enabled:
            return AIAnswer(
                error=AIError(code="AI_DISABLED", message="AI chat is disabled by configuration.")
            )

        if classify(repository_context, company_context) == "private":
            return await self._answer_private(question)
        return await self._answer_public(question)

    async def _answer_private(self, question: str) -> AIAnswer:
        """Private data → Ollama only. Never the external AI."""
        messages = [{"role": "user", "content": question}]
        try:
            text = await OllamaProvider().generate(messages)
            return AIAnswer(answer=text, provider="ollama")
        except PrivateAIUnavailable:
            return AIAnswer(
                provider="ollama",
                error=AIError(code="PRIVATE_AI_UNAVAILABLE", message=await self._private_hint()),
            )
        except ProviderError as exc:
            return AIAnswer(
                provider="ollama",
                error=AIError(code="PROVIDER_ERROR", message=exc.message),
            )

    async def _answer_public(self, question: str) -> AIAnswer:
        """Public data (no company items) → external AI only."""
        messages = [{"role": "user", "content": question}]
        try:
            text = await ExternalLLMProvider().generate(messages)
            return AIAnswer(answer=text, provider="external")
        except ExternalNotAllowed as exc:
            return AIAnswer(
                provider="external",
                error=AIError(code="EXTERNAL_AI_NOT_ALLOWED", message=exc.message),
            )
        except ProviderError as exc:
            return AIAnswer(
                provider="external",
                error=AIError(code="PROVIDER_ERROR", message=exc.message),
            )

    async def _private_hint(self) -> str:
        """Explain why Ollama failed, with the exact command to fix it."""
        if await OllamaProvider().health() == "model_missing":
            model = get_settings().ollama_model
            return f"Model '{model}' is not installed. Run `ollama pull {model}` and try again."
        return "Private AI is not running. Start Ollama on this laptop."

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
