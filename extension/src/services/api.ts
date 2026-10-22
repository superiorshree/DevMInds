/**
 * File:        extension/src/services/api.ts
 * Owner:       Shreyansh
 * Purpose:     The single HTTP client for the extension — every backend call goes through here, with the base URL read from env.
 * Contains:    apiBaseUrl, request() helper, and typed stub functions (getMode, putMode, getArchitecture, getContext, postChat, listIntegrations, shareToSlack).
 * Status:      STUB, replace TODOs with real implementation
 * Depends on:  extension/src/types/mode.ts, extension/src/types/architecture.ts, GET /api/me/mode
 */

import type { ArchitectureBundle, ChatResponse, IntegrationStatus } from "../types/architecture";
import type { ModeFeatures, UserMode } from "../types/mode";

/** Backend base URL. Only VITE_* vars reach the frontend — no secrets here. */
const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

/** Mode + features as returned by GET /api/me/mode. */
export interface ModeResponse {
  mode: UserMode;
  features: ModeFeatures;
}

/** Thin fetch wrapper: JSON in, JSON out, with credentials for the session cookie. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${path}`);
  }
  return (await response.json()) as T;
}

/** Return the current server-side mode + features. */
export function getMode(): Promise<ModeResponse> {
  // TODO(Shreyansh): switch the UI to this once the backend is running.
  return request<ModeResponse>("/api/me/mode");
}

/** Switch the user's mode server-side. */
export function putMode(mode: UserMode): Promise<ModeResponse> {
  return request<ModeResponse>("/api/me/mode", {
    method: "PUT",
    body: JSON.stringify({ mode }),
  });
}

/** Kick off analysis for a repository. */
export function analyze(owner: string, name: string, branch = "main"): Promise<{ job_id: string }> {
  return request<{ job_id: string }>("/api/repositories/analyze", {
    method: "POST",
    body: JSON.stringify({ owner, name, branch }),
  });
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
