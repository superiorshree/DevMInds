/**
 * File:        extension/src/App.tsx
 * Owner:       Shreyansh
 * Purpose:     The side panel shell: manages the sign-in flow (choose mode -> sign in / integrations),
 *              detects the current GitHub repo from the active tab, and renders the
 *              repository card with "Analyze Repository" CTA before unlocking feature-gated tabs.
 * Contains:    App functional component, SessionState type, TabId type, tabsForMode() helper,
 *              analysis state and handleAnalyze, sign-in screens, integrations screen, repo connect screen,
 *              settings screen, welcome screen, loading/offline states, and the tabbed shell.
 * Status:      REAL — session, live repo detection, real repository analysis, and feature-driven tabs wired.
 * Depends on:  extension/src/types/mode.ts, extension/src/services/repoDetector.ts, extension/src/services/api.ts,
 *              extension/src/components/*, extension/src/tabs/*, extension/src/mocks/mockData.ts
 */

import { useEffect, useState } from "react";
import type { ModeFeatures, UserMode } from "./types/mode";
import type { SessionUser } from "./services/api";
import {
  BackendUnreachableError,
  analyzeRepository,
  getMe,
  getMode,
  setMode,
  signIn,
  signOut,
} from "./services/api";
import type { ArchitectureBundle } from "./types/architecture";
import type { ModeResponse } from "./services/api";
import { localModeResponse } from "./services/api";
import type { RepoRef } from "./services/repoDetector";
import { detectRepoFromTabs } from "./services/repoDetector";
import { SignInView } from "./components/SignInView";
import { OpenSourceSignInView } from "./components/OpenSourceSignInView";
import { OpenSourceWelcomeView } from "./components/OpenSourceWelcomeView";
import { CompanyIntegrationsView } from "./components/CompanyIntegrationsView";
import { CompanyRepoConnectView } from "./components/CompanyRepoConnectView";
import { CompanyOnboardingRoadmapView } from "./components/CompanyOnboardingRoadmapView";
import { SettingsView } from "./components/SettingsView";
import { OpenSourceMainScreen } from "./components/OpenSourceMainScreen";
import { OpenSourceExpandedView, type ExpandedTab } from "./components/OpenSourceExpandedView";
import { OpenSourceAiMentorChat } from "./components/OpenSourceAiMentorChat";
import { OverviewTab } from "./tabs/OverviewTab";
import { ArchitectureTab } from "./tabs/ArchitectureTab";
import { ContributeTab } from "./tabs/ContributeTab";
import { ContextTab } from "./tabs/ContextTab";
import { AskAITab } from "./tabs/AskAITab";
import { IntegrationDrawer } from "./tabs/IntegrationDrawer";
import {
  mockArchitecture,
  mockChat,
  mockContributorGuide,
  mockIntegrations,
  mockRelatedContext,
} from "./mocks/mockData";

/** Where the session stands: checking, signed out, signed in, or backend unreachable. */
type SessionState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "signed_in"; user: SessionUser }
  | { status: "offline" };

/** The tabs the panel can show. Visibility is driven by the mode's features. */
type TabId = "overview" | "architecture" | "contribute" | "context" | "ask";

const TAB_LABELS: Record<TabId, string> = {
  overview: "Overview",
  architecture: "Architecture",
  contribute: "Contribute",
  context: "Context",
  ask: "Ask AI",
};

/**
 * Decide which tabs the current mode may show — this list comes ONLY from the
 * features the mode returns. Hiding a tab is a convenience, not security: the
 * backend gates every request server-side.
 */
function tabsForMode(features: ModeFeatures): TabId[] {
  const tabs: TabId[] = ["overview", "architecture"];
  if (features.contributeTab) tabs.push("contribute");
  if (features.contextTab) tabs.push("context");
  tabs.push("ask");
  return tabs;
}

/** Spark / sparkle icon for Analyze Repository button */
function SparkleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z"
        fill="#000000"
      />
      <path
        d="M19 2 L19.8 5.2 L23 6 L19.8 6.8 L19 10 L18.2 6.8 L15 6 L18.2 5.2 Z"
        fill="#000000"
      />
    </svg>
  );
}

