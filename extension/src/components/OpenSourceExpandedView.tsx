/**
 * File:        extension/src/components/OpenSourceExpandedView.tsx
 * Purpose:     Native Side Panel view for Open-Source repository exploration:
 *              - Overview (Screen 02)
 *              - Architecture (Screen 03)
 *              - Setup & Testing (Screen 04)
 *              - Contributions (Screen 05)
 *              - AI Mentor (Screen 06)
 *              Fully responsive for Chrome Extension side panel with clean SVGs
 *              and no unnecessary emojis.
 */

import { useState } from "react";
import type { RepoRef } from "../services/repoDetector";

export type ExpandedTab = "overview" | "architecture" | "setup" | "contributions" | "ai_mentor";

export interface OpenSourceExpandedViewProps {
  repo: RepoRef;
  activeTab: ExpandedTab;
  onTabChange: (tab: ExpandedTab) => void;
  onClose: () => void; // Return to Screen 01
  onOpenAiMentor?: () => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  sources?: string[];
}

/* =========================================================================================
 * CLEAN SVG ICONS (NO UNNECESSARY EMOJIS)
 * ========================================================================================= */
function OctocatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ArchitectureIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v4m-6 4v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4m0 12v4M2 12h4m12 0h4m-3.17-6.83l-2.83 2.83m-8 8l-2.83 2.83m0-13.66l2.83 2.83m8 8l2.83 2.83" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function OpenSourceExpandedView({
  repo,
  activeTab,
  onTabChange,
  onClose,
}: OpenSourceExpandedViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedArchNode, setSelectedArchNode] = useState<"semantic" | "regex" | "server" | "cli">("semantic");
  const [activeIssue, setActiveIssue] = useState<number | null>(1020);
  const [checklist, setChecklist] = useState({
    context: true,
    files: false,
    tests: false,
    pr: false,
  });

  const repoName = repo.repo || "Employee_Attrition";
  const repoOwner = repo.owner || "purva84";
  const repoUrl = `https://github.com/${repoOwner}/${repoName}`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const navTabs: { id: ExpandedTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <DocIcon /> },
    { id: "architecture", label: "Architecture", icon: <ArchitectureIcon /> },
    { id: "setup", label: "Setup & Testing", icon: <TerminalIcon /> },
    { id: "contributions", label: "Contributions", icon: <UsersIcon /> },
    { id: "ai_mentor", label: "Ask AI", icon: <SparkleIcon /> },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100%",
        backgroundColor: "#faf7f2",
        color: "#18181b",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          backgroundColor: "#faf7f2",
          borderBottom: "1.5px solid #27272a",
          padding: "10px 14px 6px",
          boxSizing: "border-box",
        }}
      >
        {/* Top Row: Back, Logo, Mode Badge, Analysis badge, Close */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          {/* Back button + Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={onClose}
              title="Back to features menu"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "3px 8px",
                backgroundColor: "#ffffff",
                border: "1.5px solid #18181b",
                borderRadius: "6px",
                boxShadow: "1.5px 1.5px 0px #000000",
                fontSize: "11px",
                fontWeight: 700,
                color: "#18181b",
                cursor: "pointer",
              }}
            >
              <span>←</span>
              <span>Back</span>
            </button>

            {/* Logo */}
            <div
              style={{
                width: "22px",
                height: "22px",
                backgroundColor: "#18181b",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f59e0b",
                fontFamily: "ui-monospace, monospace",
                fontWeight: 800,
                fontSize: "11px",
              }}
            >
              &gt;_
            </div>
            <span style={{ fontWeight: 800, fontSize: "14px", color: "#18181b" }}>DevMinds</span>
          </div>

          {/* Right Status + Close */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10.5px",
                fontWeight: 700,
                color: "#15803d",
                backgroundColor: "#dcfce7",
                padding: "2px 7px",
                borderRadius: "12px",
                border: "1px solid #86efac",
              }}
            >
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  backgroundColor: "#16a34a",
                }}
              />
              Analysis complete
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                background: "none",
                border: "none",
                fontSize: "16px",
                color: "#4b5563",
                cursor: "pointer",
                padding: "2px 4px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Repository info strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11.5px",
            color: "#4b5563",
            marginBottom: "8px",
            flexWrap: "wrap",
            gap: "4px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <OctocatIcon />
            <span style={{ fontWeight: 800, color: "#18181b" }}>{repoName}</span>
            <span style={{ color: "#9ca3af" }}>by {repoOwner}</span>
          </div>
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              color: "#2563eb",
              textDecoration: "none",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <span>GitHub</span>
            <span>↗</span>
          </a>
        </div>

        {/* Navigation Tabs Bar — Horizontal scrollable in side panel */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            overflowX: "auto",
            scrollbarWidth: "none",
            paddingBottom: "4px",
          }}
        >
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 11px",
                  backgroundColor: isActive ? "#f79f24" : "#ffffff",
                  border: isActive ? "2px solid #000000" : "1.5px solid #27272a",
                  borderRadius: "6px",
                  boxShadow: isActive ? "2px 2px 0px #000000" : "1.5px 1.5px 0px #000000",
                  fontSize: "11.5px",
                  fontWeight: isActive ? 800 : 600,
                  color: "#18181b",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "all 0.1s ease",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center" }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "16px 14px 28px",
          boxSizing: "border-box",
        }}
      >
        {activeTab === "overview" && (
          <OverviewContent
            repoName={repoName}
            repoUrl={repoUrl}
            onNavigate={onTabChange}
          />
        )}

        {activeTab === "architecture" && (
          <ArchitectureContent
            repoName={repoName}
            repoUrl={repoUrl}
            selectedNode={selectedArchNode}
            onSelectNode={setSelectedArchNode}
          />
        )}

        {activeTab === "setup" && (
          <SetupTestingContent
            repoName={repoName}
            repoUrl={repoUrl}
            copiedKey={copiedKey}
            onCopy={copyToClipboard}
          />
        )}

        {activeTab === "contributions" && (
          <ContributionsContent
            repoName={repoName}
            activeIssue={activeIssue}
            onSelectIssue={setActiveIssue}
            checklist={checklist}
            onToggleChecklist={(key) =>
              setChecklist((prev) => ({ ...prev, [key]: !prev[key as keyof typeof checklist] }))
            }
          />
        )}

        {activeTab === "ai_mentor" && (
          <AiMentorContent repoName={repoName} repoOwner={repoOwner} />
        )}
      </main>
    </div>
  );
}

