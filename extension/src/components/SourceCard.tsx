/**
 * File:        extension/src/components/SourceCard.tsx
 * Owner:       Kunal
 * Purpose:     The shared source card every tab renders: one badge/icon per source type, the title as a safe
 *              link, a clamped description and an optional Detected/Inferred/Not found chip.
 * Contains:    SourceType and SourceLabel types, SourceCardProps, SOURCE_NAMES / SOURCE_GLYPHS / LABEL_COLORS
 *              constants, sourceKindOf() and safeHttpUrl() helpers, SourceIcon, SourceCard (named + default
 *              export) and sourceLinkToCardProps().
 * Status:      IMPLEMENTED — renders all four source types and the label chip; styling reads tokens.css only.
 * Depends on:  extension/src/styles/tokens.css (design tokens),
 *              extension/src/types/architecture.ts (SourceLink)
 */

import type { CSSProperties, ReactNode } from "react";
import type { SourceLink } from "../types/architecture";

/** The four source kinds from the API contract (SourceRef.source_type). */
export type SourceType = "github" | "jira" | "slack" | "confluence";

/** Optional status chip shown next to the source badge. */
export type SourceLabel = "Detected" | "Inferred" | "Not found";

/** Props for the reusable source card. */
export interface SourceCardProps {
  title: string;
  description?: string;
  url: string;
  /**
   * The contract's four kinds. Older tab components still pass longer strings
   * ("jira_issue", "confluence_page", "good_first_issue"), so any string is
   * accepted and normalised to a kind for the badge — new code should pass one
   * of the four.
   * TODO: narrow to SourceType once every caller passes contract source_type values.
   */
  sourceType: SourceType | (string & {});
  /** Optional chip: Detected, Inferred or Not found. */
  label?: SourceLabel;
}

/** Human-readable name for each source kind. */
const SOURCE_NAMES: Record<SourceType, string> = {
  github: "GitHub",
  jira: "Jira",
  slack: "Slack",
  confluence: "Confluence",
};

/** Tiny inline SVG glyph per source kind — no icon library. */
const SOURCE_GLYPHS: Record<SourceType, ReactNode> = {
  github: (
    <>
      <path d="M8 6 3 12l5 6" />
      <path d="m16 6 5 6-5 6" />
    </>
  ),
  jira: <path d="M12 3 21 12l-9 9-9-9z" />,
  slack: (
    <>
      <path d="M9 4v16" />
      <path d="M15 4v16" />
      <path d="M4 9h16" />
      <path d="M4 15h16" />
    </>
  ),
  confluence: (
    <>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
    </>
  ),
};

/** Chip colour per label; the background stays the shared subtle surface. */
const LABEL_COLORS: Record<SourceLabel, string> = {
  Detected: "var(--color-success)",
  Inferred: "var(--color-warning)",
  "Not found": "var(--color-text-muted)",
};

/** Card shell: every value comes from tokens.css, no fixed widths. */
const CARD_STYLE: CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "var(--space-3)",
  marginBottom: "var(--space-2)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  background: "var(--color-surface)",
  boxShadow: "var(--shadow-sm)",
};

/** Shared pill styling for the source badge and the label chip. */
const PILL_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-1)",
  padding: "2px var(--space-2)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  background: "var(--color-bg-subtle)",
  fontSize: "var(--font-size-xs)",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

/**
 * Map any sourceType string onto one of the four contract kinds.
 * Values such as "jira_issue", "confluence_page" or "good_first_issue" belong to
 * their provider; anything else in this extension comes from the repository.
 */
function sourceKindOf(sourceType: string): SourceType {
  const value = sourceType.toLowerCase();
  if (value.includes("jira")) return "jira";
  if (value.includes("slack")) return "slack";
  if (value.includes("confluence")) return "confluence";
  return "github";
}

/** Return the url only when it is a real http(s) url; anything else gets no link. */
function safeHttpUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** The source-type glyph, drawn with the current text colour. */
function SourceIcon({ kind }: { kind: SourceType }) {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {SOURCE_GLYPHS[kind]}
    </svg>
  );
}

/** Small "opens in a new tab" arrow shown after the title link. */
function ExternalIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ marginLeft: "var(--space-1)", verticalAlign: "baseline" }}
    >
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

/**
 * One card describing one source of truth. Used everywhere a source is shown
 * (GitHub files, good-first-issues, Jira issues, Slack messages, Confluence
 * pages). Widths stay fluid so the card works from ~300px to wide panels.
 */
export function SourceCard({ title, description, url, sourceType, label }: SourceCardProps) {
  const kind = sourceKindOf(sourceType);
  const href = safeHttpUrl(url);

  return (
    <article className="source-card" style={CARD_STYLE}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-2)",
        }}
      >
        <span style={{ ...PILL_STYLE, color: "var(--color-text-muted)" }}>
          <SourceIcon kind={kind} />
          {SOURCE_NAMES[kind]}
        </span>
        {label && (
          <span style={{ ...PILL_STYLE, color: LABEL_COLORS[label] }}>{label}</span>
        )}
      </div>

      <h4
        style={{
          margin: 0,
          fontSize: "var(--font-size-sm)",
          fontWeight: 600,
          lineHeight: 1.4,
          overflowWrap: "anywhere",
        }}
      >
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-primary)", textDecoration: "none" }}
          >
            {title}
            <ExternalIcon />
          </a>
        ) : (
          title
        )}
      </h4>

      {description && (
        <p
          style={{
            margin: "var(--space-2) 0 0",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-muted)",
            overflowWrap: "anywhere",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 3,
            overflow: "hidden",
          }}
        >
          {description}
        </p>
      )}
    </article>
  );
}

export default SourceCard;

/** Convenience: build the props a SourceCard needs from a SourceLink. */
export function sourceLinkToCardProps(link: SourceLink, description?: string) {
  return {
    title: link.title,
    description,
    sourceType: link.sourceType,
    url: link.url,
  };
}
