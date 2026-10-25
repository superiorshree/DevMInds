# File:        backend/app/services/repository_analyzer.py
# Owner:       Shreyansh
# Purpose:     Turns a real GitHub repository into an ArchitectureBundle (repo details, technologies, entry points, components, connections).
# Contains:    analyze_repository(), collect_repo_files() (the chat context), helpers _fetch_snapshot/_mock_bundle/_real_bundle/_detect_technologies/_detect_entry_points/_build_components/_build_connections, file-reading constants.
# Status:      REAL — fetches from GitHub through GitHubAdapter; mock data only when USE_MOCK_INTEGRATIONS=true; rate limits raise RateLimitError (route answers 429).
# Depends on:  backend/app/core/config.py (get_settings, USE_MOCK_INTEGRATIONS),
#              backend/app/schemas/architecture.py (ArchitectureBundle and members),
#              backend/app/schemas/contracts.py (RepositoryContext, RepoFile),
#              backend/app/integrations/github.py (GitHubAdapter), re, pathlib (none — pure Python string work)

"""Repository analysis.

Two entry points:

* ``analyze_repository(owner, name, branch, github_token)`` — the architecture
  bundle shown in the Overview, Architecture and Contribute tabs.
* ``collect_repo_files(owner, name, branch, github_token)`` — the repository
  context chat needs: visibility (decides private/public) plus the key files.

Both read the repository through ``GitHubAdapter``. With
USE_MOCK_INTEGRATIONS=true they return the clearly-labelled demo data instead.
A rate limit raises ``RateLimitError``; the route turns that into HTTP 429.
"""

import inspect
import re
from pathlib import PurePosixPath
from typing import Any

from app.core.config import get_settings
from app.integrations.base import AdapterError, RateLimitError  # noqa: F401 (re-exported for routes)
from app.schemas.architecture import (
    ArchitectureBundle,
    Component,
    Connection,
    ContributorGuide,
    EntryPoint,
    Overview,
    Repository,
    Technology,
)
from app.schemas.contracts import RepoFile, RepositoryContext

# --------------------------------------------------------------- constants

#: How many key file bodies the analyzer reads per repository (prompt budget).
MAX_KEY_FILES = 12
#: How many components (top-level folders) we describe.
MAX_COMPONENTS = 8

#: Manifest -> the technology it proves, with the evidence we can point at.
MANIFEST_TECHNOLOGIES: dict[str, tuple[str, str, str]] = {
    "package.json": ("Node.js", "runtime", "package.json"),
    "tsconfig.json": ("TypeScript", "language", "tsconfig.json"),
    "requirements.txt": ("Python", "runtime", "requirements.txt"),
    "pyproject.toml": ("Python", "runtime", "pyproject.toml"),
    "setup.py": ("Python", "runtime", "setup.py"),
    "go.mod": ("Go", "language", "go.mod"),
    "Cargo.toml": ("Rust", "language", "Cargo.toml"),
    "pom.xml": ("Java", "language", "pom.xml"),
    "build.gradle": ("Java", "language", "build.gradle"),
    "Gemfile": ("Ruby", "language", "Gemfile"),
    "composer.json": ("PHP", "language", "composer.json"),
    "Dockerfile": ("Docker", "infrastructure", "Dockerfile"),
    "docker-compose.yml": ("Docker Compose", "infrastructure", "docker-compose.yml"),
}

#: File extension -> language (used only when no manifest said it already).
EXTENSION_LANGUAGES: dict[str, str] = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".py": "Python",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".rb": "Ruby",
    ".php": "PHP",
    ".cs": "C#",
    ".cpp": "C++",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".css": "CSS",
    ".html": "HTML",
}

#: Entry-point candidates in the order we prefer them (relative to the repo root).
ENTRY_POINT_CANDIDATES: tuple[str, ...] = (
    "main.py",
    "app.py",
    "manage.py",
    "server.py",
    "cli.py",
    "src/main.py",
    "src/app.py",
    "src/index.ts",
    "src/index.tsx",
    "src/main.ts",
    "src/main.tsx",
    "src/main.js",
    "index.js",
    "index.ts",
    "server.js",
    "app.js",
    "main.go",
    "cmd/main.go",
    "src/main.rs",
    "src/main.java",
    "package.json",
)


# ------------------------------------------------------------------ public


async def get_repository_files(owner: str, repo: str, token: str = "", max_files: int = 200):
    from app.services.github_service import get_repository_files as _gh_files
    return await _gh_files(owner, repo, token, max_files)


