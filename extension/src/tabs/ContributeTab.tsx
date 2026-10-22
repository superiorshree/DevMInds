/**
 * File:        extension/src/tabs/ContributeTab.tsx
 * Owner:       Purva
 * Purpose:     Renders contribution guidance for open-source repos: setup steps, rules, good-first-issues, maintainers.
 * Contains:    ContributeTab functional component with a ContributeTabProps interface.
 * Status:      STUB, replace TODOs with real implementation
 * Depends on:  extension/src/types/architecture.ts (ContributorGuide), extension/src/components/SourceCard.tsx
 */

import type { ContributorGuide } from "../types/architecture";
import { SourceCard } from "../components/SourceCard";

/** Props for the contribute tab. */
export interface ContributeTabProps {
  guide: ContributorGuide;
}

/** Shows a new contributor how to get started and where to help. */
export function ContributeTab({ guide }: ContributeTabProps) {
  return (
    <section className="contribute-tab">
      <h3 style={{ fontSize: "var(--font-size-md)" }}>Setup</h3>
      <ol style={{ paddingLeft: "var(--space-4)", marginTop: 0 }}>
        {guide.setup_steps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>

      <h3 style={{ fontSize: "var(--font-size-md)" }}>Contribution rules</h3>
      <ul style={{ paddingLeft: "var(--space-4)", marginTop: 0 }}>
        {guide.contribution_rules.map((rule, index) => (
          <li key={index}>{rule}</li>
        ))}
      </ul>

      {guide.good_first_issues.length > 0 && (
        <>
          <h3 style={{ fontSize: "var(--font-size-md)" }}>Good first issues</h3>
          {guide.good_first_issues.map((issue) => (
            <SourceCard
              key={issue.url}
              title={issue.title}
              sourceType="good_first_issue"
              url={issue.url}
            />
          ))}
        </>
      )}

      {guide.maintainers.length > 0 && (
        <>
          <h3 style={{ fontSize: "var(--font-size-md)" }}>Maintainers</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {guide.maintainers.map((maintainer) => (
              <span
                key={maintainer.login}
                style={{
                  background: "var(--color-bg-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "2px 8px",
                  fontSize: "var(--font-size-xs)",
                }}
              >
                @{maintainer.login}
              </span>
            ))}
          </div>
        </>
      )}

      {/* TODO(Purva): link issues to the repo, add avatars, and pull real data. */}
    </section>
  );
}
