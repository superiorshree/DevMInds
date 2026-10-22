/**
 * File:        extension/src/components/SourceCard.tsx
 * Owner:       Purva
 * Purpose:     One reusable card that renders any source of truth (GitHub file, contribution resource, Jira issue, Confluence page) from the same props.
 * Contains:    SourceCard functional component with a SourceCardProps interface.
 * Status:      STUB, replace TODOs with real implementation — Purva builds the real design later
 * Depends on:  extension/src/types/architecture.ts (SourceLink)
 */

import type { SourceLink } from "../types/architecture";

/** Props for the reusable source card. */
export interface SourceCardProps {
  title: string;
  description?: string;
  sourceType: string;
  url: string;
}

/**
 * A single card describing one source of truth. Used everywhere a source is
 * shown (GitHub files, contribution resources, Jira issues, Confluence pages).
 */
export function SourceCard({ title, description, sourceType, url }: SourceCardProps) {
  return (
    <a
      className="source-card"
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "block",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-3)",
        marginBottom: "var(--space-2)",
        textDecoration: "none",
        color: "inherit",
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            color: "var(--color-primary)",
            background: "var(--color-bg-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "2px 6px",
          }}
        >
          {sourceType}
        </span>
        <strong>{title}</strong>
      </div>
      {description ? (
        <p style={{ margin: "var(--space-2) 0 0", color: "var(--color-text-muted)" }}>
          {description}
        </p>
      ) : null}
      {/* TODO(Purva): build the real SourceCard design (icons per sourceType,
          hover states, truncation, favicons). Keep the same props. */}
    </a>
  );
}

/** Convenience: build the props a SourceCard needs from a SourceLink. */
export function sourceLinkToCardProps(link: SourceLink, description?: string) {
  return {
    title: link.title,
    description,
    sourceType: link.sourceType,
    url: link.url,
  };
}
