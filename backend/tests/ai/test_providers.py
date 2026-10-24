# File:        backend/tests/ai/test_providers.py
# Owner:       Devyani
# Purpose:     Tests for the Ollama and external LLM providers (all HTTP mocked)
# Contains:    pytest.mark.asyncio tests for OllamaProvider.generate/health and
#              ExternalLLMProvider.generate/health
# Status:      REAL
# Depends on:  backend/app/ai/ollama_provider.py, backend/app/ai/external_provider.py,
#              backend/app/ai/errors.py, backend/app/core/config.py

"""Provider tests.

No test talks to a real server: httpx.AsyncClient is fully mocked and the
settings are replaced per fixture. Ollama defaults to
http://localhost:11434 — we never build or bundle Ollama itself.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.ai.ollama_provider import OllamaProvider
from app.ai.external_provider import ExternalLLMProvider
from app.ai.errors import PrivateAIUnavailable, ExternalNotAllowed, ProviderError


def _mock_client(*, post=None, get=None):
    """Build a fake httpx.AsyncClient factory whose post/get do the given work."""
    client = AsyncMock()
    if post is not None:
        client.post = post
    if get is not None:
        client.get = get
    cm = AsyncMock()
    cm.__aenter__ = AsyncMock(return_value=client)
    cm.__aexit__ = AsyncMock(return_value=False)
    return MagicMock(return_value=cm), client


def _json_response(payload: dict) -> AsyncMock:
    """A fake httpx response whose .json()/.raise_for_status() are synchronous."""
    response = AsyncMock()
    response.json = MagicMock(return_value=payload)
    response.raise_for_status = MagicMock()
    return response


@pytest.fixture
def ollama_settings():
    """Patch OllamaProvider's settings accessor for a test."""
    fake = SimpleNamespace(
        ollama_base_url="http://localhost:11434",
        ollama_model="llama3.2:3b",
        ollama_timeout_seconds=5,
    )
    with patch("app.ai.ollama_provider.get_settings", lambda: fake):
        yield fake


@pytest.fixture
def external_settings():
    """Patch ExternalLLMProvider's settings accessor for a test."""
    fake = SimpleNamespace(
        external_llm_base_url="https://api.example.com/v1/chat/completions",
        external_llm_api_key="test-key",
        external_llm_model="gpt-test",
        external_llm_timeout_seconds=5,
    )
    with patch("app.ai.external_provider.get_settings", lambda: fake):
        yield fake


class TestOllamaProvider:
    """Tests for OllamaProvider."""

    @pytest.mark.asyncio
    async def test_generate_returns_message_content(self, ollama_settings):
        """generate() returns message.content from the chat response."""
        factory, client = _mock_client(
            post=AsyncMock(return_value=_json_response({"message": {"content": "hi"}}))
        )
        with patch("app.ai.ollama_provider.httpx.AsyncClient", factory):
            text = await OllamaProvider().generate([{"role": "user", "content": "q"}])
        assert text == "hi"
        # The request must target the local Ollama chat endpoint.
        url = client.post.call_args[0][0]
        assert url == "http://localhost:11434/api/chat"
        payload = client.post.call_args[1]["json"]
        assert payload["model"] == "llama3.2:3b"
        assert payload["stream"] is False

    @pytest.mark.asyncio
    async def test_generate_connect_error_raises_private_unavailable(self, ollama_settings):
        """A connection error becomes PrivateAIUnavailable, not a fallback."""
        factory, _ = _mock_client(post=AsyncMock(side_effect=httpx.ConnectError("no host")))
        with patch("app.ai.ollama_provider.httpx.AsyncClient", factory):
            with pytest.raises(PrivateAIUnavailable):
                await OllamaProvider().generate([{"role": "user", "content": "q"}])

    @pytest.mark.asyncio
    async def test_generate_timeout_raises_private_unavailable(self, ollama_settings):
        """A timeout becomes PrivateAIUnavailable."""
        factory, _ = _mock_client(post=AsyncMock(side_effect=httpx.TimeoutException("slow")))
        with patch("app.ai.ollama_provider.httpx.AsyncClient", factory):
            with pytest.raises(PrivateAIUnavailable):
                await OllamaProvider().generate([{"role": "user", "content": "q"}])

    @pytest.mark.asyncio
    async def test_health_up_when_model_present(self, ollama_settings):
        """health() is 'up' when the model appears in /api/tags."""
        factory, _ = _mock_client(
            get=AsyncMock(
                return_value=_json_response({"models": [{"name": "llama3.2:3b"}]})
            )
        )
        with patch("app.ai.ollama_provider.httpx.AsyncClient", factory):
            assert await OllamaProvider().health() == "up"

    @pytest.mark.asyncio
    async def test_health_model_missing_when_absent(self, ollama_settings):
        """health() is 'model_missing' when the model is not installed."""
        factory, _ = _mock_client(
            get=AsyncMock(return_value=_json_response({"models": [{"name": "other"}]}))
        )
        with patch("app.ai.ollama_provider.httpx.AsyncClient", factory):
            assert await OllamaProvider().health() == "model_missing"

    @pytest.mark.asyncio
    async def test_health_down_on_connect_error(self, ollama_settings):
        """health() is 'down' when Ollama cannot be reached."""
        factory, _ = _mock_client(get=AsyncMock(side_effect=httpx.ConnectError("no host")))
        with patch("app.ai.ollama_provider.httpx.AsyncClient", factory):
            assert await OllamaProvider().health() == "down"


