# File:        backend/docs/notes/teammate-3.md
# Owner:       Kunal
# Purpose:     Team note for the integrations base-and-mocks task.
# Contains:    What was built, how to test it by hand, and what is blocked on others.
# Status:      REAL — reflects the integrations/base-and-mocks branch after merging origin/main.
# Depends on:  backend/app/integrations/*, backend/tests/integrations/test_mock_switch.py

## Task: integrations base and mocks (branch `integrations/base-and-mocks`)

### What I built

- `backend/app/integrations/base.py` — added `BaseConnector` with
  `async def fetch(repo_full_name, query) -> CompanyContext`, a frozen
  `source_type` and a default `check_connection()`. Shreyansh's
  `IntegrationAdapter` contract is untouched; `github.py` still uses it.
- `backend/app/integrations/normalize.py` (new) — `trim_text` (~2000 chars),
  `strip_html`, `make_company_item`, and
  `error_from_status(source_type, status_code)`: 401 TOKEN_EXPIRED,
  403 NO_PERMISSION, 429 RATE_LIMITED, 5xx / other statuses / timeouts
  (`status_code=None`) API_DOWN.
- `backend/app/integrations/mock_data.py` (new) — 2 Jira, 2 Slack and
  2 Confluence sample `CompanyItem` objects with working-looking urls. Only
  the mock branch in `__init__.py` imports it.
- `backend/app/integrations/__init__.py` — the two public functions:
  - `get_company_context(repo_full_name, query, mode)` raises
    `PermissionError` unless mode is `company`; returns the mock items when
    `USE_MOCK_INTEGRATIONS=true`; otherwise runs Jira, Slack and Confluence
    with `asyncio.gather` and collects `ConnectorError`s instead of raising.
  - `integration_status()` returns `connected` / `not_connected` / `error`
    per connector (all `connected` in mock mode).
- `backend/app/integrations/jira.py` — now imports the shared
  `BaseConnector`, `error_from_status` and `from app.config import settings`
  directly (local fallbacks removed; main's `app/config.py` re-export landed
  in the merge with origin/main).
- `backend/app/integrations/slack.py`, `confluence.py` — `SlackConnector`
  and `ConfluenceConnector` stubs that return a `NOT_CONNECTED`
  `ConnectorError`; send/share helpers keep their later-task TODOs.
- `backend/tests/integrations/test_mock_switch.py` (new),
  `backend/requirements/integrations.txt` (httpx pin).

### How to test by hand

1. `cd backend && pytest tests/integrations -q` — 16 tests, no network.
2. `USE_MOCK_INTEGRATIONS=true uvicorn app.main:app --port 8000`, sign in,
   switch to Company mode: the context tab gets the six sample items with no
   internet and no tokens.
3. Set `USE_MOCK_INTEGRATIONS=false` without tokens: `integration_status()`
   reports `not_connected` for all three, and `get_company_context()` returns
   three `NOT_CONNECTED` errors instead of raising.

### Needed from someone else

- **Shreyansh:** `backend/tests/test_integrations.py` (from main, not an
  allowed file for me) breaks pytest **collection for the whole suite**, and
  it already did on `origin/main` before this merge (it imports `JiraAdapter`,
  which exists nowhere). After the merge it also needs: `ConfluenceAdapter` /
  `SlackAdapter` -> `ConfluenceConnector` / `SlackConnector`, and
  `get_company_context()` / `integration_status()` must be **awaited** — the
  frozen Master-Guide interface is `async`, so the synchronous calls in that
  file cannot pass. I could not edit it; it needs a rewrite on your side.
- **Shreyansh / Devyani:** `tests/test_contracts.py::
  TestAIFrozenContractReuse::test_stub_ai_service_returns_a_contract_answer`
  fails when `EXTERNAL_LLM_*` is unset (AI returns `EXTERNAL_AI_NOT_ALLOWED`,
  `answer=None`). Unrelated to integrations and failing on main too.
- **Kunal (later task):** `app/api/integrations.py` still says
  `SlackAdapter.share_summary()` in a TODO comment — the class is now
  `SlackConnector`. That file is Shreyansh's, so I could not change it.
- `JiraConnector.fetch` is synchronous (its merged tests call it directly);
  `get_company_context()` dispatches sync vs async, so making it async later
  needs no change in `__init__.py`.
