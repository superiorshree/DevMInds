# File:        backend/app/integrations/__init__.py
# Owner:       Kunal
# Purpose:     The two public functions the backend calls for company data: company context and connector status.
# Contains:    get_company_context() (mode gate, mock switch, three connectors gathered independently), integration_status(), _connectors() and _fetch_one() helpers.
# Status:      REAL — mock mode works offline; real connectors report NOT_CONNECTED until their own tasks land.
# Depends on:  backend/app/integrations/{base,jira,slack,confluence}.py, backend/app/integrations/mock_data.py (mock branch only), backend/app/schemas/contracts.py, backend/app/config.py

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

from app.schemas.contracts import CompanyContext, ConnectorError

try:
    from app.config import settings
except ImportError:
    # TODO(Kunal): app/config.py re-exports `settings`, but on main
    # app/core/config.py only defines get_settings(). Use the accessor until
    # that re-export lands, then this branch disappears.
    from app.core.config import get_settings

    settings = get_settings()

from app.integrations.base import BaseConnector
from app.integrations.confluence import ConfluenceConnector
from app.integrations.jira import JiraConnector
from app.integrations.slack import SlackConnector

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

    Raises:
        PermissionError: when ``mode`` is not "company".
    """
    if mode != "company":
        raise PermissionError("get_company_context is only available in company mode")

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
