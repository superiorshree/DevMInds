# File:        backend/app/core/security.py
# Owner:       Shreyansh
# Purpose:     Handles authentication and the server-side notion of the current user.
# Contains:    get_current_user() (stub), create_session_token(), verify_session_token() stubs.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/core/config.py, backend/app/core/modes.py, backend/app/database/models.py

"""Authentication helpers.

Authentication answers "who is this?" (GitHub OAuth session). Authorization
answers "what may they do?" — that lives in core/modes.py.

The backend must never trust a mode value sent by the frontend; the mode used
for authorization always comes from the current user loaded here.
"""

from app.core.modes import CurrentUser, UserMode


def get_current_user() -> CurrentUser:
    """Return the signed-in user for this request (server-side mode).

    STUB: returns a fixed user so the skeleton runs without real OAuth. In real
    code this reads the session cookie / bearer token and loads the user row.
    """
    # TODO(Shreyansh): implement real session lookup — parse the session token,
    # load the user from the database, and return their persisted mode. Raise
    # HTTP 401 when the token is missing, malformed or expired.
    return CurrentUser(
        id="usr_stub",
        github_login="stub-user",
        avatar_url="",
        mode=UserMode.OPEN_CONTRIBUTOR,
    )


def create_session_token(user_id: str) -> str:
    """Create a session token for a user.

    TODO(Shreyansh): implement real session issuance after GitHub OAuth.
    """
    raise NotImplementedError("TODO(Shreyansh): real session issuance")


def verify_session_token(token: str) -> str | None:
    """Verify a session token and return the user id, or None if invalid.

    TODO(Shreyansh): implement real session verification.
    """
    raise NotImplementedError("TODO(Shreyansh): real session verification")
