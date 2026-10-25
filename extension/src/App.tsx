/**
 * File:        extension/src/App.tsx
 * Owner:       Shreyansh
 * Purpose:     The side panel shell: detects the current GitHub repo from the active tab, handles sign-in through the backend,
 *              and renders the header, mode switcher, and the feature-gated tabs — tab content comes from mock data.
 * Contains:    App functional component, SessionState type, TabId type, tabsForMode() helper, sign-in screen,
 *              welcome screen, loading/offline states, user footer, and the tabbed shell.
 * Status:      IMPLEMENTED — session (getMe/signIn/signOut), mode (getMode/setMode), live repo detection and
 *              feature-driven tabs wired; tab bodies still render mock data per the contract.
 * Depends on:  extension/src/types/mode.ts, extension/src/services/repoDetector.ts, extension/src/services/api.ts,
 *              extension/src/components/*, extension/src/tabs/*, extension/src/mocks/mockData.ts
 */

import { useEffect, useState } from "react";
import type { ModeFeatures, UserMode } from "./types/mode";
import type { SessionUser } from "./services/api";
import {
  BackendUnreachableError,
  getMe,
  getMode,
  setMode,
  signIn,
  signOut,
} from "./services/api";
import type { ModeResponse } from "./services/api";
import { localModeResponse } from "./services/api";
import type { RepoRef } from "./services/repoDetector";
import { detectRepoFromTabs } from "./services/repoDetector";
import { ModeSwitcher } from "./components/ModeSwitcher";
import { RepositoryHeader } from "./components/RepositoryHeader";
import { SignInView } from "./components/SignInView";
import { OpenSourceSignInView } from "./components/OpenSourceSignInView";
import { OpenSourceWelcomeView } from "./components/OpenSourceWelcomeView";
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

/** Panel footer: who is signed in, plus sign-out. */
function SessionFooter({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
  return (
    <footer
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        marginTop: "var(--space-4)",
        paddingTop: "var(--space-3)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      {user.avatar_url && (
        <img
          src={user.avatar_url}
          alt=""
          width={20}
          height={20}
          style={{ borderRadius: "50%" }}
        />
      )}
      <span
        style={{
          flex: 1,
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-muted)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        @{user.github_login}
      </span>
      <button
        type="button"
        onClick={onSignOut}
        style={{
          padding: "var(--space-1) var(--space-2)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          background: "var(--color-bg-subtle)",
          color: "var(--color-text)",
          cursor: "pointer",
          fontSize: "var(--font-size-xs)",
        }}
      >
        Sign out
      </button>
    </footer>
  );
}

