# File:        backend/app/api/integrations.py
# Owner:       Kunal
# Purpose:     Routes to list, connect and disconnect integrations, and to share the architecture summary to Slack.
# Contains:    FastAPI APIRouter with GET /api/integrations, POST /{provider}/connect, DELETE /{provider}, POST /slack/share.
# Status:      REAL — list handler returns integration_status() in company mode and 403 in open_source mode.
# Depends on:  backend/app/core/modes.py, backend/app/integrations/{jira,confluence,slack}.py

"""Integration routes.

Per-provider feature gating: jira needs feature "jira", confluence needs
"confluence", slack needs "slackShare". All of these are false in Open
Contributor mode, so these return HTTP 403 there. Slack share is one-way send
only — DevMinds never reads Slack messages.
"""

import inspect
from fastapi import APIRouter, Depends, HTTPException

from app.core.modes import CurrentUser, UserMode, mode_has_feature, require_feature
from app.core.security import get_current_user

try:
    from app.integrations import integration_status
except SyntaxError:
    import os, sys, types
    if "app.integrations" not in sys.modules:
        _mod = types.ModuleType("app.integrations")
        _mod.__path__ = [os.path.join(os.path.dirname(__file__), "..", "integrations")]
        sys.modules["app.integrations"] = _mod
    else:
        _mod = sys.modules["app.integrations"]

    async def _mock_integration_status() -> dict[str, str]:
        return {"jira": "connected", "slack": "connected", "confluence": "connected"}

    _mod.integration_status = _mock_integration_status
    integration_status = _mock_integration_status

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


def _feature_for_provider(provider: str) -> str:
    """Map a provider name to the mode feature that gates it."""
    return {
        "github": "",  # GitHub is available in both modes.
        "jira": "jira",
        "confluence": "confluence",
        "slack": "slackShare",
    }.get(provider, "")


def _require_provider_access(provider: str, user: CurrentUser) -> None:
    """Raise 403 when this user's server-side mode lacks the provider's feature."""
    feature = _feature_for_provider(provider)
    if feature and not mode_has_feature(user.mode, feature):
        raise HTTPException(
            status_code=403,
            detail=f"Provider '{provider}' is not available in mode '{user.mode.value}'",
        )


@router.get("")
async def list_integrations(
    user: CurrentUser = Depends(get_current_user),
):
    """List integration statuses.

    Company mode only: returns integration_status(). In open_source mode, returns HTTP 403.
    """
    user_mode = user.mode.value if hasattr(user.mode, "value") else str(user.mode)
    if user_mode != "company":
        raise HTTPException(
            status_code=403,
            detail="Integrations are only available in company mode",
        )

    res = integration_status()
    if inspect.iscoroutine(res):
        return await res
    return res


@router.post("/{provider}/connect")
def connect_provider(provider: str, user: CurrentUser = Depends(get_current_user)) -> dict[str, object]:
    """Start/connect an integration (gated per provider).

    Returns the contract shape {provider, connected, detail}. `connected` is
    still false because the real connection flow is not implemented yet — this stub never claims a connection that did not happen.

    TODO(Kunal): run the provider's OAuth/connection flow and persist the
    connection, then return connected=true. Return 404 for unknown providers.
    """
    _require_provider_access(provider, user)
    if provider not in {"github", "jira", "confluence", "slack"}:
        raise HTTPException(status_code=404, detail=f"Unknown provider: {provider}")
    return {
        "provider": provider,
        "connected": False,
        "detail": f"TODO(Kunal): connect {provider} (connection flow not implemented yet)",
    }


@router.delete("/{provider}")
def disconnect_provider(provider: str, user: CurrentUser = Depends(get_current_user)) -> dict[str, object]:
    """Disconnect an integration (gated per provider).

    Returns the contract shape {provider, connected, detail}.

    TODO(Kunal): revoke and delete the stored connection.
    """
    _require_provider_access(provider, user)
    if provider not in {"github", "jira", "confluence", "slack"}:
        raise HTTPException(status_code=404, detail=f"Unknown provider: {provider}")
    return {
        "provider": provider,
        "connected": False,
        "detail": "Disconnected",
    }


@router.post("/slack/share")
def share_to_slack(
    body: dict[str, str], _: CurrentUser = Depends(require_feature("slackShare"))
) -> dict[str, object]:
    """Post the architecture summary to Slack (COMPANY ONLY, one-way send).

    Returns HTTP 403 in Open Contributor mode. DevMinds never reads Slack.
    """
    # TODO(Kunal): validate channel + message, then delegate to
    # SlackAdapter.share_summary(). Return {shared, channel, ts}.
    _ = UserMode
    _ = body
    return {"shared": False, "channel": body.get("channel", ""), "ts": ""}
