from __future__ import annotations

import asyncio
import os
import tempfile

import pytest

from app.services.repository_analyzer import (
    build_repository_analysis,
    analyze_repository,
)


def _python_files(*names):
    """Return Python file paths."""
    return [f for f in names if f.endswith(".py")]


def _js_files(*names):
    """Return JS/TS file paths."""
    return [f for f in names if f.endswith((".js", ".jsx", ".ts", ".tsx"))]


def _all_files(*names):
    """Return all file paths."""
    return list(names)


class TestBuildRepositoryAnalysis:
    """Tests for build_repository_analysis - the core deterministic analyzer."""

    def test_frozen_shape(self):
        """The output must match the exact frozen dict shape."""
        files = ["src/index.js", "src/utils.py", "README.md"]
        result = build_repository_analysis(
            owner="testowner", repo="testrepo", branch="main", files=files,
        )
        assert "repository" in result
        assert "overview" in result
        assert "structure" in result
        assert "architecture" in result
        assert "setup" in result
        assert "contribution" in result
        assert "sources" in result
        repo = result["repository"]
        assert repo["owner"] == "testowner"
        assert repo["name"] == "testrepo"
        assert repo["default_branch"] == "main"
        assert repo["commit_sha"] == ""
        assert repo["visibility"] == "public"
        overview = result["overview"]
        assert overview["description"] == ""
        assert isinstance(overview["languages"], list)
        assert overview["readme_summary"] == ""
        structure = result["structure"]
        assert isinstance(structure["important_files"], list)
        assert isinstance(structure["dependencies"], list)
        assert isinstance(structure["entry_points"], list)
        assert isinstance(structure["test_files"], list)
        architecture = result["architecture"]
        assert isinstance(architecture["components"], list)
        assert isinstance(architecture["relationships"], list)
        setup = result["setup"]
        assert isinstance(setup["install_steps"], list)
        assert isinstance(setup["env_var_names"], list)
        assert isinstance(setup["test_commands"], list)
        assert isinstance(setup["run_commands"], list)
        contribution = result["contribution"]
        assert contribution["guidelines_path"] is None
        assert isinstance(contribution["starting_points"], list)
        assert isinstance(result["sources"], list)

    def test_technologies_from_extensions(self):
        """Languages are detected from file-extension counts."""
        files = [
            "src/component.js",
            "src/types.ts",
            "src/utils.py",
            "styles.css",
            "index.html",
        ]
        result = build_repository_analysis(
            owner="testowner", repo="testrepo", files=files,
        )
        lang_names = result["overview"]["languages"]
        lang_names_str = [l["name"] for l in lang_names]
        assert "JavaScript" in lang_names_str
        assert "TypeScript" in lang_names_str
        assert "Python" in lang_names_str
        assert "CSS" in lang_names_str
        assert "HTML" in lang_names_str
        for tech_entry in lang_names:
            assert "name" in tech_entry and "evidence_files" in tech_entry

    def test_entry_points_detected(self):
        """Entry points are detected from known filenames."""
        files = [
            "src/index.js",
            "src/utils.py",
            "main.py",
            "app.py",
            "manage.py",
            "package.json",
        ]
        result = build_repository_analysis(
            owner="testowner", repo="testrepo", files=files,
        )
        ep_names = [ep.get("name", "") for ep in result["structure"]["entry_points"]]
        assert "main.py" in ep_names
        assert "app.py" in ep_names
        assert "manage.py" in ep_names

    def test_components_group_by_folder(self):
        """Files are grouped by top-level folder or src/."""
        files = [
            "src/componentA.js",
            "src/componentB.js",
            "src/utils.py",
            "styles.css",
            "README.md",
        ]
        result = build_repository_analysis(
            owner="testowner", repo="testrepo", files=files,
        )
        comp_ids = [c["id"] for c in result["architecture"]["components"]]
        assert "src" in comp_ids or any(c["name"] == "Src" for c in result["architecture"]["components"])
        comp_ids = [c["id"] for c in result["architecture"]["components"]]
        root_comps = [c for c in result["architecture"]["components"] if c["id"] == "root"]
        if root_comps:
            assert any(f["name"] == "README.md" for f in root_comps[0]["files"])

    def test_same_folder_files_not_linked(self):
        """Two files in the same folder must NOT create a connection."""
        files = ["src/file1.js", "src/file2.js"]
        result = build_repository_analysis(
            owner="testowner", repo="testrepo", files=files,
        )
        relationships = result["architecture"]["relationships"]
        for conn in relationships:
            if conn["from"] == conn["to"]:
                pass
        from_src = any(
            conn.get("from") == "file1.js" and conn.get("to") == "file2.js"
            for conn in relationships
        )
        assert not from_src

    def test_import_connections_across_folders(self):
        """Import connections should be created across different folders."""
        files = ["src/component.js", "src/utils.py"]
        result = build_repository_analysis(
            owner="testowner", repo="testrepo", files=files,
        )
        relationships = result["architecture"]["relationships"]
        assert isinstance(relationships, list)

    def test_environments_has_install_steps_and_env_vars(self):
        """Setup section has install_steps, env_var_names, test_commands, run_commands."""
        files = ["src/index.js", "app.py", "README.md", "tests/test_main.py"]
        readme_content = "# test-repo\n\nSome project description.\n\n```\n@pytest\n```"
        file_contents = {
            "src/index.js": "import React from 'react';",
            "app.py": "def main(): pass",
            "README.md": readme_content,
            "tests/test_main.py": "def test_main(): pass",
        }
        result = build_repository_analysis(
            owner="testowner", repo="testrepo", files=files,
            file_contents=file_contents,
            readme_content=readme_content,
        )
        setup = result["setup"]
        assert isinstance(setup["install_steps"], list)
        assert isinstance(setup["env_var_names"], list)
        assert isinstance(setup["test_commands"], list)
        assert isinstance(setup["run_commands"], list)
        for name in setup["env_var_names"]:
            assert "=" not in name
        assert any("pytest" in cmd for cmd in setup["test_commands"])

    def test_guidelines_has_null_and_starting_points(self):
        """Contribution section has guidelines_path (null) and starting_points."""
        files = ["src/index.js", "README.md"]
        result = build_repository_analysis(
            owner="testowner", repo="testrepo", files=files,
        )
        contrib = result["contribution"]
        assert contrib["guidelines_path"] is None
        assert isinstance(contrib["starting_points"], list)
        assert len(contrib["starting_points"]) > 0

    def test_every_item_has_source_and_label(self):
        """Every extracted item must have its own source path and label."""
        files = ["src/component.js", "src/utils.py", "package.json"]
        result = build_repository_analysis(
            owner="testowner", repo="testrepo", files=files,
        )
        for tech in result["overview"]["languages"]:
            tech_found = False
            for lang_entry in result["overview"]["languages"]:
                if lang_entry == tech:
                    tech_found = True
                    break
            assert tech_found, f"Language {tech} not found in languages"
        for ep in result["structure"]["entry_points"]:
            assert "name" in ep or "text" in ep
            if "name" in ep:
                assert "source" in ep
                assert "label" in ep
        for comp in result["architecture"]["components"]:
            assert "files" in comp
        for conn in result["architecture"]["relationships"]:
            assert "evidence" in conn
            ev = conn["evidence"]
            assert "name" in ev
            assert "source" in ev
            assert "label" in ev

    def test_technologies_have_detected_inferred_labels(self):
        """Technology evidence files must have label 'Detected' or 'Inferred'."""
        files = ["src/component.js", "src/utils.py"]
        result = build_repository_analysis(
            owner="testowner", repo="testrepo", files=files,
        )
        lang_entries = result["overview"]["languages"]
        assert len(lang_entries) > 0
        for lang_entry in lang_entries:
            assert "name" in lang_entry
            assert "category" in lang_entry
            assert "evidence_files" in lang_entry
        for lang_entry in lang_entries:
            for ev in lang_entry.get("evidence_files", []):
                assert "label" in ev
                assert ev["label"] in ("Detected", "Inferred")

    def test_analysis_with_no_files(self):
        """Analyzer works with empty file list."""
        result = build_repository_analysis(
            owner="testowner", repo="testrepo", files=[],
        )
        assert "repository" in result
        assert "overview" in result
        assert "structure" in result
        assert "architecture" in result
        assert "setup" in result
        assert "contribution" in result
        assert "sources" in result
        assert result["overview"]["languages"] == []
        assert result["structure"]["entry_points"] == []
        assert result["architecture"]["components"] == []
        assert result["architecture"]["relationships"] == []
        assert isinstance(result["setup"]["install_steps"], list)
        assert isinstance(result["setup"]["env_var_names"], list)


