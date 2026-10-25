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
from typing import Annotated, Any, Optional
from urllib.parse import urlencode, urlsplit

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.modes import CurrentUser, UserMode
from app.core.security import (
    create_session_token,
    find_or_create_provider_user,
    find_or_create_user,
    get_current_user,
    revoke_session_token,
)
from app.integrations.auth_verifier import (
    AtlassianOAuthHelper,
    ConfluenceAuthClient,
    JiraAuthClient,
    SlackAuthClient,
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


# ==============================================================================
# Real Account Login Models & Endpoints (Jira, Confluence, Slack)
# ==============================================================================

class JiraLoginRequest(BaseModel):
    """Credentials for Jira login; falls back to environment variables if omitted."""
    email: Optional[str] = None
    api_token: Optional[str] = None
    base_url: Optional[str] = None


class ConfluenceLoginRequest(BaseModel):
    """Credentials for Confluence login; falls back to environment variables if omitted."""
    email: Optional[str] = None
    api_token: Optional[str] = None
    base_url: Optional[str] = None


class SlackLoginRequest(BaseModel):
    """Credentials for Slack login; falls back to environment variables if omitted."""
    token: Optional[str] = None


class ProviderLoginRequest(BaseModel):
    """Unified login request supporting jira, confluence, or slack."""
    provider: str = Field(description="jira, confluence, or slack")
    email: Optional[str] = None
    api_token: Optional[str] = None
    base_url: Optional[str] = None
    token: Optional[str] = None


class UserPayload(BaseModel):
    id: str
    github_login: str
    display_name: str
    email: str
    avatar_url: str
    mode: str
    provider: str


class LoginResponse(BaseModel):
    token: str
    user: UserPayload


@router.post("/login/jira", response_model=LoginResponse)
def login_with_jira(payload: Optional[JiraLoginRequest] = None) -> LoginResponse:
    """Log in to DevMinds with a real Jira Cloud account.

    Authenticates against Jira /rest/api/3/myself, registers the user, assigns
    company mode, and returns a signed HS256 session token.
    """
    req = payload or JiraLoginRequest()
    client = JiraAuthClient(
        base_url=req.base_url,
        email=req.email,
        api_token=req.api_token,
    )
    result = client.verify_auth()
    if not result.success:
        err_detail = result.message
        if result.errors:
            err_detail += f" ({'; '.join(result.errors)})"
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=err_detail)

    account_id = str(result.identity.get("account_id") or "jira_user")
    display_name = str(result.identity.get("display_name") or "Jira User")
    email = str(result.identity.get("email_address") or "")

    user = find_or_create_provider_user(
        provider="jira",
        provider_id=account_id,
        display_name=display_name,
        email=email,
        mode=UserMode.company,
        access_token=req.api_token or "",
    )
    session_token = create_session_token(user.id)
    return LoginResponse(
        token=session_token,
        user=UserPayload(
            id=user.id,
            github_login=user.github_login,
            display_name=user.display_name or user.github_login,
            email=user.email,
            avatar_url=user.avatar_url,
            mode=user.mode.value,
            provider="jira",
        ),
    )


@router.post("/login/confluence", response_model=LoginResponse)
def login_with_confluence(payload: Optional[ConfluenceLoginRequest] = None) -> LoginResponse:
    """Log in to DevMinds with a real Confluence Cloud account."""
    req = payload or ConfluenceLoginRequest()
    client = ConfluenceAuthClient(
        base_url=req.base_url,
        email=req.email,
        api_token=req.api_token,
    )
    result = client.verify_auth()
    if not result.success:
        err_detail = result.message
        if result.errors:
            err_detail += f" ({'; '.join(result.errors)})"
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=err_detail)

    account_id = str(result.identity.get("account_id") or "confluence_user")
    display_name = str(result.identity.get("display_name") or "Confluence User")
    email = str(result.identity.get("email_address") or "")

    user = find_or_create_provider_user(
        provider="confluence",
        provider_id=account_id,
        display_name=display_name,
        email=email,
        mode=UserMode.company,
        access_token=req.api_token or "",
    )
    session_token = create_session_token(user.id)
    return LoginResponse(
        token=session_token,
        user=UserPayload(
            id=user.id,
            github_login=user.github_login,
            display_name=user.display_name or user.github_login,
            email=user.email,
            avatar_url=user.avatar_url,
            mode=user.mode.value,
            provider="confluence",
        ),
    )


