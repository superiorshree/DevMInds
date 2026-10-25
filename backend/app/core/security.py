# File:        backend/app/core/security.py
# Owner:       Shreyansh
# Purpose:     Handles authentication and the server-side notion of the current user.
# Contains:    get_current_user() FastAPI dependency, create_session_token(), verify_session_token(), revoke_session_token(), find_or_create_user(), update_user_mode(), github_token_for(), in-memory user store.
# Status:      REAL — HS256 sessions + bearer auth, server-side mode updates and server-only GitHub tokens; users live in memory until we add the database.
# Depends on:  backend/app/core/config.py (SESSION_SECRET), backend/app/core/modes.py (CurrentUser, UserMode)

"""Authentication helpers.

Authentication answers "who is this?" (GitHub OAuth session). Authorization
answers "what may they do?" — that lives in core/modes.py.

The backend must never trust a mode value sent by the frontend; the mode used
for authorization always comes from the current user loaded here.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Header, HTTPException, status

from app.core.config import get_settings
from app.core.modes import CurrentUser, UserMode

#: How long a session token stays valid.
SESSION_TTL = timedelta(days=7)


@dataclass
class StoredUser:
    """A user row as persisted server-side (in memory for now).

    The GitHub token is stored here and NEVER returned to the client.
    """

    id: str
    github_login: str
    avatar_url: str
    mode: UserMode
    github_token: str = ""

    def to_current_user(self) -> CurrentUser:
        """Project the stored user onto the public CurrentUser shape."""
        return CurrentUser(
            id=self.id,
            github_login=self.github_login,
            avatar_url=self.avatar_url,
            mode=self.mode,
        )


# TODO(Shreyansh): replace this in-memory store with the users table
# (backend/app/database/models.py) so sessions survive restarts.
_USERS: dict[str, StoredUser] = {}

#: Tokens invalidated by POST /api/auth/logout. Checked on every request.
#: TODO(Shreyansh): move revocation to the database alongside the user rows.
_REVOKED_TOKENS: set[str] = set()


def find_or_create_user(
    github_id: int, login: str, avatar_url: str, github_token: str = ""
) -> CurrentUser:
    """Return the user for a GitHub account, creating them on first sign-in.

    New users default to mode open_source. The mode is persisted
    server-side here and is never taken from the client. The GitHub token is
    kept on the server only and is never part of CurrentUser.
    """
    user_id = f"usr_{github_id}"
    record = _USERS.get(user_id)
    if record is None:
        record = StoredUser(
            id=user_id,
            github_login=login,
            avatar_url=avatar_url,
            mode=UserMode.open_source,
            github_token=github_token,
        )
        _USERS[user_id] = record
    else:
        # Refresh profile fields on every sign-in; never touch the mode.
        record.github_login = login
        record.avatar_url = avatar_url
        record.github_token = github_token
    return record.to_current_user()


def update_user_mode(user: CurrentUser, mode: UserMode) -> CurrentUser:
    """Persist a new SERVER-SIDE mode for an already-authenticated user.

    Used by PUT /api/me/mode. Raises KeyError when the user is unknown (not
    reachable through the route: get_current_user() only returns stored users).
    """
    record = _USERS.get(user.id)
    if record is None:
        raise KeyError(user.id)
    record.mode = mode
    return record.to_current_user()


def github_token_for(user_id: str) -> str:
    """Return the user's GitHub token for SERVER-SIDE API calls only.

    Never returned to the client and never put in a response body — the
    callers pass it straight into an adapter that talks to GitHub.
    """
    import os
    record = _USERS.get(user_id)
    token = record.github_token if record is not None else ""
    if not token:
        settings = get_settings()
        token = (
            getattr(settings, "github_token", "")
            or getattr(settings, "vite_github_token", "")
            or os.environ.get("GITHUB_TOKEN", "")
            or os.environ.get("VITE_GITHUB_TOKEN", "")
        )
    return token


def _session_secret() -> str:
    """Return the HS256 signing secret, refusing to run when it is not set."""
    secret = get_settings().session_secret
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SESSION_SECRET is not configured",
        )
    return secret


def create_session_token(user_id: str) -> str:
    """Create a signed, expiring (HS256) session token for a user."""
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "iat": now, "exp": now + SESSION_TTL}
    return jwt.encode(payload, _session_secret(), algorithm="HS256")


def verify_session_token(token: str) -> str | None:
    """Verify a session token and return the user id, or None if invalid."""
    if token in _REVOKED_TOKENS:
        return None
    try:
        payload = jwt.decode(token, _session_secret(), algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    sub = payload.get("sub")
    return sub if isinstance(sub, str) else None


def revoke_session_token(token: str) -> None:
    """Invalidate a session token (used by logout)."""
    _REVOKED_TOKENS.add(token)


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> CurrentUser:
    """Return the signed-in user for this request (server-side mode).

    Reads the Authorization: Bearer header, verifies the session token, and
    loads the user with their persisted server-side mode. Raises HTTP 401 when
    the token is missing, malformed, expired or revoked.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ").strip()
    user_id = verify_session_token(token) if token else None
    record = _USERS.get(user_id) if user_id else None
    if record is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return record.to_current_user()
