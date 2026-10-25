import asyncio
import httpx

from app.config import settings
from app.integrations.jira import _credentials
from app.integrations.normalize import error_from_status


TIMEOUT = 10.0


def status_from_http(source, response):
    if response.status_code == 200:
        return "connected"

    return error_from_status(
        source, response.status_code
    ).code


def check_jira_health():
    credentials = _credentials()

    if credentials is None:
        return "NOT_CONNECTED"

    base_url, email, token = credentials

    try:
        with httpx.Client(
            base_url=base_url,
            auth=httpx.BasicAuth(email, token),
            timeout=TIMEOUT,
            headers={"Accept": "application/json"},
        ) as client:
            response = client.get("/rest/api/3/myself")

        return status_from_http("jira", response)

    except httpx.RequestError:
        return "API_DOWN"


def check_slack_health():
    token = settings.slack_bot_token.strip()
    channels = settings.slack_channel_ids.strip()

    if not token or not channels:
        return "NOT_CONNECTED"

    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            response = client.get(
                "https://slack.com/api/auth.test",
                headers={
                    "Authorization": f"Bearer {token}"
                },
            )

        if response.status_code != 200:
            return status_from_http("slack", response)

        payload = response.json()

        if payload.get("ok") is True:
            return "connected"

        error = payload.get("error", "")

        if error in ("invalid_auth", "token_revoked", "account_inactive"):
            return "TOKEN_EXPIRED"

        if error in ("missing_scope", "not_in_channel", "no_permission"):
            return "NO_PERMISSION"

        if error in ("ratelimited", "rate_limited"):
            return "RATE_LIMITED"

        return "API_DOWN"

    except (httpx.RequestError, ValueError, TypeError, AttributeError):
        return "API_DOWN"


def check_confluence_health():
    base_url = settings.confluence_base_url.strip().rstrip("/")
    email = settings.confluence_email.strip()
    token = settings.confluence_api_token.strip()

    if not base_url or not email or not token:
        return "NOT_CONNECTED"

    if base_url.endswith("/wiki"):
        url = base_url + "/rest/api/space"
    else:
        url = base_url + "/wiki/rest/api/space"

    try:
        with httpx.Client(
            auth=httpx.BasicAuth(email, token),
            timeout=TIMEOUT,
            headers={"Accept": "application/json"},
        ) as client:
            response = client.get(
                url,
                params={"limit": 1},
            )

        return status_from_http("confluence", response)

    except httpx.RequestError:
        return "API_DOWN"



async def integration_health():
    names = ("jira", "slack", "confluence")
    checks = (
        check_jira_health,
        check_slack_health,
        check_confluence_health,
    )

    results = await asyncio.gather(
        *(asyncio.to_thread(check) for check in checks),
        return_exceptions=True,
    )

    return {
        name: result if isinstance(result, str) else "API_DOWN"
        for name, result in zip(names, results)
    }
