/**
 * File:        extension/src/components/CompanyOnboardingRoadmapView.tsx
 * Purpose:     "Your Onboarding Roadmap" screen for Company Employees.
 *              Displays an 8-step structured journey after repository is detected
 *              and ready to analyse:
 *              01 — Get to Know the Repository
 *              02 — Understand the Architecture
 *              03 — Explore an Important Code Flow
 *              04 — Locate Important Code
 *              05 — Understand Dependencies and Impact
 *              06 — Learn How to Run and Test the Project
 *              07 — Explore Existing Pending Work (Jira, Confluence, Slack)
 *              08 — Get Hands-On
 *              Uses clean SVG icons instead of system emojis.
 */

import { useState } from "react";
import type { SessionUser } from "../services/api";
import type { RepoRef } from "../services/repoDetector";
import type { ArchitectureBundle } from "../types/architecture";
import type { LiveRepoSnapshot } from "../services/githubApi";
import { CompanyOnboardingStepDetailView } from "./CompanyOnboardingStepDetailView";
import { OpenSourceAiMentorChat } from "./OpenSourceAiMentorChat";

export interface CompanyOnboardingRoadmapViewProps {
  repo: RepoRef;
  user: SessionUser | null;
  architectureData?: ArchitectureBundle | null;
  liveRepo?: LiveRepoSnapshot | null;
  companyContext?: { items: any[]; errors: any[] } | null;
  onExploreStep?: (stepNumber: number) => void;
  onOpenAiMentor?: () => void;
  onSignOut?: () => void;
  onChangeMode?: () => void;
  onOpenSettings?: () => void;
}

/* =========================================================================================
 * CLEAN SVG ICONS (NO UNNECESSARY EMOJIS)
 * ========================================================================================= */
function OctocatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function ArchitectureIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v4m-6 4v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function JiraIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M11.53 2c0 5.26 4.27 9.53 9.53 9.53H22V2h-10.47z" fill="#0052CC"/>
      <path d="M2 11.53C7.26 11.53 11.53 15.8 11.53 21.06V22H2v-10.47z" fill="#2684FF"/>
      <path d="M2 2c5.26 0 9.53 4.27 9.53 9.53H2V2z" fill="#0052CC"/>
    </svg>
  );
}

function ConfluenceIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M3.77 15.4c-.6.9-1.2 2-1.77 3.32-.4 1 .3 2.08 1.37 2.08h11.4c.5 0 .9-.3 1.1-.7.7-1.4 1.5-3.4 1.7-4.7.1-.6-.3-1.1-.9-1.1H4.67c-.4 0-.7.4-.9 1.1z" fill="#172B4D"/>
      <path d="M20.23 8.6c.6-.9 1.2-2 1.77-3.32.4-1-.3-2.08-1.37-2.08H9.23c-.5 0-.9.3-1.1.7-.7 1.4-1.5 3.4-1.7 4.7-.1.6.3 1.1.9 1.1h12c.4 0 .7-.4.9-1.1z" fill="#0052CC"/>
    </svg>
  );
}

function SlackIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M6 15a2 2 0 1 1-2-2h2v2zm1 0a2 2 0 1 1 2 2v-2H7zm0-6a2 2 0 1 1-2-2v2h2zm1 0a2 2 0 1 1 2-2H8v2zm7 0a2 2 0 1 1 2 2h-2V9zm-1 0a2 2 0 1 1-2-2v2h2zm0 6a2 2 0 1 1 2 2v-2h-2zm-1 0a2 2 0 1 1-2-2H13v2z" fill="#000000"/>
    </svg>
  );
}

function CheckSquareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z" />
    </svg>
  );
}

