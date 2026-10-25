# Local Setup

Get both halves running in a few minutes. Nothing here needs real API keys —
the skeleton runs on mock data.

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Python | 3.11+ | Backend |
| Node.js | 18+ | Extension build |
| npm | 9+ | Extension build |
| Google Chrome | latest | Load the unpacked extension |
| Git | latest | Version control |

Optional later: PostgreSQL (the local demo may start without it — see
`backend/app/database/models.py`).

## 1. Clone and enter the repo

```bash
git clone <repo-url>
cd devminds
```

## 2. Backend

```bash
cd backend

# Virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Dependencies
pip install -r requirements.txt

# Environment variables
cp .env.example .env               # fill in names/values; .env is git-ignored

# Run
uvicorn app.main:app --reload
```

Check it:

```bash
curl http://localhost:8000/health
# {"status":"ok","service":"devminds-backend","version":"0.1.0"}
```

Run the tests:

```bash
cd backend
pytest
```

Interactive API docs: <http://localhost:8000/docs>

## 3. Extension

```bash
cd extension

# Install
npm install

# Local backend URL (defaults to http://localhost:8000)
cp .env.example .env.local         # if you need a different URL

# Build
npm run build                      # outputs to extension/dist
```

**Load in Chrome**

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the `extension/dist` folder.
5. Click the DevMinds icon — the side panel opens.

> Icons: `extension/public/` has a note on the placeholder icons. Add real PNGs
> there and reference them in `manifest.json` before the demo.

## 4. Environment variables

### Backend (`backend/.env`)

Names only — never commit values. See `backend/.env.example`.

| Variable | Purpose |
|---|---|
| `APP_NAME` | Service name in logs |
| `DEBUG` | Debug flag |
| `CORS_ORIGINS` | Allowed origins (comma separated) |
| `DATABASE_URL` | PostgreSQL URL (optional for local demo) |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client id |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app secret |
| `SESSION_SECRET` | HS256 secret for signing session tokens |
| `ALLOWED_EXTENSION_IDS` | Comma-separated list of allowed unpacked Chrome extension IDs for OAuth redirects |
| `EXTENSION_REDIRECT_URI` | Optional fallback redirect URI (`https://<id>.chromiumapp.org/provide_cb.html`) |
| `LLM_API_KEY` | LLM provider key (backend only, never in the extension) |
| `JIRA_BASE_URL` | e.g. `https://acme.atlassian.net` |
| `JIRA_API_TOKEN` | Jira read-only token |
| `CONFLUENCE_BASE_URL` | e.g. `https://acme.atlassian.net/wiki` |
| `CONFLUENCE_API_TOKEN` | Confluence read-only token |
| `SLACK_BOT_TOKEN` | Slack bot token (send-only scope) |

### Extension (`extension/.env.local`)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL, default `http://localhost:8000` |

Only `VITE_*` variables reach the frontend. **No secrets in the extension.**

## 5. Common issues

| Symptom | Fix |
|---|---|
| Extension panel is blank | Rebuild (`npm run build`) and click Reload on `chrome://extensions` |
| CORS error in the console | Confirm the backend is running on the port in `VITE_API_BASE_URL` |
| `uvicorn: command not found` | Activate the virtualenv (`source .venv/bin/activate`) |
| `403` from a company-only endpoint | Expected in Open Contributor mode |
| Extension can't reach localhost | Ensure `VITE_API_BASE_URL` matches the backend host/port |

## 6. Working offline

The extension renders tabs from `extension/src/mocks/mockData.ts`, so the UI is
demoable before the backend exists. Point `api.ts` at the backend when you want
real data.
