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

export interface CompanyOnboardingStepDetailViewProps {
  step: number; // 1 to 8
  repo: { owner?: string; repo?: string };
  user: SessionUser | null;
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
  const repoName = repo.repo || "payment-service";
  const repoOwner = repo.owner || "acme";
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
            isCompleted={completedSteps.includes(1)}
            onToggleComplete={() => onToggleComplete(1)}
            onNext={() => onNavigateStep(2)}
          />
        )}

        {step === 2 && (
          <Step2ArchitectureExplorer
            isCompleted={completedSteps.includes(2)}
            onToggleComplete={() => onToggleComplete(2)}
            onNext={() => onNavigateStep(3)}
          />
        )}

        {step === 3 && (
          <Step3CodeFlowExplorer
            isCompleted={completedSteps.includes(3)}
            onToggleComplete={() => onToggleComplete(3)}
            onNext={() => onNavigateStep(4)}
          />
        )}

        {step === 4 && (
          <Step4ImportantCodeFinder
            isCompleted={completedSteps.includes(4)}
            onToggleComplete={() => onToggleComplete(4)}
            onNext={() => onNavigateStep(5)}
          />
        )}

        {step === 5 && (
          <Step5DependenciesImpact
            isCompleted={completedSteps.includes(5)}
            onToggleComplete={() => onToggleComplete(5)}
            onNext={() => onNavigateStep(6)}
          />
        )}

        {step === 6 && (
          <Step6SetupTestingGuide
            isCompleted={completedSteps.includes(6)}
            onToggleComplete={() => onToggleComplete(6)}
            onNext={() => onNavigateStep(7)}
          />
        )}

        {step === 7 && (
          <Step7AvailableEngineeringWork
            isCompleted={completedSteps.includes(7)}
            onToggleComplete={() => onToggleComplete(7)}
            onNext={() => onNavigateStep(8)}
          />
        )}

        {step === 8 && (
          <Step8YourOnboardingGuide
            repoOwner={repoOwner}
            repoName={repoName}
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
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  repoOwner: string;
  repoName: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      {/* Tag */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          [01] Get to Know the Repository
        </span>
      </div>

      <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>
        Repository Overview
      </h1>
      <p style={{ fontSize: "12.5px", color: "#6b7280", margin: "0 0 16px 0", lineHeight: 1.45 }}>
        Understand the project's purpose, owner, programming languages, technologies and README summary.
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
              <span style={{ fontSize: "10.5px", fontWeight: 700, padding: "1px 7px", backgroundColor: "#dcfce7", color: "#15803d", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
                Public
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#4b5563", marginTop: "2px" }}>
              Payment processing and transaction management service.
            </div>
          </div>
        </div>

        {/* Badges Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", fontSize: "11.5px", color: "#4b5563" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: 600, color: "#111827" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#3572A5" }} />
            Python
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600, color: "#111827" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            main
          </span>
          <span style={{ color: "#6b7280" }}>Updated 3 days ago</span>
        </div>

        {/* README Summary */}
        <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" }}>
            README Summary
          </div>
          <div style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>
            This service handles payment processing, transaction management and integrates with external payment providers. It provides APIs for payment initiation, status checks and refunds.
          </div>
        </div>

        {/* Two-Column: Languages & Tech Stack */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {/* Primary Languages */}
          <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "10px" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>
              Primary Languages
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "11.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Python</span>
                <span style={{ fontWeight: 700 }}>72%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Docker</span>
                <span style={{ fontWeight: 700 }}>12%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
                <span>Other</span>
                <span style={{ fontWeight: 700 }}>16%</span>
              </div>
            </div>
          </div>

          {/* Tech Stack */}
          <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "10px" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>
              Tech Stack
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11.5px", fontWeight: 600, color: "#111827" }}>
              <div>• FastAPI</div>
              <div>• PostgreSQL</div>
              <div>• Docker</div>
              <div>• Redis</div>
            </div>
          </div>
        </div>

        {/* Important Folders & Files */}
        <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>
            Important Folders &amp; Files
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11.5px", marginBottom: "10px" }}>
            <div>
              <span style={{ fontWeight: 700, color: "#18181b" }}>src/</span>
              <span style={{ color: "#6b7280", marginLeft: "4px" }}>main code</span>
            </div>
            <div>
              <span style={{ color: "#6b7280" }}>Default branch: </span>
              <span style={{ fontWeight: 700 }}>main</span>
            </div>
            <div>
              <span style={{ fontWeight: 700, color: "#18181b" }}>tests/</span>
              <span style={{ color: "#6b7280", marginLeft: "4px" }}>test cases</span>
            </div>
            <div>
              <span style={{ color: "#6b7280" }}>Repo size: </span>
              <span style={{ fontWeight: 700 }}>12.4 MB</span>
            </div>
            <div>
              <span style={{ fontWeight: 700, color: "#18181b" }}>docs/</span>
              <span style={{ color: "#6b7280", marginLeft: "4px" }}>documentation</span>
            </div>
            <div>
              <span style={{ color: "#6b7280" }}>Total files: </span>
              <span style={{ fontWeight: 700 }}>248</span>
            </div>
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
            gap: "6px",
          }}
        >
          <span>Explore Architecture →</span>
        </button>

        {/* Mark Reviewed Checkbox */}
        <div
          onClick={onToggleComplete}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: isCompleted ? "#15803d" : "#4b5563",
            cursor: "pointer",
            fontWeight: isCompleted ? 700 : 500,
          }}
        >
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              border: isCompleted ? "none" : "1.5px solid #6b7280",
              backgroundColor: isCompleted ? "#16a34a" : "transparent",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "10px",
            }}
          >
            {isCompleted && "✓"}
          </span>
          <span>{isCompleted ? "Overview reviewed" : "Mark overview reviewed"}</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 02 — ARCHITECTURE EXPLORER
 * ========================================================================================= */
