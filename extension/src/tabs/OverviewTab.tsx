/**
 * File:        extension/src/tabs/OverviewTab.tsx
 * Owner:       Shreyansh
 * Purpose:     Renders the plain-English overview of the repository (summary, language, stars, topics).
 * Contains:    OverviewTab functional component with an OverviewTabProps interface.
 * Status:      STUB, replace TODOs with real implementation
 * Depends on:  extension/src/types/architecture.ts (Overview)
 */

import type { Overview } from "../types/architecture";

/** Props for the overview tab. */
export interface OverviewTabProps {
  overview: Overview;
}

/** Shows what the repo is, in one paragraph, plus a few key facts. */
export function OverviewTab({ overview }: OverviewTabProps) {
  return (
    <section className="overview-tab">
      <p style={{ marginTop: 0 }}>{overview.summary}</p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-2)",
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-sm)",
        }}
      >
        {overview.primary_language && <span>Language: {overview.primary_language}</span>}
        {typeof overview.stars === "number" && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {overview.stars.toLocaleString()}
          </span>
        )}
        {overview.last_updated && <span>Updated: {overview.last_updated.slice(0, 10)}</span>}
      </div>

      {overview.topics.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
          {overview.topics.map((topic) => (
            <span
              key={topic}
              style={{
                background: "var(--color-bg-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "2px 8px",
                fontSize: "var(--font-size-xs)",
              }}
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* TODO(Shreyansh): pull from GET /api/repositories/{owner}/{repo}/architecture
          once the backend is running, instead of mock data. */}
    </section>
  );
}
