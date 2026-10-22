# File:        backend/app/services/repository_analyzer.py
# Owner:       Shreyansh
# Purpose:     Analyzes a GitHub repository and produces the ArchitectureBundle that both modes share.
# Contains:    analyze_repository() function returning a mock ArchitectureBundle for now.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/schemas/architecture.py, backend/app/integrations/github.py

"""The single repository analyzer.

One analyzer serves both modes: it produces facts (files, components,
technologies, entry points). The mode decides which optional blocks
(contributor_guide vs related_context) get filled in downstream.
"""

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


def analyze_repository(owner: str, name: str, branch: str = "main") -> ArchitectureBundle:
    """Analyze a repository and return an ArchitectureBundle.

    Returns mock data that matches the schema so the API works before the real
    analyzer exists.
    """
    # TODO(Shreyansh): implement the real analyzer — use GitHubAdapter to fetch
    # the repo metadata, tree and key files, then derive technologies, entry
    # points, components and connections. Return the real bundle.
    return ArchitectureBundle(
        repository=Repository(owner=owner, name=name, branch=branch),
        overview=Overview(
            summary=f"MOCK: {owner}/{name} is a repository. TODO(Shreyansh): real summary.",
            primary_language="TypeScript",
            stars=0,
            topics=[],
            last_updated=None,
        ),
        technologies=[
            Technology(name="TypeScript", category="language", evidence_files=["package.json"])
        ],
        entry_points=[
            EntryPoint(file="src/index.ts", reason="MOCK entry point. TODO(Shreyansh): detect real ones.")
        ],
        components=[
            Component(
                id="core",
                name="Core",
                description="MOCK component. TODO(Shreyansh): derive from the file tree.",
                files=["src/index.ts"],
            )
        ],
        connections=[
            Connection.model_validate(
                {"from": "core", "to": "core", "relationship": "MOCK connection"}
            )
        ],
        contributor_guide=ContributorGuide(),
    )
