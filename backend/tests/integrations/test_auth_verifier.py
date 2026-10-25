"""Unit tests for Jira, Confluence, and Slack authentication verifiers."""

import time
import unittest.mock as mock
import pytest
import httpx

from app.integrations.auth_verifier import (
    JiraAuthClient,
    ConfluenceAuthClient,
    SlackAuthClient,
    AtlassianOAuthHelper,
)


# ==============================================================================
# Missing Environment Variables
# ==============================================================================

def test_jira_missing_env():
    client = JiraAuthClient(base_url="", email="", api_token="", oauth_access_token="", cloud_id="")
    result = client.verify_auth()
    assert result.success is False
    assert result.status_code is None
    assert "Missing required Jira credentials" in result.message
    assert any("JIRA_BASE_URL" in err for err in result.errors)
    assert any("JIRA_EMAIL" in err for err in result.errors)
    assert any("JIRA_API_TOKEN" in err for err in result.errors)


def test_confluence_missing_env():
    client = ConfluenceAuthClient(base_url="", email="", api_token="", oauth_access_token="", cloud_id="")
    result = client.verify_auth()
    assert result.success is False
    assert result.status_code is None
    assert "Missing required Confluence credentials" in result.message
    assert any("CONFLUENCE_BASE_URL" in err for err in result.errors)
    assert any("CONFLUENCE_EMAIL" in err for err in result.errors)
    assert any("CONFLUENCE_API_TOKEN" in err for err in result.errors)


def test_slack_missing_env():
    client = SlackAuthClient(bot_token="")
    result = client.verify_auth()
    assert result.success is False
    assert result.status_code is None
    assert "Missing required Slack token" in result.message
    assert any("SLACK_BOT_TOKEN" in err for err in result.errors)


# ==============================================================================
# Jira Mocked Tests
# ==============================================================================

def test_jira_auth_success_mocked(monkeypatch):
    client = JiraAuthClient(
        base_url="https://test.atlassian.net",
        email="dev@example.com",
        api_token="valid_token",
    )

    fake_response = httpx.Response(
        status_code=200,
        json={
            "accountId": "12345",
            "displayName": "Ada Lovelace",
            "emailAddress": "ada@example.com",
            "accountType": "atlassian",
            "active": True,
            "timeZone": "UTC",
        },
        request=httpx.Request("GET", "https://test.atlassian.net/rest/api/3/myself"),
    )

    monkeypatch.setattr(httpx, "get", mock.Mock(return_value=fake_response))

    result = client.verify_auth()
    assert result.success is True
    assert result.status_code == 200
    assert result.identity["display_name"] == "Ada Lovelace"
    assert result.identity["account_id"] == "12345"


def test_jira_auth_401_mocked(monkeypatch):
    client = JiraAuthClient(
        base_url="https://test.atlassian.net",
        email="dev@example.com",
        api_token="bad_token",
    )

    fake_response = httpx.Response(
        status_code=401,
        text="Unauthorized",
        request=httpx.Request("GET", "https://test.atlassian.net/rest/api/3/myself"),
    )

    monkeypatch.setattr(httpx, "get", mock.Mock(return_value=fake_response))

    result = client.verify_auth()
    assert result.success is False
    assert result.status_code == 401
    assert any("401 Unauthorized" in err for err in result.errors)


# ==============================================================================
# Confluence Mocked Tests
# ==============================================================================

def test_confluence_auth_success_mocked(monkeypatch):
    client = ConfluenceAuthClient(
        base_url="https://test.atlassian.net/wiki",
        email="dev@example.com",
        api_token="valid_token",
    )

    fake_response = httpx.Response(
        status_code=200,
        json={
            "accountId": "confluence-user-99",
            "displayName": "Grace Hopper",
            "email": "grace@example.com",
            "type": "known",
        },
        request=httpx.Request("GET", "https://test.atlassian.net/wiki/rest/api/user/current"),
    )

    monkeypatch.setattr(httpx, "get", mock.Mock(return_value=fake_response))

    result = client.verify_auth()
    assert result.success is True
    assert result.status_code == 200
    assert result.identity["display_name"] == "Grace Hopper"
    assert result.identity["account_id"] == "confluence-user-99"


