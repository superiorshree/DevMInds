# File:        backend/app/ai/__init__.py
# Owner:       Devyani
# Purpose:     Stub AI module — to be replaced with real implementation.
# Contains:    get_ai_service() returning AIService with fake answer() and health().
# Status:      STUB, to be replaced by Devyani.
# Depends on:  (none — this is the stub interface).

from typing import Literal

from pydantic import BaseModel


class AIError(BaseModel):
    code: Literal["PRIVATE_AI_UNAVAILABLE", "EXTERNAL_AI_NOT_ALLOWED", "AI_DISABLED", "PROVIDER_ERROR"]
    message: str


class AIAnswer(BaseModel):
    answer: str | None = None
    sources: list = []
    provider: Literal["ollama", "external"] | None = None
    error: AIError | None = None


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