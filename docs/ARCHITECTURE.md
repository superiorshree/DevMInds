# DevMinds Architecture

This document explains how the pieces fit together. For endpoint-level detail
see [API_CONTRACT.md](API_CONTRACT.md).

## The golden rule

> **The backend finds and verifies facts. The AI explains them in simple words.
> The extension only displays them.**

Consequences:

- No secret keys ever go inside the extension. The extension is untrusted.
- Anything that costs trust (reading a private repo, calling Jira, calling an
  LLM) happens in the backend.
- The extension can be rebuilt from the API contract alone.

## Layers

```mermaid
flowchart TB
    subgraph L1["Layer 1 — Chrome Extension (untrusted)"]
        A1[Side Panel UI: React + TS]
        A2[api.ts — one API client]
        A3[mockData.ts — offline fallback]
    end

    subgraph L2["Layer 2 — FastAPI Backend (trusted)"]
        B1[API routes app/api/*]
        B2["Mode enforcement app/core/modes.py"]
        B3[Services app/services/*]
        B4["AI service (one, shared)"]
    end

    subgraph L3["Layer 3 — Adapters app/integrations/*"]
        C1[github.py]
        C2[jira.py]
        C3[confluence.py]
        C4[slack.py]
    end

    subgraph L4["Layer 4 — Data"]
        D1[(PostgreSQL)]
    end

    L1 -->|HTTPS JSON| L2
    L2 --> L3
    L2 --> D1
    L3 -->|provider APIs| E1[(GitHub / Jira / Confluence / Slack)]
    B4 --> E2[(LLM provider)]
```

| Layer | Responsibility | Lives in |
|---|---|---|
| Extension | Display, layout, mode-aware tab visibility | `extension/` |
| Backend routes | Validate, enforce mode, shape responses | `backend/app/api/` |
| Services | One analyzer, one architecture service, one context service, one chat service | `backend/app/services/` |
| Adapters | One adapter per provider, all behind `base.py` | `backend/app/integrations/` |
| Data | Users, saved links, analysis cache | `backend/app/database/` |

## One of each

To avoid four people building four of the same thing:

- **One repository analyzer** — `services/repository_analyzer.py` produces the
  single `ArchitectureBundle` for both modes.
- **One architecture schema** — `schemas/architecture.py`, mirrored by
  `extension/src/types/architecture.ts`.
- **One AI service** — every LLM call goes through it, with structured-output
  validation.
- **One set of reusable UI components** — `SourceCard.tsx` renders a GitHub
  file, a contribution resource, a Jira issue or a Confluence page with the
  same `title / description / sourceType / url` props.
- **One capabilities config** — `core/modes.py`. The extension reads it from
  `GET /api/me/mode`; it never invents features.
- **One adapter interface** — `integrations/base.py`. Every provider implements
  `check_connection()` plus `fetch`/`send`, returns clean data with source
  links, and handles errors and rate limits uniformly.

## Authentication vs authorization

Two different questions, two different mechanisms:

```mermaid
sequenceDiagram
    participant Ext as Extension
    participant API as FastAPI route
    participant Sec as core/security.py
    participant Modes as core/modes.py
    participant GH as github.py adapter

    Ext->>API: GET /api/repositories/x/y/context (session cookie)
    API->>Sec: get_current_user() — WHO is this? (authn)
    Sec-->>API: CurrentUser(mode="open_source")
    API->>Modes: require_feature("contextTab") — MAY they? (authz)
    Modes-->>API: HTTP 403 Feature 'contextTab' not available
    API-->>Ext: 403
```

- **Authentication** (`core/security.py`): proves *who* you are via the GitHub
  OAuth session. Returns the current user, including their server-side mode.
- **Authorization** (`core/modes.py`): checks *what that user's mode allows*
  using `require_feature("...")` on the route.

**Never trust a mode value sent by the frontend.** The mode used for
authorization always comes from the server-side session, via the stubbed
current-user function (real session lookup is a TODO). The extension's mode
switcher only changes what is *shown*; the server re-checks every gated call.

## Mode switching rules

1. `PUT /api/me/mode` sets the user's mode server-side and returns the new
   feature list.
2. The extension re-renders tabs from that feature list.
3. Every gated endpoint still calls `require_feature(...)` — switching mode in
   the UI cannot unlock a company-only endpoint.
4. Company-only endpoints return `403` when the server-side mode lacks the
   feature.

## Analyze data flow

```mermaid
sequenceDiagram
    participant U as User (on a github.com page)
    participant Ext as Extension
    participant API as repositories.py
    participant An as repository_analyzer
    participant GH as github.py
    participant DB as PostgreSQL

    U->>Ext: Opens side panel on a repo page
    Ext->>Ext: repoDetector.ts parses owner/repo from tab URL
    Ext->>API: POST /api/repositories/analyze {owner, name, branch}
    API->>API: require_feature("privateRepos") if repo is private
    API->>An: analyze(owner, name, branch, mode)
    An->>GH: fetch metadata, tree, key files (rate-limit aware)
    GH-->>An: raw facts + source URLs
    An->>An: build ArchitectureBundle (facts only)
    An-->>API: ArchitectureBundle
    API-->>Ext: 202 job / or 200 bundle from cache
    Ext->>API: GET /api/repositories/{owner}/{repo}/architecture
    API-->>Ext: bundle (contributor_guide OR related_context by mode)
    Ext->>Ext: render tabs; AI explains facts in simple words
```

## Chat data flow

```mermaid
sequenceDiagram
    participant U as User
    participant Ext as AskAITab
    participant API as chat.py
    participant Sec as security.py
    participant CS as chat_service
    participant AI as AI service
    participant Src as github / jira / confluence adapters

    U->>Ext: Types a question
    Ext->>API: POST /api/chat {owner, name, question}
    API->>Sec: get_current_user() — server-side mode, not the body's
    API->>CS: answer(question, repo, mode)
    CS->>Src: gather permitted context for THIS mode
    CS->>AI: prompt + context -> structured output
    AI-->>CS: {answer, sources[]}
    CS-->>API: validated answer with source links
    API-->>Ext: {answer, sources}
    Ext->>Ext: render answer + SourceCard per source
```

## Layout constraint

The side panel can be dragged from ~350px to ~75% of the screen. All layouts use
flexbox/grid with wrapping — never fixed pixel widths. Design tokens live in
`extension/src/styles/tokens.css`.

## Security notes

- `.env` is git-ignored; only `.env.example` (names, no values) is committed.
- The extension holds **no** secrets — only `VITE_API_BASE_URL`.
- CORS is restricted to the local extension origin during the hackathon.
- Rate limits from providers surface as `429` with a clear message, never as a
  crash.