function Step2ArchitectureExplorer({
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  const [activeSubTab, setActiveSubTab] = useState<"architecture" | "folders" | "components">("architecture");

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
        Explore the folder structure, important files, entry points, components and connections between modules.
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
          <>
            {/* Visual Architecture Diagram */}
            <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "14px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                {/* Client Box */}
                <div style={{ padding: "7px 18px", backgroundColor: "#ffffff", border: "1.5px solid #27272a", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                  Client (React)
                </div>

                <div style={{ color: "#9ca3af", fontSize: "12px" }}>↓</div>

                {/* API Box (Highlighted) */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "center" }}>
                  <div style={{ padding: "6px 10px", backgroundColor: "#ffffff", border: "1.5px solid #d1d5db", borderRadius: "6px", fontSize: "11px", textAlign: "center", maxWidth: "90px" }}>
                    External Payment Provider
                  </div>
                  <div style={{ color: "#9ca3af" }}>→</div>
                  <div style={{ padding: "10px 20px", backgroundColor: "#fef3c7", border: "2px solid #f59e0b", borderRadius: "8px", fontSize: "13px", fontWeight: 800, color: "#18181b", textAlign: "center" }}>
                    API (FastAPI)
                  </div>
                  <div style={{ color: "#9ca3af" }}>→</div>
                  <div style={{ padding: "6px 10px", backgroundColor: "#ffffff", border: "1.5px solid #d1d5db", borderRadius: "6px", fontSize: "11px", textAlign: "center", maxWidth: "90px" }}>
                    Database (PostgreSQL)
                  </div>
                </div>

                <div style={{ color: "#9ca3af", fontSize: "12px" }}>↓</div>

                {/* Workers and Cache */}
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ padding: "6px 14px", backgroundColor: "#ffffff", border: "1.5px solid #27272a", borderRadius: "6px", fontSize: "11.5px", fontWeight: 700 }}>
                    Workers (Celery)
                  </div>
                  <div style={{ padding: "6px 14px", backgroundColor: "#ffffff", border: "1.5px solid #27272a", borderRadius: "6px", fontSize: "11.5px", fontWeight: 700 }}>
                    Redis (Cache)
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Component Card */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "14px" }}>⚙</span>
                <span style={{ fontWeight: 800, fontSize: "13.5px", color: "#111827" }}>
                  Selected Component: API (FastAPI)
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#4b5563", margin: "0 0 10px 0", lineHeight: 1.4 }}>
                Handles HTTP requests, business logic and integrates with external services.
              </p>

              <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "6px" }}>
                Key Files
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11.5px", marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#2563eb", fontFamily: "ui-monospace, monospace" }}>
                  <span>src/api/main.py</span>
                  <span style={{ cursor: "pointer", color: "#6b7280" }}>View ↗</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#2563eb", fontFamily: "ui-monospace, monospace" }}>
                  <span>src/api/routes.py</span>
                  <span style={{ cursor: "pointer", color: "#6b7280" }}>View ↗</span>
                </div>
              </div>

              <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "6px" }}>
                Dependencies
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["fastapi", "sqlalchemy", "pydantic"].map((d) => (
                  <span key={d} style={{ padding: "2px 8px", backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "4px", fontSize: "11px", fontFamily: "ui-monospace, monospace" }}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {activeSubTab === "folders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
            <div style={{ padding: "8px", backgroundColor: "#faf7f2", borderRadius: "6px", border: "1px solid #e5e0d8" }}>
              <strong>src/</strong> — Core backend codebase, routers, services, schemas
            </div>
            <div style={{ padding: "8px", backgroundColor: "#faf7f2", borderRadius: "6px", border: "1px solid #e5e0d8" }}>
              <strong>src/api/</strong> — FastAPI HTTP endpoints and dependency injection
            </div>
            <div style={{ padding: "8px", backgroundColor: "#faf7f2", borderRadius: "6px", border: "1px solid #e5e0d8" }}>
              <strong>tests/</strong> — Unit and integration test suites
            </div>
          </div>
        )}

        {activeSubTab === "components" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
            <div style={{ padding: "8px", backgroundColor: "#faf7f2", borderRadius: "6px", border: "1px solid #e5e0d8" }}>
              <strong>API Gateway</strong> — Routes and authenticates requests
            </div>
            <div style={{ padding: "8px", backgroundColor: "#faf7f2", borderRadius: "6px", border: "1px solid #e5e0d8" }}>
              <strong>Payment Engine</strong> — Handles Stripe transaction workflows
            </div>
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
            gap: "6px",
          }}
        >
          <span>Explore a Code Flow →</span>
        </button>

        {/* Mark Reviewed Checkbox */}
        <div
          onClick={onToggleComplete}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: isCompleted ? "#15803d" : "#4b5563",
            cursor: "pointer",
            fontWeight: isCompleted ? 700 : 500,
          }}
        >
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              border: isCompleted ? "none" : "1.5px solid #6b7280",
              backgroundColor: isCompleted ? "#16a34a" : "transparent",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "10px",
            }}
          >
            {isCompleted && "✓"}
          </span>
          <span>{isCompleted ? "Architecture explored" : "Mark architecture explored"}</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 03 — CODE FLOW EXPLORER
 * ========================================================================================= */
