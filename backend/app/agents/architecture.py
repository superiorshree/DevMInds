# File:        backend/app/agents/architecture.py
# Owner:       Devyani
# Purpose:     Turns verified repository facts into the plain-English architecture explanation by asking the AI gateway, then validates and grounds the reply against the facts.
# Contains:    AIServiceError, private reply models (_AIReply, _ArchitectureBlock), isolate_for_mode(), explain_architecture() and small helpers (prompt building, JSON parsing, grounding).
# Status:      REAL
# Depends on:  backend/app/ai/gateway.py (complete), backend/app/ai/errors.py, backend/app/core/modes.py (UserMode), backend/app/schemas/architecture.py, backend/app/prompts/contributor_prompt.md, backend/app/prompts/onboarding_prompt.md

"""Architecture agent.

The backend finds the facts, the AI explains them. This module:
1. fills the mode's prompt file with the facts,
2. calls gateway.complete() (never a provider directly),
3. parses and validates the JSON reply, retrying ONCE on bad output,
4. grounds the result: anything the facts do not contain is dropped.

The mode always comes from the caller (server side), never from the model.
"""

import json
import re
from collections.abc import Callable, Iterable
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel, Field

from app.ai import gateway
from app.ai.errors import PrivateAIUnavailable, ProviderError
from app.core.modes import UserMode
from app.schemas.architecture import ArchitectureBundle

PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts"

#: Which prompt file each mode uses.
PROMPT_FILES: dict[UserMode, str] = {
    UserMode.open_source: "contributor_prompt.md",
    UserMode.company: "onboarding_prompt.md",
}

QUESTION = "Explain the architecture of this repository in simple words."
MAX_SUMMARY_CHARS = 1000
NO_ANSWER_PREFIX = "I cannot find the answer"

T = TypeVar("T")


class AIServiceError(Exception):
    """The AI could not produce a usable architecture explanation."""


class _ArchitectureBlock(BaseModel):
    """The `architecture` part of the AI reply, as the prompt files describe it."""

    overview: str = "unknown"
    technologies: list[str] = Field(default_factory=list)
    entry_points: list[str] = Field(default_factory=list)
    components: list[str] = Field(default_factory=list)
    connections: list[str] = Field(default_factory=list)


class _AIReply(BaseModel):
    """The whole AI reply. Extra keys are ignored on purpose."""

    answer: str
    source_ids: list[str] = Field(default_factory=list)
    architecture: _ArchitectureBlock


def isolate_for_mode(bundle: ArchitectureBundle, mode: UserMode) -> ArchitectureBundle:
    """Return a copy with only the block this mode may see.

    open_source keeps contributor_guide and drops related_context.
    company keeps related_context and drops contributor_guide.
    """
    isolated = bundle.model_copy(deep=True)
    if UserMode(mode) == UserMode.open_source:
        isolated.related_context = None
    else:
        isolated.contributor_guide = None
    return isolated


def _build_prompt(verified: ArchitectureBundle, mode: UserMode) -> str:
    """Load the mode's prompt file and fill its placeholders.

    The facts are replaced LAST so text inside them can never change the
    other placeholders. Plain replace() is used because the prompt files
    contain literal JSON braces.
    """
    prompt = (PROMPTS_DIR / PROMPT_FILES[mode]).read_text(encoding="utf-8")
    facts_json = json.dumps(verified.model_dump(by_alias=True, mode="json"), indent=2)
    return (
        prompt.replace("{mode_context_json}", json.dumps({"mode": mode.value}))
        .replace("{question}", QUESTION)
        .replace("{facts_json}", facts_json)
    )


def _extract_json(text: str) -> str:
    """Strip markdown fences and any text around the JSON object."""
    cleaned = text.strip()
    fenced = re.match(r"^```(?:json)?\s*(.*?)\s*```$", cleaned, re.DOTALL | re.IGNORECASE)
    if fenced:
        cleaned = fenced.group(1)
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start != -1 and end > start:
        cleaned = cleaned[start : end + 1]
    return cleaned


