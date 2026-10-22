/**
 * File:        extension/src/App.tsx
 * Owner:       Shreyansh
 * Purpose:     The side-panel shell: detects the current repo, renders the header, mode switcher, and the mode-appropriate tabs — all from mock data for now.
 * Contains:    App functional component, tab state, mode state, and the welcome screen for non-GitHub pages.
 * Status:      STUB, replace TODOs with real implementation — no real API calls yet
 * Depends on:  extension/src/types/mode.ts, extension/src/types/architecture.ts, extension/src/services/repoDetector.ts, extension/src/components/*, extension/src/tabs/*, extension/src/mocks/mockData.ts
 */

import { useEffect, useState } from "react";
import type { UserMode } from "./types/mode";
import { featuresForMode } from "./types/mode";
import type { RepoRef } from "./services/repoDetector";
import { detectRepoFromTabs } from "./services/repoDetector";
import { ModeSwitcher } from "./components/ModeSwitcher";
import { RepositoryHeader } from "./components/RepositoryHeader";
import { OverviewTab } from "./tabs/OverviewTab";
import { ArchitectureTab } from "./tabs/ArchitectureTab";
import { ContributeTab } from "./tabs/ContributeTab";
import { ContextTab } from "./tabs/ContextTab";
import { AskAITab } from "./tabs/AskAITab";
import { IntegrationDrawer } from "./tabs/IntegrationDrawer";
import {
  mockArchitecture,
  mockIntegrations,
  mockRelatedContext,
  mockRepo,
} from "./mocks/mockData";

/** The tabs the panel can show. Visibility is driven by the mode's features. */
type TabId = "overview" | "architecture" | "contribute" | "context" | "ask";

const TAB_LABELS: Record<TabId, string> = {
  overview: "Overview",
  architecture: "Architecture",
  contribute: "Contribute",
  context: "Context",
  ask: "Ask AI",
};

/** Decide which tabs a given mode may show. */
function tabsForMode(mode: UserMode): TabId[] {
  const features = featuresForMode(mode);
  const tabs: TabId[] = ["overview", "architecture"];
  // ContributeTab is contributor-only; ContextTab is company-only.
  if (features.contributeTab) tabs.push("contribute");
  if (features.contextTab) tabs.push("context");
  tabs.push("ask");
  return tabs;
}

export default function App() {
  const [mode, setMode] = useState<UserMode>("open_contributor");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [repo, setRepo] = useState<RepoRef | null>({
    owner: mockRepo.owner,
    repo: mockRepo.name,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Detect which GitHub repo the user is on. Falls back to the mock repo so the
  // panel is always demoable.
  useEffect(() => {
    let cancelled = false;
    detectRepoFromTabs()
      .then((detected) => {
        if (!cancelled && detected) setRepo(detected);
      })
      .catch(() => {
        /* keep the mock repo */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // When the mode changes, reset to the first tab the new mode allows.
  useEffect(() => {
    const allowed = tabsForMode(mode);
    if (!allowed.includes(activeTab)) {
      setActiveTab(allowed[0]);
    }
  }, [mode, activeTab]);

  // Welcome screen for non-GitHub pages.
  if (!repo) {
    return (
      <div className="panel">
        <div className="panel__content">
          <h2>Welcome to DevMinds</h2>
          <p>Navigate to a GitHub repository to get started.</p>
        </div>
      </div>
    );
  }

  const features = featuresForMode(mode);
  const visibleTabs = tabsForMode(mode);

  // The repository shown in the header (mock bundle for now).
  const repository = { ...mockArchitecture.repository, owner: repo.owner, name: repo.repo };

  return (
    <div className="panel">
      <div className="panel__content">
        <RepositoryHeader repository={repository} />
        <ModeSwitcher mode={mode} onChange={setMode} />

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

        {activeTab === "overview" && <OverviewTab overview={mockArchitecture.overview} />}
        {activeTab === "architecture" && <ArchitectureTab architecture={mockArchitecture} />}
        {activeTab === "contribute" && features.contributeTab && (
          <ContributeTab guide={mockArchitecture.contributor_guide ?? emptyGuide} />
        )}
        {activeTab === "context" && features.contextTab && (
          <ContextTab context={mockRelatedContext} />
        )}
        {activeTab === "ask" && <AskAITab answer={emptyChat} />}

        <IntegrationDrawer
          integrations={mockIntegrations}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      </div>
    </div>
  );
}

// Small local defaults so the tabs have something to render before the backend
// exists. TODO(Shreyansh): replace all of these with real API data.
const emptyGuide = { setup_steps: [], contribution_rules: [], good_first_issues: [], maintainers: [] };
const emptyChat = { answer: "", sources: [] };
