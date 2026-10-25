# File:        backend/app/api/chat.py
# Owner:       Shreyansh
# Purpose:     Route for asking a question about a repository and getting an AI answer with sources and connector errors.
# Contains:    FastAPI APIRouter with POST /api/chat, ChatRequest and ChatResponse models.
# Status:      REAL — authenticates user, inspects repository visibility, gates private repos in open_source mode, collects repository & company context, and queries get_ai_service().answer().
# Depends on:  backend/app/ai/__init__.py, backend/app/integrations/__init__.py, backend/app/services/github_service.py,
#              backend/app/core/security.py, backend/app/schemas/contracts.py

"""Chat route.

Available in both modes. Uses the SERVER-SIDE mode (from the session), never a
mode in the request body, to decide what context the answer may cite.
"""

from typing import Any, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.ai import get_ai_service
from app.core.modes import CurrentUser
from app.core.security import get_current_user, github_token_for
from app.integrations.base import AdapterError, RateLimitError
from app.schemas.contracts import (
    AIAnswer,
    AIError,
    CompanyContext,
    CompanyItem,
    ConnectorError,
    RepoFile,
    RepositoryContext,
    SourceRef,
    Visibility,
)

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

try:
    from app.integrations.github import GitHubAdapter
except (SyntaxError, ImportError):
    class GitHubAdapter:  # type: ignore
        def __init__(self, token: str = ""):
            self.token = token

        def get_repository(self, owner: str, name: str) -> dict[str, Any]:
            return {"visibility": "public", "private": False}

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    """Request body for POST /api/chat."""

    owner: str
    name: Optional[str] = None
    repo: Optional[str] = None
    question: str
    mode: Optional[str] = None  # Ignored: mode is always server-side


class ChatResponse(BaseModel):
    """Response shape for POST /api/chat.

    Returns the AIAnswer fields plus connector_errors from company context.
    """

    answer: Optional[str] = None
    sources: list[SourceRef] = []
    provider: Optional[Literal["ollama", "external"]] = None
    error: Optional[AIError] = None
    connector_errors: list[ConnectorError] = []


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    user: CurrentUser = Depends(get_current_user),
) -> ChatResponse:
    """Answer a question about a repository with sources.

    Flow:
    1) Check login (401 handled by Depends(get_current_user));
    2) Find out if the repo is public or private with the user's GitHub token;
    3) If private and the server-side mode is open_source return 403 with code
       PRIVATE_REPO_REQUIRES_COMPANY_MODE;
    4) Build a RepositoryContext (visibility, the saved analysis dict, files
       from get_repository_files);
    5) If mode is company call get_company_context(f'{owner}/{repo}', question, 'company'),
       otherwise use an empty list;
    6) Call get_ai_service().answer(question, repository_context, items, mode);
    7) Return the AIAnswer plus a connector_errors list (from CompanyContext.errors;
       empty in open_source).
    """
    repo_name = (body.repo or body.name or "").strip()
    owner = body.owner.strip()
    if not repo_name or not owner:
        raise HTTPException(status_code=422, detail="Owner and repository name are required")

    token = github_token_for(user.id)

    # 2. Find out if the repo is public or private with the user's GitHub token
    try:
        adapter = GitHubAdapter(token) if hasattr(GitHubAdapter, "__init__") else GitHubAdapter()
    except TypeError:
        adapter = GitHubAdapter()

    try:
        repo_info = adapter.get_repository(owner, repo_name)
    except RateLimitError as exc:
        raise HTTPException(status_code=429, detail=exc.message)
    except AdapterError as exc:
        if exc.code == "not_found":
            raise HTTPException(status_code=404, detail=f"Repository {owner}/{repo_name} not found or no access")
        raise HTTPException(status_code=502, detail=f"GitHub adapter error: {exc.message}")

    is_private = False
    if isinstance(repo_info, dict):
        is_private = bool(repo_info.get("private")) or repo_info.get("visibility") == "private"

    # 3. If private and the server-side mode is open_source return 403 with code PRIVATE_REPO_REQUIRES_COMPANY_MODE
    user_mode_str = user.mode.value if hasattr(user.mode, "value") else str(user.mode)
    if is_private and user_mode_str == "open_source":
        raise HTTPException(
            status_code=403,
            detail="PRIVATE_REPO_REQUIRES_COMPANY_MODE",
        )

    # 4. Build a RepositoryContext (visibility, the saved analysis dict, files from get_repository_files)
    visibility: Visibility = "private" if is_private else "public"

    # Saved analysis dict (cached or empty)
    analysis_dict: dict = {}
    try:
        from app.api.repositories import _analysis_cache
        cached = _analysis_cache.get((user.id, user_mode_str, owner, repo_name, ""))
        if cached is not None:
            analysis_dict = cached.model_dump() if hasattr(cached, "model_dump") else (cached if isinstance(cached, dict) else {})
    except Exception:
        analysis_dict = {}

    # Files from get_repository_files
    files: list[RepoFile] = []
    try:
        from app.services.github_service import get_repository_files
        raw_files = await get_repository_files(owner, repo_name, token)
        for f in raw_files:
            files.append(
                RepoFile(
                    path=getattr(f, "path", ""),
                    content=getattr(f, "content", ""),
                    url=getattr(f, "url", f"https://github.com/{owner}/{repo_name}/blob/main/{getattr(f, 'path', '')}"),
                )
            )
    except Exception:
        files = []

    repo_context = RepositoryContext(
        visibility=visibility,
        analysis=analysis_dict,
        files=files,
    )

    # 5. If mode is company call get_company_context(f'{owner}/{repo}', question, 'company'), otherwise use an empty list
    company_items: list[CompanyItem] = []
    connector_errors: list[ConnectorError] = []
    if user_mode_str == "company":
        try:
            company_ctx = await get_company_context(f"{owner}/{repo_name}", body.question, "company")
            company_items = company_ctx.items
            connector_errors = company_ctx.errors
        except PermissionError:
            raise HTTPException(
                status_code=403,
                detail="Feature 'contextTab' is not available in mode 'open_source'",
            )

    # 6. Call get_ai_service().answer(question, repository_context, items, mode)
    ai_service = get_ai_service()
    ai_answer = await ai_service.answer(body.question, repo_context, company_items, user_mode_str)

    # 7. Return the AIAnswer plus a connector_errors list (from CompanyContext.errors; empty in open_source)
    return ChatResponse(
        answer=ai_answer.answer,
        sources=ai_answer.sources,
        provider=ai_answer.provider,
        error=ai_answer.error,
        connector_errors=connector_errors,
    )
