import asyncio
import logging

from app.integrations import get_company_context
from app.schemas.contracts import CompanyContext, ConnectorError


class FakeConnector:
    def __init__(self, source_type, result=None, exception=None):
        self.source_type = source_type
        self.result = result
        self.exception = exception

    async def fetch(self, repo_full_name, query):
        if self.exception:
            raise self.exception
        return self.result


def run_context():
    return asyncio.run(
        get_company_context("superiorshree/LunaAstra-WSM", "architecture", "company")
    )


def test_jira_failure_preserves_other_connector_results(monkeypatch):
    from app import integrations

    monkeypatch.setattr(integrations.settings, "use_mock_integrations", False)

    jira = FakeConnector(
        "jira",
        exception=RuntimeError("Simulated Jira failure"),
    )

    slack = FakeConnector(
        "slack",
        result=CompanyContext(
            errors=[
                ConnectorError(
                    source_type="slack",
                    code="RATE_LIMITED",
                    message="Slack rate limit reached",
                )
            ]
        ),
    )

    confluence = FakeConnector(
        "confluence",
        result=CompanyContext(),
    )

    monkeypatch.setattr(
        integrations,
        "_connectors",
        lambda: [jira, slack, confluence],
    )

    result = run_context()

    assert isinstance(result, CompanyContext)
    assert result.items == []

    errors = {error.source_type: error.code for error in result.errors}

    assert errors["jira"] == "API_DOWN"
    assert errors["slack"] == "RATE_LIMITED"
    assert "confluence" not in errors


def test_private_text_not_leaked_when_connector_crashes(monkeypatch, caplog):
    from app import integrations

    secret = "PRIVATE_MESSAGE_DO_NOT_LOG_987"

    monkeypatch.setattr(integrations.settings, "use_mock_integrations", False)

    jira = FakeConnector(
        "jira",
        exception=RuntimeError(secret),
    )

    slack = FakeConnector(
        "slack",
        result=CompanyContext(),
    )

    confluence = FakeConnector(
        "confluence",
        result=CompanyContext(),
    )

    monkeypatch.setattr(
        integrations,
        "_connectors",
        lambda: [jira, slack, confluence],
    )

    with caplog.at_level(logging.DEBUG):
        result = run_context()

    assert result.errors[0].code == "API_DOWN"
    assert secret not in str(result)
    assert secret not in caplog.text
