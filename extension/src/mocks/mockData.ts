/**
 * File:        extension/src/mocks/mockData.ts
 * Owner:       Shreyansh (team-shared fixtures)
 * Purpose:     Mock data matching the shared contracts so the UI renders before the backend exists.
 * Contains:    mockRepo, mockArchitecture, mockContributorGuide, mockRelatedContext, mockChat, mockIntegrations, mockLinks.
 * Status:      STUB, replace TODOs with real implementation
 * Depends on:  extension/src/types/architecture.ts (all shapes must match the schema)
 */

import type {
  ArchitectureBundle,
  ChatResponse,
  ContributorGuide,
  IntegrationStatus,
  RelatedContext,
  SourceLink,
} from "../types/architecture";

/** A fake repo the panel defaults to so tabs render without a real backend. */
export const mockRepo = { owner: "vercel", name: "next.js", branch: "main" };

/** A full ArchitectureBundle in contributor-mode shape. */
export const mockArchitecture: ArchitectureBundle = {
  repository: mockRepo,
  overview: {
    summary:
      "MOCK: next.js is a React framework for production web apps, giving you routing, server rendering and a build system out of the box.",
    primary_language: "TypeScript",
    stars: 128000,
    topics: ["react", "ssr", "framework"],
    last_updated: "2026-10-20T12:00:00Z",
  },
  technologies: [
    { name: "React", category: "frontend", evidence_files: ["packages/next/src/client/link.tsx"] },
    { name: "TypeScript", category: "language", evidence_files: ["package.json"] },
  ],
  entry_points: [
    {
      file: "packages/next/src/server/next.ts",
      reason: "Server bootstrap; starts the HTTP server and wires routing.",
    },
  ],
  components: [
    {
      id: "router",
      name: "Router",
      description: "Matches incoming URLs to page components.",
      files: ["packages/next/src/server/router.ts"],
    },
    {
      id: "renderer",
      name: "Renderer",
      description: "Renders matched pages to HTML on the server.",
      files: ["packages/next/src/server/render.tsx"],
    },
  ],
  connections: [
    { from: "router", to: "renderer", relationship: "hands matched pages to be rendered" },
  ],
  contributor_guide: {
    setup_steps: ["pnpm install", "pnpm dev"],
    contribution_rules: ["Run pnpm test before opening a PR.", "Keep PRs small."],
    good_first_issues: [
      { title: "Fix typo in docs", url: "https://github.com/vercel/next.js/issues/1" },
    ],
    maintainers: [{ login: "gaearon", avatar_url: "" }],
  },
  related_context: null,
};

/** Contributor-mode guide (Contribute tab). */
export const mockContributorGuide: ContributorGuide =
  mockArchitecture.contributor_guide ?? {
    setup_steps: [],
    contribution_rules: [],
    good_first_issues: [],
    maintainers: [],
  };

/** Company-mode Jira + Confluence context (Context tab). */
export const mockRelatedContext: RelatedContext = {
  jira_issues: [
    {
      key: "DEV-101",
      summary: "Migrate the router to the new matcher",
      url: "https://acme.atlassian.net/browse/DEV-101",
      status: "In Progress",
    },
  ],
  confluence_pages: [
    {
      id: "12345",
      title: "Onboarding: how we ship",
      url: "https://acme.atlassian.net/wiki/x/abc",
      space: "ENG",
    },
  ],
};

/** Mock chat answer with one source. */
export const mockChat: ChatResponse = {
  answer:
    "MOCK: Routing lives in packages/next/src/server/router.ts. To add a route, create a page file under the pages/ directory — the router picks it up automatically.",
  sources: [
    {
      title: "router.ts",
      url: "https://github.com/vercel/next.js/blob/main/packages/next/src/server/router.ts",
      sourceType: "github_file",
    },
  ],
};

/** Mock integration statuses (IntegrationDrawer). */
export const mockIntegrations: IntegrationStatus[] = [
  { provider: "github", available: true, connected: true, detail: "Signed in as stub-user" },
  { provider: "jira", available: true, connected: false, detail: "Not connected" },
  { provider: "confluence", available: true, connected: false, detail: "Not connected" },
  { provider: "slack", available: true, connected: false, detail: "Not connected" },
];

/** Mock saved links (reusable SourceCard fodder). */
export const mockLinks: SourceLink[] = [
  {
    title: "router.ts",
    url: "https://github.com/vercel/next.js/blob/main/packages/next/src/server/router.ts",
    sourceType: "github_file",
  },
  {
    title: "DEV-101",
    url: "https://acme.atlassian.net/browse/DEV-101",
    sourceType: "jira_issue",
  },
];
