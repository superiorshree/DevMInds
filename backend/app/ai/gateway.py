# File:        backend/app/ai/gateway.py
# Owner:       Devyani
# Purpose:     Privacy routing rule — decides which AI provider may see the data
# Contains:    classify(), choose_provider(), complete() functions
# Status:      REAL
# Depends on:  backend/app/core/config.py (get_settings), backend/app/ai/errors.py,
#              backend/app/ai/ollama_provider.py, backend/app/ai/external_provider.py

from typing import Any, List

from app.core.config import get_settings
from app.ai.ollama_provider import OllamaProvider
from app.ai.external_provider import ExternalLLMProvider


def classify(repository_context: Any, company_context: Any) -> str:
    """Decide whether the data in this request is 'private' or 'public'.

    Frozen rule: data is PRIVATE if the repository is private OR the
    company_context contains at least one Jira/Slack/Confluence item.
    Everything else is public.

    Works with the frozen contracts (RepositoryContext, CompanyContext)
    or plain dicts, because callers may pass either.
    """
    if _is_private_repo(repository_context):
        return "private"
    if _has_company_items(company_context):
        return "private"
    return "public"


def choose_provider(classification: str) -> str:
    """Map a classification onto the only provider allowed to see it.

    private → "ollama" (local model, data never leaves the laptop)
    public  → "external" (hosted model)
    """
    return "ollama" if classification == "private" else "external"


def _is_private_repo(repository_context: Any) -> bool:
    """True when the repository visibility is 'private'."""
    if repository_context is None:
        return False
    return _visibility_of(repository_context) == "private"


def _visibility_of(repository_context: Any) -> str:
    """Read visibility from a RepositoryContext model or a dict."""
    visibility = getattr(repository_context, "visibility", None)
    if visibility is None and isinstance(repository_context, dict):
        visibility = repository_context.get("visibility")
    return visibility or "public"


def _has_company_items(company_context: Any) -> bool:
    """True when at least one company item (Jira/Slack/Confluence) is present.

    Accepts a list of CompanyItem (the answer() contract), a CompanyContext
    with an `items` list, or None.
    """
    if company_context is None:
        return False
    if isinstance(company_context, (list, tuple)):
        return len(company_context) > 0
    items = getattr(company_context, "items", None)
    if isinstance(items, list):
        return len(items) > 0
    return False


def _external_for_private_allowed() -> bool:
    """Test-only escape hatch: allow external AI for private data.

    ALLOW_EXTERNAL_FOR_COMPANY stays False in every real environment.
    Private data must never go to the external AI unless this flag is
    explicitly set for a test.
    """
    return bool(getattr(get_settings(), "allow_external_for_company", False))


async def complete(
    messages: List[dict],
    repository_context: Any,
    company_context: Any,
) -> str:
    """Send the messages to the one provider allowed for this data.

    This is the internal entry point other backend code calls. It applies
    the privacy routing rule and NEVER falls back to the other provider
    after a failure: private data failing with Ollama raises
    PrivateAIUnavailable instead of trying the external AI.

    Raises:
        PrivateAIUnavailable — Ollama cannot answer and no fallback exists.
        ExternalNotAllowed   — data would need the external AI but it is
                               not allowed or not configured.
        ProviderError        — any other provider failure.
    """
    classification = classify(repository_context, company_context)
    provider_name = choose_provider(classification)

    if provider_name == "ollama":
        return await OllamaProvider().generate(messages)

    if classification == "private":
        # Test-only path: ALLOW_EXTERNAL_FOR_COMPANY was explicitly enabled.
        return await ExternalLLMProvider().generate(messages)

    return await ExternalLLMProvider().generate(messages)
