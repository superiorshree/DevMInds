# File:        backend/app/api/modes.py
# Owner:       Shreyansh
# Purpose:     Routes to read and switch the current user's mode, returning the feature list the frontend renders.
# Contains:    FastAPI APIRouter with GET /api/me/mode and PUT /api/me/mode.
# Status:      PARTIAL — GET /api/me/mode uses the real session user; PUT /api/me/mode is still a stub (later task).
# Depends on:  backend/app/core/modes.py, backend/app/core/security.py, backend/app/schemas/common.py

"""Mode routes.

GET returns the mode + features so the extension knows what to render. PUT
switches mode. Switching is UX only — every gated endpoint still re-checks the
server-side mode with require_feature().
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.modes import MODE_FEATURES, CurrentUser, UserMode, features_for_mode
from app.core.security import get_current_user
from app.schemas.common import ModeFeatures, ModeRequest, ModeResponse

router = APIRouter(prefix="/api/me", tags=["mode"])


@router.get("/mode", response_model=ModeResponse)
def get_mode(user: CurrentUser = Depends(get_current_user)) -> ModeResponse:
    """Return the server-side mode and its feature flags."""
    return ModeResponse(mode=user.mode.value, features=ModeFeatures(**features_for_mode(user.mode)))


@router.put("/mode", response_model=ModeResponse)
def put_mode(body: ModeRequest) -> ModeResponse:
    """Switch the user's mode and return the new feature flags."""
    try:
        new_mode = UserMode(body.mode)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown mode: {body.mode}")

    # TODO(Shreyansh): persist new_mode on the user row in the database. The
    # stub user cannot be persisted, so we only echo the resolved features.
    _ = MODE_FEATURES[new_mode]
    return ModeResponse(mode=new_mode.value, features=ModeFeatures(**features_for_mode(new_mode)))
