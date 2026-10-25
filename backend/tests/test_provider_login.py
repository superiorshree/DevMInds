"""Tests for real account login endpoints (Jira, Confluence, Slack)."""

import pytest
from fastapi.testclient import TestClient
import httpx
from unittest import mock

from app.main import app
from app.core.modes import UserMode

client = TestClient(app)


from app.core.config import get_settings


@pytest.fixture(autouse=True)
def _auth_env(monkeypatch):
    monkeypatch.setenv("SESSION_SECRET", "test-session-secret-for-provider-login")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()



def test_jira_login_success(monkeypatch):
    """Test Jira real account login creates a company session."""
    fake_jira_resp = httpx.Response(
        status_code=200,
        json={
            "accountId": "jira-acc-12345",
            "displayName": "Sarah Connor",
            "emailAddress": "sarah@cyberdyne.com",
            "accountType": "atlassian",
            "active": True,
        },
        request=httpx.Request("GET", "https://cyberdyne.atlassian.net/rest/api/3/myself"),
    )
    monkeypatch.setattr(httpx, "get", mock.Mock(return_value=fake_jira_resp))

    resp = client.post(
        "/api/auth/login/jira",
        json={
            "base_url": "https://cyberdyne.atlassian.net",
            "email": "sarah@cyberdyne.com",
            "api_token": "token123",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["user"]["display_name"] == "Sarah Connor"
    assert data["user"]["email"] == "sarah@cyberdyne.com"
    assert data["user"]["mode"] == "company"
    assert data["user"]["provider"] == "jira"

    # Test /api/auth/me with the issued session token
    me_resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {data['token']}"},
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["display_name"] == "Sarah Connor"
    assert me_data["mode"] == "company"
    assert me_data["provider"] == "jira"


def test_confluence_login_success(monkeypatch):
    """Test Confluence real account login."""
    fake_conf_resp = httpx.Response(
        status_code=200,
        json={
            "accountId": "conf-acc-67890",
            "displayName": "John Connor",
            "email": "john@resistance.org",
            "type": "known",
        },
        request=httpx.Request("GET", "https://cyberdyne.atlassian.net/wiki/rest/api/user/current"),
    )
    monkeypatch.setattr(httpx, "get", mock.Mock(return_value=fake_conf_resp))

    resp = client.post(
        "/api/auth/login/confluence",
        json={
            "base_url": "https://cyberdyne.atlassian.net/wiki",
            "email": "john@resistance.org",
            "api_token": "token456",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["display_name"] == "John Connor"
    assert data["user"]["mode"] == "company"
    assert data["user"]["provider"] == "confluence"


def test_slack_login_success(monkeypatch):
    """Test Slack real account login."""
    fake_slack_resp = httpx.Response(
        status_code=200,
        json={
            "ok": True,
            "url": "https://cyberdyne.slack.com/",
            "team": "Cyberdyne Systems",
            "user": "t800_bot",
            "team_id": "T800",
            "user_id": "U101",
            "bot_id": "B101",
        },
        request=httpx.Request("POST", "https://slack.com/api/auth.test"),
    )
    monkeypatch.setattr(httpx, "post", mock.Mock(return_value=fake_slack_resp))

    resp = client.post(
        "/api/auth/login/slack",
        json={"token": "xoxb-valid-slack-bot-token"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "t800_bot" in data["user"]["display_name"]
    assert data["user"]["mode"] == "company"
    assert data["user"]["provider"] == "slack"


def test_unified_login_dispatcher(monkeypatch):
    """Test POST /api/auth/login dispatches correctly."""
    fake_slack_resp = httpx.Response(
        status_code=200,
        json={
            "ok": True,
            "team": "Unified Team",
            "user": "bot",
            "user_id": "U999",
        },
        request=httpx.Request("POST", "https://slack.com/api/auth.test"),
    )
    monkeypatch.setattr(httpx, "post", mock.Mock(return_value=fake_slack_resp))

    resp = client.post(
        "/api/auth/login",
        json={"provider": "slack", "token": "xoxb-unified-token"},
    )
    assert resp.status_code == 200
    assert resp.json()["user"]["provider"] == "slack"


def test_login_failure_returns_401(monkeypatch):
    """Test failed credentials return 401."""
    fake_jira_resp = httpx.Response(
        status_code=401,
        text="Unauthorized",
        request=httpx.Request("GET", "https://invalid.atlassian.net/rest/api/3/myself"),
    )
    monkeypatch.setattr(httpx, "get", mock.Mock(return_value=fake_jira_resp))

    resp = client.post(
        "/api/auth/login/jira",
        json={
            "base_url": "https://invalid.atlassian.net",
            "email": "wrong@test.com",
            "api_token": "bad_token",
        },
    )
    assert resp.status_code == 401
    assert "401" in resp.json()["detail"]
