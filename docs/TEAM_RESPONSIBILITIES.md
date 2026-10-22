# Team Responsibilities

Everyone works in parallel. Ownership below means: **you decide, you ship, you
review others' changes to your files.** Need to touch someone else's file? Ask
them in the chat first.

## Mandatory header comment

Every new `.py`, `.ts` and `.tsx` file starts with this header (use the
language's comment syntax):

```
File:        <path relative to repo root>
Owner:       <teammate name>
Purpose:     <one or two plain-English sentences>
Contains:    <functions / components / classes>
Status:      STUB, replace TODOs with real implementation
Depends on:  <other files or contracts it relies on>
```

Markdown, JSON and config files (which can't hold comments) are covered by this
document — keep them accurate.

---

## Shreyansh — team lead: backend core + extension shell

**Files**

```
backend/app/main.py
backend/app/api/auth.py
backend/app/api/modes.py
backend/app/api/repositories.py
backend/app/core/config.py
backend/app/core/security.py
backend/app/core/modes.py
backend/app/integrations/github.py
backend/app/services/repository_analyzer.py
backend/app/schemas/common.py
backend/app/database/models.py
extension/src/App.tsx
extension/src/main.tsx
extension/src/background.ts
extension/src/services/api.ts
extension/src/services/repoDetector.ts
extension/src/components/ModeSwitcher.tsx
extension/src/components/RepositoryHeader.tsx
extension/src/tabs/OverviewTab.tsx
extension/manifest.json
```

**Deliverables**

- FastAPI app boots; `/health` returns ok; CORS configured.
- GitHub OAuth flow (start, callback, me, logout) — server-side only.
- Repository API: analyze, architecture, links GET/PUT.
- GitHub adapter: metadata, tree, file fetch, rate-limit handling.
- Repository analyzer producing the `ArchitectureBundle`.
- Mode enforcement: `require_feature()` wired into gated routes.
- Extension shell: tab layout, mode switcher, repository header, API client,
  repo detection from the active tab URL.

**Definition of done**

- [ ] `uvicorn app.main:app --reload` starts clean; `GET /health` → `{"status":"ok"}`.
- [ ] Every route in `API_CONTRACT.md` that you own returns the documented JSON.
- [ ] A company-only route returns `403` in Open Contributor mode (covered by a test).
- [ ] `npm run build` succeeds; loading `extension/dist` unpacked shows the panel.
- [ ] No secrets anywhere; config read from env via `core/config.py`.
- [ ] All files carry the header comment; TODOs use `TODO(Shreyansh):`.

---

## Devyani — AI services + architecture schema + Ask AI

**Files**

```
backend/app/services/architecture_service.py
backend/app/services/context_service.py
backend/app/services/chat_service.py
backend/app/prompts/contributor_prompt.md
backend/app/prompts/onboarding_prompt.md
backend/app/schemas/architecture.py        (co-owned with Shreyansh)
extension/src/types/architecture.ts        (co-owned)
extension/src/tabs/AskAITab.tsx
```

**Deliverables**

- One AI service used by every LLM call, with structured-output validation
  (Pydantic models on the way out, retries on malformed output).
- Architecture service: turn analyzer facts into the `ArchitectureBundle`.
- Chat service: answer repo questions, always with `sources[]`.
- Context service: company mode only — weave Jira/Confluence into answers.
- Two prompts: `contributor_prompt.md`, `onboarding_prompt.md`.
- `schemas/architecture.py` Pydantic models + TS mirror.
- Ask AI tab: chat UI with source cards.

**Definition of done**

- [ ] All AI output is validated by a Pydantic model; malformed output retries.
- [ ] Every answer includes non-empty `sources[]` with real URLs.
- [ ] Prompts live in `prompts/`, not inline strings.
- [ ] `schemas/architecture.py` and `types/architecture.ts` stay in sync.
- [ ] Ask AI works in both modes; company mode can cite Jira/Confluence.
- [ ] No API keys in the extension; LLM key is backend env only.
- [ ] Header comments present; TODOs use `TODO(Devyani):`.

---

## Purva — UI design + Jira adapter + tabs

**Files**

```
extension/src/components/SourceCard.tsx
extension/src/components/ArchitectureDiagram.tsx
extension/src/tabs/ArchitectureTab.tsx
extension/src/tabs/ContextTab.tsx
extension/src/tabs/ContributeTab.tsx
extension/src/styles/tokens.css
backend/app/integrations/jira.py
```

**Deliverables**

- Design tokens (colors, spacing, fonts) and a consistent look.
- `SourceCard.tsx`: one reusable card for GitHub files, contribution resources,
  Jira issues and Confluence pages.
- `ArchitectureDiagram.tsx`: render components + connections from the schema.
- Architecture tab: technologies, entry points, diagram.
- Context tab: Jira issues + Confluence pages (company mode only).
- Contribute tab: setup steps, rules, good-first-issues, maintainers
  (open-contributor mode only).
- Jira adapter: read-only issues, connection check, rate limits.

**Definition of done**

- [ ] Panel looks sane at ~350px **and** at ~75% screen width (flex/grid only).
- [ ] `SourceCard` used everywhere a source is shown — no one-off cards.
- [ ] Diagram renders from the real schema, not hardcoded nodes.
- [ ] Tokens used instead of raw hex/px values in components.
- [ ] Jira adapter returns clean data with source URLs and handles 429.
- [ ] Tabs render from mock data before the backend is ready.
- [ ] Header comments present; TODOs use `TODO(Purva):`.

---

## Kunal — Slack + Confluence + integrations

**Files**

```
backend/app/integrations/slack.py
backend/app/integrations/confluence.py
backend/app/api/integrations.py
extension/src/tabs/IntegrationDrawer.tsx
```

**Deliverables**

- Confluence adapter: read-only pages/spaces, connection check, rate limits.
- Slack adapter: **one-way** send of the architecture summary. Never read.
- Integrations API: list, connect, delete, `slack/share`.
- Integration settings drawer in the extension (company mode only).

**Definition of done**

- [ ] Both adapters implement `integrations/base.py`.
- [ ] Per-provider feature gating returns `403` in Open Contributor mode.
- [ ] `slack/share` is send-only; no message-reading code path exists.
- [ ] Drawer lists providers with connection status and handles errors.
- [ ] Rate limits and provider errors surface as `429`/`502`, not crashes.
- [ ] Header comments present; TODOs use `TODO(Kunal):`.

---

## Shared contracts — change only with agreement

| File | Owners |
|---|---|
| `backend/app/core/modes.py` | Shreyansh + Devyani |
| `backend/app/schemas/architecture.py` | Shreyansh + Devyani |
| `extension/src/types/architecture.ts` | Shreyansh + Devyani |
| `extension/src/types/mode.ts` | Shreyansh + Devyani |
| `backend/app/integrations/base.py` | Shreyansh (adapters implement it) |
| `docs/API_CONTRACT.md` | Whole team |

Announce contract changes in the chat before you edit. Update this doc if
ownership moves.
