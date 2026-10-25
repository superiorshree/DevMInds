/**
 * File:        extension/src/components/SettingsView.tsx
 * Purpose:     Settings screen featuring "AI PROCESSING & DATA PRIVACY" settings:
 *              Allow external LLM toggle, External AI processing enabled summary card with
 *              Save Preferences, and Use Local Processing (Privacy Mode) toggle.
 */

import { useState } from "react";
import type { SessionUser } from "../services/api";

export interface SettingsViewProps {
  user: SessionUser | null;
  onBack: () => void;
  onGoToHome?: () => void;
  onGoToIntegrations?: () => void;
  onSignOut?: () => void;
}

export function SettingsView({
  user,
  onBack,
  onGoToHome,
  onGoToIntegrations,
  onSignOut,
}: SettingsViewProps) {
  const [isAiProcessingExpanded, setIsAiProcessingExpanded] = useState(true);
  const [allowExternalLlm, setAllowExternalLlm] = useState(true);
  const [useLocalProcessing, setUseLocalProcessing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [activeBottomNav, setActiveBottomNav] = useState<"home" | "integrations" | "settings">("settings");
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveHovered, setSaveHovered] = useState(false);

  const username = user?.github_login || "purvadhole";
  const initial = user?.github_login ? user.github_login.charAt(0).toUpperCase() : "P";

  const handleToggleExternalLlm = () => {
    const newVal = !allowExternalLlm;
    setAllowExternalLlm(newVal);
    if (newVal) {
      setUseLocalProcessing(false);
    }
  };

  const handleToggleLocalProcessing = () => {
    const newVal = !useLocalProcessing;
    setUseLocalProcessing(newVal);
    if (newVal) {
      setAllowExternalLlm(false);
    }
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Logo */}
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
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
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

          <div
            style={{
              backgroundColor: "#fef3c7",
              border: "1px solid #f59e0b",
              borderRadius: "4px",
              padding: "2px 6px",
              fontSize: "10px",
              fontWeight: 800,
              color: "#92400e",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Settings
          </div>
        </div>

        {/* Profile Avatar with dropdown */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="User account menu"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
            }}
          >
            <div
              style={{
                width: "27px",
                height: "27px",
                borderRadius: "50%",
                backgroundColor: "#18181b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "12px",
                overflow: "hidden",
              }}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.github_login}
                  width={27}
                  height={27}
                  style={{ borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                initial
              )}
            </div>
            <svg
              width="12"
              height="12"
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
                @{username}
              </div>
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
                    marginTop: "4px",
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

      {/* Main Content Area */}
      <main style={{ padding: "16px 16px 80px 16px", flex: 1 }}>
        {/* Back Arrow button */}
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 0",
            display: "flex",
            alignItems: "center",
            color: "#18181b",
            fontSize: "18px",
            marginBottom: "12px",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        {/* Orange Section Header Banner: AI PROCESSING & DATA PRIVACY */}
        <div
          onClick={() => setIsAiProcessingExpanded((prev) => !prev)}
          style={{
            backgroundColor: "#f79f24",
            border: "2px solid #000000",
            borderRadius: "8px",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            boxShadow: "2px 2px 0px #000000",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Shield Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span
              style={{
                fontWeight: 900,
                fontSize: "13px",
                letterSpacing: "0.04em",
                color: "#000000",
                textTransform: "uppercase",
              }}
            >
              AI Processing & Data Privacy
            </span>
          </div>

          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#000000"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isAiProcessingExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {isAiProcessingExpanded && (
          <div>
            {/* Subtitle */}
            <p
              style={{
                fontSize: "13px",
                lineHeight: 1.45,
                color: "#4b5563",
                margin: "0 0 16px 2px",
              }}
            >
              Choose how DevMinds processes your repository and engineering context.
            </p>

            {/* Card 1: Allow external LLM */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1.5px solid #27272a",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  {/* Brain Icon */}
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      backgroundColor: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-4.54z" />
                      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-4.54z" />
                    </svg>
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, fontSize: "14.5px", color: "#111827", marginBottom: "4px" }}>
                      Allow external LLM
                    </div>
                    <p style={{ margin: "0 0 8px 0", fontSize: "12.5px", color: "#4b5563", lineHeight: 1.45 }}>
                      When enabled, DevMinds may send the relevant code snippets and context needed for your request to the configured external AI provider to generate explanations and answers.
                    </p>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "11.5px", color: "#6b7280" }}>
                      <span style={{ fontSize: "12px", marginTop: "-1px" }}>ⓘ</span>
                      <span>Data sent to an external provider is subject to that provider's data handling and retention policies.</span>
                    </div>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={handleToggleExternalLlm}
                  aria-label="Toggle external LLM"
                  style={{
                    width: "44px",
                    height: "24px",
                    borderRadius: "12px",
                    backgroundColor: allowExternalLlm ? "#f59e0b" : "#d1d5db",
                    border: "2px solid #000000",
                    position: "relative",
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      backgroundColor: "#ffffff",
                      border: "1.5px solid #000000",
                      position: "absolute",
                      top: "2px",
                      left: allowExternalLlm ? "22px" : "2px",
                      transition: "left 0.15s ease",
                    }}
                  />
                </button>
              </div>
            </div>

            {/* Card 2: External AI processing enabled summary card */}
            <div
              style={{
                backgroundColor: "#fffbeb",
                border: "1.5px solid #f59e0b",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                {/* Large Info Icon */}
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    border: "2.5px solid #000000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: "16px",
                    color: "#000000",
                    flexShrink: 0,
                    fontFamily: "serif",
                  }}
                >
                  i
                </div>

                <div>
                  <div style={{ fontWeight: 800, fontSize: "14.5px", color: "#111827", marginBottom: "4px" }}>
                    {allowExternalLlm ? "External AI processing enabled" : "External AI processing disabled"}
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#4b5563", lineHeight: 1.45 }}>
                    {allowExternalLlm
                      ? "Relevant repository content and context may be sent to the configured external LLM when you use AI-powered features."
                      : "Repository content will remain strictly local on your device."}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", backgroundColor: "#fde68a", marginBottom: "12px" }} />

              {/* Details table / key-value list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", marginBottom: "14px", fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ width: "115px", color: "#4b5563", fontWeight: 600 }}>Status</span>
                  <span style={{ color: "#4b5563", marginRight: "8px" }}>:</span>
                  <span
                    style={{
                      backgroundColor: allowExternalLlm ? "#166534" : "#6b7280",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    {allowExternalLlm ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ width: "115px", color: "#4b5563", fontWeight: 600 }}>Provider</span>
                  <span style={{ color: "#4b5563", marginRight: "8px" }}>:</span>
                  <span style={{ color: "#111827", fontWeight: 600 }}>
                    {allowExternalLlm ? "OpenAI" : "None (Local)"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <span style={{ width: "115px", color: "#4b5563", fontWeight: 600, flexShrink: 0 }}>What's shared</span>
                  <span style={{ color: "#4b5563", marginRight: "8px" }}>:</span>
                  <span style={{ color: "#374151", lineHeight: 1.4 }}>
                    {allowExternalLlm
                      ? "Code snippets, file content, repository structure and your request context."
                      : "No code or repository data is sent externally."}
                  </span>
                </div>
              </div>

              {/* Save Preferences Button */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleSave}
                  onMouseEnter={() => setSaveHovered(true)}
                  onMouseLeave={() => setSaveHovered(false)}
                  style={{
                    padding: "8px 18px",
                    backgroundColor: isSaved ? "#bbf7d0" : "#f79f24",
                    color: "#000000",
                    border: "2px solid #000000",
                    borderRadius: "6px",
                    boxShadow: saveHovered
                      ? "3px 3px 0px #000000"
                      : "2px 2px 0px #000000",
                    transform: saveHovered ? "translate(-1px, -1px)" : "translate(0, 0)",
                    fontWeight: 800,
                    fontSize: "12.5px",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                >
                  {isSaved ? "Saved ✓" : "Save Preferences"}
                </button>
              </div>
            </div>

            {/* Card 3: Use Local Processing (Privacy Mode) */}
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1.5px solid #27272a",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  {/* Microchip / CPU Icon */}
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      backgroundColor: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                      <rect x="9" y="9" width="6" height="6" />
                      <line x1="9" y1="1" x2="9" y2="4" />
                      <line x1="15" y1="1" x2="15" y2="4" />
                      <line x1="9" y1="20" x2="9" y2="23" />
                      <line x1="15" y1="20" x2="15" y2="23" />
                      <line x1="20" y1="9" x2="23" y2="9" />
                      <line x1="20" y1="14" x2="23" y2="14" />
                      <line x1="1" y1="9" x2="4" y2="9" />
                      <line x1="1" y1="14" x2="4" y2="14" />
                    </svg>
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, fontSize: "14.5px", color: "#111827", marginBottom: "4px" }}>
                      Use Local Processing (Privacy Mode)
                    </div>
                    <p style={{ margin: "0 0 8px 0", fontSize: "12.5px", color: "#4b5563", lineHeight: 1.45 }}>
                      Keep your data within your device. No external sharing.
                    </p>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "11.5px", color: "#6b7280" }}>
                      <span style={{ fontSize: "12px", marginTop: "-1px" }}>ⓘ</span>
                      <span>Uses on-device AI for basic understanding and analysis. May have limited capabilities compared to external LLMs.</span>
                    </div>
                  </div>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={handleToggleLocalProcessing}
                  aria-label="Toggle local processing"
                  style={{
                    width: "44px",
                    height: "24px",
                    borderRadius: "12px",
                    backgroundColor: useLocalProcessing ? "#f59e0b" : "#6b7280",
                    border: "2px solid #000000",
                    position: "relative",
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      backgroundColor: "#ffffff",
                      border: "1.5px solid #000000",
                      position: "absolute",
                      top: "2px",
                      left: useLocalProcessing ? "22px" : "2px",
                      transition: "left 0.15s ease",
                    }}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Navigation Bar (Home, Integrations, Settings) */}
      <footer
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#ffffff",
          borderTop: "1.5px solid #e5e0d8",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          padding: "8px 0",
          zIndex: 30,
        }}
      >
        {/* Home */}
        <button
          type="button"
          onClick={() => {
            setActiveBottomNav("home");
            if (onGoToHome) onGoToHome();
            else onBack();
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            color: activeBottomNav === "home" ? "#f97316" : "#6b7280",
            fontSize: "11px",
            fontWeight: 700,
            padding: "2px 16px",
            borderBottom: activeBottomNav === "home" ? "2px solid #f97316" : "2px solid transparent",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </button>

        {/* Integrations */}
        <button
          type="button"
          onClick={() => {
            setActiveBottomNav("integrations");
            if (onGoToIntegrations) onGoToIntegrations();
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            color: activeBottomNav === "integrations" ? "#f97316" : "#6b7280",
            fontSize: "11px",
            fontWeight: 700,
            padding: "2px 16px",
            borderBottom: activeBottomNav === "integrations" ? "2px solid #f97316" : "2px solid transparent",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <span>Integrations</span>
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={() => setActiveBottomNav("settings")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            color: activeBottomNav === "settings" ? "#f97316" : "#6b7280",
            fontSize: "11px",
            fontWeight: 700,
            padding: "2px 16px",
            borderBottom: activeBottomNav === "settings" ? "2px solid #f97316" : "2px solid transparent",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Settings</span>
        </button>
      </footer>
    </div>
  );
}
