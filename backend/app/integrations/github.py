from __future__ import annotations
# File:        backend/app/integrations/github.py
# Owner:       Shreyansh
# Purpose:     Adapter for the GitHub API — repository details, file tree and key file contents, read-only.
# Contains:    GitHubAdapter class (check_connection, fetch, send, get_repository, get_tree, get_file_content), HTTP helper with rate-limit/permission mapping, module constants.
# Status:      REAL — httpx calls against api.github.com; rate limits raise RateLimitError so routes can answer 429.
# Depends on:  backend/app/integrations/base.py (IntegrationAdapter, AdapterError, RateLimitError), httpx
# Purpose:     Adapter for the GitHub REST API — repository metadata, tree, files and OAuth.
# Contains:    GitHubAdapter class (check_connection, fetch, send) and helper fetch methods.
# Status:      REAL — implemented against the GitHub API contract.
# Depends on:  backend/app/integrations/base.py, backend/app/core/config.py, httpx

"""GitHub adapter (read-only, both modes).

Used by the repository analyzer. It only ever reads:

* ``get_repository`` — repo details (description, language, stars, topics)
* ``get_tree``       — the file list of one branch
* ``get_file_content`` — the text of one file

The signed-in user's GitHub token is passed in by the server and never leaves
it: it is sent to api.github.com as a Bearer header, never logged and never
returned. Rate limits (GitHub answers 403/429) raise ``RateLimitError`` so the
route can turn it into HTTP 429 with a message the user understands.
"""

from __future__ import annotations

import base64
from typing import Any
from urllib.parse import quote

import httpx

from app.integrations.base import AdapterError, IntegrationAdapter, RateLimitError

#: GitHub's REST API root (never taken from user input).
GITHUB_API_BASE_URL = "https://api.github.com"

