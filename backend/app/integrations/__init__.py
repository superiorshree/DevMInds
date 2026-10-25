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
# Purpose:     The two public functions the backend calls for company data: company context and connector status.
# Contains:    get_company_context() (mode gate, mock switch, three connectors gathered independently), integration_status(), _connectors() and _fetch_one() helpers, ConnectorStatus literal.
# Status:      REAL — mock mode works offline; real connectors report NOT_CONNECTED until their own tasks land.
# Depends on:  backend/app/config.py, backend/app/schemas/contracts.py, backend/app/integrations/{base,jira,slack,confluence}.py, backend/app/integrations/mock_data.py (mock branch only)

"""Company context for the backend.

Only Shreyansh's endpoints call these functions. The mode comes from the
server-side session — a mode sent by the browser is never trusted here.

Rules honoured by get_company_context():

- company data is only produced in ``company`` mode; anything else raises
  PermissionError before a single byte is read;
- with USE_MOCK_INTEGRATIONS=true the sample items come back with no network
  access at all;
- with real connectors, Jira, Slack and Confluence run independently and any
  failure is collected as a frozen ConnectorError — one broken integration
  never raises and never hides the other two.
"""

import asyncio
import inspect
from typing import Literal

from app.config import settings
from app.integrations.base import BaseConnector
from app.integrations.confluence import ConfluenceConnector
from app.integrations.jira import JiraConnector
from app.integrations.slack import SlackConnector
from app.schemas.contracts import CompanyContext, ConnectorError

#: The frozen per-connector status values returned by integration_status().
ConnectorStatus = Literal["connected", "not_connected", "error"]


def _connectors() -> list[BaseConnector]:
    """Return one fresh connector instance per company source."""
    return [JiraConnector(), SlackConnector(), ConfluenceConnector()]


async def _fetch_one(
    connector: BaseConnector, repo_full_name: str, query: str
) -> CompanyContext:
    """Run one connector, turning an unexpected crash into a ConnectorError.

    The contract is an async ``fetch``, but JiraConnector is synchronous
    today (its tests call it directly), so a synchronous fetch runs on a
    worker thread instead of blocking the event loop.
    """
    try:
        if inspect.iscoroutinefunction(connector.fetch):
            return await connector.fetch(repo_full_name, query)
        return await asyncio.to_thread(connector.fetch, repo_full_name, query)
    except Exception:
        label = connector.source_type.capitalize()
        return CompanyContext(
            errors=[
                ConnectorError(
                    source_type=connector.source_type,
                    code="API_DOWN",
                    message=f"{label} connector failed unexpectedly",
                )
            ]
        )


async def get_company_context(
    repo_full_name: str, query: str, mode: str
) -> CompanyContext:
    """Return Jira, Slack and Confluence items related to a repository.

    Company mode only: any other mode raises PermissionError immediately. In
    mock mode the sample items come back without network access. Otherwise the
    three connectors run independently (asyncio.gather) and their errors are
    collected instead of raised.

    Raises PermissionError if mode != "company" — the mode always comes from
    the server-side session, never from the browser.

    With USE_MOCK_INTEGRATIONS=true this returns clearly-labelled stub items
    (demo data). With it false the real connectors run: today that is the
    JiraConnector, which answers with frozen items or a frozen ConnectorError
    (NOT_CONNECTED when JIRA_* is empty) instead of a fake success.
    Raises:
        PermissionError: when ``mode`` is not "company".
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
    if settings.use_mock_integrations:
        # Mock data is only imported inside this branch, so real runs never
        # load the mock module.
        from app.integrations.mock_data import mock_company_items

        return CompanyContext(items=mock_company_items(), errors=[])

    connectors = _connectors()
    results = await asyncio.gather(
        *(_fetch_one(connector, repo_full_name, query) for connector in connectors)
    )

    items = [item for result in results for item in result.items]
    errors = [error for result in results for error in result.errors]
    return CompanyContext(items=items, errors=errors)


async def integration_status() -> dict[str, ConnectorStatus]:
    """Return connected / not_connected / error for each company connector.

    Mock mode reports every connector as connected so the demo works offline.
    Otherwise each connector's own check_connection() decides: configured and
    ready -> connected, not configured -> not_connected, a check that raises
    -> error.
    """
    if settings.use_mock_integrations:
        return {"jira": "connected", "slack": "connected", "confluence": "connected"}

    status: dict[str, ConnectorStatus] = {}
    for connector in _connectors():
        try:
            status[connector.source_type] = (
                "connected" if connector.check_connection() else "not_connected"
            )
        except Exception:
            status[connector.source_type] = "error"
    return status
