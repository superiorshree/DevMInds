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

import asyncio
import inspect
from app.integrations import get_company_context
from app.schemas.architecture import ConfluencePage, JiraIssue, RelatedContext


def get_related_context(owner: str, name: str) -> RelatedContext:
    """Return Jira issues and Confluence pages linked to a repository."""
    try:
        ctx_call = get_company_context(f"{owner}/{name}", query="", mode="company")
        if inspect.iscoroutine(ctx_call):
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None
            if loop and loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    company_ctx = executor.submit(asyncio.run, ctx_call).result()
            else:
                company_ctx = asyncio.run(ctx_call)
        else:
            company_ctx = ctx_call

        jira_issues: list[JiraIssue] = []
        confluence_pages: list[ConfluencePage] = []

        for item in getattr(company_ctx, "items", []):
            if item.source_type == "jira":
                parts = item.title.split(":", 1)
                key = parts[0].strip() if len(parts) > 1 else item.title
                summary = parts[1].strip() if len(parts) > 1 else item.content[:80]
                jira_issues.append(
                    JiraIssue(
                        key=key,
                        summary=summary,
                        url=item.url,
                        status=item.metadata.get("status", "In Progress"),
                    )
                )
            elif item.source_type == "confluence":
                confluence_pages.append(
                    ConfluencePage(
                        id=str(item.metadata.get("page_id", item.title)),
                        title=item.title,
                        url=item.url,
                        space=item.metadata.get("space", "ENG"),
                    )
                )

        return RelatedContext(
            jira_issues=jira_issues,
            confluence_pages=confluence_pages,
        )
    except Exception:
        return RelatedContext(
            jira_issues=[],
            confluence_pages=[],
        )
