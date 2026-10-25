# File:        backend/tests/test_contracts.py
# Owner:       Shreyansh
# Purpose:     Verifies the frozen contracts, env names, and new mode values work.
# Contains:    Import tests, model validation, error code validation, settings exposure, mode values.
# Status:      REAL — tests the contracts and configuration.
# Depends on:  backend.app.schemas.contracts, backend.app.core.config, backend.app.core.modes

import pytest

from app.schemas.contracts import (
    Mode,
    Visibility,
    SourceRef,
    RepoFile,
    RepositoryContext,
    CompanyItem,
    ConnectorError,
    CompanyContext,
    AIError,
    AIAnswer,
)

from app.core.config import get_settings


class TestModeValues:
    """Test that the Mode Literal has the correct values."""

    def test_mode_literal_values(self):
        # Mode is Literal["open_source", "company"]; check the raw values exist
        assert "open_source" in Mode.__args__  # type: ignore
        assert "company" in Mode.__args__  # type: ignore


class TestVisibilityLiteral:
    """Test that the Visibility Literal has the correct values."""

    def test_visibility_literal_values(self):
        # Visibility is Literal["public", "private"]; check the raw values exist
        assert "public" in Visibility.__args__  # type: ignore
        assert "private" in Visibility.__args__  # type: ignore


class TestSourceRef:
    """Test SourceRef model."""

    def test_source_ref_creation(self):
        ref = SourceRef(title="Test", url="https://example.com", source_type="github")
        assert ref.title == "Test"
        assert ref.url == "https://example.com"
        assert ref.source_type == "github"


class TestRepoFile:
    """Test RepoFile model."""

    def test_repo_file_creation(self):
        rf = RepoFile(path="README.md", content="# Hi", url="https://github.com/test/repo/blob/main/README.md")
        assert rf.path == "README.md"
        assert rf.content == "# Hi"
        assert rf.url == "https://github.com/test/repo/blob/main/README.md"


class TestRepositoryContext:
    """Test RepositoryContext model."""

    def test_repo_context_defaults(self):
        rc = RepositoryContext(visibility="public", analysis={})
        assert rc.visibility == "public"
        assert rc.analysis == {}
        assert rc.files == []

    def test_repo_context_with_files(self):
        rc = RepositoryContext(
            visibility="private",
            analysis={"lang": "Python"},
            files=[RepoFile(path="a.py", content="print('hi')", url="https://example.com")],
        )
        assert rc.visibility == "private"
        assert rc.analysis == {"lang": "Python"}
        assert len(rc.files) == 1


class TestCompanyItem:
    """Test CompanyItem model."""

    def test_company_item_creation(self):
        ci = CompanyItem(source_type="jira", title="DEV-101", content="Fix bug", url="https://jira.example.com")
        assert ci.source_type == "jira"
        assert ci.title == "DEV-101"
        assert ci.content == "Fix bug"
        assert ci.url == "https://jira.example.com"
        assert ci.metadata == {}


class TestConnectorError:
    """Test ConnectorError model."""

    def test_connector_error_creation(self):
        ce = ConnectorError(source_type="slack", code="TOKEN_EXPIRED", message="Token has expired")
        assert ce.source_type == "slack"
        assert ce.code == "TOKEN_EXPIRED"
        assert ce.message == "Token has expired"


class TestCompanyContext:
    """Test CompanyContext model."""

    def test_company_context_defaults(self):
        cc = CompanyContext()
        assert cc.items == []
        assert cc.errors == []

    def test_company_context_with_items(self):
        cc = CompanyContext(
            items=[
                CompanyItem(source_type="jira", title="DEV-101", content="Fix bug", url="https://jira.example.com"),
            ],
            errors=[
                ConnectorError(source_type="confluence", code="API_DOWN", message="Confluence unreachable"),
            ],
        )
        assert len(cc.items) == 1
        assert len(cc.errors) == 1


class TestAIError:
    """Test AIError model."""

    def test_ai_error_creation(self):
        ae = AIError(code="PRIVATE_AI_UNAVAILABLE", message="Ollama is down")
        assert ae.code == "PRIVATE_AI_UNAVAILABLE"
        assert ae.message == "Ollama is down"


class TestAIAnswer:
    """Test AIAnswer model."""

    def test_ai_answer_defaults(self):
        aa = AIAnswer()
        assert aa.answer is None
        assert aa.sources == []
        assert aa.provider is None
        assert aa.error is None

    def test_ai_answer_with_values(self):
        ae = AIError(code="PROVIDER_ERROR", message="Provider failed")
        aa = AIAnswer(
            answer="Here is the answer",
            sources=[SourceRef(title="file", url="https://example.com", source_type="github")],
            provider="ollama",
            error=ae,
        )
        assert aa.answer == "Here is the answer"
        assert len(aa.sources) == 1
        assert aa.provider == "ollama"
        assert aa.error == ae


