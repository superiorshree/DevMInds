# File:        backend/app/integrations/slack.py
# Owner:       Kunal
# Purpose:     Read-only Slack connector — recent messages from the allowed channels as frozen CompanyItems, plus the one-way summary share placeholder.
# Contains:    SlackConnector (source_type, check_connection, async fetch, send and share_summary placeholders), Slack ok=false error mapping, history/permalink/users readers, search-term matching and title/metadata helpers.
# Status:      REAL — read-only httpx calls to conversations.history, chat.getPermalink and users.info with mocked tests; send()/share_summary() still stubs.
# Depends on:  backend/app/integrations/base.py, backend/app/integrations/normalize.py, backend/app/schemas/contracts.py, backend/app/config.py, httpx

"""Slack connector (read-only, company mode only).

Reads the recent history of the channels listed in ``SLACK_CHANNEL_IDS`` and
returns the messages that mention the repository or the query keywords as
frozen ``CompanyItem`` objects. A bot token cannot use ``search.messages``,
so the connector reads recent messages per allowed channel and keeps the
matches locally.

Security rules honoured here:

- the bot token comes from ``SLACK_BOT_TOKEN``, travels in the
  Authorization header and is never logged or returned;
- only the channels in ``SLACK_CHANNEL_IDS`` are ever read;
- message text is untrusted data — it is copied into ``CompanyItem`` fields
  as plain text and never interpreted as instructions;
- nothing is ever written: only ``conversations.history``,
  ``chat.getPermalink`` and ``users.info`` are called, and ``send`` raises;
- failures come back as frozen ``ConnectorError`` entries, never raised.
"""

import re
from typing import Any, Literal

import httpx

from app.config import settings
from app.integrations.base import BaseConnector
from app.integrations.normalize import error_from_status, make_company_item
from app.schemas.contracts import CompanyContext, CompanyItem, ConnectorError

#: Slack Web API base url; only read methods are ever requested from it.
_API_BASE = "https://slack.com/api/"

#: Per-request timeout in seconds. There is no Slack timeout setting and
#: env var names are frozen, so the connector keeps its own constant.
REQUEST_TIMEOUT_SECONDS = 15.0

#: Recent messages read from each allowed channel.
HISTORY_LIMIT = 100

#: Frozen cap on how many items one fetch returns.
MAX_ITEMS = 5

#: How many leading words of a message make up the item title.
TITLE_WORDS = 8

#: The frozen connector error codes this connector can produce.
SlackErrorCode = Literal[
    "NOT_CONNECTED", "TOKEN_EXPIRED", "NO_PERMISSION", "RATE_LIMITED", "API_DOWN"
]

#: Slack answers HTTP 200 with {"ok": false, "error": ...} for these errors.
_SLACK_ERROR_CODES: dict[str, SlackErrorCode] = {
    "invalid_auth": "TOKEN_EXPIRED",
    "token_revoked": "TOKEN_EXPIRED",
    "missing_scope": "NO_PERMISSION",
    "not_in_channel": "NO_PERMISSION",
    "ratelimited": "RATE_LIMITED",
}

#: Words too generic to help a search.
_STOP_WORDS = frozenset(
    {
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
        "how", "in", "is", "it", "of", "on", "or", "that", "the", "this",
        "to", "we", "what", "when", "which", "who", "why", "with", "you",
    }
)


