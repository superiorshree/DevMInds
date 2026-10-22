# File:        backend/app/integrations/github.py
# Owner:       Shreyansh
# Purpose:     Adapter for the GitHub API — repository metadata, tree, files and OAuth.
# Contains:    GitHubAdapter class (check_connection, fetch, send) and helper fetch methods.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/integrations/base.py, backend/app/core/config.py

"""GitHub adapter.

Used by both modes. Handles repository metadata, the file tree, file contents
and OAuth. Must handle rate limits (GitHub returns 403/429) cleanly.
"""

from typing import Any

from app.integrations.base import IntegrationAdapter


class GitHubAdapter(IntegrationAdapter):
    """Adapter for the GitHub REST API."""

    provider = "github"

    def check_connection(self) -> bool:
        """Return True when GitHub is reachable and credentials are set.

        TODO(Shreyansh): call GET /user (or /rate_limit) and return True on 200.
        """
        return False

    def fetch(self, **kwargs: Any) -> dict[str, Any]:
        """Fetch repository data (metadata, tree, files).

        TODO(Shreyansh): implement repo metadata + tree + file fetch, returning
        clean data with source links. Raise RateLimitError on 403/429.
        """
        raise NotImplementedError("TODO(Shreyansh): GitHub fetch")

    def send(self, payload: dict[str, Any]) -> dict[str, Any]:
        """GitHub is read-only for this project.

        TODO(Shreyansh): we never write to GitHub. Keep this raising.
        """
        raise NotImplementedError("GitHub adapter is read-only")

    # --- Helper methods Shreyansh will implement ---

    def get_repository(self, owner: str, name: str) -> dict[str, Any]:
        """Return repo metadata (description, language, stars, topics).

        TODO(Shreyansh): GET /repos/{owner}/{repo}
        """
        raise NotImplementedError("TODO(Shreyansh): get_repository")

    def get_tree(self, owner: str, name: str, branch: str = "main") -> list[dict[str, Any]]:
        """Return the repository file tree for analysis.

        TODO(Shreyansh): GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
        """
        raise NotImplementedError("TODO(Shreyansh): get_tree")

    def get_file_content(self, owner: str, name: str, path: str, ref: str = "main") -> str:
        """Return the contents of one file.

        TODO(Shreyansh): GET /repos/{owner}/{repo}/contents/{path}?ref={ref}
        """
        raise NotImplementedError("TODO(Shreyansh): get_file_content")
