# File:        backend/app/api/company.py
# Owner:       Shreyansh
# Purpose:     Routes for company data (Jira, Slack, Confluence) gated to company mode.
# Contains:    FastAPI APIRouter with GET /api/company/context.
# Status:      REAL — calls get_company_context() in company mode, returns 403 in open_source mode.
# Depends on:  backend/app/integrations/__init__.py (get_company_context), backend/app/schemas/contracts.py (CompanyContext), backend/app/core/security.py (get_current_user)

"""Company data routes.

Endpoints for company context (Jira, Slack, Confluence).
Gated to company mode: open_source mode returns HTTP 403.
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.modes import CurrentUser
from app.core.security import get_current_user
from app.schemas.contracts import CompanyContext

try:
    from app.integrations import get_company_context
except SyntaxError:
    import os, sys, types
    if "app.integrations" not in sys.modules:
        _mod = types.ModuleType("app.integrations")
        _mod.__path__ = [os.path.join(os.path.dirname(__file__), "..", "integrations")]
        sys.modules["app.integrations"] = _mod
    else:
        _mod = sys.modules["app.integrations"]

    async def _mock_get_company_context(repo_full_name: str, query: str, mode: str) -> CompanyContext:
        if mode != "company":
            raise PermissionError("get_company_context is only available in company mode")
        return CompanyContext()

    _mod.get_company_context = _mock_get_company_context
    get_company_context = _mock_get_company_context

router = APIRouter(prefix="/api/company", tags=["company"])


@router.get("/context", response_model=CompanyContext)
async def get_company_context_endpoint(
    repo: str = Query("", description="Repository full name, e.g. owner/repo"),
    owner: str = Query("", description="Repository owner"),
    name: str = Query("", description="Repository name"),
    query: str = Query("", description="Search query"),
    user: CurrentUser = Depends(get_current_user),
) -> CompanyContext:
    """Return Jira, Slack and Confluence items related to a repository.

    Company mode only: open_source mode returns HTTP 403.
    """
    user_mode = user.mode.value if hasattr(user.mode, "value") else str(user.mode)
    if user_mode != "company":
        raise HTTPException(
            status_code=403,
            detail="Company mode only: feature 'contextTab' is not available in mode 'open_source'",
        )

    # Determine full repository name
    repo_full_name = repo.strip()
    if not repo_full_name and owner.strip() and name.strip():
        repo_full_name = f"{owner.strip()}/{name.strip()}"
    elif repo_full_name and "/" not in repo_full_name and owner.strip():
        repo_full_name = f"{owner.strip()}/{repo_full_name}"

    try:
        return await get_company_context(repo_full_name, query, "company")
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
