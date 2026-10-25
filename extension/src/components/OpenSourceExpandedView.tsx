/**
 * File:        extension/src/components/OpenSourceExpandedView.tsx
 * Purpose:     Native Side Panel view for Open-Source repository exploration:
 *              - Overview (Screen 02)
 *              - Architecture (Screen 03)
 *              - Setup & Testing (Screen 04)
 *              - Contributions (Screen 05)
 *              - AI Mentor (Screen 06)
 *              Fully responsive for Chrome Extension side panel with clean SVGs
 *              and real-time live data from GitHub and DevMinds backend agents.
 */

import React, { useState } from "react";
import type { RepoRef } from "../services/repoDetector";
import type { ArchitectureBundle } from "../types/architecture";
import type { LiveRepoSnapshot } from "../services/githubApi";
import { postChat } from "../services/api";

export type ExpandedTab = "overview" | "architecture" | "setup" | "contributions" | "ai_mentor";

export interface OpenSourceExpandedViewProps {
  repo: RepoRef;
  activeTab: ExpandedTab;
  architectureData?: ArchitectureBundle | null;
  liveRepo?: LiveRepoSnapshot | null;
  isAnalyzing?: boolean;
  analyzeError?: string | null;
  onRetryAnalysis?: () => void;
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
 * CLEAN SVG ICONS
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

export function OpenSourceExpandedView({
  repo,
  activeTab,
  architectureData,
  liveRepo,
  isAnalyzing = false,
  analyzeError = null,
  onRetryAnalysis,
  onTabChange,
  onClose,
}: OpenSourceExpandedViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedArchNode, setSelectedArchNode] = useState<string>("root");
  const [activeIssue, setActiveIssue] = useState<number | null>(null);
  const [checklist, setChecklist] = useState({
    context: true,
    files: false,
    tests: false,
    pr: false,
  });