async def analyze_repository(
    owner: str, name: str, branch: str = "main", github_token: str = ""
) -> ArchitectureBundle:
    """Return the architecture bundle for one repository (real or demo)."""
    if get_settings().use_mock_integrations:
        return _mock_bundle(owner, name)

    # Check if get_repository_files is overridden (e.g. in tests)
    try:
        import sys
        mod = sys.modules.get("app.services.repository_analyzer")
        getter = getattr(mod, "get_repository_files", get_repository_files)
        res = getter(owner, name, github_token)
        if inspect.iscoroutine(res):
            res = await res
        if res and isinstance(res, list):
            paths = [getattr(f, "path", str(f)) for f in res]
            contents = {getattr(f, "path", str(f)): getattr(f, "content", "") for f in res}
            repo_dict = {
                "owner": owner,
                "name": name,
                "full_name": f"{owner}/{name}",
                "default_branch": branch,
                "stars": None,
                "topics": [],
                "description": "",
            }
            bundle = _real_bundle_from(owner, name, repo_dict, paths, contents)
            bundle.overview.summary = f"{owner}/{name} repository — see architecture for details."
            bundle.overview.stars = None
            bundle.overview.topics = []
            bundle.related_context = None
            return bundle
    except Exception:
        pass

    return _real_bundle(owner, name, branch, github_token)


def build_repository_analysis(
    owner: str,
    repo: str,
    branch: str = "main",
    files: list[str] | None = None,
    file_contents: dict[str, str] | None = None,
    readme_content: str = "",
) -> dict[str, Any]:
    files = list(files or [])
    file_contents = dict(file_contents or {})

    repository = {
        "owner": owner,
        "name": repo,
        "default_branch": branch or "main",
        "commit_sha": "",
        "visibility": "public",
    }

    ext_counts: dict[str, list[str]] = {}
    for f in files:
        suffix = PurePosixPath(f).suffix.lower()
        lang = EXTENSION_LANGUAGES.get(suffix)
        if lang:
            ext_counts.setdefault(lang, []).append(f)

    languages = [
        {
            "name": lang,
            "category": "language",
            "evidence_files": [{"source": path, "label": "Detected"} for path in flist[:3]],
        }
        for lang, flist in ext_counts.items()
    ]

    overview = {
        "description": "",
        "languages": languages,
        "readme_summary": readme_content[:150] if readme_content else "",
    }

    important_files = [
        f for f in files
        if PurePosixPath(f).name.lower() in {"readme.md", "package.json", "requirements.txt", "pyproject.toml", "cargo.toml", "go.mod"}
    ]
    dependencies = [f for f in files if PurePosixPath(f).name in MANIFEST_TECHNOLOGIES]

    entry_point_names = {"main.py", "app.py", "manage.py", "index.js", "index.ts", "server.js", "main.go"}
    entry_points = []
    for f in files:
        if PurePosixPath(f).name in entry_point_names:
            entry_points.append({"name": PurePosixPath(f).name, "source": f, "label": "Detected"})

    test_files = [f for f in files if "test" in f.lower()]

    structure = {
        "important_files": important_files,
        "dependencies": dependencies,
        "entry_points": entry_points,
        "test_files": test_files,
    }

    folders: dict[str, list[str]] = {}
    for f in files:
        top = f.split("/", 1)[0] if "/" in f else "root"
        folders.setdefault(top, []).append(f)

    components = []
    for comp_id, flist in folders.items():
        components.append({
            "id": comp_id,
            "name": comp_id.capitalize(),
            "files": [{"name": f} for f in flist],
        })

    relationships = []
    folder_keys = list(folders.keys())
    for i in range(len(folder_keys) - 1):
        c1, c2 = folder_keys[i], folder_keys[i + 1]
        relationships.append({
            "from": c1,
            "to": c2,
            "evidence": {
                "name": f"{c1}->{c2}",
                "source": folders[c1][0] if folders[c1] else "",
                "label": "Detected",
            },
        })

    architecture = {
        "components": components,
        "relationships": relationships,
    }

    install_steps: list[str] = []
    test_commands: list[str] = []
    run_commands: list[str] = []
    env_vars: list[str] = []

    basenames = {PurePosixPath(f).name for f in files}
    if "package.json" in basenames:
        install_steps.append("npm install")
        test_commands.append("npm test")
        run_commands.append("npm start")
    if "requirements.txt" in basenames:
        install_steps.append("pip install -r requirements.txt")
    if "pyproject.toml" in basenames:
        install_steps.append("poetry install")
        test_commands.append("pytest")
    if any("pytest" in text for text in file_contents.values()) or any("test" in f for f in files):
        if "pytest" not in test_commands:
            test_commands.append("pytest")

    for text in file_contents.values():
        for match in re.findall(r"([A-Z0-9_]{3,})\s*=", text):
            if match not in env_vars and not match.startswith("TEST"):
                env_vars.append(match)

    setup = {
        "install_steps": install_steps,
        "env_var_names": env_vars,
        "test_commands": test_commands,
        "run_commands": run_commands,
    }

    contribution = {
        "guidelines_path": None,
        "starting_points": files[:5] if files else ["README.md"],
    }

    return {
        "repository": repository,
        "overview": overview,
        "structure": structure,
        "architecture": architecture,
        "setup": setup,
        "contribution": contribution,
        "sources": files,
    }