#: Per-request timeout in seconds (there is no GitHub timeout env var name).
REQUEST_TIMEOUT_SECONDS = 15.0




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

    def __init__(self, token: str = "", transport: httpx.BaseTransport | None = None) -> None:
        """``token`` is the signed-in user's GitHub token (server-side only).

        ``transport`` exists for tests (httpx.MockTransport); production code
        leaves it as None.
        """
        self._token = token.strip()
        self._transport = transport
        self._client: Optional[httpx.Client] = None
        self._settings = get_settings()

    @property
    def client(self) -> httpx.Client:
        if self._client is None:
            headers: dict[str, str] = {
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            }
            token = self._token or getattr(self._settings, "github_token", "")
            if token:
                headers["Authorization"] = f"Bearer {token}"
            self._client = httpx.Client(
                base_url=GITHUB_API_BASE_URL,
                headers=headers,
                timeout=REQUEST_TIMEOUT_SECONDS,
                transport=self._transport,
            )
        return self._client

    # --- Connection -----------------------------------------------------

    def check_connection(self) -> bool:
        """Return True when a token is configured or GitHub answers /rate_limit."""
        try:
            resp = self.client.get("/rate_limit")
            return resp.status_code == 200
        except Exception:
            return False

    # --- Read paths -----------------------------------------------------

    def fetch(self, **kwargs: Any) -> dict[str, Any]:
        """Fetch repo details, file tree and key file contents in one call.

        Keyword args: ``owner``, ``name`` and optional ``branch``.
        """
        owner = str(kwargs.get("owner", ""))
        name = str(kwargs.get("name", ""))
        branch = str(kwargs.get("branch", "")) or "main"
        repository = self.get_repository(owner, name)
        tree = self.get_tree(owner, name, branch)
        files: dict[str, str] = {}
        for entry in tree[:20]:
            try:
                files[entry["path"]] = self.get_file_content(
                    owner, name, entry["path"], branch
                )
            except AdapterError:
                continue  # one unreadable file must not sink the whole fetch
        return {"repository": repository, "tree": tree, "files": files}
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
        """GitHub is read-only for this project."""
        raise NotImplementedError("GitHub adapter is read-only")

    def get_repository(self, owner: str, name: str) -> dict[str, Any]:
        """Return repo metadata: description, language, stars, topics, privacy."""
        payload = self._get(f"/repos/{owner}/{name}").json()
        is_private = bool(payload.get("private")) or payload.get("visibility") == "private"
        visibility = "private" if is_private else "public"
        url = str(payload.get("html_url") or f"https://github.com/{owner}/{name}")
        return {
            "name": str(payload.get("name") or name),
            "full_name": str(payload.get("full_name") or f"{owner}/{name}"),
            "description": str(payload.get("description") or ""),
            "language": payload.get("language"),
            "stars": int(payload.get("stargazers_count") or 0),
            "stargazers_count": int(payload.get("stargazers_count") or 0),
            "topics": list(payload.get("topics") or []),
            "default_branch": str(payload.get("default_branch") or "main"),
            "last_updated": str(payload.get("pushed_at") or ""),
            "private": is_private,
            "visibility": visibility,
            "url": url,
            "html_url": url,
        }

    def get_tree(self, owner: str, name: str, branch: str = "main") -> list[dict[str, Any]]:
        """Return the branch's file list as [{"path": str, "size": int}]."""
        payload = self._get(
            f"/repos/{owner}/{name}/git/trees/{quote(branch)}", params={"recursive": "1"}
        ).json()
        entries: list[dict[str, Any]] = []
        for item in payload.get("tree", []) if isinstance(payload, dict) else []:
            if isinstance(item, dict) and item.get("type") == "blob" and item.get("path"):
                entries.append({"path": str(item["path"]), "size": int(item.get("size") or 0)})
        return entries
    def get_file_content(self, owner: str, name: str, path: str, ref: str = "main") -> str:
        """Return one file's text ("" when GitHub sends no usable content).

        Files above 50 KB are skipped: the analysis only needs readable key
        files, and huge blobs would blow up the prompt.
        """
        quoted_path = "/".join(quote(segment) for segment in path.split("/"))
        payload = self._get(
            f"/repos/{owner}/{name}/contents/{quoted_path}", params={"ref": ref}
        ).json()
        if not isinstance(payload, dict):
            return ""
        if int(payload.get("size") or 0) > 50_000:
            return ""
        if payload.get("encoding") != "base64" or not payload.get("content"):
            return str(payload.get("content") or "")
        raw = base64.b64decode(str(payload["content"])).decode("utf-8", errors="replace")
        return raw

    # --- HTTP plumbing --------------------------------------------------

    def _client(self) -> httpx.Client:
        """A client carrying the server-side token (never logged, never sent back)."""
        headers: dict[str, str] = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        return httpx.Client(
            base_url=GITHUB_API_BASE_URL,
            headers=headers,
            timeout=REQUEST_TIMEOUT_SECONDS,
            transport=self._transport,
        )

    def _get(self, path: str, params: dict[str, str] | None = None) -> httpx.Response:
        """GET one GitHub path and translate failures into adapter errors."""
        try:
            response = self.client.get(path, params=params)
        except httpx.TimeoutException as exc:
            raise AdapterError("github", "GitHub did not respond in time", code="api_down") from exc
        except httpx.RequestError as exc:
            raise AdapterError("github", "Could not reach GitHub", code="api_down") from exc
        self._raise_for_status(response)
        return response

    @staticmethod
    def _raise_for_status(response: httpx.Response) -> None:
        """Map a GitHub status onto RateLimitError / AdapterError."""
        status = response.status_code
        if status == 429:
            raise RateLimitError("github", "GitHub is rate-limiting us — try again in a minute")
        if status == 403 and _looks_like_rate_limit(response):
            raise RateLimitError("github", "GitHub is rate-limiting us — try again in a minute")
        if status == 403:
            raise AdapterError("github", "The GitHub token cannot read this repository", code="no_permission")
        if status == 404:
            raise AdapterError("github", "Repository not found", code="not_found")
        if status >= 400:
            raise AdapterError("github", f"GitHub returned HTTP {status}", code="api_down")


def _looks_like_rate_limit(response: httpx.Response) -> bool:
    """GitHub signals rate limiting with headers instead of a dedicated status."""
    if response.headers.get("x-ratelimit-remaining") == "0":
        return True
    return "retry-after" in response.headers

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


def _looks_like_rate_limit(response: httpx.Response) -> bool:
    """GitHub signals rate limiting with headers instead of a dedicated status."""
    if response.headers.get("x-ratelimit-remaining") == "0":
        return True
    return "retry-after" in response.headers


# Convenience: attach GithubFile model to the module for tests/imports
__all__ = [
    "GitHubAdapter",
    "GithubFile",
]
