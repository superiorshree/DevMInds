/**
 * File:        extension/src/components/RepositoryHeader.tsx
 * Owner:       Shreyansh
 * Purpose:     Shows which repository the panel is analyzing (owner/name + branch) at the top of the side panel.
 * Contains:    RepositoryHeader functional component with a RepositoryHeaderProps interface.
 * Status:      STUB, replace TODOs with real implementation
 * Depends on:  extension/src/types/architecture.ts (Repository)
 */

import type { Repository } from "../types/architecture";

/** Props for the repository header. */
export interface RepositoryHeaderProps {
  repository: Repository;
}

/** Displays the current repository and branch at the top of the panel. */
export function RepositoryHeader({ repository }: RepositoryHeaderProps) {
  const { owner, name, branch } = repository;
  return (
    <header
      className="repo-header"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
        paddingBottom: "var(--space-3)",
        borderBottom: "1px solid var(--color-border)",
        marginBottom: "var(--space-3)",
      }}
    >
      <div style={{ fontSize: "var(--font-size-lg)", fontWeight: 700 }}>
        {owner} <span style={{ color: "var(--color-text-muted)" }}>/</span> {name}
      </div>
      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
        branch: {branch}
      </div>
      {/* TODO(Shreyansh): add stars, language chip, last-updated, and a
          refresh/analyze button once the backend is wired up. */}
    </header>
  );
}
