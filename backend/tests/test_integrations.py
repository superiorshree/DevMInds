
"""Integration contracts and API route tests for DevMinds."""

from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

import app.integrations as integrations
from app.config import settings
from app.integrations import CompanyContext
from app.integrations.base import (
    AdapterError,
    BaseConnector,
    IntegrationAdapter,
    RateLimitError,
)
from app.integrations.github import GitHubAdapter
from app.main import app


class TestConnectorContracts:
    def test_base_connector_is_abstract(self):
        with pytest.raises(TypeError):
            BaseConnector()

    def test_integration_adapter_is_abstract(self):
        with pytest.raises(TypeError):
            IntegrationAdapter()

    def test_github_implements_adapter(self):
        assert isinstance(GitHubAdapter(), IntegrationAdapter)

    def test_company_connectors_implement_base(self):
        for connector in integrations._connectors():
            assert isinstance(connector, BaseConnector)
            assert connector.source_type in {
                "jira", "slack", "confluence"
            }


class TestIntegrationErrors:
    def test_adapter_error(self):
        error = AdapterError("jira", "Unavailable")
        assert error.provider == "jira"
        assert error.code == "provider_error"

    def test_rate_limit_error(self):
        error = RateLimitError("jira")
        assert isinstance(error, AdapterError)
        assert error.code == "rate_limited"


class TestCompanyContext:
    @pytest.mark.asyncio
    async def test_company_mode_gate(self):
        with pytest.raises(PermissionError):
            await integrations.get_company_context(
                "owner/repo", "architecture", "open_source"
            )

    @pytest.mark.asyncio
    async def test_mock_context(self, monkeypatch):
        monkeypatch.setattr(
            settings, "use_mock_integrations", True
        )

        def fail_if_called():
            raise AssertionError("Real connectors were called")

        monkeypatch.setattr(
            integrations, "_connectors", fail_if_called
        )

        result = await integrations.get_company_context(
            "owner/repo", "architecture", "company"
        )

        assert isinstance(result, CompanyContext)
        assert result.items
        assert result.errors == []

    @pytest.mark.asyncio
    async def test_real_connector_aggregation(self, monkeypatch):
        monkeypatch.setattr(
            settings, "use_mock_integrations", False
        )

        class FakeConnector:
            def __init__(self, source_type):
                self.source_type = source_type

            async def fetch(self, repo, query):
                return CompanyContext()

        monkeypatch.setattr(
            integrations,
            "_connectors",
            lambda: [
                FakeConnector("jira"),
                FakeConnector("slack"),
                FakeConnector("confluence"),
            ],
        )

        result = await integrations.get_company_context(
            "owner/repo", "architecture", "company"
        )

        assert isinstance(result, CompanyContext)
        assert result.items == []
        assert result.errors == []

    @pytest.mark.asyncio
    async def test_status_contains_three_connectors(self, monkeypatch):
        monkeypatch.setattr(
            settings, "use_mock_integrations", True
        )

        result = await integrations.integration_status()

        assert set(result) == {
            "jira", "slack", "confluence"
        }
        assert all(
            status == "connected"
            for status in result.values()
        )

    def test_context_lists_are_independent(self):
        first = CompanyContext()
        second = CompanyContext()

        assert first.items is not second.items
        assert first.errors is not second.errors


class TestIntegrationRoutes:
    def test_routes_are_registered(self):
        paths = {route.path for route in app.routes}

        assert "/api/integrations" in paths
        assert "/api/integrations/{provider}/connect" in paths
        assert "/api/integrations/{provider}" in paths
        assert "/api/integrations/slack/share" in paths

    def test_list_requires_authentication(self):
        client = TestClient(app)

        response = client.get("/api/integrations")

        assert response.status_code == 401


def test_company_integration_api_reports_real_status(monkeypatch, request):
    """Company users see connector health through the HTTP endpoint."""
    from fastapi.testclient import TestClient
    import app.api.integrations as api_integrations
    from app.core.modes import UserMode
    from app.core.security import (
        create_session_token,
        find_or_create_user,
        update_user_mode,
    )
    from app.main import app

    async def fake_health():
        return {
            "jira": "connected",
            "slack": "connected",
            "confluence": "connected",
        }

    monkeypatch.setattr(
        api_integrations, "integration_health", fake_health
    )

    user = find_or_create_user(
        github_id=77003,
        login="integration-health-tester",
        avatar_url="",
    )
    update_user_mode(user, UserMode.company)

    # Configure a temporary signing secret for this test only.
    from app.core.config import get_settings

    monkeypatch.setenv(
        "SESSION_SECRET",
        "devminds-test-secret-only-not-for-production"
    )
    get_settings.cache_clear()
    request.addfinalizer(get_settings.cache_clear)

    token = create_session_token(user.id)

    client = TestClient(app)
    response = client.get(
        "/api/integrations",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    providers = {
        item["provider"]: item
        for item in response.json()["providers"]
    }

    for provider in ("jira", "slack", "confluence"):
        assert providers[provider]["available"] is True
        assert providers[provider]["connected"] is True


def test_open_source_mode_restricts_company_integrations(monkeypatch):
    """Open-source users cannot access company integrations."""
    from fastapi.testclient import TestClient
    import app.api.integrations as api_integrations
    from app.core.modes import UserMode
    from app.core.security import (
        create_session_token,
        find_or_create_user,
        update_user_mode,
    )
    from app.core.config import get_settings
    from app.main import app

    async def forbidden_health():
        raise AssertionError(
            "Company health checks must not run in open-source mode"
        )

    monkeypatch.setattr(
        api_integrations, "integration_health", forbidden_health
    )

    monkeypatch.setenv(
        "SESSION_SECRET",
        "devminds-test-secret-only-not-for-production"
    )
    get_settings.cache_clear()

    try:
        user = find_or_create_user(
            github_id=77004,
            login="open-source-integration-tester",
            avatar_url="",
        )
        update_user_mode(user, UserMode.open_source)

        token = create_session_token(user.id)
        client = TestClient(app)

        response = client.get(
            "/api/integrations",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200

        providers = {
            item["provider"]: item
            for item in response.json()["providers"]
        }

        for provider in ("jira", "slack", "confluence"):
            assert providers[provider]["available"] is False
            assert providers[provider]["connected"] is False
    finally:
        get_settings.cache_clear()
