# Git Workflow

Trunk-based development. We have ~24 hours, so we keep branches short-lived.

## Branching

- `main` is **protected**. No direct pushes — open a PR.
- Branch off `main`, name it `<area>/<task>`:

  ```
  backend/mode-403-on-context
  extension/source-card-design
  docs/api-contract
  ```

- One task = one branch = one PR. Delete the branch after merging.
- Branch names are lowercase, slash-separated, hyphenated words.

## Commit format

```
type: short imperative message
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

```
feat: add mode gate to context endpoint
fix: detect repo from blob URLs
docs: add chat request shape to API contract
chore: initial project skeleton
```

- Subject line ≤ 72 characters.
- Body (optional) says **why**, not what.

## Pull requests

- **Keep PRs under ~300 lines of diff.** Split larger work.
- Fill in the PR template: what changed, how to test, screenshots for UI,
  and whether it touches the shared contract.
- Link the issue.
- At least one approval before merge; for shared-contract files, the owners in
  `CODEOWNERS` must approve.
- Merge with "Squash and merge" unless the branch has meaningful history.

## Syncing

- **Pull `main` at least hourly.** Small syncs beat one giant conflict.
- Before starting work each morning, `git pull` on `main`.

## Never commit

- `.env` or any real key/token/secret. Use `.env.example` for names only.
- `node_modules/`, `dist/`, `.venv/`, `__pycache__/`.
- Generated lockfile churn unrelated to your change.

## Merge conflicts

1. Don't panic, don't `--force`, don't take "mine" wholesale.
2. **Ask the file owner** (see `docs/TEAM_RESPONSIBILITIES.md` and
   `CODEOWNERS`).
3. If both sides are right, the owner decides; the other side rebases.

Shared-contract files (`core/modes.py`, `schemas/architecture.py`,
`types/architecture.ts`, `types/mode.ts`) are co-owned — announce changes in
the team chat **before** you edit them.

## Feature freeze

**Feature freeze at hour 19 of 24.** After that:

- Bug fixes, docs, demo polish and test fixes only.
- No new endpoints, no new dependencies, no contract changes.
- Everyone focuses on `docs/DEMO_CHECKLIST.md`.

## Suggested rhythm

| Time | Action |
|---|---|
| Hour 0–1 | Agree on `docs/API_CONTRACT.md` together |
| Hour 1–19 | Build on `<area>/<task>` branches, PR often |
| Hour 19–24 | Freeze; stabilize, rehearse the demo |