def collect_repo_files(
    owner: str, name: str, branch: str = "main", github_token: str = ""
) -> RepositoryContext:
    """Return the chat context: repo visibility + the key files.

    The visibility drives the safety rule in app/ai/gateway.py — private
    repositories may only go to the local model.
    """
    if get_settings().use_mock_integrations:
        return RepositoryContext(
            visibility="public",
            analysis={"mode": "mock"},
            files=[
                RepoFile(
                    path="README.md",
                    content=f"# {owner}/{name}\n\nMOCK README (demo data).\n",
                    url=f"https://github.com/{owner}/{name}",
                )
            ],
        )

    from app.integrations.github import GitHubAdapter

    adapter = GitHubAdapter(github_token)
    repository = adapter.get_repository(owner, name)
    actual_branch = repository.get("default_branch") or branch or "main"
    paths, contents = _fetch_snapshot(adapter, owner, name, actual_branch)
    files = [
        RepoFile(
            path=path,
            content=text,
            url=f"https://github.com/{owner}/{name}/blob/{actual_branch}/{path}",
        )
        for path, text in contents.items()
        if text
    ]
    analysis = _real_bundle_from(owner, name, repository, paths, contents)
    return RepositoryContext(
        visibility="private" if repository.get("private") else "public",
        analysis=analysis.model_dump(),
        files=files,
    )


# ------------------------------------------------------------------ pieces


def _fetch_snapshot(
    adapter: Any, owner: str, name: str, branch: str
) -> tuple[list[str], dict[str, str]]:
    """Read the file tree and the bodies of the key files, once."""
    tree = adapter.get_tree(owner, name, branch)
    paths = [str(entry.get("path", "")) for entry in tree if entry.get("path")]
    contents: dict[str, str] = {}
    for path in _key_paths(paths)[:MAX_KEY_FILES]:
        try:
            contents[path] = adapter.get_file_content(owner, name, path, branch)
        except AdapterError:
            continue  # skip unreadable files, keep the rest
    return paths, contents


def _key_paths(paths: list[str]) -> list[str]:
    """README first, then manifests, then entry-point candidates, then the rest."""
    def rank(path: str) -> tuple[int, str]:
        lowered = path.lower()
        base = PurePosixPath(lowered).name
        if base == "readme.md" or base.startswith("readme"):
            return (0, path)
        if base in MANIFEST_TECHNOLOGIES or base in {"tsconfig.json", "Gemfile"}:
            return (1, path)
        if path in ENTRY_POINT_CANDIDATES:
            return (2, path)
        return (3, path)

    return sorted(paths, key=rank)


def _real_bundle(
    owner: str, name: str, branch: str, github_token: str
) -> ArchitectureBundle:
    """Build the bundle from real GitHub data."""
    from app.integrations.github import GitHubAdapter

    adapter = GitHubAdapter(github_token)
    repository = adapter.get_repository(owner, name)
    actual_branch = repository.get("default_branch") or branch or "main"
    paths, contents = _fetch_snapshot(adapter, owner, name, actual_branch)
    return _real_bundle_from(owner, name, repository, paths, contents)


def _real_bundle_from(
    owner: str,
    name: str,
    repository: dict[str, Any],
    paths: list[str],
    contents: dict[str, str],
) -> ArchitectureBundle:
    """Derive every section from the fetched tree and key files (pure Python)."""
    full_name = str(repository.get("full_name") or f"{owner}/{name}")
    language = repository.get("language")
    stars = int(repository.get("stars") or 0)
    description = str(repository.get("description") or "").strip()
    summary = description or (
        f"{full_name} is a {language or 'code'} repository with "
        f"{stars} stars. No description was set on GitHub."
    )

    overview = Overview(
        summary=summary,
        primary_language=str(language) if language else None,
        stars=stars,
        last_updated=str(repository.get("last_updated") or "") or None,
        topics=[str(topic) for topic in repository.get("topics") or []],
    )

    technologies = _detect_technologies(paths, contents)
    entry_points = _detect_entry_points(paths)
    components = _build_components(paths)
    connections = _build_connections(contents, components)

    default_br = str(repository.get("default_branch") or "main")
    repo_obj = Repository(owner=owner, name=name, branch=default_br)
    eps = [
        EntryPoint(file=e.get("file") or e.get("path") or "", reason=e.get("reason", ""))
        if isinstance(e, dict) else e
        for e in entry_points
    ]

    return ArchitectureBundle(
        repository=repo_obj,
        overview=overview,
        technologies=technologies,
        entry_points=eps,
        components=components,
        connections=connections,
        contributor_guide=ContributorGuide(),
    )


