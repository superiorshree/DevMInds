# File:        backend/app/agents/architecture.py
# Owner:       BLOCKED — no owner assigned yet (proposed: Devyani, AI services)
# Purpose:     Intended home for the architecture-explaining agent (prompt assembly + structured-output call that turns analyzer facts into the plain-English ArchitectureBundle explanation).
# Contains:    Nothing yet — no functions or classes until the interface decision below is made.
# Status:      BLOCKED — required by the task plan, but its signature is ambiguous; recorded as a blocker rather than guessed.
# Depends on:  (proposed) backend/app/ai/ gateway, backend/app/prompts/contributor_prompt.md, backend/app/prompts/onboarding_prompt.md, backend/app/schemas/architecture.py

"""Architecture agent — skeleton only, no behavior.

Why nothing is defined here yet:

* The plan lists `backend/app/agents/architecture.py` as a module to inspect,
  but no guide or contract describes what it must export.
* `app/services/architecture_service.py` (owner: Devyani) already owns the
  architecture flow: `get_architecture(owner, name, branch, mode)` reads
  analyzer facts, applies the AI service and fills the mode-dependent block.
  A second architecture entry point here would duplicate that one service —
  which the plan explicitly forbids.
* Guessing a signature would create a competing interface that the merged
  `app/ai/*` modules (base/gateway/providers on origin/main) do not know about.

DECISION NEEDED FROM THE OWNER (record this before implementing):
    A. Does the architecture agent *replace* the AI call inside
       `services/architecture_service.get_architecture()`, or is it a separate
       step with its own input/output models?
    B. If separate: what is the exact signature and return type (must validate
       through `app/schemas/architecture.py`, not a new schema)?
    C. Who owns this file and `app/agents/`?

TODO(owner): answer A-C in the team chat, update docs/TEAM_RESPONSIBILITIES.md
and CODEOWNERS, then implement against the agreed contract.
"""
