import asyncio
import logging

import httpx
import pytest

from app.integrations import health


def test_one_connector_failure_does_not_stop_others(monkeypatch):
    def jira_failure():
        raise httpx.ConnectError("Simulated connection failure")

    monkeypatch.setattr(health, "check_jira_health", jira_failure)
    monkeypatch.setattr(health, "check_slack_health", lambda: "connected")
    monkeypatch.setattr(health, "check_confluence_health", lambda: "connected")

    result = asyncio.run(health.integration_health())

    assert result == {
        "jira": "API_DOWN",
        "slack": "connected",
        "confluence": "connected",
    }


def test_all_connectors_fail_independently(monkeypatch):
    def failed():
        raise httpx.TimeoutException("Simulated timeout")

    for name in (
        "check_jira_health",
        "check_slack_health",
        "check_confluence_health",
    ):
        monkeypatch.setattr(health, name, failed)

    result = asyncio.run(health.integration_health())

    assert result == {
        "jira": "API_DOWN",
        "slack": "API_DOWN",
        "confluence": "API_DOWN",
    }


def test_health_results_contain_no_secret(monkeypatch, caplog):
    secret = "test_secret_token_987654"

    def failed():
        raise RuntimeError(secret)

    monkeypatch.setattr(health, "check_jira_health", failed)
    monkeypatch.setattr(health, "check_slack_health", lambda: "connected")
    monkeypatch.setattr(health, "check_confluence_health", lambda: "connected")

    with caplog.at_level(logging.DEBUG):
        result = asyncio.run(health.integration_health())

    assert result["jira"] == "API_DOWN"
    assert secret not in str(result)
    assert secret not in caplog.text