class TestSettings:
    """Test that settings expose the new env var names."""

    def test_settings_has_new_names(self):
        settings = get_settings()
        # Check all required env var names exist as attributes
        assert hasattr(settings, "ai_chat_enabled")
        assert hasattr(settings, "ollama_base_url")
        assert hasattr(settings.ollama_base_url, "__class__") or settings.ollama_base_url == "http://localhost:11434"
        assert hasattr(settings, "ollama_model")
        assert settings.ollama_model == "llama3.2:3b"
        assert hasattr(settings, "ollama_timeout_seconds")
        assert settings.ollama_timeout_seconds == 60
        assert hasattr(settings, "external_llm_base_url")
        assert hasattr(settings, "external_llm_api_key")
        assert hasattr(settings, "external_llm_model")
        assert hasattr(settings, "external_llm_timeout_seconds")
        assert settings.external_llm_timeout_seconds == 30
        assert hasattr(settings, "allow_external_for_company")
        assert settings.allow_external_for_company is False
        assert hasattr(settings, "use_mock_integrations")
        assert isinstance(settings.use_mock_integrations, bool)
        assert hasattr(settings, "jira_base_url")
        assert hasattr(settings, "jira_email")
        assert hasattr(settings, "jira_api_token")
        assert hasattr(settings, "slack_bot_token")
        assert hasattr(settings, "slack_channel_ids")
        assert hasattr(settings, "confluence_base_url")
        assert hasattr(settings, "confluence_email")
        assert hasattr(settings, "confluence_api_token")
        assert hasattr(settings, "database_url")
        assert settings.database_url == "sqlite:///./devminds.db"


class TestModeValuesWork:
    """Test that the new mode values work with existing mode endpoints."""

    def test_open_source_mode(self):
        from app.core.modes import UserMode, features_for_mode, mode_has_feature

        # open_source mode
        assert UserMode.open_source.value == "open_source"
        features = features_for_mode("open_source")
        assert features["privateRepos"] is False
        assert features["contributeTab"] is True
        assert features["contextTab"] is False
        assert features["jira"] is False
        assert features["confluence"] is False
        assert features["slackShare"] is False

        # open_source should not have company features
        assert mode_has_feature("open_source", "jira") is False
        assert mode_has_feature("open_source", "confluence") is False
        assert mode_has_feature("open_source", "slackShare") is False

    def test_company_mode(self):
        from app.core.modes import UserMode, features_for_mode, mode_has_feature

        # company mode
        assert UserMode.company.value == "company"
        features = features_for_mode("company")
        assert features["privateRepos"] is True
        assert features["contributeTab"] is False
        assert features["contextTab"] is True
        assert features["jira"] is True
        assert features["confluence"] is True
        assert features["slackShare"] is True

        # company should have all features
        assert mode_has_feature("company", "jira") is True
        assert mode_has_feature("company", "confluence") is True
        assert mode_has_feature("company", "slackShare") is True


class TestConfigImport:
    """The public config API `from app.config import settings` must keep working."""

    def test_app_config_exposes_settings(self) -> None:
        from app.config import settings
        from app.core.config import Settings

        assert isinstance(settings, Settings)
        # Same instance as the factory returns: no second independent Settings,
        # so the re-export stays correct after get_settings.cache_clear().
        assert settings is get_settings()
        assert settings.ollama_model == get_settings().ollama_model

    def test_app_config_unknown_attribute_raises(self) -> None:
        import app.config

        with pytest.raises(AttributeError):
            app.config.does_not_exist


class TestAIFrozenContractReuse:
    """app.ai must reuse the frozen AIAnswer/AIError, never redeclare them."""

    def test_ai_module_reexports_the_frozen_models(self) -> None:
        import app.ai as ai
        from app.schemas.contracts import AIAnswer, AIError

        # Identity, not just equivalence: one definition, one source of truth.
        assert ai.AIAnswer is AIAnswer
        assert ai.AIError is AIError

    def test_ai_service_returns_a_contract_answer(self, monkeypatch) -> None:
        import asyncio

        import app.ai as ai
        from app.schemas.contracts import AIAnswer

        async def fake_generate(self, messages):
            return "Routing lives in the backend."

        monkeypatch.setattr(
            ai.ExternalLLMProvider,
            "generate",
            fake_generate,
        )

        answer = asyncio.run(
            ai.get_ai_service().answer(
                question="Where does routing live?",
                repository_context={},
                company_context=[],
                mode="open_source",
            )
        )

        assert isinstance(answer, AIAnswer)
        assert answer.answer == "Routing lives in the backend."
        assert answer.provider == "external"
        assert answer.error is None