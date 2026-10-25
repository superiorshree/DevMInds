# File:        backend/tests/ai/test_context_retrieval.py
# Owner:       Devyani
# Purpose:     Tests for context_retrieval.retrieve() covering ranking,
#              trimming, mode isolation, and empty-result edge cases.
# Contains:    Tests for _keywords(), _score_file(), _score_item(),
#              retrieve() ranking, retrieve() mode isolation, trimming,
#              limit clamping, and empty-result path.
# Status:      REAL
# Depends on:  backend/app/services/context_retrieval.py,
#              backend/app/schemas/contracts.py

"""Tests for keyword-based context retrieval.

All tests use plain in-memory data so no I/O or network is needed.
"""

import pytest

from app.schemas.contracts import CompanyItem, RepoFile, RepositoryContext
from app.services.context_retrieval import (
    STOP_WORDS,
    _MAX_CONTENT_CHARS,
    _keywords,
    _score_file,
    _score_item,
    _trim_content,
    retrieve,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_file(path: str, content: str = "", url: str = "https://github.com/x") -> RepoFile:
    """Build a minimal RepoFile for tests."""
    return RepoFile(path=path, content=content, url=url)


def make_item(
    source_type: str = "jira",
    title: str = "Task",
    content: str = "",
    url: str = "https://acme.atlassian.net/browse/DEV-1",
) -> CompanyItem:
    """Build a minimal CompanyItem for tests."""
    return CompanyItem(
        source_type=source_type,  # type: ignore[arg-type]
        title=title,
        content=content,
        url=url,
    )


def make_context(files: list[RepoFile]) -> RepositoryContext:
    """Wrap a file list in a RepositoryContext."""
    return RepositoryContext(visibility="public", analysis={}, files=files)


# ---------------------------------------------------------------------------
# _keywords()
# ---------------------------------------------------------------------------

class TestKeywords:
    def test_drops_stop_words(self) -> None:
        result = _keywords("what is the router")
        assert "what" not in result
        assert "is" not in result
        assert "the" not in result
        assert "router" in result

    def test_lowercases_tokens(self) -> None:
        result = _keywords("Router Authentication")
        assert "router" in result
        assert "authentication" in result

    def test_deduplicates(self) -> None:
        result = _keywords("router router router")
        assert result.count("router") == 1

    def test_returns_longest_first(self) -> None:
        result = _keywords("authenticate router")
        assert result.index("authenticate") < result.index("router")

    def test_empty_string_returns_empty_list(self) -> None:
        assert _keywords("") == []

    def test_stop_words_only_returns_empty_list(self) -> None:
        assert _keywords("the a is") == []

    def test_single_char_tokens_dropped(self) -> None:
        # Single letters that are not stop-words are still too short to be useful.
        result = _keywords("x y z")
        assert result == []

    def test_splits_on_punctuation(self) -> None:
        result = _keywords("router.py,handler")
        assert "router" in result
        assert "handler" in result


# ---------------------------------------------------------------------------
# _score_file()
# ---------------------------------------------------------------------------

class TestScoreFile:
    def test_path_match_scores_higher_than_content_match(self) -> None:
        # Same keyword once in path vs once in content.
        by_path = make_file(path="src/router.py", content="nothing useful")
        by_content = make_file(path="src/app.py", content="router is used here")
        kw = ["router"]
        assert _score_file(by_path, kw) > _score_file(by_content, kw)

    def test_zero_score_for_unrelated_file(self) -> None:
        f = make_file(path="src/utils.py", content="helper functions")
        assert _score_file(f, ["router"]) == 0

    def test_multiple_keyword_hits_accumulate(self) -> None:
        f = make_file(path="router.py", content="router router router")
        kw = ["router"]
        score = _score_file(f, kw)
        # 1 path hit * 3 + 3 content hits * 1 = 6
        assert score == 6

    def test_case_insensitive_matching(self) -> None:
        f = make_file(path="Router.py", content="ROUTER handles requests")
        assert _score_file(f, ["router"]) > 0


# ---------------------------------------------------------------------------
# _score_item()
# ---------------------------------------------------------------------------

class TestScoreItem:
    def test_title_match_scores_higher_than_content_match(self) -> None:
        by_title = make_item(title="Router migration", content="no match here")
        by_content = make_item(title="Unrelated task", content="router is described here")
        kw = ["router"]
        assert _score_item(by_title, kw) > _score_item(by_content, kw)

    def test_zero_score_for_unrelated_item(self) -> None:
        item = make_item(title="Design meeting", content="discussed fonts and colours")
        assert _score_item(item, ["router"]) == 0


# ---------------------------------------------------------------------------
# _trim_content()
# ---------------------------------------------------------------------------

class TestTrimContent:
    def test_short_content_is_unchanged(self) -> None:
        text = "hello world"
        assert _trim_content(text, max_chars=100) == text

    def test_long_content_is_truncated(self) -> None:
        text = "a" * 200
        result = _trim_content(text, max_chars=100)
        # Ellipsis marker is '\n... [content trimmed]' = 22 chars.
        assert len(result) <= 122  # 100 chars + 22-char marker
        assert "[content trimmed]" in result

    def test_exact_boundary_is_not_trimmed(self) -> None:
        # Build text exactly at the current cap so the test stays correct
        # even if _MAX_CONTENT_CHARS is tuned in future.
        text = "x" * _MAX_CONTENT_CHARS
        result = _trim_content(text)
        assert result == text

    def test_one_over_boundary_is_trimmed(self) -> None:
        text = "x" * (_MAX_CONTENT_CHARS + 1)
        result = _trim_content(text)
        assert "[content trimmed]" in result


# ---------------------------------------------------------------------------
# retrieve() -- ranking
# ---------------------------------------------------------------------------

class TestRetrieveRanking:
    def test_most_relevant_file_is_first(self) -> None:
        files = [
            make_file("src/utils.py", "unrelated content"),
            make_file("src/router.py", "router handles all routes"),
            make_file("src/app.py", "entry point"),
        ]
        ctx = make_context(files)
        # Use the exact keyword "router" so the substring match fires.
        top_files, _ = retrieve("how does the router work", ctx, [], "open_source")
        assert top_files[0].path == "src/router.py"

    def test_path_keyword_match_beats_content_only_match(self) -> None:
        files = [
            make_file("authentication/handler.py", "nothing special"),
            make_file("utils.py", "authentication is handled by bcrypt here"),
        ]
        ctx = make_context(files)
        top_files, _ = retrieve("how does authentication work", ctx, [], "open_source")
        assert top_files[0].path == "authentication/handler.py"

    def test_multiple_keyword_matches_improve_rank(self) -> None:
        files = [
            make_file("router.py", "router router router"),   # high score
            make_file("app.py", "router entry"),               # lower score
            make_file("utils.py", "helper code"),             # no match
        ]
        ctx = make_context(files)
        top_files, _ = retrieve("how does the router work", ctx, [], "open_source")
        assert top_files[0].path == "router.py"

    def test_returns_at_most_limit_items(self) -> None:
        # Create 10 files all matching the keyword.
        files = [make_file(f"router_{i}.py", f"router {i}") for i in range(10)]
        ctx = make_context(files)
        top_files, top_items = retrieve("router", ctx, [], "open_source", limit=8)
        assert len(top_files) + len(top_items) <= 8

    def test_limit_clamped_to_minimum_five(self) -> None:
        files = [make_file(f"f{i}.py", "router") for i in range(10)]
        ctx = make_context(files)
        top_files, top_items = retrieve("router", ctx, [], "open_source", limit=2)
        # limit is clamped to 5 so at most 5 results total
        assert len(top_files) + len(top_items) <= 5

    def test_limit_clamped_to_maximum_eight(self) -> None:
        files = [make_file(f"f{i}.py", "router") for i in range(20)]
        ctx = make_context(files)
        top_files, top_items = retrieve("router", ctx, [], "open_source", limit=20)
        assert len(top_files) + len(top_items) <= 8


# ---------------------------------------------------------------------------
# retrieve() -- mode isolation (company items)
# ---------------------------------------------------------------------------

class TestRetrieveModeIsolation:
    def _items(self) -> list[CompanyItem]:
        return [
            make_item(title="Router migration", content="router refactor"),
            make_item(title="Unrelated task", content="design meeting"),
        ]

    def test_company_items_ignored_in_open_source_mode(self) -> None:
        ctx = make_context([])
        _, items = retrieve("router", ctx, self._items(), "open_source")
        assert items == []

    def test_company_items_included_in_company_mode(self) -> None:
        ctx = make_context([])
        _, items = retrieve("router", ctx, self._items(), "company")
        assert len(items) >= 1
        assert items[0].title == "Router migration"

    def test_most_relevant_company_item_is_first(self) -> None:
        items = [
            make_item(title="Router migration", content="router refactor"),
            make_item(title="Router urgent fix", content="router router critical"),
        ]
        ctx = make_context([])
        _, top_items = retrieve("router fix", ctx, items, "company")
        # "Router urgent fix" has more hits for both "router" and "fix"
        assert top_items[0].title == "Router urgent fix"

    def test_files_and_items_both_returned_in_company_mode(self) -> None:
        files = [make_file("router.py", "router handler")]
        items = [make_item(title="Router ticket", content="router migration")]
        ctx = make_context(files)
        top_files, top_items = retrieve("router", ctx, items, "company")
        assert len(top_files) >= 1
        assert len(top_items) >= 1


# ---------------------------------------------------------------------------
# retrieve() -- trimming
# ---------------------------------------------------------------------------

class TestRetrieveTrimming:
    def test_long_file_content_is_trimmed(self) -> None:
        long_content = "router " * 5_000   # much longer than _MAX_CONTENT_CHARS
        files = [make_file("router.py", long_content)]
        ctx = make_context(files)
        top_files, _ = retrieve("router", ctx, [], "open_source")
        # Trim marker '\n... [content trimmed]' is 22 chars; total <= cap + 22.
        assert len(top_files[0].content) <= _MAX_CONTENT_CHARS + 22

    def test_long_item_content_is_trimmed(self) -> None:
        long_content = "router " * 5_000
        items = [make_item(title="Router", content=long_content)]
        ctx = make_context([])
        _, top_items = retrieve("router", ctx, items, "company")
        # Trim marker '\n... [content trimmed]' is 22 chars; total <= cap + 22.
        assert len(top_items[0].content) <= _MAX_CONTENT_CHARS + 22

    def test_trimmed_content_ends_with_marker(self) -> None:
        long_content = "r" * (9 * _MAX_CONTENT_CHARS)  # well over the cap
        files = [make_file("router.py", long_content)]
        ctx = make_context(files)
        top_files, _ = retrieve("router", ctx, [], "open_source")
        assert top_files[0].content.endswith("[content trimmed]")


# ---------------------------------------------------------------------------
# retrieve() -- empty / unrelated question
# ---------------------------------------------------------------------------

class TestRetrieveEmptyResults:
    def test_empty_result_for_unrelated_question(self) -> None:
        files = [
            make_file("auth.py", "authentication and sessions"),
            make_file("db.py", "database connections"),
        ]
        ctx = make_context(files)
        # Question has zero keyword overlap with any file
        top_files, top_items = retrieve(
            "which colour is the sky", ctx, [], "open_source"
        )
        assert top_files == []
        assert top_items == []

    def test_empty_context_returns_empty_lists(self) -> None:
        ctx = make_context([])
        top_files, top_items = retrieve("router", ctx, [], "open_source")
        assert top_files == []
        assert top_items == []

    def test_stop_words_only_question_returns_empty(self) -> None:
        files = [make_file("router.py", "router handler")]
        ctx = make_context(files)
        top_files, top_items = retrieve("what is the", ctx, [], "open_source")
        assert top_files == []
        assert top_items == []


# ---------------------------------------------------------------------------
# retrieve() -- dict-style repository_context (gateway compatibility)
# ---------------------------------------------------------------------------

class TestRetrieveDictContext:
    def test_accepts_raw_dict_context(self) -> None:
        ctx_dict = {
            "visibility": "public",
            "analysis": {},
            "files": [
                {"path": "router.py", "content": "router handler", "url": "https://gh.com/x"},
            ],
        }
        top_files, _ = retrieve("router", ctx_dict, [], "open_source")
        assert len(top_files) == 1
        assert top_files[0].path == "router.py"

    def test_dict_context_missing_files_key_returns_empty(self) -> None:
        ctx_dict: dict = {"visibility": "public", "analysis": {}}
        top_files, _ = retrieve("router", ctx_dict, [], "open_source")
        assert top_files == []
