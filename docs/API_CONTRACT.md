# DevMinds API Contract

> **This file is the single source of truth for the backend API.** The whole
> team agrees on it **before** coding. If you need to change a shape or add an
> endpoint, say so in the team chat, update this file, then code.

- Base URL (local): `http://localhost:8000`
- All endpoints are prefixed with `/api`.
- Requests and responses are JSON. Field names are `snake_case` on the wire.
- Auth: a GitHub OAuth session (cookie or bearer token). See
  [Authentication vs authorization](ARCHITECTURE.md#authentication-vs-authorization).

## Modes at a glance

| Key | Open Contributor | Company Employee |
|---|---|---|
| `privateRepos` | false | true |
| `contributeTab` | true | false |
| `contextTab` | false | true |
| `jira` | false | true |
| `confluence` | false | true |
| `slackShare` | false | true |

The capabilities live in one place: `backend/app/core/modes.py` (`MODE_FEATURES`).
The extension mirrors it in `extension/src/types/mode.ts` and reads it from
`GET /api/me/mode`.

## Two hard rules

1. **Company-only endpoints return HTTP 403 in Open Contributor mode.** Hiding
   a button in the UI is not security. Every gated route uses
   `require_feature("<feature>")`.
2. **`POST /api/repositories/analyze` and `POST /api/chat` use the SERVER-SIDE
   mode**, read from the user's server-side session (`app/core/security.py`).
   They never trust a mode value sent in the request body by the frontend.

## Error codes

| HTTP | Meaning | Body |
|---|---|---|
| 400 | Bad request / validation error | `{"detail": "..."}` (FastAPI default) |
| 401 | Not signed in with GitHub | `{"detail": "Not authenticated"}` |
| 403 | Feature not allowed in this mode | `{"detail": "Feature 'jira' is not available in mode 'open_contributor'"}` |
| 404 | Repo / resource not found | `{"detail": "..."}` |
| 422 | Pydantic validation error | FastAPI validation array |
| 429 | Upstream rate limit (GitHub/Jira/etc.) | `{"detail": "Rate limited by <provider>"}` |
| 502 | Upstream provider error | `{"detail": "..."}` |

Common error body (optional, used by adapters):

```json
{ "detail": "Human-readable message", "source": "github", "code": "rate_limited" }
```

---

## Auth

### `GET /api/auth/github` — start GitHub OAuth

- **Mode access:** both (before mode is known).
- **Response:** `302` redirect to GitHub's OAuth authorize URL.

```
# TODO(Shreyansh): build the real authorize URL from config and redirect.
```

### `GET /api/auth/github/callback` — OAuth callback

- **Mode access:** both.
- **Query:** `code`, `state`.
- **Response:** `302` redirect to the extension with a session cookie set.

```json
{ "note": "TODO(Shreyansh): exchange code for token, create user, set session." }
```

### `GET /api/auth/me` — current signed-in user

- **Mode access:** both.
- **Auth:** required.
- **Response `200`:**

```json
{
  "id": "usr_123",
  "github_login": "shreyansh",
  "avatar_url": "https://avatars.githubusercontent.com/u/1?v=4",
  "mode": "open_contributor"
}
```

- **Errors:** `401` if not signed in.

### `POST /api/auth/logout`

- **Mode access:** both.
- **Response `200`:** `{"detail": "Logged out"}`.

---

## Mode

### `GET /api/me/mode` — get mode + features

- **Mode access:** both. The extension calls this on load.
- **Response `200`:**

```json
{
  "mode": "company_employee",
  "features": {
    "privateRepos": true,
    "contributeTab": false,
    "contextTab": true,
    "jira": true,
    "confluence": true,
    "slackShare": true
  }
}
```

### `PUT /api/me/mode` — switch mode

- **Mode access:** both (switching is allowed; the *server* re-checks features
  on every gated request).
- **Request:**

```json
{ "mode": "company_employee" }
```

- **Response `200`:** same shape as `GET /api/me/mode`.
- **Errors:** `400` if `mode` is not a known `UserMode`.

> Mode switching is a UX convenience. It never grants access by itself — the
> backend still enforces features on each gated endpoint.

---

## Repositories

### `POST /api/repositories/analyze` — kick off analysis

- **Mode access:** both. **Uses the server-side mode**, not a body field.
- **Request:**

```json
{ "owner": "vercel", "name": "next.js", "branch": "main" }
```

- **Response `202`:**

```json
{ "job_id": "an_9", "owner": "vercel", "name": "next.js", "status": "queued" }
```

- **Errors:** `401`, `422`, `429` (GitHub rate limit).
- **Note:** in Company Employee mode, private repos are allowed only if the
  user has authorized them (`privateRepos`).

### `GET /api/repositories/{owner}/{repo}/architecture` — the analysis result

- **Mode access:** both. The payload's optional blocks depend on mode:
  - `contributor_guide` is filled in **Open Contributor** mode.
  - `related_context` (Jira + Confluence) is filled in **Company Employee** mode.
- **Response `200`:** one `ArchitectureBundle`.

```json
{
  "repository": { "owner": "vercel", "name": "next.js", "branch": "main" },
  "overview": {
    "summary": "A React framework for production web apps.",
    "primary_language": "TypeScript",
    "stars": 128000,
    "topics": ["react", "ssr", "framework"],
    "last_updated": "2026-10-20T12:00:00Z"
  },
  "technologies": [
    { "name": "React", "category": "frontend", "evidence_files": ["packages/next/src/client/link.tsx"] }
  ],
  "entry_points": [
    { "file": "packages/next/src/server/next.ts", "reason": "Server bootstrap; starts the HTTP server." }
  ],
  "components": [
    { "id": "router", "name": "Router", "description": "Matches URLs to pages.", "files": ["packages/next/src/server/router.ts"] }
  ],
  "connections": [
    { "from": "router", "to": "renderer", "relationship": "renders matched pages" }
  ],
  "contributor_guide": {
    "setup_steps": ["pnpm install", "pnpm dev"],
    "contribution_rules": ["Run pnpm test before opening a PR."],
    "good_first_issues": [ { "title": "Fix typo in docs", "url": "https://github.com/vercel/next.js/issues/1" } ],
    "maintainers": [ { "login": "gaearon", "avatar_url": "https://avatars.githubusercontent.com/u/1?v=4" } ]
  },
  "related_context": null
}
```

In **Company Employee** mode, `related_context` is filled and
`contributor_guide` may be `null`:

```json
"related_context": {
  "jira_issues": [
    { "key": "DEV-101", "summary": "Migrate router", "url": "https://acme.atlassian.net/browse/DEV-101", "status": "In Progress" }
  ],
  "confluence_pages": [
    { "id": "12345", "title": "Onboarding: how we ship", "url": "https://acme.atlassian.net/wiki/x/abc", "space": "ENG" }
  ]
}
```

- **Errors:** `401`, `404` (no analysis yet), `429`, `502`.

### `GET /api/repositories/{owner}/{repo}/links` — saved source links

- **Mode access:** both.
- **Response `200`:**

```json
{
  "owner": "vercel",
  "name": "next.js",
  "links": [
    { "id": "lnk_1", "title": "Router", "url": "https://github.com/vercel/next.js/blob/main/packages/next/src/server/router.ts", "sourceType": "github_file" }
  ]
}
```

### `PUT /api/repositories/{owner}/{repo}/links` — save/update links

- **Mode access:** both.
- **Request:**

```json
{
  "links": [
    { "title": "Router", "url": "https://github.com/...", "sourceType": "github_file" }
  ]
}
```

- **Response `200`:** the saved links (same shape as GET).
- **Errors:** `401`, `422`.

### `GET /api/repositories/{owner}/{repo}/context` — Jira + Confluence

- **Mode access:** **Company only.** Requires feature `contextTab`.
- **Response `200`:** same `related_context` shape as above.
- **Errors:** `401`, **`403` in Open Contributor mode**, `404`, `429`, `502`.

---

## Chat

### `POST /api/chat` — ask a question about the repo

- **Mode access:** both. **Uses the server-side mode.**
- **Request:**

```json
{
  "owner": "vercel",
  "name": "next.js",
  "question": "Where does routing live, and how do I add a route?"
}
```

- **Response `200`:**

```json
{
  "answer": "Routing lives in packages/next/src/server/router.ts ...",
  "sources": [
    { "title": "router.ts", "url": "https://github.com/vercel/next.js/blob/main/packages/next/src/server/router.ts", "sourceType": "github_file" }
  ]
}
```

- **Errors:** `401`, `422`, `429`, `502` (LLM provider error).
- **Note:** in Company Employee mode the answer may cite Jira/Confluence; the
  model must not leak content the user is not authorized to see.

---

## Integrations

### `GET /api/integrations` — list providers and connection status

- **Mode access:** both, but providers whose feature is off are reported as
  `"available": false` and are never queried.
- **Response `200`:**

```json
{
  "providers": [
    { "provider": "github", "available": true, "connected": true, "detail": "Signed in as shreyansh" },
    { "provider": "jira", "available": false, "connected": false, "detail": "Company Employee mode only" },
    { "provider": "confluence", "available": false, "connected": false, "detail": "Company Employee mode only" },
    { "provider": "slack", "available": false, "connected": false, "detail": "Company Employee mode only" }
  ]
}
```

### `POST /api/integrations/{provider}/connect`

- **Mode access:** gated per provider — `jira` needs feature `jira`,
  `confluence` needs `confluence`, `slack` needs `slackShare`, `github` is open.
- **Request:**

```json
{ "workspace": "acme.atlassian.net" }
```

- **Response `200`:**

```json
{ "provider": "jira", "connected": true, "detail": "Connected to acme.atlassian.net" }
```

- **Errors:** `403` (feature off in this mode), `404` (unknown provider),
  `429`, `502`.

### `DELETE /api/integrations/{provider}`

- **Mode access:** same per-provider gating as connect.
- **Response `200`:**

```json
{ "provider": "jira", "connected": false, "detail": "Disconnected" }
```

### `POST /api/integrations/slack/share` — one-way share of the architecture summary

- **Mode access:** **Company only.** Requires feature `slackShare`.
- **Request:**

```json
{
  "owner": "vercel",
  "name": "next.js",
  "channel": "#eng-onboarding",
  "message": "Architecture summary for next.js"
}
```

- **Response `200`:**

```json
{ "shared": true, "channel": "#eng-onboarding", "ts": "1729600000.000100" }
```

- **Errors:** `403` in Open Contributor mode, `404`, `429`, `502`.
- **Note:** one-way only. DevMinds never reads Slack messages.

---

## Health (not under `/api`)

### `GET /health`

- **Mode access:** both (no auth). Used by local checks and tests.
- **Response `200`:**

```json
{ "status": "ok", "service": "devminds-backend", "version": "0.1.0" }
```
