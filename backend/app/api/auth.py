# File:        backend/app/api/auth.py
# Owner:       Shreyansh
# Purpose:     GitHub OAuth routes — start login, handle callback, return the current user, log out.
# Contains:    FastAPI APIRouter with GET /github, GET /github/callback, GET /me, POST /logout; OAuth state store; GitHub token exchange + profile fetch helpers.
# Status:      REAL — full OAuth code flow with server-side sessions; state store is in memory until we add the database.
# Depends on:  backend/app/core/security.py, backend/app/core/config.py, backend/app/schemas/common.py, httpx

"""Auth routes.

Authentication proves who you are (GitHub OAuth). Authorization (what they may
do) is enforced per-route by require_feature() in core/modes.py.
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from fastapi.responses import RedirectResponse

from app.core.config import get_settings
from app.core.modes import CurrentUser
from app.core.security import (
    create_session_token,
    find_or_create_user,
    get_current_user,
    revoke_session_token,
)
from app.schemas.common import DetailResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
#: Minimal scope: read:user is enough for public repos; no repo scope needed.
OAUTH_SCOPE = "read:user"
#: How long an OAuth `state` stays valid before the callback rejects it.
STATE_TTL = timedelta(minutes=10)

# In-memory store of pending OAuth states -> expiry time.
# TODO(Shreyansh): move this to the database / a shared cache so it survives
# restarts and works with more than one worker.
_pending_states: dict[str, datetime] = {}


def _create_state() -> str:
    """Generate a fresh OAuth state, forget expired ones, remember the new one."""
    now = datetime.now(timezone.utc)
    for key, expires_at in list(_pending_states.items()):
        if now > expires_at:
            del _pending_states[key]
    # secrets.token_urlsafe is cryptographically random — unguessable state.
    state = secrets.token_urlsafe(32)
    _pending_states[state] = now + STATE_TTL
    return state


def _consume_state(state: str | None) -> None:
    """Validate the returned OAuth state and consume it (single use).

    Raises HTTP 400 when the state is missing, unknown or expired.
    """
    now = datetime.now(timezone.utc)
    expires_at = _pending_states.pop(state, None) if state else None
    if expires_at is None or now > expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")


def _exchange_code_for_token(code: str) -> str:
    """Exchange the OAuth code for a GitHub access token (server-side only)."""
    settings = get_settings()
    response = httpx.post(
        GITHUB_TOKEN_URL,
        headers={"Accept": "application/json"},
        data={
            "client_id": settings.github_client_id,
            "client_secret": settings.github_client_secret,
            "code": code,
            "redirect_uri": settings.github_redirect_uri,
        },
    )
    response.raise_for_status()
    access_token = response.json().get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="GitHub did not return an access token",
        )
    return str(access_token)


def _fetch_github_profile(access_token: str) -> dict[str, object]:
    """Fetch the signed-in user's GitHub profile (id, login, avatar_url)."""
    response = httpx.get(
        GITHUB_USER_URL,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {access_token}",
        },
    )
    response.raise_for_status()
    return response.json()


@router.get("/github")
def start_github_oauth() -> RedirectResponse:
    """Redirect the user to GitHub's OAuth authorize URL (minimal scope)."""
    settings = get_settings()
    if not settings.github_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GITHUB_CLIENT_ID is not configured",
        )
    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": settings.github_redirect_uri,
        "scope": OAUTH_SCOPE,
        "state": _create_state(),
    }
    return RedirectResponse(f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}", status_code=status.HTTP_302_FOUND)


@router.get("/github/callback")
def github_oauth_callback(code: str, state: str | None = Query(default=None)) -> RedirectResponse:
    """Handle the OAuth callback and create a session.

    Verifies the state, exchanges the code for a token, loads (or creates) the
    user, issues a signed session token, and redirects to the extension with
    the token in the URL fragment. The GitHub token stays on the server.
    """
    _consume_state(state)
    github_token = _exchange_code_for_token(code)
    profile = _fetch_github_profile(github_token)
    user = find_or_create_user(
        github_id=int(profile["id"]),
        login=str(profile["login"]),
        avatar_url=str(profile.get("avatar_url", "")),
        github_token=github_token,
    )
    session_token = create_session_token(user.id)
    settings = get_settings()
    if not settings.extension_redirect_uri:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="EXTENSION_REDIRECT_URI is not configured",
        )
    fragment = urlencode({"token": session_token})
    return RedirectResponse(f"{settings.extension_redirect_uri}#{fragment}", status_code=status.HTTP_302_FOUND)


@router.get("/me")
def read_me(user: CurrentUser = Depends(get_current_user)) -> dict[str, str]:
    """Return the currently signed-in user and their server-side mode."""
    return {
        "id": user.id,
        "github_login": user.github_login,
        "avatar_url": user.avatar_url,
        "mode": user.mode.value,
    }


@router.post("/logout")
def logout(authorization: Annotated[str | None, Header()] = None) -> DetailResponse:
    """Invalidate the current session token."""
    if authorization and authorization.startswith("Bearer "):
        revoke_session_token(authorization.removeprefix("Bearer ").strip())
    return DetailResponse(detail="Logged out")
