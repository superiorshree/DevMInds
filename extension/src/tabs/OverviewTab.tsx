/**
 * File:        extension/src/tabs/OverviewTab.tsx
 * Owner:       Shreyansh
 * Purpose:     Renders the plain-English overview of the repository (summary, language, stars, topics).
 * Contains:    OverviewTab functional component with an OverviewTabProps interface.
 * Status:      REAL — connected to Architecture Agent results with loading, empty, and error states.
 * Depends on:  extension/src/types/architecture.ts (Overview)
 */

import type { Overview } from "../types/architecture";

/** Props for the overview tab. */
export interface OverviewTabProps {
  overview?: Overview | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/** Shows what the repo is, in one paragraph, plus a few key facts. */
export function OverviewTab({ overview, isLoading = false, error = null, onRetry }: OverviewTabProps) {
  if (isLoading) {
    return (
      <section className="overview-tab" style={{ padding: "20px 0", textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            width: "28px",
            height: "28px",
            border: "3px solid #e5e0d8",
            borderTop: "3px solid #f97316",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ marginTop: "12px", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
          Analyzing repository with AI Architecture Agent…
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="overview-tab"
        style={{
          padding: "14px",
          backgroundColor: "#fef2f2",
          border: "1.5px solid #f87171",
          borderRadius: "8px",
          marginTop: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span style={{ color: "#dc2626", fontWeight: 700 }}>✕</span>
          <span style={{ color: "#991b1b", fontWeight: 700, fontSize: "var(--font-size-sm)" }}>
            Analysis Error
          </span>
        </div>
        <p style={{ margin: "0 0 10px 0", color: "#7f1d1d", fontSize: "var(--font-size-xs)", lineHeight: 1.45 }}>
          {error}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: "6px 12px",
              background: "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "var(--font-size-xs)",
              fontWeight: 700,
            }}
          >
            Retry Analysis
          </button>
        )}
      </section>
    );
  }

  if (!overview || !overview.summary) {
    return (
      <section className="overview-tab" style={{ padding: "16px 0", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
        <p style={{ margin: 0 }}>No overview summary available for this repository yet.</p>
      </section>
    );
  }

  return (
    <section className="overview-tab">
      <p style={{ marginTop: 0, lineHeight: 1.55, fontSize: "var(--font-size-sm)", color: "#1f2937" }}>
        {overview.summary}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-2)",
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-sm)",
          marginTop: "12px",
        }}
      >
        {overview.primary_language && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f97316" }} />
            {overview.primary_language}
          </span>
        )}
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

      {overview.topics && overview.topics.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
          {overview.topics.map((topic) => (
            <span
              key={topic}
              style={{
                background: "var(--color-bg-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "2px 8px",
                fontSize: "var(--font-size-xs)",
                fontWeight: 600,
                color: "#4b5563",
              }}
            >
              {topic}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
