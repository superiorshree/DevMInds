# File:        backend/app/ai/external_provider.py
# Owner:       Devyani
# Purpose:     External LLM provider — HTTP client to the hosted AI service
# Contains:    ExternalLLMProvider class with async generate() and async health()
# Status:      REAL
# Depends on:  backend/app/core/config.py (get_settings), backend/app/ai/errors.py, httpx

from typing import List

import httpx

from app.core.config import get_settings
from app.ai.base import BaseProvider
from app.ai.errors import ExternalNotAllowed, ProviderError

#: Short timeout for the health probe so a dead endpoint fails fast.
HEALTH_TIMEOUT_SECONDS = 5.0


class ExternalLLMProvider(BaseProvider):
    """Talks to the external (hosted) LLM over HTTP.

    Used for PUBLIC data only: a public repository with no company items.
    The API key lives in the backend .env and is NEVER sent anywhere else.
    Public answers use an OpenAI-compatible chat-completions endpoint.
    """

    def _is_configured(self) -> bool:
        """True when all three external settings are present."""
        settings = get_settings()
        return bool(
            settings.external_llm_base_url
            and settings.external_llm_api_key
            and settings.external_llm_model
        )

    async def generate(self, messages: List[dict]) -> str:
        """Send a chat-completions request to the external LLM.

        Raises ExternalNotAllowed when it is not configured and
        ProviderError for connection, timeout or HTTP failures.
        """
        settings = get_settings()
        if not self._is_configured():
            raise ExternalNotAllowed(
                "External AI is not configured. Set EXTERNAL_LLM_BASE_URL, "
                "EXTERNAL_LLM_API_KEY and EXTERNAL_LLM_MODEL in the backend .env."
            )
        payload = {"model": settings.external_llm_model, "messages": messages}
        headers = {
            "Authorization": f"Bearer {settings.external_llm_api_key}",
            "Content-Type": "application/json",
        }
        timeout = httpx.Timeout(float(settings.external_llm_timeout_seconds))
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                response = await client.post(
                    settings.external_llm_base_url, json=payload, headers=headers
                )
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]
            except httpx.HTTPError as exc:
                raise ProviderError(
                    code="PROVIDER_ERROR",
                    message=f"External AI request failed: {exc}",
                ) from exc
            except (KeyError, IndexError, TypeError) as exc:
                raise ProviderError(
                    code="PROVIDER_ERROR",
                    message=f"External AI returned an unexpected response: {exc}",
                ) from exc

    async def health(self) -> str:
        """Report the external LLM status.

        Returns:
            "up"             — the endpoint responded without a server error.
            "down"           — connection failed, timed out or HTTP >= 500.
            "not_configured" — settings are missing.
        """
        if not self._is_configured():
            return "not_configured"
        settings = get_settings()
        timeout = httpx.Timeout(HEALTH_TIMEOUT_SECONDS)
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                response = await client.get(settings.external_llm_base_url)
                return "up" if response.status_code < 500 else "down"
            except httpx.HTTPError:
                return "down"
