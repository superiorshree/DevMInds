# File:        backend/app/ai/ollama_provider.py
# Owner:       Devyani
# Purpose:     Ollama provider — HTTP client to the employee's local Ollama
# Contains:    OllamaProvider class with async generate() and async health()
# Status:      REAL
# Depends on:  backend/app/core/config.py (get_settings), backend/app/ai/errors.py, httpx

from typing import List

import httpx

from app.core.config import get_settings
from app.ai.base import BaseProvider
from app.ai.errors import PrivateAIUnavailable

#: Short timeout for the health probe so a dead Ollama fails fast.
HEALTH_TIMEOUT_SECONDS = 5.0


class OllamaProvider(BaseProvider):
    """Talks to the local Ollama instance over HTTP.

    We do NOT build or bundle Ollama. Every employee installs it themselves;
    this class only sends requests to {OLLAMA_BASE_URL}, which defaults to
    http://localhost:11434. Private company data goes here ONLY.
    """

    def _chat_url(self) -> str:
        """The Ollama non-streaming chat endpoint."""
        return f"{get_settings().ollama_base_url}/api/chat"

    def _tags_url(self) -> str:
        """The Ollama tags endpoint, used to check models."""
        return f"{get_settings().ollama_base_url}/api/tags"

    async def generate(self, messages: List[dict]) -> str:
        """Send a chat request to Ollama and return the answer text.

        Raises PrivateAIUnavailable when Ollama is unreachable, times out
        or answers with an HTTP error — the caller must NOT try another
        provider for private data.
        """
        settings = get_settings()
        payload = {
            "model": settings.ollama_model,
            "messages": messages,
            "stream": False,
        }
        timeout = httpx.Timeout(float(settings.ollama_timeout_seconds))
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                response = await client.post(self._chat_url(), json=payload)
                response.raise_for_status()
                return response.json()["message"]["content"]
            except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError) as exc:
                raise PrivateAIUnavailable(
                    f"Private AI is not running or not reachable: {exc}"
                ) from exc

    async def health(self) -> str:
        """Check Ollama and the configured model.

        Returns:
            "up"             — Ollama answers and the model is installed.
            "down"           — connection failed or Ollama returned an error.
            "model_missing"  — Ollama is up but does not have the model.
            "not_configured" — OLLAMA_BASE_URL is empty.
        """
        settings = get_settings()
        if not settings.ollama_base_url:
            return "not_configured"
        timeout = httpx.Timeout(HEALTH_TIMEOUT_SECONDS)
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                response = await client.get(self._tags_url())
                response.raise_for_status()
            except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError):
                return "down"
            model_names = [model["name"] for model in response.json().get("models", [])]
            if settings.ollama_model not in model_names:
                return "model_missing"
            return "up"
