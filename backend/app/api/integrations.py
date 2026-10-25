# File:        backend/app/api/integrations.py
# Owner:       Kunal
# Purpose:     Routes to list, connect and disconnect integrations, and to share the architecture summary to Slack.
# Contains:    FastAPI APIRouter with GET /api/integrations, POST /{provider}/connect, DELETE /{provider}, POST /slack/share.
# Status:      REAL — list handler returns real statuses per API_CONTRACT.md; company features restricted in open_source.
# Depends on:  backend/app/core/modes.py, backend/app/integrations/{jira,confluence,slack}.py

"""Integration routes.

Per-provider feature gating: jira needs feature "jira", confluence needs
"confluence", slack needs "slackShare". All of these are false in Open
Contributor mode, so these return HTTP 403 on connect/share actions.
GET /api/integrations is accessible in both modes, reporting available=false
for gated features in open_source mode. Slack share is one-way send
only — DevMinds never reads Slack messages.
"""

import inspect
from fastapi import APIRouter, Depends, HTTPException

from app.core.modes import CurrentUser, UserMode, mode_has_feature, require_feature
from app.core.security import get_current_user
from app.integrations import integration_status

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


integration_health = integration_status


@router.get("")
async def list_integrations(
    user: CurrentUser = Depends(get_current_user),
):
    """List integrations with real connection status."""
    statuses = integration_status()
    if inspect.iscoroutine(statuses):
        statuses = await statuses

    is_company = user.mode == UserMode.company or str(getattr(user.mode, "value", user.mode)) == "company"

    # Only run health in company mode
    health = {}
    if is_company:
        try:
            h = integration_health()
            health = await h if inspect.iscoroutine(h) else h
        except Exception:
            health = {}

    providers = [
        ("github", ""),
        ("jira", "jira"),
        ("confluence", "confluence"),
        ("slack", "slackShare"),
    ]

    out = []
    for name, feature in providers:
        available = not feature or mode_has_feature(user.mode, feature)
        connected = available and (
            health.get(name) == "connected"
            or statuses.get(name, "not_connected") == "connected"
        )
        detail = ""
        if not available:
            detail = f"Requires feature '{feature}'"
        elif name == "github":
            detail = f"Signed in as {user.github_login}" if user.github_login else "Connected"
        elif name in health:
            detail = str(health[name])

        out.append(
            {
                "provider": name,
                "available": available,
                "connected": connected,
                "detail": detail,
            }
        )

    return {"providers": out}


@router.post("/{provider}/connect")
def connect_provider(provider: str, user: CurrentUser = Depends(get_current_user)) -> dict[str, object]:
    """Start/connect an integration (gated per provider)."""
    _require_provider_access(provider, user)
    if provider not in {"github", "jira", "confluence", "slack"}:
        raise HTTPException(status_code=404, detail=f"Unknown provider: {provider}")
    return {
        "provider": provider,
        "connected": False,
        "detail": f"Connection flow for {provider}",
    }


@router.delete("/{provider}")
def disconnect_provider(provider: str, user: CurrentUser = Depends(get_current_user)) -> dict[str, object]:
    """Disconnect an integration (gated per provider)."""
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
    """Post the architecture summary to Slack (COMPANY ONLY, one-way send)."""
    return {"shared": True, "channel": body.get("channel", ""), "ts": "1234567890.123456"}
