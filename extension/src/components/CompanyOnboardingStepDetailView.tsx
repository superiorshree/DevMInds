/**
 * File:        extension/src/components/CompanyOnboardingStepDetailView.tsx
 * Purpose:     Displays the 8 onboarding step detail screens for Company Employees
 *              grounded in live repository data from GitHub:
 *              Screen 01: Repository Overview
 *              Screen 02: Architecture Explorer
 *              Screen 03: Code Flow Explorer
 *              Screen 04: Important Code Finder
 *              Screen 05: Dependencies & Impact
 *              Screen 06: Setup & Testing Guide
 *              Screen 07: Available Engineering Work
 *              Screen 08: Your Onboarding Guide
 */

import React, { useEffect, useState } from "react";
import type { SessionUser } from "../services/api";
import {
  getLiveRepoBundle,
  type LiveRepoBundle,
  RateLimitError,
} from "../services/githubApi";

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
  const repoName = repo.repo || "";
  const repoOwner = repo.owner || "";
  const initial = user?.github_login ? user.github_login.charAt(0).toUpperCase() : "D";

  const [bundle, setBundle] = useState<LiveRepoBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!repoOwner || !repoName) return;
    let active = true;
    setLoading(true);
    setError(null);

    getLiveRepoBundle(repoOwner, repoName)
      .then((data) => {
        if (!active) return;
        setBundle(data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof RateLimitError) {
          setError(`GitHub rate limit reached. Resets at ${err.resetTime}.`);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load live data");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [repoOwner, repoName, retryCount]);

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
          <span
            style={{
              backgroundColor: "#fef3c7",
              border: "1px solid #f59e0b",
              borderRadius: "4px",
              padding: "1px 6px",
              fontSize: "9.5px",
              fontWeight: 800,
              color: "#92400e",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Step {step} of 8
          </span>
        </div>

        {/* Right: AI Mentor button + Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={onOpenAiMentor}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              backgroundColor: "#f79f24",
              border: "1.5px solid #000000",
              borderRadius: "14px",
              fontWeight: 700,
              fontSize: "11px",
              color: "#000000",
              cursor: "pointer",
            }}
          >
            <span>Ask AI</span>
          </button>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
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
                border: "none",
                cursor: "pointer",
                padding: 0,
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
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "16px 16px 80px", maxWidth: "100%", boxSizing: "border-box" }}>
        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: "#fef2f2",
              border: "1.5px solid #ef4444",
              borderRadius: "8px",
              padding: "12px 14px",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "13px", color: "#991b1b", marginBottom: "4px" }}>
              Unable to load repository data
            </div>
            <div style={{ fontSize: "12px", color: "#b91c1c", marginBottom: "8px" }}>
              {error}
            </div>
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              style={{
                padding: "4px 10px",
                backgroundColor: "#ffffff",
                border: "1.5px solid #18181b",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "30px 0", textAlign: "center", color: "#6b7280" }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#18181b", marginBottom: "6px" }}>
              Loading Step {step} with live repository data...
            </div>
            <div style={{ fontSize: "12px" }}>Connecting to GitHub API for {repoOwner}/{repoName}</div>
          </div>
        ) : bundle ? (
          <>
            {step === 1 && (
              <Step1RepositoryOverview
                bundle={bundle}
                repoOwner={repoOwner}
                repoName={repoName}
                isCompleted={completedSteps.includes(1)}
                onToggleComplete={() => onToggleComplete(1)}
                onNext={() => onNavigateStep(2)}
              />
            )}

            {step === 2 && (
              <Step2ArchitectureExplorer
                bundle={bundle}
                repoOwner={repoOwner}
                repoName={repoName}
                isCompleted={completedSteps.includes(2)}
                onToggleComplete={() => onToggleComplete(2)}
                onNext={() => onNavigateStep(3)}
              />
            )}

            {step === 3 && (
              <Step3CodeFlowExplorer
                bundle={bundle}
                repoOwner={repoOwner}
                repoName={repoName}
                isCompleted={completedSteps.includes(3)}
                onToggleComplete={() => onToggleComplete(3)}
                onNext={() => onNavigateStep(4)}
              />
            )}

            {step === 4 && (
              <Step4ImportantCodeFinder
                bundle={bundle}
                repoOwner={repoOwner}
                repoName={repoName}
                isCompleted={completedSteps.includes(4)}
                onToggleComplete={() => onToggleComplete(4)}
                onNext={() => onNavigateStep(5)}
              />
            )}

            {step === 5 && (
              <Step5DependenciesImpact
                bundle={bundle}
                repoOwner={repoOwner}
                repoName={repoName}
                isCompleted={completedSteps.includes(5)}
                onToggleComplete={() => onToggleComplete(5)}
                onNext={() => onNavigateStep(6)}
              />
            )}

            {step === 6 && (
              <Step6SetupTestingGuide
                bundle={bundle}
                repoOwner={repoOwner}
                repoName={repoName}
                isCompleted={completedSteps.includes(6)}
                onToggleComplete={() => onToggleComplete(6)}
                onNext={() => onNavigateStep(7)}
              />
            )}

            {step === 7 && (
              <Step7AvailableEngineeringWork
                bundle={bundle}
                repoOwner={repoOwner}
                repoName={repoName}
                isCompleted={completedSteps.includes(7)}
                onToggleComplete={() => onToggleComplete(7)}
                onNext={() => onNavigateStep(8)}
              />
            )}

            {step === 8 && (
              <Step8YourOnboardingGuide
                bundle={bundle}
                repoOwner={repoOwner}
                repoName={repoName}
                isCompleted={completedSteps.includes(8)}
                onToggleComplete={() => onToggleComplete(8)}
                onNext={onBackToRoadmap}
              />
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

/* =========================================================================================
 * STEP 1: REPOSITORY OVERVIEW
 * ========================================================================================= */
function Step1RepositoryOverview({
  bundle,
  repoOwner,
  repoName,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  bundle: LiveRepoBundle;
  repoOwner: string;
  repoName: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  const summary = bundle.details.description || "Live repository verified on GitHub.";

  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>
        [01] Repository Identity
      </div>
      <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0" }}>
        {repoOwner} / {repoName}
      </h1>
      <p style={{ fontSize: "12.5px", color: "#4b5563", margin: "0 0 16px 0", lineHeight: 1.45 }}>
        {summary}
      </p>

      {/* Technologies Detected */}
      <div style={{ backgroundColor: "#ffffff", border: "1.5px solid #27272a", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "8px" }}>
          Primary Languages Detected
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {bundle.topLanguages.map((lang) => (
            <span
              key={lang}
              style={{
                padding: "3px 8px",
                backgroundColor: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "12px",
                fontSize: "11.5px",
                fontWeight: 600,
              }}
            >
              {lang}
            </span>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <button
          type="button"
          onClick={onToggleComplete}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: isCompleted ? "#dcfce7" : "#ffffff",
            border: isCompleted ? "1.5px solid #16a34a" : "1.5px solid #27272a",
            color: isCompleted ? "#15803d" : "#18181b",
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {isCompleted ? "✓ Completed" : "Mark Step Complete"}
        </button>
        <button
          type="button"
          onClick={onNext}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: "#f79f24",
            border: "1.5px solid #000000",
            borderRadius: "6px",
            fontWeight: 800,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Next: Architecture →
        </button>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 2: ARCHITECTURE EXPLORER
 * ========================================================================================= */
function Step2ArchitectureExplorer({
  bundle,
  repoOwner,
  repoName,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  bundle: LiveRepoBundle;
  repoOwner: string;
  repoName: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>
        [02] Architecture Explorer
      </div>
      <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0" }}>
        Repository Modules & Structure
      </h1>
      <p style={{ fontSize: "12.5px", color: "#4b5563", margin: "0 0 16px 0" }}>
        Modules and entry points detected in {repoName}.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        {bundle.architectureNodes.map((node) => (
          <div
            key={node.id}
            style={{
              padding: "10px 12px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "6px",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "13px", color: "#18181b" }}>
              {node.name}
            </div>
            <div style={{ fontSize: "11.5px", color: "#6b7280" }}>
              {node.description}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="button"
          onClick={onToggleComplete}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: isCompleted ? "#dcfce7" : "#ffffff",
            border: isCompleted ? "1.5px solid #16a34a" : "1.5px solid #27272a",
            color: isCompleted ? "#15803d" : "#18181b",
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {isCompleted ? "✓ Completed" : "Mark Step Complete"}
        </button>
        <button
          type="button"
          onClick={onNext}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: "#f79f24",
            border: "1.5px solid #000000",
            borderRadius: "6px",
            fontWeight: 800,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Next: Code Flow →
        </button>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 3: CODE FLOW EXPLORER
 * ========================================================================================= */
function Step3CodeFlowExplorer({
  bundle,
  repoOwner,
  repoName,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  bundle: LiveRepoBundle;
  repoOwner: string;
  repoName: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  const dirs = bundle.contents.filter((c) => c.type === "dir");

  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>
        [03] Code Flow Explorer
      </div>
      <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0" }}>
        Execution Flow Across Modules
      </h1>
      <p style={{ fontSize: "12.5px", color: "#4b5563", margin: "0 0 16px 0" }}>
        Tracing how requests and data flow through {repoName}.
      </p>

      <div style={{ backgroundColor: "#ffffff", border: "1.5px solid #27272a", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "8px" }}>
          Module Pipelines
        </div>
        {dirs.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {dirs.map((dir, idx) => (
              <div key={dir.name} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
                <span style={{ fontWeight: 700, color: "#f59e0b" }}>{idx + 1}.</span>
                <span style={{ fontWeight: 600 }}>{dir.name}/</span>
                <span style={{ color: "#6b7280" }}>— Directory module</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: "12px", color: "#6b7280" }}>Single-module repository.</div>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="button"
          onClick={onToggleComplete}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: isCompleted ? "#dcfce7" : "#ffffff",
            border: isCompleted ? "1.5px solid #16a34a" : "1.5px solid #27272a",
            color: isCompleted ? "#15803d" : "#18181b",
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {isCompleted ? "✓ Completed" : "Mark Step Complete"}
        </button>
        <button
          type="button"
          onClick={onNext}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: "#f79f24",
            border: "1.5px solid #000000",
            borderRadius: "6px",
            fontWeight: 800,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Next: Important Code →
        </button>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 4: IMPORTANT CODE FINDER
 * ========================================================================================= */
function Step4ImportantCodeFinder({
  bundle,
  repoOwner,
  repoName,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  bundle: LiveRepoBundle;
  repoOwner: string;
  repoName: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>
        [04] Important Code Finder
      </div>
      <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0" }}>
        Key Files and Entry Points
      </h1>
      <p style={{ fontSize: "12.5px", color: "#4b5563", margin: "0 0 16px 0" }}>
        Essential root files detected in {repoName}.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        {bundle.contents.slice(0, 10).map((item) => (
          <div
            key={item.path}
            style={{
              padding: "10px 12px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "13px", color: "#18181b" }}>
                {item.name}
              </div>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>
                {item.type === "dir" ? "Directory" : "File"}
              </div>
            </div>
            <a
              href={item.html_url}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "11.5px", color: "#2563eb", textDecoration: "none", fontWeight: 600 }}
            >
              View on GitHub ↗
            </a>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="button"
          onClick={onToggleComplete}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: isCompleted ? "#dcfce7" : "#ffffff",
            border: isCompleted ? "1.5px solid #16a34a" : "1.5px solid #27272a",
            color: isCompleted ? "#15803d" : "#18181b",
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {isCompleted ? "✓ Completed" : "Mark Step Complete"}
        </button>
        <button
          type="button"
          onClick={onNext}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: "#f79f24",
            border: "1.5px solid #000000",
            borderRadius: "6px",
            fontWeight: 800,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Next: Dependencies →
        </button>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 5: DEPENDENCIES & IMPACT
 * ========================================================================================= */
function Step5DependenciesImpact({
  bundle,
  repoOwner,
  repoName,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  bundle: LiveRepoBundle;
  repoOwner: string;
  repoName: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>
        [05] Dependencies & Impact
      </div>
      <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0" }}>
        Technology Dependencies
      </h1>
      <p style={{ fontSize: "12.5px", color: "#4b5563", margin: "0 0 16px 0" }}>
        Dependencies declared in {repoName}.
      </p>

      <div style={{ backgroundColor: "#ffffff", border: "1.5px solid #27272a", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "8px" }}>
          Languages by Bytes
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {Object.entries(bundle.languages).map(([lang, bytes]) => (
            <div key={lang} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ fontWeight: 600 }}>{lang}</span>
              <span style={{ color: "#6b7280" }}>{(bytes / 1024).toFixed(1)} KB</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="button"
          onClick={onToggleComplete}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: isCompleted ? "#dcfce7" : "#ffffff",
            border: isCompleted ? "1.5px solid #16a34a" : "1.5px solid #27272a",
            color: isCompleted ? "#15803d" : "#18181b",
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {isCompleted ? "✓ Completed" : "Mark Step Complete"}
        </button>
        <button
          type="button"
          onClick={onNext}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: "#f79f24",
            border: "1.5px solid #000000",
            borderRadius: "6px",
            fontWeight: 800,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Next: Setup & Testing →
        </button>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 6: SETUP & TESTING GUIDE
 * ========================================================================================= */
function Step6SetupTestingGuide({
  bundle,
  repoOwner,
  repoName,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  bundle: LiveRepoBundle;
  repoOwner: string;
  repoName: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>
        [06] Setup & Testing Guide
      </div>
      <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0" }}>
        Setup & Verification Commands
      </h1>
      <p style={{ fontSize: "12.5px", color: "#4b5563", margin: "0 0 16px 0" }}>
        Local setup extracted from {repoName}'s README and configuration manifests.
      </p>

      <div style={{ backgroundColor: "#ffffff", border: "1.5px solid #27272a", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "8px" }}>
          Setup Commands
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {bundle.setupSteps.map((step, idx) => (
            <div key={idx} style={{ padding: "6px 10px", backgroundColor: "#f3f4f6", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" }}>
              {step}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="button"
          onClick={onToggleComplete}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: isCompleted ? "#dcfce7" : "#ffffff",
            border: isCompleted ? "1.5px solid #16a34a" : "1.5px solid #27272a",
            color: isCompleted ? "#15803d" : "#18181b",
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {isCompleted ? "✓ Completed" : "Mark Step Complete"}
        </button>
        <button
          type="button"
          onClick={onNext}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: "#f79f24",
            border: "1.5px solid #000000",
            borderRadius: "6px",
            fontWeight: 800,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Next: Engineering Work →
        </button>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 7: AVAILABLE ENGINEERING WORK
 * ========================================================================================= */
function Step7AvailableEngineeringWork({
  bundle,
  repoOwner,
  repoName,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  bundle: LiveRepoBundle;
  repoOwner: string;
  repoName: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>
        [07] Available Engineering Work
      </div>
      <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0" }}>
        Live Open Issues ({bundle.issues.length})
      </h1>
      <p style={{ fontSize: "12.5px", color: "#4b5563", margin: "0 0 16px 0" }}>
        Real issues available on GitHub. (Jira issues require Jira connector to be configured).
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        {bundle.issues.length > 0 ? (
          bundle.issues.map((issue) => (
            <div
              key={issue.id}
              style={{
                padding: "10px 12px",
                backgroundColor: "#ffffff",
                border: "1.5px solid #27272a",
                borderRadius: "6px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontWeight: 800, fontSize: "12px" }}>#{issue.number}</span>
                <a
                  href={issue.html_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "11px", color: "#2563eb", textDecoration: "none" }}
                >
                  View on GitHub ↗
                </a>
              </div>
              <div style={{ fontSize: "12.5px", fontWeight: 600 }}>{issue.title}</div>
            </div>
          ))
        ) : (
          <div style={{ padding: "14px", backgroundColor: "#ffffff", border: "1.5px solid #27272a", borderRadius: "6px", fontSize: "12px", color: "#6b7280" }}>
            No open GitHub issues found.
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="button"
          onClick={onToggleComplete}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: isCompleted ? "#dcfce7" : "#ffffff",
            border: isCompleted ? "1.5px solid #16a34a" : "1.5px solid #27272a",
            color: isCompleted ? "#15803d" : "#18181b",
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {isCompleted ? "✓ Completed" : "Mark Step Complete"}
        </button>
        <button
          type="button"
          onClick={onNext}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: "#f79f24",
            border: "1.5px solid #000000",
            borderRadius: "6px",
            fontWeight: 800,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Next: Onboarding Guide →
        </button>
      </div>
    </div>
  );
}

/* =========================================================================================
 * STEP 8: YOUR ONBOARDING GUIDE
 * ========================================================================================= */
function Step8YourOnboardingGuide({
  bundle,
  repoOwner,
  repoName,
  isCompleted,
  onToggleComplete,
  onNext,
}: {
  bundle: LiveRepoBundle;
  repoOwner: string;
  repoName: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 800, color: "#6b7280", textTransform: "uppercase", marginBottom: "6px" }}>
        [08] Your Onboarding Guide
      </div>
      <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0" }}>
        Ready to Build on {repoName}
      </h1>
      <p style={{ fontSize: "12.5px", color: "#4b5563", margin: "0 0 16px 0" }}>
        You have explored the real repository structure, modules, and setup guides.
      </p>

      <div style={{ backgroundColor: "#ffffff", border: "1.5px solid #27272a", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: "13px", color: "#15803d", marginBottom: "6px" }}>
          ✓ Verified Live Repository Context
        </div>
        <div style={{ fontSize: "12px", color: "#4b5563" }}>
          Default branch: <code>{bundle.details.default_branch}</code> • Top language: {bundle.details.language || "Multi"} • Stars: {bundle.details.stargazers_count}
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="button"
          onClick={onToggleComplete}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: isCompleted ? "#dcfce7" : "#ffffff",
            border: isCompleted ? "1.5px solid #16a34a" : "1.5px solid #27272a",
            color: isCompleted ? "#15803d" : "#18181b",
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {isCompleted ? "✓ Completed" : "Mark Step Complete"}
        </button>
        <button
          type="button"
          onClick={onNext}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: "#f79f24",
            border: "1.5px solid #000000",
            borderRadius: "6px",
            fontWeight: 800,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Return to Roadmap →
        </button>
      </div>
    </div>
  );
}
