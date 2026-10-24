# File:        backend/tests/integrations/test_jira.py
# Owner:       Kunal
# Purpose:     Verify the Jira connector's success path and every frozen connector error, with all Jira HTTP calls mocked.
# Contains:    Pytest tests for JiraConnector.fetch: success, missing config, 401, 403, 429, 500, timeout, JQL escaping, item/content caps, read-only send.
# Status:      REAL — every Jira HTTP call is mocked with httpx.MockTransport; no network, no real tokens.
# Depends on:  backend/app/integrations/jira.py, backend/app/schemas/contracts.py, httpx, pytest

"""Tests for the read-only Jira connector.

Every Jira HTTP call is mocked with httpx.MockTransport — no network access
and no real credentials are involved.
"""

from typing import Any

import httpx
import pytest

import app.integrations.jira as jira
from app.integrations.jira import JiraConnector

BASE_URL = "https://acme.atlassian.net"
EMAIL = "kunal@example.com"
TOKEN = "fake-token-not-a-secret"
ACCEPTANCE_FIELD = "customfield_10020"

ISSUE = {
    "key": "DEV-101",
    "fields": {
        "summary": "Migrate router",
        "description": {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {"type": "text", "text": "Move the router to the new matcher."}
                    ],
                }
            ],
        },
        "status": {"name": "In Progress"},
        "assignee": {"displayName": "Devyani"},
        "priority": {"name": "High"},
        ACCEPTANCE_FIELD: {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {"type": "text", "text": "Acceptance criteria: all tests pass"}
                    ],
                }
            ],
        },
    },
}

LINKED_ISSUE = {
    "key": "DEV-102",
    "fields": {
        "summary": "Add login page",
        "description": None,
        "status": {"name": "To Do"},
        "priority": {"name": "Medium"},
    },
}


