# File:        backend/app/api/chat.py
# Owner:       Devyani
# Purpose:     Route for asking a question about a repository and getting an AI answer with sources.
# Contains:    FastAPI APIRouter with POST /api/chat.
# Status:      REAL — calls the async chat service, passes the server-side token, maps rate limits to 429 and provider failures to 502.
# Depends on:  backend/app/services/chat_service.py, backend/app/schemas/common.py,
#              backend/app/core/security.py (get_current_user, github_token_for), backend/app/integrations/base.py (errors)

"""Chat route.

Available in both modes. Uses the SERVER-SIDE mode (from the session), never a
mode in the request body, to decide what context the answer may cite.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.modes import CurrentUser
from app.core.security import get_current_user, github_token_for
from app.integrations.base import AdapterError, RateLimitError
from app.schemas.common import ChatRequest, ChatResponse
from app.services.chat_service import answer_question

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(body: ChatRequest, user: CurrentUser = Depends(get_current_user)) -> ChatResponse:
    """Answer a question about a repository, citing sources.

    The SERVER-SIDE mode decides what context the answer may cite — never a
    mode value from the body. GitHub rate limits answer 429; failures from an
    upstream provider answer 502 with a plain message.
    """
    try:
        return await answer_question(
            body.owner,
            body.name,
            body.question,
            mode=user.mode,
            github_token=github_token_for(user.id),
        )
    except RateLimitError as exc:
        raise HTTPException(status_code=429, detail=exc.message)
    except AdapterError as exc:
        status_code = 404 if exc.code == "not_found" else 502
        raise HTTPException(status_code=status_code, detail=exc.message)
