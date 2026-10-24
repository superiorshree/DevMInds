# File:        backend/tests/test_modes.py
# Owner:       Shreyansh
# Purpose:     Verifies the backend enforces modes server-side: company-only features are refused (403) in open_source mode, and PUT /api/me/mode switches the server-side mode.
# Contains:    test_canonical_mode_values(), the 403/200 feature-gate tests, and the PUT /api/me/mode tests (401 without a session, persistence, 400 on an unknown mode).
# Status:      REAL — covers mode enforcement and mode switching as documented
# Depends on:  backend/app/main.py, backend/app/core/security.py (get_current_user override)

"""Mode-enforcement tests.

The backend must refuse company-only features in open_source mode. Hiding a
button in the UI is not security, so this is enforced here with a test.

Canonical modes (shared contract with extension/src/types/mode.ts):
`open_source` and `company` — nothing else.
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.modes import CurrentUser, UserMode
from app.core.security import create_session_token, find_or_create_user, get_current_user
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _session_secret(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Session tokens need SESSION_SECRET — set a test value, reset the cache."""
    monkeypatch.setenv("SESSION_SECRET", "test-session-secret-mode-tests")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _session_headers(github_id: int, login: str) -> dict[str, str]:
    """Create (or fetch) a stored user and return their Authorization headers."""
    user = find_or_create_user(github_id=github_id, login=login, avatar_url="")
    token = create_session_token(user.id)
    return {"Authorization": f"Bearer {token}"}


def _override_user(mode: UserMode) -> None:
    """Point the get_current_user dependency at a fixed user in the given mode."""

    def fake_user() -> CurrentUser:
        return CurrentUser(id="usr_test", github_login="tester", avatar_url="", mode=mode)

    app.dependency_overrides[get_current_user] = fake_user


def test_canonical_mode_values() -> None:
    """The contract has exactly the two canonical modes: open_source and company."""
    assert [mode.value for mode in UserMode] == ["open_source", "company"]
    assert UserMode.open_source.value == "open_source"
    assert UserMode.company.value == "company"


def test_company_only_feature_refused_for_open_source() -> None:
    """A company-only endpoint returns 403 when the server-side mode is open_source."""
    _override_user(UserMode.open_source)

    # context (Jira + Confluence) is company-only.
    response = client.get("/api/repositories/someone/somerepo/context")
    assert response.status_code == 403

    # Slack share is company-only.
    response = client.post(
        "/api/integrations/slack/share",
        json={"channel": "#eng", "message": "summary"},
    )
    assert response.status_code == 403

    app.dependency_overrides.clear()


def test_company_only_feature_allowed_for_company() -> None:
    """The same endpoints are NOT refused when the server-side mode is company."""
    _override_user(UserMode.company)

    response = client.get("/api/repositories/someone/somerepo/context")
    assert response.status_code == 200

    app.dependency_overrides.clear()


class TestPutModeSwitch:
    """PUT /api/me/mode switches the SERVER-SIDE mode of a signed-in user."""

    def test_put_mode_requires_a_session(self) -> None:
        """Switching mode without a session token is 401, like every other route."""
        response = client.put("/api/me/mode", json={"mode": "company"})
        assert response.status_code == 401

    def test_put_mode_persists_for_later_requests(self) -> None:
        """The new mode survives into GET /api/me/mode and require_feature checks."""
        headers = _session_headers(github_id=4242, login="mode-switcher")

        # Fresh user starts in the default open_source mode: context is 403.
        assert client.get("/api/me/mode", headers=headers).json()["mode"] == "open_source"
        assert (
            client.get("/api/repositories/someone/somerepo/context", headers=headers).status_code
            == 403
        )

        response = client.put("/api/me/mode", json={"mode": "company"}, headers=headers)
        assert response.status_code == 200
        assert response.json()["mode"] == "company"
        assert response.json()["features"]["contextTab"] is True

        # The switch is server-side: the next request sees it.
        assert client.get("/api/me/mode", headers=headers).json()["mode"] == "company"
        assert (
            client.get("/api/repositories/someone/somerepo/context", headers=headers).status_code
            == 200
        )

        # And back again — the gate closes for this user.
        response = client.put("/api/me/mode", json={"mode": "open_source"}, headers=headers)
        assert response.status_code == 200
        assert (
            client.get("/api/repositories/someone/somerepo/context", headers=headers).status_code
            == 403
        )

    def test_put_mode_rejects_an_unknown_mode_with_400(self) -> None:
        """The contract promises 400 (not 422) for a mode that is not a UserMode."""
        headers = _session_headers(github_id=4243, login="mode-bad-value")
        response = client.put("/api/me/mode", json={"mode": "open_contributor"}, headers=headers)
        assert response.status_code == 400
        assert "open_contributor" in response.json()["detail"]

    def test_put_mode_does_not_leak_between_users(self) -> None:
        """One user switching mode never changes another user's mode."""
        headers_a = _session_headers(github_id=4244, login="mode-a")
        headers_b = _session_headers(github_id=4245, login="mode-b")

        client.put("/api/me/mode", json={"mode": "company"}, headers=headers_a)

        assert client.get("/api/me/mode", headers=headers_a).json()["mode"] == "company"
        assert client.get("/api/me/mode", headers=headers_b).json()["mode"] == "open_source"