export default function App() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const [modeInfo, setModeInfo] = useState<ModeResponse>(localModeResponse("open_source"));
  const [repo, setRepo] = useState<RepoRef | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signingInMode, setSigningInMode] = useState<UserMode | null>(null);
  const [signedOutStep, setSignedOutStep] = useState<"choose_mode" | "open_source_signin">("choose_mode");
  const [signInError, setSignInError] = useState<string | null>(null);
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

  /** Start the GitHub OAuth flow through the backend for the chosen mode. */
  async function handleSignIn(selectedMode: UserMode): Promise<void> {
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
    try {
      await signOut();
      setSession({ status: "signed_out" });
    } catch (error) {
      setSession({
        status: error instanceof BackendUnreachableError ? "offline" : "signed_out",
      });
    }
  }

  /** Apply the mode/features refreshed by the ModeSwitcher. */
  function handleModeChange(response: ModeResponse): void {
    setModeInfo(response);
    if (!response.features.slackShare) setDrawerOpen(false);
  }

  const user = session.status === "signed_in" ? session.user : null;

  /* ---------------- Loading ---------------- */
  if (session.status === "loading") {
    return (
      <div className="panel">
        <div
          className="panel__content"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            color: "var(--color-text-muted)",
          }}
        >
          Loading…
        </div>
      </div>
    );
  }

  /* ---------------- Sign in ---------------- */
  if (session.status === "signed_out") {
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

    return (
      <SignInView
        onSelectMode={(mode) => {
          if (mode === "open_source") {
            setSignedOutStep("open_source_signin");
          } else {
            void handleSignIn("company");
          }
        }}
        onSignIn={handleSignIn}
        isSigningIn={isSigningIn}
        signingInMode={signingInMode}
        error={signInError}
      />
    );
  }

  /* ---------------- Signed in (or offline) but not on a repo page ---------------- */
  if (!repo) {
    if (modeInfo.mode === "open_source" && user) {
      return (
        <OpenSourceWelcomeView
          user={user}
          onSignOut={() => void handleSignOut()}
        />
      );
    }

    return (
      <div className="panel">
        <div className="panel__content">
          <h2 style={{ fontSize: "var(--font-size-lg)" }}>Welcome to DevMinds</h2>
          <p style={{ color: "var(--color-text-muted)" }}>
            Navigate to a GitHub repository to get started.
          </p>
          {session.status === "offline" && (
            <p role="status" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-warning)" }}>
              Backend unreachable — showing mock data.{" "}
              <button
                type="button"
                onClick={() => setSessionCheck((tick) => tick + 1)}
                style={{
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  color: "var(--color-primary)",
                  cursor: "pointer",
                  fontSize: "var(--font-size-xs)",
                  textDecoration: "underline",
                }}
              >
                Retry
              </button>
            </p>
          )}
          {user && <SessionFooter user={user} onSignOut={() => void handleSignOut()} />}
        </div>
      </div>
    );
  }

  /* ---------------- The shell ---------------- */
  const features = modeInfo.features;
  const visibleTabs = tabsForMode(features);

  return (
    <div className="panel">
      <div className="panel__content">
        {session.status === "offline" && (
          <div
            role="status"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2)",
              marginBottom: "var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-bg-subtle)",
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-xs)",
            }}
          >
            <span>Backend unreachable — showing mock data.</span>
            <button
              type="button"
              onClick={() => setSessionCheck((tick) => tick + 1)}
              style={{
                padding: "var(--space-1) var(--space-2)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                cursor: "pointer",
                fontSize: "var(--font-size-xs)",
              }}
            >
              Retry
            </button>
          </div>
        )}

        <RepositoryHeader repo={repo} />
        <ModeSwitcher mode={modeInfo.mode} onChange={handleModeChange} />

        {features.slackShare && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            style={{
              marginTop: "var(--space-2)",
              width: "100%",
              padding: "var(--space-2)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-bg-subtle)",
              cursor: "pointer",
              fontSize: "var(--font-size-sm)",
            }}
          >
            Integration Settings
          </button>
        )}

        <nav
          role="tablist"
          aria-label="Repository sections"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-1)",
            margin: "var(--space-3) 0",
            borderBottom: "1px solid var(--color-border)",
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
                padding: "var(--space-2)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "var(--font-size-sm)",
                fontWeight: 600,
                color: activeTab === tab ? "var(--color-primary)" : "var(--color-text-muted)",
                borderBottom:
                  activeTab === tab
                    ? "2px solid var(--color-primary)"
                    : "2px solid transparent",
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>

        <section role="tabpanel" aria-label={TAB_LABELS[activeTab]}>
          {activeTab === "overview" && <OverviewTab overview={mockArchitecture.overview} />}
          {activeTab === "architecture" && <ArchitectureTab architecture={mockArchitecture} />}
          {activeTab === "contribute" && features.contributeTab && (
            <ContributeTab guide={mockContributorGuide} />
          )}
          {activeTab === "context" && features.contextTab && (
            <ContextTab context={mockRelatedContext} />
          )}
          {activeTab === "ask" && <AskAITab answer={mockChat} />}
        </section>

        <IntegrationDrawer
          integrations={mockIntegrations}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />

        {user && <SessionFooter user={user} onSignOut={() => void handleSignOut()} />}
      </div>
    </div>
  );
}