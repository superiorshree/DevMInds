# File:        backend/app/agents/__init__.py
# Owner:       BLOCKED — no owner assigned yet (proposed: Devyani, AI services)
# Purpose:     Package for the prompt-driven AI agents the task plan lists (architecture agent, mentor agent), kept separate from services/ (orchestration) and ai/ (providers).
# Contains:    Nothing yet — no exports until the interface decision below is made.
# Status:      BLOCKED — the plan requires these modules, but no agreed contract defines their signatures; see the decision note in architecture.py.
# Depends on:  backend/app/ai/ (provider gateway), backend/app/prompts/, backend/app/schemas/contracts.py

"""AI agents package (skeleton).

Deliberately empty: `docs/TEAM_RESPONSIBILITIES.md`, `docs/ARCHITECTURE.md` and
`docs/API_CONTRACT.md` do not describe an `agents` layer, and no existing module
imports one. Exports will be added only after the owner confirms the interface,
so this package cannot shadow or duplicate `app.services` (the one analyzer /
architecture / context / chat service) or `app.ai` (the one AI service).

BLOCKER (needs an owner decision, see docs/TEAM_RESPONSIBILITIES.md):
    1. Is `agents/` a new layer, or is its work already owned by
       `services/architecture_service.py` / `services/chat_service.py`?
    2. Who owns the directory (CODEOWNERS has no `/backend/app/agents/` rule)?
"""
