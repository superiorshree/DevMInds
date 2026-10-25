/**
 * File:        extension/src/components/CompanyIntegrationsView.tsx
 * Purpose:     Screen shown when user selects "Company Employee" experience:
 *              "Set up your integrations" (Jira, Confluence, Slack) with Connected / Disconnected buttons
 *              and a Continue CTA.
 */

import { useState } from "react";
import type { SessionUser } from "../services/api";

export interface CompanyIntegrationsViewProps {
  user?: SessionUser | null;
  onContinue: () => void;
  onChangeMode?: () => void;
  onSignOut?: () => void;
  onClose?: () => void;
}

interface IntegrationItem {
  id: "jira" | "confluence" | "slack";
  name: string;
  description: string;
  connected: boolean;
}

export function CompanyIntegrationsView({
  user = null,
  onContinue,
  onChangeMode,
  onSignOut,
  onClose,
}: CompanyIntegrationsViewProps) {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([
    {
      id: "jira",
      name: "Jira",
      description: "Get your tasks and issue context.",
      connected: false,
    },
    {
      id: "confluence",
      name: "Confluence",
      description: "Access documentation and wikis.",
      connected: false,
    },
    {
      id: "slack",
      name: "Slack",
      description: "See team discussions and updates.",
      connected: false,
    },
  ]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [continueHovered, setContinueHovered] = useState(false);

  const toggleConnection = (id: "jira" | "confluence" | "slack") => {
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, connected: !item.connected } : item
      )
    );
  };

  const initial = user?.github_login
    ? user.github_login.charAt(0).toUpperCase()
    : "P";

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      try {
        window.close();
      } catch {
        // window.close may be restricted in some extension contexts
      }
    }
  };

  const getButtonStyle = (id: string, connected: boolean) => {
    const isHovered = hoveredButton === id;
    if (connected) {
      return {
        padding: "8px 16px",
        backgroundColor: isHovered ? "#bbf7d0" : "#dcfce7",
        color: "#166534",
        border: "2px solid #16a34a",
        borderRadius: "8px",
        fontWeight: 700 as const,
        fontSize: "13px",
        cursor: "pointer",
        transition: "all 0.12s ease",
        boxShadow: isHovered ? "2px 2px 0px #166534" : "1.5px 1.5px 0px #166534",
        transform: isHovered ? "translate(-1px, -1px)" : "translate(0, 0)",
        display: "flex",
        alignItems: "center",
        gap: "5px",
        whiteSpace: "nowrap" as const,
      };
    }

    return {
      padding: "8px 16px",
      backgroundColor: isHovered ? "#fffbeb" : "#ffffff",
      color: "#18181b",
      border: "2px solid #f59e0b",
      borderRadius: "8px",
      fontWeight: 700 as const,
      fontSize: "13px",
      cursor: "pointer",
      transition: "all 0.12s ease",
      boxShadow: isHovered ? "2.5px 2.5px 0px #000000" : "1.5px 1.5px 0px #000000",
      transform: isHovered ? "translate(-1px, -1px)" : "translate(0, 0)",
      display: "flex",
      alignItems: "center",
      gap: "5px",
      whiteSpace: "nowrap" as const,
    };
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#faf7f2",
        color: "#18181b",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          borderBottom: "1px solid #e5e0d8",
          backgroundColor: "#faf7f2",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              backgroundColor: "#18181b",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "#f59e0b",
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontWeight: 800,
                fontSize: "13px",
                lineHeight: 1,
              }}
            >
              &gt;_
            </span>
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: "17px",
              letterSpacing: "-0.01em",
              color: "#18181b",
            }}
          >
            DevMinds
          </span>
        </div>

        {/* User Profile Avatar / Menu */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="User account menu"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "#18181b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "13px",
                overflow: "hidden",
              }}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.github_login}
                  width={28}
                  height={28}
                  style={{ borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                initial
              )}
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#18181b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "36px",
                right: 0,
                backgroundColor: "#ffffff",
                border: "1.5px solid #27272a",
                borderRadius: "8px",
                boxShadow: "3px 3px 0px #000000",
                width: "168px",
                zIndex: 50,
                padding: "8px",
              }}
            >
              {user && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    padding: "6px 8px",
                    borderBottom: "1px solid #f3f4f6",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  @{user.github_login}
                </div>
              )}
              {onChangeMode && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onChangeMode();
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px",
                    border: "none",
                    background: "transparent",
                    color: "#18181b",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    borderRadius: "4px",
                  }}
                >
                  Switch mode
                </button>
              )}
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px",
                    border: "none",
                    background: "transparent",
                    color: "#dc2626",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    borderRadius: "4px",
                  }}
                >
                  Sign out
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          padding: "20px 18px 24px 18px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Company Employee Mode Pill */}
        <div style={{ marginBottom: "20px" }}>
          <button
            type="button"
            onClick={onChangeMode}
            title="Switch experience mode"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 14px",
              backgroundColor: "#fef3c7",
              border: "1.5px solid #f59e0b",
              borderRadius: "10px",
              color: "#18181b",
              fontSize: "13.5px",
              fontWeight: 700,
              cursor: onChangeMode ? "pointer" : "default",
              transition: "all 0.15s ease",
            }}
          >
            {/* Office Building Icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#18181b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <path d="M9 22v-4h6v4" />
              <line x1="8" y1="6" x2="8.01" y2="6" />
              <line x1="12" y1="6" x2="12.01" y2="6" />
              <line x1="16" y1="6" x2="16.01" y2="6" />
              <line x1="8" y1="10" x2="8.01" y2="10" />
              <line x1="12" y1="10" x2="12.01" y2="10" />
              <line x1="16" y1="10" x2="16.01" y2="10" />
              <line x1="8" y1="14" x2="8.01" y2="14" />
              <line x1="12" y1="14" x2="12.01" y2="14" />
              <line x1="16" y1="14" x2="16.01" y2="14" />
            </svg>
            <span>Company Employee</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#18181b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 800,
            lineHeight: 1.2,
            color: "#111827",
            margin: "0 0 10px 0",
            letterSpacing: "-0.025em",
          }}
        >
          Set up your integrations
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.48,
            color: "#4b5563",
            margin: "0 0 22px 0",
          }}
        >
          Connect your work tools to get the most relevant context for your codebase.
        </p>

        {/* Integration Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
          {/* 1. Jira */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "12px",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {/* Jira Logo Icon */}
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  backgroundColor: "#0052cc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 2px 4px rgba(0,82,204,0.25)",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M11.5 2C11.5 2 6 7.5 6 12C6 16.5 11.5 22 11.5 22C11.5 22 17 16.5 17 12C17 7.5 11.5 2 11.5 2Z"
                    fill="#2684ff"
                  />
                  <path
                    d="M12 5.5L14.5 10L19 12L14.5 14L12 18.5L9.5 14L5 12L9.5 10L12 5.5Z"
                    fill="#ffffff"
                  />
                </svg>
              </div>

              <div>
                <div style={{ fontWeight: 800, fontSize: "16px", color: "#111827", marginBottom: "2px" }}>
                  Jira
                </div>
                <div style={{ fontSize: "12.5px", color: "#4b5563" }}>
                  Get your tasks and issue context.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleConnection("jira")}
              onMouseEnter={() => setHoveredButton("jira")}
              onMouseLeave={() => setHoveredButton(null)}
              style={getButtonStyle("jira", integrations[0].connected)}
            >
              {integrations[0].connected ? "Connected" : "Disconnected"}
            </button>
          </div>

          {/* 2. Confluence */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "12px",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {/* Confluence Logo Icon */}
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  border: "1.5px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4.5 16.5C3.5 15.5 3 14 3.5 12.5C4 11 5.5 10 7.5 10.5C9.5 11 12 13 14 14C16 15 17.5 14.5 18.5 13.5L20 15C18.5 16.5 16.5 17.5 14 16.5C11.5 15.5 9 13.5 7.5 13C6 12.5 5 13 4.5 13.5L4.5 16.5Z"
                    fill="#0052cc"
                  />
                  <path
                    d="M19.5 7.5C20.5 8.5 21 10 20.5 11.5C20 13 18.5 14 16.5 13.5C14.5 13 12 11 10 10C8 9 6.5 9.5 5.5 10.5L4 9C5.5 7.5 7.5 6.5 10 7.5C12.5 8.5 15 10.5 16.5 11C18 11.5 19 11 19.5 10.5L19.5 7.5Z"
                    fill="#2684ff"
                  />
                </svg>
              </div>

              <div>
                <div style={{ fontWeight: 800, fontSize: "16px", color: "#111827", marginBottom: "2px" }}>
                  Confluence
                </div>
                <div style={{ fontSize: "12.5px", color: "#4b5563" }}>
                  Access documentation and wikis.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleConnection("confluence")}
              onMouseEnter={() => setHoveredButton("confluence")}
              onMouseLeave={() => setHoveredButton(null)}
              style={getButtonStyle("confluence", integrations[1].connected)}
            >
              {integrations[1].connected ? "Connected" : "Disconnected"}
            </button>
          </div>

          {/* 3. Slack */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "12px",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {/* Slack Logo Icon */}
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  border: "1.5px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  {/* Top-left red */}
                  <path d="M6 10a2 2 0 1 1-2-2h2v2zm1 0a2 2 0 1 1 2-2v5a2 2 0 1 1-2-2v-1z" fill="#E01E5A" />
                  {/* Top-right green */}
                  <path d="M14 6a2 2 0 1 1 2-2v2h-2zm0 1a2 2 0 1 1 2 2h-5a2 2 0 1 1 2-2h1z" fill="#2EB67D" />
                  {/* Bottom-right yellow */}
                  <path d="M18 14a2 2 0 1 1 2 2h-2v-2zm-1 0a2 2 0 1 1-2 2v-5a2 2 0 1 1 2 2v1z" fill="#ECB22E" />
                  {/* Bottom-left blue */}
                  <path d="M10 18a2 2 0 1 1-2 2v-2h2zm0-1a2 2 0 1 1-2-2h5a2 2 0 1 1-2 2h-1z" fill="#36C5F0" />
                </svg>
              </div>

              <div>
                <div style={{ fontWeight: 800, fontSize: "16px", color: "#111827", marginBottom: "2px" }}>
                  Slack
                </div>
                <div style={{ fontSize: "12.5px", color: "#4b5563" }}>
                  See team discussions and updates.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleConnection("slack")}
              onMouseEnter={() => setHoveredButton("slack")}
              onMouseLeave={() => setHoveredButton(null)}
              style={getButtonStyle("slack", integrations[2].connected)}
            >
              {integrations[2].connected ? "Connected" : "Disconnected"}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div
          style={{
            backgroundColor: "#f9f8f6",
            border: "1.5px solid #dcd7cf",
            borderRadius: "10px",
            padding: "14px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {/* Info icon */}
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              border: "1.5px solid #6b7280",
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: 800,
              flexShrink: 0,
              marginTop: "1px",
              fontFamily: "serif",
            }}
          >
            i
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#4b5563", lineHeight: 1.45 }}>
            You can connect these tools later. You're in control of what you share and when.
          </p>
        </div>

        {/* Continue Button */}
        <button
          type="button"
          onClick={onContinue}
          onMouseEnter={() => setContinueHovered(true)}
          onMouseLeave={() => setContinueHovered(false)}
          style={{
            width: "100%",
            padding: "13px 16px",
            backgroundColor: "#f79f24",
            color: "#000000",
            border: "2px solid #000000",
            borderRadius: "8px",
            boxShadow: continueHovered
              ? "4px 4px 0px #000000"
              : "2.5px 2.5px 0px #000000",
            transform: continueHovered ? "translate(-1px, -1px)" : "translate(0, 0)",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.12s ease-in-out",
          }}
        >
          <span>Continue</span>
          <span style={{ fontSize: "16px" }}>→</span>
        </button>
      </main>
    </div>
  );
}
