/**
 * File:        extension/src/types/mode.ts
 * Owner:       Shreyansh (co-owned with Devyani — shared contract)
 * Purpose:     TypeScript mirror of the backend's mode definitions and per-mode feature flags.
 * Contains:    UserMode type, ModeFeatures interface, MODE_FEATURES constant, featuresForMode().
 * Status:      STUB, replace TODOs with real implementation
 * Depends on:  backend/app/core/modes.py (keep in sync), GET /api/me/mode
 */

/** The two modes DevMinds supports. */
export type UserMode = "open_contributor" | "company_employee";

/**
 * Per-mode feature flags the UI reads to decide what to render.
 * This is a SHARED CONTRACT mirrored from backend/app/core/modes.py.
 */
export interface ModeFeatures {
  privateRepos: boolean;
  contributeTab: boolean;
  contextTab: boolean;
  jira: boolean;
  confluence: boolean;
  slackShare: boolean;
}

/**
 * Default feature flags per mode, mirroring the backend's MODE_FEATURES.
 * TODO(Shreyansh): the real source of truth is GET /api/me/mode; these local
 * defaults only power the mock UI before the backend is wired up.
 */
export const MODE_FEATURES: Record<UserMode, ModeFeatures> = {
  open_contributor: {
    privateRepos: false,
    contributeTab: true,
    contextTab: false,
    jira: false,
    confluence: false,
    slackShare: false,
  },
  company_employee: {
    privateRepos: true,
    contributeTab: false,
    contextTab: true,
    jira: true,
    confluence: true,
    slackShare: true,
  },
};

/** Return the feature flags for a mode. */
export function featuresForMode(mode: UserMode): ModeFeatures {
  return MODE_FEATURES[mode];
}
