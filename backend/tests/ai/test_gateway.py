# File:        backend/tests/ai/test_gateway.py
# Owner:       Devyani
# Purpose:     Tests for the privacy routing rule (classify, choose_provider, complete)
# Contains:    pytest.mark.asyncio tests proving private data never reaches the external AI
# Status:      REAL
# Depends on:  backend/app/ai/gateway.py, backend/app/ai/errors.py, backend/app/ai/__init__.py

"""Gateway tests.

Frozen routing rule:
- private repo OR any company item  -> private -> Ollama ONLY
- public repo AND no company items  -> public  -> external AI

A failing provider is never replaced by the other one: private + Ollama down
must produce PRIVATE_AI_UNAVAILABLE with ZERO calls to the external provider.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.ai.gateway import classify, choose_provider, complete
from app.ai.errors import PrivateAIUnavailable, ExternalNotAllowed


class _Repo:
    """Minimal RepositoryContext stand-in."""

    def __init__(self, visibility: str):
        self.visibility = visibility


class _CompanyItem:
    """Minimal CompanyItem stand-in (Jira/Slack/Confluence)."""


class TestClassify:
    """classify() decides private vs public."""

    def test_private_repo_is_private(self):
        assert classify(_Repo("private"), []) == "private"

    def test_public_repo_without_company_items_is_public(self):
        assert classify(_Repo("public"), []) == "public"

    def test_public_repo_with_company_items_is_private(self):
        """Public repo + one Jira/Slack/Confluence item -> private."""
        assert classify(_Repo("public"), [_CompanyItem()]) == "private"

    def test_dict_repository_context_works(self):
        assert classify({"visibility": "private"}, None) == "private"

    def test_none_contexts_are_public(self):
        assert classify(None, None) == "public"


class TestChooseProvider:
    """choose_provider() maps classification to the single allowed provider."""

    def test_private_uses_ollama(self):
        assert choose_provider("private") == "ollama"

    def test_public_uses_external(self):
        assert choose_provider("public") == "external"


class TestComplete:
    """complete() routes to exactly one provider and never falls back."""

    @pytest.mark.asyncio
    async def test_public_data_uses_external(self):
        """Public + no company items -> external provider answers."""
        with patch("app.ai.gateway.ExternalLLMProvider") as ext_cls, patch(
            "app.ai.gateway.OllamaProvider"
        ) as ollama_cls:
            ext_cls.return_value.generate = AsyncMock(return_value="public answer")
            result = await complete(
                [{"role": "user", "content": "q"}], _Repo("public"), []
            )
        assert result == "public answer"
        ext_cls.return_value.generate.assert_awaited_once()
        ollama_cls.assert_not_called()

    @pytest.mark.asyncio
    async def test_company_items_force_ollama_even_for_public_repo(self):
        """Public repo + company items -> Ollama, external never called."""
        with patch("app.ai.gateway.OllamaProvider") as ollama_cls, patch(
            "app.ai.gateway.ExternalLLMProvider"
        ) as ext_cls:
            ollama_cls.return_value.generate = AsyncMock(return_value="private answer")
            result = await complete(
                [{"role": "user", "content": "q"}], _Repo("public"), [_CompanyItem()]
            )
        assert result == "private answer"
        ollama_cls.return_value.generate.assert_awaited_once()
        ext_cls.assert_not_called()

    @pytest.mark.asyncio
    async def test_private_repo_uses_ollama(self):
        """Private repo -> Ollama, external never called."""
        with patch("app.ai.gateway.OllamaProvider") as ollama_cls, patch(
            "app.ai.gateway.ExternalLLMProvider"
        ) as ext_cls:
            ollama_cls.return_value.generate = AsyncMock(return_value="private answer")
            result = await complete(
                [{"role": "user", "content": "q"}], _Repo("private"), []
            )
        assert result == "private answer"
        ext_cls.assert_not_called()

    @pytest.mark.asyncio
    async def test_private_ollama_down_raises_without_external_fallback(self):
        """Private + Ollama failure raises; external is NEVER tried."""
        with patch("app.ai.gateway.OllamaProvider") as ollama_cls, patch(
            "app.ai.gateway.ExternalLLMProvider"
        ) as ext_cls:
            ollama_cls.return_value.generate = AsyncMock(
                side_effect=PrivateAIUnavailable("Ollama is down")
            )
            with pytest.raises(PrivateAIUnavailable):
                await complete(
                    [{"role": "user", "content": "q"}], _Repo("private"), []
                )
        ext_cls.assert_not_called()


def _settings(ai_chat_enabled: bool = True) -> SimpleNamespace:
    """A fake settings object for AIService tests."""
    return SimpleNamespace(ai_chat_enabled=ai_chat_enabled, ollama_model="llama3.2:3b")


class TestAIService:
    """AIService.answer()/health() — the public interface for Shreyansh."""

    @pytest.mark.asyncio
    async def test_disabled_chat_returns_ai_disabled(self):
        """AI_CHAT_ENABLED=false answers with the AI_DISABLED error."""
        from app.ai import get_ai_service

        with patch("app.ai.get_settings", lambda: _settings(ai_chat_enabled=False)):
            answer = await get_ai_service().answer(
                "q", _Repo("public"), [], mode="open_source"
            )
        assert answer.answer is None
        assert answer.error is not None
        assert answer.error.code == "AI_DISABLED"

    @pytest.mark.asyncio
    async def test_private_ollama_down_returns_private_ai_unavailable(self):
        """Private + Ollama down -> PRIVATE_AI_UNAVAILABLE, no fallback."""
        from app.ai import get_ai_service

        with patch("app.ai.get_settings", lambda: _settings()), patch(
            "app.ai.OllamaProvider"
        ) as ollama_cls, patch("app.ai.ExternalLLMProvider") as ext_cls:
            ollama_cls.return_value.generate = AsyncMock(
                side_effect=PrivateAIUnavailable("down")
            )
            ollama_cls.return_value.health = AsyncMock(return_value="down")
            answer = await get_ai_service().answer(
                "q", _Repo("private"), [], mode="company"
            )
        assert answer.answer is None
        assert answer.provider == "ollama"
        assert answer.error is not None
        assert answer.error.code == "PRIVATE_AI_UNAVAILABLE"
        assert "Start Ollama" in answer.error.message
        # ZERO calls to the external provider.
        ext_cls.assert_not_called()

    @pytest.mark.asyncio
    async def test_model_missing_message_names_pull_command(self):
        """model_missing tells the user to run `ollama pull <model>`."""
        from app.ai import get_ai_service

        with patch("app.ai.get_settings", lambda: _settings()), patch(
            "app.ai.OllamaProvider"
        ) as ollama_cls, patch("app.ai.ExternalLLMProvider") as ext_cls:
            ollama_cls.return_value.generate = AsyncMock(
                side_effect=PrivateAIUnavailable("down")
            )
            ollama_cls.return_value.health = AsyncMock(return_value="model_missing")
            answer = await get_ai_service().answer(
                "q", _Repo("private"), [], mode="company"
            )
        assert answer.error is not None
        assert "ollama pull llama3.2:3b" in answer.error.message
        ext_cls.assert_not_called()

    @pytest.mark.asyncio
    async def test_public_repo_uses_external_only(self):
        """Public + no company items -> external answers, Ollama never called."""
        from app.ai import get_ai_service

        with patch("app.ai.get_settings", lambda: _settings()), patch(
            "app.ai.gateway.OllamaProvider"
        ) as ollama_cls,  patch("app.ai.OllamaProvider", ollama_cls), patch(
            "app.ai.gateway.ExternalLLMProvider"
        ) as ext_cls:
            ext_cls.return_value.generate = AsyncMock(
                return_value='{"answer": "public answer", "source_ids": []}'
            )
            answer = await get_ai_service().answer(
                "q", _Repo("public"), [], mode="open_source"
            )
        assert answer.answer == "public answer"
        assert answer.provider == "external"
        assert answer.error is None
        ollama_cls.assert_not_called()

    @pytest.mark.asyncio
    async def test_company_items_route_to_ollama_not_external(self):
        """The same public repo with a company item goes to Ollama only."""
        from app.ai import get_ai_service

        with patch("app.ai.get_settings", lambda: _settings()), patch(
            "app.ai.gateway.OllamaProvider"
        ) as ollama_cls, patch("app.ai.OllamaProvider", ollama_cls), patch(
            "app.ai.gateway.ExternalLLMProvider"
        ) as ext_cls:
            ollama_cls.return_value.generate = AsyncMock(
                return_value='{"answer": "ollama answer", "source_ids": []}'
            )
            answer = await get_ai_service().answer(
                "q", _Repo("public"), [_CompanyItem()], mode="company"
            )
        assert answer.answer == "ollama answer"
        assert answer.provider == "ollama"
        ext_cls.assert_not_called()

    @pytest.mark.asyncio
    async def test_switching_provider_is_env_only(self):
        """Empty external settings disable the external provider — no code change.

        With external not configured, a public question fails cleanly with
        EXTERNAL_AI_NOT_ALLOWED (it must NOT silently fall back to Ollama).
        """
        from app.ai import get_ai_service

        fake = SimpleNamespace(
            ai_chat_enabled=True,
            external_llm_base_url="",
            external_llm_api_key="",
            external_llm_model="",
            external_llm_timeout_seconds=5,
        )
        with patch("app.ai.get_settings", lambda: fake), patch(
            "app.ai.ExternalLLMProvider"
        ) as ext_cls:
            ext_cls.return_value.generate = AsyncMock(
                side_effect=ExternalNotAllowed("not configured")
            )
            answer = await get_ai_service().answer(
                "q", _Repo("public"), [], mode="open_source"
            )
        assert answer.answer is None
        assert answer.error is not None
        assert answer.error.code == "EXTERNAL_AI_NOT_ALLOWED"

    @pytest.mark.asyncio
    async def test_health_reports_both_providers(self):
        """health() returns the frozen status dict for both providers."""
        from app.ai import get_ai_service

        with patch("app.ai.OllamaProvider") as ollama_cls, patch(
            "app.ai.ExternalLLMProvider"
        ) as ext_cls:
            ollama_cls.return_value.health = AsyncMock(return_value="up")
            ext_cls.return_value.health = AsyncMock(return_value="not_configured")
            status = await get_ai_service().health()
        assert status == {"ollama": "up", "external": "not_configured"}
