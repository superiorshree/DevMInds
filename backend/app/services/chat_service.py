# File:        backend/app/services/chat_service.py
# Owner:       Devyani
# Purpose:     Answers questions about a repository using the AI service, always with source links.
# Contains:    answer_question() function returning a mock ChatResponse for now.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/schemas/common.py (ChatResponse, SourceLink), backend/app/prompts/

"""Chat service.

One shared AI service answers repo questions. Every answer must include
non-empty sources[] so the extension can render a SourceCard per source. Uses
the SERVER-SIDE mode to decide what context is permitted (never a mode sent in
the request body).
"""

from app.core.modes import UserMode
from app.schemas.common import ChatResponse, SourceLink


def answer_question(owner: str, name: str, question: str, mode: UserMode) -> ChatResponse:
    """Answer a question about a repository, citing sources."""
    # TODO(Devyani): gather permitted context for THIS mode (GitHub always;
    # Jira/Confluence only in COMPANY_EMPLOYEE), build the prompt from
    # prompts/onboarding_prompt.md, call the AI service, validate the structured
    # output, and return an answer with real source URLs. Retry on malformed
    # output; surface provider errors as 502.
    return ChatResponse(
        answer=f"MOCK answer to '{question}' for {owner}/{name}. TODO(Devyani): real AI answer.",
        sources=[
            SourceLink(
                title="README.md",
                url=f"https://github.com/{owner}/{name}",
                sourceType="github_file",
            )
        ],
    )
