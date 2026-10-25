/**
 * File:        extension/src/components/OpenSourceMainScreen.tsx
 * Purpose:     Screen 01 — Main Screen (Chrome Extension Side Panel size).
 *              Shows repository identity card, analysis complete status,
 *              list of 4 feature entry points, and floating AI Mentor button.
 */

import { useState } from "react";
import type { SessionUser } from "../services/api";
import type { RepoRef } from "../services/repoDetector";
import type { ArchitectureBundle } from "../types/architecture";
import type { LiveRepoSnapshot } from "../services/githubApi";

export interface OpenSourceMainScreenProps {
  repo: RepoRef;
  user: SessionUser | null;
  architectureData?: ArchitectureBundle | null;
  liveRepo?: LiveRepoSnapshot | null;
  isAnalyzing?: boolean;
  analyzeError?: string | null;
  onRetryAnalysis?: () => void;
  onOpenFeature: (feature: "overview" | "architecture" | "setup" | "contributions") => void;
  onOpenAiMentor: () => void;
  onChangeMode?: () => void;
  onSignOut?: () => void;
  onClose?: () => void;
}

export function OpenSourceMainScreen({
  repo,
  user,
  architectureData,
  liveRepo,
  isAnalyzing = false,
  analyzeError = null,
  onRetryAnalysis,
  onOpenFeature,
  onOpenAiMentor,
  onChangeMode,
  onSignOut,
  onClose,
}: OpenSourceMainScreenProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [mentorHovered, setMentorHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const initial = user?.github_login ? user.github_login.charAt(0).toUpperCase() : "P";
  const repoName = repo.repo || liveRepo?.metadata?.repo || "";
  const repoOwner = repo.owner || liveRepo?.metadata?.owner || "";
  const repoUrl = `https://github.com/${repoOwner}/${repoName}`;
  const repoDescription =
    architectureData?.overview?.summary ||
    liveRepo?.metadata?.description ||
    (isAnalyzing ? "Analyzing repository structure and architecture..." : "Public GitHub repository.");

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
        position: "relative",
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #e5e0d8",
          backgroundColor: "#faf7f2",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Logo */}
          <div
            style={{
              width: "26px",
              height: "26px",
              backgroundColor: "#18181b",
              borderRadius: "5px",
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
                fontSize: "12px",
                lineHeight: 1,
              }}
            >
              &gt;_
            </span>
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: "16px",
              letterSpacing: "-0.01em",
              color: "#18181b",
            }}
          >
            DevMinds
          </span>

          {/* Mode Pill Button */}
          <button
            type="button"
            onClick={onChangeMode}
            title="Switch experience mode"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 8px",
              backgroundColor: "#fef3c7",
              border: "1px solid #f59e0b",
              borderRadius: "9999px",
              color: "#18181b",
              fontSize: "11px",
              fontWeight: 700,
              cursor: onChangeMode ? "pointer" : "default",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Open-Source Contributor</span>
            <span style={{ fontSize: "9px" }}>▼</span>
          </button>
        </div>

        {/* User / Close controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "#18181b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "11px",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.github_login}
                  width={24}
                  height={24}
                  style={{ borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                initial
              )}
            </button>

            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "32px",
                  right: 0,
                  backgroundColor: "#ffffff",
                  border: "1.5px solid #27272a",
                  borderRadius: "8px",
                  boxShadow: "3px 3px 0px #000000",
                  width: "150px",
                  zIndex: 50,
                  padding: "6px",
                }}
              >
                {user && (
                  <div
                    style={{
                      fontSize: "11.5px",
                      color: "#6b7280",
                      padding: "4px 6px",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    @{user.github_login}
                  </div>
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
                      padding: "6px",
                      border: "none",
                      background: "transparent",
                      color: "#dc2626",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Sign out
                  </button>
                )}
              </div>
            )}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#6b7280",
                fontSize: "16px",
                padding: "2px 4px",
              }}
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ padding: "16px 14px 80px 14px", flex: 1 }}>
        {/* Repository Header Card */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1.5px solid #27272a",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "8px" }}>
            {/* Octocat circle avatar */}
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                backgroundColor: "#18181b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017C2 16.446 4.87 20.198 8.84 21.523C9.34 21.616 9.52 21.306 9.52 21.042C9.52 20.806 9.51 20.007 9.51 19.167C6.73 19.771 6.14 17.828 6.14 17.828C5.68 16.671 5.03 16.362 5.03 16.362C4.12 15.742 5.1 15.755 5.1 15.755C6.1 15.827 6.63 16.786 6.63 16.786C7.52 18.318 8.97 17.876 9.54 17.62C9.63 16.974 9.89 16.531 10.17 16.279C7.95 16.027 5.62 15.166 5.62 11.332C5.62 10.239 6.01 9.348 6.66 8.649C6.55 8.398 6.21 7.378 6.76 6.002C6.76 6.002 7.6 5.733 9.51 7.027C10.31 6.804 11.16 6.693 12 6.689C12.84 6.693 13.69 6.804 14.49 7.027C16.4 5.733 17.24 6.002 17.24 6.002C17.79 7.378 17.45 8.398 17.34 8.649C17.99 9.348 18.38 10.239 18.38 11.332C18.38 15.176 16.04 16.024 13.82 16.271C14.18 16.582 14.5 17.2 14.5 18.156C14.5 19.525 14.49 20.627 14.49 20.963C14.49 21.229 14.67 21.545 15.18 21.444C19.14 20.111 22 16.416 22 12.017C22 6.484 17.522 2 12 2Z"
                  fill="#ffffff"
                />
              </svg>
            </div>

            <div>
              <h2 style={{ margin: "0 0 2px 0", fontSize: "19px", fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
                {repoName}
              </h2>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>by {repoOwner}</div>
            </div>
          </div>

          <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#4b5563", lineHeight: 1.45 }}>
            {repoDescription}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: 500 }}
            >
              github.com/{repoOwner}/{repoName}
            </a>
          </div>

          {/* Analysis Status Badge */}
          {isAnalyzing ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                backgroundColor: "#fef3c7",
                color: "#92400e",
                borderRadius: "9999px",
                fontSize: "11.5px",
                fontWeight: 700,
              }}
            >
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#f59e0b" }} />
              <span>Analyzing repository...</span>
            </div>
          ) : analyzeError ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                backgroundColor: "#fee2e2",
                color: "#991b1b",
                borderRadius: "9999px",
                fontSize: "11.5px",
                fontWeight: 700,
              }}
            >
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
              <span>Live GitHub facts loaded</span>
              {onRetryAnalysis && (
                <button
                  type="button"
                  onClick={onRetryAnalysis}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    padding: 0,
                    marginLeft: "4px",
                  }}
                >
                  Retry AI
                </button>
              )}
            </div>
          ) : architectureData ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                backgroundColor: "#dcfce7",
                color: "#166534",
                borderRadius: "9999px",
                fontSize: "11.5px",
                fontWeight: 700,
              }}
            >
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#16a34a" }} />
              <span>Analysis complete</span>
            </div>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                backgroundColor: "#dcfce7",
                color: "#166534",
                borderRadius: "9999px",
                fontSize: "11.5px",
                fontWeight: 700,
              }}
            >
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#16a34a" }} />
              <span>Repository connected</span>
            </div>
          )}
        </div>

        {/* FEATURES label */}
        <div
          style={{
            fontSize: "10.5px",
            fontWeight: 800,
            color: "#6b7280",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          FEATURES
        </div>

        {/* 4 Feature Action Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* 1. Repository Overview */}
          <div
            onClick={() => onOpenFeature("overview")}
            onMouseEnter={() => setHoveredCard("overview")}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "10px",
              padding: "13px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              boxShadow:
                hoveredCard === "overview" ? "3px 3px 0px #000000" : "1.5px 1.5px 0px #000000",
              transform: hoveredCard === "overview" ? "translate(-1px, -1px)" : "translate(0, 0)",
              transition: "all 0.12s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "#111827", marginBottom: "2px" }}>
                  Repository Overview
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.3 }}>
                  Purpose, technology stack, project structure.
                </div>
              </div>
            </div>
            <span style={{ color: "#9ca3af", fontSize: "18px", marginLeft: "8px" }}>›</span>
          </div>

          {/* 2. Architecture Explorer */}
          <div
            onClick={() => onOpenFeature("architecture")}
            onMouseEnter={() => setHoveredCard("architecture")}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "10px",
              padding: "13px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              boxShadow:
                hoveredCard === "architecture" ? "3px 3px 0px #000000" : "1.5px 1.5px 0px #000000",
              transform: hoveredCard === "architecture" ? "translate(-1px, -1px)" : "translate(0, 0)",
              transition: "all 0.12s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "#111827", marginBottom: "2px" }}>
                  Architecture Explorer
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.3 }}>
                  Main modules and how they connect.
                </div>
              </div>
            </div>
            <span style={{ color: "#9ca3af", fontSize: "18px", marginLeft: "8px" }}>›</span>
          </div>

          {/* 3. Setup & Testing Guide */}
          <div
            onClick={() => onOpenFeature("setup")}
            onMouseEnter={() => setHoveredCard("setup")}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "10px",
              padding: "13px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              boxShadow:
                hoveredCard === "setup" ? "3px 3px 0px #000000" : "1.5px 1.5px 0px #000000",
              transform: hoveredCard === "setup" ? "translate(-1px, -1px)" : "translate(0, 0)",
              transition: "all 0.12s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "#111827", marginBottom: "2px" }}>
                  Setup & Testing Guide
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.3 }}>
                  Install, run, and test {repoName}.
                </div>
              </div>
            </div>
            <span style={{ color: "#9ca3af", fontSize: "18px", marginLeft: "8px" }}>›</span>
          </div>

          {/* 4. Contribution Assistant */}
          <div
            onClick={() => onOpenFeature("contributions")}
            onMouseEnter={() => setHoveredCard("contributions")}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "10px",
              padding: "13px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              boxShadow:
                hoveredCard === "contributions" ? "3px 3px 0px #000000" : "1.5px 1.5px 0px #000000",
              transform: hoveredCard === "contributions" ? "translate(-1px, -1px)" : "translate(0, 0)",
              transition: "all 0.12s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "#111827", marginBottom: "2px" }}>
                  Contribution Assistant
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.3 }}>
                  Issues, guidelines, and relevant files.
                </div>
              </div>
            </div>
            <span style={{ color: "#9ca3af", fontSize: "18px", marginLeft: "8px" }}>›</span>
          </div>
        </div>
      </main>

      {/* Floating Action Button: AI Mentor */}
      <div
        style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          zIndex: 30,
        }}
      >
        <button
          type="button"
          onClick={onOpenAiMentor}
          onMouseEnter={() => setMentorHovered(true)}
          onMouseLeave={() => setMentorHovered(false)}
          style={{
            backgroundColor: "#f79f24",
            color: "#000000",
            border: "2px solid #000000",
            borderRadius: "24px",
            padding: "9px 16px",
            boxShadow: mentorHovered ? "3.5px 3.5px 0px #000000" : "2px 2px 0px #000000",
            transform: mentorHovered ? "translate(-1px, -1px)" : "translate(0, 0)",
            fontWeight: 800,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "7px",
            transition: "all 0.12s ease",
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>AI Mentor</span>
        </button>
      </div>
    </div>
  );
}
