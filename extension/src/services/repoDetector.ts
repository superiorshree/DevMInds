/**
 * File:        extension/src/services/repoDetector.ts
 * Owner:       Shreyansh
 * Purpose:     Parses the active tab's URL to detect which GitHub repository the user is viewing.
 * Contains:    RepoRef interface, NON_REPO_ROUTES constant, parseGithubRepo() and detectRepoFromTabs() helpers.
 * Status:      IMPLEMENTED — pure URL parsing plus active-tab detection (re-runs on tab changes via App).
 * Depends on:  chrome.tabs (activeTab / github.com host permission from manifest.json)
 */

/** A detected repository reference. */
export interface RepoRef {
  owner: string;
  repo: string;
}

/**
 * GitHub's reserved top-level routes. Pages under these are never a
 * {owner}/{repo} page (settings, notifications, marketplace, explore, orgs…),
 * and GitHub does not let users or orgs claim these names either.
 */
const NON_REPO_ROUTES: ReadonlySet<string> = new Set([
  "about",
  "account",
  "apps",
  "assets",
  "codespaces",
  "collections",
  "contact",
  "customer-stories",
  "dashboard",
  "events",
  "explore",
  "features",
  "gist",
  "issues",
  "join",
  "login",
  "logout",
  "marketplace",
  "new",
  "notifications",
  "orgs",
  "organizations",
  "pricing",
  "pulls",
  "repos",
  "search",
  "sessions",
  "settings",
  "showcase",
  "signup",
  "sponsors",
  "stars",
  "topics",
  "trending",
  "try",
  "users",
]);

/**
 * Parse an owner/repo pair out of a github.com URL.
 * Returns null for non-GitHub URLs and for GitHub pages that are not a repo
 * (the caller shows the welcome screen).
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

  if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") {
    return null;
  }

  // e.g. ["vercel", "next.js", "issues"]
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, "");

  // Reserved GitHub routes (github.com/settings, /orgs/x, /marketplace, …)
  // and empty names are not repository pages.
  if (NON_REPO_ROUTES.has(owner) || !owner || !repo) {
    return null;
  }

  return { owner, repo };
}

/**
 * Detect the repo from the currently active tab.
 * Returns null when chrome APIs are unavailable (e.g. plain browser dev) or the
 * tab is not a GitHub repo page. This is the single place the panel learns
 * *which* repo to analyze.
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