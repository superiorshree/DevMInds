# File:        backend/app/ai/__init__.py
# Owner:       Devyani
# Purpose:     Stub AI module — to be replaced with real implementation.
# Contains:    get_ai_service() returning AIService with fake answer() and health(); re-exports the frozen
#              AIAnswer / AIError contracts from app.schemas.contracts (no local duplicates).
# Status:      STUB, to be replaced by Devyani (real providers live behind app/ai/base.py + gateway.py).
# Depends on:  backend/app/schemas/contracts.py (AIAnswer, AIError — frozen)

from typing import Literal

from pydantic import BaseModel

# The frozen contract is the single definition: this module must never redeclare
# its own AIAnswer/AIError (duplicate interfaces drift out of sync).
from app.schemas.contracts import AIAnswer, AIError

__all__ = ["AIAnswer", "AIError", "AIService", "get_ai_service"]


class AIService(BaseModel):
    """Interface for the AI service (Ollama or external LLM)."""

    async def answer(self, question: str, repository_context: dict, company_context: list[dict], mode: str) -> AIAnswer:
        """Fake answer — always returns a canned response."""
        return AIAnswer(
            answer=f"MOCK AI: {question}",
            provider="ollama" if mode == "open_source" else "external",
        )

    async def health(self) -> dict[str, Literal["up", "down", "model_missing", "not_configured"]]:
        """Fake health check — Ollama up, external down by default."""
        return {"ollama": "up", "external": "down"}


def get_ai_service() -> AIService:
    """Return a (singleton) AIService instance."""
    return AIService()