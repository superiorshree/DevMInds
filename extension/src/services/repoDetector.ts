/**
 * File:        extension/src/services/repoDetector.ts
 * Owner:       Shreyansh
 * Purpose:     Parses the active tab's URL to detect which GitHub repository the user is viewing.
 * Contains:    RepoRef interface and parseGithubRepo() / detectRepoFromTabs() helpers.
 * Status:      STUB, replace TODOs with real implementation
 * Depends on:  (none — pure URL parsing, no feature logic)
 */

/** A detected repository reference. */
export interface RepoRef {
  owner: string;
  repo: string;
}

/**
 * Parse an owner/repo pair out of a github.com URL.
 * Returns null for non-GitHub URLs (the caller shows the welcome screen).
 *
 * Handles:
 *   https://github.com/{owner}/{repo}
 *   https://github.com/{owner}/{repo}/issues, /pull/12, /tree/main, etc.
 *   ...with a trailing ".git" or query/hash fragments.
 */
export function parseGithubRepo(url: string): RepoRef | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.hostname !== "github.com") {
    return null;
  }

  // e.g. ["vercel", "next.js"]
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, "");

  if (!owner || !repo) {
    return null;
  }

  return { owner, repo };
}

/**
 * Detect the repo from the currently active tab.
 * Returns null when chrome APIs are unavailable (e.g. plain browser dev) or the
 * tab is not a GitHub repo page.
 *
 * TODO(Shreyansh): once real permissions are wired, this is the single place
 * the panel learns *which* repo to analyze.
 */
export async function detectRepoFromTabs(): Promise<RepoRef | null> {
  if (typeof chrome === "undefined" || !chrome.tabs?.query) {
    return null;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    return null;
  }
  return parseGithubRepo(tab.url);
}
