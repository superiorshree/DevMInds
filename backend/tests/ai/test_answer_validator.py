# File:        backend/tests/ai/test_answer_validator.py
# Owner:       Devyani
# Purpose:     Tests validate_bundle() and that the architecture agent really uses it.
# Contains:    Tests for dropping technologies, components, entry points and connections, exact path matching, and the agent integration.
# Status:      REAL
# Depends on:  backend/app/services/answer_validator.py, backend/app/agents/architecture.py, backend/app/schemas/architecture.py

import json
from unittest.mock import AsyncMock, patch

import pytest

from app.agents.architecture import explain_architecture
from app.core.modes import UserMode
from app.schemas.contracts import RepoFile, RepositoryContext
from app.schemas.architecture import (
    ArchitectureBundle,
    Component,
    Connection,
    EntryPoint,
    Overview,
    Repository,
    Technology,
)
from app.services.answer_validator import validate_bundle


def link(a: str, b: str) -> Connection:
    return Connection.model_validate({"from": a, "to": b, "relationship": "uses"})


def make_bundle() -> ArchitectureBundle:
    return ArchitectureBundle(
        repository=Repository(owner="o", name="r"),
        overview=Overview(summary="x"),
        technologies=[
            Technology(name="Real", evidence_files=["src/a.py"]),
            Technology(name="Ghost", evidence_files=["nope.py"]),
            Technology(name="Half", evidence_files=["src/a.py", "gone.py"]),
            Technology(name="NoFiles", evidence_files=[]),
        ],
        entry_points=[EntryPoint(file="src/a.py", reason="ok"), EntryPoint(file="fake.py", reason="bad")],
        components=[
            Component(id="a", name="A", description="d", files=["src/a.py"]),
            Component(id="b", name="B", description="d", files=["missing.py"]),
            Component(id="c", name="C", description="d", files=["src/c.py", "missing.py"]),
        ],
        connections=[link("a", "b"), link("b", "a"), link("a", "c"), link("a", "ghost")],
    )


PATHS = {"src/a.py", "src/c.py"}


def test_technology_with_no_surviving_evidence_is_dropped() -> None:
    result, removed = validate_bundle(make_bundle(), PATHS)
    names = [t.name for t in result.technologies]
    assert "Ghost" not in names
    assert names == ["Real", "Half", "NoFiles"]
    assert any("Ghost" in note and "dropped" in note for note in removed)


def test_technology_keeps_only_existing_evidence_files() -> None:
    result, _ = validate_bundle(make_bundle(), PATHS)
    half = next(t for t in result.technologies if t.name == "Half")
    assert half.evidence_files == ["src/a.py"]


def test_technology_that_listed_no_files_is_kept() -> None:
    result, _ = validate_bundle(make_bundle(), PATHS)
    assert "NoFiles" in [t.name for t in result.technologies]


def test_entry_point_with_missing_file_is_dropped() -> None:
    result, _ = validate_bundle(make_bundle(), PATHS)
    assert [e.file for e in result.entry_points] == ["src/a.py"]


def test_component_with_no_surviving_file_is_dropped() -> None:
    result, removed = validate_bundle(make_bundle(), PATHS)
    assert [c.id for c in result.components] == ["a", "c"]
    assert any("component 'b' dropped" in note for note in removed)


def test_component_keeps_only_existing_files() -> None:
    result, _ = validate_bundle(make_bundle(), PATHS)
    c = next(c for c in result.components if c.id == "c")
    assert c.files == ["src/c.py"]


def test_connections_to_dropped_or_unknown_components_are_removed() -> None:
    result, _ = validate_bundle(make_bundle(), PATHS)
    assert [(c.from_component, c.to_component) for c in result.connections] == [("a", "c")]


def test_nothing_removed_when_everything_exists() -> None:
    bundle = make_bundle()
    everything = {"src/a.py", "src/c.py", "nope.py", "gone.py", "fake.py", "missing.py"}
    bundle.connections = [link("a", "b")]
    result, removed = validate_bundle(bundle, everything)
    assert removed == []
    assert result == bundle