def _parse_reply(text: str) -> _AIReply:
    """Parse and validate the AI reply. Raises ValueError (incl. pydantic) if bad."""
    return _AIReply.model_validate_json(_extract_json(text))


async def _request_reply(
    messages: list[dict[str, str]], repository_context: object, company_context: list
) -> str:
    """Call the gateway. Provider failures become AIServiceError.

    PrivateAIUnavailable is passed through unchanged: there is no fallback
    to another provider for private data.
    """
    try:
        return await gateway.complete(messages, repository_context, company_context)
    except PrivateAIUnavailable:
        raise
    except ProviderError as exc:
        raise AIServiceError(f"AI provider failed ({exc.code})") from exc


def _select(items: Iterable[T], key: Callable[[T], object], wanted: set) -> list[T]:
    """Keep the verified items the AI picked; use all of them if none match."""
    all_items = list(items)
    kept = [item for item in all_items if key(item) in wanted]
    return kept or all_items


def _first_part(text: str) -> str:
    """The text before the first ':' (a file path or a component id)."""
    return text.split(":", 1)[0].strip()


def _connection_pair(text: str) -> tuple[str, str] | None:
    """Parse 'from->to:relationship' into (from, to); None if malformed."""
    if "->" not in text:
        return None
    left, right = text.split("->", 1)
    return left.strip(), _first_part(right)


def _merge_reply(verified: ArchitectureBundle, reply: _AIReply) -> ArchitectureBundle:
    """Put the AI's words into the bundle and ground everything else in facts."""
    result = verified.model_copy(deep=True)

    answer = reply.answer.strip()
    if answer and not answer.startswith(NO_ANSWER_PREFIX):
        result.overview = result.overview.model_copy(
            update={"summary": answer[:MAX_SUMMARY_CHARS]}
        )

    block = reply.architecture
    result.technologies = _select(
        verified.technologies,
        lambda tech: tech.name.casefold(),
        {name.strip().casefold() for name in block.technologies},
    )
    result.entry_points = _select(
        verified.entry_points,
        lambda entry: entry.file,
        {_first_part(item) for item in block.entry_points},
    )
    result.components = _select(
        verified.components,
        lambda component: component.id,
        {_first_part(item) for item in block.components},
    )

    kept_ids = {component.id for component in result.components}
    pairs = {pair for pair in map(_connection_pair, block.connections) if pair}
    chosen = _select(
        verified.connections,
        lambda link: (link.from_component, link.to_component),
        pairs,
    )
    result.connections = [
        link for link in chosen if link.from_component in kept_ids and link.to_component in kept_ids
    ]
    return result


async def explain_architecture(
    facts: ArchitectureBundle,
    repository_context: object,
    company_context: list,
    mode: UserMode,
) -> ArchitectureBundle:
    """Explain verified facts through the AI gateway and return a grounded bundle.

    Retries once if the reply is not valid JSON for the schema.

    Raises:
        AIServiceError: the provider failed, or the reply was invalid twice.
        PrivateAIUnavailable: Ollama is down (no fallback to the external AI).
    """
    mode = UserMode(mode)
    verified = isolate_for_mode(facts, mode)
    messages: list[dict[str, str]] = [
        {"role": "system", "content": _build_prompt(verified, mode)},
        {"role": "user", "content": QUESTION},
    ]

    last_error = ""
    for _attempt in range(2):
        text = await _request_reply(messages, repository_context, company_context)
        try:
            return _merge_reply(verified, _parse_reply(text))
        except ValueError as exc:
            last_error = str(exc)[:500]
            messages = messages + [
                {"role": "assistant", "content": text},
                {
                    "role": "user",
                    "content": f"Your previous reply was not valid: {last_error}. "
                    "Reply again with only the corrected JSON object.",
                },
            ]

    raise AIServiceError(f"AI reply was invalid twice: {last_error}")