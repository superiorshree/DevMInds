# File:        backend/app/services/github_service.py
# Owner:       Shreyansh
# Purpose:     Thin wrapper exposing get_repository_files for the AI context.
# Contains:    async get_repository_files() that uses GitHubAdapter internally.
# Status:      REAL — delegates to GitHubAdapter.
# Depends on:  backend/app/integrations/github.py, httpx

from __future__ import annotations

from typing import List

from app.integrations.github import GithubFile, GitHubAdapter


async def get_repository_files(
    owner: str,
    repo: str,
    token: str,
    max_files: int = 200,
) -> List[GithubFile]:
    """Return up to max_files text files from a GitHub repository.

    Uses the GitHubAdapter to fetch the tree and filter files.
    Text files only, at most 200 files, each at most 50 KB, each with its
    GitHub url. Skip binary, minified and lock files and the folders below.

    Args:
        owner: Repository owner (e.g. "vercel").
        repo: Repository name (e.g. "next.js").
        token: Signed-in user's GitHub token (optional for public repos).
        max_files: Maximum number of files to return (default 200).

    Returns:
        List[GithubFile]: File entries with path, content, and GitHub url.

    Raises:
        RateLimitError: If GitHub rate limits us.
        AdapterError: If the repo is not found or access is denied.
    """
    adapter = GitHubAdapter()
    tree = adapter.get_file_tree(owner=owner, repo=repo, token=token)

    # The get_file_tree already caps at 200 and enforces 50 KB per file,
    # but we double-check here to be safe.
    result: List[GithubFile] = []
    for f in tree:
        if len(result) >= max_files:
            break
        # Enforce 50 KB content limit
        if len(f.content) > 50 * 1024:
            continue
        result.append(f)

    return result