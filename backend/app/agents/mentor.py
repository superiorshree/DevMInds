# File:        backend/app/agents/mentor.py
# Owner:       BLOCKED — no owner assigned yet (proposed: Devyani, AI services)
# Purpose:     Intended home for the mentor agent that answers repo questions in plain English with cited sources (the "friendly mentor" behavior).
# Contains:    Nothing yet — no functions or classes until the interface decision below is made.
# Status:      BLOCKED — required by the task plan, but its signature is ambiguous; recorded as a blocker rather than guessed.
# Depends on:  (proposed) backend/app/ai/ gateway, backend/app/prompts/, backend/app/schemas/contracts.py (AIAnswer), backend/app/schemas/common.py (ChatResponse)

"""Mentor agent — skeleton only, no behavior.

Why nothing is defined here yet:

* The plan lists `backend/app/agents/mentor.py`, but no guide or contract
  defines its interface (inputs, return type, which prompts it may use).
* `app/services/chat_service.py` (owner: Devyani) already owns answering:
  `answer_question(owner, name, question, mode) -> ChatResponse` gathers the
  context this mode is allowed to see and must return real `sources[]`.
  A second answering path here would be a duplicate service.
* The privacy rule is fixed and must not be re-invented: private repository and
  company integration data go to Ollama only, with **no** fallback to the
  external AI after a private provider failure. That routing belongs to the one
  AI service (`app/ai/`), not to a new module here.

DECISION NEEDED FROM THE OWNER (record this before implementing):
    A. Does the mentor agent replace the internals of
       `services/chat_service.answer_question()`, or sit beside it?
    B. What is the exact signature and return type (must reuse
       `app.schemas.common.ChatResponse` / `app.schemas.contracts.AIAnswer`)?
    C. Who owns this file and `app/agents/`?

TODO(owner): answer A-C in the team chat, update docs/TEAM_RESPONSIBILITIES.md
and CODEOWNERS, then implement against the agreed contract.
"""
