# File:        backend/app/integrations/__init__.py
# Owner:       Kunal
# Purpose:     Stub integrations module — to be replaced with real implementation.
# Contains:    get_company_context() raising PermissionError if mode != "company",
#              and integration_status() returning sample Jira, Slack and Confluence items.
# Status:      STUB, to be replaced by Kunal.
# Depends on:  (none — this is the stub interface).

from typing import Any, Literal

from app.integrations.base import IntegrationAdapter, AdapterError


class CompanyItem:
    """A company item from Jira, Slack, or Confluence."""
    def __init__(self, source_type: Literal["jira", "slack", "confluence"],
                 title: str, content: str, url: str, metadata: dict[str, Any] | None = None):
        self.source_type = source_type
        self.title = title
        self.content = content
        self.url = url
        self.metadata = metadata or {}


class ConnectorError:
    """Error from an integration connector."""
    def __init__(self, source_type: Literal["jira", "slack", "confluence"],
                 code: Literal["NOT_CONNECTED", "TOKEN_EXPIRED", "NO_PERMISSION", "RATE_LIMITED", "API_DOWN"],
                 message: str):
        self.source_type = source_type
        self.code = code
        self.message = message


class CompanyContext:
    """Context produced by Kunal's integrations."""
    items: list[CompanyItem] = []
    errors: list[ConnectorError] = []


def get_company_context(repo_full_name: str, query: str, mode: str) -> CompanyContext:
    """Return company context for a repository.

    Raises PermissionError if mode != "company".
    """
    if mode != "company":
        raise PermissionError("get_company_context is only available in company mode")
    # Return stub data — to be replaced by real integrations
    return CompanyContext(items=[
        CompanyItem(source_type="jira", title="DEV-101", content="Migrate router to new matcher", url="https://acme.atlassian.net/browse/DEV-101", metadata={}),
        CompanyItem(source_type="slack", title="Channel update", content="Architecture summary posted", url="https://slack.com", metadata={}),
        CompanyItem(source_type="confluence", title="Design doc", content="New design approved", url="https://confluence.com", metadata={}),
    ], errors=[])


def integration_status() -> dict[str, Literal["connected", "not_connected", "error"]]:
    """Return the connection status of each integration."""
    return {
        "jira": "not_connected",
        "slack": "not_connected",
        "confluence": "not_connected",
    }