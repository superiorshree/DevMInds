# File:        backend/app/services/architecture_service.py
# Owner:       Devyani
# Purpose:     Turns analyzer facts into the mode-aware architecture explanation the extension displays.
# Contains:    get_architecture() function returning a mock ArchitectureBundle for now.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/schemas/architecture.py, backend/app/services/repository_analyzer.py, backend/app/prompts/

"""Architecture service.

Uses the shared analyzer for facts, then applies the AI service to explain them
in simple words. Fills the mode-dependent block: contributor_guide (open_source
mode) or related_context (company mode).
"""

from app.core.modes import UserMode
from app.schemas.architecture import ArchitectureBundle
from app.services.repository_analyzer import analyze_repository


def get_architecture(owner: str, name: str, branch: str, mode: UserMode) -> ArchitectureBundle:
    """Return the architecture bundle for a repo, tailored to the server-side mode."""
    # TODO(Devyani): call analyze_repository() for facts, then use the AI
    # service + prompts/ to write the plain-English overview and descriptions.
    # Fill contributor_guide for open_source and related_context for
    # company. Validate structured output with the Pydantic models.
    bundle = analyze_repository(owner, name, branch)

    if mode == UserMode.open_source:
        # TODO(Devyani): populate contributor_guide from repo issues/maintainers.
        bundle.related_context = None
    else:
        # TODO(Devyani): populate related_context from the context service.
        bundle.contributor_guide = None

    return bundle
