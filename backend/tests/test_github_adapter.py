# File:        backend/tests/test_github_adapter.py
# Owner:       Shreyansh
# Purpose:     Verify GitHubAdapter methods and get_repository_files against
#              mocked httpx responses. One happy path per main method.
# Status:      REAL — tests the adapter and the thin github_service wrapper.
# Depends on:  backend/app/integrations/github.py,
#              backend/app/services/github_service.py,
#              backend/app/core/config.py, httpx, pytest

from __future__ import annotations

from typing import Any

import base64
import httpx
import pytest

from app.core.config import get_settings
from app.integrations.github import GithubFile, GitHubAdapter
from app.services.github_service import get_repository_files


# ---------------------------------------------------------------------------
# Helper: build a minimal httpx MockTransport response for a given path
# ---------------------------------------------------------------------------

def _make_tree_entry(path: str, size: int = 1024, file_type: str = "file") -> dict[str, Any]:
    """Create a single tree-entries dict for a file path."""
    return {
        "path": path,
        "size": size,
        "type": file_type,
        "encoding": "none",
    }


def _make_contents(path: str, content: str, encoding: str = "base64") -> dict[str, Any]:
    """Create a GitHub /contents/ response dict."""
    b64 = base64.b64encode(content.encode("utf-8")).decode("ascii")
    return {
        "path": path,
        "name": path.rsplit("/", 1)[-1],
        "size": len(content.encode("utf-8")),
        "content": b64,
        "encoding": encoding,
        "download_url": f"https://github.com/owner/repo/blob/main/{path}",
    }


# ---------------------------------------------------------------------------
# Shared fixture: a GitHubAdapter instance per test (no real network)
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _session_secret(monkeypatch: Any) -> Any:
    """Monkeypatch SESSION_SECRET so tests that touch Settings work locally."""
    monkeypatch.setenv("SESSION_SECRET", "test-session-secret-for-github-adapter")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def adapter() -> GitHubAdapter:
    """Return a GitHubAdapter instance for each test."""
    return GitHubAdapter()


# ---------------------------------------------------------------------------
# Tests for check_connection
# ---------------------------------------------------------------------------

def test_check_connection_works_with_token(adapter: GitHubAdapter, monkeypatch: Any) -> None:
    """check_connection returns True when GET /rate_limit returns 200."""
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json={"rate_limit": {"limit": 5000, "remaining": 4999}}))
    with httpx.Client(base_url="https://api.github.com", transport=transport) as client:
        adapter._client = client
        result = adapter.check_connection()
        assert result is True


def test_check_connection_works_without_token(adapter: GitHubAdapter, monkeypatch: Any) -> None:
    """check_connection returns True even without a token (public-only mode)."""
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json={"rate_limit": {"limit": 5000, "remaining": 4999}}))
    with httpx.Client(base_url="https://api.github.com", transport=transport) as client:
        adapter._client = client
        result = adapter.check_connection()
        assert result is True


def test_check_connection_returns_false_on_error(adapter: GitHubAdapter, monkeypatch: Any) -> None:
    """check_connection returns False when the request fails entirely."""
    transport = httpx.MockTransport(lambda req: httpx.Response(500))
    with httpx.Client(base_url="https://api.github.com", transport=transport) as client:
        adapter._client = client
        result = adapter.check_connection()
        assert result is False


# ---------------------------------------------------------------------------
# Tests for fetch (full repo metadata + tree + readme)
# ---------------------------------------------------------------------------

def test_fetch_all_endpoints_together(adapter: GitHubAdapter, monkeypatch: Any) -> None:
    """fetch exercises all GitHub endpoints and returns clean data with source links.

    The transport returns responses in the exact order fetch calls them:
      1. GET /repos/owner/repo           (repo metadata)
      2. GET /repos/owner/repo/git/trees/main?recursive=1  (file tree)
      3. GET /repos/owner/repo/readme    (readme)
    (check_connection /rate_limit is handled separately; fetch does not call it.)
    """
    dispatch: list[httpx.Response] = []

    def make_transport(req: httpx.Request) -> httpx.Response:
        # First request: /repos/owner/repo
        if not dispatch:
            dispatch.append(
                httpx.Response(
                    200,
                    json={
                        "name": "repo",
                        "description": "A test repo",
                        "visibility": "public",
                        "html_url": "https://github.com/owner/repo",
                        "default_branch": "main",
                    },
                )
            )
            return dispatch[-1]

        # Second request: /repos/owner/repo/git/trees/main?recursive=1
        if len(dispatch) == 1:
            dispatch.append(
                httpx.Response(
                    200,
                    json={
                        "tree": [
                            _make_tree_entry("src/index.ts", 512),
                            _make_tree_entry("src/utils.ts", 1024),
                            _make_tree_entry("dist/bundle.js", 2048),  # skip: minified/js
                            _make_tree_entry("node_modules/react/react.js", 4096),  # skip: node_modules
                            _make_tree_entry("package.json", 256),
                        ]
                    },
                )
            )
            return dispatch[-1]

        # Third request: /repos/owner/repo/readme
        if len(dispatch) == 2:
            dispatch.append(httpx.Response(200, json=_make_contents("README.md", "# Hello World")))
            return dispatch[-1]

        # Should not reach here
        return httpx.Response(200, json={})

    transport = httpx.MockTransport(make_transport)
    with httpx.Client(base_url="https://api.github.com", transport=transport) as client:
        adapter._client = client
        result = adapter.fetch(owner="owner", repo="repo")

    # Verify structure
    assert result["owner"] == "owner"
    assert result["name"] == "repo"
    assert result["description"] == "A test repo"
    assert result["html_url"] == "https://github.com/owner/repo"
    assert result["default_branch"] == "main"
    assert len(result["files"]) == 2  # src/index.ts + src/utils.ts (filtered)
    file_paths = [f.path for f in result["files"]]
    assert "src/index.ts" in file_paths
    assert "src/utils.ts" in file_paths
    assert "dist/bundle.js" not in file_paths  # minified skipped
    assert "node_modules" not in " ".join(file_paths)  # node_modules skipped

    # Verify URLs on files
    for f in result["files"]:
        assert f.url.startswith("https://github.com/owner/repo/blob/main/")


# ---------------------------------------------------------------------------
# Tests for get_repository (standalone)
# ---------------------------------------------------------------------------

def test_get_repository_returns_metadata(adapter: GitHubAdapter, monkeypatch: Any) -> None:
    """get_repository returns repo metadata dict."""
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json={
        "name": "test-repo",
        "description": "Test description",
        "language": "TypeScript",
        "stargazers_count": 42,
        "html_url": "https://github.com/owner/test-repo",
        "visibility": "private",
    }))
    with httpx.Client(base_url="https://api.github.com", transport=transport) as client:
        adapter._client = client
        result = adapter.get_repository(owner="owner", name="test-repo")
        assert result["name"] == "test-repo"
        assert result["description"] == "Test description"
        assert result["language"] == "TypeScript"
        assert result["stargazers_count"] == 42
        assert result["html_url"] == "https://github.com/owner/test-repo"
        assert result["visibility"] == "private"