class SlackConnector(BaseConnector):
    """Read-only Slack connector: recent messages from the allowed channels."""

    source_type = "slack"

    def check_connection(self) -> bool:
        """Return True when the bot token and channel ids are configured."""
        return _credentials() is not None

    async def fetch(self, repo_full_name: str, query: str) -> CompanyContext:
        """Return Slack messages about a repository as frozen CompanyItems.

        Reads the recent history of every channel in ``SLACK_CHANNEL_IDS``,
        keeps the messages mentioning the repository name or a query keyword,
        and returns at most ``MAX_ITEMS`` of the newest ones. Every failure
        comes back as a frozen ``ConnectorError``, never raised.
        """
        credentials = _credentials()
        if credentials is None:
            return CompanyContext(
                errors=[
                    ConnectorError(
                        source_type="slack",
                        code="NOT_CONNECTED",
                        message="Slack is not connected "
                        "(SLACK_BOT_TOKEN, SLACK_CHANNEL_IDS)",
                    )
                ]
            )
        token, channel_ids = credentials

        terms = _search_terms(repo_full_name, query)
        if not terms:
            # Nothing to search for: never return a broad scrape of a channel.
            return CompanyContext()

        errors: list[ConnectorError] = []
        matches: list[tuple[str, dict[str, Any]]] = []
        async with httpx.AsyncClient(
            base_url=_API_BASE,
            headers={"Authorization": f"Bearer {token}"},
            timeout=REQUEST_TIMEOUT_SECONDS,
        ) as client:
            for channel_id in channel_ids:
                messages, error = await _read_history(client, channel_id)
                if error is not None:
                    _record_error(errors, error)
                    continue
                matches.extend(
                    (channel_id, message)
                    for message in messages
                    if _matches(message, terms)
                )
            items, item_errors = await _build_items(client, _newest_first(matches))
        for error in item_errors:
            _record_error(errors, error)
        return CompanyContext(items=items, errors=errors)

    def send(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Slack is read-only for this project: nothing is ever posted."""
        raise NotImplementedError("Slack connector is read-only")

    # --- Helper methods Kunal will implement ---

    def share_summary(self, channel: str, message: str) -> dict[str, Any]:
        """Post the architecture summary to a channel (one-way).

        TODO(Kunal): implement with chat.postMessage; return
        {shared: True, channel, ts}.
        """
        raise NotImplementedError("TODO(Kunal): share_summary")


# --- Configuration -------------------------------------------------------


def _channel_ids() -> list[str]:
    """The allowed channel ids from SLACK_CHANNEL_IDS (comma separated)."""
    channel_ids: list[str] = []
    for raw in settings.slack_channel_ids.split(","):
        channel_id = raw.strip()
        if channel_id and channel_id not in channel_ids:
            channel_ids.append(channel_id)
    return channel_ids


def _credentials() -> tuple[str, list[str]] | None:
    """Return (bot token, channel ids), or None when either is empty."""
    token = settings.slack_bot_token.strip()
    channel_ids = _channel_ids()
    if not token or not channel_ids:
        return None
    return token, channel_ids


# --- Search --------------------------------------------------------------


def _search_terms(repo_full_name: str, query: str) -> list[str]:
    """Repository name plus query keywords, lower-cased and deduplicated."""
    terms: list[str] = []
    repo = repo_full_name.strip()
    if repo:
        terms.append(repo)
        if "/" in repo:
            terms.append(repo.split("/", 1)[1])
    seen = {term.casefold() for term in terms}
    for word in re.split(r"[\s,;]+", query.strip()):
        word = word.strip(".?!,;:\"'()[]{}")
        folded = word.casefold()
        if len(word) < 2 or folded in _STOP_WORDS or folded in seen:
            continue
        seen.add(folded)
        terms.append(folded)
    return [term.casefold() for term in terms]


def _matches(message: dict[str, Any], terms: list[str]) -> bool:
    """True when the message text mentions the repository or a keyword."""
    text = message.get("text")
    if not isinstance(text, str) or not text.strip():
        return False
    if not message.get("ts"):
        return False
    folded = text.casefold()
    return any(term in folded for term in terms)


def _ts_value(value: Any) -> float:
    """A message ts as a number (0.0 when it cannot be parsed)."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _newest_first(
    matches: list[tuple[str, dict[str, Any]]],
) -> list[tuple[str, dict[str, Any]]]:
    """Newest matching messages first, capped at MAX_ITEMS."""
    newest = sorted(
        matches, key=lambda match: _ts_value(match[1].get("ts")), reverse=True
    )
    return newest[:MAX_ITEMS]


def _record_error(errors: list[ConnectorError], error: ConnectorError) -> None:
    """Append an error unless the same frozen code is already reported."""
    if error.code not in {existing.code for existing in errors}:
        errors.append(error)


# --- Slack API helpers ---------------------------------------------------


