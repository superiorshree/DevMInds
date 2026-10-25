import asyncio

from app import integrations
from app.schemas.contracts import CompanyContext, CompanyItem


def test_healthy_connector_items_survive_jira_failure(monkeypatch):
    monkeypatch.setattr(
        integrations.settings,
        "use_mock_integrations",
        False,
    )

    class FailedJira:
        source_type = "jira"

        async def fetch(self, repo_full_name, query):
            raise RuntimeError("Simulated Jira failure")

    class HealthyConnector:
        def __init__(self, source_type):
            self.source_type = source_type

        async def fetch(self, repo_full_name, query):
            return CompanyContext(
                items=[
                    CompanyItem(
                        source_type=self.source_type,
                        title=f"{self.source_type} architecture",
                        content="Architecture documentation",
                        url=f"https://example.com/{self.source_type}",
                    )
                ]
            )

    monkeypatch.setattr(
        integrations,
        "_connectors",
        lambda: [
            FailedJira(),
            HealthyConnector("slack"),
            HealthyConnector("confluence"),
        ],
    )

    result = asyncio.run(
        integrations.get_company_context(
            "superiorshree/LunaAstra-WSM",
            "architecture",
            "company",
        )
    )

    assert len(result.items) == 2
    assert {item.source_type for item in result.items} == {
        "slack",
        "confluence",
    }

    assert len(result.errors) == 1
    assert result.errors[0].source_type == "jira"
    assert result.errors[0].code == "API_DOWN"
