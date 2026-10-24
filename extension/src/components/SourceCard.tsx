/**
 * File:        extension/src/components/SourceCard.tsx
 * Owner:       Kunal
 * Purpose:     The shared source card every tab renders: one badge/icon per source type, the title as a safe
 *              link, a clamped description and an optional Detected/Inferred/Not found chip.
 * Contains:    SourceType, SourceKind and SourceLabel types, SourceCardProps, SOURCE_NAMES / SOURCE_GLYPHS /
 *              LABEL_CLASSES constants, normalizeSourceType() and safeHttpUrl() helpers, SourceIcon,
 *              ExternalIcon, SourceCard (named + default export) and sourceLinkToCardProps().
 * Status:      IMPLEMENTED — all four source types, the legacy aliases and the label chip render; all styling
 *              lives in the .source-card* classes in extension/src/styles/tokens.css.
 * Depends on:  extension/src/styles/tokens.css (design tokens + .source-card* classes),
 *              extension/src/types/architecture.ts (SourceLink)
 */

import type { ReactNode } from "react";
import type { SourceLink } from "../types/architecture";

/** The four source kinds from the API contract (SourceRef.source_type). */
export type SourceType = "github" | "jira" | "slack" | "confluence";

/** What the badge can show: the four contract kinds, or a neutral fallback. */
export type SourceKind = SourceType | "unknown";

/** Optional status chip shown next to the source badge. */
export type SourceLabel = "Detected" | "Inferred" | "Not found";

/** Props for the reusable source card. */
export interface SourceCardProps {
  title: string;
  description?: string;
  url: string;
  /**
   * The contract's four kinds. Older tab components still pass longer strings
   * ("jira_issue", "confluence_page", "good_first_issue", "github_file"), so any
   * string is accepted and normalised to a kind for the badge — new code should
   * pass one of the four.
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
const SOURCE_GLYPHS: Record<SourceKind, ReactNode> = {
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
  // Neutral globe for an unrecognised sourceType.
  unknown: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
    </>
  ),
};

/** CSS class suffix per label, from the .source-card__chip--* classes. */
const LABEL_CLASSES: Record<SourceLabel, string> = {
  Detected: "detected",
  Inferred: "inferred",
  "Not found": "not-found",
};

/**
 * Map any sourceType string onto a badge kind.
 * The four contract values win; the legacy values still passed by existing tabs
 * map to their provider ("jira_issue" -> jira, "confluence_page" -> confluence,
 * "good_first_issue" and "github_file" -> github). Anything else is "unknown"
 * and gets a neutral badge instead of a wrong provider.
 */
function normalizeSourceType(sourceType: string): SourceKind {
  const value = sourceType.trim().toLowerCase();
  if (value.includes("jira")) return "jira";
  if (value.includes("slack")) return "slack";
  if (value.includes("confluence")) return "confluence";
  if (value.includes("github") || value === "good_first_issue") return "github";
  return "unknown";
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
function SourceIcon({ kind }: { kind: SourceKind }) {
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
    >
      {SOURCE_GLYPHS[kind]}
    </svg>
  );
}

/** Small "opens in a new tab" arrow shown after the title link. */
function ExternalIcon() {
  return (
    <svg
      className="source-card__external-icon"
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
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
 * pages). All styling lives in the .source-card* classes in tokens.css, and
 * widths stay fluid so the card works from ~300px to wide panels.
 */
export function SourceCard({ title, description, url, sourceType, label }: SourceCardProps) {
  const kind = normalizeSourceType(sourceType);
  const href = safeHttpUrl(url);
  // An unknown kind shows its raw value so the badge stays informative.
  const badgeText = kind === "unknown" ? sourceType.trim() || "Source" : SOURCE_NAMES[kind];

  return (
    <article className="source-card">
      <div className="source-card__header">
        <span
          className={
            kind === "unknown" ? "source-card__badge source-card__badge--unknown" : "source-card__badge"
          }
          title={kind === "unknown" ? `Unrecognised source type: ${sourceType}` : undefined}
        >
          <SourceIcon kind={kind} />
          {badgeText}
        </span>
        {label && (
          <span className={`source-card__chip source-card__chip--${LABEL_CLASSES[label]}`}>{label}</span>
        )}
      </div>

      <h4 className="source-card__title">
        {href ? (
          <a className="source-card__link" href={href} target="_blank" rel="noopener noreferrer">
            {title}
            <ExternalIcon />
          </a>
        ) : (
          title
        )}
      </h4>

      {description && <p className="source-card__description">{description}</p>}
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
