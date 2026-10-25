# File:        backend/tests/ai/test_architecture_agent.py
# Owner:       Devyani
# Purpose:     Tests the architecture agent and get_architecture with gateway.complete mocked.
# Contains:    Tests for valid and fenced JSON, retry once, failure after two bad replies, prompt file per mode, grounding, mode isolation, where the AI text lands, provider errors, and get_architecture fallbacks.
# Status:      REAL
# Depends on:  backend/app/agents/architecture.py, backend/app/services/architecture_service.py, backend/app/ai/errors.py

"""Architecture agent tests. No real AI is called: app.ai.gateway.complete is mocked."""

import json
from unittest.mock import AsyncMock, patch

import pytest

from app.agents.architecture import AIServiceError, explain_architecture
from app.ai.errors import ExternalNotAllowed, PrivateAIUnavailable
from app.core.modes import UserMode
from app.schemas.architecture import (
    ArchitectureBundle,
    Component,
    Connection,
    ContributorGuide,
    EntryPoint,
    JiraIssue,
    Overview,
    RelatedContext,
    Repository,
    Technology,
)
from app.services.architecture_service import get_architecture

GATEWAY = "app.ai.gateway.complete"
AI_SUMMARY = "AI explains the demo repo in simple words."
BAD_REPLIES = ["this is not json", '{"architecture": {}}']  # not JSON / missing "answer"


def make_facts() -> ArchitectureBundle:
    """Verified facts with BOTH mode blocks filled, so isolation is visible."""
    return ArchitectureBundle(
        repository=Repository(owner="acme-test", name="demo-repo", branch="main"),
        overview=Overview(summary="Facts summary.", primary_language="TypeScript", topics=["demo"]),
        technologies=[
            Technology(name="React", category="frontend", evidence_files=["a.tsx"]),
            Technology(name="TypeScript", category="language", evidence_files=["b.ts"]),
        ],
        entry_points=[EntryPoint(file="src/index.ts", reason="Starts the app.")],
        components=[
            Component(id="router", name="Router", description="Matches URLs.", files=["r.ts"]),
            Component(id="renderer", name="Renderer", description="Draws pages.", files=["d.ts"]),
        ],
        connections=[
            Connection.model_validate(
                {"from": "router", "to": "renderer", "relationship": "hands pages over"}
            )
        ],
        contributor_guide=ContributorGuide(setup_steps=["pnpm install"]),
        related_context=RelatedContext(
            jira_issues=[JiraIssue(key="SECRET-999", summary="Do a thing", url="https://x/SECRET-999")]
        ),
    )


def ai_reply(**extra: object) -> str:
    """A valid AI reply as JSON text. `extra` adds or overrides top-level keys."""
    reply: dict[str, object] = {
        "answer": AI_SUMMARY,
        "source_ids": ["router"],
        "architecture": {
            "overview": "unknown",
            "technologies": ["React", "TypeScript"],
            "entry_points": ["src/index.ts:Starts the app."],
            "components": ["router:Router", "renderer:Renderer"],
            "connections": ["router->renderer:hands pages over"],
        },
    }
    reply.update(extra)
    return json.dumps(reply)


def repo_context(mode: UserMode) -> dict[str, object]:
    visibility = "private" if mode == UserMode.company else "public"
    return {"visibility": visibility, "analysis": {}, "files": []}


async def run_agent(mode: UserMode, side_effect: list) -> tuple[ArchitectureBundle, AsyncMock]:
    """Run explain_architecture with a mocked gateway; return (bundle, mock)."""
    mock = AsyncMock(side_effect=side_effect)
    with patch(GATEWAY, mock):
        bundle = await explain_architecture(make_facts(), repo_context(mode), [], mode)
    return bundle, mock


@pytest.mark.asyncio
@pytest.mark.parametrize("mode", [UserMode.open_source, UserMode.company])
async def test_valid_json_returns_schema_valid_bundle(mode: UserMode) -> None:
    bundle, mock = await run_agent(mode, [ai_reply()])
    assert isinstance(bundle, ArchitectureBundle)
    assert mock.await_count == 1
    assert [t.name for t in bundle.technologies] == ["React", "TypeScript"]


@pytest.mark.asyncio
async def test_markdown_fenced_json_is_parsed() -> None:
    fenced = "```json\n" + ai_reply() + "\n```"
    bundle, mock = await run_agent(UserMode.open_source, [fenced])
    assert mock.await_count == 1
    assert bundle.overview.summary == AI_SUMMARY


@pytest.mark.asyncio
@pytest.mark.parametrize("bad_reply", BAD_REPLIES)
async def test_invalid_then_valid_retries_once_with_the_error(bad_reply: str) -> None:
    bundle, mock = await run_agent(UserMode.open_source, [bad_reply, ai_reply()])
    assert mock.await_count == 2
    first_call, second_call = (call.args[0] for call in mock.await_args_list)
    assert len(first_call) == 2
    assert second_call[-2] == {"role": "assistant", "content": bad_reply}
    assert "not valid" in second_call[-1]["content"]
    assert bundle.overview.summary == AI_SUMMARY