function Step3CodeFlowExplorer({
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  const [selectedFlow, setSelectedFlow] = useState("payment_processing");

  const flows = [
    { num: 1, title: "API Endpoint", target: "POST /payments", file: "src/api/routes.py:45-78" },
    { num: 2, title: "Service Layer", target: "process_payment()", file: "src/services/payment_service.py:120-200" },
    { num: 3, title: "Database", target: "create_transaction()", file: "src/db/transactions.py:50-90" },
    { num: 4, title: "External Provider", target: "Payment Gateway (Stripe)", file: "src/integrations/stripe.py:30-80" },
    { num: 5, title: "Response", target: "Payment created", file: "src/api/routes.py:210-220" },
  ];

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
        Trace an existing feature through relevant files, functions and data flow.
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
        {/* Flow selector dropdown */}
        <div>
          <label style={{ fontSize: "11px", fontWeight: 800, color: "#4b5563", textTransform: "uppercase", display: "block", marginBottom: "5px" }}>
            Select a flow
          </label>
          <select
            value={selectedFlow}
            onChange={(e) => setSelectedFlow(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1.5px solid #27272a",
              backgroundColor: "#ffffff",
              fontSize: "12.5px",
              fontWeight: 700,
              outline: "none",
            }}
          >
            <option value="payment_processing">Payment Processing (create payment)</option>
            <option value="webhook_ingestion">Webhook Ingestion (Stripe)</option>
            <option value="refund_flow">Refund Transaction Flow</option>
          </select>
        </div>

        {/* 5-step numbered flow list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {flows.map((f) => (
            <div key={f.num} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "#f59e0b",
                  color: "#000000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                {f.num}
              </div>
              <div style={{ flex: 1, backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "6px", padding: "7px 10px" }}>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#111827" }}>{f.title}</div>
                <div style={{ fontSize: "11.5px", fontFamily: "ui-monospace, monospace", color: "#2563eb", marginTop: "1px" }}>
                  {f.target}
                </div>
                <div style={{ fontSize: "10.5px", color: "#6b7280", marginTop: "2px", fontFamily: "ui-monospace, monospace" }}>
                  {f.file}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View Source Code card */}
        <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "10px 12px" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#111827", marginBottom: "4px" }}>
            View Source Code
          </div>
          <div style={{ fontSize: "11.5px", color: "#4b5563", lineHeight: 1.4 }}>
            Selected function: <code style={{ color: "#2563eb" }}>process_payment()</code>
            <br />
            <span style={{ fontSize: "10.5px", color: "#6b7280" }}>src/services/payment.py:120-200</span>
          </div>
          <div style={{ marginTop: "6px" }}>
            <span style={{ fontSize: "11px", color: "#2563eb", cursor: "pointer", fontWeight: 600 }}>
              View on GitHub ↗
            </span>
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
            gap: "6px",
          }}
        >
          <span>Locate Important Code →</span>
        </button>

        {/* Mark Reviewed Checkbox */}
        <div
          onClick={onToggleComplete}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: isCompleted ? "#15803d" : "#4b5563",
            cursor: "pointer",
            fontWeight: isCompleted ? 700 : 500,
          }}
        >
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              border: isCompleted ? "none" : "1.5px solid #6b7280",
              backgroundColor: isCompleted ? "#16a34a" : "transparent",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "10px",
            }}
          >
            {isCompleted && "✓"}
          </span>
          <span>{isCompleted ? "Code flow explored" : "Mark code flow explored"}</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 04 — IMPORTANT CODE FINDER
 * ========================================================================================= */