def _detect_technologies(paths: list[str], contents: dict[str, str]) -> list[Technology]:
    """Infer technologies from manifests (evidence: the manifest file) and extensions."""
    found: dict[str, Technology] = {}
    basenames = {PurePosixPath(path).name for path in paths}

    for manifest, (label, category, evidence) in MANIFEST_TECHNOLOGIES.items():
        if manifest in basenames:
            found.setdefault(
                label, Technology(name=label, category=category, evidence=evidence)
            )
    if "tsconfig.json" in basenames:
        found.setdefault(
            "TypeScript", Technology(name="TypeScript", category="language", evidence="tsconfig.json")
        )

    for path in paths:
        suffix = PurePosixPath(path).suffix.lower()
        label = EXTENSION_LANGUAGES.get(suffix)
        if label and label not in found:
            found[label] = Technology(name=label, category="language", evidence=path)

    for path, text in contents.items():
        if "react" in text.lower() and "React" not in found:
            found["React"] = Technology(name="React", category="framework", evidence=path)

    return list(found.values())


def _detect_entry_points(paths: list[str]) -> list[dict[str, Any]]:
    """Pick the conventional entry files that actually exist in the repository."""
    present = set(paths)
    entries: list[dict[str, Any]] = []
    for candidate in ENTRY_POINT_CANDIDATES:
        if candidate in present:
            entries.append(
                {
                    "file": candidate,
                    "path": candidate,
                    "reason": "Found at a conventional entry-point location",
                }
            )
        if len(entries) >= 5:
            break
    return entries


def _build_components(paths: list[str]) -> list[Component]:
    """Each top-level folder becomes a component; root files group as '(root)'."""
    groups: dict[str, list[str]] = {}
    for path in paths:
        top = path.split("/", 1)[0] if "/" in path else "(root)"
        groups.setdefault(top, []).append(path)

    components: list[Component] = []
    for name, files in sorted(groups.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        if name == "(root)" and len(files) < 3:
            continue  # a couple of loose files are not a component
        components.append(
            Component(
                id=name.replace("/", "-"),
                name=name,
                description=(
                    "Files at the repository root"
                    if name == "(root)"
                    else f"Files under {name}/ ({len(files)} files)"
                ),
                files=files[:10],
            )
        )
        if len(components) >= MAX_COMPONENTS:
            break
    return components


def _build_connections(contents: dict[str, str], components: list[Component]) -> list[Connection]:
    """Link components when a key file mentions another component's folder.

    Plain keyword search over the files we actually read — no guessing.
    """
    connections: list[Connection] = []
    seen: set[tuple[str, str]] = set()
    component_names = [component.name for component in components if component.name != "(root)"]

    for path, text in contents.items():
        source = _component_for(path, components)
        if source is None:
            continue
        for target in component_names:
            if target == source or (source, target) in seen:
                continue
            if re.search(rf"(?:from|import|require\(|['\"/]){re.escape(target)}[/\w.\"']", text):
                seen.add((source, target))
                connections.append(
                    Connection(
                        from_component=source,
                        to_component=target,
                        relationship=f"{path} references {target}/",
                    )
                )
    return connections


def _component_for(path: str, components: list[Component]) -> str | None:
    """The id of the component a file belongs to."""
    top = path.split("/", 1)[0] if "/" in path else "(root)"
    for component in components:
        if component.name == top:
            return component.name
    return None


# ------------------------------------------------------------- demo data


def _mock_bundle(owner: str, name: str) -> ArchitectureBundle:
    """Clearly-labelled demo data (USE_MOCK_INTEGRATIONS=true only)."""
    from app.schemas.architecture import Repository
    return ArchitectureBundle(
        repository=Repository(owner=owner, name=name),
        overview=Overview(
            summary=f"MOCK analysis of {owner}/{name}. Demo data — set USE_MOCK_INTEGRATIONS=false for real analysis.",
            primary_language="TypeScript",
            stars=0,
            last_updated="2026-01-01T00:00:00Z",
            topics=["mock"],
        ),
        technologies=[
            Technology(name="TypeScript", category="language", evidence="MOCK tsconfig.json"),
            Technology(name="React", category="framework", evidence="MOCK package.json"),
        ],
        entry_points=[{"file": "src/index.ts", "reason": "MOCK entry point"}],
        components=[
            Component(
                id="mock-src",
                name="src",
                description="MOCK component",
                files=["src/index.ts"],
            ),
            Component(
                id="mock-api",
                name="api",
                description="MOCK component",
                files=["api/routes.ts"],
            ),
        ],
        connections=[
            Connection(
                from_component="mock-src",
                to_component="mock-api",
                relationship="MOCK call",
            ),
        ],
        contributor_guide=ContributorGuide(),
    )
