# File:        backend/app/api/repositories.py
# Owner:       Shreyansh (context route gated for Devyani's context service)
# Purpose:     Routes for analyzing a repository and fetching its architecture, saved links and context.
# Contains:    FastAPI APIRouter with analyze, architecture, links GET/PUT and context routes.
# Status:      REAL for the architecture route (real GitHub analysis + 429/502 mapping); analyze/links/context still stubs with TODOs.
# Depends on:  backend/app/core/modes.py, backend/app/services/*, backend/app/schemas/*,
#              backend/app/core/security.py (github_token_for), backend/app/integrations/base.py (errors)

"""Repository routes.

Analyze and architecture are available in both modes. The context route is
COMPANY ONLY and uses require_feature("contextTab") so it returns 403 in Open
Contributor mode. Analyze uses the SERVER-SIDE mode, never a mode in the body.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.modes import CurrentUser, require_feature
from app.core.security import get_current_user, github_token_for
from app.schemas.architecture import ArchitectureBundle
from app.schemas.common import (
    AnalyzeRequest,
    AnalyzeResponse,
    LinkList,
)
from app.integrations.base import AdapterError, RateLimitError
from app.services.architecture_service import get_architecture
from app.services.context_service import get_related_context

router = APIRouter(prefix="/api/repositories", tags=["repositories"])


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(body: AnalyzeRequest, user: CurrentUser = Depends(get_current_user)) -> AnalyzeResponse:
    """Kick off analysis for a repository.

    Uses the SERVER-SIDE mode (from the session), not a mode in the body.
    """
    # TODO(Shreyansh): if the repo is private, require feature "privateRepos"
    # (403 otherwise). Queue the real analyzer and return a job id. For now,
    # return a stub job so the shape is stable.
    _ = user.mode
    return AnalyzeResponse(
        job_id="job_stub",
        owner=body.owner,
        name=body.name,
        status="queued",
    )


@router.get("/{owner}/{repo}/architecture", response_model=ArchitectureBundle)
def get_repo_architecture(
    owner: str, repo: str, user: CurrentUser = Depends(get_current_user)
) -> ArchitectureBundle:
    """Return the analysis bundle for a repository (mode-tailored).

    Uses the server-side GitHub token (never sent to the browser). Rate
    limits answer 429, other GitHub failures 502/404 with a plain message.
    """
    # TODO(Shreyansh): load the cached analysis (404 when not analyzed yet).
    try:
        return get_architecture(
            owner,
            repo,
            branch="main",
            mode=user.mode,
            github_token=github_token_for(user.id),
        )
    except RateLimitError as exc:
        raise HTTPException(status_code=429, detail=exc.message)
    except AdapterError as exc:
        status_code = 404 if exc.code == "not_found" else 502
        raise HTTPException(status_code=status_code, detail=exc.message)


@router.get("/{owner}/{repo}/links", response_model=LinkList)
def get_links(owner: str, repo: str) -> LinkList:
    """Return the saved source links for a repository.

    TODO(Shreyansh): load links from the database for this user + repo.
    """
    return LinkList(owner=owner, name=repo, links=[])


@router.put("/{owner}/{repo}/links", response_model=LinkList)
def put_links(owner: str, repo: str, body: LinkList) -> LinkList:
    """Save/update the source links for a repository.

    TODO(Shreyansh): persist the links to the database.
    """
    return LinkList(owner=owner, name=repo, links=body.links)


@router.get("/{owner}/{repo}/context")
def get_repo_context(owner: str, repo: str, _: CurrentUser = Depends(require_feature("contextTab"))):
    """Return Jira + Confluence context (COMPANY ONLY).

    Returns HTTP 403 in Open Contributor mode.
    """
    # TODO(Shreyansh): verify the repo exists, then delegate to the context
    # service. Do not leak company context to contributor mode.
    return get_related_context(owner, repo)
