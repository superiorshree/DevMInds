# File:        backend/app/integrations/confluence.py
# Owner:       Kunal
# Purpose:     Confluence connector — company-mode pages related to a repository.
# Contains:    ConfluenceConnector (source_type, check_connection, fetch stub returning NOT_CONNECTED, send and get_pages_for_repo placeholders).
# Status:      STUB — fetch reports NOT_CONNECTED; later tasks fill in the real calls.
# Depends on:  backend/app/integrations/base.py, backend/app/schemas/contracts.py, backend/app/config.py

"""Confluence connector (company mode only).

Until the real Confluence task lands, ``fetch`` reports NOT_CONNECTED instead
of raising, so ``get_company_context()`` collects it like any other connector
error. Credentials come from CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL and
CONFLUENCE_API_TOKEN. Never writes to Confluence — ``send`` raises.
"""

from typing import Any

from app.integrations.base import BaseConnector
from app.schemas.contracts import CompanyContext, ConnectorError


class ConfluenceConnector(BaseConnector):
    """Confluence connector. Stub: reports NOT_CONNECTED until the real API task."""

    source_type = "confluence"

    async def fetch(self, repo_full_name: str, query: str) -> CompanyContext:
        """Return Confluence pages related to a repository.

        TODO(Kunal): the later Confluence task fills this in (search pages
        linked to the repo, return CompanyItems with source links). Until
        then it reports NOT_CONNECTED, never raises.
        """
        return CompanyContext(
            errors=[
                ConnectorError(
                    source_type="confluence",
                    code="NOT_CONNECTED",
                    message="Confluence is not connected (CONFLUENCE_BASE_URL, "
                    "CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN)",
                )
            ]
        )

    def check_connection(self) -> bool:
        """Return True when Confluence is reachable and credentials are set.

        TODO(Kunal): call the Confluence "myself" endpoint and return True on 200.
        """
        return False

    def send(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Confluence is read-only for this project.

        TODO(Kunal): we never write to Confluence. Keep this raising.
        """
        raise NotImplementedError("Confluence connector is read-only")

    # --- Helper methods Kunal will implement ---

    def get_pages_for_repo(self, owner: str, name: str) -> list[dict[str, Any]]:
        """Return Confluence pages linked to this repository.

        TODO(Kunal): CQL search for pages linked to the repo; return
        [{id, title, url, space}].
        """
        raise NotImplementedError("TODO(Kunal): get_pages_for_repo")
