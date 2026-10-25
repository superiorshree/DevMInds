/**
 * File:        extension/src/tabs/ArchitectureTab.tsx
 * Owner:       Purva
 * Purpose:     Renders the architecture of the repo: technologies, entry points, and the component diagram.
 * Contains:    ArchitectureTab functional component with an ArchitectureTabProps interface.
 * Status:      REAL — connected to Architecture Agent results with loading, empty, and error states.
 * Depends on:  extension/src/types/architecture.ts (ArchitectureBundle), extension/src/components/ArchitectureDiagram.tsx
 */

import type { ArchitectureBundle } from "../types/architecture";
import { ArchitectureDiagram } from "../components/ArchitectureDiagram";

/** Props for the architecture tab. */
export interface ArchitectureTabProps {
  architecture?: ArchitectureBundle | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/** Shows how the repo is put together: techs, entry points, and the diagram. */
export function ArchitectureTab({
  architecture,
  isLoading = false,
  error = null,
  onRetry,
}: ArchitectureTabProps) {
  if (isLoading) {
    return (
      <section className="architecture-tab" style={{ padding: "20px 0", textAlign: "center" }}>
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
          Loading architecture diagram & components from AI Agent…
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="architecture-tab"
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
            Architecture Error
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

  if (!architecture) {
    return (
      <section className="architecture-tab" style={{ padding: "16px 0", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
        <p style={{ margin: 0 }}>No architecture data available. Analyze the repository first.</p>
      </section>
    );
  }

  const components = architecture.components || [];
  const connections = architecture.connections || [];
  const technologies = architecture.technologies || [];
  const entryPoints = architecture.entry_points || [];

  return (
    <section className="architecture-tab">
      <ArchitectureDiagram
        components={components}
        connections={connections}
      />

      <h3 style={{ fontSize: "var(--font-size-md)", marginTop: "16px", marginBottom: "8px", color: "#111827" }}>
        Technologies
      </h3>
      {technologies.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
          No technologies detected.
        </p>
      ) : (
        <ul style={{ paddingLeft: "var(--space-4)", marginTop: 0, fontSize: "var(--font-size-sm)" }}>
          {technologies.map((technology) => {
            const evidence =
              technology.evidence_files && technology.evidence_files.length > 0
                ? technology.evidence_files[0]
                : (technology as any).evidence || "";
            return (
              <li key={technology.name} style={{ marginBottom: "4px" }}>
                <strong>{technology.name}</strong>
                {evidence && (
                  <span style={{ color: "var(--color-text-muted)" }}> — {evidence}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <h3 style={{ fontSize: "var(--font-size-md)", marginTop: "16px", marginBottom: "8px", color: "#111827" }}>
        Entry points
      </h3>
      {entryPoints.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
          No conventional entry points found.
        </p>
      ) : (
        <ul style={{ paddingLeft: "var(--space-4)", marginTop: 0, fontSize: "var(--font-size-sm)" }}>
          {entryPoints.map((entryPoint) => (
            <li key={entryPoint.file} style={{ marginBottom: "4px" }}>
              <code>{entryPoint.file}</code> — {entryPoint.reason}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
