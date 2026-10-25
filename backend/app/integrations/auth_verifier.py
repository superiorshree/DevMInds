# File:        backend/app/integrations/auth_verifier.py
# Purpose:     Comprehensive authentication and verification client for Atlassian (Jira, Confluence) and Slack.
# Contains:    JiraAuthClient, ConfluenceAuthClient, SlackAuthClient, AtlassianOAuthHelper, CLI runner.

"""Authentication and Verification Module for Jira Cloud, Confluence Cloud, and Slack Web API.

Supports both:
1. Direct API Token / Bot Token Authentication (Standard server-to-server and backend integration)
2. OAuth 2.0 (3LO) Authentication (3-legged OAuth code exchange, token refresh, and Cloud ID discovery)
"""

from __future__ import annotations

import base64
import dataclasses
import hashlib
import hmac
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlencode

import httpx
from dotenv import find_dotenv, load_dotenv

# Automatically load environment variables from .env or backend/.env if present
_env_path = find_dotenv(usecwd=True)
if not _env_path:
    # Try looking in backend/.env relative to this file
    _candidate = Path(__file__).resolve().parent.parent.parent / ".env"
    if _candidate.is_file():
        _env_path = str(_candidate)

if _env_path:
    load_dotenv(_env_path)


# ==============================================================================
# Data Structures
# ==============================================================================

@dataclasses.dataclass(frozen=True)
class VerificationResult:
    """Outcome of an authentication verification attempt."""

    service: str
    success: bool
    status_code: Optional[int]
    message: str
    identity: Dict[str, Any] = dataclasses.field(default_factory=dict)
    errors: List[str] = dataclasses.field(default_factory=list)
    latency_ms: float = 0.0

    def print_summary(self) -> None:
        """Render a formatted, readable diagnostic block."""
        badge = "[PASS]" if self.success else "[FAIL]"
        print(f"\n{badge} {self.service.upper()} AUTHENTICATION")
        print(f"  Status:  {'CONNECTED' if self.success else 'FAILED'}")
        if self.status_code is not None:
            print(f"  HTTP:    {self.status_code}")
        print(f"  Latency: {self.latency_ms:.1f}ms")
        print(f"  Message: {self.message}")
        if self.identity:
            print("  Identity Details:")
            for k, v in self.identity.items():
                print(f"    - {k}: {v}")
        if self.errors:
            print("  Diagnostics / Remediation:")
            for err in self.errors:
                print(f"    ! {err}")


# ==============================================================================
# 1. Jira Cloud Authenticator
# ==============================================================================

