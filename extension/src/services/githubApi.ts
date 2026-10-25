/**
 * File:        extension/src/services/githubApi.ts
 * Purpose:     Direct GitHub REST API integration for real-time live repository facts:
 *              metadata, languages, directory tree/contents, and open issues.
 *              Never uses hardcoded fixtures or dummy data.
 */

export interface GitHubRepoMetadata {
  owner: string;
  repo: string;
  description: string;
  stars: number;
  forks: number;
  openIssuesCount: number;
  defaultBranch: string;
  topics: string[];
  primaryLanguage: string;
}

export interface GitHubFileEntry {
  name: string;
  path: string;
  type: "file" | "dir";
}

export interface GitHubIssueEntry {
  number: number;
  title: string;
  html_url: string;
  state: string;
  labels: string[];
  createdAt: string;
}

export interface LiveRepoSnapshot {
  metadata: GitHubRepoMetadata;
  languages: string[];
  topFiles: GitHubFileEntry[];
  openIssues: GitHubIssueEntry[];
  rateLimited?: boolean;
  rateLimitMessage?: string;
}

// In-memory cache: "owner/repo" -> LiveRepoSnapshot
const snapshotCache = new Map<string, { data: LiveRepoSnapshot; timestamp: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

/** Get GitHub token from Vite env or storage if available */
function getGitHubToken(): string {
  try {
    return (import.meta.env.VITE_GITHUB_TOKEN as string) || "";
  } catch {
    return "";
  }
}

function getHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "DevMinds-Extension",
  };
  const effectiveToken = token || getGitHubToken();
  if (effectiveToken && effectiveToken.trim()) {
    headers.Authorization = `Bearer ${effectiveToken.trim()}`;
  }
  return headers;
}

/** Check response for rate limiting or errors */
async function handleResponse(res: Response, endpoint: string): Promise<any> {
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (res.status === 403 || res.status === 429) {
    const errorBody = await res.json().catch(() => ({}));
    if (remaining === "0" || (errorBody.message && errorBody.message.includes("API rate limit exceeded"))) {
      throw new Error(
        "GitHub API rate limit reached. Add a Personal Access Token to increase the limit to 5,000 requests/hour."
      );
    }
    throw new Error(errorBody.message || `GitHub API request forbidden (403) on ${endpoint}`);
  }

  if (res.status === 404) {
    throw new Error(`Repository resource not found on GitHub (${endpoint})`);
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `GitHub API error HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch full live repository snapshot directly from GitHub REST API.
 * Uses caching, authenticates when token is configured, and reports clear errors.
 */
export async function fetchLiveRepoSnapshot(
  owner: string,
  repo: string,
  customToken?: string
): Promise<LiveRepoSnapshot> {
  const cacheKey = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
  const cached = snapshotCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const headers = getHeaders(customToken);

  // 1. Fetch Repository Metadata
  const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const repoRes = await fetch(repoUrl, { headers });
  const repoData = await handleResponse(repoRes, repoUrl);

  const metadata: GitHubRepoMetadata = {
    owner: repoData.owner?.login || owner,
    repo: repoData.name || repo,
    description: repoData.description || "",
    stars: Number(repoData.stargazers_count || 0),
    forks: Number(repoData.forks_count || 0),
    openIssuesCount: Number(repoData.open_issues_count || 0),
    defaultBranch: repoData.default_branch || "main",
    topics: Array.isArray(repoData.topics) ? repoData.topics : [],
    primaryLanguage: repoData.language || "",
  };

  // 2. Fetch Languages (parallel safe)
  let languages: string[] = [];
  try {
    const langUrl = `https://api.github.com/repos/${owner}/${repo}/languages`;
    const langRes = await fetch(langUrl, { headers });
    if (langRes.ok) {
      const langData = await langRes.json();
      languages = Object.keys(langData);
    }
  } catch {
    if (metadata.primaryLanguage) {
      languages = [metadata.primaryLanguage];
    }
  }

  // 3. Fetch Top-level Contents / Files
  let topFiles: GitHubFileEntry[] = [];
  try {
    const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
    const contentsRes = await fetch(contentsUrl, { headers });
    if (contentsRes.ok) {
      const contentsData = await contentsRes.json();
      if (Array.isArray(contentsData)) {
        topFiles = contentsData.map((item: any) => ({
          name: item.name,
          path: item.path || item.name,
          type: item.type === "dir" ? ("dir" as const) : ("file" as const),
        }));
      }
    }
  } catch {
    topFiles = [];
  }

  // 4. Fetch Open Issues (first 5)
  let openIssues: GitHubIssueEntry[] = [];
  try {
    const issuesUrl = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=5`;
    const issuesRes = await fetch(issuesUrl, { headers });
    if (issuesRes.ok) {
      const issuesData = await issuesRes.json();
      if (Array.isArray(issuesData)) {
        // Filter out pull requests (GitHub issues API includes PRs)
        openIssues = issuesData
          .filter((item: any) => !item.pull_request)
          .map((item: any) => ({
            number: item.number,
            title: item.title,
            html_url: item.html_url,
            state: item.state,
            labels: Array.isArray(item.labels) ? item.labels.map((l: any) => l.name || String(l)) : [],
            createdAt: item.created_at,
          }));
      }
    }
  } catch {
    openIssues = [];
  }

  const snapshot: LiveRepoSnapshot = {
    metadata,
    languages,
    topFiles,
    openIssues,
  };

  snapshotCache.set(cacheKey, { data: snapshot, timestamp: Date.now() });
  return snapshot;
}
