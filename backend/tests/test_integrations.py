
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


from app.core.config import get_settings
from app.integrations import CompanyContext, get_company_context, integration_status
from app.integrations.base import AdapterError, IntegrationAdapter, RateLimitError
from app.integrations.confluence import ConfluenceAdapter
from app.integrations.github import GitHubAdapter
from app.integrations.jira import JiraConnector
from app.integrations.slack import SlackAdapter


class TestConnectorContracts:
    def test_base_connector_is_abstract(self):
        with pytest.raises(TypeError):
            BaseConnector()

    def test_github_implements_adapter(self):
        assert isinstance(GitHubAdapter(), IntegrationAdapter)

    def test_company_connectors_implement_base(self):
        for connector in integrations._connectors():
            assert isinstance(connector, BaseConnector)
            assert connector.source_type in {
                "jira", "slack", "confluence"
            }

#: Every connector the repository ships, keyed by their provider name.
ALL_ADAPTERS = [GitHubAdapter, JiraConnector, ConfluenceAdapter, SlackAdapter]

#: Adapters documented as read-only: they must never write to the provider.
READ_ONLY_ADAPTERS = [GitHubAdapter, JiraConnector, ConfluenceAdapter]


class TestAdapterContract:
    def test_rate_limit_error(self):
        error = RateLimitError("jira")
        assert isinstance(error, AdapterError)
        assert error.code == "rate_limited"


    def test_base_class_is_abstract(self) -> None:
        """IntegrationAdapter cannot be instantiated directly — it is the contract."""
        with pytest.raises(TypeError):
            IntegrationAdapter()  # type: ignore[abstract]

    @pytest.mark.parametrize("adapter_cls", ALL_ADAPTERS, ids=lambda cls: cls.__name__)
    def test_adapter_satisfies_the_shared_interface(self, adapter_cls: type) -> None:
        """Each connector is instantiable and implements check_connection()/fetch()/send()."""
        adapter = adapter_cls()
        assert isinstance(adapter, IntegrationAdapter)
        # Concrete provider name, not the abstract default.
        assert isinstance(adapter.provider, str)
        assert adapter.provider not in ("", "base")
        # The interface is synchronous and returns a plain bool today.
        assert isinstance(adapter.check_connection(), bool)

    @pytest.mark.parametrize("adapter_cls", READ_ONLY_ADAPTERS, ids=lambda cls: cls.__name__)
    def test_read_only_adapters_refuse_to_send(self, adapter_cls: type) -> None:
        """GitHub, Jira and Confluence never write — send() always raises."""
        adapter = adapter_cls()
        with pytest.raises(NotImplementedError):
            adapter.send({})

    def test_jira_is_a_read_only_connector(self) -> None:
        """The Jira connector is read-only by contract (no writes to Jira)."""
        jira = JiraConnector()
        assert jira.provider == "jira"
        with pytest.raises(NotImplementedError):
            jira.send({"key": "DEV-101"})

    def test_slack_never_reads_messages(self) -> None:
        """Slack is one-way send only: fetch() must always raise."""
        with pytest.raises(NotImplementedError):
            SlackAdapter().fetch()


class TestAdapterErrors:
    """The shared error types carry provider, message and code uniformly."""

    def test_adapter_error_defaults_to_provider_error_code(self) -> None:
        err = AdapterError("jira", "boom")
        assert err.provider == "jira"
        assert err.message == "boom"
        assert err.code == "provider_error"
        assert str(err) == "jira: boom"

    def test_adapter_error_accepts_a_specific_code(self) -> None:
        err = AdapterError("jira", "Jira unreachable", code="api_down")
        assert err.code == "api_down"

    def test_rate_limit_error_is_an_adapter_error(self) -> None:
        err = RateLimitError("jira")
        assert isinstance(err, AdapterError)
        assert err.code == "rate_limited"
        assert err.message == "Rate limited by provider"

    def test_rate_limit_error_keeps_provider_and_message(self) -> None:
        err = RateLimitError("jira", "429 from Jira")
        assert err.provider == "jira"
        assert err.message == "429 from Jira"


class TestIntegrationModeGate:
    """Company context is gated server-side on the company mode."""

    def test_company_context_refused_outside_company_mode(self) -> None:
        """open_source mode never receives company context (PermissionError)."""
        with pytest.raises(PermissionError):
            get_company_context("someone/somerepo", "query", "open_source")

    def test_integration_status_covers_every_connector(self) -> None:
        status = integration_status()
        assert set(status) == {"jira", "slack", "confluence"}
        assert set(status.values()) <= {"connected", "not_connected", "error"}