/* =========================================================================================
 * SCREEN 02 — REPOSITORY OVERVIEW
 * ========================================================================================= */
function OverviewContent({
  repoName,
  repoUrl,
  onNavigate,
}: {
  repoName: string;
  repoUrl: string;
  onNavigate: (tab: ExpandedTab) => void;
}) {
  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      {/* Title + Analyzed Pill */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "19px",
            fontWeight: 800,
            color: "#111827",
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
            wordBreak: "break-word",
          }}
        >
          What is {repoName}?
        </h1>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            backgroundColor: "#dcfce7",
            border: "1px solid #86efac",
            color: "#15803d",
            borderRadius: "12px",
            padding: "2px 8px",
            fontSize: "10.5px",
            fontWeight: 700,
          }}
        >
          <span>✓</span>
          <span>Repository analyzed</span>
        </div>
      </div>

      <p
        style={{
          margin: "0 0 18px 0",
          fontSize: "13px",
          color: "#4b5563",
          lineHeight: 1.5,
        }}
      >
        {repoName} lets developers search source code by meaning, alongside conventional text and
        regex search.
      </p>

      {/* TECHNOLOGIES DETECTED */}
      <div style={{ marginBottom: "20px" }}>
        <h3
          style={{
            margin: "0 0 8px 0",
            fontSize: "10.5px",
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#6b7280",
          }}
        >
          TECHNOLOGIES DETECTED
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {["Python", "ChromaDB", "Flask", "Click CLI", "Poetry", "pytest"].map((tech) => (
            <span
              key={tech}
              style={{
                padding: "4px 10px",
                backgroundColor: "#ffffff",
                border: "1.5px solid #27272a",
                borderRadius: "16px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#18181b",
                boxShadow: "1.5px 1.5px 0px #000000",
              }}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* PROJECT STRUCTURE */}
      <div style={{ marginBottom: "20px" }}>
        <h3
          style={{
            margin: "0 0 10px 0",
            fontSize: "10.5px",
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#6b7280",
          }}
        >
          PROJECT STRUCTURE
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* seagoat/ */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "8px",
              boxShadow: "2px 2px 0px #000000",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ color: "#f59e0b", marginTop: "2px" }}><FolderIcon /></div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "13px",
                  color: "#18181b",
                  fontFamily: "ui-monospace, monospace",
                  marginBottom: "2px",
                }}
              >
                seagoat/
              </div>
              <div style={{ fontSize: "11.5px", color: "#6b7280", lineHeight: 1.4 }}>
                Main Python package containing application code.
              </div>
            </div>
          </div>

          {/* tests/ */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "8px",
              boxShadow: "2px 2px 0px #000000",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ color: "#f59e0b", marginTop: "2px" }}><FolderIcon /></div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "13px",
                  color: "#18181b",
                  fontFamily: "ui-monospace, monospace",
                  marginBottom: "2px",
                }}
              >
                tests/
              </div>
              <div style={{ fontSize: "11.5px", color: "#6b7280", lineHeight: 1.4 }}>
                Automated tests.
              </div>
            </div>
          </div>

          {/* docs/ */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "8px",
              boxShadow: "2px 2px 0px #000000",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ color: "#f59e0b", marginTop: "2px" }}><FolderIcon /></div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "13px",
                  color: "#18181b",
                  fontFamily: "ui-monospace, monospace",
                  marginBottom: "2px",
                }}
              >
                docs/
              </div>
              <div style={{ fontSize: "11.5px", color: "#6b7280", lineHeight: 1.4 }}>
                Project documentation.
              </div>
            </div>
          </div>

          {/* pyproject.toml */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "8px",
              boxShadow: "2px 2px 0px #000000",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ color: "#6b7280", marginTop: "2px" }}><DocIcon /></div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "13px",
                  color: "#18181b",
                  fontFamily: "ui-monospace, monospace",
                  marginBottom: "2px",
                }}
              >
                pyproject.toml
              </div>
              <div style={{ fontSize: "11.5px", color: "#6b7280", lineHeight: 1.4 }}>
                Project metadata, dependencies, and configuration.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "22px" }}>
        <button
          type="button"
          onClick={() => onNavigate("architecture")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "11px 16px",
            backgroundColor: "#f79f24",
            border: "2px solid #000000",
            borderRadius: "7px",
            boxShadow: "2.5px 2.5px 0px #000000",
            fontWeight: 800,
            fontSize: "13px",
            color: "#18181b",
            cursor: "pointer",
            boxSizing: "border-box",
          }}
        >
          <FolderIcon />
          <span>Explore folder →</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("setup")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "11px 16px",
            backgroundColor: "#ffffff",
            border: "1.5px solid #27272a",
            borderRadius: "7px",
            boxShadow: "2px 2px 0px #000000",
            fontWeight: 700,
            fontSize: "13px",
            color: "#18181b",
            cursor: "pointer",
            boxSizing: "border-box",
          }}
        >
          <GearIcon />
          <span>View configuration</span>
        </button>
      </div>

      {/* SOURCE EVIDENCE */}
      <div
        style={{
          borderTop: "1px dashed #d1c7b7",
          paddingTop: "12px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "11px",
          color: "#6b7280",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 700, color: "#18181b" }}>SOURCE EVIDENCE</span>
        <span>•</span>
        <a
          href={repoUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            color: "#2563eb",
            fontWeight: 600,
            textDecoration: "underline",
            wordBreak: "break-all",
          }}
        >
          {repoUrl} ↗
        </a>
      </div>
    </div>
  );
}

