/**
 * File:        extension/src/services/api.ts
 * Owner:       Shreyansh
 * Purpose:     The single HTTP client for the extension — every backend call goes through here, with the base URL read from env.
 * Contains:    API_BASE_URL, BackendUnreachableError, session-token storage helpers, request() wrapper,
 *              analyzeRepository, getMe, getMode, setMode, signIn, signOut (plus the analyze /
 *              architecture / context / chat / integrations stubs other tabs will call).
 * Status:      IMPLEMENTED — sign-in, mode and session handling wired; data endpoints typed per the contract,
 *              backend-unreachable requests fall back to mock/local data so the UI still renders.
 * Depends on:  extension/src/types/mode.ts, extension/src/types/architecture.ts,
 *              docs/API_CONTRACT.md (GET /api/auth/me, /api/auth/github, /api/me/mode, POST /api/auth/logout, POST /api/repositories/analyze)
 */

import type { ArchitectureBundle, ChatResponse, IntegrationStatus } from "../types/architecture";
import type { ModeFeatures, UserMode } from "../types/mode";
import { featuresForMode } from "../types/mode";

/** Backend base URL. Only VITE_* vars reach the frontend — no secrets here. */
const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

/** Session token key in chrome.storage. Never logged, never persisted beyond the session. */
const TOKEN_KEY = "devminds_session_token";

/** Mode + features as returned by GET /api/me/mode. */
export interface ModeResponse {
  mode: UserMode;
  features: ModeFeatures;
}

/** The signed-in GitHub user as returned by GET /api/auth/me. */
export interface SessionUser {
  id: string;
  github_login: string;
  avatar_url: string | null;
  mode: UserMode;
}

/**
 * Thrown when the backend host cannot be reached at all (as opposed to an
 * HTTP error response). Callers fall back to mock/local data when they see it.
 */
export class BackendUnreachableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendUnreachableError";
  }
}

/** Build the local mode/features payload used when the backend is unreachable. */
export function localModeResponse(mode: UserMode): ModeResponse {
  return { mode, features: featuresForMode(mode) };
}

/* ------------------------------------------------------------------ */
/* Session token storage: chrome.storage.session, fallback to local.   */
/* ------------------------------------------------------------------ */

/** Read the stored session token (null when signed out or storage is missing). */
async function getSessionToken(): Promise<string | null> {
  if (typeof chrome === "undefined" || !chrome.storage) {
    return null;
  }
  const store = chrome.storage.session ?? chrome.storage.local;
  const stored = await store.get(TOKEN_KEY);
  return (stored[TOKEN_KEY] as string | undefined) ?? null;
}

/** Persist the session token (session storage, falling back to local storage). */
async function storeSessionToken(token: string): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage) {
    return;
  }
  const store = chrome.storage.session ?? chrome.storage.local;
  await store.set({ [TOKEN_KEY]: token });
}

/** Forget the stored session token. */
async function clearSessionToken(): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage) {
    return;
  }
  const store = chrome.storage.session ?? chrome.storage.local;
  await store.remove(TOKEN_KEY);
}

/* ------------------------------------------------------------------ */
/* HTTP plumbing                                                       */
/* ------------------------------------------------------------------ */

/** Thin fetch wrapper: JSON in, JSON out, session token as a Bearer header. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSessionToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      ...init,
      headers,
    });
  } catch {
    // fetch only rejects when the host is unreachable (network error).
    throw new BackendUnreachableError(`Backend at ${API_BASE_URL} is unreachable`);
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${path}`);
  }
  return (await response.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

/** Return the signed-in user; throws a plain Error (e.g. 401) when not signed in. */
export function getMe(): Promise<SessionUser> {
  return request<SessionUser>("/api/auth/me");
}

/**
 * Extract the session token from the OAuth redirect URL. The backend redirects
 * back to the extension with the token in the fragment (query as a fallback).
 */
function extractToken(redirectUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(redirectUrl);
  } catch {
    return null;
  }
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  return (
    fragment.get("token") ??
    fragment.get("access_token") ??
    parsed.searchParams.get("token") ??
    parsed.searchParams.get("access_token")
  );
}