def test_paths_must_match_exactly_without_src_guessing() -> None:
    bundle = make_bundle()
    bundle.entry_points = [EntryPoint(file="a.py", reason="short path")]
    result, _ = validate_bundle(bundle, {"src/a.py"})
    assert result.entry_points == []


def test_slashes_and_dot_prefix_are_normalised() -> None:
    bundle = make_bundle()
    bundle.entry_points = [EntryPoint(file=".\\src\\a.py", reason="windows style")]
    result, _ = validate_bundle(bundle, ["src/a.py"])
    assert len(result.entry_points) == 1


def test_input_bundle_is_not_changed() -> None:
    bundle = make_bundle()
    before = bundle.model_copy(deep=True)
    validate_bundle(bundle, PATHS)
    assert bundle == before


def test_removal_notes_contain_only_names_and_paths() -> None:
    bundle = make_bundle()
    bundle.components[1] = Component(id="b", name="B", description="SECRET-TEXT", files=["missing.py"])
    _, removed = validate_bundle(bundle, PATHS)
    assert all("SECRET-TEXT" not in note for note in removed)

def test_logs_rejected_paths_without_file_contents(caplog) -> None:
    bundle = make_bundle()
    bundle.components[1] = Component(
        id="b",
        name="B",
        description="SECRET-FILE-CONTENT",
        files=["missing.py"],
    )

    with caplog.at_level("WARNING", logger="app.services.answer_validator"):
        validate_bundle(bundle, PATHS)

    assert "missing.py" in caplog.text
    assert "SECRET-FILE-CONTENT" not in caplog.text


# --- the agent really calls the validator ---

def agent_facts() -> ArchitectureBundle:
    return ArchitectureBundle(
        repository=Repository(owner="o", name="r"),
        overview=Overview(summary="Facts summary."),
        components=[
            Component(id="router", name="Router", description="d", files=["src/r.ts"]),
            Component(id="renderer", name="Renderer", description="d", files=["src/d.ts"]),
        ],
        connections=[link("router", "renderer")],
    )


AI_REPLY = json.dumps(
    {
        "answer": "AI text.",
        "source_ids": [],
        "architecture": {
            "overview": "unknown",
            "technologies": [],
            "entry_points": [],
            "components": ["router:Router", "renderer:Renderer"],
            "connections": ["router->renderer:uses"],
        },
    }
)


@pytest.mark.asyncio
async def test_agent_drops_components_missing_from_the_repo_files() -> None:
    context = {"visibility": "public", "analysis": {}, "files": [{"path": "src/r.ts", "content": "", "url": "u"}]}
    with patch("app.ai.gateway.complete", AsyncMock(return_value=AI_REPLY)):
        result = await explain_architecture(agent_facts(), context, [], UserMode.open_source)
    assert [c.id for c in result.components] == ["router"]
    assert result.connections == []


@pytest.mark.asyncio
async def test_agent_skips_validation_when_no_files_are_supplied() -> None:
    context = {"visibility": "public", "analysis": {}, "files": []}
    with patch("app.ai.gateway.complete", AsyncMock(return_value=AI_REPLY)):
        result = await explain_architecture(agent_facts(), context, [], UserMode.open_source)
    assert [c.id for c in result.components] == ["router", "renderer"]

@pytest.mark.parametrize(
    "candidate",
    [
        "./src/a.py",
        "././src/a.py",
        "/src/a.py",
        "SRC/A.PY",
        ".\\src\\A.PY",
    ],
)
def test_paths_are_normalized_before_comparison(candidate: str) -> None:
    bundle = make_bundle()
    bundle.entry_points = [EntryPoint(file=candidate, reason="normalization")]

    result, _ = validate_bundle(bundle, {"src/a.py"})

    assert [entry.file for entry in result.entry_points] == [candidate]

@pytest.mark.asyncio
async def test_agent_validates_pydantic_repository_context() -> None:
    context = RepositoryContext(
        visibility="public",
        analysis={},
        files=[
            RepoFile(path="src/r.ts", content="", url="u"),
        ],
    )

    with patch("app.ai.gateway.complete", AsyncMock(return_value=AI_REPLY)):
        result = await explain_architecture(
            agent_facts(), context, [], UserMode.open_source
        )

    assert [component.id for component in result.components] == ["router"]
    assert result.connections == []