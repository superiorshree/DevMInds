/**
 * File:        extension/src/types/architecture.ts
 * Owner:       Devyani (co-owned with Shreyansh — shared contract)
 * Purpose:     TypeScript mirror of the backend's architecture schema (the ArchitectureBundle and its parts).
 * Contains:    Interfaces: Repository, Overview, Technology, EntryPoint, Component, Connection, GoodFirstIssue, Maintainer, ContributorGuide, JiraIssue, ConfluencePage, RelatedContext, ArchitectureBundle, SourceLink.
 * Status:      STUB, replace TODOs with real implementation
 * Depends on:  backend/app/schemas/architecture.py (keep in sync), backend/app/schemas/common.py
 */

/** Identifies which repository a bundle describes. */
export interface Repository {
  owner: string;
  name: string;
  branch: string;
}

/** A plain-English, one-paragraph summary of the repository. */
export interface Overview {
  summary: string;
  primary_language?: string | null;
  stars?: number | null;
  topics: string[];
  last_updated?: string | null;
}

/** One technology used by the repo, with the files that prove it. */
export interface Technology {
  name: string;
  category?: string | null;
  evidence_files: string[];
}

/** A file where execution starts, plus why it matters. */
export interface EntryPoint {
  file: string;
  reason: string;
}

/** A logical piece of the system. */
export interface Component {
  id: string;
  name: string;
  description: string;
  files: string[];
}

/** A relationship between two components (by component id). */
export interface Connection {
  from: string;
  to: string;
  relationship: string;
}

/** A welcoming issue for new contributors (contributor mode only). */
export interface GoodFirstIssue {
  title: string;
  url: string;
}

/** A repository maintainer (contributor mode only). */
export interface Maintainer {
  login: string;
  avatar_url?: string | null;
}

/** How to contribute — filled in Open Contributor mode only. */
export interface ContributorGuide {
  setup_steps: string[];
  contribution_rules: string[];
  good_first_issues: GoodFirstIssue[];
  maintainers: Maintainer[];
}

/** A linked Jira issue (company mode only). */
export interface JiraIssue {
  key: string;
  summary: string;
  url: string;
  status?: string | null;
}

/** A linked Confluence page (company mode only). */
export interface ConfluencePage {
  id: string;
  title: string;
  url: string;
  space?: string | null;
}

/** Jira + Confluence context — filled in Company Employee mode only. */
export interface RelatedContext {
  jira_issues: JiraIssue[];
  confluence_pages: ConfluencePage[];
}

/**
 * The full analysis result for one repository.
 * `contributor_guide` and `related_context` are mode-dependent and optional.
 */
export interface ArchitectureBundle {
  repository: Repository;
  overview: Overview;
  technologies: Technology[];
  entry_points: EntryPoint[];
  components: Component[];
  connections: Connection[];
  contributor_guide?: ContributorGuide | null;
  related_context?: RelatedContext | null;
}

/** A link to a source of truth (GitHub file, Jira issue, Confluence page). */
export interface SourceLink {
  id?: string | null;
  title: string;
  url: string;
  sourceType: string;
}

/** The shape returned by POST /api/chat. */
export interface ChatResponse {
  answer: string | null;
  sources: SourceLink[];
  provider?: "ollama" | "external" | null;
  error?: {
    code: string;
    message: string;
  } | null;
  connector_errors?: Array<{
    source_type: string;
    code: string;
    message: string;
  }>;
}

/** A provider's connection status as returned by GET /api/integrations. */
export interface IntegrationStatus {
  provider: string;
  available: boolean;
  connected: boolean;
  detail: string;
}
