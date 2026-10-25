/**
 * File:        extension/src/services/githubApi.ts
 * Owner:       Shreyansh
 * Purpose:     Centralized GitHub API client for fetching live repository data,
 *              languages, file structure, README, open issues, and user repositories.
 * Contains:    fetchRepoDetails, fetchRepoLanguages, fetchRepoContents, fetchRepoReadme,
 *              fetchRepoIssues, fetchRepoContributors, fetchUserRepos, getLiveRepoBundle,
 *              RateLimitError, and in-memory TTL caching.
 * Status:      REAL — Live GitHub REST API with auth headers, rate-limit handling, and error states.
 * Depends on:  docs/API_CONTRACT.md, https://api.github.com
 */

import type { ArchitectureBundle } from "../types/architecture";

export interface GitHubRepoDetails {
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  default_branch: string;
  html_url: string;
  updated_at: string;
  visibility: "public" | "private";
}

export interface GitHubContentItem {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  size: number;
  html_url: string;
  download_url: string | null;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  labels: Array<{ id?: number; name: string; color?: string }>;
  user: { login: string; avatar_url?: string } | null;
  comments: number;
  created_at: string;
  body?: string | null;
}

export interface GitHubContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

export interface GitHubUserRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  private: boolean;
  html_url: string;
  description: string | null;
  language: string | null;
  default_branch: string;
}

export interface ArchitectureNode {
  id: string;
  name: string;
  type: "directory" | "entrypoint" | "config" | "service";
  description: string;
  path: string;
}

export interface LiveRepoBundle {
  details: GitHubRepoDetails;
  languages: Record<string, number>;
  topLanguages: string[];
  contents: GitHubContentItem[];
  readmeMarkdown: string | null;
  issues: GitHubIssue[];
  contributors: GitHubContributor[];
  setupSteps: string[];
  prerequisites: string[];
  testCommands: string[];
  architectureNodes: ArchitectureNode[];
  rateLimit: {
    limit: number;
    remaining: number;
    resetEpoch: number;
    resetFormatted: string;
  };
}

/** Error thrown when GitHub rate limit (60/hr unauth or 5000/hr auth) is hit. */
export class RateLimitError extends Error {
  public resetTime: string;
  public resetEpoch: number;
  public limit: number;

  constructor(message: string, resetEpoch: number, limit: number) {
    super(message);
    this.name = "RateLimitError";
    this.resetEpoch = resetEpoch;
    this.limit = limit;
    this.resetTime = resetEpoch
      ? new Date(resetEpoch * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "soon";
  }
}

/** 5-minute in-memory cache to conserve GitHub API rate limits. */
interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const responseCache = new Map<string, CacheEntry<unknown>>();

/** Retrieve auth token if stored in chrome storage or env. */
export async function getGitHubToken(): Promise<string | null> {
  const envToken = import.meta.env.VITE_GITHUB_TOKEN as string | undefined;
  if (envToken && envToken.trim().length > 0) {
    return envToken.trim();
  }

  if (typeof chrome !== "undefined" && chrome.storage) {
    try {
      const store = chrome.storage.session ?? chrome.storage.local;
      const res = await store.get(["github_token", "github_access_token"]);
      const stored = (res.github_token as string) || (res.github_access_token as string);
      if (stored && stored.trim().length > 0) {
        return stored.trim();
      }
    } catch {
      // Storage access failed or unavailable
    }
  }

  return null;
}

/** Base fetch helper with headers, rate limit tracking, and caching. */
async function githubFetch<T>(endpoint: string, options?: { skipCache?: boolean }): Promise<{
  data: T;
  rateLimit: { limit: number; remaining: number; resetEpoch: number; resetFormatted: string };
}> {
  const url = endpoint.startsWith("https://") ? endpoint : `https://api.github.com${endpoint}`;

  if (!options?.skipCache) {
    const cached = responseCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        data: cached.data as T,
        rateLimit: { limit: 60, remaining: 59, resetEpoch: 0, resetFormatted: "" },
      };
    }
  }

  const token = await getGitHubToken();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { headers });
  } catch (err) {
    throw new Error(
      `Network error connecting to GitHub API (${url}): ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const limitHeader = response.headers.get("x-ratelimit-limit");
  const remainingHeader = response.headers.get("x-ratelimit-remaining");
  const resetHeader = response.headers.get("x-ratelimit-reset");

  const limit = limitHeader ? parseInt(limitHeader, 10) : 60;
  const remaining = remainingHeader ? parseInt(remainingHeader, 10) : 60;
  const resetEpoch = resetHeader ? parseInt(resetHeader, 10) : Math.floor(Date.now() / 1000) + 3600;
  const resetFormatted = new Date(resetEpoch * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const rateLimit = { limit, remaining, resetEpoch, resetFormatted };

  if (response.status === 403 || response.status === 429) {
    if (remaining === 0) {
      throw new RateLimitError(
        `GitHub API rate limit reached. Limit will reset at ${resetFormatted}.`,
        resetEpoch,
        limit
      );
    }
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository or resource not found on GitHub (${response.status})`);
    }
    const errBody = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${errBody || response.statusText}`);
  }

  const data = (await response.json()) as T;
  responseCache.set(url, { timestamp: Date.now(), data });

  return { data, rateLimit };
}

/** Fetch repo metadata: name, stars, topics, description, default branch. */
export async function fetchRepoDetails(owner: string, repo: string): Promise<GitHubRepoDetails> {
  const res = await githubFetch<Record<string, unknown>>(`/repos/${owner}/${repo}`);
  const d = res.data;
  return {
    owner: (d.owner as { login?: string })?.login || owner,
    name: (d.name as string) || repo,
    full_name: (d.full_name as string) || `${owner}/${repo}`,
    description: (d.description as string | null) || null,
    language: (d.language as string | null) || null,
    stargazers_count: typeof d.stargazers_count === "number" ? d.stargazers_count : 0,
    forks_count: typeof d.forks_count === "number" ? d.forks_count : 0,
    open_issues_count: typeof d.open_issues_count === "number" ? d.open_issues_count : 0,
    topics: Array.isArray(d.topics) ? (d.topics as string[]) : [],
    default_branch: (d.default_branch as string) || "main",
    html_url: (d.html_url as string) || `https://github.com/${owner}/${repo}`,
    updated_at: (d.updated_at as string) || new Date().toISOString(),
    visibility: d.private ? "private" : "public",
  };
}

