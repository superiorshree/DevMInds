# File:        backend/app/services/context_retrieval.py
# Owner:       Devyani
# Purpose:     Pick the most relevant files and company items for a question
#              using plain keyword search, ready to pass to the prompt builder.
# Contains:    STOP_WORDS constant, _keywords(), _score_file(), _score_item(),
#              _trim_content(), retrieve()
# Status:      REAL
# Depends on:  backend/app/schemas/contracts.py (RepoFile, CompanyItem,
#              RepositoryContext, CompanyContext)

"""Keyword-based context retrieval for the AI chat pipeline.

No vector databases, no embeddings, no external frameworks.  The algorithm is
intentionally simple so it is easy to explain and easy to debug:

1. Tokenise the question into lowercase words, drop common English stop words.
2. Score every repository file by counting keyword hits in its path (x3 weight)
   and its content (x1 weight).
3. Score every company item the same way against its title (x3) and content (x1).
   Company items are only scored when mode == 'company'.
4. Collect the union, sort by score descending, return the top *limit* results
   trimmed so each block is safe to embed in a prompt.

The caller (AIService.answer) passes the returned lists directly to
ai_response.build_messages().
"""

from __future__ import annotations

import re
from typing import Union

from app.schemas.contracts import CompanyItem, RepoFile, RepositoryContext

# ---------------------------------------------------------------------------
# Stop words -- single English set, no external NLTK/spaCy dependency.
# ---------------------------------------------------------------------------
STOP_WORDS: frozenset[str] = frozenset(
    {
        "a", "an", "and", "are", "as", "at", "be", "been", "being",
        "but", "by", "do", "does", "did", "for", "from", "get", "got",
        "has", "have", "he", "her", "here", "him", "his", "how", "i",
        "if", "in", "into", "is", "it", "its", "me", "my", "not", "of",
        "on", "or", "our", "out", "she", "so", "some", "than", "that",
        "the", "their", "them", "then", "there", "these", "they", "this",
        "those", "to", "up", "us", "was", "we", "were", "what", "when",
        "where", "which", "who", "why", "will", "with", "would", "you",
        "your",
    }
)

# Maximum characters kept per retrieved block before it is sent to the prompt.
_MAX_CONTENT_CHARS: int = 8_000

# Path hits are weighted more than content hits so that a file clearly named
# "router.py" beats an unrelated file that happens to mention "router" once.
_PATH_WEIGHT: int = 3
_CONTENT_WEIGHT: int = 1

# Minimum score to be included at all (prevents noise when a query has no hits).
_MIN_SCORE: int = 1


def _keywords(question: str) -> list[str]:
    """Tokenise *question* into lowercase, stop-word-filtered words.

    Splits on any non-alphanumeric character so camelCase and snake_case terms
    are preserved as full tokens.

    Args:
        question: The raw user question (treated as data, never executed).

    Returns:
        Deduplicated list of lowercase keyword strings, longest first so that
        more specific terms are checked before shorter sub-terms.
    """
    raw_tokens = re.split(r"[^a-zA-Z0-9_]+", question.lower())
    seen: dict[str, None] = {}
    for tok in raw_tokens:
        tok = tok.strip("_")
        if tok and tok not in STOP_WORDS and len(tok) > 1:
            seen[tok] = None
    # Longest tokens first -- more specific matches rank higher.
    return sorted(seen.keys(), key=len, reverse=True)


def _score_text(text: str, keywords: list[str]) -> int:
    """Count how many keyword occurrences appear in *text* (case-insensitive).

    Args:
        text:     The text to search (treated as untrusted data).
        keywords: Pre-computed keyword list from ``_keywords()``.

    Returns:
        Total keyword hit count (>=0).
    """
    lowered = text.lower()
    return sum(lowered.count(kw) for kw in keywords)


def _score_file(file: RepoFile, keywords: list[str]) -> int:
    """Compute relevance score for a repository file.

    Args:
        file:     A ``RepoFile`` from ``RepositoryContext.files``.
        keywords: Pre-computed keyword list.

    Returns:
        Weighted score >= 0.
    """
    path_hits = _score_text(file.path, keywords)
    content_hits = _score_text(file.content, keywords)
    return path_hits * _PATH_WEIGHT + content_hits * _CONTENT_WEIGHT