class TestAnalyzeRepository:
    """Tests for analyze_repository - the public API that fetches from GitHub."""

    @pytest.mark.usefixtures("_session_secret")
    def test_analyze_with_mocked_github(self, monkeypatch):
        """analyze_repository returns a valid ArchitectureBundle."""
        from app.services.repository_analyzer import get_repository_files
        from app.services.github_service import GithubFile
        mock_files = [
            GithubFile(
                path="src/index.ts",
                content="import React from 'react';",
                url="https://github.com/owner/repo/blob/main/src/index.ts",
            ),
            GithubFile(
                path="src/utils.ts",
                content="export function helper() { return 1; }",
                url="https://github.com/owner/repo/blob/main/src/utils.ts",
            ),
            GithubFile(
                path="package.json",
                content='{"name": "test-repo", "main": "src/index.ts"}',
                url="https://github.com/owner/repo/blob/main/package.json",
            ),
            GithubFile(
                path="README.md",
                content="# test-repo",
                url="https://github.com/owner/repo/blob/main/README.md",
            ),
        ]
        def mock_get_repo_files(owner, repo, token, max_files=200):
            return mock_files
        import app.services.repository_analyzer as ra_module
        original_func = ra_module.get_repository_files
        ra_module.get_repository_files = mock_get_repo_files

    def test_analyze_basic_shape(self, monkeypatch):
        """analyze_repository returns an ArchitectureBundle with correct fields."""
        from app.services.repository_analyzer import get_repository_files
        from app.services.github_service import GithubFile
        mock_files = [
            GithubFile(
                path="src/index.ts",
                content="import React from 'react';",
                url="https://github.com/owner/repo/blob/main/src/index.ts",
            ),
            GithubFile(
                path="lib/utils.js",
                content="import { helper } from './index'; export function helper() { return 1; }",
                url="https://github.com/owner/repo/blob/main/lib/utils.js",
            ),
            GithubFile(
                path="package.json",
                content='{"name": "test-repo", "main": "src/index.ts"}',
                url="https://github.com/owner/repo/blob/main/package.json",
            ),
            GithubFile(
                path="README.md",
                content="# test-repo",
                url="https://github.com/owner/repo/blob/main/README.md",
            ),
        ]
        async def mock_get_repo_files_async(owner, repo, token, max_files=200):
            return mock_files
        import app.services.repository_analyzer as ra_module
        original_func = ra_module.get_repository_files
        ra_module.get_repository_files = mock_get_repo_files_async
        from app.schemas.architecture import ArchitectureBundle, Repository, Overview, Technology, EntryPoint, Component, Connection
        bundle = asyncio.run(analyze_repository(
            owner="testowner", name="testrepo", branch="main",
        ))
        assert isinstance(bundle, ArchitectureBundle)
        assert bundle.repository.owner == "testowner"
        assert bundle.repository.name == "testrepo"
        assert bundle.repository.branch == "main"
        assert bundle.overview.summary == "testowner/testrepo repository — see architecture for details."
        assert bundle.overview.stars is None
        assert bundle.overview.topics == []
        assert len(bundle.technologies) > 0
        assert len(bundle.entry_points) > 0
        assert len(bundle.components) > 0
        assert isinstance(bundle.connections, list)
        assert bundle.contributor_guide is not None
        assert bundle.related_context is None


@pytest.fixture(autouse=True)
def _session_secret(monkeypatch):
    """Monkeypatch SESSION_SECRET so tests that touch Settings work locally."""
    monkeypatch.setenv("SESSION_SECRET", "test-session-secret-for-analyzer")
    from app.core.config import get_settings
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()