def test_confluence_auth_403_mocked(monkeypatch):
    client = ConfluenceAuthClient(
        base_url="https://test.atlassian.net/wiki",
        email="dev@example.com",
        api_token="limited_token",
    )

    fake_response = httpx.Response(
        status_code=403,
        text="Forbidden",
        request=httpx.Request("GET", "https://test.atlassian.net/wiki/rest/api/user/current"),
    )

    monkeypatch.setattr(httpx, "get", mock.Mock(return_value=fake_response))

    result = client.verify_auth()
    assert result.success is False
    assert result.status_code == 403
    assert any("403 Forbidden" in err for err in result.errors)


# ==============================================================================
# Slack Mocked Tests
# ==============================================================================

def test_slack_auth_success_mocked(monkeypatch):
    client = SlackAuthClient(bot_token="xoxb-valid-test-token")

    fake_response = httpx.Response(
        status_code=200,
        json={
            "ok": True,
            "url": "https://team.slack.com/",
            "team": "Engineering Team",
            "user": "bot_user",
            "team_id": "T12345",
            "user_id": "U12345",
            "bot_id": "B12345",
        },
        request=httpx.Request("POST", "https://slack.com/api/auth.test"),
    )

    monkeypatch.setattr(httpx, "post", mock.Mock(return_value=fake_response))

    result = client.verify_auth()
    assert result.success is True
    assert result.status_code == 200
    assert result.identity["team_name"] == "Engineering Team"
    assert result.identity["bot_id"] == "B12345"


def test_slack_auth_invalid_auth_mocked(monkeypatch):
    client = SlackAuthClient(bot_token="xoxb-bad-token")

    fake_response = httpx.Response(
        status_code=200,
        json={"ok": False, "error": "invalid_auth"},
        request=httpx.Request("POST", "https://slack.com/api/auth.test"),
    )

    monkeypatch.setattr(httpx, "post", mock.Mock(return_value=fake_response))

    result = client.verify_auth()
    assert result.success is False
    assert result.status_code == 200
    assert "invalid_auth" in result.message
    assert any("invalid_auth" in err for err in result.errors)


# ==============================================================================
# Slack Signature Verification Tests
# ==============================================================================

def test_slack_signature_verification():
    import hashlib
    import hmac

    secret = "test_signing_secret_12345"
    client = SlackAuthClient(bot_token="xoxb-fake", signing_secret=secret)

    timestamp = str(int(time.time()))
    raw_body = b'{"text":"hello world"}'

    # Compute valid signature
    sig_basestring = f"v0:{timestamp}:".encode("utf-8") + raw_body
    h = hmac.new(secret.encode("utf-8"), sig_basestring, hashlib.sha256).hexdigest()
    valid_signature = f"v0={h}"

    assert client.verify_request_signature(timestamp, raw_body, valid_signature) is True

    # Bad signature
    assert client.verify_request_signature(timestamp, raw_body, "v0=invalid_hash") is False

    # Expired timestamp (> 300 seconds)
    old_timestamp = str(int(time.time()) - 400)
    old_basestring = f"v0:{old_timestamp}:".encode("utf-8") + raw_body
    old_hash = hmac.new(secret.encode("utf-8"), old_basestring, hashlib.sha256).hexdigest()
    assert client.verify_request_signature(old_timestamp, raw_body, f"v0={old_hash}") is False


# ==============================================================================
# Atlassian OAuth Helper Tests
# ==============================================================================

def test_atlassian_oauth_url_builder():
    url = AtlassianOAuthHelper.build_authorization_url(
        client_id="my-client-id",
        redirect_uri="https://myapp.com/callback",
        state="xyz123",
        scopes=["read:me", "read:jira-user", "offline_access"],
    )
    assert "https://auth.atlassian.com/authorize?" in url
    assert "client_id=my-client-id" in url
    assert "redirect_uri=https%3A%2F%2Fmyapp.com%2Fcallback" in url
    assert "state=xyz123" in url
    assert "offline_access" in url