function Step4ImportantCodeFinder({
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("payment");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedResult, setSelectedResult] = useState("process_payment");

  const results = [
    { id: "process_payment", name: "process_payment()", file: "src/services/payment.py:120-200" },
    { id: "PaymentService", name: "PaymentService", file: "src/services/payment_service.py:12-48" },
    { id: "routes_payments", name: "/payments", file: "src/api/routes.py:45-78" },
    { id: "payment_model", name: "payment.py", file: "src/models/payment.py:1-120" },
    { id: "get_payment_status", name: "get_payment_status()", file: "src/services/payment.py:210-250" },
  ];

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
        Find important functions, classes, features and API endpoints with links to their source files.
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
        {/* Search bar */}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search symbols..."
            style={{
              width: "100%",
              padding: "8px 28px 8px 30px",
              borderRadius: "6px",
              border: "1.5px solid #27272a",
              fontSize: "12.5px",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
          <span style={{ position: "absolute", left: "9px", top: "9px", color: "#9ca3af", display: "flex" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          {searchTerm && (
            <span
              onClick={() => setSearchTerm("")}
              style={{ position: "absolute", right: "9px", top: "7px", color: "#9ca3af", cursor: "pointer", fontSize: "13px" }}
            >
              ✕
            </span>
          )}
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["All", "Functions", "Classes", "Endpoints", "Files"].map((f) => {
            const isA = activeFilter.toLowerCase() === f.toLowerCase();
            return (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f.toLowerCase())}
                style={{
                  padding: "3px 10px",
                  borderRadius: "12px",
                  border: isA ? "1px solid #f59e0b" : "1px solid #e5e7eb",
                  backgroundColor: isA ? "#fef3c7" : "#f9fafb",
                  color: isA ? "#92400e" : "#4b5563",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "6px" }}>
            Search Results (8)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {results.map((r) => {
              const isSelected = selectedResult === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedResult(r.id)}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: isSelected ? "1.5px solid #f59e0b" : "1px solid #e5e0d8",
                    backgroundColor: isSelected ? "#fef3c7" : "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontFamily: "ui-monospace, monospace", fontSize: "11.5px", fontWeight: 700, color: "#111827" }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#6b7280" }}>{r.file}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail preview for process_payment */}
        <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontFamily: "ui-monospace, monospace", fontWeight: 800, fontSize: "13px", color: "#111827" }}>
            process_payment()
          </div>
          <div style={{ fontSize: "10.5px", color: "#6b7280", marginBottom: "6px" }}>
            src/services/payment.py:120-200
          </div>
          <div style={{ fontSize: "11.5px", color: "#4b5563", marginBottom: "8px" }}>
            Handles payment processing logic and calls external provider.
          </div>

          <div
            style={{
              backgroundColor: "#18181b",
              color: "#e5e7eb",
              padding: "10px",
              borderRadius: "6px",
              fontFamily: "ui-monospace, monospace",
              fontSize: "11px",
              lineHeight: 1.45,
              marginBottom: "10px",
            }}
          >
            <span style={{ color: "#f59e0b" }}>def</span> process_payment(
            <br />
            &nbsp;&nbsp;amount: float,
            <br />
            &nbsp;&nbsp;currency: str,
            <br />
            &nbsp;&nbsp;payment_method: str
            <br />
            ) -&gt; PaymentResponse:
          </div>

          <button
            type="button"
            style={{
              padding: "6px 12px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "6px",
              fontSize: "11.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            View on GitHub
          </button>
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
            gap: "6px",
          }}
        >
          <span>Explore Dependencies →</span>
        </button>

        {/* Mark Reviewed Checkbox */}
        <div
          onClick={onToggleComplete}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: isCompleted ? "#15803d" : "#4b5563",
            cursor: "pointer",
            fontWeight: isCompleted ? 700 : 500,
          }}
        >
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              border: isCompleted ? "none" : "1.5px solid #6b7280",
              backgroundColor: isCompleted ? "#16a34a" : "transparent",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "10px",
            }}
          >
            {isCompleted && "✓"}
          </span>
          <span>{isCompleted ? "Source code explored" : "Mark source code explored"}</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 05 — DEPENDENCIES & IMPACT
 * ========================================================================================= */
function Step5DependenciesImpact({
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
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
        Identify connected files, function callers, related tests, and the potential impact of changing a component.
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
        {/* Selected Component Header */}
        <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "10px 12px" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "3px" }}>
            Selected Component
          </div>
          <div style={{ fontWeight: 800, fontSize: "14px", color: "#111827", fontFamily: "ui-monospace, monospace" }}>
            process_payment()
          </div>
          <div style={{ fontSize: "11px", color: "#6b7280" }}>src/services/payment.py:120-200</div>
        </div>

        {/* 3 Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          <div style={{ backgroundColor: "#ffffff", border: "1.5px solid #27272a", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>Callers</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", marginTop: "2px" }}>4</div>
          </div>
          <div style={{ backgroundColor: "#ffffff", border: "1.5px solid #27272a", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>Dependencies</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", marginTop: "2px" }}>6</div>
          </div>
          <div style={{ backgroundColor: "#ffffff", border: "1.5px solid #27272a", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>Related Tests</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", marginTop: "2px" }}>3</div>
          </div>
        </div>

        {/* Related Files & Callers */}
        <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>
            Related Files &amp; Callers
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
              <span style={{ fontFamily: "ui-monospace, monospace", color: "#2563eb", fontWeight: 600 }}>src/api/routes.py</span>
              <span style={{ padding: "1px 6px", backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "10.5px" }}>Caller</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
              <span style={{ fontFamily: "ui-monospace, monospace", color: "#2563eb", fontWeight: 600 }}>src/services/refund.py</span>
              <span style={{ padding: "1px 6px", backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "10.5px" }}>Caller</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
              <span style={{ fontFamily: "ui-monospace, monospace", color: "#2563eb", fontWeight: 600 }}>tests/test_payment.py</span>
              <span style={{ padding: "1px 6px", backgroundColor: "#dbeafe", border: "1px solid #bfdbfe", borderRadius: "4px", fontSize: "10.5px", color: "#1e40af" }}>Related Test</span>
            </div>
          </div>
        </div>

        {/* Visual Dependency Graph */}
        <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>
            Dependency Graph
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <div style={{ padding: "4px 10px", backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "11px" }}>
              api/routes.py
            </div>
            <div style={{ color: "#9ca3af", fontSize: "11px" }}>↓</div>
            <div style={{ padding: "6px 14px", backgroundColor: "#fef3c7", border: "1.5px solid #f59e0b", borderRadius: "6px", fontSize: "11.5px", fontWeight: 800 }}>
              process_payment()
            </div>
            <div style={{ color: "#9ca3af", fontSize: "11px" }}>↓</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ padding: "3px 7px", backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "10.5px" }}>payment_service.py</span>
              <span style={{ padding: "3px 7px", backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "10.5px" }}>stripe.py</span>
              <span style={{ padding: "3px 7px", backgroundColor: "#ffffff", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "10.5px" }}>db.py</span>
            </div>
          </div>
        </div>

        {/* Potential Impact warning box */}
        <div style={{ backgroundColor: "#fef3c7", border: "1.5px solid #f59e0b", borderRadius: "8px", padding: "10px 12px" }}>
          <div style={{ fontWeight: 800, fontSize: "12px", color: "#92400e", marginBottom: "2px" }}>
            Potential Change Impact
          </div>
          <div style={{ fontSize: "11.5px", color: "#78350f", lineHeight: 1.4 }}>
            Changes to this function may affect 3 other modules and 2 tests.
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
            gap: "6px",
          }}
        >
          <span>View Setup &amp; Testing →</span>
        </button>

        {/* Mark Reviewed Checkbox */}
        <div
          onClick={onToggleComplete}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: isCompleted ? "#15803d" : "#4b5563",
            cursor: "pointer",
            fontWeight: isCompleted ? 700 : 500,
          }}
        >
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              border: isCompleted ? "none" : "1.5px solid #6b7280",
              backgroundColor: isCompleted ? "#16a34a" : "transparent",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "10px",
            }}
          >
            {isCompleted && "✓"}
          </span>
          <span>{isCompleted ? "Dependencies explored" : "Mark dependencies explored"}</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 06 — SETUP & TESTING GUIDE
 * ========================================================================================= */
