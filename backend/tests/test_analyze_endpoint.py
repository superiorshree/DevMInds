"""Tests for the analyze endpoint - POST /api/repositories/analyze and related routes."""
from __future__ import annotations

import pytest
import jwt
from fastapi.testclient import TestClient

from app.api.repositories import router, _analysis_cache
from app.core.modes import UserMode
from app.schemas.common import AnalyzeRequest
from app.core.security import CurrentUser
from app.integrations.github import GitHubAdapter


# ---------------------------------------------------------------------------
# Helper to clear the module-level cache between tests
# ---------------------------------------------------------------------------
def _clear_cache() -> None:
    _analysis_cache.clear()


# ---------------------------------------------------------------------------
# Mock adapter
# ---------------------------------------------------------------------------

class MockGithubAdapter:
    """A minimal mock GitHub adapter for testing."""

    def __init__(self, repo_info=None, tree=None, files=None):
        self.repo_info = repo_info or {
            "id": 123,
            "name": "testrepo",
            "full_name": "owner/testrepo",
            "private": False,
            "visibility": "public",
            "description": "A test repository",
            "html_url": "https://github.com/owner/testrepo",
            "default_branch": "main",
            "stars": 10,
            "fork": False,
            "topics": ["test"],
        }
        self.tree = tree or [
            {"path": "README.md", "type": "file", "size": 200},
            {"path": "src/main.py", "type": "file", "size": 500},
            {"path": "src/utils.py", "type": "file", "size": 300},
        ]
        self.files = files or {
            "README.md": "# testrepo\n\nA test repository.",
            "src/main.py": "def main():\n    pass",
            "src/utils.py": "def helper():\n    pass",
        }

    def get_repository(self, owner, name):
        return self.repo_info

    def get_tree(self, owner, name, branch="main"):
        return self.tree

    def get_file_content(self, owner, name, path, ref="main"):
        return self.files.get(path, "")


# ---------------------------------------------------------------------------
# Mock build_repository_analysis (the real one reads from GitHub adapter)
# ---------------------------------------------------------------------------

def _mock_build_repository_analysis(owner, repo, branch="main", github_token=""):
    """Simulate the real analyzer returning an ArchitectureBundle."""
    from app.schemas.architecture import (
        ArchitectureBundle,
        Repository,
        Overview,
        Technology,
        EntryPoint,
        Component,
        Connection,
        ContributorGuide,
    )

    return ArchitectureBundle(
        repository=Repository(
            owner=owner,
            name=repo,
            branch=branch,
        ),
        overview=Overview(
            summary=f"{owner}/{repo} - a test repository",
            primary_language="Python",
            stars=10,
            last_updated="2026-01-01T00:00:00Z",
            topics=["test"],
        ),
        technologies=[Technology(name="Python", category="language", evidence="requirements.txt")],
        entry_points=[EntryPoint(file="src/main.py", reason="Main entry point")],
        components=[Component(id="src", name="src", description="Source code folder", files=["src/main.py"])],
        connections=[],
        contributor_guide=ContributorGuide(),
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clear_cache():
    """Clear the in-memory cache after each test."""
    _clear_cache()
    yield


# ---------------------------------------------------------------------------
# Create a TestClient with the router
# ---------------------------------------------------------------------------

from app.main import app
client = TestClient(app)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestAnalyzeEndpoint:
    """Tests for POST /api/repositories/analyze."""

    def test_public_repo_success(self, monkeypatch):
        """A public repo can be analyzed successfully."""
        # Mock the GitHub adapter
        mock_adapter = MockGithubAdapter()
        # Patch the GitHubAdapter class in the module where it's used
        import app.api.repositories as repos_module
        # GitHubAdapter is imported inside the analyze function, so we patch it there
        original_get_adapter = None

        # We'll patch inside the function context below

        # Mock the analyzer to return a real-looking bundle
        import app.services.repository_analyzer as analyzer_module
        original_build = analyzer_module.build_repository_analysis

        def mock_build(owner, repo, branch="main", github_token=""):
            return _mock_build_repository_analysis(owner, repo, branch, github_token)

        analyzer_module.build_repository_analysis = mock_build

        # Create a mock user
        user = CurrentUser(
            id="user1",
            github_login="testuser",
            avatar_url="https://example.com/avatar.png",
            mode=UserMode.open_source,
        )

        # Create a session token for the test user
        settings = __import__('app.core.config', fromlist=['get_settings']).get_settings()
        token = jwt.encode(
            {"sub": user.id, "iat": __import__('datetime').datetime.now(__import__('datetime').timezone.utc), "exp": __import__('datetime').datetime.now(__import__('datetime').timezone.utc) + __import__('datetime').timedelta(days=7)},
            settings.session_secret,
            algorithm="HS256",
        )

        from app.core.security import _USERS, StoredUser
        _USERS[user.id] = StoredUser(
            id=user.id,
            github_login=user.github_login,
            avatar_url=user.avatar_url,
            mode=user.mode,
        )
        monkeypatch.setattr("app.integrations.github.GitHubAdapter", lambda *args, **kwargs: mock_adapter)

        # Call the analyze endpoint
        body = AnalyzeRequest(owner="owner", name="testrepo")
        response = client.post(
            "/api/repositories/analyze",
            json={"owner": "owner", "name": "testrepo"},
            headers={"Authorization": f"Bearer {token}"},
        )

        # Reset the module state
        analyzer_module.build_repository_analysis = original_build

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["owner"] == "owner"
        assert data["name"] == "testrepo"
        assert data["status"] == "completed"
        assert data["job_id"].startswith("analyze_user1_owner_testrepo_")

        # Cache should have been populated
        cache_key = ("user1", "open_source", "owner", "testrepo", "")
        assert cache_key in _analysis_cache

    def test_private_repo_403_open_source(self, monkeypatch):
        """A private repo in open_source mode returns 403 with PRIVATE_REPO_REQUIRES_COMPANY_MODE."""
        # Mock the GitHub adapter with a private repo
        mock_adapter = MockGithubAdapter(repo_info={
            "id": 123,
            "name": "privaterepo",
            "full_name": "owner/privaterepo",
            "private": True,
            "visibility": "private",
            "description": "A private test repository",
            "html_url": "https://github.com/owner/privaterepo",
            "default_branch": "main",
            "stars": 5,
            "topics": ["private"],
        })

        # Create a mock user in open_source mode
        user = CurrentUser(
            id="user1",
            github_login="testuser",
            avatar_url="https://example.com/avatar.png",
            mode=UserMode.open_source,
        )
        settings = __import__('app.core.config', fromlist=['get_settings']).get_settings()
        token = jwt.encode(
            {"sub": user.id, "iat": __import__('datetime').datetime.now(__import__('datetime').timezone.utc), "exp": __import__('datetime').datetime.now(__import__('datetime').timezone.utc) + __import__('datetime').timedelta(days=7)},
            settings.session_secret,
            algorithm="HS256",
        )


        from app.core.security import _USERS, StoredUser
        _USERS[user.id] = StoredUser(
            id=user.id,
            github_login=user.github_login,
            avatar_url=user.avatar_url,
            mode=user.mode,
        )
        monkeypatch.setattr("app.integrations.github.GitHubAdapter", lambda *args, **kwargs: mock_adapter)

        response = client.post(
            "/api/repositories/analyze",
            json={"owner": "owner", "name": "privaterepo"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
        assert response.json()["detail"] == "PRIVATE_REPO_REQUIRES_COMPANY_MODE"
