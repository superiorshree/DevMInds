# File:        backend/app/integrations/normalize.py
# Owner:       Kunal
# Purpose:     Shared helpers that turn raw connector data into frozen contract objects.
# Contains:    MAX_CONTENT_CHARS/MAX_TITLE_CHARS constants, trim_text(), strip_html(), make_company_item(), error_from_status().
# Status:      REAL — pure helpers, no network, no secrets.
# Depends on:  backend/app/schemas/contracts.py (CompanyItem, ConnectorError)

"""Normalization helpers shared by the Jira, Slack and Confluence connectors.

Everything a connector returns must be in the frozen contract format, so all
raw text passes through these helpers first. Text coming from Jira, Slack and
Confluence is untrusted data: it is trimmed and unescaped here, and it is
never interpreted as instructions.
"""

import html
import re
from typing import Any, Literal

from app.schemas.contracts import CompanyItem, ConnectorError

#: The three company sources, matching CompanyItem.source_type.
SourceType = Literal["jira", "slack", "confluence"]

#: Frozen approximate cap for CompanyItem.content.
MAX_CONTENT_CHARS = 2000

#: Frozen approximate cap for CompanyItem.title.
MAX_TITLE_CHARS = 300


def trim_text(text: str, limit: int = MAX_CONTENT_CHARS) -> str:
    """Strip outer whitespace and cap the text at ``limit`` characters.

    A cut is marked with "..." so the reader knows content was dropped.
    """
    cleaned = text.strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 3].rstrip() + "..."


def strip_html(text: str) -> str:
    """Remove HTML tags from text, keeping the readable words.

    Tags become spaces (so "<li>a</li><li>b</li>" reads "a b"), entities are
    unescaped after the tags are gone, and whitespace is collapsed.
    """
    without_tags = re.sub(r"<[^>]*>", " ", text)
    unescaped = html.unescape(without_tags)
    return re.sub(r"\s+", " ", unescaped).strip()


def make_company_item(
    source_type: SourceType,
    title: str,
    content: str,
    url: str,
    metadata: dict[str, Any] | None = None,
) -> CompanyItem:
    """Build a frozen CompanyItem with trimmed title/content and a clean url."""
    return CompanyItem(
        source_type=source_type,
        title=trim_text(title, MAX_TITLE_CHARS),
        content=trim_text(content),
        url=url.strip(),
        metadata=metadata or {},
    )


def error_from_status(source_type: SourceType, status_code: int | None) -> ConnectorError:
    """Map an HTTP status to a frozen ConnectorError.

    401 -> TOKEN_EXPIRED, 403 -> NO_PERMISSION, 429 -> RATE_LIMITED.
    ``status_code`` is ``None`` for a timeout, and every other status (5xx and
    anything unexpected) maps to API_DOWN — the frozen connector error codes
    are the only ones this project uses.
    """
    label = source_type.capitalize()
    if status_code is None:
        return ConnectorError(
            source_type=source_type,
            code="API_DOWN",
            message=f"{label} did not respond in time",
        )
    if status_code == 401:
        return ConnectorError(
            source_type=source_type,
            code="TOKEN_EXPIRED",
            message=f"{label} rejected the API token",
        )
    if status_code == 403:
        return ConnectorError(
            source_type=source_type,
            code="NO_PERMISSION",
            message=f"The {label} token cannot see this content",
        )
    if status_code == 429:
        return ConnectorError(
            source_type=source_type,
            code="RATE_LIMITED",
            message=f"{label} rate limit reached",
        )
    return ConnectorError(
        source_type=source_type,
        code="API_DOWN",
        message=f"{label} returned HTTP {status_code}",
    )
