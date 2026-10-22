# File:        backend/app/schemas/architecture.py
# Owner:       Devyani (co-owned with Shreyansh — shared contract)
# Purpose:     Defines the shape of an analyzed repository (the ArchitectureBundle) shared by the backend and the extension.
# Contains:    Pydantic models: Repository, Overview, Technology, EntryPoint, Component, Connection, JiraIssue, ConfluencePage, RelatedContext, GoodFirstIssue, Maintainer, ContributorGuide, ArchitectureBundle.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/core/modes.py (UserMode, for mode-dependent optional blocks)

"""The architecture schema — the single contract for a analyzed repository.

This is a SHARED CONTRACT. The extension mirrors it in
extension/src/types/architecture.ts. Keep the two in sync. Change only after
the whole team agrees.

Mode-dependent blocks:
- `contributor_guide` is filled in Open Contributor mode.
- `related_context` (Jira + Confluence) is filled in Company Employee mode.

Both are optional so one schema serves both modes.
"""

from pydantic import BaseModel, Field


class Repository(BaseModel):
    """Identifies which repository this bundle describes."""

    owner: str
    name: str
    branch: str = "main"


class Overview(BaseModel):
    """A plain-English, one-paragraph summary of the repository."""

    summary: str
    primary_language: str | None = None
    stars: int | None = None
    topics: list[str] = Field(default_factory=list)
    last_updated: str | None = None


class Technology(BaseModel):
    """One technology used by the repo, with the files that prove it."""

    name: str
    category: str | None = None
    evidence_files: list[str] = Field(default_factory=list)


class EntryPoint(BaseModel):
    """A file where execution starts, plus why it matters."""

    file: str
    reason: str


class Component(BaseModel):
    """A logical piece of the system."""

    id: str
    name: str
    description: str
    files: list[str] = Field(default_factory=list)


class Connection(BaseModel):
    """A relationship between two components (by component id)."""

    from_component: str = Field(alias="from")
    to_component: str = Field(alias="to")
    relationship: str

    model_config = {"populate_by_name": True}


class GoodFirstIssue(BaseModel):
    """A welcoming issue for new contributors (contributor mode only)."""

    title: str
    url: str


class Maintainer(BaseModel):
    """A repository maintainer (contributor mode only)."""

    login: str
    avatar_url: str | None = None


class ContributorGuide(BaseModel):
    """How to contribute — filled in Open Contributor mode only."""

    setup_steps: list[str] = Field(default_factory=list)
    contribution_rules: list[str] = Field(default_factory=list)
    good_first_issues: list[GoodFirstIssue] = Field(default_factory=list)
    maintainers: list[Maintainer] = Field(default_factory=list)


class JiraIssue(BaseModel):
    """A linked Jira issue (company mode only)."""

    key: str
    summary: str
    url: str
    status: str | None = None


class ConfluencePage(BaseModel):
    """A linked Confluence page (company mode only)."""

    id: str
    title: str
    url: str
    space: str | None = None


class RelatedContext(BaseModel):
    """Jira + Confluence context — filled in Company Employee mode only."""

    jira_issues: list[JiraIssue] = Field(default_factory=list)
    confluence_pages: list[ConfluencePage] = Field(default_factory=list)


class ArchitectureBundle(BaseModel):
    """The full analysis result for one repository.

    This is what GET /api/repositories/{owner}/{repo}/architecture returns.
    `contributor_guide` and `related_context` are mode-dependent and optional.
    """

    repository: Repository
    overview: Overview
    technologies: list[Technology] = Field(default_factory=list)
    entry_points: list[EntryPoint] = Field(default_factory=list)
    components: list[Component] = Field(default_factory=list)
    connections: list[Connection] = Field(default_factory=list)
    contributor_guide: ContributorGuide | None = None
    related_context: RelatedContext | None = None
