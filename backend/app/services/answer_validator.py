
# File:        backend/app/services/answer_validator.py
# Owner:       Devyani
# Purpose:     Validate AI architecture answers against repository paths.
# Status:      REAL

"""Validate architecture bundle entries against the real repository file list.

Items without file evidence are retained because there is nothing to disprove.
Removal notes contain names, IDs, and paths, never file contents.
"""

import logging
from collections.abc import Iterable

from app.schemas.architecture import ArchitectureBundle

logger = logging.getLogger(__name__)


def _normalize(path: str) -> str:
    """Normalize separators, leading prefixes, and case for path comparison."""
    normalized = path.replace("\\", "/").strip()

    # Handle repeated prefixes such as ././src/a.py.
    while normalized.startswith("./"):
        normalized = normalized[2:]

    # Treat leading slashes as repository-relative paths.
    normalized = normalized.lstrip("/")

    # Handle prefixes exposed by removing leading slashes, e.g. /./src/a.py.
    while normalized.startswith("./"):
        normalized = normalized[2:]

    return normalized.casefold()


def _existing(
    files: list[str], known: set[str]
) -> tuple[list[str], list[str]]:
    """Split files into (found in repo, missing from repo)."""
    found = [path for path in files if _normalize(path) in known]
    missing = [path for path in files if _normalize(path) not in known]

    # Log only rejected path strings. Never log file contents or descriptions.
    for path in missing:
        logger.warning("Rejected repository path: %s", path)

    return found, missing


def validate_bundle(
    bundle: ArchitectureBundle,
    repo_tree_paths: Iterable[str],
) -> tuple[ArchitectureBundle, list[str]]:
    """Return a cleaned copy of the bundle and notes about removed entries."""
    known = {_normalize(path) for path in repo_tree_paths}
    removed: list[str] = []

    # Filter technology evidence first.
    technologies = []
    for tech in bundle.technologies:
        found, missing = _existing(tech.evidence_files, known)
        removed.extend(
            f"technology '{tech.name}' evidence file '{path}'"
            for path in missing
        )

        if tech.evidence_files and not found:
            removed.append(
                f"technology '{tech.name}' dropped: no evidence file in repo"
            )
            continue

        technologies.append(
            tech.model_copy(update={"evidence_files": found})
        )

    # Filter entry points.
    entry_points = []
    for entry in bundle.entry_points:
        if _normalize(entry.file) in known:
            entry_points.append(entry)
        else:
            logger.warning("Rejected repository path: %s", entry.file)
            removed.append(f"entry_point file '{entry.file}'")

    # Filter components before validating connections.
    components = []
    for component in bundle.components:
        found, missing = _existing(component.files, known)
        removed.extend(
            f"component '{component.id}' file '{path}'"
            for path in missing
        )

        if component.files and not found:
            removed.append(
                f"component '{component.id}' dropped: no file in repo"
            )
            continue

        components.append(
            component.model_copy(update={"files": found})
        )

    # Connections may only reference components that survived filtering.
    kept_ids = {component.id for component in components}
    connections = []

    for link in bundle.connections:
        if (
            link.from_component in kept_ids
            and link.to_component in kept_ids
        ):
            connections.append(link)
        else:
            removed.append(
                f"connection {link.from_component}->{link.to_component}: "
                "endpoint not in components"
            )

    validated = bundle.model_copy(
        update={
            "technologies": technologies,
            "entry_points": entry_points,
            "components": components,
            "connections": connections,
        }
    )

    return validated, removed
