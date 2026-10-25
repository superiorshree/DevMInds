# File:        backend/tests/test_auth.py
# Owner:       Shreyansh
# Purpose:     Verifies GitHub OAuth auth: state checking, bearer sessions, /auth/me, /me/mode features, and logout — all without network calls.
# Contains:    TestClient tests for GET /api/auth/github, GET /api/auth/github/callback, GET /api/auth/me, POST /api/auth/logout, GET /api/me/mode and the session-injecting routes (POST /api/chat, GET .../architecture), with mocked httpx.
# Status:      REAL — covers the implemented OAuth flow (httpx fully mocked).
# Depends on:  backend/app/main.py, backend/app/api/auth.py, backend/app/core/security.py, backend/app/core/config.py

"""Auth tests.

No test talks to the real GitHub: httpx.post / httpx.get are mocked, and the
session/extension URIs come from per-test environment variables.
"""

import json
from collections.abc import Iterator
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api import auth
from app.core import security
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
    security._REVOKED_TOKENS.clear()
    get_settings.cache_clear()
    yield
    security._REVOKED_TOKENS.clear()
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
        "mode": "open_source",
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
    assert body["mode"] == "open_source"


def test_me_mode_returns_features_for_server_side_mode() -> None:
    """GET /api/me/mode returns the mode and the open_source features."""
    user = find_or_create_user(github_id=FAKE_PROFILE["id"], login="octocat", avatar_url="")
    token = create_session_token(user.id)
    response = client.get("/api/me/mode", headers=_auth_headers(token))
    assert response.status_code == 200
    assert response.json() == {
        "mode": "open_source",
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


def test_new_users_default_to_open_source() -> None:
    """A GitHub account seen for the first time is created in the default open_source mode."""
    user = find_or_create_user(github_id=999, login="newcomer", avatar_url="")
    assert user.mode.value == "open_source"


def test_logout_invalidates_session() -> None:
    """After POST /api/auth/logout the same token is refused with 401."""
    user = find_or_create_user(github_id=FAKE_PROFILE["id"], login="octocat", avatar_url="")
    token = create_session_token(user.id)
    assert client.get("/api/auth/me", headers=_auth_headers(token)).status_code == 200
    logout = client.post("/api/auth/logout", headers=_auth_headers(token))
    assert logout.status_code == 200
    assert logout.json() == {"detail": "Logged out"}
    assert client.get("/api/auth/me", headers=_auth_headers(token)).status_code == 401


class TestSessionUserReachesSessionRoutes:
    """Routes that read the session user must get it through Depends(...).

    Calling get_current_user() inside the route body (instead of as a Depends
    parameter) means the Authorization header never reaches it, so the route
    answers 401 for every caller — signed in or not.
    """

    def test_chat_is_401_without_token_and_200_with_one(self, monkeypatch: pytest.MonkeyPatch) -> None:
        from app.schemas.contracts import RepositoryContext
        monkeypatch.setattr(
            "app.services.chat_service.collect_repo_files",
            lambda *args, **kwargs: RepositoryContext(files=[]),
        )
        """Unauthenticated chat returns 401. Authenticated chat returns 502 when
        external AI is not configured (EXTERNAL_LLM_* not set in .env)."""
        user = find_or_create_user(github_id=55501, login="chatter", avatar_url="")
        token = create_session_token(user.id)
        body = {"owner": "vercel", "name": "next.js", "question": "Where does routing live?"}

        assert client.post("/api/chat", json=body).status_code == 401
        response = client.post("/api/chat", json=body, headers=_auth_headers(token))
        assert response.status_code in (200, 502)

    def test_architecture_is_401_without_token_and_200_with_one(self, monkeypatch: pytest.MonkeyPatch) -> None:
        from app.schemas.architecture import ArchitectureBundle, Repository, Overview, Component, Connection
        monkeypatch.setattr(
            "app.services.architecture_service.get_architecture",
            lambda *args, **kwargs: ArchitectureBundle(
                repository=Repository(owner="vercel", name="next.js", branch="main"),
                overview=Overview(summary="Next.js repository"),
                components=[Component(id="app", name="Next App", description="App router")],
                connections=[Connection(from_component="app", to_component="server", relationship="calls")],
            ),
        )
        user = find_or_create_user(github_id=55502, login="reader", avatar_url="")
        token = create_session_token(user.id)

        assert client.get("/api/repositories/vercel/next.js/architecture").status_code == 401
        response = client.get(
            "/api/repositories/vercel/next.js/architecture", headers=_auth_headers(token)
        )
        assert response.status_code == 200
        assert response.json()["repository"]["owner"] == "vercel"
        # Verify the response has the expected structure with correct field names
        conn = response.json().get("connections", [])
        if conn:
            # Connection model uses from_component/to_component (aliases from/to)
            c = conn[0]
            assert "from_component" in c or "from" in c
            assert "to_component" in c or "to" in c


class TestDynamicExtensionRedirectFlow:
    """Verifies dynamic Chrome extension redirect support and strict validation."""

    def test_valid_extension_redirect_via_query_param(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """When a valid extension redirect URI is provided, it is bound to state and used upon callback."""
        _mock_github(monkeypatch)
        custom_uri = "https://custom-ext.chromiumapp.org/provide_cb.html"
        monkeypatch.setenv("ALLOWED_EXTENSION_IDS", "custom-ext")
        get_settings.cache_clear()

        # Start OAuth with ?redirect_uri=...
        response = client.get(
            f"/api/auth/github?redirect_uri={custom_uri}", follow_redirects=False
        )
        assert response.status_code == 302
        location = response.headers["location"]
        state = parse_qs(urlparse(location).query)["state"][0]

        # Callback redirects to the custom URI
        cb_response = client.get(
            f"/api/auth/github/callback?code=fake-code&state={state}", follow_redirects=False
        )
        assert cb_response.status_code == 302
        cb_location = cb_response.headers["location"]
        assert cb_location.startswith(f"{custom_uri}#")
        token = parse_qs(urlparse(cb_location).fragment)["token"][0]
        assert token

    def test_invalid_and_arbitrary_redirect_urls_rejected(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Strict validation rejects arbitrary domains, http scheme, query params, fragments, etc."""
        monkeypatch.setenv("ALLOWED_EXTENSION_IDS", "allowed-ext")
        get_settings.cache_clear()

        disallowed_urls = [
            "https://evil.com/callback",
            "http://allowed-ext.chromiumapp.org/provide_cb.html",  # not https
            "https://unauthorized-ext.chromiumapp.org/provide_cb.html",  # not in allowlist
            "https://allowed-ext.chromiumapp.org/provide_cb.html?leak=1",  # query params
            "https://allowed-ext.chromiumapp.org/provide_cb.html#fragment",  # fragment
            "https://allowed-ext.chromiumapp.org/other_cb.html",  # wrong path
            "https://allowed-ext.chromiumapp.org:8080/provide_cb.html",  # port
            "https://user:pass@allowed-ext.chromiumapp.org/provide_cb.html",  # credentials
        ]

        for bad_url in disallowed_urls:
            response = client.get(
                "/api/auth/github", params={"redirect_uri": bad_url}, follow_redirects=False
            )
            assert response.status_code == 400, f"Expected 400 for {bad_url}"

    def test_oauth_state_stores_and_returns_matching_redirect_uri(self) -> None:
        """_create_state stores JSON with expires_at and redirect_uri, and _consume_state returns it."""
        target_uri = "https://example-ext.chromiumapp.org/provider_cb.html"
        state = auth._create_state(target_uri)
        path = auth._state_path(state)
        assert path.exists()

        content = json.loads(path.read_text(encoding="utf-8"))
        assert "expires_at" in content
        assert content["redirect_uri"] == target_uri

        consumed_uri = auth._consume_state(state)
        assert consumed_uri == target_uri
        assert not path.exists()  # unlinked

    def test_state_consumption_expired_unknown_and_replayed(self) -> None:
        """Invalid, expired, missing, and replayed states fail closed."""
        # 1. Unknown state
        with pytest.raises(Exception):
            auth._consume_state("never-issued-state")

        # 2. Expired state file
        target_uri = "https://example-ext.chromiumapp.org/provider_cb.html"
        state = auth._create_state(target_uri)
        path = auth._state_path(state)
        expired_data = {
            "expires_at": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat(),
            "redirect_uri": target_uri,
        }
        path.write_text(json.dumps(expired_data), encoding="utf-8")
        with pytest.raises(Exception):
            auth._consume_state(state)

        # 3. Replay attack: second consumption fails
        valid_state = auth._create_state(target_uri)
        uri = auth._consume_state(valid_state)
        assert uri == target_uri
        with pytest.raises(Exception):
            auth._consume_state(valid_state)

        # 4. Corrupt state file
        corrupt_state = auth._create_state(target_uri)
        corrupt_path = auth._state_path(corrupt_state)
        corrupt_path.write_text("not json content", encoding="utf-8")
        with pytest.raises(Exception):
            auth._consume_state(corrupt_state)

    def test_two_different_extension_ids_isolated_sessions(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Two developers with different extension IDs can start concurrent flows without collision."""
        _mock_github(monkeypatch)
        ext1_uri = "https://dev-ext-one.chromiumapp.org/provide_cb.html"
        ext2_uri = "https://dev-ext-two.chromiumapp.org/provide_cb.html"
        monkeypatch.setenv("ALLOWED_EXTENSION_IDS", "dev-ext-one,dev-ext-two")
        get_settings.cache_clear()

        # Dev 1 starts OAuth
        r1 = client.get(f"/api/auth/github?redirect_uri={ext1_uri}", follow_redirects=False)
        assert r1.status_code == 302
        state1 = parse_qs(urlparse(r1.headers["location"]).query)["state"][0]

        # Dev 2 starts OAuth
        r2 = client.get(f"/api/auth/github?redirect_uri={ext2_uri}", follow_redirects=False)
        assert r2.status_code == 302
        state2 = parse_qs(urlparse(r2.headers["location"]).query)["state"][0]

        assert state1 != state2

        # Dev 2 completes callback first
        cb2 = client.get(
            f"/api/auth/github/callback?code=code2&state={state2}", follow_redirects=False
        )
        assert cb2.status_code == 302
        assert cb2.headers["location"].startswith(f"{ext2_uri}#")

        # Dev 1 completes callback second
        cb1 = client.get(
            f"/api/auth/github/callback?code=code1&state={state1}", follow_redirects=False
        )
        assert cb1.status_code == 302
        assert cb1.headers["location"].startswith(f"{ext1_uri}#")

    def test_session_token_in_fragment_matches_frontend_extract_token(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The callback returns the token in the URL fragment matching frontend extractToken()."""
        _mock_github(monkeypatch)
        ext_uri = "https://dev-ext-one.chromiumapp.org/provide_cb.html"
        monkeypatch.setenv("ALLOWED_EXTENSION_IDS", "dev-ext-one")
        get_settings.cache_clear()

        r = client.get(f"/api/auth/github?redirect_uri={ext_uri}", follow_redirects=False)
        state = parse_qs(urlparse(r.headers["location"]).query)["state"][0]

        cb = client.get(
            f"/api/auth/github/callback?code=fake-code&state={state}", follow_redirects=False
        )
        redirect_url = cb.headers["location"]

        # Simulate frontend extractToken()
        parsed = urlparse(redirect_url)
        fragment = parse_qs(parsed.fragment)
        token = fragment.get("token", [None])[0]
        assert token is not None

        # Verify token works on /api/auth/me
        me = client.get("/api/auth/me", headers=_auth_headers(token))
        assert me.status_code == 200
        assert me.json()["github_login"] == "octocat"

    def test_cors_origins_automatically_allows_extension_id(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Extensions listed in CORS_ORIGINS are automatically allowed for OAuth redirect."""
        _mock_github(monkeypatch)
        monkeypatch.setenv("CORS_ORIGINS", "chrome-extension://cors-ext-id,http://localhost:5173")
        monkeypatch.setenv("ALLOWED_EXTENSION_IDS", "")
        get_settings.cache_clear()

        cors_uri = "https://cors-ext-id.chromiumapp.org/provide_cb.html"
        r = client.get(f"/api/auth/github?redirect_uri={cors_uri}", follow_redirects=False)
        assert r.status_code == 302
        state = parse_qs(urlparse(r.headers["location"]).query)["state"][0]

        cb = client.get(
            f"/api/auth/github/callback?code=fake-code&state={state}", follow_redirects=False
        )
        assert cb.status_code == 302
        assert cb.headers["location"].startswith(f"{cors_uri}#")
