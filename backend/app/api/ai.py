# File:        backend/app/api/ai.py
# Owner:       Shreyansh
# Purpose:     Routes for AI status and provider health.
# Contains:    FastAPI APIRouter with GET /api/ai/status returning get_ai_service().health().
# Status:      REAL — reports Ollama and external provider health from get_ai_service().health().
# Depends on:  backend/app/ai/__init__.py (get_ai_service), backend/app/core/security.py (get_current_user)

"""AI routes.

Provides endpoints to query the AI provider health.
"""

from fastapi import APIRouter, Depends

from app.ai import get_ai_service
from app.core.modes import CurrentUser
from app.core.security import get_current_user

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/status")
async def ai_status(user: CurrentUser = Depends(get_current_user)) -> dict[str, str]:
    """Return health status of the AI providers (Ollama and external)."""
    return await get_ai_service().health()