/** GitHub Octocat icon */
function GitHubIcon({ size = 16, color = "#18181b" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017C2 16.446 4.87 20.198 8.84 21.523C9.34 21.616 9.52 21.306 9.52 21.042C9.52 20.806 9.51 20.007 9.51 19.167C6.73 19.771 6.14 17.828 6.14 17.828C5.68 16.671 5.03 16.362 5.03 16.362C4.12 15.742 5.1 15.755 5.1 15.755C6.1 15.827 6.63 16.786 6.63 16.786C7.52 18.318 8.97 17.876 9.54 17.62C9.63 16.974 9.89 16.531 10.17 16.279C7.95 16.027 5.62 15.166 5.62 11.332C5.62 10.239 6.01 9.348 6.66 8.649C6.55 8.398 6.21 7.378 6.76 6.002C6.76 6.002 7.6 5.733 9.51 7.027C10.31 6.804 11.16 6.693 12 6.689C12.84 6.693 13.69 6.804 14.49 7.027C16.4 5.733 17.24 6.002 17.24 6.002C17.79 7.378 17.45 8.398 17.34 8.649C17.99 9.348 18.38 10.239 18.38 11.332C18.38 15.176 16.04 16.024 13.82 16.271C14.18 16.582 14.5 17.2 14.5 18.156C14.5 19.525 14.49 20.627 14.49 20.963C14.49 21.229 14.67 21.545 15.18 21.444C19.14 20.111 22 16.416 22 12.017C22 6.484 17.522 2 12 2Z"
        fill={color}
      />
    </svg>
  );
}

/** Header bar used across all signed-in states */
function AppHeader({
  user,
  onSignOut,
  onOpenSettings,
}: {
  user: SessionUser | null;
  onSignOut: () => void;
  onOpenSettings?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initial = user?.github_login ? user.github_login.charAt(0).toUpperCase() : "P";

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "11px 16px",
        borderBottom: "1px solid #e5e0d8",
        backgroundColor: "#faf7f2",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Logo + Name */}
      <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
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
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
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
            fontSize: "15px",
            letterSpacing: "-0.01em",
            color: "#18181b",
          }}
        >
          DevMinds
        </span>
        {/* Repo detected pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            backgroundColor: "transparent",
            fontSize: "11px",
            color: "#16a34a",
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: "#16a34a",
            }}
          />
          Repository detected
        </div>
      </div>

      {/* User Avatar + Dropdown */}
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
                Settings
              </button>
            )}
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
          </div>
        )}
      </div>
    </header>
  );
}

