# File:        backend/app/services/architecture_service.py
# Owner:       Devyani
# Purpose:     Turns analyzer facts into the mode-aware architecture explanation the extension displays.
# Contains:    get_architecture() — runs the real analyzer (GitHub) and fills the mode-dependent block.
# Status:      REAL for the mode-aware wiring (analyzer + mode tailoring); AI-written prose still TODO(Devyani).
# Depends on:  backend/app/schemas/architecture.py, backend/app/services/repository_analyzer.py, backend/app/prompts/
# Contains:    get_architecture(): gets facts from the analyzer, asks the architecture agent to explain them, and returns facts only if the AI is unavailable.
# Status:      REAL for the AI explanation; contributor_guide and related_context content still come from other tasks (see TODOs).
# Depends on:  backend/app/schemas/architecture.py, backend/app/services/repository_analyzer.py, backend/app/agents/architecture.py, backend/app/ai/errors.py

"""Architecture service.

Uses the shared analyzer for facts, then the architecture agent to explain
them in simple words. If the AI is unavailable the verified facts are still
returned, so the repository cards keep working. We never fall back to
another AI provider.
"""

import asyncio

from app.agents.architecture import AIServiceError, explain_architecture, isolate_for_mode
from app.ai.errors import PrivateAIUnavailable
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
def get_architecture(owner: str, name: str, branch: str, mode: UserMode) -> ArchitectureBundle:
    """Return the architecture bundle for a repo, tailored to the server-side mode."""
    facts = analyze_repository(owner, name, branch)

    # Company mode is treated as private so the gateway uses Ollama only.
    # TODO(Shreyansh): pass the real repository visibility from the analyzer.
    visibility = "private" if mode == UserMode.company else "public"
    repository_context = {"visibility": visibility, "analysis": {}, "files": []}

    # TODO(Devyani): fill contributor_guide (ai/contributor-guide task) and
    # related_context (ai/context-service task) with real data.
    try:
        return asyncio.run(explain_architecture(facts, repository_context, [], mode))
    except (AIServiceError, PrivateAIUnavailable):
        return isolate_for_mode(facts, mode)
