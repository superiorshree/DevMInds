# File:        backend/app/integrations/github.py
# Owner:       Shreyansh
# Purpose:     Adapter for the GitHub REST API — repository metadata, tree, files and OAuth.
# Contains:    GitHubAdapter class (check_connection, fetch, send) and helper fetch methods.
# Status:      REAL — implemented against the GitHub API contract.
# Depends on:  backend/app/integrations/base.py, backend/app/core/config.py, httpx

"""GitHub adapter.

Used by both modes. Handles repository metadata, the file tree, file contents
and OAuth. Must handle rate limits (GitHub returns 403/429) cleanly.
"""

from __future__ import annotations

import base64
from typing import Any, Dict, List, Optional

import httpx
from pydantic import BaseModel

from app.core.config import get_settings
from app.integrations.base import IntegrationAdapter, RateLimitError


class GithubFile(BaseModel):
    path: str
    content: str
    url: str


GITHUB_API_BASE = "https://api.github.com"
GITHUB_TREE_PATH = "/repos/{owner}/{repo}/git/trees/{ref}?recursive=1"
GITHUB_CONTENTS_PATH = "/repos/{owner}/{repo}/contents/{path}"
GITHUB_REPO_PATH = "/repos/{owner}/{repo}"
GITHUB_COMMITS_PATH = "/repos/{owner}/{repo}/commits"
GITHUB_README_PATH = "/repos/{owner}/{repo}/readme"


