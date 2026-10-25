/**
 * File:        extension/src/tabs/IntegrationDrawer.tsx
 * Owner:       Kunal
 * Purpose:     A drawer listing external integrations (GitHub, Jira, Confluence, Slack) with their connection status and connect/disconnect controls. Company Employee mode only.
 * Contains:    IntegrationDrawer functional component with an IntegrationDrawerProps interface.
 * Status:      STUB, replace TODOs with real implementation
 * Depends on:  extension/src/types/architecture.ts (IntegrationStatus)
 */

import type { IntegrationStatus } from "../types/architecture";

/** Props for the integration drawer. */
export interface IntegrationDrawerProps {
  integrations: IntegrationStatus[];
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Slides in to show provider connection status. This is only reachable in
 * Company Employee mode; the backend gates each provider with require_feature.
 */
export function IntegrationDrawer({ integrations, isOpen, onClose }: IntegrationDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      className="integration-drawer"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(16, 24, 40, 0.4)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(320px, 90%)",
          height: "100%",
          background: "var(--color-surface)",
          padding: "var(--space-4)",
          boxShadow: "var(--shadow-md)",
          overflowY: "auto",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-3)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "var(--font-size-md)" }}>Integrations</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: "var(--font-size-lg)",
            }}
          >
            ×
          </button>
        </div>

        {integrations.map((integration) => (
          <div
            key={integration.provider}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "var(--space-2) 0",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, textTransform: "capitalize" }}>
                {integration.provider}
              </div>
              <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                {integration.connected ? "Connected" : integration.detail || "Not connected"}
              </div>
            </div>
            <button
              type="button"
              disabled={!integration.available}
              style={{
                padding: "var(--space-1) var(--space-2)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
                background: integration.connected ? "var(--color-bg-subtle)" : "var(--color-primary)",
                color: integration.connected ? "var(--color-text)" : "var(--color-primary-contrast)",
                cursor: integration.available ? "pointer" : "not-allowed",
                fontSize: "var(--font-size-xs)",
              }}
            >
              {/* TODO(Kunal): call the connect/disconnect API and refresh status. */}
              {integration.connected ? "Connected" : "Disconnected"}
            </button>
          </div>
        ))}

        {/* TODO(Kunal): wire to GET /api/integrations and the connect/delete routes,
            plus a Slack channel picker that posts the architecture summary. */}
      </div>
    </div>
  );
}
