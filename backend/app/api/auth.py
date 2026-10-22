# File:        backend/app/api/auth.py
# Owner:       Shreyansh
# Purpose:     GitHub OAuth routes — start login, handle callback, return the current user, log out.
# Contains:    FastAPI APIRouter with GET /github, GET /github/callback, GET /me, POST /logout.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/core/security.py, backend/app/core/config.py, backend/app/schemas/common.py

"""Auth routes.

Authentication proves who you are (GitHub OAuth). Authorization (what they may
do) is enforced per-route by require_feature() in core/modes.py.
"""

from fastapi import APIRouter

from app.core.security import get_current_user
from app.schemas.common import DetailResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/github")
def start_github_oauth() -> dict[str, str]:
    """Redirect the user to GitHub's OAuth authorize URL.

    TODO(Shreyansh): build the authorize URL from config (client_id, redirect_uri,
    scope=read:user) and return a 302 redirect to it.
    """
    return {"detail": "TODO(Shreyansh): redirect to GitHub OAuth authorize URL"}


@router.get("/github/callback")
def github_oauth_callback(code: str, state: str) -> dict[str, str]:
    """Handle the OAuth callback and create a session.

    TODO(Shreyansh): exchange the code for an access token, fetch the user,
    create/update the DB row, issue a session cookie, and redirect to the
    extension.
    """
    return {"detail": "TODO(Shreyansh): exchange code, create session, redirect"}


@router.get("/me")
def read_me() -> dict[str, str]:
    """Return the currently signed-in user and their server-side mode."""
    # TODO(Shreyansh): return the real session user (id, github_login,
    # avatar_url, mode). Raise 401 when not signed in.
    user = get_current_user()
    return {
        "id": user.id,
        "github_login": user.github_login,
        "avatar_url": user.avatar_url,
        "mode": user.mode.value,
    }


@router.post("/logout")
def logout() -> DetailResponse:
    """Clear the session.

    TODO(Shreyansh): invalidate the session cookie / token.
    """
    return DetailResponse(detail="Logged out")