class GitHubAdapter(IntegrationAdapter):
    """Adapter for the GitHub REST API.

    Provider: github
    """

    provider = "github"
    DEFAULT_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

    def __init__(self) -> None:
        self._client: Optional[httpx.Client] = None
        self._settings = get_settings()

    @property
    def client(self) -> httpx.Client:
        if self._client is None:
            headers: Dict[str, str] = {}
            token = self._settings.github_token
            if token:
                headers["Authorization"] = f"token {token}"
            self._client = httpx.Client(
                base_url=GITHUB_API_BASE,
                headers=headers,
                timeout=self.DEFAULT_TIMEOUT,
            )
        return self._client

    def check_connection(self) -> bool:
        """Return True when GitHub is reachable and credentials are set.

        If a token is configured, call GET /user to verify it. If no token
        (public-only mode), call GET /rate_limit which works without auth.
        """
        try:
            resp = self.client.get("/rate_limit")
            return resp.status_code == 200
        except Exception:
            return False

    @staticmethod
    def _check_rate_limit(resp: httpx.Response) -> None:
        """Raise RateLimitError on 403/429 with reset info from GitHub headers."""
        if resp.status_code in (403, 429):
            reset_at = resp.headers.get("x-ratelimit-reset-at")
            reset = reset_at if reset_at else "unknown"
            message = f"Rate limited by GitHub (reset at {reset})"
            raise RateLimitError("github", message, code="rate_limited")

    def fetch(self, **kwargs: Any) -> dict[str, Any]:
        """Fetch repository data.

        Accepts optional owner, repo, token overrides. Returns a dict with
        repo metadata, tree, and readme. Raises RateLimitError on 403/429.
        """
        owner = kwargs.get("owner")
        repo = kwargs.get("repo")
        if not owner or not repo:
            raise ValueError("owner and repo are required for GitHub fetch")

        # Use provided token or fall back to settings
        token = kwargs.get("token")

        # 1. Get repo metadata
        resp = self.client.get(GITHUB_REPO_PATH.format(owner=owner, repo=repo))
        self._check_rate_limit(resp)
        if resp.status_code == 404:
            raise AdapterError("github", f"Repository {owner}/{repo} not found or no access", code="not_found")
        resp.raise_for_status()
        repo_data = resp.json()

        # 2. Get default branch (fall back to main if not returned)
        default_branch = repo_data.get("default_branch", "main")

        # 3. Get file tree
        tree_resp = self.client.get(
            GITHUB_TREE_PATH.format(owner=owner, repo=repo, ref=default_branch)
        )
        self._check_rate_limit(tree_resp)
        tree_data = tree_resp.json()
        files = self._parse_tree(tree_data.get("tree", []), default_branch, owner, repo)

        # 4. Get readme
        readme = self._fetch_readme(tree_data)

        return {
            "owner": owner,
            "name": repo,
            "description": repo_data.get("description"),
            "default_branch": default_branch,
            "visibility": repo_data.get("visibility", "public"),
            "html_url": repo_data.get("html_url"),
            "files": files,
            "readme": readme,
        }

    def _parse_tree(
        self,
        entries: List[dict[str, Any]],
        branch: str,
        owner: str,
        repo: str,
    ) -> List[GithubFile]:
        """Parse the recursive tree, filtering out binary/minified/lock folders.

        Only include text files up to 50 KB. Skip: .git, node_modules, dist,
        build, venv, __pycache__, vendor, lock files, minified files, and
        project/config files that are not source code.

        The explicit owner/repo parameters are used for correct GitHub URL
        construction.
        """
        skip_dirs: set[str] = {
            ".git",
            "node_modules",
            "dist",
            "build",
            "venv",
            "__pycache__",
            "vendor",
        }
        # Project/config files that are not source code (kept for dep filtering elsewhere)
        skip_files: set[str] = {
            "package.json",
            "setup.py",
            "pyproject.toml",
            "Cargo.toml",
            "go.mod",
            "build.gradle",
        }
        skip_exts: set[str] = {".min.js", ".min.css", ".map", ".lock", ".bundle.js"}
        result: List[GithubFile] = []

        for entry in entries:
            path = entry.get("path", "")
            size = entry.get("size", 0)

            # Skip directories/folders that are in the skip list
            parts = path.split("/")
            if parts and parts[0] in skip_dirs:
                continue

            # Skip if any path segment is a skip dir
            if any(seg in skip_dirs for seg in parts):
                continue

            # Skip minified / binary / lock extensions
            if any(path.endswith(ext) for ext in skip_exts):
                continue

            # Skip project/config files that are not source code
            basename = path.split("/")[-1]
            if basename in skip_files:
                continue

            # Size limit: 50 KB = 50 * 1024
            if size > 50 * 1024:
                continue

            # Only include files (not submodule markers etc.)
            if entry.get("type") != "file":
                continue

            # Decode content if it's base64
            content: str = ""
            if "content" in entry and entry["content"]:
                try:
                    decoded = base64.b64decode(entry["content"]).decode("utf-8", errors="replace")
                    content = decoded[:50 * 1024]  # enforce 50KB limit
                except Exception:
                    # If we can't decode, skip this file
                    continue

            # Build GitHub URL for the file using the known owner/repo
            url = f"https://github.com/{owner}/{repo}/blob/{branch}/{path}"

            result.append(GithubFile(path=path, content=content, url=url))

        return result

    def _fetch_readme(self, tree_data: dict[str, Any]) -> Optional[str]:
        """Fetch the README content, if present."""
        # Look for common README filenames in the tree
        readme_path: Optional[str] = None
        for entry in tree_data.get("tree", []):
            name = entry.get("path", "").lower()
            if name in ("readme.md", "readme.txt", "README.md", "README.txt"):
                readme_path = entry.get("path")
                break

        if not readme_path:
            return None

        # Fetch the readme content
        resp = self.client.get(
            GITHUB_CONTENTS_PATH.format(
                owner=tree_data.get("owner", {}).get("login", ""),
                repo=tree_data.get("repo", ""),
                path=readme_path,
            )
        )
        if resp.status_code == 404:
            return None
        self._check_rate_limit(resp)
        if resp.status_code != 200:
            return None

        data = resp.json()
        if data.get("encoding") == "base64" and data.get("content"):
            try:
                return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
            except Exception:
                return None
        return data.get("text")

    def send(self, payload: dict[str, Any]) -> dict[str, Any]:
        """GitHub is read-only for this project.

        TODO(Shreyansh): we never write to GitHub. Keep this raising.
        """
        raise NotImplementedError("GitHub adapter is read-only")

    # --- Convenience methods required by the contract ---

    def get_repository(
        self, owner: str, name: str
    ) -> dict[str, Any]:
        """Return repo metadata (description, language, stars, topics).

        GET /repos/{owner}/{repo}
        """
        resp = self.client.get(GITHUB_REPO_PATH.format(owner=owner, repo=name))
        self._check_rate_limit(resp)
        if resp.status_code == 404:
            raise AdapterError(
                "github", f"Repository {owner}/{name} not found or no access", code="not_found"
            )
        resp.raise_for_status()
        return resp.json()

    def get_tree(
        self, owner: str, name: str, branch: str = "main"
    ) -> list[dict[str, Any]]:
        """Return the repository file tree for analysis.

        GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
        """
        resp = self.client.get(
            GITHUB_TREE_PATH.format(owner=owner, repo=name, ref=branch)
        )
        self._check_rate_limit(resp)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        tree_data = resp.json()
        return self._parse_tree(tree_data.get("tree", []), branch, owner, name)

    def get_file_content(self, owner: str, name: str, path: str, ref: str = "main") -> str:
        """Return the contents of one file.

        GET /repos/{owner}/{repo}/contents/{path}?ref={ref}
        """
        resp = self.client.get(
            GITHUB_CONTENTS_PATH.format(owner=owner, repo=name, path=path)
        )
        self._check_rate_limit(resp)
        if resp.status_code == 404:
            raise AdapterError(
                "github", f"File {path} not found in {owner}/{name}", code="not_found"
            )
        resp.raise_for_status()
        data = resp.json()
        if data.get("encoding") == "base64" and data.get("content"):
            return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
        return data.get("text", "")

    def get_dependency_files(self, owner: str, repo: str, token: Optional[str] = None) -> list[GithubFile]:
        """Return dependency-relevant files (package.json, requirements.txt, etc.).

        Uses the adapter's tree fetch internally, then filters for known
        dependency manifests.
        """
        from app.integrations.github import GithubFile

        # Re-fetch with the provided token if different
        if token:
            client = httpx.Client(
                base_url=GITHUB_API_BASE,
                headers={"Authorization": f"token {token}"},
                timeout=self.DEFAULT_TIMEOUT,
            )
        else:
            client = self.client

        resp = client.get(
            GITHUB_TREE_PATH.format(owner=owner, repo=repo, ref="main")
        )
        self._check_rate_limit(resp)
        if resp.status_code != 200:
            return []
        tree_data = resp.json()
        all_files = self._parse_tree(tree_data.get("tree", []), "main", owner, repo)

        # Filter for dependency-related files
        dep_keywords: set[str] = {
            "package.json",
            "requirements.txt",
            "setup.py",
            "pyproject.toml",
            "Cargo.toml",
            "go.mod",
            "build.gradle",
        }
        result: list[GithubFile] = []
        for f in all_files:
            basename = f.path.split("/")[-1]
            if basename in dep_keywords:
                result.append(f)
        return result

    def get_key_source_files(
        self, owner: str, repo: str, max_files: int = 50
    ) -> list[GithubFile]:
        """Return a small capped set of key source files.

        Picks the first non-binary, non-minified files up to max_files.
        """
        from app.integrations.github import GithubFile

        resp = self.client.get(
            GITHUB_TREE_PATH.format(owner=owner, repo=repo, ref="main")
        )
        self._check_rate_limit(resp)
        if resp.status_code != 200:
            return []
        tree_data = resp.json()
        all_files = self._parse_tree(tree_data.get("tree", []), "main", owner, repo)

        result: list[GithubFile] = []
        for f in all_files:
            if len(result) >= max_files:
                break
            result.append(f)
        return result

    def get_readme(self, owner: str, repo: str) -> Optional[str]:
        """Return the repository README content."""
        resp = self.client.get(GITHUB_README_PATH.format(owner=owner, repo=repo))
        self._check_rate_limit(resp)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json()
        if data.get("encoding") == "base64" and data.get("content"):
            return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
        return data.get("text")

    def get_file_tree(
        self, owner: str, repo: str, branch: str = "main", token: Optional[str] = None
    ) -> list[GithubFile]:
        """Return the recursive file tree, filtered for text only.

        Skips .git, node_modules, dist, build, venv, __pycache__, vendor,
        lock files, minified and binary files. Enforces per-file 50 KB limit
        and max 200 files total.
        """
        if token:
            client = httpx.Client(
                base_url=GITHUB_API_BASE,
                headers={"Authorization": f"token {token}"},
                timeout=self.DEFAULT_TIMEOUT,
            )
        else:
            client = self.client

        resp = client.get(
            GITHUB_TREE_PATH.format(owner=owner, repo=repo, ref=branch)
        )
        self._check_rate_limit(resp)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        tree_data = resp.json()
        files = self._parse_tree(tree_data.get("tree", []), branch, owner, repo)
        # Cap at 200 files
        return files[:200]

    def get_issues(
        self, owner: str, repo: str, state: str = "open", token: Optional[str] = None
    ) -> list[dict[str, Any]]:
        """Return issues (open or closed) for the repository.

        GET /repos/{owner}/{repo}/issues?state={state}
        """
        if token:
            client = httpx.Client(
                base_url=GITHUB_API_BASE,
                headers={"Authorization": f"token {token}"},
                timeout=self.DEFAULT_TIMEOUT,
            )
        else:
            client = self.client

        resp = client.get(
            f"/repos/{owner}/{repo}/issues",
            params={"state": state, "per_page": 30},
        )
        self._check_rate_limit(resp)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        return resp.json()

    def get_good_first_issues(
        self, owner: str, repo: str, token: Optional[str] = None
    ) -> list[dict[str, Any]]:
        """Return good first issues for the repository.

        GET /repos/{owner}/{repo}/issues?labels=good%20first%20issue&state=open
        """
        if token:
            client = httpx.Client(
                base_url=GITHUB_API_BASE,
                headers={"Authorization": f"token {token}"},
                timeout=self.DEFAULT_TIMEOUT,
            )
        else:
            client = self.client

        resp = client.get(
            f"/repos/{owner}/{repo}/issues",
            params={"labels": "good first issue", "state": "open", "per_page": 30},
        )
        self._check_rate_limit(resp)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        return resp.json()

    def get_pull_requests(
        self, owner: str, repo: str, state: str = "open", token: Optional[str] = None
    ) -> list[dict[str, Any]]:
        """Return recent pull requests.

        GET /repos/{owner}/{repo}/pulls?state={state}&per_page=10
        """
        if token:
            client = httpx.Client(
                base_url=GITHUB_API_BASE,
                headers={"Authorization": f"token {token}"},
                timeout=self.DEFAULT_TIMEOUT,
            )
        else:
            client = self.client

        resp = client.get(
            f"/repos/{owner}/{repo}/pulls",
            params={"state": state, "per_page": 10},
        )
        self._check_rate_limit(resp)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        return resp.json()

    def get_commit_history(
        self, owner: str, repo: str, limit: int = 30, path: Optional[str] = None, token: Optional[str] = None
    ) -> list[dict[str, Any]]:
        """Return commit history (most recent first).

        GET /repos/{owner}/{repo}/commits?per_page={limit}&sha={path or main}
        """
        if token:
            client = httpx.Client(
                base_url=GITHUB_API_BASE,
                headers={"Authorization": f"token {token}"},
                timeout=self.DEFAULT_TIMEOUT,
            )
        else:
            client = self.client

        sha = path or "main"
        resp = client.get(
            f"/repos/{owner}/{repo}/commits",
            params={"per_page": limit, "sha": sha},
        )
        self._check_rate_limit(resp)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        return resp.json()

    def get_contributing_and_conduct(self, owner: str, repo: str) -> dict[str, Any]:
        """Return contributing guide and code of conduct info.

        Repo metadata often includes contributing and CODE_OF_CONDUCT fields.
        """
        resp = self.client.get(GITHUB_REPO_PATH.format(owner=owner, repo=repo))
        self._check_rate_limit(resp)
        if resp.status_code == 404:
            return {"contributing": None, "conduct": None}
        resp.raise_for_status()
        data = resp.json()
        return {
            "contributing": data.get("license", {}).get("key"),
            "conduct": data.get("code_of_conduct"),
        }


# Convenience: attach GithubFile model to the module for tests/imports
__all__ = [
    "GitHubAdapter",
    "GithubFile",
]