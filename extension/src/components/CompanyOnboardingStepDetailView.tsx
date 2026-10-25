/**
 * File:        extension/src/components/CompanyOnboardingStepDetailView.tsx
 * Purpose:     Displays the 8 bespoke onboarding step detail screens for Company Employees:
 *              Screen 01: Repository Overview
 *              Screen 02: Architecture Explorer
 *              Screen 03: Code Flow Explorer
 *              Screen 04: Important Code Finder
 *              Screen 05: Dependencies & Impact
 *              Screen 06: Setup & Testing Guide
 *              Screen 07: Available Engineering Work
 *              Screen 08: Your Onboarding Guide
 */

import React, { useState } from "react";
import type { SessionUser } from "../services/api";
import type { ArchitectureBundle } from "../types/architecture";
import type { LiveRepoSnapshot } from "../services/githubApi";

export interface CompanyOnboardingStepDetailViewProps {
  step: number; // 1 to 8
  repo: { owner?: string; repo?: string };
  user: SessionUser | null;
  architectureData?: ArchitectureBundle | null;
  liveRepo?: LiveRepoSnapshot | null;
  companyContext?: { items: any[]; errors: any[] } | null;
  completedSteps: number[];
  onToggleComplete: (step: number) => void;
  onNavigateStep: (step: number) => void;
  onBackToRoadmap: () => void;
  onOpenAiMentor: () => void;
  onSignOut?: () => void;
  onChangeMode?: () => void;
  onOpenSettings?: () => void;
}

