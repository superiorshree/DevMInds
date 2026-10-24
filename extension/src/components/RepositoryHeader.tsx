/**
 * File:        extension/src/components/RepositoryHeader.tsx
 * Owner:       Shreyansh
 * Purpose:     Shows which repository the panel is analyzing (owner/repo, linked to GitHub) at the top of the side panel.
 * Contains:    RepositoryHeader functional component with a RepositoryHeaderProps interface.
 * Status:      IMPLEMENTED — renders the detected owner/repo plus a link that opens the repo on GitHub.
 * Depends on:  extension/src/services/repoDetector.ts (RepoRef)
 */

import type { RepoRef } from "../services/repoDetector";

/** Props for the repository header. */
export interface RepositoryHeaderProps {
  repo: RepoRef;
}

/** Displays the current repository at the top of the panel, linked to GitHub. */
export function RepositoryHeader({ repo }: RepositoryHeaderProps) {
  const { owner, repo: name } = repo;
  const repoUrl = `https://github.com/${owner}/${name}`;

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
      <a
        href={repoUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${owner}/${name} on GitHub`}
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-primary)",
          textDecoration: "none",
          width: "fit-content",
        }}
      >
        View on GitHub ↗
      </a>
      {/* TODO(Shreyansh): add stars, language chip, last-updated, and a
          refresh/analyze button once the backend is wired up. */}
    </header>
  );
}