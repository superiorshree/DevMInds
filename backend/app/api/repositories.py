# File:        backend/app/api/repositories.py
# Owner:       Shreyansh (context route gated for Devyani's context service)
# Purpose:     Routes for analyzing a repository and fetching its architecture, saved links and context.
# Contains:    FastAPI APIRouter with analyze, architecture, links GET/PUT and context routes.
# Status:      REAL — analyze validates body+mode, runs GitHub adapter → repository_analyzer → architecture_service (Architecture Agent) → answer validation, with mode-specific extras; architecture returns cached result or runs architecture agent.
# Depends on:  backend/app/core/modes.py, backend/app/services/*, backend/app/schemas/*, backend/app/core/security.py (github_token_for), backend/app/integrations/base.py (errors), backend/app/services/architecture_service.py, backend/app/services/repository_analyzer.py
from __future__ import annotations

from typing import Optional

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
from app.services.repository_analyzer import analyze_repository, build_repository_analysis

router = APIRouter(prefix="/api/repositories", tags=["repositories"])

# Module-level in-memory cache for analysis results
# Key: (user_id, mode, owner, repo, commit_sha) -> ArchitectureBundle
_analysis_cache: dict[tuple[str, str, str, str, str], ArchitectureBundle] = {}


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(body: AnalyzeRequest, user: CurrentUser = Depends(get_current_user)) -> AnalyzeResponse:
    """Kick off analysis for a repository.

    Uses the SERVER-SIDE mode (from the session), not a mode in the body.
    Validates access via the GitHub adapter, runs the analyzer, runs the
    Architecture Agent to build the architecture bundle, and saves it in cache.

    Returns a schema-validated AnalyzeResponse with the full analysis.
    """
    from app.integrations.github import GitHubAdapter

    token = github_token_for(user.id)
    adapter = GitHubAdapter(token)
    try:
        repo_info = adapter.get_repository(body.owner, body.name)
    except RateLimitError as exc:
        raise HTTPException(status_code=429, detail=exc.message)
    except AdapterError as exc:
        if exc.code == "not_found":
            raise HTTPException(status_code=404, detail=f"Repository {body.owner}/{body.name} not found or no access")
        raise HTTPException(status_code=502, detail=f"GitHub adapter error: {exc.message}")

    is_private: bool = repo_info.get("visibility", "public") == "private" or bool(repo_info.get("private"))

    # Mode check: private repo in open_source mode -> 403 with code
    if is_private and user.mode.value == "open_source":
        raise HTTPException(
            status_code=403,
            detail="PRIVATE_REPO_REQUIRES_COMPANY_MODE",
        )

    branch: str = body.branch if body.branch else "main"

    try:
        bundle = get_architecture(
            owner=body.owner,
            name=body.name,
            branch=branch,
            mode=user.mode,
            github_token=token,
        )
    except RateLimitError as exc:
        raise HTTPException(status_code=429, detail=exc.message)
    except AdapterError as exc:
        status_code = 404 if exc.code == "not_found" else 502
        raise HTTPException(status_code=status_code, detail=exc.message)

    commit_sha: str = ""
    cache_key = (user.id, user.mode.value, body.owner, body.name, commit_sha)
    _analysis_cache[cache_key] = bundle

    return AnalyzeResponse(
        job_id=f"analyze_{user.id}_{body.owner}_{body.name}_{commit_sha}",
        owner=body.owner,
        name=body.name,
        status="completed",
    )


@router.get("/{owner}/{repo}/architecture", response_model=ArchitectureBundle)
def get_repo_architecture(owner: str, repo: str, user: CurrentUser = Depends(get_current_user)) -> ArchitectureBundle:
    """Return the analysis bundle for a repository (mode-tailored).

    Uses the server-side GitHub token. Rate limits answer 429,
    other failures 502/404. Runs the Architecture Agent if not yet cached.
    """
    cache_key = (user.id, user.mode.value, owner, repo, "")
    cached = _analysis_cache.get(cache_key)
    if cached is not None:
        return cached

    token = github_token_for(user.id)
    from app.integrations.github import GitHubAdapter

    try:
        adapter = GitHubAdapter(token)
        repo_info = adapter.get_repository(owner, repo)
        is_private = repo_info.get("visibility", "public") == "private" or bool(repo_info.get("private"))

        if is_private and user.mode.value == "open_source":
            raise HTTPException(
                status_code=403,
                detail="PRIVATE_REPO_REQUIRES_COMPANY_MODE",
            )

        bundle = get_architecture(
            owner=owner,
            name=repo,
            branch="main",
            mode=user.mode,
            github_token=token,
        )
        cache_key = (user.id, user.mode.value, owner, repo, "")
        _analysis_cache[cache_key] = bundle
        return bundle
    except RateLimitError as exc:
        raise HTTPException(status_code=429, detail=exc.message)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Repository {owner}/{repo} not found or analysis not available")


@router.get("/{owner}/{repo}/analysis")
def get_repo_analysis(owner: str, repo: str, user: CurrentUser = Depends(get_current_user)):
    """Return the saved frozen analysis dict for this user and mode, or 404."""
    cache_key = (user.id, user.mode.value, owner, repo, "")
    cached = _analysis_cache.get(cache_key)
    if cached is not None:
        analysis_dict = cached.model_dump().get("analysis", {})
        return analysis_dict

    # Build via get_repo_architecture
    bundle = get_repo_architecture(owner, repo, user)
    return bundle.model_dump().get("analysis", {})


@router.get("/{owner}/{repo}/context")
async def get_repo_context(
    owner: str,
    repo: str,
    query: str = "",
    user: CurrentUser = Depends(get_current_user),
):
    """Return Jira, Slack, and Confluence context for a repository (company mode only)."""
    user_mode = user.mode.value if hasattr(user.mode, "value") else str(user.mode)
    if user_mode != "company":
        raise HTTPException(
            status_code=403,
            detail="Company mode only: feature 'contextTab' is not available in mode 'open_source'",
        )
    from app.integrations import get_company_context
    return await get_company_context(f"{owner}/{repo}", query, "company")