function Step6SetupTestingGuide({
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

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
        Review setup instructions, dependencies, environment requirements, run commands and available tests.
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
        {/* Prerequisites */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "6px" }}>
            Prerequisites
          </div>
          <div style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>
            <div>• Python 3.11+</div>
            <div>• Docker (optional)</div>
            <div>• Git</div>
          </div>
        </div>

        {/* Install Dependencies */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "6px" }}>
            Install Dependencies
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#18181b",
              color: "#f3f4f6",
              padding: "8px 12px",
              borderRadius: "6px",
              fontFamily: "ui-monospace, monospace",
              fontSize: "11.5px",
            }}
          >
            <span>$ pip install -r requirements.txt</span>
            <button
              type="button"
              onClick={() => copyToClipboard("pip install -r requirements.txt", "deps")}
              style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "11px" }}
            >
              {copiedKey === "deps" ? "✓" : "Copy"}
            </button>
          </div>
        </div>

        {/* Environment Configuration */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "6px" }}>
            Environment Configuration
          </div>
          <div style={{ fontSize: "11.5px", color: "#4b5563", marginBottom: "4px" }}>
            Create a <code style={{ color: "#2563eb" }}>.env</code> file with the following variables:
          </div>
          <div
            style={{
              backgroundColor: "#18181b",
              color: "#f3f4f6",
              padding: "8px 12px",
              borderRadius: "6px",
              fontFamily: "ui-monospace, monospace",
              fontSize: "11px",
              lineHeight: 1.45,
            }}
          >
            DATABASE_URL=postgresql://user:pass@localhost:5432/db
            <br />
            STRIPE_SECRET_KEY=sk_test_...
            <br />
            ENV=development
          </div>
        </div>

        {/* Run Application */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "6px" }}>
            Run the Application
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#18181b",
              color: "#f3f4f6",
              padding: "8px 12px",
              borderRadius: "6px",
              fontFamily: "ui-monospace, monospace",
              fontSize: "11.5px",
            }}
          >
            <span>$ uvicorn src.api.main:app --reload</span>
            <button
              type="button"
              onClick={() => copyToClipboard("uvicorn src.api.main:app --reload", "run")}
              style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "11px" }}
            >
              {copiedKey === "run" ? "✓" : "Copy"}
            </button>
          </div>
        </div>

        {/* Run Tests */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "6px" }}>
            Run Tests
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#18181b",
              color: "#f3f4f6",
              padding: "8px 12px",
              borderRadius: "6px",
              fontFamily: "ui-monospace, monospace",
              fontSize: "11.5px",
            }}
          >
            <span>$ pytest tests/</span>
            <button
              type="button"
              onClick={() => copyToClipboard("pytest tests/", "test")}
              style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "11px" }}
            >
              {copiedKey === "test" ? "✓" : "Copy"}
            </button>
          </div>
        </div>

        {/* Related Files */}
        <div>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "6px" }}>
            Related Files
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <span style={{ padding: "4px 8px", backgroundColor: "#faf7f2", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "11px", fontFamily: "ui-monospace, monospace" }}>
              README.md
            </span>
            <span style={{ padding: "4px 8px", backgroundColor: "#faf7f2", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "11px", fontFamily: "ui-monospace, monospace" }}>
              docker-compose.yml ↗
            </span>
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
            gap: "6px",
          }}
        >
          <span>Review Available Work →</span>
        </button>

        {/* Mark Reviewed Checkbox */}
        <div
          onClick={onToggleComplete}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: isCompleted ? "#15803d" : "#4b5563",
            cursor: "pointer",
            fontWeight: isCompleted ? 700 : 500,
          }}
        >
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              border: isCompleted ? "none" : "1.5px solid #6b7280",
              backgroundColor: isCompleted ? "#16a34a" : "transparent",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "10px",
            }}
          >
            {isCompleted && "✓"}
          </span>
          <span>{isCompleted ? "Setup and tests explored" : "Mark setup and tests explored"}</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 07 — AVAILABLE ENGINEERING WORK
 * ========================================================================================= */