export function CompanyOnboardingRoadmapView({
  repo,
  user,
  architectureData,
  liveRepo,
  companyContext,
  onExploreStep,
  onOpenAiMentor,
  onSignOut,
  onChangeMode,
  onOpenSettings,
}: CompanyOnboardingRoadmapViewProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedStepDetail, setSelectedStepDetail] = useState<number | null>(null);
  const [showAiMentor, setShowAiMentor] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const repoName = repo.repo || "payment-service";
  const repoOwner = repo.owner || "acme";
  const repoUrl = `https://github.com/${repoOwner}/${repoName}`;

  const initial = user?.github_login ? user.github_login.charAt(0).toUpperCase() : "P";

  const totalSteps = 8;
  const completedCount = completedSteps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  const toggleComplete = (stepNum: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepNum) ? prev.filter((s) => s !== stepNum) : [...prev, stepNum]
    );
  };

  /* Render AI Mentor Chat if opened */
  if (showAiMentor) {
    return (
      <OpenSourceAiMentorChat
        repo={repo}
        onClose={() => setShowAiMentor(false)}
      />
    );
  }

  /* Render Bespoke Onboarding Step Detail Screen (Screens 1 to 8) */
  if (selectedStepDetail !== null) {
    return (
      <CompanyOnboardingStepDetailView
        step={selectedStepDetail}
        repo={repo}
        user={user}
        architectureData={architectureData}
        liveRepo={liveRepo}
        companyContext={companyContext}
        completedSteps={completedSteps}
        onToggleComplete={toggleComplete}
        onNavigateStep={(nextStep) => {
          setSelectedStepDetail(nextStep);
          setCurrentStep(nextStep);
          onExploreStep?.(nextStep);
        }}
        onBackToRoadmap={() => setSelectedStepDetail(null)}
        onOpenAiMentor={() => setShowAiMentor(true)}
        onSignOut={onSignOut}
        onChangeMode={onChangeMode}
        onOpenSettings={onOpenSettings}
      />
    );
  }

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
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "26px",
              height: "26px",
              backgroundColor: "#18181b",
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f59e0b",
              fontFamily: "ui-monospace, monospace",
              fontWeight: 800,
              fontSize: "12px",
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
                    background: "transparent",
                    color: "#18181b",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Settings
                </button>
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
                    padding: "6px 8px",
                    border: "none",
                    background: "transparent",
                    color: "#18181b",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
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
                    padding: "6px 8px",
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
      </header>

      {/* Main Container */}
      <main style={{ padding: "20px 16px 90px", flex: 1, boxSizing: "border-box" }}>
        {/* Title & Subtitle */}
        <h1
          style={{
            margin: "0 0 6px 0",
            fontSize: "24px",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "#111827",
            lineHeight: 1.15,
          }}
        >
          Your Onboarding
          <br />
          Roadmap
        </h1>
        <p
          style={{
            margin: "0 0 16px 0",
            fontSize: "13.5px",
            color: "#4b5563",
            lineHeight: 1.45,
          }}
        >
          Get to know your codebase, one step at a time.
        </p>

        {/* Repo badge pill */}
        <div style={{ marginBottom: "16px" }}>
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "6px 12px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "6px",
              boxShadow: "1.5px 1.5px 0px #000000",
              color: "#18181b",
              textDecoration: "none",
              fontFamily: "ui-monospace, monospace",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            <OctocatIcon />
            <span>
              {repoOwner} / {repoName}
            </span>
            <span style={{ fontSize: "11px", color: "#6b7280" }}>↗</span>
          </a>
        </div>

        {/* Progress indicator */}
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              fontWeight: 700,
              color: "#18181b",
              marginBottom: "6px",
            }}
          >
            <span>{completedCount} / {totalSteps} completed</span>
            <span style={{ color: "#6b7280" }}>{progressPercent}%</span>
          </div>

          {/* Progress bar container */}
          <div
            style={{
              width: "100%",
              height: "6px",
              backgroundColor: "#e5e7eb",
              borderRadius: "3px",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${Math.max(progressPercent, 4)}%`,
                height: "100%",
                backgroundColor: "#f79f24",
                borderRadius: "3px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* Timeline List of 8 Steps */}
        <div style={{ position: "relative" }}>
          {/* Vertical connecting line */}
          <div
            style={{
              position: "absolute",
              top: "24px",
              bottom: "40px",
              left: "17px",
              width: "2px",
              backgroundColor: "#d1d5db",
              zIndex: 1,
            }}
          />

          {/* Step 01 */}
          <StepItem
            stepNumber="01"
            title="Get to Know the Repository"
            description="Understand the project's purpose, owner, programming languages, technologies, and README summary."
            icon={<DocIcon />}
            isCurrent={currentStep === 1}
            isCompleted={completedSteps.includes(1)}
            onToggleComplete={() => toggleComplete(1)}
            onAction={() => {
              setCurrentStep(1);
              setSelectedStepDetail(1);
              onExploreStep?.(1);
            }}
            actionLabel="Explore Repository Overview →"
            actionPrimary={true}
            tagsText={`${repoOwner}/${repoName} | ${liveRepo?.metadata?.primaryLanguage || architectureData?.overview?.primary_language || (architectureData?.technologies?.[0]?.name) || "Repository"} | ${architectureData?.technologies?.map(t => t.name).slice(0, 2).join(" + ") || "Git"}`}
          />

          {/* Step 02 */}
          <StepItem
            stepNumber="02"
            title="Understand the Architecture"
            description="Explore the folder structure, important files, entry points, components, and connections between modules."
            icon={<ArchitectureIcon />}
            isCurrent={currentStep === 2}
            isCompleted={completedSteps.includes(2)}
            onToggleComplete={() => toggleComplete(2)}
            onAction={() => {
              setCurrentStep(2);
              setSelectedStepDetail(2);
              onExploreStep?.(2);
            }}
            actionLabel="Explore Architecture →"
          />

          {/* Step 03 */}
          <StepItem
            stepNumber="03"
            title="Explore an Important Code Flow"
            description="Trace an existing feature, such as login or search, through relevant files, functions, and data flow."
            icon={<CodeIcon />}
            isCurrent={currentStep === 3}
            isCompleted={completedSteps.includes(3)}
            onToggleComplete={() => toggleComplete(3)}
            onAction={() => {
              setCurrentStep(3);
              setSelectedStepDetail(3);
              onExploreStep?.(3);
            }}
            actionLabel="Explore Code Flow →"
          />

          {/* Step 04 */}
          <StepItem
            stepNumber="04"
            title="Locate Important Code"
            description="Find important functions, classes, features, and API endpoints with links to their source files."
            icon={<SearchIcon />}
            isCurrent={currentStep === 4}
            isCompleted={completedSteps.includes(4)}
            onToggleComplete={() => toggleComplete(4)}
            onAction={() => {
              setCurrentStep(4);
              setSelectedStepDetail(4);
              onExploreStep?.(4);
            }}
            actionLabel="Explore Important Code →"
          />

          {/* Step 05 */}
          <StepItem
            stepNumber="05"
            title="Understand Dependencies and Impact"
            description="Identify connected files, function callers, related tests, and the potential impact of changing a component."
            icon={<LinkIcon />}
            isCurrent={currentStep === 5}
            isCompleted={completedSteps.includes(5)}
            onToggleComplete={() => toggleComplete(5)}
            onAction={() => {
              setCurrentStep(5);
              setSelectedStepDetail(5);
              onExploreStep?.(5);
            }}
            actionLabel="Explore Dependencies →"
            badges={[
              { label: "Callers 7", color: "orange" },
              { label: "Dependencies 12", color: "gray" },
              { label: "Related Tests 4", color: "gray" },
            ]}
          />

          {/* Step 06 */}
          <StepItem
            stepNumber="06"
            title="Learn How to Run and Test the Project"
            description="Review setup instructions, dependencies, environment requirements, run commands, and available tests."
            icon={<TerminalIcon />}
            isCurrent={currentStep === 6}
            isCompleted={completedSteps.includes(6)}
            onToggleComplete={() => toggleComplete(6)}
            onAction={() => {
              setCurrentStep(6);
              setSelectedStepDetail(6);
              onExploreStep?.(6);
            }}
            actionLabel="View Setup & Testing →"
          />

          {/* Step 07 */}
          <StepItem
            stepNumber="07"
            title="Explore Existing Pending Work"
            description="Review unresolved or ongoing work from connected company sources."
            icon={<UsersIcon />}
            isCurrent={currentStep === 7}
            isCompleted={completedSteps.includes(7)}
            onToggleComplete={() => toggleComplete(7)}
            onAction={() => {
              setCurrentStep(7);
              setSelectedStepDetail(7);
              onExploreStep?.(7);
            }}
            actionLabel="View Pending Work →"
            integrationRows={[
              { name: "Jira", count: "2 open issues" },
              { name: "Confluence", count: "3 relevant docs" },
              { name: "Slack", count: "5 recent discussions" },
            ]}
          />

          {/* Step 08 */}
          <StepItem
            stepNumber="08"
            title="Get Hands-On"
            description="Set up your development environment, run the project, and make your first change."
            icon={<CheckSquareIcon />}
            isCurrent={currentStep === 8}
            isCompleted={completedSteps.includes(8)}
            onToggleComplete={() => toggleComplete(8)}
            onAction={() => {
              setCurrentStep(8);
              setSelectedStepDetail(8);
              onExploreStep?.(8);
            }}
            actionLabel="Start Hands-On Lab →"
          />
        </div>
      </main>

      {/* Bottom Floating/Sticky AI Codebase Mentor Action Button */}
      <footer
        style={{
          position: "sticky",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 16px 16px",
          backgroundColor: "#faf7f2",
          borderTop: "1.5px solid #27272a",
          boxShadow: "0 -4px 10px rgba(0,0,0,0.04)",
          zIndex: 40,
        }}
      >
        <button
          type="button"
          onClick={() => setShowAiMentor(true)}
          style={{
            width: "100%",
            padding: "13px 18px",
            backgroundColor: "#f79f24",
            color: "#18181b",
            border: "2px solid #000000",
            borderRadius: "28px",
            boxShadow: "3px 3px 0px #000000",
            fontWeight: 800,
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "transform 0.1s ease",
          }}
        >
          <span>AI Mentor</span>
        </button>
      </footer>
    </div>
  );
}

/* =========================================================================================
 * STEP ITEM COMPONENT
 * ========================================================================================= */
function StepItem({
  stepNumber,
  title,
  description,
  icon,
  isCurrent,
  isCompleted,
  onToggleComplete,
  onAction,
  actionLabel,
  actionPrimary,
  tagsText,
  badges,
  integrationRows,
}: {
  stepNumber: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isCurrent?: boolean;
  isCompleted?: boolean;
  onToggleComplete?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  actionPrimary?: boolean;
  tagsText?: string;
  badges?: { label: string; color: "orange" | "gray" }[];
  integrationRows?: { name: string; count: string }[];
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        marginBottom: "18px",
        position: "relative",
        zIndex: 2,
      }}
    >
      {/* Circle Step Number */}
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          backgroundColor: isCompleted ? "#dcfce7" : isCurrent ? "#fef3c7" : "#ffffff",
          border: isCurrent
            ? "2px solid #f59e0b"
            : isCompleted
            ? "2px solid #16a34a"
            : "1.5px solid #27272a",
          boxShadow: isCurrent ? "2px 2px 0px #000000" : "1.5px 1.5px 0px #000000",
          color: isCompleted ? "#15803d" : "#18181b",
          fontWeight: 800,
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: "2px",
        }}
      >
        {isCompleted ? "✓" : stepNumber}
      </div>

      {/* Step Card Box */}
      <div
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
          border: isCurrent ? "2px solid #f59e0b" : "1.5px solid #27272a",
          borderRadius: "10px",
          boxShadow: isCurrent ? "3px 3px 0px #000000" : "2px 2px 0px #000000",
          padding: "14px 16px",
          boxSizing: "border-box",
        }}
      >
        {/* Top line: Icon + Title + Current Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "4px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", color: "#18181b" }}>
              {icon}
            </span>
            <h2
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 800,
                color: "#111827",
                lineHeight: 1.3,
              }}
            >
              {title}
            </h2>
          </div>

          {isCurrent && (
            <span
              style={{
                padding: "2px 8px",
                backgroundColor: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: "10px",
                fontSize: "10px",
                fontWeight: 800,
                color: "#b45309",
                flexShrink: 0,
              }}
            >
              Current
            </span>
          )}
        </div>

        {/* Description */}
        <p
          style={{
            margin: "0 0 10px 0",
            fontSize: "12px",
            color: "#4b5563",
            lineHeight: 1.45,
          }}
        >
          {description}
        </p>

        {/* Optional Tags Box (Step 01) */}
        {tagsText && (
          <div
            style={{
              padding: "6px 10px",
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "5px",
              fontFamily: "ui-monospace, monospace",
              fontSize: "11px",
              color: "#374151",
              marginBottom: "10px",
              wordBreak: "break-all",
            }}
          >
            {tagsText}
          </div>
        )}

        {/* Optional Badges (Step 05) */}
        {badges && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
            {badges.map((b) => (
              <span
                key={b.label}
                style={{
                  padding: "2px 8px",
                  backgroundColor: b.color === "orange" ? "#fef3c7" : "#f3f4f6",
                  border: b.color === "orange" ? "1px solid #fde68a" : "1px solid #e5e7eb",
                  color: b.color === "orange" ? "#92400e" : "#374151",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}

        {/* Optional Integration Rows (Step 07) */}
        {integrationRows && (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              overflow: "hidden",
              marginBottom: "10px",
            }}
          >
            {integrationRows.map((row, idx) => (
              <div
                key={row.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                  borderBottom:
                    idx < integrationRows.length - 1 ? "1px solid #f3f4f6" : "none",
                  fontSize: "11.5px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>
                    {row.name === "Jira" ? (
                      <JiraIcon />
                    ) : row.name === "Confluence" ? (
                      <ConfluenceIcon />
                    ) : (
                      <SlackIcon />
                    )}
                  </span>
                  <span style={{ fontWeight: 700, color: "#18181b" }}>{row.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "#6b7280" }}>{row.count}</span>
                  <span style={{ color: "#9ca3af", fontSize: "13px" }}>&gt;</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            style={{
              width: "100%",
              padding: "9px 14px",
              backgroundColor: actionPrimary ? "#f79f24" : "#ffffff",
              border: actionPrimary ? "2px solid #000000" : "1.5px solid #27272a",
              borderRadius: "6px",
              boxShadow: actionPrimary ? "2px 2px 0px #000000" : "1.5px 1.5px 0px #000000",
              fontWeight: 800,
              fontSize: "12.5px",
              color: "#18181b",
              cursor: "pointer",
              marginBottom: "8px",
              textAlign: "center",
            }}
          >
            {actionLabel}
          </button>
        )}

        {/* Complete Trigger / Checkbox footer */}
        <div
          onClick={onToggleComplete}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            color: isCompleted ? "#15803d" : "#6b7280",
            cursor: "pointer",
            fontWeight: isCompleted ? 700 : 500,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              border: isCompleted ? "none" : "1.5px solid #9ca3af",
              backgroundColor: isCompleted ? "#16a34a" : "transparent",
            }}
          />
          <span>
            {isCompleted
              ? "Completed"
              : `Complete when you ${title.toLowerCase().replace("get to know", "review").replace("learn how to run and test", "review the setup and testing guide")}.`}
          </span>
        </div>
      </div>
    </div>
  );
}
