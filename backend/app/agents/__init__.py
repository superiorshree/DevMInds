# File:        backend/app/agents/__init__.py
# Owner:       Devyani
# Purpose:     Package for the prompt-driven AI agents: Architecture Agent, Mentor Agent, and Workflow Agent.
# Contains:    Exports for explain_architecture, isolate_for_mode, MentorAgent, answer_mentor_question.
# Status:      REAL

"""AI Agents package for DevMinds."""

from app.agents.architecture import (
    AIServiceError,
    explain_architecture,
    isolate_for_mode,
)
from app.agents.mentor import (
    MentorAgent,
    answer_mentor_question,
    get_mentor_agent,
)

__all__ = [
    "AIServiceError",
    "explain_architecture",
    "isolate_for_mode",
    "MentorAgent",
    "answer_mentor_question",
    "get_mentor_agent",
]