class TestExternalLLMProvider:
    """Tests for ExternalLLMProvider."""

    @pytest.mark.asyncio
    async def test_generate_returns_choice_content(self, external_settings):
        """generate() returns choices[0].message.content (OpenAI-compatible)."""
        factory, _ = _mock_client(
            post=AsyncMock(
                return_value=_json_response(
                    {"choices": [{"message": {"content": "public answer"}}]}
                )
            )
        )
        with patch("app.ai.external_provider.httpx.AsyncClient", factory):
            text = await ExternalLLMProvider().generate(
                [{"role": "user", "content": "q"}]
            )
        assert text == "public answer"

    @pytest.mark.asyncio
    async def test_generate_not_configured_raises_external_not_allowed(self):
        """Missing settings raise ExternalNotAllowed before any HTTP call."""
        fake = SimpleNamespace(
            external_llm_base_url="",
            external_llm_api_key="",
            external_llm_model="",
            external_llm_timeout_seconds=5,
        )
        with patch("app.ai.external_provider.get_settings", lambda: fake):
            with pytest.raises(ExternalNotAllowed):
                await ExternalLLMProvider().generate([{"role": "user", "content": "q"}])

    @pytest.mark.asyncio
    async def test_generate_http_error_raises_provider_error(self, external_settings):
        """An HTTP failure raises a generic PROVIDER_ERROR."""
        factory, _ = _mock_client(
            post=AsyncMock(side_effect=httpx.ConnectError("unreachable"))
        )
        with patch("app.ai.external_provider.httpx.AsyncClient", factory):
            with pytest.raises(ProviderError) as exc_info:
                await ExternalLLMProvider().generate([{"role": "user", "content": "q"}])
        assert exc_info.value.code == "PROVIDER_ERROR"

    @pytest.mark.asyncio
    async def test_health_not_configured_without_settings(self):
        """health() is 'not_configured' when settings are empty."""
        fake = SimpleNamespace(
            external_llm_base_url="",
            external_llm_api_key="",
            external_llm_model="",
            external_llm_timeout_seconds=5,
        )
        with patch("app.ai.external_provider.get_settings", lambda: fake):
            assert await ExternalLLMProvider().health() == "not_configured"

    @pytest.mark.asyncio
    async def test_health_up_on_reachable_endpoint(self, external_settings):
        """health() is 'up' when the endpoint answers below 500."""
        response = AsyncMock()
        response.status_code = 200
        factory, _ = _mock_client(get=AsyncMock(return_value=response))
        with patch("app.ai.external_provider.httpx.AsyncClient", factory):
            assert await ExternalLLMProvider().health() == "up"
