# File:        backend/tests/test_auth.py
# Owner:       Shreyansh
# Purpose:     Verifies GitHub OAuth auth: state checking, bearer sessions, /auth/me, /me/mode features, and logout — all without network calls.
# Contains:    TestClient tests for GET /api/auth/github, GET /api/auth/github/callback, GET /api/auth/me, POST /api/auth/logout and GET /api/me/mode, with mocked httpx.
# Status:      REAL — covers the implemented OAuth flow (httpx fully mocked).
# Depends on:  backend/app/main.py, backend/app/api/auth.py, backend/app/core/security.py, backend/app/core/config.py

"""Auth tests.

No test talks to the real GitHub: httpx.post / httpx.get are mocked, and the
session/extension URIs come from per-test environment variables.
"""

from collections.abc import Iterator
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api import auth
from app.core.config import get_settings
from app.core.security import create_session_token, find_or_create_user
from app.main import app

client = TestClient(app)

EXTENSION_REDIRECT_URI = "https://example-ext.chromiumapp.org/provider_cb.html"

#: GitHub profile returned by the mocked /user call.
FAKE_PROFILE: dict[str, Any] = {
    "id": 123,
    "login": "octocat",
    "avatar_url": "https://avatars.githubusercontent.com/u/1?v=4",
}


class _FakeResponse:
    """Minimal httpx.Response stand-in so no test performs a network call."""

    def __init__(self, payload: dict[str, Any]) -> None:
        self._payload = payload

    def json(self) -> dict[str, Any]:
        return self._payload

    def raise_for_status(self) -> None:
        return None


