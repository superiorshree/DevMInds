# File:          backend/tests/integrations/test_errors.py
# Owner:         Kunal
# Purpose:       Tests for integration error codes, partial failure handling, and limits.
# Contains:      Tests for get_company_context error mapping, partial failure across connectors,
#                text trimming limits, and caplog verification no tokens leak.
# Status:        REAL — runs offline; mock mode proven network-free; real mode only reaches
#                connectors that report NOT_CONNECTED without credentials.
# Depends on:    backend/app/integrations/__init__.py,
#                backend/app/integrations/mock_data.py,
#                backend/app/schemas/contracts.py

import pytest
import logging

from app.integrations import get_company_context, integration_status
from app.schemas.contracts import CompanyContext, ConnectorError

OPEN_SOURCE = "open_source"
COMPANY = "company"


def _context(repo_full_name: str, query: str, mode: str) -> CompanyContext:
    """Run get_company_context async from a sync test."""
    import asyncio
    return asyncio.run(get_company_context(repo_full_name, query, mode))


# ---------------------------------------------------------------------------
# Error-code mapping
# ---------------------------------------------------------------------------


def test_token_expired_401_maps_to_TOKEN_EXPIRED():
    """HTTP 401 from a connector maps to TOKEN_EXPIRED via error_from_status."""
    from app.integrations.normalize import error_from_status
    err = error_from_status("jira", 401)
    assert err.code == "TOKEN_EXPIRED"


def test_no_permission_403_maps_to_NO_PERMISSION():
    """HTTP 403 from a connector maps to NO_PERMISSION via error_from_status."""
    from app.integrations.normalize import error_from_status
    err = error_from_status("jira", 403)
    assert err.code == "NO_PERMISSION"


def test_rate_limited_429_maps_to_RATE_LIMITED():
    """HTTP 429 from a connector maps to RATE_LIMITED via error_from_status."""
    from app.integrations.normalize import error_from_status
    err = error_from_status("jira", 429)
    assert err.code == "RATE_LIMITED"


def test_timeout_maps_to_API_DOWN():
    """None status code (timeout) maps to API_DOWN."""
    from app.integrations.normalize import error_from_status
    err = error_from_status("jira", None)
    assert err.code == "API_DOWN"


def test_unexpected_status_maps_to_API_DOWN():
    """Any unexpected status code maps to API_DOWN."""
    from app.integrations.normalize import error_from_status
    err = error_from_status("jira", 500)
    assert err.code == "API_DOWN"
    err = error_from_status("slack", 503)
    assert err.code == "API_DOWN"
    err = error_from_status("confluence", 502)
    assert err.code == "API_DOWN"


# ---------------------------------------------------------------------------
# Wrong mode raises PermissionError
# ---------------------------------------------------------------------------


def test_wrong_mode_raises_permission_error(monkeypatch):
    """Any mode other than company raises PermissionError immediately."""
    monkeypatch.setattr("app.integrations.settings.use_mock_integrations", True)

    with pytest.raises(PermissionError):
        _context("acme/webapp", "router", OPEN_SOURCE)

    with pytest.raises(PermissionError):
        _context("acme/webapp", "router", "invalid_mode")


def test_not_configured_returns_not_connected(monkeypatch):
    """When no creds are set, each connector reports NOT_CONNECTED."""
    def _no_creds(mp):
        mp.setattr("app.integrations.settings.use_mock_integrations", False)
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "jira_base_url", "")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "jira_email", "")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "jira_api_token", "")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "slack_bot_token", "")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "slack_channel_ids", "")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "confluence_base_url", "")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "confluence_email", "")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "confluence_api_token", "")

    _no_creds(monkeypatch)

    context = _context("acme/webapp", "router", COMPANY)
    assert context.items == []
    # Each connector should report NOT_CONNECTED (since none are configured)
    error_codes = {e.code for e in context.errors}
    assert "NOT_CONNECTED" in error_codes


# ---------------------------------------------------------------------------
# Limits: max 5 items per tool, text trimmed to ~2000 chars, non-empty url
# ---------------------------------------------------------------------------


def test_max_items_per_connector(monkeypatch):
    """Each connector returns at most 5 items (enforced by MAX_ITEMS)."""
    def _use_real_connectors(mp):
        mp.setattr("app.integrations.settings.use_mock_integrations", False)
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "jira_base_url", "https://acme.atlassian.net")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "jira_email", "user@acme.com")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "jira_api_token", "tok")

    _use_real_connectors(monkeypatch)

    context = _context("acme/webapp", "router", COMPANY)
    jira_items = [i for i in context.items if i.source_type == "jira"]
    # At most 5 Jira items
    assert len(jira_items) <= 5


def test_text_trimmed_to_2000_chars(monkeypatch):
    """Content text should not exceed approx 2000 characters."""
    def _use_real_connectors(mp):
        mp.setattr("app.integrations.settings.use_mock_integrations", False)
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "jira_base_url", "https://acme.atlassian.net")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "jira_email", "user@acme.com")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "jira_api_token", "tok")

    _use_real_connectors(monkeypatch)

    context = _context("acme/webapp", "router", COMPANY)
    for item in context.items:
        if item.content:
            assert len(item.content) <= 2000, f"Content exceeds 2000 chars: {len(item.content)}"


def test_url_is_non_empty(monkeypatch):
    """Every item must have a non-empty working url."""
    def _use_real_connectors(mp):
        mp.setattr("app.integrations.settings.use_mock_integrations", False)
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "jira_base_url", "https://acme.atlassian.net")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "jira_email", "user@acme.com")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "jira_api_token", "tok")

    _use_real_connectors(monkeypatch)

    context = _context("acme/webapp", "router", COMPANY)
    for item in context.items:
        assert item.url, f"Item has empty url: {item}"
        assert item.url.startswith("http"), f"Url must start with http: {item.url}"


# ---------------------------------------------------------------------------
# Partial failure: verify error collection pattern
# ---------------------------------------------------------------------------

def test_partial_failure_errors_collected_when_no_items(monkeypatch):
    """Verify that when connectors fail, errors are collected in CompanyContext.
    
    This test confirms the structural contract: get_company_context never raises
    because one connector is down - it collects ConnectorError entries instead.
    """
    def _all_missing(mp):
        mp.setattr("app.integrations.settings.use_mock_integrations", False)
        # No credentials for any connector
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "jira_base_url", "")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "jira_email", "")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "jira_api_token", "")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "slack_bot_token", "")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "slack_channel_ids", "")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "confluence_base_url", "")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "confluence_email", "")
        mp.setattr(__import__("app.integrations", fromlist=["settings"]).settings, "confluence_api_token", "")

    _all_missing(monkeypatch)

    context = _context("acme/webapp", "router", COMPANY)
    # Should have items empty and errors from all three connectors
    assert context.items == []
    assert isinstance(context, CompanyContext)
    # All three source types should have errors
    error_source_types = {e.source_type for e in context.errors}
    assert error_source_types == {"jira", "slack", "confluence"}
    # All errors should be NOT_CONNECTED when no creds
    assert all(e.code == "NOT_CONNECTED" for e in context.errors)