/** Fetch languages used in repo: { [language]: bytes }. */
export async function fetchRepoLanguages(owner: string, repo: string): Promise<Record<string, number>> {
  try {
    const res = await githubFetch<Record<string, number>>(`/repos/${owner}/${repo}/languages`);
    return res.data;
  } catch {
    return {};
  }
}

/** Fetch root directory contents (files and folders). */
export async function fetchRepoContents(
  owner: string,
  repo: string,
  path = ""
): Promise<GitHubContentItem[]> {
  try {
    const res = await githubFetch<Array<Record<string, unknown>>>(
      `/repos/${owner}/${repo}/contents/${path}`
    );
    if (!Array.isArray(res.data)) return [];
    return res.data.map((item) => ({
      name: String(item.name || ""),
      path: String(item.path || ""),
      type: (item.type as "file" | "dir" | "symlink" | "submodule") || "file",
      size: typeof item.size === "number" ? item.size : 0,
      html_url: String(item.html_url || ""),
      download_url: item.download_url ? String(item.download_url) : null,
    }));
  } catch {
    return [];
  }
}

/** Fetch repository README decoded from base64. */
export async function fetchRepoReadme(owner: string, repo: string): Promise<string | null> {
  try {
    const res = await githubFetch<{ content?: string; encoding?: string }>(
      `/repos/${owner}/${repo}/readme`
    );
    if (!res.data?.content) return null;
    if (res.data.encoding === "base64") {
      const cleanBase64 = res.data.content.replace(/\s/g, "");
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new TextDecoder("utf-8").decode(bytes);
    }
    return res.data.content;
  } catch {
    return null;
  }
}

/** Fetch open issues (excluding pull requests). */
export async function fetchRepoIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
  try {
    const res = await githubFetch<Array<Record<string, unknown>>>(
      `/repos/${owner}/${repo}/issues?state=open&per_page=15`
    );
    if (!Array.isArray(res.data)) return [];
    return res.data
      .filter((item) => !item.pull_request) // exclude pull requests
      .map((item) => ({
        id: Number(item.id || 0),
        number: Number(item.number || 0),
        title: String(item.title || "Untitled Issue"),
        html_url: String(item.html_url || ""),
        state: (item.state as "open" | "closed") || "open",
        labels: Array.isArray(item.labels)
          ? item.labels.map((l: Record<string, unknown>) => ({
              id: typeof l.id === "number" ? l.id : undefined,
              name: String(l.name || ""),
              color: l.color ? String(l.color) : undefined,
            }))
          : [],
        user: item.user
          ? {
              login: String((item.user as Record<string, unknown>).login || ""),
              avatar_url: (item.user as Record<string, unknown>).avatar_url
                ? String((item.user as Record<string, unknown>).avatar_url)
                : undefined,
            }
          : null,
        comments: Number(item.comments || 0),
        created_at: String(item.created_at || ""),
        body: item.body ? String(item.body) : null,
      }));
  } catch {
    return [];
  }
}

