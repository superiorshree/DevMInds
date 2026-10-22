# File:        backend/app/integrations/jira.py
# Owner:       Purva
# Purpose:     Read-only adapter for Jira — fetch issues linked to a repository.
# Contains:    JiraAdapter class (check_connection, fetch, send) and helper fetch methods.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/integrations/base.py, backend/app/core/config.py

"""Jira adapter (read-only, company mode only).

Fetches issues linked to a repository. Never writes to Jira — `send` raises.
"""

from typing import Any

from app.integrations.base import IntegrationAdapter


class JiraAdapter(IntegrationAdapter):
    """Read-only adapter for the Jira REST API."""

    provider = "jira"

    def check_connection(self) -> bool:
        """Return True when Jira is reachable and credentials are set.

        TODO(Purva): call the Jira "myself" endpoint and return True on 200.
        """
        return False

    def fetch(self, **kwargs: Any) -> dict[str, Any]:
        """Fetch Jira issues linked to a repository.

        TODO(Purva): search issues by repo link/label, returning clean data
        with source links. Raise RateLimitError on 429.
        """
        raise NotImplementedError("TODO(Purva): Jira fetch")

    def send(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Jira is read-only for this project.

        TODO(Purva): we never write to Jira. Keep this raising.
        """
        raise NotImplementedError("Jira adapter is read-only")

    # --- Helper methods Purva will implement ---

    def get_issues_for_repo(self, owner: str, name: str) -> list[dict[str, Any]]:
        """Return Jira issues linked to this repository.

        TODO(Purva): JQL search for issues linked to the repo; return
        [{key, summary, url, status}].
        """
        raise NotImplementedError("TODO(Purva): get_issues_for_repo")