@pytest.fixture(autouse=True)
def _test_settings(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Point the settings at test-only values and reset the cached Settings."""
    monkeypatch.setenv("SESSION_SECRET", "test-session-secret")
    monkeypatch.setenv("EXTENSION_REDIRECT_URI", EXTENSION_REDIRECT_URI)
    monkeypatch.setenv("GITHUB_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("GITHUB_CLIENT_SECRET", "test-client-secret")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _mock_github(monkeypatch: pytest.MonkeyPatch, token: str = "gho_fake") -> None:
    """Replace httpx calls to GitHub with canned responses."""

    def fake_post(url: str, **kwargs: Any) -> _FakeResponse:
        assert url == auth.GITHUB_TOKEN_URL
        return _FakeResponse({"access_token": token})

    def fake_get(url: str, **kwargs: Any) -> _FakeResponse:
        assert url == auth.GITHUB_USER_URL
        assert kwargs["headers"]["Authorization"] == f"Bearer {token}"
        return _FakeResponse(FAKE_PROFILE)

    monkeypatch.setattr(httpx, "post", fake_post)
    monkeypatch.setattr(httpx, "get", fake_get)


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _start_oauth() -> str:
    """Kick off OAuth and return the state GitHub will send back."""
    response = client.get("/api/auth/github", follow_redirects=False)
    assert response.status_code == 302
    location = response.headers["location"]
    assert location.startswith("https://github.com/login/oauth/authorize")
    return parse_qs(urlparse(location).query)["state"][0]


def test_start_oauth_redirects_with_state_and_minimal_scope() -> None:
    """GET /api/auth/github 302s to GitHub with read:user scope and a state."""
    state = _start_oauth()
    # The state must be remembered server-side until the callback consumes it.
    assert state in auth._pending_states


def test_callback_with_wrong_state_returns_400(monkeypatch: pytest.MonkeyPatch) -> None:
    """A state we never issued is rejected before any token exchange."""
    _mock_github(monkeypatch)
    response = client.get(
        "/api/auth/github/callback?code=fake-code&state=bogus", follow_redirects=False
    )
    assert response.status_code == 400


def test_callback_without_state_returns_400(monkeypatch: pytest.MonkeyPatch) -> None:
    """A missing state is rejected too."""
    _mock_github(monkeypatch)
    response = client.get("/api/auth/github/callback?code=fake-code", follow_redirects=False)
    assert response.status_code == 400


def test_callback_with_expired_state_returns_400(monkeypatch: pytest.MonkeyPatch) -> None:
    """An expired state is rejected (short TTL on pending states)."""
    _mock_github(monkeypatch)
    auth._pending_states["expired-state"] = datetime.now(timezone.utc) - timedelta(minutes=1)
    response = client.get(
        "/api/auth/github/callback?code=fake-code&state=expired-state", follow_redirects=False
    )
    assert response.status_code == 400


def test_sign_in_flow_issues_session_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """Full flow: start -> callback -> redirect to the extension with a token."""
    _mock_github(monkeypatch)
    state = _start_oauth()
    response = client.get(
        f"/api/auth/github/callback?code=fake-code&state={state}", follow_redirects=False
    )
    assert response.status_code == 302
    location = response.headers["location"]
    assert location.startswith(f"{EXTENSION_REDIRECT_URI}#")
    session_token = parse_qs(urlparse(location).fragment)["token"][0]
    # The GitHub access token must NEVER reach the client.
    assert "gho_fake" not in location
    # The session token identifies the real user on /auth/me.
    me = client.get("/api/auth/me", headers=_auth_headers(session_token))
    assert me.status_code == 200
    assert me.json() == {
        "id": "usr_123",
        "github_login": "octocat",
        "avatar_url": FAKE_PROFILE["avatar_url"],
        "mode": "open_contributor",
    }


def test_me_without_token_returns_401() -> None:
    """GET /api/auth/me without a token is 401."""
    assert client.get("/api/auth/me").status_code == 401


def test_me_with_malformed_token_returns_401() -> None:
    """GET /api/auth/me with garbage in the header is 401, not a crash."""
    response = client.get("/api/auth/me", headers=_auth_headers("not-a-jwt"))
    assert response.status_code == 401


def test_me_with_valid_token_returns_user() -> None:
    """GET /api/auth/me with a valid session token returns the user."""
    user = find_or_create_user(github_id=FAKE_PROFILE["id"], login="octocat", avatar_url="")
    token = create_session_token(user.id)
    response = client.get("/api/auth/me", headers=_auth_headers(token))
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == user.id
    assert body["github_login"] == "octocat"
    assert body["mode"] == "open_contributor"


def test_me_mode_returns_features_for_server_side_mode() -> None:
    """GET /api/me/mode returns the mode and the open_contributor features."""
    user = find_or_create_user(github_id=FAKE_PROFILE["id"], login="octocat", avatar_url="")
    token = create_session_token(user.id)
    response = client.get("/api/me/mode", headers=_auth_headers(token))
    assert response.status_code == 200
    assert response.json() == {
        "mode": "open_contributor",
        "features": {
            "privateRepos": False,
            "contributeTab": True,
            "contextTab": False,
            "jira": False,
            "confluence": False,
            "slackShare": False,
        },
    }


def test_me_mode_without_token_returns_401() -> None:
    """GET /api/me/mode also requires a session."""
    assert client.get("/api/me/mode").status_code == 401


def test_new_users_default_to_open_contributor() -> None:
    """A GitHub account seen for the first time is created in open_contributor."""
    user = find_or_create_user(github_id=999, login="newcomer", avatar_url="")
    assert user.mode.value == "open_contributor"


def test_logout_invalidates_session() -> None:
    """After POST /api/auth/logout the same token is refused with 401."""
    user = find_or_create_user(github_id=FAKE_PROFILE["id"], login="octocat", avatar_url="")
    token = create_session_token(user.id)
    assert client.get("/api/auth/me", headers=_auth_headers(token)).status_code == 200
    logout = client.post("/api/auth/logout", headers=_auth_headers(token))
    assert logout.status_code == 200
    assert logout.json() == {"detail": "Logged out"}
    assert client.get("/api/auth/me", headers=_auth_headers(token)).status_code == 401