/** Fetch contributors / maintainers. */
export async function fetchRepoContributors(
  owner: string,
  repo: string
): Promise<GitHubContributor[]> {
  try {
    const res = await githubFetch<Array<Record<string, unknown>>>(
      `/repos/${owner}/${repo}/contributors?per_page=10`
    );
    if (!Array.isArray(res.data)) return [];
    return res.data.map((c) => ({
      login: String(c.login || ""),
      avatar_url: String(c.avatar_url || ""),
      html_url: String(c.html_url || ""),
      contributions: Number(c.contributions || 0),
    }));
  } catch {
    return [];
  }
}

/** Fetch user repositories for the CompanyRepoConnectView. */
export async function fetchUserRepos(username?: string): Promise<GitHubUserRepo[]> {
  const token = await getGitHubToken();
  const endpoint = token
    ? "/user/repos?sort=updated&per_page=30&affiliation=owner,collaborator,organization_member"
    : username
    ? `/users/${username}/repos?sort=updated&per_page=30`
    : "/user/repos?sort=updated&per_page=30";

  const res = await githubFetch<Array<Record<string, unknown>>>(endpoint);
  if (!Array.isArray(res.data)) return [];
  return res.data.map((r) => ({
    id: Number(r.id || 0),
    name: String(r.name || ""),
    full_name: String(r.full_name || ""),
    owner: { login: String((r.owner as Record<string, unknown>)?.login || "") },
    private: Boolean(r.private),
    html_url: String(r.html_url || ""),
    description: r.description ? String(r.description) : null,
    language: r.language ? String(r.language) : null,
    default_branch: String(r.default_branch || "main"),
  }));
}

/**
 * Extract setup commands and prerequisites from README or root files.
 */
