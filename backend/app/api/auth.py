# File:        backend/app/api/auth.py
# Owner:       Shreyansh
# Purpose:     GitHub OAuth routes — start login, handle callback, return the current user, log out.
# Contains:    FastAPI APIRouter with GET /github, GET /github/callback, GET /me, POST /logout; file-backed OAuth state store; GitHub token exchange + profile fetch helpers.
# Status:      REAL — full OAuth code flow with server-side sessions; OAuth states persist across restarts and are shared between workers (temp-dir file store).
# Depends on:  backend/app/core/security.py, backend/app/core/config.py, backend/app/schemas/common.py, httpx

"""Auth routes.

Authentication proves who you are (GitHub OAuth). Authorization (what they may
do) is enforced per-route by require_feature() in core/modes.py.
"""

import hashlib
import json
import re
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import gettempdir
from typing import Annotated
from urllib.parse import urlencode, urlsplit

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

# Pending OAuth states are stored as ONE FILE EACH under the system temp dir.
# A module-level dict alone cannot survive a `--reload`/restart and is invisible
# to other worker processes — the callback then rejects the very state this
# flow issued ("Invalid OAuth state"). The file store is shared by every
# process on this machine and survives restarts.
# The file name is the SHA-256 of the state: raw states never touch the disk or
# directory listings, and a caller-supplied state can never escape the folder.
_STATE_DIR = Path(gettempdir()) / "devminds-oauth-states"
_STATE_SUFFIX = ".state"

# Local index of pending state -> expiry, used for pruning and introspection.
# The file store is what validates callbacks; this dict is never trusted alone.
# TODO(Shreyansh): for multi-host deployments move the state store to the
# database / a shared cache — file-backed state is per-machine.
_pending_states: dict[str, datetime] = {}


def validate_extension_redirect_uri(redirect_uri: str | None = None) -> str:
    """Validate and normalize the extension redirect URI.

    Only accepts HTTPS URLs targeting <extension_id>.chromiumapp.org with
    an allowed extension ID and an expected callback path (/provide_cb.html or /provider_cb.html).
    Falls back to settings.extension_redirect_uri if redirect_uri is omitted.
    Raises HTTPException(400) if the URI is invalid, disallowed, or missing.
    """
    settings = get_settings()
    target_uri = (redirect_uri or "").strip()
    if not target_uri:
        target_uri = (settings.extension_redirect_uri or "").strip()
    if not target_uri:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Extension redirect URI is required",
        )

    try:
        parsed = urlsplit(target_uri)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid redirect URI",
        )

    if parsed.scheme != "https":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid redirect URI: scheme must be https",
        )

    # Rejects credentials (user:pass@) and ports (host:port)
    if not parsed.netloc or not parsed.hostname or parsed.netloc != parsed.hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid redirect URI host",
        )

    hostname = parsed.hostname.lower()
    suffix = ".chromiumapp.org"
    if not hostname.endswith(suffix):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid redirect URI domain: must be chromiumapp.org",
        )

    extension_id = hostname[: -len(suffix)]
    if not extension_id or not re.match(r"^[a-z0-9_-]+$", extension_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid extension ID in redirect URI",
        )

    # Path check: provide_cb.html (standard) or provider_cb.html (legacy)
    if parsed.path not in ("/provide_cb.html", "/provider_cb.html"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid redirect URI path",
        )

    if parsed.query or parsed.fragment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Redirect URI must not contain query parameters or fragment",
        )

    allowed_ids = settings.allowed_extension_ids_set
    if extension_id not in allowed_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extension ID '{extension_id}' is not in the allowlist",
        )

    return f"https://{hostname}{parsed.path}"


def _state_path(state: str) -> Path:
    """Return the store file for a state (SHA-256 name — traversal-proof)."""
    digest = hashlib.sha256(state.encode("utf-8")).hexdigest()
    return _STATE_DIR / f"{digest}{_STATE_SUFFIX}"


