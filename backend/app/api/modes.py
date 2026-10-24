# File:        backend/app/api/modes.py
# Owner:       Shreyansh
# Purpose:     Routes to read and switch the current user's mode, returning the feature list the frontend renders.
# Contains:    FastAPI APIRouter with GET /api/me/mode and PUT /api/me/mode.
# Status:      REAL — GET returns the session user's mode; PUT requires the session and persists the new mode server-side.
# Depends on:  backend/app/core/modes.py, backend/app/core/security.py, backend/app/schemas/common.py

"""Mode routes.

GET returns the mode + features so the extension knows what to render. PUT
switches mode. Switching is UX only — every gated endpoint still re-checks the
server-side mode with require_feature().
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.modes import CurrentUser, UserMode, features_for_mode
from app.core.security import get_current_user, update_user_mode
from app.schemas.common import ModeFeatures, ModeRequest, ModeResponse

router = APIRouter(prefix="/api/me", tags=["mode"])


@router.get("/mode", response_model=ModeResponse)
def get_mode(user: CurrentUser = Depends(get_current_user)) -> ModeResponse:
    """Return the server-side mode and its feature flags."""
    return ModeResponse(mode=user.mode.value, features=ModeFeatures(**features_for_mode(user.mode)))


@router.put("/mode", response_model=ModeResponse)
def put_mode(
    body: ModeRequest, user: CurrentUser = Depends(get_current_user)
) -> ModeResponse:
    """Switch the signed-in user's server-side mode and return the new flags.

    Requires a session (the mode belongs to a user) and persists server-side,
    so the next GET /api/me/mode and every require_feature() check see it.
    Switching never grants access by itself — each gated route re-checks.
    """
    try:
        new_mode = UserMode(body.mode)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown mode: {body.mode}")

    updated = update_user_mode(user, new_mode)
    return ModeResponse(
        mode=updated.mode.value,
        features=ModeFeatures(**features_for_mode(updated.mode)),
    )