/* =========================================================================================
 * SCREEN 03 — ARCHITECTURE EXPLORER
 * ========================================================================================= */
function ArchitectureContent({
  repoName,
  repoUrl,
  selectedNode,
  onSelectNode,
}: {
  repoName: string;
  repoUrl: string;
  selectedNode: "semantic" | "regex" | "server" | "cli";
  onSelectNode: (node: "semantic" | "regex" | "server" | "cli") => void;
}) {
  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      <h1
        style={{
          margin: "0 0 4px 0",
          fontSize: "19px",
          fontWeight: 800,
          color: "#111827",
          lineHeight: 1.25,
        }}
      >
        Architecture Explorer
      </h1>
      <p style={{ margin: "0 0 16px 0", fontSize: "12.5px", color: "#4b5563", lineHeight: 1.45 }}>
        Explore how components connect and how search flows through {repoName}.
      </p>

      {/* Interactive Diagram */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1.5px solid #27272a",
          borderRadius: "8px",
          boxShadow: "2.5px 2.5px 0px #000000",
          padding: "14px",
          marginBottom: "16px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontSize: "10.5px",
            fontWeight: 700,
            color: "#6b7280",
            marginBottom: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Search Flow Pipeline
        </div>

        {/* Vertical Pipeline Flow */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          {/* Developer Node */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #18181b",
              borderRadius: "20px",
              boxShadow: "1.5px 1.5px 0px #000000",
            }}
          >
            <UserIcon />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#18181b" }}>Developer</span>
          </div>

          <div style={{ fontSize: "14px", color: "#9ca3af", lineHeight: 1 }}>↓</div>

          {/* CLI Node */}
          <div
            onClick={() => onSelectNode("cli")}
            style={{
              width: "100%",
              maxWidth: "240px",
              padding: "10px",
              backgroundColor: selectedNode === "cli" ? "#fef3c7" : "#ffffff",
              border: selectedNode === "cli" ? "2px solid #f59e0b" : "1.5px solid #27272a",
              borderRadius: "6px",
              boxShadow: "2px 2px 0px #000000",
              cursor: "pointer",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "12.5px", color: "#18181b" }}>CLI (seagoat / gt)</div>
            <div style={{ fontSize: "10.5px", color: "#6b7280" }}>Click CLI entry point</div>
          </div>

          <div style={{ fontSize: "14px", color: "#9ca3af", lineHeight: 1 }}>↓</div>

          {/* Server Node */}
          <div
            onClick={() => onSelectNode("server")}
            style={{
              width: "100%",
              maxWidth: "240px",
              padding: "12px",
              backgroundColor: selectedNode === "server" ? "#fef3c7" : "#f79f24",
              border: "2px solid #000000",
              borderRadius: "6px",
              boxShadow: "2px 2px 0px #000000",
              cursor: "pointer",
              textAlign: "center",
              fontWeight: 800,
              fontSize: "13px",
              color: "#18181b",
              boxSizing: "border-box",
            }}
          >
            {repoName} Server
          </div>

          <div style={{ fontSize: "14px", color: "#9ca3af", lineHeight: 1 }}>↓</div>

          {/* Search Engines Stack */}
          <div style={{ display: "flex", gap: "8px", width: "100%" }}>
            {/* Semantic Search */}
            <div
              onClick={() => onSelectNode("semantic")}
              style={{
                flex: 1,
                padding: "10px 8px",
                backgroundColor: selectedNode === "semantic" ? "#fffbeb" : "#ffffff",
                border: selectedNode === "semantic" ? "2px solid #f59e0b" : "1.5px solid #27272a",
                borderRadius: "6px",
                boxShadow: "2px 2px 0px #000000",
                cursor: "pointer",
                textAlign: "center",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: "11px", color: "#18181b" }}>Semantic Search</div>
              <div style={{ fontSize: "9.5px", color: "#6b7280" }}>ChromaDB</div>
            </div>

            {/* Regex Search */}
            <div
              onClick={() => onSelectNode("regex")}
              style={{
                flex: 1,
                padding: "10px 8px",
                backgroundColor: selectedNode === "regex" ? "#fffbeb" : "#ffffff",
                border: selectedNode === "regex" ? "2px solid #f59e0b" : "1.5px solid #27272a",
                borderRadius: "6px",
                boxShadow: "2px 2px 0px #000000",
                cursor: "pointer",
                textAlign: "center",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: "11px", color: "#18181b" }}>Text / Regex</div>
              <div style={{ fontSize: "9.5px", color: "#6b7280" }}>ripgrep</div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Inspector Panel */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1.5px solid #27272a",
          borderRadius: "8px",
          boxShadow: "2px 2px 0px #000000",
          padding: "14px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: "10.5px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>
          COMPONENT DETAILS
        </div>

        {selectedNode === "semantic" && (
          <>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 800, color: "#18181b" }}>
              Semantic Search
            </h3>
            <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#4b5563", lineHeight: 1.4 }}>
              Supports code search by semantic similarity using embeddings and ChromaDB.
            </p>
            <div style={{ fontSize: "11.5px", marginBottom: "6px" }}>
              <strong>Tech:</strong> Embeddings + ChromaDB
            </div>
            <div style={{ fontSize: "11.5px", marginBottom: "12px" }}>
              <strong>Evidence:</strong> Documented in README
            </div>
          </>
        )}

        {selectedNode === "regex" && (
          <>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 800, color: "#18181b" }}>
              Text / Regex Search
            </h3>
            <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#4b5563", lineHeight: 1.4 }}>
              Fast text-based searching using ripgrep under the hood.
            </p>
            <div style={{ fontSize: "11.5px", marginBottom: "12px" }}>
              <strong>Tech:</strong> ripgrep
            </div>
          </>
        )}

        {selectedNode === "server" && (
          <>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 800, color: "#18181b" }}>
              {repoName} Server
            </h3>
            <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#4b5563", lineHeight: 1.4 }}>
              Local background server that indexes source code and serves search queries.
            </p>
            <div style={{ fontSize: "11.5px", marginBottom: "12px" }}>
              <strong>Tech:</strong> Flask
            </div>
          </>
        )}

        {selectedNode === "cli" && (
          <>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 800, color: "#18181b" }}>
              CLI (seagoat / gt)
            </h3>
            <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#4b5563", lineHeight: 1.4 }}>
              Terminal command-line entry point for running fast code queries.
            </p>
            <div style={{ fontSize: "11.5px", marginBottom: "12px" }}>
              <strong>Tech:</strong> Click CLI
            </div>
          </>
        )}

        <a
          href={repoUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "8px 12px",
            backgroundColor: "#faf7f2",
            border: "1.5px solid #27272a",
            borderRadius: "6px",
            boxShadow: "1.5px 1.5px 0px #000000",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "12px",
            color: "#18181b",
          }}
        >
          <OctocatIcon />
          <span>View Source on GitHub</span>
        </a>
      </div>
    </div>
  );
}

