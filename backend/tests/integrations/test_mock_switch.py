# File:        backend/tests/integrations/test_mock_switch.py
# Owner:       Kunal
# Purpose:     Verify the mode gate and the USE_MOCK_INTEGRATIONS switch that everyone builds on Day 1.
# Contains:    Pytest tests: open_source mode raises PermissionError, mock mode returns all items with no network, mock items use the frozen format, real mode collects NOT_CONNECTED errors, integration_status in mock and real modes.
# Status:      REAL — no network, no tokens; sockets are blocked to prove mock mode stays offline.
# Depends on:  backend/app/integrations/__init__.py, backend/app/integrations/mock_data.py, backend/app/schemas/contracts.py

"""Tests for get_company_context() and integration_status().

Everything runs offline: the mock branch is proven network-free by blocking
socket resolution, and the real branch only reaches connectors that report
NOT_CONNECTED without credentials. No tokens are used anywhere.
"""

import asyncio
import socket
from collections import Counter

import pytest

import app.integrations as integrations
from app.integrations import get_company_context, integration_status
from app.integrations.mock_data import MOCK_COMPANY_ITEMS
from app.schemas.contracts import CompanyContext

COMPANY = "company"
OPEN_SOURCE = "open_source"


def _context(repo_full_name: str, query: str, mode: str) -> CompanyContext:
    """Run the async get_company_context() to completion from a sync test."""
    return asyncio.run(get_company_context(repo_full_name, query, mode))


def _block_network(monkeypatch: pytest.MonkeyPatch) -> None:
    """Make any network attempt fail loudly, so offline claims are proven."""

    def blocked(*args: object, **kwargs: object) -> None:
        raise AssertionError("this test must not touch the network")

    monkeypatch.setattr(socket, "getaddrinfo", blocked)
    monkeypatch.setattr(socket, "create_connection", blocked)



def _use_real_connectors(monkeypatch: pytest.MonkeyPatch) -> None:
    """Disable mock mode and simulate missing credentials for all providers."""

    monkeypatch.setattr(integrations.settings, "use_mock_integrations", False)

    # Jira
    monkeypatch.setattr(integrations.settings, "jira_base_url", "")
    monkeypatch.setattr(integrations.settings, "jira_email", "")
    monkeypatch.setattr(integrations.settings, "jira_api_token", "")

    # Slack
    monkeypatch.setattr(integrations.settings, "slack_bot_token", "")
    monkeypatch.setattr(integrations.settings, "slack_channel_ids", "")

    # Confluence
    monkeypatch.setattr(integrations.settings, "confluence_base_url", "")
    monkeypatch.setattr(integrations.settings, "confluence_email", "")
    monkeypatch.setattr(integrations.settings, "confluence_api_token", "")

def test_open_source_mode_raises_permission_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Any mode other than company is rejected before anything is read."""
    monkeypatch.setattr(integrations.settings, "use_mock_integrations", True)

    with pytest.raises(PermissionError):
        _context("acme/webapp", "router", OPEN_SOURCE)


def test_mock_mode_returns_items_without_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Mock mode returns items from all three sources with no internet."""
    monkeypatch.setattr(integrations.settings, "use_mock_integrations", True)
    _block_network(monkeypatch)

    context = _context("acme/webapp", "router", COMPANY)

    assert context.errors == []
    counts = Counter(item.source_type for item in context.items)
    assert counts["jira"] >= 2
    assert counts["slack"] >= 2
    assert counts["confluence"] >= 2


def test_mock_items_use_the_frozen_format() -> None:
    """Every mock item has source_type, title, content, url and metadata."""
    assert len(MOCK_COMPANY_ITEMS) >= 6

    for item in MOCK_COMPANY_ITEMS:
        assert item.source_type in {"jira", "slack", "confluence"}
        assert item.title
        assert item.content
        assert item.url.startswith("https://")
        assert isinstance(item.metadata, dict)


def test_real_mode_collects_errors_instead_of_raising(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Without credentials the three connectors each report NOT_CONNECTED."""
    _use_real_connectors(monkeypatch)
    _block_network(monkeypatch)

    context = _context("acme/webapp", "router", COMPANY)

    assert context.items == []
    assert {error.source_type for error in context.errors} == {
        "jira",
        "slack",
        "confluence",
    }
    assert all(error.code == "NOT_CONNECTED" for error in context.errors)


def test_status_is_connected_in_mock_mode(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Mock mode reports every connector as connected, offline."""
    monkeypatch.setattr(integrations.settings, "use_mock_integrations", True)
    _block_network(monkeypatch)

    assert asyncio.run(integration_status()) == {
        "jira": "connected",
        "slack": "connected",
        "confluence": "connected",
    }


def test_status_is_not_connected_without_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Real mode with no tokens reports not_connected for every connector."""
    _use_real_connectors(monkeypatch)

    assert asyncio.run(integration_status()) == {
        "jira": "not_connected",
        "slack": "not_connected",
        "confluence": "not_connected",
    }
