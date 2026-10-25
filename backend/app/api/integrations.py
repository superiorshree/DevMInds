# File:        backend/app/api/integrations.py
# Owner:       Kunal
# Purpose:     Routes to list, connect and disconnect integrations, and to share the architecture summary to Slack.
# Contains:    FastAPI APIRouter with GET /api/integrations, POST /{provider}/connect, DELETE /{provider}, POST /slack/share.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/core/modes.py, backend/app/integrations/{jira,confluence,slack}.py

"""Integration routes.

Per-provider feature gating: jira needs feature "jira", confluence needs
"confluence", slack needs "slackShare". All of these are false in Open
Contributor mode, so these return HTTP 403 there. Slack share is one-way send
only — DevMinds never reads Slack messages.
"""

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


@router.get("")
async def list_integrations(
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, list[dict[str, object]]]:
    """List integrations with real connection status."""

    Availability comes from the server-side mode; `connected` comes from the
    connectors themselves (their config/credential check), so unavailable
    providers are never queried at all.
    """
    statuses = integration_status()
    providers = [
        ("github", ""),
        ("jira", "jira"),
        ("confluence", "confluence"),
        ("slack", "slackShare"),
    ]

    # Never query company services for users without company access.
    is_company = user.mode == UserMode.company

    health = await integration_health() if is_company else {}

    out = []

    for name, feature in providers:
        available = not feature or mode_has_feature(user.mode, feature)
        connected = available and statuses.get(name, "not_connected") == "connected"
        out.append(
            {
                "provider": name,
                "available": available,
                "connected": connected,
                "detail": "" if available else f"Requires feature '{feature}'",
            }
        )

        out.append({
            "provider": name,
            "available": available,
            "connected": connected,
            "detail": (
                provider_health
                if available and name != "github"
                else (
                    "Connection status not implemented"
                    if available
                    else f"Requires feature '{feature}'"
                )
            ),
        })

    return {"providers": out}

@router.post("/{provider}/connect")
def connect_provider(provider: str, user: CurrentUser = Depends(get_current_user)) -> dict[str, object]:
    """Start/connect an integration (gated per provider).

    Returns the contract shape {provider, connected, detail}. `connected` is
    still false because the real    connection flow is not implemented yet — this stub never claims a connection that did not happen.

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
