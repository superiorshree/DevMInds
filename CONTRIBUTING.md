# Contributing to DevMinds

Thanks for contributing! This repo is built by four teammates in ~24 hours, so
the rules below keep us fast and conflict-free.

## Git workflow

Read **[docs/GIT_WORKFLOW.md]** before your first commit. The short version:

- Trunk-based: `main` is protected, no direct pushes.
- Branches are short-lived and named `<area>/<task>` (e.g. `backend/mode-403`).
- Commit format: `type: message` (e.g. `feat: add mode gate to context endpoint`).
- Keep PRs small (under ~300 lines where possible). Pull `main` hourly.
- Never commit `.env` or real API keys.
- Merge conflict? Ask the file owner (see `docs/TEAM_RESPONSIBILITIES.md`).

## Code style

**Python (backend)**

- Type hints everywhere, PEP 8.
- Pydantic models for every request, response and AI structured output.
- Short functions with docstrings. Clarity over cleverness.
- Config from environment variables via `app/core/config.py`. No secrets in code.

**TypeScript (extension)**

- `strict` mode on, no `any`.
- Small functional components; props typed with an `interface`.
- Reuse shared components (`SourceCard`, etc.) instead of re-implementing.

**Both**

- New code files start with the mandatory header comment (see
  `docs/TEAM_RESPONSIBILITIES.md`).
- Shared contracts (types, schemas, capabilities config) are changed only
  after the whole team agrees — they appear in PRs tagged `contract`.

## Pull requests

Use the PR template. A PR is ready when: it builds, the described test steps
pass, and you have checked whether it touches the shared contract.
