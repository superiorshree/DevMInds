/**
 * File:        extension/src/components/OpenSourceExpandedView.tsx
 * Purpose:     Screen 02 to 05 — Full-size expanded feature views:
 *              - Overview: live description, detected languages, real repo structure
 *              - Architecture: dynamic component flow derived from live repo directories & files
 *              - Setup & Testing: prerequisites, real installation and test commands from README/manifests
 *              - Contributions: real GitHub open issues, labels, and contribution checklist
 *              - Ask AI / AI Mentor: grounded in real repository metadata, files, and README
 */

import React, { useEffect, useState } from "react";
import type { RepoRef } from "../services/repoDetector";
import {
  getLiveRepoBundle,
  type LiveRepoBundle,
  type ArchitectureNode,
  type GitHubIssue,
  RateLimitError,
} from "../services/githubApi";
import { postChat } from "../services/api";

export type ExpandedTab = "overview" | "architecture" | "setup" | "contributions" | "ai_mentor";

export interface OpenSourceExpandedViewProps {
  repo: RepoRef;
  activeTab: ExpandedTab;
  onTabChange: (tab: ExpandedTab) => void;
  onClose: () => void;
  onOpenAiMentor?: () => void;
}

function OctocatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017C2 16.446 4.87 20.198 8.84 21.523C9.34 21.616 9.52 21.306 9.52 21.042C9.52 20.806 9.51 20.007 9.51 19.167C6.73 19.771 6.14 17.828 6.14 17.828C5.68 16.671 5.03 16.362 5.03 16.362C4.12 15.742 5.1 15.755 5.1 15.755C6.1 15.827 6.63 16.786 6.63 16.786C7.52 18.318 8.97 17.876 9.54 17.62C9.63 16.974 9.89 16.531 10.17 16.279C7.95 16.027 5.62 15.166 5.62 11.332C5.62 10.239 6.01 9.348 6.66 8.649C6.55 8.398 6.21 7.378 6.76 6.002C6.76 6.002 7.6 5.733 9.51 7.027C10.31 6.804 11.16 6.693 12 6.689C12.84 6.693 13.69 6.804 14.49 7.027C16.4 5.733 17.24 6.002 17.24 6.002C17.79 7.378 17.45 8.398 17.34 8.649C17.99 9.348 18.38 10.239 18.38 11.332C18.38 15.176 16.04 16.024 13.82 16.271C14.18 16.582 14.5 17.2 14.5 18.156C14.5 19.525 14.49 20.627 14.49 20.963C14.49 21.229 14.67 21.545 15.18 21.444C19.14 20.111 22 16.416 22 12.017C22 6.484 17.522 2 12 2Z"
        fill="#18181b"
      />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
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
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
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
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z" />
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
  onTabChange,
  onClose,
}: OpenSourceExpandedViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeIssueId, setActiveIssueId] = useState<number | null>(null);
  const [checklist, setChecklist] = useState({
    context: true,
    files: false,
    tests: false,
    pr: false,
  });

  const [bundle, setBundle] = useState<LiveRepoBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const repoName = bundle?.details.name || repo.repo;
  const repoOwner = bundle?.details.owner || repo.owner;
  const repoUrl = bundle?.details.html_url || `https://github.com/${repo.owner}/${repo.repo}`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getLiveRepoBundle(repo.owner, repo.repo)
      .then((data) => {
        if (!active) return;
        setBundle(data);
        if (data.architectureNodes.length > 0) {
          setSelectedNodeId(data.architectureNodes[0].id);
        }
        if (data.issues.length > 0) {
          setActiveIssueId(data.issues[0].number);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof RateLimitError) {
          setError(`GitHub API rate limit reached. Limit will reset at ${err.resetTime}.`);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load repository data from GitHub");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [repo.owner, repo.repo, retryCount]);

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
              Live GitHub Data
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
            {bundle && bundle.details.stargazers_count > 0 && (
              <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                ★ {bundle.details.stargazers_count.toLocaleString()}
              </span>
            )}
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

        {/* Navigation Tabs Bar */}
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
        {/* Error Alert with Honest Notification */}
        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: "#fef2f2",
              border: "1.5px solid #ef4444",
              borderRadius: "8px",
              padding: "12px 14px",
              marginBottom: "16px",
              boxShadow: "2px 2px 0px #ef4444",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "13px", color: "#991b1b", marginBottom: "4px" }}>
              Unable to load repository data
            </div>
            <div style={{ fontSize: "12px", color: "#b91c1c", marginBottom: "8px", lineHeight: 1.4 }}>
              {error}
            </div>
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              style={{
                padding: "5px 12px",
                backgroundColor: "#ffffff",
                color: "#18181b",
                border: "1.5px solid #18181b",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "#6b7280" }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#18181b", marginBottom: "6px" }}>
              Fetching live repository details from GitHub…
            </div>
            <div style={{ fontSize: "12.5px" }}>Loading structure, languages, README, and issues.</div>
          </div>
        ) : bundle ? (
          <>
            {activeTab === "overview" && (
              <OverviewContent
                bundle={bundle}
                repoName={repoName}
                repoUrl={repoUrl}
                onNavigate={onTabChange}
              />
            )}

            {activeTab === "architecture" && (
              <ArchitectureContent
                bundle={bundle}
                repoName={repoName}
                repoUrl={repoUrl}
                selectedNodeId={selectedNodeId}
                onSelectNodeId={setSelectedNodeId}
              />
            )}

            {activeTab === "setup" && (
              <SetupTestingContent
                bundle={bundle}
                repoName={repoName}
                repoUrl={repoUrl}
                copiedKey={copiedKey}
                onCopy={copyToClipboard}
              />
            )}

            {activeTab === "contributions" && (
              <ContributionsContent
                bundle={bundle}
                repoName={repoName}
                activeIssueId={activeIssueId}
                onSelectIssue={setActiveIssueId}
                checklist={checklist}
                onToggleChecklist={(key) =>
                  setChecklist((prev) => ({ ...prev, [key]: !prev[key as keyof typeof checklist] }))
                }
              />
            )}

            {activeTab === "ai_mentor" && (
              <AiMentorContent bundle={bundle} repoName={repoName} repoOwner={repoOwner} />
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

/* =========================================================================================
 * SCREEN 02 — REPOSITORY OVERVIEW (LIVE GITHUB DATA)
 * ========================================================================================= */
function OverviewContent({
  bundle,
  repoName,
  repoUrl,
  onNavigate,
}: {
  bundle: LiveRepoBundle;
  repoName: string;
  repoUrl: string;
  onNavigate: (tab: ExpandedTab) => void;
}) {
  const summary =
    bundle.details.description ||
    (bundle.readmeMarkdown
      ? bundle.readmeMarkdown
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("![") && !l.startsWith("<"))[0] ||
        "No description provided for this repository."
      : "No description provided for this repository.");

  const dirs = bundle.contents.filter((c) => c.type === "dir");
  const files = bundle.contents.filter((c) => c.type === "file");

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
          <span>Live repository verified</span>
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
          {bundle.topLanguages.length > 0 ? (
            bundle.topLanguages.map((tech) => (
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
            ))
          ) : (
            <span style={{ fontSize: "12px", color: "#6b7280" }}>No language statistics returned by GitHub.</span>
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
          PROJECT STRUCTURE ({bundle.contents.length} root items)
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {dirs.map((dir) => (
            <div
              key={dir.path}
              style={{
                padding: "10px 12px",
                backgroundColor: "#ffffff",
                border: "1.5px solid #27272a",
                borderRadius: "8px",
                boxShadow: "1.5px 1.5px 0px #000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ color: "#f59e0b" }}><FolderIcon /></div>
                <div style={{ fontWeight: 800, fontSize: "13px", color: "#18181b" }}>
                  {dir.name}/
                </div>
              </div>
              <a
                href={dir.html_url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: "11px", color: "#2563eb", textDecoration: "none", fontWeight: 600 }}
              >
                View on GitHub ↗
              </a>
            </div>
          ))}

          {files.slice(0, 8).map((file) => (
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
                justifyContent: "space-between",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ color: "#6b7280" }}><DocIcon /></div>
                <div style={{ fontWeight: 600, fontSize: "12.5px", color: "#18181b" }}>
                  {file.name}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {file.size > 0 && (
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                )}
                <a
                  href={file.html_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "11px", color: "#2563eb", textDecoration: "none", fontWeight: 600 }}
                >
                  View ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Navigation Buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="button"
          onClick={() => onNavigate("architecture")}
          style={{
            flex: 1,
            padding: "10px 14px",
            backgroundColor: "#ffffff",
            border: "1.5px solid #27272a",
            borderRadius: "8px",
            boxShadow: "2px 2px 0px #000000",
            fontWeight: 800,
            fontSize: "12.5px",
            cursor: "pointer",
          }}
        >
          Explore Architecture →
        </button>
        <button
          type="button"
          onClick={() => onNavigate("setup")}
          style={{
            flex: 1,
            padding: "10px 14px",
            backgroundColor: "#f79f24",
            border: "2px solid #000000",
            borderRadius: "8px",
            boxShadow: "2px 2px 0px #000000",
            fontWeight: 800,
            fontSize: "12.5px",
            cursor: "pointer",
          }}
        >
          Setup & Testing →
        </button>
      </div>
    </div>
  );
}

/* =========================================================================================
 * SCREEN 03 — ARCHITECTURE EXPLORER (DERIVED FROM REAL REPO TREE)
 * ========================================================================================= */
function ArchitectureContent({
  bundle,
  repoName,
  repoUrl,
  selectedNodeId,
  onSelectNodeId,
}: {
  bundle: LiveRepoBundle;
  repoName: string;
  repoUrl: string;
  selectedNodeId: string | null;
  onSelectNodeId: (nodeId: string) => void;
}) {
  const nodes = bundle.architectureNodes;
  const activeNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

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
        Live component structure and modules detected in {repoName}.
      </p>

      {/* Component Diagram */}
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
          Detected Repository Modules ({nodes.length} Components)
        </div>

        {nodes.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {nodes.map((node) => {
              const isSelected = activeNode?.id === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => onSelectNodeId(node.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 12px",
                    backgroundColor: isSelected ? "#fef3c7" : "#ffffff",
                    border: isSelected ? "2px solid #000000" : "1.5px solid #d1d5db",
                    borderRadius: "6px",
                    cursor: "pointer",
                    boxShadow: isSelected ? "2px 2px 0px #000000" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ color: node.type === "directory" ? "#f59e0b" : "#6b7280" }}>
                      {node.type === "directory" ? <FolderIcon /> : <DocIcon />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "12.5px", color: "#18181b" }}>
                        {node.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280" }}>
                        {node.description}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "2px 6px",
                      backgroundColor: node.type === "directory" ? "#e0f2fe" : "#f3f4f6",
                      color: node.type === "directory" ? "#0369a1" : "#4b5563",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {node.type}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: "12px", color: "#6b7280" }}>No modules detected in root.</div>
        )}
      </div>

      {/* Selected Node Details Card */}
      {activeNode && (
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#111827" }}>
              {activeNode.name}
            </h3>
            <a
              href={`https://github.com/${bundle.details.owner}/${bundle.details.name}/tree/${bundle.details.default_branch}/${activeNode.path}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "11.5px", color: "#2563eb", textDecoration: "none", fontWeight: 600 }}
            >
              Inspect on GitHub ↗
            </a>
          </div>
          <p style={{ margin: "0 0 10px 0", fontSize: "12.5px", color: "#4b5563", lineHeight: 1.45 }}>
            {activeNode.description}
          </p>
          <div style={{ fontSize: "11.5px", color: "#6b7280" }}>
            Path: <code style={{ backgroundColor: "#f3f4f6", padding: "2px 5px", borderRadius: "3px" }}>{activeNode.path}</code>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================================
 * SCREEN 04 — SETUP & TESTING GUIDE (DERIVED FROM REAL README & MANIFESTS)
 * ========================================================================================= */
function SetupTestingContent({
  bundle,
  repoName,
  repoUrl,
  copiedKey,
  onCopy,
}: {
  bundle: LiveRepoBundle;
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
        Live prerequisites, setup instructions, and test commands extracted for this repository.
      </p>

      {/* Prerequisites */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1.5px solid #27272a",
          borderRadius: "8px",
          padding: "12px 14px",
          marginBottom: "16px",
          boxShadow: "1.5px 1.5px 0px #000000",
        }}
      >
        <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>
          Prerequisites
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {bundle.prerequisites.map((req) => (
            <span
              key={req}
              style={{
                padding: "3px 8px",
                backgroundColor: "#f3f4f6",
                borderRadius: "4px",
                fontSize: "11.5px",
                fontWeight: 600,
                color: "#18181b",
              }}
            >
              • {req}
            </span>
          ))}
        </div>
      </div>

      {/* Setup Steps */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "10px" }}>
          Installation & Setup Commands
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {bundle.setupSteps.map((cmd, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#ffffff",
                border: "1.5px solid #27272a",
                borderRadius: "8px",
                boxShadow: "1.5px 1.5px 0px #000000",
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "#f79f24",
                    color: "#000000",
                    fontWeight: 800,
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                <code
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "12px",
                    color: "#18181b",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {cmd}
                </code>
              </div>
              <button
                type="button"
                onClick={() => onCopy(cmd, `step-${idx}`)}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #27272a",
                  borderRadius: "4px",
                  backgroundColor: copiedKey === `step-${idx}` ? "#dcfce7" : "#ffffff",
                  color: copiedKey === `step-${idx}` ? "#166534" : "#18181b",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <CopyIcon />
                <span>{copiedKey === `step-${idx}` ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Test Commands */}
      <div>
        <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "10px" }}>
          Test Suite Execution
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {bundle.testCommands.map((testCmd, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#ffffff",
                border: "1.5px solid #27272a",
                borderRadius: "8px",
                boxShadow: "1.5px 1.5px 0px #000000",
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <code
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "12px",
                  color: "#18181b",
                }}
              >
                {testCmd}
              </code>
              <button
                type="button"
                onClick={() => onCopy(testCmd, `test-${idx}`)}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #27272a",
                  borderRadius: "4px",
                  backgroundColor: copiedKey === `test-${idx}` ? "#dcfce7" : "#ffffff",
                  color: copiedKey === `test-${idx}` ? "#166534" : "#18181b",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <CopyIcon />
                <span>{copiedKey === `test-${idx}` ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
 * SCREEN 05 — CONTRIBUTIONS ASSISTANT (REAL GITHUB ISSUES)
 * ========================================================================================= */
function ContributionsContent({
  bundle,
  repoName,
  activeIssueId,
  onSelectIssue,
  checklist,
  onToggleChecklist,
}: {
  bundle: LiveRepoBundle;
  repoName: string;
  activeIssueId: number | null;
  onSelectIssue: (issueNum: number) => void;
  checklist: { context: boolean; files: boolean; tests: boolean; pr: boolean };
  onToggleChecklist: (key: string) => void;
}) {
  const issues = bundle.issues;
  const activeIssue = issues.find((i) => i.number === activeIssueId) || issues[0];

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
        Live open issues fetched directly from GitHub for {repoName}.
      </p>

      {/* Issues list */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "10.5px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
          OPEN ISSUES ({issues.length} Found)
        </div>

        {issues.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {issues.map((issue) => {
              const isSelected = activeIssue?.number === issue.number;
              return (
                <div
                  key={issue.id}
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
                    <a
                      href={issue.html_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: "2px 6px",
                        backgroundColor: "#dcfce7",
                        color: "#15803d",
                        borderRadius: "10px",
                        fontSize: "10px",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      ● Open on GitHub ↗
                    </a>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "12.5px", color: "#18181b", marginBottom: "4px" }}>
                    {issue.title}
                  </div>
                  {issue.labels.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {issue.labels.map((lbl, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: "1px 6px",
                            backgroundColor: lbl.color ? `#${lbl.color}20` : "#f3f4f6",
                            border: `1px solid ${lbl.color ? `#${lbl.color}` : "#d1d5db"}`,
                            borderRadius: "10px",
                            fontSize: "10px",
                            color: "#18181b",
                            fontWeight: 600,
                          }}
                        >
                          {lbl.name}
                        </span>
                      ))}
                    </div>
                  )}
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
              fontSize: "12.5px",
              color: "#6b7280",
            }}
          >
            No open issues currently found on GitHub for this repository.
          </div>
        )}
      </div>

      {/* Contribution Checklist */}
      <div
        style={{
          padding: "14px",
          backgroundColor: "#ffffff",
          border: "1.5px solid #27272a",
          borderRadius: "8px",
          boxShadow: "2px 2px 0px #000000",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: "13px", color: "#18181b", marginBottom: "8px" }}>
          Contribution Checklist {activeIssue ? `for #${activeIssue.number}` : ""}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[
            { key: "context", text: "Read issue description and comments on GitHub" },
            { key: "files", text: "Locate relevant source files and tests in the repository" },
            { key: "tests", text: "Run automated tests locally and verify passing suite" },
            { key: "pr", text: "Create feature branch and open Pull Request" },
          ].map((item) => {
            const isChecked = checklist[item.key as keyof typeof checklist];
            return (
              <label
                key={item.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: "#374151",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleChecklist(item.key)}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ textDecoration: isChecked ? "line-through" : "none" }}>
                  {item.text}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
 * SCREEN 06 — AI MENTOR (GROUNDED IN LIVE REPO CONTEXT)
 * ========================================================================================= */
function AiMentorContent({
  bundle,
  repoName,
  repoOwner,
}: {
  bundle: LiveRepoBundle;
  repoName: string;
  repoOwner: string;
}) {
  const [messages, setMessages] = useState<
    Array<{ id: string; sender: "user" | "ai"; text: string; sources?: string[] }>
  >([
    {
      id: "welcome",
      sender: "ai",
      text: `Hello! I'm your DevMinds mentor for ${repoOwner}/${repoName}. I have examined the live repository files, languages (${bundle.topLanguages.join(", ")}), and setup instructions. What would you like to understand?`,
      sources: bundle.contents.slice(0, 3).map((c) => c.name),
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const suggestions = [
    `What technologies power ${repoName}?`,
    `Where are the main entry points or source files?`,
    `How do I run and test this project?`,
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: "user" as const,
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsTyping(true);

    try {
      // First attempt real backend AI chat
      const chatRes = await postChat(repoOwner, repoName, text);
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: "ai" as const,
        text: chatRes.answer,
        sources: chatRes.sources.map((s) => s.title),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      // Offline fallback: Answer strictly grounded in live repository bundle
      let answer = `Regarding ${repoName}: the project is built primarily using ${bundle.topLanguages.join(", ") || "the files in the repository"}.`;
      let sources = bundle.contents.slice(0, 2).map((c) => c.name);

      const textLower = text.toLowerCase();
      if (textLower.includes("tech") || textLower.includes("language") || textLower.includes("stack")) {
        answer = `Based on live GitHub data, ${repoName} is developed in: ${Object.entries(bundle.languages)
          .map(([lang, bytes]) => `${lang} (${Math.round(bytes / 1024)} KB)`)
          .join(", ") || bundle.topLanguages.join(", ")}.`;
        sources = bundle.contents.filter((c) => c.type === "file").slice(0, 3).map((c) => c.name);
      } else if (textLower.includes("run") || textLower.includes("setup") || textLower.includes("test")) {
        answer = `To get started with ${repoName}, the detected setup steps are:\n${bundle.setupSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nTo run tests:\n${bundle.testCommands.join("\n")}`;
        sources = ["README.md"];
      } else if (textLower.includes("entry") || textLower.includes("source") || textLower.includes("where") || textLower.includes("file")) {
        const keyDirs = bundle.contents.filter((c) => c.type === "dir").map((c) => c.name);
        const keyFiles = bundle.contents.filter((c) => c.type === "file").map((c) => c.name);
        answer = `The root directory of ${repoName} contains directories: [${keyDirs.join(", ")}] and key files: [${keyFiles.slice(0, 6).join(", ")}]. Check the main directories for application logic.`;
        sources = keyFiles.slice(0, 3);
      }

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: "ai" as const,
        text: answer,
        sources,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "450px" }}>
      <h1 style={{ margin: "0 0 4px 0", fontSize: "19px", fontWeight: 800, color: "#111827" }}>
        AI Mentor — {repoName}
      </h1>
      <p style={{ margin: "0 0 14px 0", fontSize: "12.5px", color: "#4b5563" }}>
        Ask any questions grounded in the live repository structure and README.
      </p>

      {/* Suggested question chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
        {suggestions.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(chip)}
            style={{
              padding: "5px 10px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "16px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#18181b",
              cursor: "pointer",
              boxShadow: "1.5px 1.5px 0px #000000",
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              backgroundColor: msg.sender === "user" ? "#fef3c7" : "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "10px",
              boxShadow: "2px 2px 0px #000000",
              padding: "10px 12px",
            }}
          >
            <div style={{ fontSize: "12.5px", color: "#18181b", lineHeight: 1.45, whiteSpace: "pre-line" }}>
              {msg.text}
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {msg.sources.map((s, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: "10px",
                      backgroundColor: "#f3f4f6",
                      padding: "1px 5px",
                      borderRadius: "3px",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    📄 {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div style={{ fontSize: "12px", color: "#6b7280", fontStyle: "italic" }}>
            AI Mentor is typing…
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: "6px" }}>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder={`Ask anything about ${repoName}…`}
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1.5px solid #27272a",
            borderRadius: "6px",
            fontSize: "12.5px",
          }}
        />
        <button
          type="button"
          onClick={() => handleSend()}
          style={{
            padding: "8px 14px",
            backgroundColor: "#f79f24",
            border: "2px solid #000000",
            borderRadius: "6px",
            boxShadow: "2px 2px 0px #000000",
            fontWeight: 800,
            fontSize: "12.5px",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

