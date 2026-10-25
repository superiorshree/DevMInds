# File:        backend/app/integrations/__init__.py
# Owner:       Kunal
# Purpose:     The integrations package interface the rest of the backend calls: company context (company mode only) and connector status.
# Contains:    get_company_context() (PermissionError outside company mode; mock stubs or the real JiraConnector), integration_status() over the real connectors, re-exports of the frozen contracts.
# Status:      REAL — contracts come from app/schemas/contracts.py, company context from the real JiraConnector; Confluence/Slack dispatchers still to come.
# Depends on:  backend/app/schemas/contracts.py (CompanyItem, ConnectorError, CompanyContext),
#              backend/app/core/config.py (USE_MOCK_INTEGRATIONS), backend/app/integrations/jira.py

"""Company integrations — the entry point Shreyansh's routes call.

Two functions:

* ``get_company_context(repo_full_name, query, mode)`` — raises
  PermissionError unless ``mode == "company"``, because company-only data
  must never reach an open_source session.
* ``integration_status()`` — one status per connector.

The frozen models live in ``app.schemas.contracts``; this module never
declares its own CompanyItem/ConnectorError/CompanyContext, so every
connector speaks exactly one shape.
"""

from typing import Literal

from app.core.config import get_settings
from app.schemas.contracts import CompanyContext, CompanyItem, ConnectorError

__all__ = [
    "CompanyContext",
    "CompanyItem",
    "ConnectorError",
    "get_company_context",
    "integration_status",
]

#: The three company providers and their connector status values.
StatusValue = Literal["connected", "not_connected", "error"]


def get_company_context(repo_full_name: str, query: str, mode: str) -> CompanyContext:
    """Return company context for a repository.

    Raises PermissionError if mode != "company" — the mode always comes from
    the server-side session, never from the browser.

    With USE_MOCK_INTEGRATIONS=true this returns clearly-labelled stub items
    (demo data). With it false the real connectors run: today that is the
    JiraConnector, which answers with frozen items or a frozen ConnectorError
    (NOT_CONNECTED when JIRA_* is empty) instead of a fake success.
    """
    if mode != "company":
        raise PermissionError("get_company_context is only available in company mode")

    if get_settings().use_mock_integrations:
        # Demo data only. The MOCK prefix stops stub items being mistaken for
        # real issues or pages.
        return CompanyContext(
            items=[
                CompanyItem(
                    source_type="jira",
                    title="MOCK DEV-101",
                    content="Migrate router to new matcher",
                    url="https://acme.atlassian.net/browse/DEV-101",
                    metadata={"status": "In Progress"},
                ),
                CompanyItem(
                    source_type="confluence",
                    title="MOCK Design doc",
                    content="New design approved",
                    url="https://acme.atlassian.net/wiki/x/design",
                    metadata={"space": "ENG"},
                ),
            ],
            errors=[],
        )

    # Real path: the Jira connector. TODO(Kunal): dispatch to Confluence and
    # Slack here too, merging their items and ConnectorErrors into one context.
    from app.integrations.jira import JiraConnector

    return JiraConnector().fetch(repo_full_name, query)


def integration_status() -> dict[str, StatusValue]:
    """Return the connection status of each connector (queried live)."""
    from app.integrations.confluence import ConfluenceAdapter
    from app.integrations.jira import JiraConnector
    from app.integrations.slack import SlackAdapter

    checks = {
        "jira": JiraConnector().check_connection,
        "confluence": ConfluenceAdapter().check_connection,
        "slack": SlackAdapter().check_connection,
    }
    status: dict[str, StatusValue] = {}
    for name, check in checks.items():
        try:
            status[name] = "connected" if check() else "not_connected"
        except Exception:  # a broken adapter must not break the whole list
            status[name] = "error"
    return status