class JiraAuthClient:
    """Handles Jira Cloud authentication verification and verified test calls."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        email: Optional[str] = None,
        api_token: Optional[str] = None,
        oauth_access_token: Optional[str] = None,
        cloud_id: Optional[str] = None,
        timeout_seconds: float = 15.0,
    ) -> None:
        raw_url = base_url if base_url is not None else os.getenv("JIRA_BASE_URL", "")
        self.base_url = raw_url.strip().rstrip("/")
        self.email = (email if email is not None else os.getenv("JIRA_EMAIL", "")).strip()
        self.api_token = (api_token if api_token is not None else os.getenv("JIRA_API_TOKEN", "")).strip()
        self.oauth_access_token = (
            oauth_access_token
            if oauth_access_token is not None
            else (os.getenv("JIRA_ACCESS_TOKEN", "") or os.getenv("ATLASSIAN_ACCESS_TOKEN", ""))
        ).strip()
        self.cloud_id = (cloud_id if cloud_id is not None else os.getenv("ATLASSIAN_CLOUD_ID", "")).strip()
        self.timeout = timeout_seconds

    def validate_environment(self) -> List[str]:
        """Check for missing configuration variables."""
        missing = []
        is_oauth = bool(self.oauth_access_token and self.cloud_id)
        if not is_oauth:
            if not self.base_url:
                missing.append("JIRA_BASE_URL (e.g. 'https://your-domain.atlassian.net')")
            if not self.email:
                missing.append("JIRA_EMAIL (the email tied to your Atlassian account)")
            if not self.api_token:
                missing.append("JIRA_API_TOKEN (generated at https://id.atlassian.com/manage-profile/security/api-tokens)")
        return missing

    def verify_auth(self) -> VerificationResult:
        """Perform verified call: GET /rest/api/3/myself."""
        missing = self.validate_environment()
        if missing:
            return VerificationResult(
                service="jira",
                success=False,
                status_code=None,
                message="Missing required Jira credentials in environment variables.",
                errors=[f"Missing variable: {item}" for item in missing],
            )

        start = time.perf_counter()
        try:
            # Route 1: OAuth 2.0 (3LO) via Atlassian API Gateway
            if self.oauth_access_token and self.cloud_id:
                url = f"https://api.atlassian.com/ex/jira/{self.cloud_id}/rest/api/3/myself"
                headers = {
                    "Authorization": f"Bearer {self.oauth_access_token}",
                    "Accept": "application/json",
                }
                resp = httpx.get(url, headers=headers, timeout=self.timeout)
            # Route 2: Basic Auth via API Token on Site URL
            else:
                url = f"{self.base_url}/rest/api/3/myself"
                headers = {"Accept": "application/json"}
                resp = httpx.get(
                    url,
                    auth=httpx.BasicAuth(self.email, self.api_token),
                    headers=headers,
                    timeout=self.timeout,
                )

            latency = (time.perf_counter() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                identity = {
                    "account_id": data.get("accountId"),
                    "display_name": data.get("displayName"),
                    "email_address": data.get("emailAddress", "(hidden or private)"),
                    "account_type": data.get("accountType"),
                    "active": data.get("active"),
                    "time_zone": data.get("timeZone"),
                }
                return VerificationResult(
                    service="jira",
                    success=True,
                    status_code=resp.status_code,
                    message="Successfully authenticated and verified Jira user identity.",
                    identity=identity,
                    latency_ms=latency,
                )

            # Failure handling
            errors = []
            if resp.status_code == 401:
                errors.append(
                    "HTTP 401 Unauthorized: Invalid API token or email. "
                    "Confirm your email matches your Atlassian account and generate a fresh token at id.atlassian.com."
                )
            elif resp.status_code == 403:
                errors.append(
                    "HTTP 403 Forbidden: Token lacks Jira access permissions, or Atlassian Cloud site requires SAML/SSO enforcement. "
                    "Ensure scope 'read:jira-user' or 'read:me' is granted."
                )
            elif resp.status_code == 404:
                errors.append(
                    f"HTTP 404 Not Found at {url}: Check your JIRA_BASE_URL. "
                    "Do NOT append '/jira' to the base URL. Example: https://your-domain.atlassian.net"
                )
            else:
                errors.append(f"HTTP {resp.status_code}: {resp.text[:200]}")

            return VerificationResult(
                service="jira",
                success=False,
                status_code=resp.status_code,
                message=f"Jira authentication failed with HTTP {resp.status_code}.",
                errors=errors,
                latency_ms=latency,
            )

        except httpx.RequestError as exc:
            latency = (time.perf_counter() - start) * 1000
            return VerificationResult(
                service="jira",
                success=False,
                status_code=None,
                message=f"Network error communicating with Jira: {type(exc).__name__}",
                errors=[str(exc), "Check internet connectivity and verify DNS resolution for your site URL."],
                latency_ms=latency,
            )


# ==============================================================================
# 2. Confluence Cloud Authenticator
# ==============================================================================

class ConfluenceAuthClient:
    """Handles Confluence Cloud authentication verification and verified test calls."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        email: Optional[str] = None,
        api_token: Optional[str] = None,
        oauth_access_token: Optional[str] = None,
        cloud_id: Optional[str] = None,
        timeout_seconds: float = 15.0,
    ) -> None:
        raw_url = base_url if base_url is not None else os.getenv("CONFLUENCE_BASE_URL", "")
        self.base_url = raw_url.strip().rstrip("/")
        self.email = (email if email is not None else os.getenv("CONFLUENCE_EMAIL", "")).strip()
        self.api_token = (api_token if api_token is not None else os.getenv("CONFLUENCE_API_TOKEN", "")).strip()
        self.oauth_access_token = (
            oauth_access_token
            if oauth_access_token is not None
            else (os.getenv("CONFLUENCE_ACCESS_TOKEN", "") or os.getenv("ATLASSIAN_ACCESS_TOKEN", ""))
        ).strip()
        self.cloud_id = (cloud_id if cloud_id is not None else os.getenv("ATLASSIAN_CLOUD_ID", "")).strip()
        self.timeout = timeout_seconds

    def validate_environment(self) -> List[str]:
        """Check for missing configuration variables."""
        missing = []
        is_oauth = bool(self.oauth_access_token and self.cloud_id)
        if not is_oauth:
            if not self.base_url:
                missing.append("CONFLUENCE_BASE_URL (e.g. 'https://your-domain.atlassian.net/wiki')")
            if not self.email:
                missing.append("CONFLUENCE_EMAIL (the email tied to your Atlassian account)")
            if not self.api_token:
                missing.append("CONFLUENCE_API_TOKEN (generated at https://id.atlassian.com/manage-profile/security/api-tokens)")
        return missing

    def verify_auth(self) -> VerificationResult:
        """Perform verified call: GET /rest/api/user/current or /wiki/rest/api/3/users/me."""
        missing = self.validate_environment()
        if missing:
            return VerificationResult(
                service="confluence",
                success=False,
                status_code=None,
                message="Missing required Confluence credentials in environment variables.",
                errors=[f"Missing variable: {item}" for item in missing],
            )

        start = time.perf_counter()
        try:
            # Route 1: OAuth 2.0 (3LO) via Atlassian API Gateway
            if self.oauth_access_token and self.cloud_id:
                url = f"https://api.atlassian.com/ex/confluence/{self.cloud_id}/wiki/rest/api/3/users/me"
                headers = {
                    "Authorization": f"Bearer {self.oauth_access_token}",
                    "Accept": "application/json",
                }
                resp = httpx.get(url, headers=headers, timeout=self.timeout)
                # Fallback to v1 endpoint if v3 isn't available
                if resp.status_code == 404:
                    url = f"https://api.atlassian.com/ex/confluence/{self.cloud_id}/wiki/rest/api/user/current"
                    resp = httpx.get(url, headers=headers, timeout=self.timeout)

            # Route 2: Basic Auth via API Token on Site URL
            else:
                # Confluence Cloud endpoints live under /wiki/rest/api/
                if self.base_url.endswith("/wiki"):
                    url = f"{self.base_url}/rest/api/user/current"
                else:
                    url = f"{self.base_url}/wiki/rest/api/user/current"

                headers = {"Accept": "application/json"}
                resp = httpx.get(
                    url,
                    auth=httpx.BasicAuth(self.email, self.api_token),
                    headers=headers,
                    timeout=self.timeout,
                )

            latency = (time.perf_counter() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                identity = {
                    "account_id": data.get("accountId"),
                    "display_name": data.get("displayName") or data.get("publicName"),
                    "email_address": data.get("email", "(hidden or private)"),
                    "type": data.get("type", "known"),
                    "status": "active" if data.get("accountId") else "unknown",
                }
                return VerificationResult(
                    service="confluence",
                    success=True,
                    status_code=resp.status_code,
                    message="Successfully authenticated and verified Confluence user identity.",
                    identity=identity,
                    latency_ms=latency,
                )

            # Failure handling
            errors = []
            if resp.status_code == 401:
                errors.append(
                    "HTTP 401 Unauthorized: Invalid Confluence API token or email. "
                    "Ensure CONFLUENCE_EMAIL matches your Atlassian ID and the API token was generated under that account."
                )
            elif resp.status_code == 403:
                errors.append(
                    "HTTP 403 Forbidden: Account does not have permission to access Confluence on this site. "
                    "Check site admin settings to confirm Confluence product access is enabled for this user."
                )
            elif resp.status_code == 404:
                errors.append(
                    f"HTTP 404 Not Found at {url}: Confluence Cloud endpoints must be prefixed with '/wiki'. "
                    "Ensure CONFLUENCE_BASE_URL ends with '/wiki' or your site has Confluence activated."
                )
            else:
                errors.append(f"HTTP {resp.status_code}: {resp.text[:200]}")

            return VerificationResult(
                service="confluence",
                success=False,
                status_code=resp.status_code,
                message=f"Confluence authentication failed with HTTP {resp.status_code}.",
                errors=errors,
                latency_ms=latency,
            )

        except httpx.RequestError as exc:
            latency = (time.perf_counter() - start) * 1000
            return VerificationResult(
                service="confluence",
                success=False,
                status_code=None,
                message=f"Network error communicating with Confluence: {type(exc).__name__}",
                errors=[str(exc), "Check internet connectivity and verify DNS resolution for your site URL."],
                latency_ms=latency,
            )


# ==============================================================================
# 3. Slack Web API Authenticator
# ==============================================================================

class SlackAuthClient:
    """Handles Slack Web API authentication verification and verified test calls."""

    def __init__(
        self,
        bot_token: Optional[str] = None,
        signing_secret: Optional[str] = None,
        timeout_seconds: float = 15.0,
    ) -> None:
        self.token = (
            bot_token
            if bot_token is not None
            else (os.getenv("SLACK_BOT_TOKEN", "") or os.getenv("SLACK_USER_TOKEN", ""))
        ).strip()
        self.signing_secret = (
            signing_secret if signing_secret is not None else os.getenv("SLACK_SIGNING_SECRET", "")
        ).strip()
        self.timeout = timeout_seconds

    def validate_environment(self) -> List[str]:
        """Check for missing configuration variables."""
        missing = []
        if not self.token:
            missing.append("SLACK_BOT_TOKEN (starts with 'xoxb-') or SLACK_USER_TOKEN (starts with 'xoxp-')")
        return missing

    def verify_auth(self) -> VerificationResult:
        """Perform verified call: POST https://slack.com/api/auth.test."""
        missing = self.validate_environment()
        if missing:
            return VerificationResult(
                service="slack",
                success=False,
                status_code=None,
                message="Missing required Slack token in environment variables.",
                errors=[f"Missing variable: {item}" for item in missing],
            )

        start = time.perf_counter()
        try:
            url = "https://slack.com/api/auth.test"
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json; charset=utf-8",
            }
            resp = httpx.post(url, headers=headers, timeout=self.timeout)
            latency = (time.perf_counter() - start) * 1000

            if resp.status_code != 200:
                return VerificationResult(
                    service="slack",
                    success=False,
                    status_code=resp.status_code,
                    message=f"Slack HTTP error {resp.status_code}",
                    errors=[resp.text[:200]],
                    latency_ms=latency,
                )

            data = resp.json()
            is_ok = data.get("ok", False)

            if is_ok:
                identity = {
                    "team_name": data.get("team"),
                    "team_id": data.get("team_id"),
                    "user_name": data.get("user"),
                    "user_id": data.get("user_id"),
                    "bot_id": data.get("bot_id", "(user token)"),
                    "workspace_url": data.get("url"),
                }
                return VerificationResult(
                    service="slack",
                    success=True,
                    status_code=200,
                    message="Successfully authenticated and verified Slack Bot/User identity.",
                    identity=identity,
                    latency_ms=latency,
                )

            # Slack returns HTTP 200 with {"ok": false, "error": "..."}
            error_code = data.get("error", "unknown_error")
            errors = []
            if error_code == "invalid_auth":
                errors.append(
                    "Slack error 'invalid_auth': The token provided is invalid or malformed. "
                    "Make sure you copied the full token starting with 'xoxb-' or 'xoxp-'."
                )
            elif error_code == "token_revoked":
                errors.append("Slack error 'token_revoked': The token was revoked or reinstalled. Reinstall the app at api.slack.com/apps.")
            elif error_code == "account_inactive":
                errors.append("Slack error 'account_inactive': The user account or workspace is deactivated.")
            elif error_code == "not_authed":
                errors.append("Slack error 'not_authed': No authorization token was sent in the request header.")
            else:
                errors.append(f"Slack API error: '{error_code}'. Response payload: {data}")

            return VerificationResult(
                service="slack",
                success=False,
                status_code=200,
                message=f"Slack authentication rejected with error: '{error_code}'.",
                errors=errors,
                latency_ms=latency,
            )

        except httpx.RequestError as exc:
            latency = (time.perf_counter() - start) * 1000
            return VerificationResult(
                service="slack",
                success=False,
                status_code=None,
                message=f"Network error communicating with Slack: {type(exc).__name__}",
                errors=[str(exc)],
                latency_ms=latency,
            )

    def verify_request_signature(
        self,
        timestamp: str,
        raw_body: bytes,
        signature: str,
    ) -> bool:
        """Verify inbound Slack webhooks/events using SLACK_SIGNING_SECRET.

        Follows Slack official specification:
        1. Reject requests older than 5 minutes (prevents replay attacks).
        2. Hash 'v0:{timestamp}:{body}' using HMAC-SHA256 with the signing secret.
        3. Compare in constant-time against 'v0={hash}'.
        """
        if not self.signing_secret:
            raise ValueError("SLACK_SIGNING_SECRET is not configured.")

        # Replay attack prevention (5 minute window)
        current_time = int(time.time())
        try:
            req_time = int(timestamp)
        except (ValueError, TypeError):
            return False

        if abs(current_time - req_time) > 300:
            return False

        sig_basestring = f"v0:{timestamp}:".encode("utf-8") + raw_body
        expected_hash = hmac.new(
            self.signing_secret.encode("utf-8"),
            sig_basestring,
            hashlib.sha256,
        ).hexdigest()
        expected_sig = f"v0={expected_hash}"

        return hmac.compare_digest(expected_sig, signature)


