# File:        backend/app/integrations/confluence.py
# Owner:       Kunal
# Purpose:     Read-only adapter for Confluence — fetch pages linked to a repository.
# Contains:    ConfluenceAdapter class (check_connection, fetch, send) and helper fetch methods.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/integrations/base.py, backend/app/core/config.py

"""Confluence adapter (read-only, company mode only).

Fetches pages linked to a repository. Never writes to Confluence — `send` raises.
"""

from typing import Any

from app.integrations.base import IntegrationAdapter


class ConfluenceAdapter(IntegrationAdapter):
    """Read-only adapter for the Confluence REST API."""

    provider = "confluence"

    def check_connection(self) -> bool:
        """Return True when Confluence is reachable and credentials are set.

        TODO(Kunal): call the Confluence "myself" endpoint and return True on 200.
        """
        return False

    def fetch(self, **kwargs: Any) -> dict[str, Any]:
        """Fetch Confluence pages linked to a repository.

        TODO(Kunal): search pages by repo link/label, returning clean data with
        source links. Raise RateLimitError on 429.
        """
        raise NotImplementedError("TODO(Kunal): Confluence fetch")

    def send(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Confluence is read-only for this project.

        TODO(Kunal): we never write to Confluence. Keep this raising.
        """
        raise NotImplementedError("Confluence adapter is read-only")

    # --- Helper methods Kunal will implement ---

    def get_pages_for_repo(self, owner: str, name: str) -> list[dict[str, Any]]:
        """Return Confluence pages linked to this repository.

        TODO(Kunal): CQL search for pages linked to the repo; return
        [{id, title, url, space}].
        """
        raise NotImplementedError("TODO(Kunal): get_pages_for_repo")
