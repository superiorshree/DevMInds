# File:        backend/app/api/chat.py
# Owner:       Devyani
# Purpose:     Route for asking a question about a repository and getting an AI answer with sources.
# Contains:    FastAPI APIRouter with POST /api/chat.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/services/chat_service.py, backend/app/schemas/common.py

"""Chat route.

Available in both modes. Uses the SERVER-SIDE mode (from the session), never a
mode in the request body, to decide what context the answer may cite.
"""

from fastapi import APIRouter

from app.core.security import get_current_user
from app.schemas.common import ChatRequest, ChatResponse
from app.services.chat_service import answer_question

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(body: ChatRequest) -> ChatResponse:
    """Answer a question about a repository, citing sources."""
    # TODO(Devyani): pass the SERVER-SIDE mode into the chat service. Never read
    # a mode value from the body. Surface LLM/provider failures as HTTP 502.
    user = get_current_user()
    return answer_question(body.owner, body.name, body.question, mode=user.mode)
