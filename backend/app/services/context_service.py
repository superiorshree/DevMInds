# File:        backend/app/services/context_service.py
# Owner:       Devyani
# Purpose:     Gathers Jira and Confluence context for a repository (company mode only).
# Contains:    get_related_context() function returning mock data for now.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/schemas/architecture.py, backend/app/integrations/jira.py, backend/app/integrations/confluence.py

"""Context service (company mode only).

Reads linked Jira issues and Confluence pages through their adapters and returns
them as RelatedContext with source links. The route already enforces the feature
with require_feature("contextTab"); this service does not re-check the mode.
"""

from app.schemas.architecture import RelatedContext


def get_related_context(owner: str, name: str) -> RelatedContext:
    """Return Jira issues and Confluence pages linked to a repository."""
    # TODO(Devyani): call JiraAdapter.get_issues_for_repo() and
    # ConfluenceAdapter.get_pages_for_repo(), map them to JiraIssue and
    # ConfluencePage models with real source URLs, and handle rate limits.
    return RelatedContext(
        jira_issues=[],
        confluence_pages=[],
    )