@pytest.mark.asyncio
@pytest.mark.parametrize("bad_reply", BAD_REPLIES)
async def test_invalid_twice_raises_ai_service_error(bad_reply: str) -> None:
    with pytest.raises(AIServiceError):
        await run_agent(UserMode.open_source, [bad_reply, bad_reply])


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "mode, marker, other_marker",
    [
        (UserMode.open_source, "contributor-mode mentor", "onboarding-mode mentor"),
        (UserMode.company, "onboarding-mode mentor", "contributor-mode mentor"),
    ],
)
async def test_correct_prompt_file_per_mode_with_placeholders_filled(
    mode: UserMode, marker: str, other_marker: str
) -> None:
    _, mock = await run_agent(mode, [ai_reply()])
    system_prompt = mock.await_args.args[0][0]["content"]
    assert marker in system_prompt
    assert other_marker not in system_prompt
    assert "{facts_json}" not in system_prompt
    assert "{mode_context_json}" not in system_prompt
    assert "{question}" not in system_prompt
    assert "demo-repo" in system_prompt  # the facts were filled in


@pytest.mark.asyncio
async def test_ai_invented_items_are_dropped() -> None:
    reply = json.loads(ai_reply())
    reply["architecture"] = {
        "overview": "unknown",
        "technologies": ["React", "Ghost"],
        "entry_points": ["src/ghost.ts:Fake"],
        "components": ["router:Router", "renderer:Renderer", "ghost:Ghost"],
        "connections": [
            "router->renderer:hands pages over",
            "router->ghost:invented",
            "ghost->router:invented",
        ],
    }
    bundle, _ = await run_agent(UserMode.open_source, [json.dumps(reply)])
    assert [t.name for t in bundle.technologies] == ["React"]
    assert [c.id for c in bundle.components] == ["router", "renderer"]
    assert [(c.from_component, c.to_component) for c in bundle.connections] == [("router", "renderer")]
    assert [e.file for e in bundle.entry_points] == ["src/index.ts"]  # fell back to the facts


@pytest.mark.asyncio
async def test_open_source_keeps_contributor_guide_and_drops_company_context() -> None:
    reply = ai_reply(related_context={"jira_issues": []}, contributor_guide=None)
    bundle, mock = await run_agent(UserMode.open_source, [reply])
    assert bundle.contributor_guide is not None
    assert bundle.contributor_guide.setup_steps == ["pnpm install"]
    assert bundle.related_context is None
    assert "SECRET-999" not in mock.await_args.args[0][0]["content"]  # never sent to the AI


@pytest.mark.asyncio
async def test_company_keeps_related_context_and_drops_contributor_guide() -> None:
    # The model tries to change the mode and add a guide: both must be ignored.
    reply = ai_reply(mode="open_source", contributor_guide={"setup_steps": ["evil"]})
    bundle, mock = await run_agent(UserMode.company, [reply])
    assert bundle.contributor_guide is None
    assert bundle.related_context is not None
    assert bundle.related_context.jira_issues[0].key == "SECRET-999"
    assert "SECRET-999" in mock.await_args.args[0][0]["content"]


@pytest.mark.asyncio
async def test_ai_text_lands_in_overview_summary() -> None:
    bundle, _ = await run_agent(UserMode.open_source, [ai_reply()])
    assert bundle.overview.summary == AI_SUMMARY
    assert bundle.overview.primary_language == "TypeScript"  # facts untouched


@pytest.mark.asyncio
async def test_cannot_find_answer_keeps_the_facts_summary() -> None:
    reply = ai_reply(answer="I cannot find the answer in the provided repository facts.")
    bundle, _ = await run_agent(UserMode.open_source, [reply])
    assert bundle.overview.summary == "Facts summary."


@pytest.mark.asyncio
async def test_provider_error_becomes_ai_service_error() -> None:
    with pytest.raises(AIServiceError):
        await run_agent(UserMode.open_source, [ExternalNotAllowed("not configured")])


@pytest.mark.asyncio
async def test_private_ai_unavailable_is_not_wrapped() -> None:
    with pytest.raises(PrivateAIUnavailable):
        await run_agent(UserMode.company, [PrivateAIUnavailable()])


@pytest.mark.parametrize("error", [AIServiceError("boom"), PrivateAIUnavailable()])
@pytest.mark.parametrize("mode", [UserMode.open_source, UserMode.company])
def test_get_architecture_returns_facts_only_when_ai_unavailable(
    mode: UserMode, error: Exception
) -> None:
    with patch(
        "app.services.architecture_service.analyze_repository", return_value=make_facts()
    ), patch("app.services.architecture_service.explain_architecture", AsyncMock(side_effect=error)):
        bundle = get_architecture("acme-test", "demo-repo", "main", mode)
    assert bundle.overview.summary == "Facts summary."
    if mode == UserMode.open_source:
        assert bundle.contributor_guide is not None and bundle.related_context is None
    else:
        assert bundle.contributor_guide is None and bundle.related_context is not None


@pytest.mark.parametrize(
    "mode, visibility",
    [(UserMode.open_source, "public"), (UserMode.company, "private")],
)
def test_get_architecture_sends_the_right_visibility_to_the_gateway(
    mode: UserMode, visibility: str
) -> None:
    explain = AsyncMock(return_value=make_facts())
    with patch(
        "app.services.architecture_service.analyze_repository", return_value=make_facts()
    ), patch("app.services.architecture_service.explain_architecture", explain):
        get_architecture("acme-test", "demo-repo", "main", mode)
    assert explain.await_args.args[1]["visibility"] == visibility
    assert explain.await_args.args[3] == mode