  const repoName = repo.repo || liveRepo?.metadata?.repo || "";
  const repoOwner = repo.owner || liveRepo?.metadata?.owner || "";
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
        backgroundColor: "#faf7f2",
        color: "#18181b",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        position: "relative",
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid #e5e0d8",
          backgroundColor: "#faf7f2",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={onClose}
            title="Return to Main Overview"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              boxShadow: "1.5px 1.5px 0px #000000",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 800, color: "#18181b" }}>←</span>
          </button>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#18181b", lineHeight: 1.2 }}>
              {repoName}
            </div>
            <div style={{ fontSize: "11px", color: "#6b7280" }}>{repoOwner}</div>
          </div>
        </div>

        {/* External GitHub link */}
        <a
          href={repoUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "11.5px",
            color: "#2563eb",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <OctocatIcon />
          <span>GitHub</span>
        </a>
      </header>

      {/* Navigation Sub-Tabs */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "6px 10px",
          backgroundColor: "#f4ede4",
          borderBottom: "1px solid #e5e0d8",
          overflowX: "auto",
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
                padding: "6px 10px",
                borderRadius: "6px",
                border: isActive ? "1.5px solid #18181b" : "1.5px solid transparent",
                backgroundColor: isActive ? "#ffffff" : "transparent",
                boxShadow: isActive ? "1.5px 1.5px 0px #000000" : "none",
                fontWeight: isActive ? 800 : 600,
                fontSize: "11.5px",
                color: isActive ? "#18181b" : "#4b5563",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Tab Body */}
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
            repoOwner={repoOwner}
            repoUrl={repoUrl}
            architectureData={architectureData}
            liveRepo={liveRepo}
            isAnalyzing={isAnalyzing}
            analyzeError={analyzeError}
            onRetryAnalysis={onRetryAnalysis}
            onNavigate={onTabChange}
          />
        )}

        {activeTab === "architecture" && (
          <ArchitectureContent
            repoName={repoName}
            repoOwner={repoOwner}
            repoUrl={repoUrl}
            architectureData={architectureData}
            liveRepo={liveRepo}
            isAnalyzing={isAnalyzing}
            selectedNode={selectedArchNode}
            onSelectNode={setSelectedArchNode}
          />
        )}

        {activeTab === "setup" && (
          <SetupTestingContent
            repoName={repoName}
            repoOwner={repoOwner}
            repoUrl={repoUrl}
            architectureData={architectureData}
            liveRepo={liveRepo}
            copiedKey={copiedKey}
            onCopy={copyToClipboard}
          />
        )}

        {activeTab === "contributions" && (
          <ContributionsContent
            repoName={repoName}
            repoOwner={repoOwner}
            repoUrl={repoUrl}
            liveRepo={liveRepo}
            activeIssue={activeIssue}
            onSelectIssue={setActiveIssue}
            checklist={checklist}
            onToggleChecklist={(key) =>
              setChecklist((prev) => ({ ...prev, [key]: !prev[key as keyof typeof checklist] }))
            }
            onOpenAiMentor={() => onTabChange("ai_mentor")}
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
  repoOwner,
  repoUrl,
  architectureData,
  liveRepo,
  isAnalyzing,
  analyzeError,
  onRetryAnalysis,
  onNavigate,
}: {
  repoName: string;
  repoOwner: string;
  repoUrl: string;
  architectureData?: ArchitectureBundle | null;
  liveRepo?: LiveRepoSnapshot | null;
  isAnalyzing: boolean;
  analyzeError?: string | null;
  onRetryAnalysis?: () => void;
  onNavigate: (tab: ExpandedTab) => void;
}) {
  const summary =
    architectureData?.overview?.summary ||
    liveRepo?.metadata?.description ||
    (isAnalyzing ? "Analyzing repository facts and structure..." : `Repository ${repoOwner}/${repoName}.`);

  // Real technologies: prefer architecture bundle, fallback to live GitHub languages
  const technologies: { name: string; evidence?: string }[] = [];
  if (architectureData?.technologies && architectureData.technologies.length > 0) {
    for (const t of architectureData.technologies) {
      const ev = (t as any).evidence || (t.evidence_files && t.evidence_files[0]) || "";
      technologies.push({ name: t.name, evidence: ev });
    }
  } else if (liveRepo?.languages && liveRepo.languages.length > 0) {
    for (const lang of liveRepo.languages) {
      technologies.push({ name: lang });
    }
  }

  // Real project structure: prefer architecture components, fallback to top-level files
  const components = architectureData?.components || [];
  const topFiles = liveRepo?.topFiles || [];

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      {/* Title + Status Badge */}
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
        {architectureData ? (
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
        ) : isAnalyzing ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              backgroundColor: "#fef3c7",
              border: "1px solid #fcd34d",
              color: "#92400e",
              borderRadius: "12px",
              padding: "2px 8px",
              fontSize: "10.5px",
              fontWeight: 700,
            }}
          >
            <span>●</span>
            <span>Analyzing repository...</span>
          </div>
        ) : (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              backgroundColor: "#f3f4f6",
              border: "1px solid #d1d5db",
              color: "#374151",
              borderRadius: "12px",
              padding: "2px 8px",
              fontSize: "10.5px",
              fontWeight: 700,
            }}
          >
            <span>●</span>
            <span>Live GitHub data</span>
          </div>
        )}
      </div>

      <p
        style={{
          margin: "0 0 18px 0",
          fontSize: "13px",
          color: "#4b5563",
          lineHeight: 1.5,
        }}
      >
        {summary}
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
          {technologies.length > 0 ? (
            technologies.map((tech) => (
              <span
                key={tech.name}
                title={tech.evidence ? `Evidence: ${tech.evidence}` : undefined}
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
                {tech.name}
              </span>
            ))
          ) : isAnalyzing ? (
            <span style={{ fontSize: "12px", color: "#6b7280" }}>Detecting technologies...</span>
          ) : (
            <span style={{ fontSize: "12px", color: "#6b7280" }}>No specific technologies detected</span>
          )}
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
          {components.length > 0 ? (
            components.map((comp) => (
              <div
                key={comp.id}
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
                <div style={{ color: "#f59e0b", marginTop: "2px" }}>
                  <FolderIcon />
                </div>
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
                    {comp.name}/
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#6b7280", lineHeight: 1.4 }}>
                    {comp.description || `${comp.files?.length || 0} key files`}
                  </div>
                </div>
              </div>
            ))
          ) : topFiles.length > 0 ? (
            topFiles.map((file) => (
              <div
                key={file.path}
                style={{
                  padding: "10px 12px",
                  backgroundColor: "#ffffff",
                  border: "1.5px solid #27272a",
                  borderRadius: "8px",
                  boxShadow: "1.5px 1.5px 0px #000000",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ color: file.type === "dir" ? "#f59e0b" : "#6b7280" }}>
                  {file.type === "dir" ? <FolderIcon /> : <DocIcon />}
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "12.5px",
                    color: "#18181b",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {file.name}{file.type === "dir" ? "/" : ""}
                </div>
              </div>
            ))
          ) : isAnalyzing ? (
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Fetching repository structure...</div>
          ) : (
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Structure not available.</div>
          )}
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
          <ArchitectureIcon />
          <span>Explore Architecture →</span>
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
          <span>View Setup Guide →</span>
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
  repoOwner,
  repoUrl,
  architectureData,
  liveRepo,
  isAnalyzing,
  selectedNode,
  onSelectNode,
}: {
  repoName: string;
  repoOwner: string;
  repoUrl: string;
  architectureData?: ArchitectureBundle | null;
  liveRepo?: LiveRepoSnapshot | null;
  isAnalyzing: boolean;
  selectedNode: string;
  onSelectNode: (nodeId: string) => void;
}) {
  const components = architectureData?.components || [];
  const connections = architectureData?.connections || [];
  const topFiles = liveRepo?.topFiles || [];

  // Active selected component
  const activeComponent =
    components.find((c) => c.id === selectedNode || c.name === selectedNode) ||
    components[0] ||
    null;

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
        Explore how modules connect and interact in {repoName}.
      </p>

      {/* Modules & Pipeline Diagram */}
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
          {components.length > 0 ? "Detected Modules & Components" : "Repository Components"}
        </div>

        {components.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {components.map((comp) => {
              const isSelected = activeComponent?.id === comp.id;
              return (
                <div
                  key={comp.id}
                  onClick={() => onSelectNode(comp.id)}
                  style={{
                    padding: "10px 12px",
                    backgroundColor: isSelected ? "#fef3c7" : "#faf7f2",
                    border: isSelected ? "2px solid #f59e0b" : "1.5px solid #27272a",
                    borderRadius: "6px",
                    boxShadow: isSelected ? "2px 2px 0px #000000" : "1px 1px 0px #000000",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FolderIcon />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "13px", color: "#18181b" }}>
                        {comp.name}/
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280" }}>
                        {comp.files?.length || 0} tracked files
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: "14px", color: "#9ca3af" }}>›</span>
                </div>
              );
            })}
          </div>
        ) : topFiles.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {topFiles.map((file) => (
              <span
                key={file.path}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#ffffff",
                  border: "1.5px solid #27272a",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontFamily: "ui-monospace, monospace",
                  fontWeight: 600,
                }}
              >
                {file.name}{file.type === "dir" ? "/" : ""}
              </span>
            ))}
          </div>
        ) : isAnalyzing ? (
          <div style={{ fontSize: "12px", color: "#6b7280" }}>Analyzing architecture components...</div>
        ) : (
          <div style={{ fontSize: "12px", color: "#6b7280" }}>No architecture components detected.</div>
        )}

        {/* Connections overview */}
        {connections.length > 0 && (
          <div style={{ marginTop: "14px", borderTop: "1px dashed #e5e0d8", paddingTop: "10px" }}>
            <div style={{ fontSize: "10px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>
              Inter-Component Connections
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {connections.slice(0, 4).map((conn, idx) => {
                const fromNode = (conn as any).from_component || conn.from || "";
                const toNode = (conn as any).to_component || conn.to || "";
                return (
                  <div key={idx} style={{ fontSize: "11px", color: "#4b5563" }}>
                    <strong>{fromNode}</strong> → <strong>{toNode}</strong>: {conn.relationship}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Component Details Panel */}
      {activeComponent && (
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

          <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 800, color: "#18181b" }}>
            {activeComponent.name}
          </h3>
          <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#4b5563", lineHeight: 1.4 }}>
            {activeComponent.description || "Core repository module."}
          </p>

          {activeComponent.files && activeComponent.files.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                Files in this module:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {activeComponent.files.slice(0, 6).map((file, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: "2px 6px",
                      backgroundColor: "#f3f4f6",
                      borderRadius: "4px",
                      fontSize: "10.5px",
                      fontFamily: "ui-monospace, monospace",
                      color: "#18181b",
                    }}
                  >
                    {file}
                  </span>
                ))}
              </div>
            </div>
          )}

          <a
            href={`${repoUrl}/tree/${liveRepo?.metadata.defaultBranch || "main"}/${activeComponent.name}`}
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
            <span>View {activeComponent.name} on GitHub</span>
          </a>
        </div>
      )}
    </div>
  );
}

