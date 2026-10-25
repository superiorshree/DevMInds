# File:        backend/app/core/modes.py
# Owner:       Shreyansh (co-owned with Devyani — shared contract)
# Purpose:     Defines the two user modes and which features each mode may use, plus the FastAPI dependency that enforces those features server-side.
# Contains:    UserMode enum, CurrentUser dataclass, MODE_FEATURES capabilities dict, get_current_user(), mode_for_user(), require_feature().
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/core/config.py

"""Mode definitions and server-side feature enforcement.

This is a SHARED CONTRACT. Both the backend and the extension mirror it
(extension/src/types/mode.ts). Change it only after the whole team agrees.

Golden rule: the BACKEND enforces the mode. Hiding a button in the UI is not
security. Company-only endpoints must return HTTP 403 in Open Contributor mode.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Callable

from fastapi import Depends, HTTPException, status


class UserMode(str, Enum):
    """The two modes DevMinds supports."""

    open_source = "open_source"
    company = "company"


# Feature flags per mode. This is the single source of truth for what each mode
# can do. The extension reads the resolved features from GET /api/me/mode.
MODE_FEATURES: dict[str, dict[str, bool]] = {
    "open_source": {
        "privateRepos": False,
        "contributeTab": True,
        "contextTab": False,
        "jira": False,
        "confluence": False,
        "slackShare": False,
    },
    "company": {
        "privateRepos": True,
        "contributeTab": False,
        "contextTab": True,
        "jira": True,
        "confluence": True,
        "slackShare": True,
    },
}


@dataclass(frozen=True)
class CurrentUser:
    """The signed-in user as known server-side.

    The mode here is the SERVER-SIDE mode. It is the only mode the backend
    trusts for authorization. A mode value sent by the frontend is never used.
    """

    id: str
    github_login: str
    avatar_url: str
    mode: UserMode
    display_name: str = ""
    email: str = ""
    provider: str = "github"


def mode_for_user(user: CurrentUser) -> UserMode:
    """Return the user's server-side mode."""
    return user.mode


def features_for_mode(mode: str) -> dict[str, bool]:
    """Return the feature dict for a mode (what the frontend should render)."""
    return MODE_FEATURES[mode]


def mode_has_feature(mode: str, feature: str) -> bool:
    """Return True if the given mode allows the given feature."""
    return MODE_FEATURES[mode].get(feature, False)


def require_feature(feature: str) -> Callable[[], CurrentUser]:
    """FastAPI dependency factory that enforces a feature server-side.

    Usage: Depends(require_feature("jira"))

    Raises HTTP 403 when the SERVER-SIDE mode of the current user lacks the
    feature. Never trust a mode value sent by the frontend.
    """

    # Imported here (not at module top) to avoid a circular import: security.py
    # imports CurrentUser/UserMode from this module.
    from app.core.security import get_current_user

    def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not mode_has_feature(user.mode, feature):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Feature '{feature}' is not available in mode '{user.mode.value}'",
            )
        return user

    return dependency
