# File:        backend/app/services/architecture_service.py
# Owner:       Devyani
# Purpose:     Turns analyzer facts into the mode-aware architecture explanation the extension displays.
# Contains:    get_architecture() — runs the real analyzer (GitHub) and fills the mode-dependent block.
# Status:      REAL for the mode-aware wiring (analyzer + mode tailoring); AI-written prose still TODO(Devyani).
# Depends on:  backend/app/schemas/architecture.py, backend/app/services/repository_analyzer.py, backend/app/prompts/

"""Architecture service.

Uses the shared analyzer for facts, then applies the AI service to explain them
in simple words. Fills the mode-dependent block: contributor_guide (open_source
mode) or related_context (company mode).
"""

from app.core.modes import UserMode
from app.schemas.architecture import ArchitectureBundle
from app.services.repository_analyzer import analyze_repository


def get_architecture(
    owner: str,
    name: str,
    branch: str,
    mode: UserMode,
    github_token: str = "",
) -> ArchitectureBundle:
    """Return the architecture bundle for a repo, tailored to the server-side mode.

    ``github_token`` is the signed-in user's token, used on the server only.
    """
    # TODO(Devyani): use the AI service + prompts/ to write the plain-English
    # overview and descriptions on top of these facts. Validate structured
    # output with the Pydantic models.
    bundle = analyze_repository(owner, name, branch, github_token)

    if mode == UserMode.open_source:
        # TODO(Devyani): populate contributor_guide from repo issues/maintainers.
        bundle.related_context = None
    else:
        # TODO(Devyani): populate related_context from the context service.
        bundle.contributor_guide = None

    return bundle