def _configure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Point the connector at a fake Jira workspace."""
    monkeypatch.setattr(jira.settings, "jira_base_url", BASE_URL)
    monkeypatch.setattr(jira.settings, "jira_email", EMAIL)
    monkeypatch.setattr(jira.settings, "jira_api_token", TOKEN)


def _mock_jira(monkeypatch: pytest.MonkeyPatch, handler: Any) -> None:
    """Send every httpx.Client request to the given MockTransport handler."""
    real_client = httpx.Client

    def client_with_mock(**kwargs: Any) -> httpx.Client:
        kwargs["transport"] = httpx.MockTransport(handler)
        return real_client(**kwargs)

    monkeypatch.setattr(httpx, "Client", client_with_mock)


def test_fetch_returns_company_items(monkeypatch: pytest.MonkeyPatch) -> None:
    """Happy path: issues come back as frozen CompanyItems with source links."""
    _configure(monkeypatch)
    seen: list[tuple[str, str]] = []  # (jql, fields) per search request

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers.get("authorization", "").startswith("Basic ")
        if request.url.path.endswith("/field"):
            return httpx.Response(
                200, json=[{"id": ACCEPTANCE_FIELD, "name": "Acceptance Criteria"}]
            )
        jql = request.url.params["jql"]
        seen.append((jql, request.url.params["fields"]))
        if "linkedIssues" in jql:
            return httpx.Response(200, json={"issues": [LINKED_ISSUE]})
        return httpx.Response(200, json={"issues": [ISSUE]})

    _mock_jira(monkeypatch, handler)
    result = JiraConnector().fetch("acme/webapp", "login flow")

    assert result.errors == []
    assert [item.source_type for item in result.items] == ["jira", "jira"]

    first, second = result.items
    assert first.title == "DEV-101: Migrate router"
    assert "Move the router to the new matcher." in first.content
    assert "Acceptance criteria: all tests pass" in first.content
    assert first.url == f"{BASE_URL}/browse/DEV-101"
    assert first.metadata == {
        "status": "In Progress",
        "assignee": "Devyani",
        "priority": "High",
    }
    assert second.title == "DEV-102: Add login page"

    # The acceptance-criteria field found via /field is requested, the JQL
    # mentions the repo and query keywords, and linked issues are searched.
    assert seen[0][1] == f"summary,description,status,assignee,priority,{ACCEPTANCE_FIELD}"
    assert "acme/webapp" in seen[0][0]
    assert "login" in seen[0][0]
    assert "linkedIssues" in seen[1][0]


def test_fetch_without_config_is_not_connected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """With no Jira settings the connector reports NOT_CONNECTED and never calls HTTP."""
    monkeypatch.setattr(jira.settings, "jira_base_url", "")
    monkeypatch.setattr(jira.settings, "jira_email", EMAIL)
    monkeypatch.setattr(jira.settings, "jira_api_token", TOKEN)

    def no_http(**kwargs: Any) -> Any:
        raise AssertionError("no HTTP call is expected without configuration")

    monkeypatch.setattr(httpx, "Client", no_http)

    result = JiraConnector().fetch("acme/webapp", "router")

    assert result.items == []
    assert [error.code for error in result.errors] == ["NOT_CONNECTED"]
    assert result.errors[0].source_type == "jira"


@pytest.mark.parametrize(
    "status_code, expected_code",
    [
        (401, "TOKEN_EXPIRED"),
        (403, "NO_PERMISSION"),
        (429, "RATE_LIMITED"),
        (500, "API_DOWN"),
    ],
)
def test_fetch_maps_http_errors(
    monkeypatch: pytest.MonkeyPatch, status_code: int, expected_code: str
) -> None:
    """Every failing Jira status maps to its frozen connector error code."""
    _configure(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, json={"errorMessages": ["failed"]})

    _mock_jira(monkeypatch, handler)
    result = JiraConnector().fetch("acme/webapp", "router")

    assert result.items == []
    assert [error.code for error in result.errors] == [expected_code]
    assert result.errors[0].source_type == "jira"


def test_fetch_timeout_is_api_down(monkeypatch: pytest.MonkeyPatch) -> None:
    """A Jira timeout is reported as API_DOWN, never raised."""
    _configure(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out")

    _mock_jira(monkeypatch, handler)
    result = JiraConnector().fetch("acme/webapp", "router")

    assert result.items == []
    assert [error.code for error in result.errors] == ["API_DOWN"]


def test_user_text_is_escaped_in_jql(monkeypatch: pytest.MonkeyPatch) -> None:
    """Quotes in the query cannot break out of the quoted JQL string."""
    _configure(monkeypatch)
    captured: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/field"):
            return httpx.Response(200, json=[])
        captured.append(request.url.params["jql"])
        return httpx.Response(200, json={"issues": []})

    _mock_jira(monkeypatch, handler)
    result = JiraConnector().fetch("acme/webapp", 'evil" OR project IS EMPTY')

    assert result.errors == []
    assert len(captured) == 1
    jql = captured[0]
    assert 'text ~ "evil\\""' in jql  # the quote arrived escaped
    assert 'evil" OR' not in jql  # no way to close the string early


def test_fetch_caps_items_and_content(monkeypatch: pytest.MonkeyPatch) -> None:
    """At most 5 items, each with about 2000 characters of content at most."""
    _configure(monkeypatch)
    huge_description = {
        "type": "doc",
        "version": 1,
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": "x" * 5000}]}],
    }
    issues = [
        {
            "key": f"DEV-{100 + index}",
            "fields": {
                "summary": f"Task {index}",
                "description": huge_description,
                "status": {"name": "Open"},
                "priority": {"name": "Low"},
            },
        }
        for index in range(10)
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/field"):
            return httpx.Response(200, json=[])
        if "linkedIssues" in request.url.params["jql"]:
            return httpx.Response(200, json={"issues": []})
        return httpx.Response(200, json={"issues": issues})

    _mock_jira(monkeypatch, handler)
    result = JiraConnector().fetch("acme/webapp", "task")

    assert result.errors == []
    assert len(result.items) == 5
    assert all(len(item.content) <= 2000 for item in result.items)
    assert all(item.metadata["assignee"] == "Unassigned" for item in result.items)


def test_send_is_read_only() -> None:
    """The connector never writes to Jira."""
    with pytest.raises(NotImplementedError):
        JiraConnector().send({})