function Step7AvailableEngineeringWork({
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
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
        Review unresolved or ongoing work from connected tools.
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
        {/* Jira Card */}
        <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontWeight: 800, fontSize: "13px", color: "#111827" }}>Jira</span>
              <span style={{ fontSize: "10.5px", color: "#6b7280" }}>• 2 pending issues</span>
            </div>
            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#15803d", backgroundColor: "#dcfce7", padding: "1px 6px", borderRadius: "8px" }}>
              Connected
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11.5px", padding: "4px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div>
                <span style={{ fontWeight: 700, color: "#2563eb", marginRight: "6px" }}>PAY-312</span>
                <span>Fix payment webhook failures</span>
              </div>
              <span style={{ padding: "1px 6px", backgroundColor: "#fef3c7", color: "#92400e", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>
                In Progress
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11.5px", padding: "4px 0" }}>
              <div>
                <span style={{ fontWeight: 700, color: "#2563eb", marginRight: "6px" }}>PAY-289</span>
                <span>Improve error handling in service</span>
              </div>
              <span style={{ padding: "1px 6px", backgroundColor: "#f3f4f6", color: "#4b5563", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>
                To Do
              </span>
            </div>
          </div>
        </div>

        {/* Slack Card */}
        <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontWeight: 800, fontSize: "13px", color: "#111827" }}>Slack</span>
              <span style={{ fontSize: "10.5px", color: "#6b7280" }}>• 3 relevant messages</span>
            </div>
            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#15803d", backgroundColor: "#dcfce7", padding: "1px 6px", borderRadius: "8px" }}>
              Connected
            </span>
          </div>
          <div style={{ fontSize: "11.5px", color: "#374151" }}>
            <span style={{ fontWeight: 700, color: "#2563eb", marginRight: "6px" }}>#backend</span>
            <span>Payment service latency increase</span>
            <span style={{ fontSize: "10.5px", color: "#9ca3af", marginLeft: "6px" }}>2h ago</span>
          </div>
        </div>

        {/* Confluence Card */}
        <div style={{ backgroundColor: "#faf7f2", border: "1px solid #e5e0d8", borderRadius: "8px", padding: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontWeight: 800, fontSize: "13px", color: "#111827" }}>Confluence</span>
              <span style={{ fontSize: "10.5px", color: "#6b7280" }}>• 1 relevant page</span>
            </div>
            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#15803d", backgroundColor: "#dcfce7", padding: "1px 6px", borderRadius: "8px" }}>
              Connected
            </span>
          </div>
          <div style={{ fontSize: "11.5px" }}>
            <div style={{ fontWeight: 700, color: "#111827" }}>Payment Service Documentation</div>
            <div style={{ color: "#6b7280", fontSize: "11px" }}>Architecture, APIs and runbooks • Updated 1d ago</div>
          </div>
        </div>

        {/* Notice */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#6b7280" }}>
          <span>ⓘ</span>
          <span>All sources are connected and showing the latest relevant information.</span>
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
            gap: "6px",
          }}
        >
          <span>Review Onboarding Guide →</span>
        </button>

        {/* Mark Reviewed Checkbox */}
        <div
          onClick={onToggleComplete}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: isCompleted ? "#15803d" : "#4b5563",
            cursor: "pointer",
            fontWeight: isCompleted ? 700 : 500,
          }}
        >
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              border: isCompleted ? "none" : "1.5px solid #6b7280",
              backgroundColor: isCompleted ? "#16a34a" : "transparent",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "10px",
            }}
          >
            {isCompleted && "✓"}
          </span>
          <span>{isCompleted ? "Work explored" : "Mark work explored"}</span>
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
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  repoOwner: string;
  repoName: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  const [expandedSection, setExpandedSection] = useState<string | null>("repo_summary");

  const sections = [
    { id: "repo_summary", title: "Repository Summary", desc: `${repoOwner} / ${repoName} — Payment processing and transaction management service.` },
    { id: "arch", title: "Architecture Overview", desc: "System architecture, modules and data flow." },
    { id: "code_flow", title: "Important Code Flows", desc: "Payment processing flow, refund flow." },
    { id: "important_code", title: "Important Files & Functions", desc: "Key files, classes and API endpoints." },
    { id: "deps", title: "Dependencies & Related Tests", desc: "Dependencies, callers and test cases." },
    { id: "setup", title: "Setup & Testing Instructions", desc: "Requirements, commands and environment config." },
    { id: "pending_work", title: "Pending Work (Jira / Slack / Confluence)", desc: "2 Jira issues • 3 Slack messages • 1 Confluence page" },
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
        A consolidated guide with everything you need to get started.
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
        {/* Accordions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {sections.map((sec) => {
            const isExp = expandedSection === sec.id;
            return (
              <div
                key={sec.id}
                style={{
                  border: "1px solid #e5e0d8",
                  borderRadius: "8px",
                  overflow: "hidden",
                  backgroundColor: isExp ? "#faf7f2" : "#ffffff",
                }}
              >
                <div
                  onClick={() => setExpandedSection(isExp ? null : sec.id)}
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "12.5px",
                    color: "#111827",
                  }}
                >
                  <span>{sec.title}</span>
                  <span style={{ color: "#9ca3af", fontSize: "11px" }}>{isExp ? "▲" : "▼"}</span>
                </div>
                {isExp && (
                  <div style={{ padding: "0 12px 10px 12px", fontSize: "12px", color: "#4b5563", lineHeight: 1.45 }}>
                    {sec.desc}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 3 Action Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
          <button
            type="button"
            onClick={onNext}
            style={{
              padding: "10px 6px",
              backgroundColor: "#f79f24",
              color: "#18181b",
              border: "1.5px solid #000000",
              borderRadius: "6px",
              fontWeight: 800,
              fontSize: "11px",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Generate Guide
          </button>
          <button
            type="button"
            style={{
              padding: "10px 6px",
              backgroundColor: "#ffffff",
              color: "#18181b",
              border: "1.5px solid #27272a",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "11px",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Open Full Guide
          </button>
          <button
            type="button"
            style={{
              padding: "10px 6px",
              backgroundColor: "#ffffff",
              color: "#18181b",
              border: "1.5px solid #27272a",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "11px",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Copy Summary
          </button>
        </div>

        {/* Mark Reviewed Checkbox */}
        <div
          onClick={onToggleComplete}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: isCompleted ? "#15803d" : "#4b5563",
            cursor: "pointer",
            fontWeight: isCompleted ? 700 : 500,
          }}
        >
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              border: isCompleted ? "none" : "1.5px solid #6b7280",
              backgroundColor: isCompleted ? "#16a34a" : "transparent",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "10px",
            }}
          >
            {isCompleted && "✓"}
          </span>
          <span>{isCompleted ? "Guide reviewed" : "Mark guide reviewed"}</span>
        </div>
      </div>
    </div>
  );
}
