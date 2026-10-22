/**
 * File:        extension/src/tabs/ContextTab.tsx
 * Owner:       Purva
 * Purpose:     Renders company context (Jira issues + Confluence pages) linked to the repository. Company Employee mode only.
 * Contains:    ContextTab functional component with a ContextTabProps interface.
 * Status:      STUB, replace TODOs with real implementation
 * Depends on:  extension/src/types/architecture.ts (RelatedContext), extension/src/components/SourceCard.tsx
 */

import type { RelatedContext } from "../types/architecture";
import { SourceCard } from "../components/SourceCard";

/** Props for the context tab. */
export interface ContextTabProps {
  context: RelatedContext;
}

/**
 * Shows the Jira and Confluence items linked to this repo.
 * This tab only appears in Company Employee mode; the backend enforces that
 * with require_feature("contextTab") and returns 403 otherwise.
 */
export function ContextTab({ context }: ContextTabProps) {
  return (
    <section className="context-tab">
      <h3 style={{ fontSize: "var(--font-size-md)" }}>Jira issues</h3>
      {context.jira_issues.length === 0 && (
        <p style={{ color: "var(--color-text-muted)" }}>No linked Jira issues.</p>
      )}
      {context.jira_issues.map((issue) => (
        <SourceCard
          key={issue.key}
          title={`${issue.key}: ${issue.summary}`}
          description={issue.status ?? undefined}
          sourceType="jira_issue"
          url={issue.url}
        />
      ))}

      <h3 style={{ fontSize: "var(--font-size-md)" }}>Confluence pages</h3>
      {context.confluence_pages.length === 0 && (
        <p style={{ color: "var(--color-text-muted)" }}>No linked Confluence pages.</p>
      )}
      {context.confluence_pages.map((page) => (
        <SourceCard
          key={page.id}
          title={page.title}
          description={page.space ?? undefined}
          sourceType="confluence_page"
          url={page.url}
        />
      ))}

      {/* TODO(Purva): pull from GET /api/repositories/{owner}/{repo}/context once
          the backend + Jira/Confluence adapters are wired up. */}
    </section>
  );
}