function extractSetupGuide(
  readme: string | null,
  contents: GitHubContentItem[],
  languages: Record<string, number>
): { setupSteps: string[]; prerequisites: string[]; testCommands: string[] } {
  const setupSteps: string[] = [];
  const prerequisites: string[] = [];
  const testCommands: string[] = [];

  const fileNames = new Set(contents.map((c) => c.name.toLowerCase()));
  const langNames = Object.keys(languages);

  // Check language hints
  if (fileNames.has("package.json") || langNames.includes("TypeScript") || langNames.includes("JavaScript")) {
    prerequisites.push("Node.js 18+");
    if (fileNames.has("pnpm-lock.yaml")) {
      prerequisites.push("pnpm");
      setupSteps.push("pnpm install");
      setupSteps.push("pnpm dev");
      testCommands.push("pnpm test");
    } else if (fileNames.has("yarn.lock")) {
      prerequisites.push("Yarn");
      setupSteps.push("yarn install");
      setupSteps.push("yarn dev");
      testCommands.push("yarn test");
    } else {
      prerequisites.push("npm");
      setupSteps.push("npm install");
      setupSteps.push("npm run dev");
      testCommands.push("npm test");
    }
  }

  if (fileNames.has("requirements.txt") || fileNames.has("pyproject.toml") || langNames.includes("Python")) {
    prerequisites.push("Python 3.10+");
    if (fileNames.has("pyproject.toml")) {
      setupSteps.push("poetry install (or pip install -e .)");
      testCommands.push("pytest");
    } else if (fileNames.has("requirements.txt")) {
      setupSteps.push("pip install -r requirements.txt");
      testCommands.push("pytest");
    }
  }

  if (fileNames.has("cargo.toml") || langNames.includes("Rust")) {
    prerequisites.push("Rust & Cargo");
    setupSteps.push("cargo build");
    testCommands.push("cargo test");
  }

  if (fileNames.has("go.mod") || langNames.includes("Go")) {
    prerequisites.push("Go 1.20+");
    setupSteps.push("go build ./...");
    testCommands.push("go test ./...");
  }

  if (fileNames.has("dockerfile") || fileNames.has("docker-compose.yml")) {
    prerequisites.push("Docker & Docker Compose");
    if (fileNames.has("docker-compose.yml")) {
      setupSteps.push("docker compose up -d");
    }
  }

  // Parse README for explicit code blocks if available
  if (readme) {
    const installHeaderRegex = /(?:#{1,4}\s+(?:Installation|Setup|Getting Started|Quick Start|Running|How to run))([\s\S]*?)(?:\n#{1,4}\s+|$)/i;
    const match = installHeaderRegex.exec(readme);
    if (match && match[1]) {
      const sectionText = match[1];
      const codeBlockRegex = /```(?:bash|sh|shell|zsh)?\n([\s\S]*?)```/g;
      let codeMatch;
      const foundCommands: string[] = [];
      while ((codeMatch = codeBlockRegex.exec(sectionText)) !== null) {
        const lines = codeMatch[1]
          .split("\n")
          .map((l) => l.trim().replace(/^\$\s*/, ""))
          .filter((l) => l.length > 0 && !l.startsWith("#"));
        foundCommands.push(...lines);
      }
      if (foundCommands.length > 0) {
        // Prepend explicit commands from README
        setupSteps.unshift(...foundCommands.slice(0, 4));
      }
    }
  }

  // De-duplicate
  const uniqueSteps = Array.from(new Set(setupSteps));
  const uniquePrereqs = Array.from(new Set(prerequisites));
  const uniqueTests = Array.from(new Set(testCommands));

  return {
    setupSteps: uniqueSteps.length > 0 ? uniqueSteps : ["git clone <repo-url>", "Inspect README.md for setup instructions"],
    prerequisites: uniquePrereqs.length > 0 ? uniquePrereqs : ["Git"],
    testCommands: uniqueTests.length > 0 ? uniqueTests : ["Check README.md for test suite instructions"],
  };
}

/**
 * Derive architecture nodes dynamically from actual repository directory structure and key entry files.
 */
function deriveArchitectureNodes(
  contents: GitHubContentItem[],
  languages: Record<string, number>
): ArchitectureNode[] {
  const nodes: ArchitectureNode[] = [];

  // Directories in root
  const dirs = contents.filter((c) => c.type === "dir");
  for (const dir of dirs) {
    let description = "Directory containing source code and modules";
    const nameLower = dir.name.toLowerCase();
    if (nameLower.includes("front") || nameLower === "ui" || nameLower === "client") {
      description = "Frontend user interface and client components";
    } else if (nameLower.includes("back") || nameLower === "server" || nameLower === "api") {
      description = "Backend server, API endpoints, and business logic";
    } else if (nameLower.includes("doc")) {
      description = "Project documentation, architecture guides, and specs";
    } else if (nameLower.includes("test")) {
      description = "Automated test suites, unit tests, and integration tests";
    } else if (nameLower === "src") {
      description = "Core application source tree";
    } else if (nameLower === "lib" || nameLower === "pkg") {
      description = "Shared libraries, internal packages, and utilities";
    } else if (nameLower.includes("infra") || nameLower === "deploy" || nameLower === "k8s") {
      description = "Infrastructure configuration and deployment scripts";
    } else if (nameLower === "extension") {
      description = "Browser extension client and background workers";
    }

    nodes.push({
      id: dir.name,
      name: dir.name,
      type: "directory",
      description,
      path: dir.path,
    });
  }

  // Key entry files
  const keyFiles = contents.filter(
    (c) =>
      c.type === "file" &&
      [
        "package.json",
        "pyproject.toml",
        "requirements.txt",
        "cargo.toml",
        "dockerfile",
        "docker-compose.yml",
        "main.py",
        "app.py",
        "index.ts",
        "index.js",
        "main.go",
        "readme.md",
      ].includes(c.name.toLowerCase())
  );

  for (const file of keyFiles) {
    let description = "Project configuration and dependencies";
    const nameLower = file.name.toLowerCase();
    if (nameLower === "readme.md") {
      description = "Primary project documentation and overview";
    } else if (nameLower === "dockerfile" || nameLower === "docker-compose.yml") {
      description = "Containerization and local runtime orchestration";
    } else if (nameLower === "package.json" || nameLower === "pyproject.toml" || nameLower === "cargo.toml") {
      description = "Manifest declaring dependencies, scripts, and package metadata";
    } else if (nameLower.startsWith("main") || nameLower.startsWith("app") || nameLower.startsWith("index")) {
      description = "Primary runtime entry point and initialization logic";
    }

    nodes.push({
      id: file.name,
      name: file.name,
      type: file.name.endsWith(".md") || file.name.endsWith(".json") || file.name.endsWith(".toml") ? "config" : "entrypoint",
      description,
      path: file.path,
    });
  }

  return nodes;
}

/**
 * Aggregator: fetches complete live bundle for a given repository.
 */
export async function getLiveRepoBundle(owner: string, repo: string): Promise<LiveRepoBundle> {
  const [details, languages, contents, readmeMarkdown, issues, contributors] = await Promise.all([
    fetchRepoDetails(owner, repo),
    fetchRepoLanguages(owner, repo),
    fetchRepoContents(owner, repo),
    fetchRepoReadme(owner, repo),
    fetchRepoIssues(owner, repo),
    fetchRepoContributors(owner, repo),
  ]);

  const topLanguages = Object.keys(languages).slice(0, 8);
  const { setupSteps, prerequisites, testCommands } = extractSetupGuide(
    readmeMarkdown,
    contents,
    languages
  );
  const architectureNodes = deriveArchitectureNodes(contents, languages);

  return {
    details,
    languages,
    topLanguages,
    contents,
    readmeMarkdown,
    issues,
    contributors,
    setupSteps,
    prerequisites,
    testCommands,
    architectureNodes,
    rateLimit: {
      limit: 60,
      remaining: 60,
      resetEpoch: 0,
      resetFormatted: "",
    },
  };
}

/**
 * Converts a LiveRepoBundle into an ArchitectureBundle for tabs requiring the standard contract shape.
 */
export function bundleToArchitecture(bundle: LiveRepoBundle): ArchitectureBundle {
  const dirs = bundle.contents.filter((c) => c.type === "dir");
  const components = dirs.map((d) => ({
    id: d.name,
    name: d.name,
    description: `Directory containing ${d.name} module source code`,
    files: [d.path],
  }));

  const connections = [];
  if (dirs.length > 1) {
    for (let i = 0; i < dirs.length - 1; i++) {
      connections.push({
        from: dirs[i].name,
        to: dirs[i + 1].name,
        relationship: "coordinates with",
      });
    }
  }

  const keyFiles = bundle.contents.filter(
    (c) =>
      c.type === "file" &&
      ["main.py", "app.py", "index.ts", "index.js", "main.go", "server.py"].includes(
        c.name.toLowerCase()
      )
  );

  const entry_points = keyFiles.map((f) => ({
    file: f.path,
    reason: `Primary execution entry point for the repository.`,
  }));

  if (entry_points.length === 0 && bundle.contents.length > 0) {
    const readme = bundle.contents.find((c) => c.name.toLowerCase() === "readme.md");
    if (readme) {
      entry_points.push({
        file: readme.path,
        reason: "Documentation entry point and overview.",
      });
    }
  }

  let summary = bundle.details.description;
  if (!summary && bundle.readmeMarkdown) {
    const cleanLines = bundle.readmeMarkdown
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("![") && !l.startsWith("<"));
    if (cleanLines.length > 0) {
      summary = cleanLines[0];
    }
  }

  return {
    repository: {
      owner: bundle.details.owner,
      name: bundle.details.name,
      branch: bundle.details.default_branch,
    },
    overview: {
      summary: summary || "Repository source code and documentation.",
      primary_language: bundle.details.language,
      stars: bundle.details.stargazers_count,
      topics: bundle.details.topics,
      last_updated: bundle.details.updated_at,
    },
    technologies: Object.keys(bundle.languages).map((name) => ({
      name,
      category: "language",
      evidence_files: bundle.contents.filter((c) => c.type === "file").slice(0, 2).map((c) => c.name),
    })),
    entry_points,
    components:
      components.length > 0
        ? components
        : [
            {
              id: "core",
              name: bundle.details.name,
              description: "Main repository codebase",
              files: bundle.contents.slice(0, 5).map((c) => c.name),
            },
          ],
    connections,
    contributor_guide: {
      setup_steps: bundle.setupSteps,
      contribution_rules: [
        "Create a branch for your changes.",
        "Ensure all tests pass before opening a pull request.",
        "Keep pull requests focused on a single change.",
      ],
      good_first_issues: bundle.issues.map((i) => ({
        title: `#${i.number} ${i.title}`,
        url: i.html_url,
      })),
      maintainers: bundle.contributors.map((c) => ({
        login: c.login,
        avatar_url: c.avatar_url,
      })),
    },
    related_context: null,
  };
}