# ==============================================================================
# 4. Atlassian OAuth 2.0 (3LO) Utility Helper
# ==============================================================================

class AtlassianOAuthHelper:
    """Helper for Atlassian Cloud 3-Legged OAuth (3LO) flows."""

    AUTH_URL = "https://auth.atlassian.com/authorize"
    TOKEN_URL = "https://auth.atlassian.com/oauth/token"
    ACCESSIBLE_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources"

    # Default recommended granular scopes (Atlassian migrated from classic scopes)
    DEFAULT_SCOPES = [
        "read:me",
        "read:jira-user",
        "read:jira-work",
        "read:confluence-user",
        "read:confluence-space:summary",
        "offline_access",  # Enables rotating refresh tokens
    ]

    @classmethod
    def build_authorization_url(
        cls,
        client_id: str,
        redirect_uri: str,
        state: str,
        scopes: Optional[List[str]] = None,
    ) -> str:
        """Generate the Atlassian user consent URL."""
        scope_str = " ".join(scopes or cls.DEFAULT_SCOPES)
        params = {
            "audience": "api.atlassian.com",
            "client_id": client_id,
            "scope": scope_str,
            "redirect_uri": redirect_uri,
            "state": state,
            "response_type": "code",
            "prompt": "consent",
        }
        return f"{cls.AUTH_URL}?{urlencode(params)}"

    @classmethod
    def exchange_code_for_token(
        cls,
        client_id: str,
        client_secret: str,
        code: str,
        redirect_uri: str,
    ) -> Dict[str, Any]:
        """Exchange the authorization code for access and refresh tokens."""
        payload = {
            "grant_type": "authorization_code",
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
        }
        resp = httpx.post(
            cls.TOKEN_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=15.0,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Atlassian token exchange failed ({resp.status_code}): {resp.text}")
        return resp.json()

    @classmethod
    def discover_accessible_resources(cls, access_token: str) -> List[Dict[str, Any]]:
        """Query accessible-resources to discover Cloud IDs, site names, and site URLs.

        Returns list of resources: [{'id': '<cloud_id>', 'name': '...', 'url': '...', 'scopes': [...]}]
        """
        resp = httpx.get(
            cls.ACCESSIBLE_RESOURCES_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
            timeout=15.0,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"Failed to query accessible resources ({resp.status_code}): {resp.text}")
        return resp.json()


# ==============================================================================
# 5. CLI Verification Runner
# ==============================================================================

def run_all_verifications() -> bool:
    """Run verification checks for Jira, Confluence, and Slack.

    Returns True if all configured integrations passed, False if any failed.
    """
    print("=" * 70)
    print("DevMinds Integration & Authentication Verifier")
    print("Testing Jira Cloud, Confluence Cloud, and Slack Web API...")
    print("=" * 70)

    clients = [
        JiraAuthClient(),
        ConfluenceAuthClient(),
        SlackAuthClient(),
    ]

    all_passed = True
    for client in clients:
        res = client.verify_auth()
        res.print_summary()
        if not res.success:
            all_passed = False

    print("\n" + "=" * 70)
    if all_passed:
        print("[SUCCESS] All configured services authenticated successfully!")
    else:
        print("[ACTION REQUIRED] One or more authentication checks failed. Review the diagnostics above.")
    print("=" * 70)

    return all_passed


if __name__ == "__main__":
    success = run_all_verifications()
    sys.exit(0 if success else 1)
