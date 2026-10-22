/**
 * File:        extension/src/components/ArchitectureDiagram.tsx
 * Owner:       Purva
 * Purpose:     Renders the components and their connections from the architecture schema as a diagram.
 * Contains:    ArchitectureDiagram functional component with an ArchitectureDiagramProps interface.
 * Status:      STUB, replace TODOs with real implementation — Purva builds the real diagram later
 * Depends on:  extension/src/types/architecture.ts (Component, Connection)
 */

import type { Component, Connection } from "../types/architecture";

/** Props for the architecture diagram. */
export interface ArchitectureDiagramProps {
  components: Component[];
  connections: Connection[];
}

/**
 * A placeholder "diagram": it lists components and draws connections as text.
 * TODO(Purva): render a real graph (nodes + edges) from these props. Keep it
 * responsive with flex/grid so it works from ~350px to ~75% screen width.
 */
export function ArchitectureDiagram({ components, connections }: ArchitectureDiagramProps) {
  return (
    <section
      className="architecture-diagram"
      style={{
        border: "1px dashed var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-3)",
      }}
    >
      <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--font-size-md)" }}>
        Architecture
      </h3>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
        {components.map((component) => (
          <div
            key={component.id}
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-2)",
              background: "var(--color-bg-subtle)",
              minWidth: "120px",
            }}
          >
            <strong>{component.name}</strong>
            <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
              {component.description}
            </div>
          </div>
        ))}
      </div>

      {connections.length > 0 && (
        <ul style={{ margin: "var(--space-3) 0 0", paddingLeft: "var(--space-4)" }}>
          {connections.map((connection, index) => (
            <li key={index} style={{ color: "var(--color-text-muted)" }}>
              {connection.from} → {connection.to}: {connection.relationship}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
