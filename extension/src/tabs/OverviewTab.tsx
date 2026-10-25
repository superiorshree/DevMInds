/**
 * File:        extension/src/tabs/OverviewTab.tsx
 * Owner:       Shreyansh
 * Purpose:     Renders the plain-English overview of the repository (summary, language, stars, topics).
 * Contains:    OverviewTab functional component with an OverviewTabProps interface.
 * Status:      REAL — connected to Architecture Agent results with loading, empty, and error states.
 * Depends on:  extension/src/types/architecture.ts (Overview)
 */

import type { ArchitectureBundle } from "../types/architecture";
import { SourceCard } from "../components/SourceCard";
import type { SourceLabel } from "../components/SourceCard";

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

/** Skeleton placeholder shown while analysis is in flight. */
function OverviewSkeleton() {
  return (
    <div
      className="overview-tab overview-tab--loading"
      aria-busy="true"
      aria-label="Analyzing repository..."
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        width: "100%",
      }}
    >
      <div
        style={{
          padding: "var(--space-4)",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          flexDirection: "column",
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
    </div>
  );
}

/**
 * Repository Overview tab displaying real codebase analysis facts:
 * technologies with evidence, entry points with reasons, and key components/folders.
 */
export function OverviewTab({
  analysis,
  loading,
  error,
  onAnalyze,
}: OverviewTabProps) {
  // 1. Loading state: skeleton
  if (loading) {
    return <OverviewSkeleton />;
  }

  // 2. Error state: message + Retry button
  if (error) {
    return (
      <section
        className="overview-tab overview-tab--error"
        role="alert"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          width: "100%",
        }}
      >
        <div
          style={{
            padding: "var(--space-4)",
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-danger)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              color: "var(--color-danger)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <strong style={{ fontSize: "var(--font-size-md)" }}>
              Analysis Failed
            </strong>
          </div>
          <p
            style={{
              margin: 0,
              color: "var(--color-text)",
              fontSize: "var(--font-size-sm)",
              lineHeight: 1.5,
            }}
          >
            {error}
          </p>
          <button
            type="button"
            onClick={onAnalyze}
            style={{
              alignSelf: "flex-start",
              marginTop: "var(--space-2)",
              padding: "var(--space-2) var(--space-4)",
              background: "var(--color-primary)",
              color: "var(--color-primary-contrast)",
              border: "1.5px solid #000000",
              borderRadius: "var(--radius-sm)",
              fontWeight: 700,
              fontSize: "var(--font-size-sm)",
              cursor: "pointer",
            }}
          >
            Retry Analysis
          </button>
        </div>
      </section>
    );
  }

  // 3. Empty state: Analyze Repository button
  if (!analysis) {
    return (
      <section
        className="overview-tab overview-tab--empty"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          width: "100%",
        }}
      >
        <div
          style={{
            padding: "var(--space-5) var(--space-4)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "var(--color-bg-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-primary)",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>
            <h3
              style={{
                margin: "0 0 var(--space-1) 0",
                fontSize: "var(--font-size-md)",
                fontWeight: 700,
                color: "var(--color-text)",
              }}
            >
              Repository Not Analyzed
            </h3>
            <p
              style={{
                margin: 0,
                color: "var(--color-text-muted)",
                fontSize: "var(--font-size-sm)",
                lineHeight: 1.5,
              }}
            >
              Analyze this codebase to extract its technologies, entry points, and component structure.
            </p>
          </div>
          <button
            type="button"
            onClick={onAnalyze}
            style={{
              marginTop: "var(--space-1)",
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-primary)",
              color: "var(--color-primary-contrast)",
              border: "2px solid #000000",
              borderRadius: "var(--radius-md)",
              fontWeight: 700,
              fontSize: "var(--font-size-sm)",
              cursor: "pointer",
              boxShadow: "2px 2px 0px #000000",
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z"
                fill="currentColor"
              />
            </svg>
            <span>Analyze Repository</span>
          </button>
        </div>
      </section>
    );
  }

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
              {owner} / {name}
            </h2>
          </div>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: 700,
              padding: "2px 6px",
              background: "var(--color-bg-subtle)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            {branch}
          </span>
        </div>

        {repoDescription && (
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
              lineHeight: 1.45,
            }}
          >
            {repoDescription}
          </p>
        )}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
          }}
        >
          {overview?.primary_language && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-primary)",
                }}
              />
              {overview.primary_language}
            </span>
          )}
          {typeof overview?.stars === "number" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
              ★ {overview.stars.toLocaleString()}
            </span>
          )}
          {overview?.last_updated && (
            <span>Updated: {overview.last_updated.slice(0, 10)}</span>
          )}
        </div>
      </div>

      {/* Overview Section: 2-3 sentence overview */}
      <div
        style={{
          padding: "var(--space-3)",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--space-2)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "var(--font-size-sm)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-muted)",
            }}
          >
            Repository Overview
          </h3>
          <StatusChip label={isAiUnavailable ? "Not found" : "Inferred"} />
        </div>

        {isAiUnavailable ? (
          <p
            style={{
              margin: 0,
              color: "var(--color-warning)",
              fontSize: "var(--font-size-sm)",
              fontStyle: "italic",
            }}
          >
            AI explanation is currently unavailable. Showing verified codebase facts below.
          </p>
        ) : (
          <p
            style={{
              margin: 0,
              color: "var(--color-text)",
              fontSize: "var(--font-size-sm)",
              lineHeight: 1.55,
            }}
          >
            {summaryText}
          </p>
        )}

        {overview?.topics && overview.topics.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-1)",
              marginTop: "var(--space-2)",
            }}
          >
            {overview.topics.map((topic) => (
              <span
                key={topic}
                style={{
                  background: "var(--color-bg-subtle)",
                  color: "var(--color-text-muted)",
                  borderRadius: "var(--radius-sm)",
                  padding: "2px 6px",
                  fontSize: "var(--font-size-xs)",
                  border: "1px solid var(--color-border)",
                }}
              >
                #{topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Technologies with evidence file links */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "var(--font-size-sm)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-muted)",
            }}
          >
            Technologies
          </h3>
          <StatusChip label={technologies?.length > 0 ? "Detected" : "Not found"} />
        </div>

        {technologies?.length > 0 ? (
          technologies.map((tech) => {
            const evidenceFile = tech.evidence_files?.[0];
            const fileUrl = evidenceFile
              ? `https://github.com/${owner}/${name}/blob/${branch}/${evidenceFile}`
              : `https://github.com/${owner}/${name}`;
            const desc = evidenceFile
              ? `Proved by ${evidenceFile}`
              : "Inferred from repository manifests";

            return (
              <SourceCard
                key={tech.name}
                title={`${tech.name}${tech.category ? ` (${tech.category})` : ""}`}
                description={desc}
                url={fileUrl}
                sourceType="github"
                label={evidenceFile ? "Detected" : "Inferred"}
              />
            );
          })
        ) : (
          <SourceCard
            title="No technologies detected"
            description="No manifest or language evidence files were detected in this repository."
            url={`https://github.com/${owner}/${name}`}
            sourceType="github"
            label="Not found"
          />
        )}
      </div>

      {/* Entry Points with reasons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "var(--font-size-sm)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-muted)",
            }}
          >
            Entry Points
          </h3>
          <StatusChip label={entry_points?.length > 0 ? "Detected" : "Not found"} />
        </div>
      )}
    </section>
  );
}