@router.post("/login/slack", response_model=LoginResponse)
def login_with_slack(payload: Optional[SlackLoginRequest] = None) -> LoginResponse:
    """Log in to DevMinds with a real Slack Bot or User account."""
    req = payload or SlackLoginRequest()
    client = SlackAuthClient(bot_token=req.token)
    result = client.verify_auth()
    if not result.success:
        err_detail = result.message
        if result.errors:
            err_detail += f" ({'; '.join(result.errors)})"
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=err_detail)

    user_id = str(result.identity.get("user_id") or "slack_user")
    user_name = str(result.identity.get("user_name") or "Slack User")
    team_name = str(result.identity.get("team_name") or "")
    display_name = f"{user_name} ({team_name})" if team_name else user_name

    user = find_or_create_provider_user(
        provider="slack",
        provider_id=user_id,
        display_name=display_name,
        mode=UserMode.company,
        access_token=req.token or "",
    )
    session_token = create_session_token(user.id)
    return LoginResponse(
        token=session_token,
        user=UserPayload(
            id=user.id,
            github_login=user.github_login,
            display_name=user.display_name or user.github_login,
            email=user.email,
            avatar_url=user.avatar_url,
            mode=user.mode.value,
            provider="slack",
        ),
    )


@router.post("/login", response_model=LoginResponse)
def login_with_provider(payload: ProviderLoginRequest) -> LoginResponse:
    """Unified login dispatcher for Jira, Confluence, and Slack."""
    provider = payload.provider.lower().strip()
    if provider == "jira":
        return login_with_jira(JiraLoginRequest(email=payload.email, api_token=payload.api_token, base_url=payload.base_url))
    elif provider == "confluence":
        return login_with_confluence(ConfluenceLoginRequest(email=payload.email, api_token=payload.api_token, base_url=payload.base_url))
    elif provider == "slack":
        return login_with_slack(SlackLoginRequest(token=payload.token or payload.api_token))
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported provider: {provider}")


# ==============================================================================
# Atlassian OAuth 2.0 (3LO) Routes
# ==============================================================================

@router.get("/atlassian")
def start_atlassian_oauth(redirect_uri: Optional[str] = Query(default=None)) -> RedirectResponse:
    """Start 3-legged OAuth flow with Atlassian Cloud."""
    client_id = os.getenv("ATLASSIAN_CLIENT_ID", "").strip()
    callback_uri = os.getenv("ATLASSIAN_REDIRECT_URI", "http://localhost:8000/api/auth/atlassian/callback").strip()
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ATLASSIAN_CLIENT_ID is not configured in .env",
        )
    validated_target = validate_extension_redirect_uri(redirect_uri)
    auth_url = AtlassianOAuthHelper.build_authorization_url(
        client_id=client_id,
        redirect_uri=callback_uri,
        state=_create_state(validated_target),
    )
    return RedirectResponse(auth_url, status_code=status.HTTP_302_FOUND)


@router.get("/atlassian/callback")
def atlassian_oauth_callback(code: str, state: Optional[str] = Query(default=None)) -> RedirectResponse:
    """Exchange Atlassian authorization code, discover identity, and create session."""
    target_redirect_uri = _consume_state(state)
    client_id = os.getenv("ATLASSIAN_CLIENT_ID", "").strip()
    client_secret = os.getenv("ATLASSIAN_CLIENT_SECRET", "").strip()
    callback_uri = os.getenv("ATLASSIAN_REDIRECT_URI", "http://localhost:8000/api/auth/atlassian/callback").strip()

    try:
        tokens = AtlassianOAuthHelper.exchange_code_for_token(
            client_id=client_id,
            client_secret=client_secret,
            code=code,
            redirect_uri=callback_uri,
        )
        access_token = tokens["access_token"]
        # Fetch profile from Atlassian /me
        resp = httpx.get(
            "https://api.atlassian.com/me",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            timeout=15.0,
        )
        if resp.status_code == 200:
            profile = resp.json()
            account_id = profile.get("account_id") or profile.get("sub", "atlassian_user")
            display_name = profile.get("name") or "Atlassian User"
            email = profile.get("email", "")
            avatar_url = profile.get("picture", "")
        else:
            # Fallback to accessible-resources
            resources = AtlassianOAuthHelper.discover_accessible_resources(access_token)
            site_name = resources[0]["name"] if resources else "Atlassian"
            account_id = f"atlassian_{site_name}"
            display_name = f"User ({site_name})"
            email = ""
            avatar_url = ""

        user = find_or_create_provider_user(
            provider="atlassian",
            provider_id=account_id,
            display_name=display_name,
            email=email,
            avatar_url=avatar_url,
            mode=UserMode.company,
            access_token=access_token,
        )
        session_token = create_session_token(user.id)
        fragment = urlencode({"token": session_token})
        return RedirectResponse(f"{target_redirect_uri}#{fragment}", status_code=status.HTTP_302_FOUND)

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Atlassian OAuth exchange failed: {exc}",
        )


@router.get("/me")
def read_me(user: CurrentUser = Depends(get_current_user)) -> dict[str, Any]:
    """Return the currently signed-in user and their server-side mode."""
    return {
        "id": user.id,
        "github_login": user.github_login,
        "display_name": user.display_name or user.github_login,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "mode": user.mode.value,
        "provider": user.provider,
    }


@router.post("/logout")
def logout(authorization: Annotated[str | None, Header()] = None) -> DetailResponse:
    """Invalidate the current session token."""
    if authorization and authorization.startswith("Bearer "):
        revoke_session_token(authorization.removeprefix("Bearer ").strip())
    return DetailResponse(detail="Logged out")

