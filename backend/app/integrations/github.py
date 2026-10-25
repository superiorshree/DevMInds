# File:        backend/app/integrations/github.py
# Owner:       Shreyansh
# Purpose:     Adapter for the GitHub API — repository details, file tree and key file contents, read-only.
# Contains:    GitHubAdapter class (check_connection, fetch, send, get_repository, get_tree, get_file_content), HTTP helper with rate-limit/permission mapping, module constants.
# Status:      REAL — httpx calls against api.github.com; rate limits raise RateLimitError so routes can answer 429.
# Depends on:  backend/app/integrations/base.py (IntegrationAdapter, AdapterError, RateLimitError), httpx

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

import base64
from typing import Any
from urllib.parse import quote

import httpx

from app.integrations.base import AdapterError, IntegrationAdapter, RateLimitError

#: GitHub's REST API root (never taken from user input).
GITHUB_API_BASE_URL = "https://api.github.com"

#: Per-request timeout in seconds (there is no GitHub timeout env var name).
REQUEST_TIMEOUT_SECONDS = 15.0


class GitHubAdapter(IntegrationAdapter):
    """Read-only adapter for the GitHub REST API."""

    provider = "github"

    def __init__(self, token: str = "", transport: httpx.BaseTransport | None = None) -> None:
        """``token`` is the signed-in user's GitHub token (server-side only).

        ``transport`` exists for tests (httpx.MockTransport); production code
        leaves it as None.
        """
        self._token = token.strip()
        self._transport = transport

    # --- Connection -----------------------------------------------------

    def check_connection(self) -> bool:
        """Return True when a token is configured and GitHub answers /rate_limit.

        Without a token there is nothing to check (and no call is made), so
        an unconfigured adapter never touches the network.
        """
        if not self._token:
            return False
        try:
            self._get("/rate_limit")
        except AdapterError:
            return False
        return True

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

    def send(self, payload: dict[str, Any]) -> dict[str, Any]:
        """GitHub is read-only for this project."""
        raise NotImplementedError("GitHub adapter is read-only")

    def get_repository(self, owner: str, name: str) -> dict[str, Any]:
        """Return repo metadata: description, language, stars, topics, privacy."""
        payload = self._get(f"/repos/{owner}/{name}").json()
        return {
            "full_name": str(payload.get("full_name") or f"{owner}/{name}"),
            "description": str(payload.get("description") or ""),
            "language": payload.get("language"),
            "stars": int(payload.get("stargazers_count") or 0),
            "topics": list(payload.get("topics") or []),
            "default_branch": str(payload.get("default_branch") or "main"),
            "last_updated": str(payload.get("pushed_at") or ""),
            "private": bool(payload.get("private")),
            "html_url": str(payload.get("html_url") or f"https://github.com/{owner}/{name}"),
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
            with self._client() as client:
                response = client.get(path, params=params)
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