class TestMockCompanyContext:
    """Mock-mode company context: stub data, frozen shape, real connector untouched."""

    @pytest.fixture(autouse=True)
    def _ensure_mock(self, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("USE_MOCK_INTEGRATIONS", "true")
        monkeypatch.setattr(settings, "use_mock_integrations", True)
        get_settings.cache_clear()
        yield
        get_settings.cache_clear()

    def test_mock_context_is_served_without_touching_the_real_jira_adapter(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Building company context never reaches the real Jira connector.

        There is no dispatcher yet (reported separately), so this pins the
        property that must hold once one exists: mock mode must not call the
        real adapter.
        """

        def _fail(*args: object, **kwargs: object) -> object:
            raise AssertionError("real Jira connector was called in mock mode")

        monkeypatch.setattr(JiraConnector, "fetch", _fail)
        monkeypatch.setattr(JiraConnector, "check_connection", _fail)

        ctx = get_company_context("someone/somerepo", "query", "company")
        assert isinstance(ctx, CompanyContext)
        assert ctx.items, "mock context should return stub items"
        assert ctx.errors == []

    def test_mock_context_keeps_the_frozen_shape(self) -> None:
        """CompanyContext stays {items, errors} with source-linked items."""
        ctx = get_company_context("someone/somerepo", "query", "company")
        assert set(vars(ctx).keys()) == {"items", "errors"}
        for item in ctx.items:
            assert {"source_type", "title", "content", "url"} <= set(vars(item))
            assert item.source_type in {"jira", "slack", "confluence"}
        assert isinstance(ctx.errors, list)

    def test_company_context_instances_do_not_share_lists(self) -> None:
        """Default items/errors are per-instance (no shared mutable class state)."""
        first, second = CompanyContext(), CompanyContext()
        assert first.items is not second.items
        assert first.errors is not second.errors
        first.items.append(object())
        assert second.items == []

    def test_use_mock_integrations_env_name_maps_to_setting(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The frozen env var name USE_MOCK_INTEGRATIONS still drives the setting."""
        monkeypatch.setenv("USE_MOCK_INTEGRATIONS", "false")
        get_settings.cache_clear()
        try:
            assert get_settings().use_mock_integrations is False
        finally:
            get_settings.cache_clear()

    def test_mock_flag_off_refuses_stub_company_context(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """With USE_MOCK_INTEGRATIONS=false the real connectors run, no sample data.
        Unconfigured Jira (empty JIRA_* settings) returns NOT_CONNECTED;
        the .env file has defaults, so this test patches the settings after clearing
        the cache so the connector sees an unconfigured state.
        """
        monkeypatch.setenv("USE_MOCK_INTEGRATIONS", "false")
        get_settings.cache_clear()
        try:
            # Patch get_settings to return empty JIRA fields so the connector
            # sees unconfigured state instead of .env defaults.
            from unittest.mock import patch
            import app.core.config as cfg_mod
            original_get = cfg_mod.get_settings
            # Create a settings object with empty jira fields
            from pydantic_settings import SettingsConfigDict
            mock_settings = type('Settings', (), {
                'model_config': SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore"),
                'use_mock_integrations': False,
                'cors_origins_list': [],
                'session_secret': 'test',
                'debug': False,
                'backend_host': 'localhost',
                'backend_port': 8000,
                'github_client_id': '',
                'github_client_secret': '',
                'github_redirect_uri': 'http://localhost:8000/api/auth/github/callback',
                'extension_redirect_uri': '',
                'ai_chat_enabled': True,
                'ollama_base_url': 'http://localhost:11434',
                'ollama_model': 'llama3.2:3b',
                'ollama_timeout_seconds': 60,
                'external_llm_base_url': '',
                'external_llm_api_key': '',
                'external_llm_model': '',
                'external_llm_timeout_seconds': 30,
                'allow_external_for_company': False,
                'jira_base_url': '',
                'jira_email': '',
                'jira_api_token': '',
                'cors_origins': '',
            })()
            cfg_mod.get_settings = lambda: mock_settings
            ctx = get_company_context("someone/somerepo", "query", "company")
            assert ctx.items == [], "no fake items without mock mode"
            assert all(error.code == "NOT_CONNECTED" for error in ctx.errors)
            # The mode gate still fires first — company mode only, always.
            with pytest.raises(PermissionError):
                get_company_context("someone/somerepo", "query", "open_source")
        finally:
            # Restore original get_settings
            cfg_mod.get_settings = original_get
            get_settings.cache_clear()

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