export function CompanyOnboardingStepDetailView({
  step,
  repo,
  user,
  architectureData,
  liveRepo,
  companyContext,
  completedSteps,
  onToggleComplete,
  onNavigateStep,
  onBackToRoadmap,
  onOpenAiMentor,
  onSignOut,
  onChangeMode,
  onOpenSettings,
}: CompanyOnboardingStepDetailViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const repoName = repo.repo || liveRepo?.metadata?.repo || "repository";
  const repoOwner = repo.owner || liveRepo?.metadata?.owner || "org";
  const initial = user?.github_login ? user.github_login.charAt(0).toUpperCase() : "P";

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
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 16px",
          borderBottom: "1.5px solid #27272a",
          backgroundColor: "#faf7f2",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        {/* Back Arrow + Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={onBackToRoadmap}
            title="Back to Roadmap"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#18181b",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div
            style={{
              width: "24px",
              height: "24px",
              backgroundColor: "#18181b",
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f59e0b",
              fontFamily: "ui-monospace, monospace",
              fontWeight: 800,
              fontSize: "11.5px",
            }}
          >
            &gt;_
          </div>
          <span style={{ fontWeight: 800, fontSize: "16px", color: "#18181b" }}>DevMinds</span>
        </div>

        {/* Company Employee pill badge */}
        <div
          onClick={onChangeMode}
          title="Switch experience mode"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 10px",
            backgroundColor: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: "16px",
            color: "#92400e",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            cursor: onChangeMode ? "pointer" : "default",
          }}
        >
          COMPANY EMPLOYEE
        </div>

        {/* Avatar + Menu */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
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
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                backgroundColor: "#18181b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "11px",
              }}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.github_login}
                  width={26}
                  height={26}
                  style={{ borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                initial
              )}
            </div>
            <span style={{ fontSize: "10px", color: "#18181b" }}>▼</span>
          </button>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "34px",
                right: 0,
                backgroundColor: "#ffffff",
                border: "1.5px solid #27272a",
                borderRadius: "8px",
                boxShadow: "3px 3px 0px #000000",
                width: "160px",
                zIndex: 50,
                padding: "6px",
              }}
            >
              {user && (
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "#6b7280",
                    padding: "4px 8px",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  @{user.github_login}
                </div>
              )}
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSettings();
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 8px",
                    border: "none",
                    background: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "#18181b",
                  }}
                >
                  Settings &amp; Privacy
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
                    padding: "6px 8px",
                    border: "none",
                    background: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "#dc2626",
                  }}
                >
                  Sign Out
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "16px 16px 80px", maxWidth: "100%", boxSizing: "border-box" }}>
        {step === 1 && (
          <Step1RepositoryOverview
            repoOwner={repoOwner}
            repoName={repoName}
            liveRepo={liveRepo}
            architectureData={architectureData}
            isCompleted={completedSteps.includes(1)}
            onToggleComplete={() => onToggleComplete(1)}
            onNext={() => onNavigateStep(2)}
          />
        )}

        {step === 2 && (
          <Step2ArchitectureExplorer
            architectureData={architectureData}
            liveRepo={liveRepo}
            isCompleted={completedSteps.includes(2)}
            onToggleComplete={() => onToggleComplete(2)}
            onNext={() => onNavigateStep(3)}
          />
        )}

        {step === 3 && (
          <Step3CodeFlowExplorer
            architectureData={architectureData}
            liveRepo={liveRepo}
            isCompleted={completedSteps.includes(3)}
            onToggleComplete={() => onToggleComplete(3)}
            onNext={() => onNavigateStep(4)}
          />
        )}

        {step === 4 && (
          <Step4ImportantCodeFinder
            architectureData={architectureData}
            liveRepo={liveRepo}
            isCompleted={completedSteps.includes(4)}
            onToggleComplete={() => onToggleComplete(4)}
            onNext={() => onNavigateStep(5)}
          />
        )}

        {step === 5 && (
          <Step5DependenciesImpact
            architectureData={architectureData}
            isCompleted={completedSteps.includes(5)}
            onToggleComplete={() => onToggleComplete(5)}
            onNext={() => onNavigateStep(6)}
          />
        )}

        {step === 6 && (
          <Step6SetupTestingGuide
            architectureData={architectureData}
            liveRepo={liveRepo}
            isCompleted={completedSteps.includes(6)}
            onToggleComplete={() => onToggleComplete(6)}
            onNext={() => onNavigateStep(7)}
          />
        )}

        {step === 7 && (
          <Step7AvailableEngineeringWork
            companyContext={companyContext}
            architectureData={architectureData}
            isCompleted={completedSteps.includes(7)}
            onToggleComplete={() => onToggleComplete(7)}
            onNext={() => onNavigateStep(8)}
          />
        )}

        {step === 8 && (
          <Step8YourOnboardingGuide
            repoOwner={repoOwner}
            repoName={repoName}
            liveRepo={liveRepo}
            architectureData={architectureData}
            companyContext={companyContext}
            isCompleted={completedSteps.includes(8)}
            onToggleComplete={() => onToggleComplete(8)}
            onNext={onBackToRoadmap}
          />
        )}
      </main>

      {/* Sticky Bottom Bar */}
      <footer
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "10px 16px 14px",
          backgroundColor: "#faf7f2",
          borderTop: "1.5px solid #27272a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          boxShadow: "0 -3px 8px rgba(0,0,0,0.05)",
          zIndex: 40,
        }}
      >
        <button
          type="button"
          onClick={onBackToRoadmap}
          style={{
            padding: "9px 14px",
            backgroundColor: "#ffffff",
            color: "#18181b",
            border: "1.5px solid #27272a",
            borderRadius: "6px",
            boxShadow: "1.5px 1.5px 0px #000000",
            fontWeight: 700,
            fontSize: "12.5px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span>← Back to Roadmap</span>
        </button>

        <button
          type="button"
          onClick={onOpenAiMentor}
          style={{
            padding: "9px 18px",
            backgroundColor: "#f79f24",
            color: "#18181b",
            border: "2px solid #000000",
            borderRadius: "24px",
            boxShadow: "2px 2px 0px #000000",
            fontWeight: 800,
            fontSize: "13px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span>AI Mentor</span>
        </button>
      </footer>
    </div>
  );
}

/* =========================================================================================
 * STEP 01 — REPOSITORY OVERVIEW
 * ========================================================================================= */
function Step1RepositoryOverview({
  repoOwner,
  repoName,
  liveRepo,
  architectureData,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  repoOwner: string;
  repoName: string;
  liveRepo?: LiveRepoSnapshot | null;
  architectureData?: ArchitectureBundle | null;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  const primaryLang =
    liveRepo?.metadata?.primaryLanguage ||
    architectureData?.overview?.primary_language ||
    architectureData?.technologies?.[0]?.name ||
    "Repository";
  const defaultBranch =
    liveRepo?.metadata?.defaultBranch || architectureData?.repository?.branch || "main";
  const updatedDate = architectureData?.overview?.last_updated || "Recently";
  const summaryText =
    architectureData?.overview?.summary ||
    liveRepo?.metadata?.description ||
    "No README summary available for this repository.";
  const isPrivate = false;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          [01] Get to Know the Repository
        </span>
      </div>

      <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>
        Repository Overview
      </h1>
      <p style={{ fontSize: "12.5px", color: "#6b7280", margin: "0 0 16px 0", lineHeight: 1.45 }}>
        Understand the project's purpose, owner, programming languages, technologies and verified summary.
      </p>

      {/* Main Card */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1.5px solid #27272a",
          borderRadius: "10px",
          boxShadow: "2.5px 2.5px 0px #000000",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {/* Repo Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "50%", backgroundColor: "#18181b", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017C2 16.446 4.87 20.198 8.84 21.523C9.34 21.616 9.52 21.306 9.52 21.042C9.52 20.806 9.51 20.007 9.51 19.167C6.73 19.771 6.14 17.828 6.14 17.828C5.68 16.671 5.03 16.362 5.03 16.362C4.12 15.742 5.1 15.755 5.1 15.755C6.1 15.827 6.63 16.786 6.63 16.786C7.52 18.318 8.97 17.876 9.54 17.62C9.63 16.974 9.89 16.531 10.17 16.279C7.95 16.027 5.62 15.166 5.62 11.332C5.62 10.239 6.01 9.348 6.66 8.649C6.55 8.398 6.21 7.378 6.76 6.002C6.76 6.002 7.6 5.733 9.51 7.027C10.31 6.804 11.16 6.693 12 6.689C12.84 6.693 13.69 6.804 14.49 7.027C16.4 5.733 17.24 6.002 17.24 6.002C17.79 7.378 17.45 8.398 17.34 8.649C17.99 9.348 18.38 10.239 18.38 11.332C18.38 15.176 16.04 16.024 13.82 16.271C14.18 16.582 14.5 17.2 14.5 18.156C14.5 19.525 14.49 20.627 14.49 20.963C14.49 21.229 14.67 21.545 15.18 21.444C19.14 20.111 22 16.416 22 12.017C22 6.484 17.522 2 12 2Z" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: "16px", color: "#111827" }}>
                {repoOwner} / {repoName}
              </span>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  padding: "1px 7px",
                  backgroundColor: isPrivate ? "#fef3c7" : "#dcfce7",
                  color: isPrivate ? "#92400e" : "#15803d",
                  borderRadius: "10px",
                  border: isPrivate ? "1px solid #fde68a" : "1px solid #bbf7d0",
                }}
              >
                {isPrivate ? "Private" : "Public"}
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#4b5563", marginTop: "2px" }}>
              {liveRepo?.metadata?.description || "Repository connected via GitHub API."}
            </div>
          </div>
        </div>

        {/* Badges Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", fontSize: "11.5px", color: "#4b5563" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: 600, color: "#111827" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#3b82f6" }} />
            {primaryLang}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600, color: "#111827" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            {defaultBranch}
          </span>
          <span style={{ color: "#6b7280" }}>Updated: {updatedDate}</span>
          {typeof liveRepo?.metadata?.stars === "number" && (
            <span style={{ color: "#6b7280" }}>★ {liveRepo.metadata.stars.toLocaleString()}</span>
          )}
        </div>

        {/* README Summary */}
        <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" }}>
            README / Architecture Summary
          </div>
          <div style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>
            {summaryText}
          </div>
        </div>

        {/* Two-Column: Languages & Tech Stack */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {/* Primary Languages */}
          <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "10px" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>
              Languages
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "11.5px" }}>
              {liveRepo?.languages && liveRepo.languages.length > 0 ? (
                liveRepo.languages.slice(0, 4).map((lang) => (
                  <div key={lang} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{lang}</span>
                    <span style={{ fontWeight: 700 }}>Active</span>
                  </div>
                ))
              ) : (
                <div style={{ color: "#6b7280" }}>{primaryLang}</div>
              )}
            </div>
          </div>

          {/* Tech Stack */}
          <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "10px" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>
              Technologies Detected
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11.5px", fontWeight: 600, color: "#111827" }}>
              {architectureData?.technologies && architectureData.technologies.length > 0 ? (
                architectureData.technologies.slice(0, 5).map((t) => (
                  <div key={t.name}>• {t.name} {t.category ? `(${t.category})` : ""}</div>
                ))
              ) : (
                <div style={{ color: "#6b7280" }}>• {primaryLang}</div>
              )}
            </div>
          </div>
        </div>

        {/* Important Folders & Files */}
        <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>
            Important Folders &amp; Files
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11.5px", marginBottom: "10px" }}>
            {(architectureData?.entry_points && architectureData.entry_points.length > 0 ? (
              architectureData.entry_points.slice(0, 4).map((ep) => ({
                label: ep.file.split("/").pop() || ep.file,
                desc: ep.reason.slice(0, 24),
              }))
            ) : (liveRepo?.topFiles && liveRepo.topFiles.length > 0 ? (
              liveRepo.topFiles.slice(0, 4).map((f) => ({
                label: f.name,
                desc: f.path,
              }))
            ) : [
              { label: "README.md", desc: "docs" },
              { label: defaultBranch, desc: "branch" }
            ])).map((item, idx) => (
              <div key={idx} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ fontWeight: 700, color: "#18181b" }}>{item.label}</span>
                <span style={{ color: "#6b7280", marginLeft: "4px" }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onNext}
          style={{
            width: "100%",
            padding: "12px 16px",
            backgroundColor: "#f79f24",
            color: "#18181b",
            border: "2px solid #000000",
            borderRadius: "8px",
            boxShadow: "2px 2px 0px #000000",
            fontWeight: 800,
            fontSize: "13.5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span>Continue to Step 02: Architecture Explorer →</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={onToggleComplete}
              style={{ width: "15px", height: "15px", accentColor: "#f79f24" }}
            />
            <span>Mark Step 01 as Complete</span>
          </label>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 02 — ARCHITECTURE EXPLORER
 * ========================================================================================= */
function Step2ArchitectureExplorer({
  architectureData,
  liveRepo,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  architectureData?: ArchitectureBundle | null;
  liveRepo?: LiveRepoSnapshot | null;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  const [activeSubTab, setActiveSubTab] = useState<"architecture" | "folders" | "components">("architecture");
  const components = architectureData?.components || [];
  const connections = architectureData?.connections || [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          [02] Understand the Architecture
        </span>
      </div>

      <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>
        Architecture Explorer
      </h1>
      <p style={{ fontSize: "12.5px", color: "#6b7280", margin: "0 0 16px 0", lineHeight: 1.45 }}>
        Explore components, connections between modules, folder structure and verified entry points.
      </p>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1.5px solid #27272a",
          borderRadius: "10px",
          boxShadow: "2.5px 2.5px 0px #000000",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {/* Tab switcher */}
        <div style={{ display: "flex", borderBottom: "1.5px solid #27272a" }}>
          {(["architecture", "folders", "components"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveSubTab(tab)}
              style={{
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 700,
                border: "none",
                background: activeSubTab === tab ? "#fef3c7" : "transparent",
                color: activeSubTab === tab ? "#92400e" : "#4b5563",
                borderBottom: activeSubTab === tab ? "2px solid #f59e0b" : "none",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeSubTab === "architecture" && (
          <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "10px" }}>
              System Components &amp; Topology ({components.length} identified)
            </div>
            {components.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                {components.map((comp) => (
                  <div key={comp.id} style={{ padding: "8px 14px", backgroundColor: "#ffffff", border: "1.5px solid #27272a", borderRadius: "8px", textAlign: "center", minWidth: "120px" }}>
                    <div style={{ fontWeight: 800, fontSize: "12.5px", color: "#18181b" }}>{comp.name}</div>
                    <div style={{ fontSize: "10.5px", color: "#6b7280", marginTop: "2px" }}>{comp.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "#6b7280", fontSize: "12px" }}>
                Analysis facts not loaded yet. Click Analyze Repository on the main screen to generate architecture facts.
              </div>
            )}

            {connections.length > 0 && (
              <div style={{ marginTop: "12px", borderTop: "1px solid #e5e0d8", paddingTop: "8px" }}>
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#6b7280", marginBottom: "6px" }}>DATA FLOW &amp; CONNECTIONS</div>
                {connections.map((c, idx) => (
                  <div key={idx} style={{ fontSize: "11.5px", color: "#374151", padding: "2px 0" }}>
                    <span style={{ fontWeight: 700 }}>{c.from}</span> → <span style={{ fontWeight: 700 }}>{c.to}</span> <span style={{ color: "#6b7280" }}>({c.relationship})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSubTab === "folders" && (
          <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "10px" }}>
              Important Repository Files
            </div>
            {(liveRepo?.topFiles || []).map((file) => (
              <div key={file.path} style={{ padding: "4px 0", fontSize: "12px", fontFamily: "ui-monospace, monospace", color: "#2563eb" }}>
                {file.path}
              </div>
            ))}
          </div>
        )}

        {activeSubTab === "components" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {components.map((c) => (
              <div key={c.id} style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "10px" }}>
                <div style={{ fontWeight: 800, fontSize: "13px", color: "#111827" }}>{c.name}</div>
                <div style={{ fontSize: "11.5px", color: "#4b5563", marginTop: "2px" }}>{c.description}</div>
                {c.files && c.files.length > 0 && (
                  <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {c.files.map((f) => (
                      <span key={f} style={{ padding: "2px 6px", backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "10px", fontFamily: "ui-monospace, monospace" }}>
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={onNext}
          style={{
            width: "100%",
            padding: "12px 16px",
            backgroundColor: "#f79f24",
            color: "#18181b",
            border: "2px solid #000000",
            borderRadius: "8px",
            boxShadow: "2px 2px 0px #000000",
            fontWeight: 800,
            fontSize: "13.5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span>Continue to Step 03: Code Flow Explorer →</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={onToggleComplete}
              style={{ width: "15px", height: "15px", accentColor: "#f79f24" }}
            />
            <span>Mark Step 02 as Complete</span>
          </label>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 03 — CODE FLOW EXPLORER
 * ========================================================================================= */
function Step3CodeFlowExplorer({
  architectureData,
  liveRepo,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  architectureData?: ArchitectureBundle | null;
  liveRepo?: LiveRepoSnapshot | null;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  const entryPoints = architectureData?.entry_points || [];
  const flows = entryPoints.length > 0
    ? entryPoints.map((ep, idx) => ({
        num: idx + 1,
        title: `Entry Point: ${ep.file.split("/").pop() || ep.file}`,
        target: ep.reason,
        file: ep.file,
      }))
    : (liveRepo?.topFiles && liveRepo.topFiles.length > 0 ? (
        liveRepo.topFiles.slice(0, 4).map((f, idx) => ({
          num: idx + 1,
          title: `File: ${f.name}`,
          target: "Top repository file",
          file: f.path,
        }))
      ) : [
        { num: 1, title: "Main Entry", target: "Application entry", file: "main" }
      ]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          [03] Explore an Important Code Flow
        </span>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af" }}>Step 3 of 8</span>
      </div>

      <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>
        Code Flow Explorer
      </h1>
      <p style={{ fontSize: "12.5px", color: "#6b7280", margin: "0 0 16px 0", lineHeight: 1.45 }}>
        Trace verified execution entry points and component flows across the codebase.
      </p>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1.5px solid #27272a",
          borderRadius: "10px",
          boxShadow: "2.5px 2.5px 0px #000000",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {flows.map((f) => (
            <div key={f.num} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: "#fef3c7",
                  border: "1.5px solid #f59e0b",
                  color: "#92400e",
                  fontWeight: 800,
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {f.num}
              </div>
              <div style={{ flex: 1, backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontWeight: 800, fontSize: "12.5px", color: "#111827" }}>{f.title}</div>
                <div style={{ fontSize: "11.5px", color: "#4b5563", marginTop: "2px" }}>{f.target}</div>
                <div style={{ fontSize: "10.5px", color: "#2563eb", fontFamily: "ui-monospace, monospace", marginTop: "4px" }}>{f.file}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onNext}
          style={{
            width: "100%",
            padding: "12px 16px",
            backgroundColor: "#f79f24",
            color: "#18181b",
            border: "2px solid #000000",
            borderRadius: "8px",
            boxShadow: "2px 2px 0px #000000",
            fontWeight: 800,
            fontSize: "13.5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span>Continue to Step 04: Important Code Finder →</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={onToggleComplete}
              style={{ width: "15px", height: "15px", accentColor: "#f79f24" }}
            />
            <span>Mark Step 03 as Complete</span>
          </label>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 04 — IMPORTANT CODE FINDER
 * ========================================================================================= */
function Step4ImportantCodeFinder({
  architectureData,
  liveRepo,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  architectureData?: ArchitectureBundle | null;
  liveRepo?: LiveRepoSnapshot | null;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const candidateItems = [
    ...(architectureData?.entry_points || []).map((ep) => ({
      id: ep.file,
      name: ep.file.split("/").pop() || ep.file,
      file: ep.file,
      desc: ep.reason,
    })),
    ...(architectureData?.components || []).flatMap((c) =>
      (c.files || []).map((f) => ({
        id: f,
        name: f.split("/").pop() || f,
        file: f,
        desc: `Component: ${c.name}`,
      }))
    ),
    ...(liveRepo?.topFiles || []).map((f) => ({
      id: f.path,
      name: f.name,
      file: f.path,
      desc: "Top file",
    })),
  ];

  // De-duplicate by id
  const seen = new Set<string>();
  const allItems = candidateItems.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  const filtered = allItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.file.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          [04] Locate Important Code
        </span>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af" }}>Step 4 of 8</span>
      </div>

      <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>
        Important Code Finder
      </h1>
      <p style={{ fontSize: "12.5px", color: "#6b7280", margin: "0 0 16px 0", lineHeight: 1.45 }}>
        Quickly locate key functions, files, entry points and components in this repository.
      </p>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1.5px solid #27272a",
          borderRadius: "10px",
          boxShadow: "2.5px 2.5px 0px #000000",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by file or component name..."
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1.5px solid #27272a",
            fontSize: "12.5px",
            outline: "none",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "240px", overflowY: "auto" }}>
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <div key={item.id} style={{ padding: "8px 10px", backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "6px" }}>
                <div style={{ fontWeight: 800, fontSize: "12.5px", color: "#18181b" }}>{item.name}</div>
                <div style={{ fontSize: "11px", color: "#4b5563" }}>{item.desc}</div>
                <div style={{ fontSize: "10.5px", color: "#2563eb", fontFamily: "ui-monospace, monospace" }}>{item.file}</div>
              </div>
            ))
          ) : (
            <div style={{ color: "#6b7280", fontSize: "12px", padding: "8px" }}>No matching code files found.</div>
          )}
        </div>

        <button
          type="button"
          onClick={onNext}
          style={{
            width: "100%",
            padding: "12px 16px",
            backgroundColor: "#f79f24",
            color: "#18181b",
            border: "2px solid #000000",
            borderRadius: "8px",
            boxShadow: "2px 2px 0px #000000",
            fontWeight: 800,
            fontSize: "13.5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span>Continue to Step 05: Dependencies &amp; Impact →</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={onToggleComplete}
              style={{ width: "15px", height: "15px", accentColor: "#f79f24" }}
            />
            <span>Mark Step 04 as Complete</span>
          </label>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 05 — DEPENDENCIES & IMPACT
 * ========================================================================================= */
function Step5DependenciesImpact({
  architectureData,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  architectureData?: ArchitectureBundle | null;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  const technologies = architectureData?.technologies || [];
  const connections = architectureData?.connections || [];
  const components = architectureData?.components || [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          [05] Understand Dependencies and Impact
        </span>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af" }}>Step 5 of 8</span>
      </div>

      <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>
        Dependencies &amp; Impact
      </h1>
      <p style={{ fontSize: "12.5px", color: "#6b7280", margin: "0 0 16px 0", lineHeight: 1.45 }}>
        Identify dependencies, evidence files, and caller relationships between modules.
      </p>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1.5px solid #27272a",
          borderRadius: "10px",
          boxShadow: "2.5px 2.5px 0px #000000",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {/* Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          <div style={{ backgroundColor: "#faf7f2", border: "1.5px solid #27272a", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>Connections</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", marginTop: "2px" }}>{connections.length}</div>
          </div>
          <div style={{ backgroundColor: "#faf7f2", border: "1.5px solid #27272a", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>Technologies</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", marginTop: "2px" }}>{technologies.length}</div>
          </div>
          <div style={{ backgroundColor: "#faf7f2", border: "1.5px solid #27272a", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>Components</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", marginTop: "2px" }}>{components.length}</div>
          </div>
        </div>

        {/* Technologies List */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "8px" }}>
            Analyzed Technologies &amp; Evidence Files
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {technologies.map((t) => (
              <div key={t.name} style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "6px", padding: "8px 10px" }}>
                <div style={{ fontWeight: 800, fontSize: "12px", color: "#111827" }}>
                  {t.name} {t.category ? <span style={{ color: "#6b7280", fontWeight: 500 }}>({t.category})</span> : null}
                </div>
                {t.evidence_files && t.evidence_files.length > 0 && (
                  <div style={{ fontSize: "10.5px", color: "#2563eb", fontFamily: "ui-monospace, monospace", marginTop: "2px" }}>
                    Evidence: {t.evidence_files.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onNext}
          style={{
            width: "100%",
            padding: "12px 16px",
            backgroundColor: "#f79f24",
            color: "#18181b",
            border: "2px solid #000000",
            borderRadius: "8px",
            boxShadow: "2px 2px 0px #000000",
            fontWeight: 800,
            fontSize: "13.5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span>Continue to Step 06: Setup &amp; Testing Guide →</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={onToggleComplete}
              style={{ width: "15px", height: "15px", accentColor: "#f79f24" }}
            />
            <span>Mark Step 05 as Complete</span>
          </label>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 06 — SETUP & TESTING GUIDE
 * ========================================================================================= */
function Step6SetupTestingGuide({
  architectureData,
  liveRepo,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  architectureData?: ArchitectureBundle | null;
  liveRepo?: LiveRepoSnapshot | null;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  const primaryLang =
    liveRepo?.metadata?.primaryLanguage ||
    architectureData?.overview?.primary_language ||
    "Repository";
  const setupSteps = architectureData?.contributor_guide?.setup_steps || [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          [06] Learn How to Run and Test the Project
        </span>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af" }}>Step 6 of 8</span>
      </div>

      <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>
        Setup &amp; Testing Guide
      </h1>
      <p style={{ fontSize: "12.5px", color: "#6b7280", margin: "0 0 16px 0", lineHeight: 1.45 }}>
        Instructions and environment setup for running and testing this project.
      </p>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1.5px solid #27272a",
          borderRadius: "10px",
          boxShadow: "2.5px 2.5px 0px #000000",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>
            Primary Stack
          </div>
          <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#111827" }}>
            {primaryLang}
          </div>
        </div>

        {setupSteps.length > 0 && (
          <div>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>
              Setup Steps
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {setupSteps.map((s, idx) => (
                <div key={idx} style={{ padding: "6px 10px", backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "6px", fontSize: "12px" }}>
                  <span style={{ fontWeight: 700, marginRight: "6px" }}>{idx + 1}.</span> {s}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onNext}
          style={{
            width: "100%",
            padding: "12px 16px",
            backgroundColor: "#f79f24",
            color: "#18181b",
            border: "2px solid #000000",
            borderRadius: "8px",
            boxShadow: "2px 2px 0px #000000",
            fontWeight: 800,
            fontSize: "13.5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span>Continue to Step 07: Available Engineering Work →</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={onToggleComplete}
              style={{ width: "15px", height: "15px", accentColor: "#f79f24" }}
            />
            <span>Mark Step 06 as Complete</span>
          </label>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 07 — AVAILABLE ENGINEERING WORK
 * ========================================================================================= */
function Step7AvailableEngineeringWork({
  companyContext,
  architectureData,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  companyContext?: { items: any[]; errors: any[] } | null;
  architectureData?: ArchitectureBundle | null;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  const items = companyContext?.items || [];
  const jiraItems = items.filter((i) => i.source_type === "jira");
  const confluenceItems = items.filter((i) => i.source_type === "confluence");
  const slackItems = items.filter((i) => i.source_type === "slack");
  const errors = companyContext?.errors || [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          [07] Explore Existing Pending Work
        </span>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af" }}>Step 7 of 8</span>
      </div>

      <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>
        Available Engineering Work
      </h1>
      <p style={{ fontSize: "12.5px", color: "#6b7280", margin: "0 0 16px 0", lineHeight: 1.45 }}>
        Review verified issues, specifications, and team discussions linked to this repository.
      </p>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1.5px solid #27272a",
          borderRadius: "10px",
          boxShadow: "2.5px 2.5px 0px #000000",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {errors.length > 0 && (
          <div style={{ padding: "8px 12px", backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "6px", fontSize: "11.5px", color: "#991b1b" }}>
            {errors.map((e, idx) => (
              <div key={idx}>• {e.source_type.toUpperCase()}: {e.message}</div>
            ))}
          </div>
        )}

        {/* Jira */}
        <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontWeight: 800, fontSize: "13px", color: "#111827" }}>
              Jira ({jiraItems.length} issues)
            </span>
          </div>
          {jiraItems.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {jiraItems.map((item, idx) => (
                <div key={idx} style={{ fontSize: "11.5px", padding: "4px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <a href={item.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: "#2563eb", textDecoration: "none" }}>
                    {item.title}
                  </a>
                  {item.metadata?.status && (
                    <span style={{ marginLeft: "8px", padding: "1px 6px", backgroundColor: "#fef3c7", color: "#92400e", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>
                      {item.metadata.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#6b7280", fontSize: "11.5px" }}>No linked Jira issues found for this repository.</div>
          )}
        </div>

        {/* Confluence */}
        <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontWeight: 800, fontSize: "13px", color: "#111827" }}>
              Confluence ({confluenceItems.length} pages)
            </span>
          </div>
          {confluenceItems.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {confluenceItems.map((item, idx) => (
                <div key={idx} style={{ fontSize: "11.5px" }}>
                  <a href={item.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: "#2563eb", textDecoration: "none" }}>
                    {item.title}
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#6b7280", fontSize: "11.5px" }}>No linked Confluence documentation found.</div>
          )}
        </div>

        {/* Slack */}
        <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontWeight: 800, fontSize: "13px", color: "#111827" }}>
              Slack ({slackItems.length} messages)
            </span>
          </div>
          {slackItems.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {slackItems.map((item, idx) => (
                <div key={idx} style={{ fontSize: "11.5px", color: "#374151" }}>
                  <a href={item.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: "#2563eb", textDecoration: "none", marginRight: "6px" }}>
                    {item.title}
                  </a>
                  <span>{item.content}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#6b7280", fontSize: "11.5px" }}>No relevant Slack discussions found.</div>
          )}
        </div>

        <button
          type="button"
          onClick={onNext}
          style={{
            width: "100%",
            padding: "12px 16px",
            backgroundColor: "#f79f24",
            color: "#18181b",
            border: "2px solid #000000",
            borderRadius: "8px",
            boxShadow: "2px 2px 0px #000000",
            fontWeight: 800,
            fontSize: "13.5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span>Continue to Step 08: Your Onboarding Guide →</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={onToggleComplete}
              style={{ width: "15px", height: "15px", accentColor: "#f79f24" }}
            />
            <span>Mark Step 07 as Complete</span>
          </label>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 08 — YOUR ONBOARDING GUIDE
 * ========================================================================================= */
function Step8YourOnboardingGuide({
  repoOwner,
  repoName,
  liveRepo,
  architectureData,
  companyContext,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  repoOwner: string;
  repoName: string;
  liveRepo?: LiveRepoSnapshot | null;
  architectureData?: ArchitectureBundle | null;
  companyContext?: { items: any[]; errors: any[] } | null;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  const [expandedSection, setExpandedSection] = useState<string | null>("repo_summary");

  const sections = [
    {
      id: "repo_summary",
      title: "Repository Summary",
      desc: `${repoOwner} / ${repoName} — ${liveRepo?.metadata?.description || architectureData?.overview?.summary || "Repository overview and structure."}`,
    },
    {
      id: "arch",
      title: "Architecture Overview",
      desc: architectureData?.components?.length
        ? `${architectureData.components.length} components analyzed: ${architectureData.components.map((c) => c.name).join(", ")}`
        : "System architecture and data flow.",
    },
    {
      id: "code_flow",
      title: "Important Code Flows",
      desc: architectureData?.entry_points?.length
        ? `${architectureData.entry_points.length} entry points verified.`
        : "Key execution paths and entry files.",
    },
    {
      id: "deps",
      title: "Dependencies & Caller Impact",
      desc: architectureData?.technologies?.length
        ? `${architectureData.technologies.length} technologies detected: ${architectureData.technologies.map((t) => t.name).join(", ")}`
        : "Dependencies and callers.",
    },
    {
      id: "pending_work",
      title: "Pending Work (Jira / Slack / Confluence)",
      desc: companyContext?.items?.length
        ? `${companyContext.items.length} work items linked to this repository.`
        : "Linked issues and documentation.",
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          [08] Complete Your Onboarding Guide
        </span>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af" }}>Step 8 of 8</span>
      </div>

      <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>
        Your Onboarding Guide
      </h1>
      <p style={{ fontSize: "12.5px", color: "#6b7280", margin: "0 0 16px 0", lineHeight: 1.45 }}>
        A consolidated summary with live verified facts to guide your day one development.
      </p>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1.5px solid #27272a",
          borderRadius: "10px",
          boxShadow: "2.5px 2.5px 0px #000000",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {sections.map((sec) => {
            const isExp = expandedSection === sec.id;
            return (
              <div
                key={sec.id}
                style={{
                  border: "1.5px solid #27272a",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <div
                  onClick={() => setExpandedSection(isExp ? null : sec.id)}
                  style={{
                    padding: "10px 14px",
                    backgroundColor: isExp ? "#fef3c7" : "#faf7f2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "12.5px",
                  }}
                >
                  <span>{sec.title}</span>
                  <span>{isExp ? "▲" : "▼"}</span>
                </div>
                {isExp && (
                  <div style={{ padding: "12px 14px", backgroundColor: "#ffffff", fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>
                    {sec.desc}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onNext}
          style={{
            width: "100%",
            padding: "12px 16px",
            backgroundColor: "#f79f24",
            color: "#18181b",
            border: "2px solid #000000",
            borderRadius: "8px",
            boxShadow: "2px 2px 0px #000000",
            fontWeight: 800,
            fontSize: "13.5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span>Return to Onboarding Roadmap Overview</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#374151", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={onToggleComplete}
              style={{ width: "15px", height: "15px", accentColor: "#f79f24" }}
            />
            <span>Mark Onboarding Journey Complete</span>
          </label>
        </div>
      </div>
    </div>
  );
}
