# File:        backend/app/integrations/jira.py
# Owner:       Kunal
# Purpose:     Read-only Jira connector — find issues related to a repository and return them as frozen CompanyItem objects.
# Contains:    JiraConnector (check_connection, fetch, send and private search helpers), JQL builder with escaping, linked-issue search, ADF-to-text conversion, HTTP status to connector error mapping.
# Status:      REAL — httpx calls to /rest/api/3/search/jql with mocked tests; local fallbacks for BaseConnector/error_from_status until those shared files merge.
# Depends on:  backend/app/integrations/base.py, backend/app/schemas/contracts.py, backend/app/config.py, httpx

"""Jira connector (read-only, company mode only).

Searches Jira for issues related to a repository and returns them in the
frozen CompanyItem format. It only ever reads: ``send`` raises.

Security rules honoured here:

- the API token is used for Basic auth and is never logged or returned;
- issue text is untrusted data — it is copied into CompanyItem fields as
  plain text and never interpreted as instructions;
- Jira only returns what the configured token can see, so no extra access is
  created here;
- user text is escaped before it is placed inside the JQL string.
"""

import re
from typing import Any

import httpx

from app.schemas.contracts import CompanyContext, CompanyItem, ConnectorError

try:
    from app.config import settings
except ImportError:
    # TODO(Kunal): app/config.py re-exports `settings`, but on main
    # app/core/config.py only defines get_settings(). Use the accessor until
    # that re-export lands, then this branch disappears.
    from app.core.config import get_settings

    settings = get_settings()

try:
    from app.integrations.base import BaseConnector
except ImportError:
    # TODO(Kunal): BaseConnector arrives with the shared-interfaces branch.
    # Until it merges, the adapter contract already in base.py is the closest
    # match on main, so the connector still works today.
    from app.integrations.base import IntegrationAdapter as BaseConnector

try:
    from app.integrations.normalize import error_from_status
except ImportError:
    # TODO(Kunal): app/integrations/normalize.py (shared helpers) is not on
    # main yet. This local copy keeps the same contract — HTTP status in,
    # (frozen error code, short message) out — so moving to the shared helper
    # later is a one-line change.
    def error_from_status(status_code: int) -> tuple[str, str]:
        """Map a Jira HTTP status to a frozen connector error code and message."""
        if status_code == 401:
            return "TOKEN_EXPIRED", "Jira rejected the API token"
        if status_code == 403:
            return "NO_PERMISSION", "The Jira token cannot see these issues"
        if status_code == 429:
            return "RATE_LIMITED", "Jira rate limit reached"
        return "API_DOWN", f"Jira returned HTTP {status_code}"


#: Per-request timeout in seconds. There is no JIRA timeout setting and env
#: var names are frozen, so the connector keeps its own constant.
REQUEST_TIMEOUT_SECONDS = 15.0

#: Frozen cap on how many items one fetch returns.
MAX_ITEMS = 5

#: Frozen approximate caps per CompanyItem.
MAX_CONTENT_CHARS = 2000
MAX_TITLE_CHARS = 300

#: Current Jira Cloud search endpoint. Atlassian removed the legacy
#: /rest/api/3/search; /rest/api/3/search/jql is the supported replacement.
_SEARCH_PATH = "/rest/api/3/search/jql"

#: Field metadata endpoint, used only to locate the acceptance-criteria field.
_FIELD_PATH = "/rest/api/3/field"

#: Fields every returned issue needs (metadata: status, assignee, priority).
_BASE_FIELDS = "summary,description,status,assignee,priority"

#: Words too generic to help a search.
_STOP_WORDS = frozenset(
    {
        "a", "an", "and", "are", "as", "at", "be", "by", "do", "does",
        "for", "from", "how", "in", "is", "it", "of", "on", "or", "that",
        "the", "this", "to", "we", "what", "when", "where", "which", "who",
        "why", "will", "with", "you",
    }
)

#: Block-level Atlassian document nodes get a blank line after them.
_BLOCK_TYPES = frozenset(
    {"paragraph", "heading", "codeBlock", "blockquote", "listItem", "panel"}
)