def _error_from_payload(payload: dict[str, Any]) -> ConnectorError:
    """Map Slack's {"ok": false, "error": ...} body to a frozen ConnectorError."""
    slack_error = str(payload.get("error") or "unknown_error")
    code: SlackErrorCode = _SLACK_ERROR_CODES.get(slack_error, "API_DOWN")
    return ConnectorError(
        source_type="slack", code=code, message=f"Slack error: {slack_error}"
    )


async def _get_json(
    client: httpx.AsyncClient, method: str, params: dict[str, str]
) -> tuple[dict[str, Any] | None, ConnectorError | None]:
    """Call one Slack read method; return (payload, error), one of them None."""
    try:
        response = await client.get(method, params=params)
    except httpx.TimeoutException:
        return None, ConnectorError(
            source_type="slack",
            code="API_DOWN",
            message="Slack did not respond in time",
        )
    except httpx.RequestError:
        return None, ConnectorError(
            source_type="slack", code="API_DOWN", message="Could not reach Slack"
        )
    if response.status_code != 200:
        return None, error_from_status("slack", response.status_code)
    try:
        payload = response.json()
    except ValueError:
        payload = None
    if not isinstance(payload, dict):
        return None, ConnectorError(
            source_type="slack",
            code="API_DOWN",
            message="Slack returned an unreadable response",
        )
    if payload.get("ok") is not True:
        return None, _error_from_payload(payload)
    return payload, None


async def _read_history(
    client: httpx.AsyncClient, channel_id: str
) -> tuple[list[dict[str, Any]], ConnectorError | None]:
    """Recent messages of one allowed channel (error is None on success)."""
    payload, error = await _get_json(
        client,
        "conversations.history",
        {"channel": channel_id, "limit": str(HISTORY_LIMIT)},
    )
    if error is not None:
        return [], error
    messages = payload.get("messages") if payload else None
    if not isinstance(messages, list):
        return [], None
    return [message for message in messages if isinstance(message, dict)], None


async def _permalink(
    client: httpx.AsyncClient, channel_id: str, message_ts: str
) -> tuple[str, ConnectorError | None]:
    """The message's permanent link, or the reason it could not be read."""
    payload, error = await _get_json(
        client,
        "chat.getPermalink",
        {"channel": channel_id, "message_ts": message_ts},
    )
    if error is not None:
        return "", error
    permalink = str(payload.get("permalink") or "") if payload else ""
    return permalink, None


async def _display_name(client: httpx.AsyncClient, user_id: str) -> str:
    """The author's display name, or "" when users.info cannot be read."""
    payload, error = await _get_json(client, "users.info", {"user": user_id})
    if error is not None or payload is None:
        return ""
    user = payload.get("user")
    profile = user.get("profile") if isinstance(user, dict) else None
    profile = profile if isinstance(profile, dict) else {}
    for key in ("display_name", "real_name", "name"):
        name = str(profile.get(key) or "").strip()
        if name:
            return name
    return ""


async def _build_items(
    client: httpx.AsyncClient, matches: list[tuple[str, dict[str, Any]]]
) -> tuple[list[CompanyItem], list[ConnectorError]]:
    """Turn the newest matches into CompanyItems (a permalink is required)."""
    items: list[CompanyItem] = []
    errors: list[ConnectorError] = []
    display_names: dict[str, str] = {}
    for channel_id, message in matches:
        ts = str(message.get("ts") or "")
        permalink, error = await _permalink(client, channel_id, ts)
        if error is not None:
            errors.append(error)
            continue
        if not permalink:
            # An item without a source link is not useful — skip it.
            continue
        text = str(message.get("text") or "")
        user_id = str(message.get("user") or "")
        if user_id and user_id not in display_names:
            display_names[user_id] = await _display_name(client, user_id)
        author = display_names.get(user_id, "") or user_id
        items.append(
            make_company_item(
                source_type="slack",
                title=f"{channel_id}: {_first_words(text)}",
                content=text,
                url=permalink,
                metadata={
                    "channel": channel_id,
                    "author": author,
                    "timestamp": ts,
                },
            )
        )
    return items, errors


def _first_words(text: str, limit: int = TITLE_WORDS) -> str:
    """The first words of a message, marking a cut with "...". """
    words = text.split()
    head = " ".join(words[:limit])
    if len(words) > limit:
        return head + "..."
    return head