def _prune_state_files(now: datetime) -> None:
    """Best-effort removal of expired state files and stale temp files."""
    for path in _STATE_DIR.glob(f"*{_STATE_SUFFIX}"):
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        expired = True
        try:
            data = json.loads(text)
            if isinstance(data, dict) and "expires_at" in data:
                expired = now > datetime.fromisoformat(data["expires_at"])
        except Exception:
            try:
                expired = now > datetime.fromisoformat(text.strip())
            except Exception:
                expired = True
        if expired:
            try:
                path.unlink()
            except OSError:
                pass
    # Leftovers of an atomic write that crashed mid-way.
    for path in _STATE_DIR.glob(f"*{_STATE_SUFFIX}.*.tmp"):
        try:
            if now.timestamp() - path.stat().st_mtime > STATE_TTL.total_seconds():
                path.unlink()
        except OSError:
            pass


def _create_state(redirect_uri: str) -> str:
    """Generate a fresh OAuth state bound to the validated redirect URI.

    The state is published as a file first (atomic rename), so it is visible to
    whichever process ends up serving the callback — including after a restart.
    """
    now = datetime.now(timezone.utc)
    for key, expires_at in list(_pending_states.items()):
        if now > expires_at:
            del _pending_states[key]
    _STATE_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    _prune_state_files(now)
    # secrets.token_urlsafe is cryptographically random — unguessable state.
    state = secrets.token_urlsafe(32)
    expires_at = now + STATE_TTL
    path = _state_path(state)
    tmp = _STATE_DIR / f"{path.name}.{secrets.token_hex(4)}.tmp"
    payload = {
        "expires_at": expires_at.isoformat(),
        "redirect_uri": redirect_uri,
    }
    tmp.write_text(json.dumps(payload), encoding="utf-8")
    tmp.replace(path)  # atomic publish: readers never see a half-written entry.
    _pending_states[state] = expires_at
    return state


def _consume_state(state: str | None) -> str:
    """Validate the returned OAuth state, consume it (single use), and return redirect URI.

    The state file is the authority: reading it proves the state was issued,
    and deleting it claims it, so exactly one callback can ever succeed.
    Raises HTTP 400 when the state is missing, unknown, expired, corrupt, or already
    consumed.
    """
    if not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")
    path = _state_path(state)
    try:
        text = path.read_text(encoding="utf-8")
        path.unlink()  # atomic claim — of two racing callbacks only one wins.
    except (FileNotFoundError, PermissionError):
        # Unknown state, a replay after consumption, or a concurrent duplicate.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state"
        ) from None

    try:
        data = json.loads(text)
        if not isinstance(data, dict):
            raise ValueError("State data is not a dict")
        expires_at = datetime.fromisoformat(data["expires_at"])
        redirect_uri = data.get("redirect_uri")
        if not redirect_uri or not isinstance(redirect_uri, str):
            raise ValueError("Invalid redirect_uri in state")
    except Exception:
        # Invalid or legacy format lacking redirect_uri fails closed
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state"
        ) from None

    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")
    _pending_states.pop(state, None)
    return redirect_uri


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
def start_github_oauth(redirect_uri: str | None = Query(default=None)) -> RedirectResponse:
    """Redirect the user to GitHub's OAuth authorize URL (minimal scope)."""
    settings = get_settings()
    if not settings.github_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GITHUB_CLIENT_ID is not configured",
        )
    validated_redirect_uri = validate_extension_redirect_uri(redirect_uri)
    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": settings.github_redirect_uri,
        "scope": OAUTH_SCOPE,
        "state": _create_state(validated_redirect_uri),
    }
    return RedirectResponse(f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}", status_code=status.HTTP_302_FOUND)


@router.get("/github/callback")
def github_oauth_callback(code: str, state: str | None = Query(default=None)) -> RedirectResponse:
    """Handle the OAuth callback and create a session.

    Verifies the state, retrieves the bound extension redirect URI, exchanges
    the code for a token, loads (or creates) the user, issues a signed session
    token, and redirects to the extension with the token in the URL fragment.
    The GitHub token stays on the server.
    """
    target_redirect_uri = _consume_state(state)
    github_token = _exchange_code_for_token(code)
    profile = _fetch_github_profile(github_token)
    user = find_or_create_user(
        github_id=int(profile["id"]),
        login=str(profile["login"]),
        avatar_url=str(profile.get("avatar_url", "")),
        github_token=github_token,
    )
    session_token = create_session_token(user.id)
    fragment = urlencode({"token": session_token})
    return RedirectResponse(f"{target_redirect_uri}#{fragment}", status_code=status.HTTP_302_FOUND)


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
