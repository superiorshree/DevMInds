# File:        backend/app/services/architecture_service.py
# Owner:       Devyani
# Purpose:     Turns analyzer facts into the mode-aware architecture explanation the extension displays.
# Contains:    get_architecture(): gets facts from the analyzer, asks the architecture agent to explain them, and returns facts only if the AI is unavailable.
# Status:      REAL — executes the architecture agent on facts and isolates mode-specific blocks.
# Depends on:  backend/app/schemas/architecture.py, backend/app/services/repository_analyzer.py, backend/app/agents/architecture.py, backend/app/ai/errors.py

"""Architecture service.

Uses the shared analyzer for facts, then the architecture agent to explain
them in simple words. If the AI is unavailable the verified facts are still
returned, so the repository cards keep working. We never fall back to
another AI provider.
"""

import asyncio
import concurrent.futures
import inspect

from app.agents.architecture import AIServiceError, explain_architecture, isolate_for_mode
from app.ai.errors import PrivateAIUnavailable
from app.core.modes import UserMode
from app.schemas.architecture import ArchitectureBundle
from app.services.repository_analyzer import analyze_repository


def get_architecture(
    owner: str,
    name: str,
    branch: str = "main",
    mode: UserMode = UserMode.open_source,
    github_token: str = "",
) -> ArchitectureBundle:
    """Return the architecture bundle for a repo, tailored to the server-side mode.

    ``github_token`` is the signed-in user's token, used on the server only.
    """
    mode = UserMode(mode) if not isinstance(mode, UserMode) else mode
    res = analyze_repository(owner, name, branch, github_token)

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if inspect.iscoroutine(res):
        if loop and loop.is_running():
            with concurrent.futures.ThreadPoolExecutor() as executor:
                facts = executor.submit(asyncio.run, res).result()
        else:
            facts = asyncio.run(res)
    else:
        facts = res

    if mode == UserMode.company and getattr(facts, "related_context", None) is None:
        try:
            from app.services.context_service import get_related_context
            facts.related_context = get_related_context(owner, name)
        except Exception:
            pass

    # Company mode is treated as private so the gateway uses Ollama only.
    visibility = "private" if mode == UserMode.company else "public"
    repository_context = {"visibility": visibility, "analysis": {}, "files": []}

    try:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            with concurrent.futures.ThreadPoolExecutor() as executor:
                return executor.submit(
                    asyncio.run, explain_architecture(facts, repository_context, [], mode)
                ).result()
        else:
            return asyncio.run(explain_architecture(facts, repository_context, [], mode))
    except (AIServiceError, PrivateAIUnavailable, Exception):
        return isolate_for_mode(facts, mode)