class JiraConnector(BaseConnector):
    """Read-only Jira connector: search issues related to a repository."""

    provider = "jira"

    def __init__(self) -> None:
        self._acceptance_field_checked = False
        self._acceptance_field_id: str | None = None

    def check_connection(self) -> bool:
        """Return True when the three Jira settings are configured."""
        return _credentials() is not None

    def fetch(self, repo_full_name: str, query: str = "") -> CompanyContext:
        """Return Jira issues related to a repository as frozen CompanyItems.

        Builds a JQL search from the repo name and the query keywords, then
        adds issues linked to the matches. Returns at most MAX_ITEMS items.
        Every failure comes back as a frozen ConnectorError, never raised.
        """
        credentials = _credentials()
        if credentials is None:
            return CompanyContext(
                errors=[
                    ConnectorError(
                        source_type="jira",
                        code="NOT_CONNECTED",
                        message="Jira is not configured "
                        "(JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN)",
                    )
                ]
            )
        base_url, email, token = credentials

        jql = _build_jql(repo_full_name, query)
        if not jql:
            # Nothing to search for: return an empty result, never a broad query.
            return CompanyContext()

        with httpx.Client(
            base_url=base_url,
            auth=httpx.BasicAuth(email, token),
            timeout=REQUEST_TIMEOUT_SECONDS,
            headers={"Accept": "application/json"},
        ) as client:
            fields = self._fields_param(client)
            issues, error = self._search(client, jql, fields)
            if error is not None:
                return CompanyContext(errors=[error])
            linked = self._search_linked(client, issues, fields)

        items = _to_company_items(
            _merge_issues(issues, linked), base_url, self._acceptance_field_id
        )
        return CompanyContext(items=items)

    def send(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Jira is read-only for this project."""
        raise NotImplementedError("Jira connector is read-only")

    # --- Private helpers -------------------------------------------------

    def _fields_param(self, client: httpx.Client) -> str:
        """Base fields plus the acceptance-criteria field, looked up once."""
        if not self._acceptance_field_checked:
            self._acceptance_field_id = _find_acceptance_field_id(client)
            self._acceptance_field_checked = True
        if self._acceptance_field_id:
            return f"{_BASE_FIELDS},{self._acceptance_field_id}"
        return _BASE_FIELDS

    def _search(
        self, client: httpx.Client, jql: str, fields: str
    ) -> tuple[list[dict[str, Any]], ConnectorError | None]:
        """Run one JQL search. Returns (issues, error); error is None on success."""
        params = {"jql": jql, "maxResults": str(MAX_ITEMS), "fields": fields}
        try:
            response = client.get(_SEARCH_PATH, params=params)
        except httpx.TimeoutException:
            return [], ConnectorError(
                source_type="jira", code="API_DOWN",
                message="Jira did not respond in time",
            )
        except httpx.RequestError:
            return [], ConnectorError(
                source_type="jira", code="API_DOWN", message="Could not reach Jira"
            )
        if response.status_code != 200:
            code, message = error_from_status(response.status_code)
            return [], ConnectorError(source_type="jira", code=code, message=message)
        try:
            payload = response.json()
        except ValueError:
            return [], ConnectorError(
                source_type="jira", code="API_DOWN",
                message="Jira returned an unreadable response",
            )
        issues = payload.get("issues") if isinstance(payload, dict) else None
        if not isinstance(issues, list):
            return [], None
        return [issue for issue in issues if isinstance(issue, dict)], None

    def _search_linked(
        self, client: httpx.Client, issues: list[dict[str, Any]], fields: str
    ) -> list[dict[str, Any]]:
        """Best-effort search for issues linked to the matches.

        A linked search that fails is ignored: the primary results are still
        useful, and a broken link query must not hide them.
        """
        keys = [str(issue["key"]) for issue in issues if issue.get("key")][:3]
        if not keys:
            return []
        linked, error = self._search(client, _build_linked_jql(keys), fields)
        return [] if error is not None else linked


# --- Configuration -------------------------------------------------------


def _credentials() -> tuple[str, str, str] | None:
    """Return (base_url, email, token), or None when any of the three is empty."""
    base_url = settings.jira_base_url.strip()
    email = settings.jira_email.strip()
    token = settings.jira_api_token.strip()
    if not base_url or not email or not token:
        return None
    return base_url.rstrip("/"), email, token


# --- JQL building --------------------------------------------------------


def _escape_jql(value: str) -> str:
    """Escape untrusted text for use inside a quoted JQL string."""
    flat = re.sub(r"[\r\n\t]+", " ", value).strip()
    return flat.replace("\\", "\\\\").replace('"', '\\"')


def _search_terms(repo_full_name: str, query: str) -> list[str]:
    """Repo name plus query keywords, deduplicated and stop-word filtered."""
    terms: list[str] = []
    repo = repo_full_name.strip()
    if repo:
        terms.append(repo)
        if "/" in repo:
            terms.append(repo.split("/", 1)[1])
    seen = {term.casefold() for term in terms}
    for word in re.split(r"[\s,;]+", query.strip()):
        if len(word) < 2 or word.casefold() in _STOP_WORDS:
            continue
        if word.casefold() in seen:
            continue
        seen.add(word.casefold())
        terms.append(word)
    return terms


def _build_jql(repo_full_name: str, query: str) -> str:
    """Build the JQL for the repo name and query keywords ("" when empty)."""
    clauses: list[str] = []
    for term in _search_terms(repo_full_name, query):
        escaped = _escape_jql(term)
        if escaped:
            clauses.append(f'text ~ "{escaped}"')
    if not clauses:
        return ""
    return f"({' OR '.join(clauses)}) ORDER BY updated DESC"


def _build_linked_jql(keys: list[str]) -> str:
    """Build the JQL for issues linked to the given issue keys."""
    clauses = [f'issue in linkedIssues("{_escape_jql(key)}")' for key in keys]
    return f"({' OR '.join(clauses)}) ORDER BY updated DESC"


# --- Jira API helpers ----------------------------------------------------


def _find_acceptance_field_id(client: httpx.Client) -> str | None:
    """Find the custom field id named like "acceptance criteria" (best effort)."""
    try:
        response = client.get(_FIELD_PATH)
    except httpx.HTTPError:
        return None
    if response.status_code != 200:
        return None
    try:
        payload = response.json()
    except ValueError:
        return None
    if not isinstance(payload, list):
        return None
    for field in payload:
        if not isinstance(field, dict):
            continue
        name = str(field.get("name", "")).strip().lower()
        field_id = str(field.get("id", ""))
        if name.startswith("acceptance criteria") and field_id.startswith(
            "customfield_"
        ):
            return field_id
    return None


def _merge_issues(*groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Concatenate issue lists, keeping the first occurrence of each key."""
    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for group in groups:
        for issue in group:
            key = str(issue.get("key") or "")
            if key:
                if key in seen:
                    continue
                seen.add(key)
            merged.append(issue)
    return merged


# --- Text conversion -----------------------------------------------------


def _adf_to_text(node: Any) -> str:
    """Convert an Atlassian document (ADF) node into plain text."""
    if isinstance(node, str):
        return node
    if isinstance(node, list):
        return "".join(_adf_to_text(child) for child in node)
    if not isinstance(node, dict):
        return ""
    node_type = str(node.get("type", ""))
    if node_type == "hardBreak":
        return "\n"
    if node_type == "rule":
        return "\n\n"
    own_text = str(node.get("text") or "")
    attrs = node.get("attrs")
    if not own_text and isinstance(attrs, dict):
        # Mentions and emoji carry their display text in attrs.
        own_text = str(attrs.get("text") or "")
    body = _adf_to_text(node.get("content"))
    if node_type in _BLOCK_TYPES:
        return f"{own_text}{body}".rstrip() + "\n\n"
    return own_text + body


def _document_text(value: Any) -> str:
    """Turn a description field (ADF dict or plain string) into clean text."""
    text = re.sub(r"\n{3,}", "\n\n", _adf_to_text(value))
    return text.strip()


def _single_line(value: str) -> str:
    """Collapse whitespace so a summary stays on one line."""
    return re.sub(r"\s+", " ", value).strip()


def _clip(text: str, limit: int) -> str:
    """Shorten text to at most limit characters, marking the cut."""
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


# --- Issue conversion ----------------------------------------------------


def _field_name(value: Any) -> str:
    """Return the `name` of a Jira status/priority object, or ""."""
    if isinstance(value, dict):
        return str(value.get("name") or "")
    return ""


def _assignee_name(value: Any) -> str:
    """Return the assignee's display name, or "Unassigned"."""
    if isinstance(value, dict):
        name = value.get("displayName") or value.get("name")
        if name:
            return str(name)
    return "Unassigned"


def _to_company_item(
    issue: dict[str, Any], base_url: str, acceptance_field_id: str | None
) -> CompanyItem | None:
    """Convert one raw Jira issue into a CompanyItem (None when unusable)."""
    key = str(issue.get("key") or "").strip()
    if not key:
        return None
    fields = issue.get("fields")
    fields = fields if isinstance(fields, dict) else {}

    summary = _single_line(str(fields.get("summary") or ""))
    title = _clip(f"{key}: {summary}" if summary else key, MAX_TITLE_CHARS)

    parts = [_document_text(fields.get("description"))]
    if acceptance_field_id:
        parts.append(_document_text(fields.get(acceptance_field_id)))
    content = _clip("\n\n".join(part for part in parts if part), MAX_CONTENT_CHARS)

    return CompanyItem(
        source_type="jira",
        title=title,
        content=content,
        url=f"{base_url}/browse/{key}",
        metadata={
            "status": _field_name(fields.get("status")),
            "assignee": _assignee_name(fields.get("assignee")),
            "priority": _field_name(fields.get("priority")),
        },
    )


def _to_company_items(
    issues: list[dict[str, Any]], base_url: str, acceptance_field_id: str | None
) -> list[CompanyItem]:
    """Convert raw Jira issues into at most MAX_ITEMS CompanyItems."""
    items: list[CompanyItem] = []
    for issue in issues:
        item = _to_company_item(issue, base_url, acceptance_field_id)
        if item is None:
            continue
        items.append(item)
        if len(items) >= MAX_ITEMS:
            break
    return items
