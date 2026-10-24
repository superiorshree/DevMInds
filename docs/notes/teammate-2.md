# Teammate 2: Devyani — AI module (providers + gateway)

Task: `ai/providers-and-gateway`. Everything below lives only in my allowed
files. All tests are in `backend/tests/ai/` and run with all HTTP mocked.

## What I built

### `backend/app/ai/errors.py`
- `ProviderError(code, message)` — base exception. `code` is one of the frozen
  AI codes so it maps straight onto the contract `AIError`.
- `PrivateAIUnavailable` — code `PRIVATE_AI_UNAVAILABLE`. Raised when Ollama is
  unreachable, times out or returns an HTTP error.
- `ExternalNotAllowed` — code `EXTERNAL_AI_NOT_ALLOWED`. Raised when the
  external LLM is not configured (missing env vars).

### `backend/app/ai/base.py`
- `BaseProvider` — interface with `async generate(messages: list[dict]) -> str`.
  Providers only send/receive text; routing lives in the gateway.

### `backend/app/ai/ollama_provider.py`
- `OllamaProvider.generate()` — `POST {OLLAMA_BASE_URL}/api/chat` with
  `{model, messages, stream: False}` via httpx, timeout
  `OLLAMA_TIMEOUT_SECONDS`; returns `r.json()["message"]["content"]`.
  `ConnectError`, `TimeoutException` and `HTTPStatusError` all become
  `PrivateAIUnavailable` (never a fallback to the external AI).
- `OllamaProvider.health()` — `GET {OLLAMA_BASE_URL}/api/tags`:
  connection fail → `down`; model missing from the list → `model_missing`;
  otherwise `up`; empty base URL → `not_configured`.
- We do NOT build or bundle Ollama — we only call
  `http://localhost:11434` (the default of `OLLAMA_BASE_URL`).

### `backend/app/ai/external_provider.py`
- `ExternalLLMProvider.generate()` — OpenAI-compatible chat-completions call
  using `EXTERNAL_LLM_BASE_URL`, `EXTERNAL_LLM_API_KEY` (backend only, never
  logged), `EXTERNAL_LLM_MODEL`, `EXTERNAL_LLM_TIMEOUT_SECONDS`. Not
  configured → `ExternalNotAllowed`; HTTP failures → `ProviderError(PROVIDER_ERROR)`.
- `ExternalLLMProvider.health()` — `up` / `down` / `not_configured`.

### `backend/app/ai/gateway.py`
- `classify(repository_context, company_context) -> "private" | "public"`:
  **private** if `visibility == "private"` OR at least one company item
  (Jira/Slack/Confluence); otherwise **public**. Accepts the frozen contract
  models or plain dicts.
- `choose_provider(classification)` — `private → "ollama"`, `public → "external"`.
- `complete(messages, repository_context, company_context) -> str` — the
  internal entry point other agents may call. Applies the rule and NEVER
  falls back to the other provider after a failure.
- `ALLOW_EXTERNAL_FOR_COMPANY` (settings, default `false`) exists as a
  clearly named test-only escape hatch; with it false, private data can
  never reach the external AI.

### `backend/app/ai/__init__.py`
- `AIService.answer(question, repository_context, company_context, mode) -> AIAnswer`
  and `AIService.health() -> {"ollama": up|down|model_missing|not_configured, "external": up|down|not_configured}`,
  plus `get_ai_service()` singleton — exactly the shared interface.
- `AIAnswer`/`AIError` are imported from the frozen `backend/app/schemas/contracts.py`.
- `AI_CHAT_ENABLED=false` → `AIAnswer(error=AI_DISABLED)`.
- Private + Ollama down → `AIAnswer(answer=None, provider="ollama", error=PRIVATE_AI_UNAVAILABLE)`
  with message "Private AI is not running. Start Ollama on this laptop."
- Private + `model_missing` → message tells the user to run `ollama pull <model>`.
- Public + no company items → external AI; not configured → `EXTERNAL_AI_NOT_ALLOWED`.
- Sources are left empty for now — TODO(Devyani): fill `sources` with
  `SourceRef` entries once the Mentor task defines how to extract them.

## How to test by hand

1. `pip install -r backend/requirements.txt` (pulls in `requirements/ai.txt`).
2. `cd backend && pytest tests/ai -q` — 29 tests, all HTTP mocked.
3. Manual demo without Ollama: start the backend, ask a question about a
   private repo (or any repo with a Jira item) → you get
   `PRIVATE_AI_UNAVAILABLE`. Install Ollama, `ollama pull llama3.2:3b`, ask
   again → answer from Ollama.
4. Manual demo for public: set `EXTERNAL_LLM_BASE_URL`, `EXTERNAL_LLM_API_KEY`,
   `EXTERNAL_LLM_MODEL` in `backend/.env` → public repos answer via external.
   Clear them → `EXTERNAL_AI_NOT_ALLOWED`. No code change needed.

## Env names used (all read via `app/core/config.py` Settings)

`AI_CHAT_ENABLED`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_SECONDS`,
`EXTERNAL_LLM_BASE_URL`, `EXTERNAL_LLM_API_KEY`, `EXTERNAL_LLM_MODEL`,
`EXTERNAL_LLM_TIMEOUT_SECONDS`, `ALLOW_EXTERNAL_FOR_COMPANY`.

## Notes / gaps for the team

- `backend/app/config.py` currently does `from app.core.config import settings`,
  but `core/config.py` only defines `get_settings()`. My modules import
  `get_settings` directly, so nothing is blocked, but someone should make
  `settings = get_settings()` exist (config.py is Shreyansh's file).
- TODO(Devyani): populate `AIAnswer.sources` with `SourceRef` entries
  (Mentor task) and wire the mode prompts from `backend/app/prompts/`.
