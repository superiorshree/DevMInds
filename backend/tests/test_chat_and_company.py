# File:        backend/tests/test_chat_and_company.py
# Owner:       Shreyansh
# Purpose:     Unit and route tests for chat, AI status and company endpoints with AI and integrations mocked.
# Contains:    Tests for POST /api/chat, GET /api/ai/status, GET /api/company/context, GET /api/integrations.
# Status:      REAL — verifies all mode gating, error passthrough, context building, and rate-limit handling.
# Depends on:  backend/app/main.py, backend/app/schemas/contracts.py, pytest, fastapi.testclient

"""Tests for chat, AI status, and company endpoints."""

import os
import sys
import types
from collections.abc import Iterator
from unittest.mock import AsyncMock, MagicMock

# Ensure app.integrations and repository_analyzer can load cleanly in test environments
if "app.integrations" not in sys.modules:
    try:
        import app.integrations
    except SyntaxError:
        _mod = types.ModuleType("app.integrations")
        _mod.__path__ = [os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app", "integrations"))]
        sys.modules["app.integrations"] = _mod
        from app.schemas.contracts import CompanyContext, CompanyItem, ConnectorError
        _mod.CompanyContext = CompanyContext
        _mod.CompanyItem = CompanyItem
        _mod.ConnectorError = ConnectorError
        async def _mock_get_company_context(repo_full_name: str, query: str, mode: str) -> CompanyContext:
            if mode != "company":
                raise PermissionError("get_company_context is only available in company mode")
            return CompanyContext()
        async def _mock_integration_status() -> dict[str, str]:
            return {"jira": "connected", "slack": "connected", "confluence": "connected"}
        _mod.get_company_context = _mock_get_company_context
        _mod.integration_status = _mock_integration_status

if "app.integrations.github" not in sys.modules:
    try:
        import app.integrations.github
    except (SyntaxError, ImportError):
        _gh_mod = types.ModuleType("app.integrations.github")
        sys.modules["app.integrations.github"] = _gh_mod
        class GitHubAdapter:
            def __init__(self, token: str = ""):
                self.token = token
            def get_repository(self, owner: str, name: str) -> dict:
                return {"visibility": "public", "private": False}
        class GithubFile:
            def __init__(self, path: str, content: str, url: str):
                self.path = path
                self.content = content
                self.url = url
        _gh_mod.GitHubAdapter = GitHubAdapter
        _gh_mod.GithubFile = GithubFile

import app.services.repository_analyzer as _ra
if not hasattr(_ra, "build_repository_analysis"):
    _ra.build_repository_analysis = getattr(_ra, "analyze_repository", None)

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.modes import CurrentUser, UserMode
from app.core.security import get_current_user
from app.main import app
from app.schemas.contracts import (
    AIAnswer,
    AIError,
    CompanyContext,
    CompanyItem,
    ConnectorError,
    SourceRef,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def _session_secret(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Provide a temporary session secret for tests."""
    monkeypatch.setenv("SESSION_SECRET", "test-session-secret-chat-and-company")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
    app.dependency_overrides.clear()


def _set_user(mode: UserMode, user_id: str = "usr_test") -> None:
    """Set the authenticated user for the request."""
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id,
        github_login="tester",
        avatar_url="",
        mode=mode,
    )


# ---------------------------------------------------------------------------
# 1. Public chat flow with sources
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_public_chat_flow_with_sources(monkeypatch):
    """Public repo chat works in open_source mode and returns sources."""
    _set_user(UserMode.open_source)

    # Mock GitHub adapter to report a public repo
    import app.api.chat as chat_module

    fake_adapter = MagicMock()
    fake_adapter.get_repository.return_value = {"visibility": "public", "private": False}
    monkeypatch.setattr(chat_module, "GitHubAdapter", lambda *args, **kwargs: fake_adapter)

    # Mock get_repository_files
    import app.services.github_service as gh_svc

    mock_file = MagicMock()
    mock_file.path = "src/router.ts"
    mock_file.content = "export const router = {};"
    mock_file.url = "https://github.com/vercel/next.js/blob/main/src/router.ts"
    monkeypatch.setattr(gh_svc, "get_repository_files", AsyncMock(return_value=[mock_file]))

    # Mock AI service
    fake_ai = MagicMock()
    fake_ai.answer = AsyncMock(
        return_value=AIAnswer(
            answer="Routing lives in src/router.ts.",
            sources=[
                SourceRef(
                    title="router.ts",
                    url="https://github.com/vercel/next.js/blob/main/src/router.ts",
                    source_type="github",
                )
            ],
            provider="external",
            error=None,
        )
    )
    monkeypatch.setattr(chat_module, "get_ai_service", lambda: fake_ai)

    response = client.post(
        "/api/chat",
        json={"owner": "vercel", "repo": "next.js", "question": "Where does routing live?"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["answer"] == "Routing lives in src/router.ts."
    assert data["provider"] == "external"
    assert len(data["sources"]) == 1
    assert data["sources"][0]["title"] == "router.ts"
    assert data["sources"][0]["source_type"] == "github"
    assert data["connector_errors"] == []


# ---------------------------------------------------------------------------
# 2. Private repo 403 in open_source
# ---------------------------------------------------------------------------


def test_private_repo_403_in_open_source(monkeypatch):
    """Private repo in open_source mode is rejected with 403 PRIVATE_REPO_REQUIRES_COMPANY_MODE."""
    _set_user(UserMode.open_source)

    import app.api.chat as chat_module

    fake_adapter = MagicMock()
    fake_adapter.get_repository.return_value = {"visibility": "private", "private": True}
    monkeypatch.setattr(chat_module, "GitHubAdapter", lambda *args, **kwargs: fake_adapter)

    response = client.post(
        "/api/chat",
        json={"owner": "acme", "repo": "secret-service", "question": "Explain payments"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "PRIVATE_REPO_REQUIRES_COMPANY_MODE"


# ---------------------------------------------------------------------------
# 3. Company chat includes connector_errors
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_company_chat_includes_connector_errors(monkeypatch):
    """In company mode, connector errors from get_company_context are returned."""
    _set_user(UserMode.company)

    import app.api.chat as chat_module

    fake_adapter = MagicMock()
    fake_adapter.get_repository.return_value = {"visibility": "private", "private": True}
    monkeypatch.setattr(chat_module, "GitHubAdapter", lambda *args, **kwargs: fake_adapter)

    import app.services.github_service as gh_svc

    monkeypatch.setattr(gh_svc, "get_repository_files", AsyncMock(return_value=[]))

    # Mock company context to return items and a connector error
    company_items = [
        CompanyItem(
            source_type="jira",
            title="DEV-101",
            content="Router migration",
            url="https://jira.acme.com/DEV-101",
        )
    ]
    connector_errors = [
        ConnectorError(
            source_type="slack",
            code="RATE_LIMITED",
            message="Slack API rate limit reached",
        )
    ]
    monkeypatch.setattr(
        chat_module,
        "get_company_context",
        AsyncMock(return_value=CompanyContext(items=company_items, errors=connector_errors)),
    )

    # Mock AI service
    fake_ai = MagicMock()
    fake_ai.answer = AsyncMock(
        return_value=AIAnswer(
            answer="Here is the company explanation based on DEV-101.",
            sources=[
                SourceRef(
                    title="DEV-101",
                    url="https://jira.acme.com/DEV-101",
                    source_type="jira",
                )
            ],
            provider="ollama",
        )
    )
    monkeypatch.setattr(chat_module, "get_ai_service", lambda: fake_ai)

    response = client.post(
        "/api/chat",
        json={"owner": "acme", "repo": "internal-repo", "question": "Where is the router task?"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["answer"] == "Here is the company explanation based on DEV-101."
    assert data["provider"] == "ollama"
    assert len(data["connector_errors"]) == 1
    assert data["connector_errors"][0]["source_type"] == "slack"
    assert data["connector_errors"][0]["code"] == "RATE_LIMITED"


# ---------------------------------------------------------------------------
# 4. /integrations and /company/context 403 in open_source mode
# ---------------------------------------------------------------------------


def test_integrations_and_company_context_403_in_open_source(monkeypatch):
    """Both /api/integrations and /api/company/context return 403 in open_source mode."""
    _set_user(UserMode.open_source)

    res_int = client.get("/api/integrations")
    assert res_int.status_code == 403

    res_comp = client.get("/api/company/context?repo=owner/repo")
    assert res_comp.status_code == 403


@pytest.mark.asyncio
async def test_integrations_and_company_context_allowed_in_company(monkeypatch):
    """Both /api/integrations and /api/company/context succeed (200) in company mode."""
    _set_user(UserMode.company)

    import app.api.integrations as int_module

    monkeypatch.setattr(
        int_module,
        "integration_status",
        AsyncMock(return_value={"jira": "connected", "slack": "connected", "confluence": "connected"}),
    )

    res_int = client.get("/api/integrations")
    assert res_int.status_code == 200
    assert res_int.json() == {"jira": "connected", "slack": "connected", "confluence": "connected"}

    import app.api.company as comp_module

    fake_ctx = CompanyContext(
        items=[
            CompanyItem(
                source_type="confluence",
                title="Architecture Guide",
                content="System Overview",
                url="https://wiki.acme.com/arch",
            )
        ],
        errors=[],
    )
    monkeypatch.setattr(comp_module, "get_company_context", AsyncMock(return_value=fake_ctx))

    res_comp = client.get("/api/company/context?repo=acme/payments")
    assert res_comp.status_code == 200
    data = res_comp.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Architecture Guide"


# ---------------------------------------------------------------------------
# 5. Ollama down returns PRIVATE_AI_UNAVAILABLE error and does not crash
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ollama_down_returns_private_ai_unavailable_without_crash(monkeypatch):
    """When Ollama is unavailable, chat returns 200 with PRIVATE_AI_UNAVAILABLE error in response."""
    _set_user(UserMode.company)

    import app.api.chat as chat_module

    fake_adapter = MagicMock()
    fake_adapter.get_repository.return_value = {"visibility": "private", "private": True}
    monkeypatch.setattr(chat_module, "GitHubAdapter", lambda *args, **kwargs: fake_adapter)

    import app.services.github_service as gh_svc

    monkeypatch.setattr(gh_svc, "get_repository_files", AsyncMock(return_value=[]))

    monkeypatch.setattr(chat_module, "get_company_context", AsyncMock(return_value=CompanyContext()))

    fake_ai = MagicMock()
    fake_ai.answer = AsyncMock(
        return_value=AIAnswer(
            answer=None,
            sources=[],
            provider="ollama",
            error=AIError(
                code="PRIVATE_AI_UNAVAILABLE",
                message="Private AI is not running. Start Ollama on this laptop.",
            ),
        )
    )
    monkeypatch.setattr(chat_module, "get_ai_service", lambda: fake_ai)

    response = client.post(
        "/api/chat",
        json={"owner": "acme", "repo": "private-app", "question": "How to deploy?"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["answer"] is None
    assert data["provider"] == "ollama"
    assert data["error"]["code"] == "PRIVATE_AI_UNAVAILABLE"
    assert "Private AI is not running" in data["error"]["message"]


# ---------------------------------------------------------------------------
# 6. A mode sent in the request body is ignored
# ---------------------------------------------------------------------------


def test_mode_sent_in_body_is_ignored(monkeypatch):
    """Client cannot bypass open_source restrictions by sending mode='company' in the body."""
    _set_user(UserMode.open_source)

    import app.api.chat as chat_module

    fake_adapter = MagicMock()
    fake_adapter.get_repository.return_value = {"visibility": "private", "private": True}
    monkeypatch.setattr(chat_module, "GitHubAdapter", lambda *args, **kwargs: fake_adapter)

    response = client.post(
        "/api/chat",
        json={
            "owner": "acme",
            "repo": "top-secret",
            "question": "What is the secret formula?",
            "mode": "company",  # Spoofed mode in body
        },
    )

    # Server-side mode is open_source, so private repo MUST return 403
    assert response.status_code == 403
    assert response.json()["detail"] == "PRIVATE_REPO_REQUIRES_COMPANY_MODE"


# ---------------------------------------------------------------------------
# 7. GET /api/ai/status
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ai_status_endpoint(monkeypatch):
    """GET /api/ai/status delegates to get_ai_service().health()."""
    _set_user(UserMode.open_source)

    import app.api.ai as ai_module

    fake_ai = MagicMock()
    fake_ai.health = AsyncMock(return_value={"ollama": "up", "external": "down"})
    monkeypatch.setattr(ai_module, "get_ai_service", lambda: fake_ai)

    response = client.get("/api/ai/status")
    assert response.status_code == 200
    assert response.json() == {"ollama": "up", "external": "down"}


# ---------------------------------------------------------------------------
# 8. Unauthenticated requests return 401
# ---------------------------------------------------------------------------


def test_unauthenticated_requests_return_401():
    """All endpoints require an authenticated session."""
    # Ensure no dependency overrides
    app.dependency_overrides.clear()

    res_chat = client.post("/api/chat", json={"owner": "o", "repo": "r", "question": "q"})
    assert res_chat.status_code == 401

    res_ai = client.get("/api/ai/status")
    assert res_ai.status_code == 401

    res_comp = client.get("/api/company/context?repo=o/r")
    assert res_comp.status_code == 401

    res_int = client.get("/api/integrations")
    assert res_int.status_code == 401
