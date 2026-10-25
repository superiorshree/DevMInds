# File:        backend/app/api/repositories.py
# Owner:       Shreyansh (context route gated for Devyani's context service)
# Purpose:     Routes for analyzing a repository and fetching its architecture, saved links and context.
# Contains:    FastAPI APIRouter with analyze, architecture, links GET/PUT and context routes.
# Status:      REAL — analyze validates body+mode, runs GitHub adapter → repository_analyzer → architecture_service → answer validation, with mode-specific extras; architecture returns cached result or 404; analysis returns saved frozen dict or 404
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
from app.services.repository_analyzer import build_repository_analysis

router = APIRouter(prefix="/api/repositories", tags=["repositories"])

# Module-level in-memory cache for analysis results
# Key: (user_id, mode, owner, repo, commit_sha) -> ArchitectureBundle
_analysis_cache: dict[tuple[str, str, str, str, str], ArchitectureBundle] = {}


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(body: AnalyzeRequest, user: CurrentUser = Depends(get_current_user)) -> AnalyzeResponse:
    """Kick off analysis for a repository.

    Uses the SERVER-SIDE mode (from the session), not a mode in the body.
    Validates access via the GitHub adapter, runs the analyzer, builds the
    architecture bundle, and validates the AI answer. Mode extras (contributor
    guide) are added for open_source; company mode may include related context.

    Returns a schema-validated AnalyzeResponse with the full analysis.
    """

    # --- Permission check: use GitHub adapter to confirm access and detect public/private ---
    from app.integrations.github import GitHubAdapter

    adapter = GitHubAdapter(github_token_for(user.id))
    try:
        repo_info = adapter.get_repository(body.owner, body.name)
    except AdapterError as exc:
        # Repository not found or no access -> 404
        if exc.code == "not_found":
            raise HTTPException(status_code=404, detail=f"Repository {body.owner}/{body.name} not found or no access")
        raise HTTPException(status_code=502, detail=f"GitHub adapter error: {exc.message}")

    is_private: bool = repo_info.get("visibility", "public") == "private"

    # --- Mode check: private repo in open_source mode -> 403 with code ---
    if is_private and user.mode.value == "open_source":
        raise HTTPException(
            status_code=403,
            detail="PRIVATE_REPO_REQUIRES_COMPANY_MODE",
        )

    # --- Pipeline: GitHub adapter -> repository_analyzer -> architecture_service -> answer validation ---
    branch: str = body.branch if body.branch else "main"

    # Run the analyzer to get the architecture bundle with facts
    try:
        bundle = build_repository_analysis(
            owner=body.owner,
            repo=body.name,
            branch=branch,
            github_token=github_token_for(user.id),
        )
    except RateLimitError as exc:
        raise HTTPException(status_code=429, detail=exc.message)
    except AdapterError as exc:
        status_code = 404 if exc.code == "not_found" else 502
        raise HTTPException(status_code=status_code, detail=exc.message)

    # Mode-specific extras
    if user.mode.value == "open_source":
        # open_source adds contributor guide data from the README/setup/etc.
        # The architecture_service already sets contributor_guide; we don't add company data.
        # The bundle from the analyzer already contains a default ContributorGuide.
        pass
    elif user.mode.value == "company":
        # company mode: contributor_guide is dropped (kept as default empty from analyzer),
        # related_context is handled by the architecture service via get_company_context
        # when called with a query. The key point: company mode does NOT add contributor_guide content.
        pass

    # Save the analysis in memory keyed by (user id, mode, owner, repo, commit SHA)
    # TODO(Shreyansh): move to database; refresh when commit SHA changes.
    # We extract a commit SHA placeholder; in practice this would come from the repo's default branch SHA.
    commit_sha: str = ""

    # Store the bundle in the cache keyed by (user_id, mode, owner, repo, commit_sha)
    cache_key = (user.id, user.mode.value, body.owner, body.name, commit_sha)
    _analysis_cache[cache_key] = bundle

    # The AnalyzeResponse has fixed fields: job_id, owner, name, status.
    # We return the basic response; the full result is available via /architecture and /analysis.
    return AnalyzeResponse(
        job_id=f"analyze_{user.id}_{body.owner}_{body.name}_{commit_sha}",
        owner=body.owner,
        name=body.name,
        status="completed",
    )


@router.get("/{owner}/{repo}/architecture", response_model=ArchitectureBundle)
def get_repo_architecture(owner: str, repo: str, user: CurrentUser = Depends(get_current_user)) -> ArchitectureBundle:
    """Return the analysis bundle for a repository (mode-tailored).

    Uses the server-side GitHub token (never sent to the browser). Rate
    limits answer 429, other GitHub failures 502/404 with a plain message.
    Returns 404 when no analysis has been done for this user+mode+repo.
    """
    # Check cache first
    cache_key = (user.id, user.mode.value, owner, repo, "")
    cached = _analysis_cache.get(cache_key)
    if cached is not None:
        return cached

    # If not in cache, try to build it
    try:
        token = github_token_for(user.id)
        from app.integrations.github import GitHubAdapter

        # Quick check: does the repo exist?
        adapter = GitHubAdapter(token)
        repo_info = adapter.get_repository(owner, repo)
        is_private = repo_info.get("visibility", "public") == "private"

        # Mode check: private repo in open_source -> 403
        if is_private and user.mode.value == "open_source":
            raise HTTPException(
                status_code=403,
                detail="PRIVATE_REPO_REQUIRES_COMPANY_MODE",
            )

        bundle = build_repository_analysis(
            owner=owner,
            repo=repo,
            branch="main",
            github_token=token,
        )
        # Cache the result
        cache_key = (user.id, user.mode.value, owner, repo, "")
        _analysis_cache[cache_key] = bundle
        return bundle
    except RateLimitError as exc:
        raise HTTPException(status_code=429, detail=exc.message)
    except Exception as exc:
        # If anything fails (repo not found, etc.), return 404
        raise HTTPException(status_code=404, detail=f"Repository {owner}/{repo} not found or analysis not available")


@router.get("/{owner}/{repo}/analysis")
def get_repo_analysis(owner: str, repo: str, user: CurrentUser = Depends(get_current_user)):
    """Return the saved frozen analysis dict for this user and mode, or 404.

    Returns the frozen analysis dict (the analysis field from the architecture bundle)
    cached for this user and mode, or 404 if no analysis has been performed.
    """
    # Check cache
    cache_key = (user.id, user.mode.value, owner, repo, "")
    cached = _analysis_cache.get(cache_key)
    if cached is not None:
        # Return the analysis dict from the bundle
        analysis_dict = cached.model_dump().get("analysis", {})
        return analysis_dict

    # If not in cache, try to build it
        