/** Current Repository card */
function RepoCard({ repo }: { repo: RepoRef }) {
  const openOnGitHub = () => {
    const url = `https://github.com/${repo.owner}/${repo.repo}`;
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      void chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank");
    }
  };

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(`${repo.owner}/${repo.repo}`);
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1.5px solid #27272a",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "16px",
      }}
    >
      {/* Card header label */}
      <div
        style={{
          fontSize: "10px",
          fontWeight: 800,
          color: "#9ca3af",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "12px",
        }}
      >
        CURRENT REPOSITORY
      </div>

      {/* Action icons row (top right) */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          marginBottom: "8px",
          marginTop: "-28px",
        }}
      >
        <button
          type="button"
          onClick={openOnGitHub}
          title="Open on GitHub"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px",
            color: "#6b7280",
          }}
        >
          {/* External link icon */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
        <button
          type="button"
          onClick={copyToClipboard}
          title="Copy repo name"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px",
            color: "#6b7280",
          }}
        >
          {/* Copy icon */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </div>

      {/* Repo identity row */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            backgroundColor: "#18181b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <GitHubIcon size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 800, fontSize: "15px", color: "#111827" }}>
              {repo.owner} / {repo.repo}
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#374151",
                backgroundColor: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                padding: "1px 5px",
              }}
            >
              Public
            </span>
          </div>
          {/* Branch chip */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>main</span>
          </div>
        </div>
      </div>

      {/* Description placeholder */}
      <p style={{ fontSize: "12.5px", color: "#6b7280", margin: "0 0 12px 0", lineHeight: 1.45 }}>
        Navigate to a GitHub repository page to analyze its codebase.
      </p>

      {/* Detected badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          backgroundColor: "#166534",
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: 600,
          padding: "5px 10px",
          borderRadius: "20px",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Detected from current tab
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const [modeInfo, setModeInfo] = useState<ModeResponse>(localModeResponse("open_source"));
  const [repo, setRepo] = useState<RepoRef | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signingInMode, setSigningInMode] = useState<UserMode | null>(null);
  const [signedOutStep, setSignedOutStep] = useState<
    "choose_mode" | "open_source_signin" | "company_integrations" | "company_repo_connect" | "settings"
  >("choose_mode");
  const [companyStep, setCompanyStep] = useState<"integrations" | "repo_connect" | "completed">("integrations");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [analyzeStarted, setAnalyzeStarted] = useState(false);
  const [analyzeHovered, setAnalyzeHovered] = useState(false);
  const [analysis, setAnalysis] = useState<ArchitectureBundle | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  /** Trigger repository analysis using analyzeRepository from api.ts */
  const handleAnalyze = async (): Promise<void> => {
    if (!repo) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await analyzeRepository(repo.owner, repo.repo);
      setAnalysis(result);
    } catch (error) {
      if (error instanceof BackendUnreachableError || session.status === "offline") {
        setAnalysis(mockArchitecture);
      } else {
        setAnalysisError(error instanceof Error ? error.message : "Failed to analyze repository");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  // Reset analysis when repository changes
  useEffect(() => {
    setAnalysis(null);
    setAnalysisError(null);
  }, [repo?.owner, repo?.repo]);
  const [openSourceView, setOpenSourceView] = useState<"main" | "expanded" | "ai_mentor">("main");
  const [expandedTab, setExpandedTab] = useState<ExpandedTab>("overview");
  // Bumped by the "Retry" button to re-check the session after a backend outage.
  const [sessionCheck, setSessionCheck] = useState(0);

  // Which GitHub repo is the user on? Re-detect on every tab switch/navigation.
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.tabs) return;
    let cancelled = false;

    const refresh = (): void => {
      detectRepoFromTabs()
        .then((detected) => {
          if (!cancelled) setRepo(detected);
        })
        .catch(() => {
          if (!cancelled) setRepo(null);
        });
    };

    refresh();
    chrome.tabs.onActivated.addListener(refresh);
    chrome.tabs.onUpdated.addListener(refresh);
    return () => {
      cancelled = true;
      chrome.tabs.onActivated.removeListener(refresh);
      chrome.tabs.onUpdated.removeListener(refresh);
    };
  }, []);

  // Verify the stored session against the backend. 401 -> sign-in screen,
  // unreachable backend -> run on mock data so the UI still works.
  useEffect(() => {
    let cancelled = false;
    setSession({ status: "loading" });
    getMe()
      .then((user) => {
        if (!cancelled) setSession({ status: "signed_in", user });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof BackendUnreachableError) {
          setSession({ status: "offline" });
        } else {
          setSession({ status: "signed_out" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionCheck]);

  // Once signed in (or offline), load the mode + features that gate the tabs.
  useEffect(() => {
    if (session.status !== "signed_in" && session.status !== "offline") return;
    let cancelled = false;
    getMode()
      .then((response) => {
        if (!cancelled) setModeInfo(response);
      })
      .catch(() => {
        /* keep the local defaults so the shell still renders */
      });
    return () => {
      cancelled = true;
    };
  }, [session.status]);

  // When the mode changes, reset to the first tab the new mode allows.
  useEffect(() => {
    const allowed = tabsForMode(modeInfo.features);
    if (!allowed.includes(activeTab)) {
      setActiveTab(allowed[0]);
    }
  }, [modeInfo, activeTab]);

  /** Start the GitHub OAuth flow for the chosen mode. */
  async function handleSignIn(selectedMode: UserMode = "open_source"): Promise<void> {
    setIsSigningIn(true);
    setSigningInMode(selectedMode);
    setSignInError(null);
    try {
      const user = await signIn();
      try {
        const refreshed = await setMode(selectedMode);
        setModeInfo(refreshed);
        setSession({ status: "signed_in", user: { ...user, mode: selectedMode } });
      } catch {
        setModeInfo(localModeResponse(selectedMode));
        setSession({ status: "signed_in", user: { ...user, mode: selectedMode } });
      }
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
    } finally {
      setIsSigningIn(false);
      setSigningInMode(null);
    }
  }

  /** Log out locally and server-side; a dead backend still clears the token. */
  async function handleSignOut(): Promise<void> {
    setSignedOutStep("choose_mode");
    setCompanyStep("integrations");
    setShowSettings(false);
    setAnalyzeStarted(false);
    try {
      await signOut();
      setSession({ status: "signed_out" });
    } catch (error) {
      setSession({
        status: error instanceof BackendUnreachableError ? "offline" : "signed_out",
      });
    }
  }

  const user = session.status === "signed_in" ? session.user : null;

  /* ---------------- Loading ---------------- */
  if (session.status === "loading") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#faf7f2",
          color: "#9ca3af",
          fontSize: "14px",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        Loading…
      </div>
    );
  }

  /* ---------------- Settings View (When open) ---------------- */
  if (showSettings) {
    return (
      <SettingsView
        user={user}
        onBack={() => setShowSettings(false)}
        onGoToHome={() => setShowSettings(false)}
        onGoToIntegrations={() => {
          setShowSettings(false);
          setCompanyStep("integrations");
        }}
        onSignOut={() => void handleSignOut()}
      />
    );
  }

  /* ---------------- Sign in (Before user is signed in) ---------------- */
  if (session.status === "signed_out") {
    // Settings screen if accessed from signed-out Company Employee flow
    if (signedOutStep === "settings") {
      return (
        <SettingsView
          user={null}
          onBack={() => setSignedOutStep("company_repo_connect")}
          onGoToHome={() => setSignedOutStep("company_repo_connect")}
          onGoToIntegrations={() => setSignedOutStep("company_integrations")}
          onSignOut={() => void handleSignOut()}
        />
      );
    }

    // Company Employee flow chosen: show "Connect Your Company Repository"
    if (signedOutStep === "company_repo_connect") {
      return (
        <CompanyRepoConnectView
          user={null}
          onBack={() => setSignedOutStep("company_integrations")}
          onGoToIntegrations={() => setSignedOutStep("company_integrations")}
          onGoToSettings={() => setSignedOutStep("settings")}
          onSelectRepo={(chosenRepo) => {
            setRepo(chosenRepo);
            void handleSignIn("company");
          }}
          onSignOut={() => void handleSignOut()}
        />
      );
    }

    // Company Employee flow chosen: show "Set up your integrations"
    if (signedOutStep === "company_integrations") {
      return (
        <CompanyIntegrationsView
          user={null}
          onContinue={() => setSignedOutStep("company_repo_connect")}
          onChangeMode={() => setSignedOutStep("choose_mode")}
          onSignOut={() => void handleSignOut()}
        />
      );
    }

    // Open-Source flow chosen: show GitHub sign-in screen
    if (signedOutStep === "open_source_signin") {
      return (
        <OpenSourceSignInView
          onSignIn={() => handleSignIn("open_source")}
          isSigningIn={isSigningIn}
          error={signInError}
          onChangeMode={() => setSignedOutStep("choose_mode")}
        />
      );
    }

    // Step 1: Initial screen — "How will you use DevMinds?" (Open-Source Contributor vs Company Employee)
    return (
      <SignInView
        onSelectMode={(mode) => {
          if (mode === "open_source") {
            setSignedOutStep("open_source_signin");
          } else {
            setSignedOutStep("company_integrations");
          }
        }}
        onSignIn={handleSignIn}
        isSigningIn={isSigningIn}
        signingInMode={signingInMode}
        error={signInError}
      />
    );
  }

  /* ---------------- Signed in: Company Employee Flow ---------------- */
  if (modeInfo.mode === "company" && companyStep !== "completed") {
    if (companyStep === "integrations") {
      return (
        <CompanyIntegrationsView
          user={user}
          onContinue={() => setCompanyStep("repo_connect")}
          onChangeMode={async () => {
            try {
              const refreshed = await setMode("open_source");
              setModeInfo(refreshed);
            } catch {
              setModeInfo(localModeResponse("open_source"));
            }
          }}
          onSignOut={() => void handleSignOut()}
        />
      );
    }

    if (companyStep === "repo_connect") {
      return (
        <CompanyRepoConnectView
          user={user}
          onBack={() => setCompanyStep("integrations")}
          onGoToIntegrations={() => setCompanyStep("integrations")}
          onGoToSettings={() => setShowSettings(true)}
          onSelectRepo={(chosenRepo) => {
            setRepo(chosenRepo);
            setCompanyStep("completed");
          }}
          onSignOut={() => void handleSignOut()}
        />
      );
    }
  }

  /* ---------------- Signed in: Welcome screen when not on a repo page ---------------- */
  if (!repo) {
    if (user) {
      return (
        <OpenSourceWelcomeView
          user={user}
          onSignOut={() => void handleSignOut()}
        />
      );
    }

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#faf7f2",
          color: "#9ca3af",
          fontSize: "14px",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {session.status === "offline" ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p style={{ color: "#f97316", marginBottom: "12px" }}>
              Backend unreachable — showing mock data.
            </p>
            <button
              type="button"
              onClick={() => setSessionCheck((tick) => tick + 1)}
              style={{
                padding: "8px 16px",
                border: "1.5px solid #18181b",
                borderRadius: "6px",
                background: "#ffffff",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          "Navigate to a GitHub repository to get started."
        )}
      </div>
    );
  }

  /* ---------------- Signed in + Repo detected: Show Analyze Repository CTA or tabs ---------------- */
  const features = modeInfo.features;
  const visibleTabs = tabsForMode(features);

  // For Company Employees: show "Your Onboarding Roadmap" after repo is detected and ready to analyse!
  if (modeInfo.mode === "company" && !analyzeStarted) {
    return (
      <CompanyOnboardingRoadmapView
        repo={repo}
        user={user}
        onExploreStep={(stepNum) => {
          // Handled internally by CompanyOnboardingRoadmapView & CompanyOnboardingStepDetailView
          if (stepNum === 1) setActiveTab("overview");
          if (stepNum === 2) setActiveTab("architecture");
          if (stepNum === 3) setActiveTab("context");
          if (stepNum === 4) setActiveTab("overview");
          if (stepNum === 5) setActiveTab("context");
          if (stepNum === 6) setActiveTab("overview");
          if (stepNum === 7) setActiveTab("context");
          if (stepNum === 8) setActiveTab("contribute");
        }}
        onOpenAiMentor={() => {
          // Handled internally by CompanyOnboardingRoadmapView to show the AI Mentor Chat
        }}
        onSignOut={() => void handleSignOut()}
        onChangeMode={async () => {
          try {
            const refreshed = await setMode("open_source");
            setModeInfo(refreshed);
          } catch {
            setModeInfo(localModeResponse("open_source"));
          }
        }}
        onOpenSettings={() => setShowSettings(true)}
      />
    );
  }

  // Before "Analyze Repository" is clicked for open-source — show the repo card + Analyze button
  if (!analyzeStarted) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          backgroundColor: "#faf7f2",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <AppHeader
          user={user}
          onSignOut={() => void handleSignOut()}
          onOpenSettings={() => setShowSettings(true)}
        />

        <main style={{ padding: "20px 16px 28px", flex: 1 }}>
          <RepoCard repo={repo} />

          {/* Analyze Repository CTA */}
          <button
            type="button"
            id="analyze-repo-btn"
            onClick={() => {
              setAnalyzeStarted(true);
              void handleAnalyze();
            }}
            onMouseEnter={() => setAnalyzeHovered(true)}
            onMouseLeave={() => setAnalyzeHovered(false)}
            style={{
              width: "100%",
              padding: "14px 16px",
              backgroundColor: "#f79f24",
              color: "#000000",
              border: "2px solid #000000",
              borderRadius: "8px",
              boxShadow: analyzeHovered
                ? "4px 4px 0px #000000"
                : "2.5px 2.5px 0px #000000",
              transform: analyzeHovered ? "translate(-1.5px, -1.5px)" : "translate(0, 0)",
              fontWeight: 700,
              fontSize: "15px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              transition: "all 0.12s ease-in-out",
              marginBottom: "12px",
            }}
          >
            <SparkleIcon />
            <span>Analyze Repository</span>
          </button>

          <p
            style={{
              fontSize: "13px",
              color: "#6b7280",
              textAlign: "left",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Explore the project structure, important files, and architecture with AI.
          </p>

          {/* Offline banner */}
          {session.status === "offline" && (
            <div
              role="status"
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
                marginTop: "16px",
                border: "1px solid #fcd34d",
                borderRadius: "8px",
                background: "#fffbeb",
                color: "#92400e",
                fontSize: "12px",
              }}
            >
              <span>Backend unreachable — showing mock data.</span>
              <button
                type="button"
                onClick={() => setSessionCheck((tick) => tick + 1)}
                style={{
                  padding: "3px 8px",
                  border: "1px solid #92400e",
                  borderRadius: "4px",
                  background: "transparent",
                  color: "#92400e",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                Retry
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

  /* ---------------- Open-Source Post-Analysis Experience (Exact Full Size for All Views) ---------------- */
  if (modeInfo.mode === "open_source") {
    if (openSourceView === "expanded") {
      return (
        <OpenSourceExpandedView
          repo={repo}
          activeTab={expandedTab}
          onTabChange={(tab) => setExpandedTab(tab)}
          onClose={() => setOpenSourceView("main")}
          onOpenAiMentor={() => {
            setExpandedTab("ai_mentor");
            setOpenSourceView("expanded");
          }}
        />
      );
    }

    return (
      <OpenSourceMainScreen
        repo={repo}
        user={user}
        onOpenFeature={(feature) => {
          setExpandedTab(feature);
          setOpenSourceView("expanded");
        }}
        onOpenAiMentor={() => {
          setExpandedTab("ai_mentor");
          setOpenSourceView("expanded");
        }}
        onChangeMode={() => {
          setSession({ status: "signed_out" });
          setSignedOutStep("choose_mode");
        }}
        onSignOut={() => void handleSignOut()}
      />
    );
  }

  /* ---------------- The tabbed shell (after Analyze is clicked for company) ---------------- */
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#faf7f2",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <AppHeader
        user={user}
        onSignOut={() => void handleSignOut()}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div style={{ padding: "16px 16px 24px" }}>
        {session.status === "offline" && (
          <div
            role="status"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              marginBottom: "12px",
              border: "1px solid #fcd34d",
              borderRadius: "8px",
              background: "#fffbeb",
              color: "#92400e",
              fontSize: "12px",
            }}
          >
            <span>Backend unreachable — showing mock data.</span>
            <button
              type="button"
              onClick={() => setSessionCheck((tick) => tick + 1)}
              style={{
                padding: "3px 8px",
                border: "1px solid #92400e",
                borderRadius: "4px",
                background: "transparent",
                color: "#92400e",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Return to Onboarding Roadmap for company mode */}
        {modeInfo.mode === "company" && (
          <button
            type="button"
            onClick={() => setAnalyzeStarted(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              marginBottom: "12px",
              backgroundColor: "#ffffff",
              border: "1.5px solid #27272a",
              borderRadius: "6px",
              boxShadow: "1.5px 1.5px 0px #000000",
              fontSize: "12px",
              fontWeight: 700,
              color: "#18181b",
              cursor: "pointer",
            }}
          >
            <span>←</span>
            <span>Back to Onboarding Roadmap</span>
          </button>
        )}

        {/* Repo title + link */}
        <div style={{ marginBottom: "4px" }}>
          <h2
            style={{
              margin: "0 0 4px 0",
              fontSize: "18px",
              fontWeight: 800,
              color: "#111827",
              letterSpacing: "-0.02em",
            }}
          >
            {repo.owner} / {repo.repo}
          </h2>
          <button
            type="button"
            onClick={() => {
              const url = `https://github.com/${repo.owner}/${repo.repo}`;
              if (typeof chrome !== "undefined" && chrome.tabs?.create) {
                void chrome.tabs.create({ url });
              } else {
                window.open(url, "_blank");
              }
            }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#f97316",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            View on GitHub ↗
          </button>
        </div>

        {/* Tab bar */}
        <nav
          role="tablist"
          aria-label="Repository sections"
          style={{
            display: "flex",
            gap: "0",
            margin: "12px 0 0 0",
            borderBottom: "2px solid #e5e0d8",
          }}
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 10px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                color: activeTab === tab ? "#f97316" : "#6b7280",
                borderBottom:
                  activeTab === tab
                    ? "2px solid #f97316"
                    : "2px solid transparent",
                marginBottom: "-2px",
                transition: "color 0.1s",
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <section
          role="tabpanel"
          aria-label={TAB_LABELS[activeTab]}
          style={{ marginTop: "16px" }}
        >
          {activeTab === "overview" && (
            <OverviewTab
              analysis={analysis}
              loading={analyzing}
              error={analysisError}
              onAnalyze={() => void handleAnalyze()}
            />
          )}
          {activeTab === "architecture" && <ArchitectureTab architecture={mockArchitecture} />}
          {activeTab === "contribute" && features.contributeTab && (
            <ContributeTab guide={mockContributorGuide} />
          )}
          {activeTab === "context" && features.contextTab && (
            <ContextTab context={mockRelatedContext} />
          )}
          {activeTab === "ask" && <AskAITab answer={mockChat} />}
        </section>

        {/* Settings & Integration Drawer CTA */}
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          style={{
            marginTop: "16px",
            width: "100%",
            padding: "10px",
            border: "1.5px solid #27272a",
            borderRadius: "8px",
            background: "#ffffff",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Settings & Privacy</span>
        </button>

        <IntegrationDrawer
          integrations={mockIntegrations}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      </div>
    </div>
  );
}