def _score_item(item: CompanyItem, keywords: list[str]) -> int:
    """Compute relevance score for a company item (Jira / Slack / Confluence).

    Args:
        item:     A ``CompanyItem`` from ``CompanyContext.items``.
        keywords: Pre-computed keyword list.

    Returns:
        Weighted score >= 0.
    """
    title_hits = _score_text(item.title, keywords)
    content_hits = _score_text(item.content, keywords)
    return title_hits * _PATH_WEIGHT + content_hits * _CONTENT_WEIGHT


def _trim_content(text: str, max_chars: int = _MAX_CONTENT_CHARS) -> str:
    """Truncate *text* to *max_chars* with a clear ellipsis marker.

    Preserves the beginning of the text so the prompt is most likely to contain
    the relevant context (imports, declarations) that appears near the top.

    Args:
        text:      Raw file or item content.
        max_chars: Hard ceiling in characters.

    Returns:
        Possibly truncated string, always <= *max_chars* chars.
    """
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n... [content trimmed]"


def retrieve(
    question: str,
    repository_context: Union[RepositoryContext, dict],
    company_context: list[CompanyItem],
    mode: str,
    limit: int = 8,
) -> tuple[list[RepoFile], list[CompanyItem]]:
    """Select the most relevant files and company items for *question*.

    Uses plain keyword matching -- no vector database, no embeddings.

    Args:
        question:           The user's question (untrusted text, never executed).
        repository_context: ``RepositoryContext`` Pydantic model **or** a raw
                            dict that conforms to the same shape.  Both are
                            supported so callers do not need to re-validate.
        company_context:    List of ``CompanyItem`` objects from
                            ``CompanyContext.items``.  Ignored when
                            ``mode != 'company'``.
        mode:               Server-side session mode -- must be ``'open_source'``
                            or ``'company'``.  Company items are **only** scored
                            when this is ``'company'``.
        limit:              Maximum total items to return (files + items combined).
                            Clamped to the range [5, 8] so callers cannot
                            accidentally request more than the prompt can handle.

    Returns:
        A 2-tuple ``(files, items)`` where:
        - ``files`` is a list of ``RepoFile`` with content trimmed to
          ``_MAX_CONTENT_CHARS``.
        - ``items`` is a list of ``CompanyItem`` with content trimmed.
        Both lists are already ranked by relevance (highest score first).

    Security note:
        All text from repos, Jira, Slack and Confluence is treated as untrusted
        data.  This function only *reads* the text; it never evaluates or
        executes anything inside it.
    """
    # Clamp limit to a safe range.
    limit = max(5, min(8, limit))

    keywords = _keywords(question)

    # Normalise repository_context so we always work with attribute access.
    if isinstance(repository_context, dict):
        ctx_files: list[RepoFile] = [
            RepoFile(**f) if isinstance(f, dict) else f
            for f in repository_context.get("files", [])
        ]
    else:
        ctx_files = list(repository_context.files)

    # Score repository files -- always included regardless of mode.
    scored_files: list[tuple[int, RepoFile]] = []
    for file in ctx_files:
        score = _score_file(file, keywords)
        if score >= _MIN_SCORE:
            trimmed = RepoFile(
                path=file.path,
                content=_trim_content(file.content),
                url=file.url,
            )
            scored_files.append((score, trimmed))

    # Score company items -- only in company mode.
    scored_items: list[tuple[int, CompanyItem]] = []
    if mode == "company":
        for item in company_context:
            score = _score_item(item, keywords)
            if score >= _MIN_SCORE:
                trimmed_item = CompanyItem(
                    source_type=item.source_type,
                    title=item.title,
                    content=_trim_content(item.content),
                    url=item.url,
                    metadata=item.metadata,
                )
                scored_items.append((score, trimmed_item))

    # Sort each group by score descending.
    scored_files.sort(key=lambda t: t[0], reverse=True)
    scored_items.sort(key=lambda t: t[0], reverse=True)

    # Interleave: take items proportionally so neither group starves.
    # Rule: up to half the limit can be company items; the rest are files.
    max_items = limit // 2
    max_files = limit - max_items

    top_files = [f for _, f in scored_files[:max_files]]
    top_items = [i for _, i in scored_items[:max_items]]

    # If one group is short, give spare slots to the other.
    spare = max_files - len(top_files)
    if spare > 0:
        extra = [i for _, i in scored_items[max_items: max_items + spare]]
        top_items.extend(extra)

    spare = max_items - len(top_items)
    if spare > 0:
        extra = [f for _, f in scored_files[max_files: max_files + spare]]
        top_files.extend(extra)

    return top_files, top_items
