# File:        backend/tests/test_modes.py
# Owner:       Shreyansh
# Purpose:     Verifies the backend enforces modes server-side: company-only features are refused (403) for an open_contributor.
# Contains:    test_company_only_feature_refused_for_open_contributor() and a companion test that company_employee is allowed.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/main.py, backend/app/core/security.py (get_current_user override)

"""Mode-enforcement tests.

The backend must refuse company-only features for an Open Contributor. Hiding a
button in the UI is not security, so this is enforced here with a test.
"""

from fastapi.testclient import TestClient

from app.core.modes import CurrentUser, UserMode
from app.core.security import get_current_user
from app.main import app

client = TestClient(app)


def _override_user(mode: UserMode) -> None:
    """Point the get_current_user dependency at a fixed user in the given mode."""

    def fake_user() -> CurrentUser:
        return CurrentUser(id="usr_test", github_login="tester", avatar_url="", mode=mode)

    app.dependency_overrides[get_current_user] = fake_user


def test_company_only_feature_refused_for_open_contributor() -> None:
    """A company-only endpoint returns 403 when the server-side mode is open_contributor."""
    _override_user(UserMode.OPEN_CONTRIBUTOR)

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


def test_company_only_feature_allowed_for_company_employee() -> None:
    """The same endpoints are NOT refused when the server-side mode is company_employee."""
    _override_user(UserMode.COMPANY_EMPLOYEE)

    response = client.get("/api/repositories/someone/somerepo/context")
    assert response.status_code == 200

    app.dependency_overrides.clear()
