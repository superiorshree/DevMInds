# File:        backend/app/ai/__init__.py
# Owner:       Devyani
# Purpose:     Stub AI module — to be replaced with real implementation.
# Contains:    get_ai_service() returning AIService with fake answer() and health(); re-exports the frozen
#              AIAnswer / AIError contracts from app.schemas.contracts (no local duplicates).
# Status:      STUB, to be replaced by Devyani (real providers live behind app/ai/base.py + gateway.py).
# Depends on:  backend/app/schemas/contracts.py (AIAnswer, AIError — frozen)
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
from app.ai import gateway
from app.ai.errors import PrivateAIUnavailable, ExternalNotAllowed, ProviderError
from app.ai.ollama_provider import OllamaProvider
from app.ai.external_provider import ExternalLLMProvider

# The frozen contract is the single definition: this module must never redeclare
# its own AIAnswer/AIError (duplicate interfaces drift out of sync).

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

    async def answer(
        self,
        question: str,
        repository_context: Any,
        company_context: List[Any],
        mode: str,
    ) -> AIAnswer:
        """Answer `question` about the given repository/company context.

        Args:
            question: the user's question (untrusted text, treat as data).
            repository_context: frozen RepositoryContext (or dict) with
                visibility, analysis and files.
            company_context: list of frozen CompanyItem (Jira/Slack/Confluence).
            mode: the server-side session mode.

        Returns:
            AIAnswer with the text, provider and, on failure, an AIError
            using only the frozen codes: AI_DISABLED,
            PRIVATE_AI_UNAVAILABLE, EXTERNAL_AI_NOT_ALLOWED, PROVIDER_ERROR.
        """
        if not get_settings().ai_chat_enabled:
            return AIAnswer(
                error=AIError(code="AI_DISABLED", message="AI chat is disabled by configuration.")
            )

        # Only used to label the answer. The gateway makes the real routing decision.
        is_private = gateway.classify(repository_context, company_context) == "private"
        provider_name = "ollama" if is_private else "external"

        # TODO(Devyani): build the real messages (system prompt + marked data
        # block + sources) when the Mentor task is written.
        messages = [{"role": "user", "content": question}]

        try:
            text = await gateway.complete(messages, repository_context, company_context)
            return AIAnswer(answer=text, provider=provider_name)
        except PrivateAIUnavailable:
            return AIAnswer(
                provider="ollama",
                error=AIError(code="PRIVATE_AI_UNAVAILABLE", message=await self._private_hint()),
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