/* =========================================================================================
 * SCREEN 04 — SETUP & TESTING GUIDE
 * ========================================================================================= */
function SetupTestingContent({
  repoName,
  repoOwner,
  repoUrl,
  architectureData,
  liveRepo,
  copiedKey,
  onCopy,
}: {
  repoName: string;
  repoOwner: string;
  repoUrl: string;
  architectureData?: ArchitectureBundle | null;
  liveRepo?: LiveRepoSnapshot | null;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const fileNames = (liveRepo?.topFiles || []).map((f) => f.name.toLowerCase());
  const techNames = (architectureData?.technologies || []).map((t) => t.name.toLowerCase());

  const hasPython =
    fileNames.some((f) => f.endsWith(".py") || f === "requirements.txt" || f === "pyproject.toml") ||
    techNames.includes("python");
  const hasRust = fileNames.includes("cargo.toml") || techNames.includes("rust");
  const hasGo = fileNames.includes("go.mod") || techNames.includes("go");

  const cloneCmd = `git clone ${repoUrl}.git`;
  const installCmd = hasPython
    ? fileNames.includes("poetry.lock")
      ? "poetry install"
      : "pip install -r requirements.txt"
    : hasRust
    ? "cargo build"
    : hasGo
    ? "go mod download"
    : "npm install";

  const testCmd = hasPython ? "pytest" : hasRust ? "cargo test" : hasGo ? "go test ./..." : "npm test";

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
        Follow the setup guide to run and test {repoName} locally.
      </p>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
        {/* Step 1: Clone */}
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
            <div style={{ fontWeight: 800, fontSize: "13px", color: "#18181b", marginBottom: "4px" }}>
              Clone repository
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
                overflowX: "auto",
              }}
            >
              <code>{cloneCmd}</code>
              <button
                type="button"
                onClick={() => onCopy(cloneCmd, "step1")}
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
                {copiedKey === "step1" ? "✓" : <CopyIcon />}
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Install */}
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
              Install dependencies
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
                overflowX: "auto",
              }}
            >
              <code>{installCmd}</code>
              <button
                type="button"
                onClick={() => onCopy(installCmd, "step2")}
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

        {/* Step 3: Run Tests */}
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
              Run test suite
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
                overflowX: "auto",
              }}
            >
              <code>{testCmd}</code>
              <button
                type="button"
                onClick={() => onCopy(testCmd, "step3")}
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
      </div>

      <div style={{ textAlign: "right", marginTop: "16px" }}>
        <a
          href={`${repoUrl}#readme`}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb", textDecoration: "none" }}
        >
          Open full README on GitHub ↗
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
  repoOwner,
  repoUrl,
  liveRepo,
  activeIssue,
  onSelectIssue,
  checklist,
  onToggleChecklist,
  onOpenAiMentor,
}: {
  repoName: string;
  repoOwner: string;
  repoUrl: string;
  liveRepo?: LiveRepoSnapshot | null;
  activeIssue: number | null;
  onSelectIssue: (issue: number) => void;
  checklist: { context: boolean; files: boolean; tests: boolean; pr: boolean };
  onToggleChecklist: (key: string) => void;
  onOpenAiMentor: () => void;
}) {
  const issues = liveRepo?.openIssues || [];
  const selected = issues.find((i) => i.number === activeIssue) || issues[0] || null;

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
        Find real open issues on GitHub and prepare your contribution plan.
      </p>

      {/* Issues list */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "10.5px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
          LIVE OPEN ISSUES
        </div>

        {issues.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {issues.map((issue) => {
              const isSelected = (selected?.number || activeIssue) === issue.number;
              return (
                <div
                  key={issue.number}
                  onClick={() => onSelectIssue(issue.number)}
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
                      #{issue.number}
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
                  <div style={{ fontWeight: 700, fontSize: "12.5px", color: "#18181b", marginBottom: "4px" }}>
                    {issue.title}
                  </div>
                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: "11px", color: "#2563eb", textDecoration: "underline" }}
                  >
                    View issue on GitHub ↗
                  </a>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: "14px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            No open issues currently reported, or fetching from GitHub.
            <div style={{ marginTop: "6px" }}>
              <a
                href={`${repoUrl}/issues`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#2563eb", fontWeight: 700, textDecoration: "underline" }}
              >
                Browse all issues on GitHub ↗
              </a>
            </div>
          </div>
        )}
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
            <span>Read issue details and understand context</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input type="checkbox" checked={checklist.files} onChange={() => onToggleChecklist("files")} />
            <span>Explore relevant codebase files</span>
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
        onClick={onOpenAiMentor}
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
        Ask AI Mentor about contributing →
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
      id: "welcome",
      sender: "ai",
      text: `Hello! I am your DevMinds AI Mentor for ${repoName}. Ask me anything about this repository's structure, files, setup, or contribution guidelines.`,
      sources: [],
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const suggestions = [
    `Explain the overall architecture of ${repoName}.`,
    `Which key files and entry points should I inspect first?`,
    `How do I run tests and set up this codebase locally?`,
  ];

  const handleSend = async (textToSend?: string) => {
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

    try {
      const res = await postChat(repoOwner, repoName, text);
      const sourcesList = (res.sources || []).map((s) => s.title || s.url || String(s));
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: res.answer || (res.error ? res.error.message : "I could not find an answer in the repository context."),
        sources: sourcesList,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: err?.message
          ? `AI Mentor: ${err.message}`
          : "Unable to reach the AI chat backend. Make sure the backend server is running.",
        sources: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: "450px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ marginBottom: "12px" }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "19px", fontWeight: 800, color: "#111827" }}>
          AI Mentor
        </h1>
        <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
          Ask questions grounded in {repoName}'s real source code and files.
        </p>
      </div>

      {/* Suggested chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
        {suggestions.map((sug, i) => (
          <button
            key={i}
            type="button"
            onClick={() => void handleSend(sug)}
            style={{
              padding: "5px 9px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "14px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#18181b",
              boxShadow: "1px 1px 0px #000000",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          paddingRight: "4px",
          marginBottom: "14px",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
              padding: "10px 12px",
              backgroundColor: msg.sender === "user" ? "#fef3c7" : "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "8px",
              boxShadow: "1.5px 1.5px 0px #000000",
              fontSize: "12.5px",
              lineHeight: 1.45,
            }}
          >
            <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
            {msg.sources && msg.sources.length > 0 && (
              <div
                style={{
                  marginTop: "8px",
                  paddingTop: "6px",
                  borderTop: "1px dashed #d1c7b7",
                  fontSize: "10.5px",
                  color: "#6b7280",
                }}
              >
                <strong>Sources:</strong> {msg.sources.join(", ")}
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "8px 12px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#6b7280",
              fontStyle: "italic",
            }}
          >
            AI Mentor is thinking...
          </div>
        )}
      </div>

      {/* Prompt Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        style={{ display: "flex", gap: "6px" }}
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={`Ask about ${repoName}...`}
          style={{
            flex: 1,
            padding: "9px 12px",
            border: "1.5px solid #27272a",
            borderRadius: "6px",
            fontSize: "12.5px",
            outline: "none",
            backgroundColor: "#ffffff",
          }}
        />
        <button
          type="submit"
          disabled={!inputVal.trim() || isTyping}
          style={{
            padding: "9px 14px",
            backgroundColor: inputVal.trim() ? "#f79f24" : "#e5e7eb",
            color: inputVal.trim() ? "#000000" : "#9ca3af",
            border: "1.5px solid #000000",
            borderRadius: "6px",
            fontWeight: 800,
            fontSize: "12px",
            cursor: inputVal.trim() ? "pointer" : "default",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
