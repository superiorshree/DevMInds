/**
 * File:        extension/src/tabs/ArchitectureTab.tsx
 * Owner:       Purva
 * Purpose:     Renders the architecture of the repo: technologies, entry points, and the component diagram.
 * Contains:    ArchitectureTab functional component with an ArchitectureTabProps interface.
 * Status:      STUB, replace TODOs with real implementation
 * Depends on:  extension/src/types/architecture.ts (ArchitectureBundle), extension/src/components/ArchitectureDiagram.tsx
 */

import type { ArchitectureBundle } from "../types/architecture";
import { ArchitectureDiagram } from "../components/ArchitectureDiagram";

/** Props for the architecture tab. */
export interface ArchitectureTabProps {
  architecture: ArchitectureBundle;
}

/** Shows how the repo is put together: techs, entry points, and the diagram. */
export function ArchitectureTab({ architecture }: ArchitectureTabProps) {
  return (
    <section className="architecture-tab">
      <ArchitectureDiagram
        components={architecture.components}
        connections={architecture.connections}
      />

      <h3 style={{ fontSize: "var(--font-size-md)" }}>Technologies</h3>
      <ul style={{ paddingLeft: "var(--space-4)", marginTop: 0 }}>
        {architecture.technologies.map((technology) => (
          <li key={technology.name}>
            {technology.name}
            {technology.evidence_files.length > 0 && (
              <span style={{ color: "var(--color-text-muted)" }}>
                {" "}
                — {technology.evidence_files[0]}
              </span>
            )}
          </li>
        ))}
      </ul>

      <h3 style={{ fontSize: "var(--font-size-md)" }}>Entry points</h3>
      <ul style={{ paddingLeft: "var(--space-4)", marginTop: 0 }}>
        {architecture.entry_points.map((entryPoint) => (
          <li key={entryPoint.file}>
            <code>{entryPoint.file}</code> — {entryPoint.reason}
          </li>
        ))}
      </ul>

      {/* TODO(Purva): make the diagram interactive and pull real data from the API. */}
    </section>
  );
}