/* =========================================================================================
 * SCREEN 04 — SETUP & TESTING GUIDE
 * ========================================================================================= */
function SetupTestingContent({
  repoName,
  repoUrl,
  copiedKey,
  onCopy,
}: {
  repoName: string;
  repoUrl: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      <h1
        style={{
          margin: "0 0 4px 0",
          fontSize: "19px",
          fontWeight: 800,
          color: "#111827",
        }}
      >
        Get {repoName} running
      </h1>
      <p style={{ margin: "0 0 16px 0", fontSize: "12.5px", color: "#4b5563" }}>
        Follow the installation guide or prepare for development.
      </p>

      {/* Numbered Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
        {/* Step 1 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "#f79f24",
              border: "1.5px solid #000000",
              fontWeight: 800,
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            1
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: "13px", color: "#18181b", marginBottom: "2px" }}>
              Prerequisites
            </div>
            <div style={{ fontSize: "12px", color: "#4b5563" }}>
              • Python 3.11+ &nbsp; • ripgrep &nbsp; • bat
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "#f79f24",
              border: "1.5px solid #000000",
              fontWeight: 800,
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            2
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: "13px", color: "#18181b", marginBottom: "4px" }}>
              Install {repoName}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                backgroundColor: "#ffffff",
                border: "1.5px solid #27272a",
                borderRadius: "6px",
                boxShadow: "1.5px 1.5px 0px #000000",
                fontFamily: "ui-monospace, monospace",
                fontSize: "12px",
                fontWeight: 600,
                color: "#18181b",
                marginBottom: "3px",
                overflowX: "auto",
              }}
            >
              <code>pipx install seagoat</code>
              <button
                type="button"
                onClick={() => onCopy("pipx install seagoat", "step2")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  padding: "0 4px",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {copiedKey === "step2" ? "✓" : <CopyIcon />}
              </button>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "#f79f24",
              border: "1.5px solid #000000",
              fontWeight: 800,
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            3
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: "13px", color: "#18181b", marginBottom: "4px" }}>
              Start server
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                backgroundColor: "#ffffff",
                border: "1.5px solid #27272a",
                borderRadius: "6px",
                boxShadow: "1.5px 1.5px 0px #000000",
                fontFamily: "ui-monospace, monospace",
                fontSize: "12px",
                fontWeight: 600,
                color: "#18181b",
                marginBottom: "3px",
                overflowX: "auto",
              }}
            >
              <code>seagoat-server start &lt;repo&gt;</code>
              <button
                type="button"
                onClick={() => onCopy("seagoat-server start /path/to/repo", "step3")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  padding: "0 4px",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {copiedKey === "step3" ? "✓" : <CopyIcon />}
              </button>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "#f79f24",
              border: "1.5px solid #000000",
              fontWeight: 800,
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            4
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: "13px", color: "#18181b", marginBottom: "4px" }}>
              Search codebase
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                backgroundColor: "#ffffff",
                border: "1.5px solid #27272a",
                borderRadius: "6px",
                boxShadow: "1.5px 1.5px 0px #000000",
                fontFamily: "ui-monospace, monospace",
                fontSize: "12px",
                fontWeight: 600,
                color: "#18181b",
                marginBottom: "3px",
                overflowX: "auto",
              }}
            >
              <code>gt &quot;query&quot;</code>
              <button
                type="button"
                onClick={() => onCopy('gt "query"', "step4")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  padding: "0 4px",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {copiedKey === "step4" ? "✓" : <CopyIcon />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Develop card */}
      <div
        style={{
          padding: "14px",
          backgroundColor: "#ffffff",
          border: "1.5px solid #27272a",
          borderRadius: "8px",
          boxShadow: "2px 2px 0px #000000",
          marginBottom: "14px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: "13px", color: "#18181b", marginBottom: "4px" }}>
          &lt;/&gt; Develop {repoName}
        </div>
        <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
          Set up development environment and run tests:
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 10px",
            backgroundColor: "#faf8f5",
            border: "1px solid #d1c7b7",
            borderRadius: "4px",
            fontFamily: "ui-monospace, monospace",
            fontSize: "11px",
          }}
        >
          <div>poetry install && pytest</div>
          <button
            type="button"
            onClick={() => onCopy("poetry install && pytest", "dev")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {copiedKey === "dev" ? "✓" : <CopyIcon />}
          </button>
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <a
          href={`${repoUrl}#readme`}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb", textDecoration: "none" }}
        >
          Open full README ↗
        </a>
      </div>
    </div>
  );
}

/* =========================================================================================
 * SCREEN 05 — CONTRIBUTION ASSISTANT
 * ========================================================================================= */
function ContributionsContent({
  repoName,
  activeIssue,
  onSelectIssue,
  checklist,
  onToggleChecklist,
}: {
  repoName: string;
  activeIssue: number | null;
  onSelectIssue: (issue: number) => void;
  checklist: { context: boolean; files: boolean; tests: boolean; pr: boolean };
  onToggleChecklist: (key: string) => void;
}) {
  const issues = [
    { num: 1020, title: "Add contributors section to README", area: "README.md" },
    { num: 751, title: "Support additional file languages", area: "parsers & related tests" },
    { num: 1021, title: "Test failures with Click 8.2", area: "CLI test configuration" },
  ];

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      <h1
        style={{
          margin: "0 0 4px 0",
          fontSize: "19px",
          fontWeight: 800,
          color: "#111827",
        }}
      >
        Contribution Assistant
      </h1>
      <p style={{ margin: "0 0 16px 0", fontSize: "12.5px", color: "#4b5563" }}>
        Find open issues and prepare your contribution plan.
      </p>

      {/* Issues list */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "10.5px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
          OPEN ISSUES
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {issues.map((issue) => {
            const isSelected = activeIssue === issue.num;
            return (
              <div
                key={issue.num}
                onClick={() => onSelectIssue(issue.num)}
                style={{
                  padding: "10px 12px",
                  backgroundColor: "#ffffff",
                  border: isSelected ? "2px solid #000000" : "1.5px solid #27272a",
                  borderRadius: "8px",
                  boxShadow: isSelected ? "2.5px 2.5px 0px #000000" : "1.5px 1.5px 0px #000000",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 800, fontSize: "12px" }}>
                    #{issue.num}
                  </span>
                  <span
                    style={{
                      padding: "2px 6px",
                      backgroundColor: "#dcfce7",
                      color: "#15803d",
                      borderRadius: "10px",
                      fontSize: "10px",
                      fontWeight: 700,
                    }}
                  >
                    ● Open
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: "12.5px", color: "#18181b", marginBottom: "3px" }}>
                  {issue.title}
                </div>
                <div style={{ fontSize: "11px", color: "#6b7280" }}>
                  Area: {issue.area}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Proposed Checklist */}
      <div
        style={{
          padding: "12px 14px",
          backgroundColor: "#ffffff",
          border: "1.5px solid #27272a",
          borderRadius: "8px",
          boxShadow: "2px 2px 0px #000000",
          marginBottom: "16px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: "10.5px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
          PROPOSED CHECKLIST
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input type="checkbox" checked={checklist.context} onChange={() => onToggleChecklist("context")} />
            <span>Read issue and understand context</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input type="checkbox" checked={checklist.files} onChange={() => onToggleChecklist("files")} />
            <span>Explore relevant files</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input type="checkbox" checked={checklist.tests} onChange={() => onToggleChecklist("tests")} />
            <span>Run tests locally</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input type="checkbox" checked={checklist.pr} onChange={() => onToggleChecklist("pr")} />
            <span>Prepare and submit PR</span>
          </label>
        </div>
      </div>

      {/* CTA Button */}
      <button
        type="button"
        style={{
          width: "100%",
          padding: "12px",
          backgroundColor: "#f79f24",
          border: "2px solid #000000",
          borderRadius: "8px",
          boxShadow: "2.5px 2.5px 0px #000000",
          fontWeight: 800,
          fontSize: "13px",
          color: "#18181b",
          cursor: "pointer",
          boxSizing: "border-box",
        }}
      >
        Build contribution plan →
      </button>
    </div>
  );
}

/* =========================================================================================
 * SCREEN 06 — AI MENTOR CHAT
 * ========================================================================================= */
function AiMentorContent({
  repoName,
  repoOwner,
}: {
  repoName: string;
  repoOwner: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "user",
      text: `How does semantic search work in ${repoName}?`,
    },
    {
      id: "2",
      sender: "ai",
      text: `${repoName} combines semantic search with conventional text and regular-expression matching. Its documented stack includes embeddings and ChromaDB for semantic search.`,
      sources: ["README.md", "pyproject.toml"],
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const suggestions = [
    "What is ChromaDB used for?",
    "How does the CLI reach the server?",
    "Which files to inspect for issue #751?",
  ];

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsTyping(true);

    setTimeout(() => {
      let aiResponseText = `Based on the ${repoName} codebase, this component interacts through documented CLI entry points and relies on verified local processing pipelines.`;
      let sources = ["README.md"];

      if (text.includes("ChromaDB")) {
        aiResponseText = "ChromaDB acts as the local vector database storing vector embeddings of your repository's code files to enable semantic, meaning-based code search.";
        sources = ["seagoat/engine.py", "pyproject.toml"];
      } else if (text.includes("CLI") || text.includes("server")) {
        aiResponseText = "The CLI communicates with the background server via local HTTP requests over a local port to quickly query cached embeddings.";
        sources = ["seagoat/server.py", "README.md"];
      } else if (text.includes("751") || text.includes("issue")) {
        aiResponseText = "For issue #751, inspect file extension handling and related tests in the repository.";
        sources = ["seagoat/repository.py", "tests/test_file_types.py"];
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: aiResponseText,
        sources,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", minHeight: "75vh", boxSizing: "border-box" }}>
      {/* Context active header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          backgroundColor: "#ffffff",
          border: "1.5px solid #27272a",
          borderRadius: "6px",
          boxShadow: "1.5px 1.5px 0px #000000",
          marginBottom: "12px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <OctocatIcon />
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#18181b" }}>
            {repoOwner}/{repoName}
          </span>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "10.5px",
            fontWeight: 700,
            color: "#15803d",
            backgroundColor: "#dcfce7",
            padding: "2px 6px",
            borderRadius: "10px",
          }}
        >
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#16a34a" }} />
          Context active
        </div>
      </div>

      {/* Messages */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "88%",
                padding: "10px 12px",
                borderRadius: "8px",
                backgroundColor: msg.sender === "user" ? "#fef3c7" : "#ffffff",
                border: "1.5px solid #27272a",
                boxShadow: "1.5px 1.5px 0px #000000",
                fontSize: "12.5px",
                lineHeight: 1.45,
                color: "#18181b",
                boxSizing: "border-box",
              }}
            >
              {msg.text}

              {msg.sources && msg.sources.length > 0 && (
                <div
                  style={{
                    marginTop: "6px",
                    paddingTop: "6px",
                    borderTop: "1px dashed #d1c7b7",
                    fontSize: "10.5px",
                    color: "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontWeight: 700 }}>SOURCES:</span>
                  {msg.sources.map((s) => (
                    <span
                      key={s}
                      style={{
                        padding: "1px 5px",
                        backgroundColor: "#f3f4f6",
                        borderRadius: "3px",
                        fontFamily: "ui-monospace, monospace",
                        color: "#2563eb",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ fontSize: "11.5px", color: "#6b7280", fontStyle: "italic" }}>
            DevMinds AI is thinking…
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Suggestions */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6b7280", marginBottom: "6px" }}>
          SUGGESTED QUESTIONS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSend(q)}
              style={{
                textAlign: "left",
                padding: "6px 10px",
                backgroundColor: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "6px",
                fontSize: "11.5px",
                fontWeight: 600,
                color: "#92400e",
                cursor: "pointer",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Ask about this repo…"
          style={{
            flex: 1,
            padding: "10px 12px",
            backgroundColor: "#ffffff",
            border: "1.5px solid #27272a",
            borderRadius: "6px",
            boxShadow: "1.5px 1.5px 0px #000000",
            fontSize: "12px",
            color: "#18181b",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          onClick={() => handleSend()}
          style={{
            padding: "10px 14px",
            backgroundColor: "#f79f24",
            border: "2px solid #000000",
            borderRadius: "6px",
            boxShadow: "1.5px 1.5px 0px #000000",
            fontWeight: 800,
            fontSize: "12px",
            color: "#18181b",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Send ➔
        </button>
      </div>
    </div>
  );
}