/**
 * Start GitHub sign-in through the backend OAuth flow in a new window, then
 * store the session token it hands back. Returns the signed-in user.
 */
export async function signIn(): Promise<SessionUser> {
  if (
    typeof chrome === "undefined" ||
    !chrome.identity?.launchWebAuthFlow ||
    !chrome.identity?.getRedirectURL
  ) {
    throw new Error("Sign-in can only run inside the Chrome extension.");
  }

  const redirectUri = chrome.identity.getRedirectURL("provide_cb.html");
  const authUrl = new URL(`${API_BASE_URL}/api/auth/github`);
  authUrl.searchParams.set("redirect_uri", redirectUri);

  const redirectUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true,
  });
  if (!redirectUrl) {
    throw new Error("GitHub sign-in was cancelled.");
  }

  const token = extractToken(redirectUrl);
  if (!token) {
    throw new Error("The sign-in response did not include a session token.");
  }
  await storeSessionToken(token);
  return getMe();
}

/** Log out server-side and clear the local session token. */
export async function signOut(): Promise<void> {
  try {
    await request<{ detail: string }>("/api/auth/logout", { method: "POST" });
  } finally {
    await clearSessionToken();
  }
}

/* ------------------------------------------------------------------ */
/* Mode                                                                */
/* ------------------------------------------------------------------ */

/**
 * Return the current server-side mode + features.
 * When the backend is unreachable, falls back to the local defaults so the
 * shell still renders (the backend remains the only authority on real requests).
 */
export async function getMode(): Promise<ModeResponse> {
  try {
    return await request<ModeResponse>("/api/me/mode");
  } catch (error) {
    if (error instanceof BackendUnreachableError) {
      return localModeResponse("open_source");
    }
    throw error;
  }
}

/** Switch the user's mode server-side and return the refreshed mode + features. */
export function setMode(mode: UserMode): Promise<ModeResponse> {
  return request<ModeResponse>("/api/me/mode", {
    method: "PUT",
    body: JSON.stringify({ mode }),
  });
}

/* ------------------------------------------------------------------ */
/* Data endpoints (typed per the contract; called by tabs)             */
/* ------------------------------------------------------------------ */

/** Kick off analysis for a repository. Uses the server-side mode. */
export function analyze(owner: string, name: string, branch = "main"): Promise<{ job_id: string }> {
  return request<{ job_id: string }>("/api/repositories/analyze", {
    method: "POST",
    body: JSON.stringify({ owner, name, branch }),
  });
}

/**
 * Analyze a repository via POST /api/repositories/analyze with the session token,
 * returning the resulting architecture bundle.
 */
export async function analyzeRepository(
  owner: string,
  repo: string
): Promise<ArchitectureBundle> {
  const result = await request<ArchitectureBundle | { job_id: string }>(
    "/api/repositories/analyze",
    {
      method: "POST",
      body: JSON.stringify({ owner, name: repo, branch: "main" }),
    }
  );
  if ("overview" in result && "technologies" in result) {
    return result;
  }
  return getArchitecture(owner, repo);
}

/** Fetch the architecture bundle for a repository. */
export function getArchitecture(owner: string, name: string): Promise<ArchitectureBundle> {
  return request<ArchitectureBundle>(`/api/repositories/${owner}/${name}/architecture`);
}

/** Fetch Jira + Confluence context (company mode only; 403 in contributor mode). */
export function getContext(owner: string, name: string): Promise<unknown> {
  return request<unknown>(`/api/repositories/${owner}/${name}/context`);
}

/** Ask a question about a repository; returns an answer with sources. */
export function postChat(owner: string, name: string, question: string): Promise<ChatResponse> {
  return request<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ owner, name, question }),
  });
}

/** List integration providers and their connection status. */
export function listIntegrations(): Promise<{ providers: IntegrationStatus[] }> {
  return request<{ providers: IntegrationStatus[] }>("/api/integrations");
}

/** Share the architecture summary to Slack (company mode only). */
export function shareToSlack(owner: string, name: string, channel: string): Promise<unknown> {
  return request<unknown>("/api/integrations/slack/share", {
    method: "POST",
    body: JSON.stringify({ owner, name, channel }),
  });
}