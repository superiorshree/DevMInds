# Jira, Confluence, and Slack Integration & Authentication Guide

This document provides complete setup, configuration, and verification instructions for authenticating against **Jira Cloud**, **Confluence Cloud**, and the **Slack Web API** within the DevMinds backend.

---

## Table of Contents

1. [Architecture & Authentication Methods](#1-architecture--authentication-methods)
2. [Environment Configuration (`.env.example`)](#2-environment-configuration-envexample)
3. [Step-by-Step Key Setup Guide](#3-step-by-step-key-setup-guide)
   - [Atlassian Cloud: Jira & Confluence](#atlassian-cloud-jira--confluence)
     - [Option A: API Token Authentication (Recommended for Backend Services)](#option-a-api-token-authentication-recommended-for-backend-services)
     - [Option B: OAuth 2.0 (3LO) Delegated User Authentication](#option-b-oauth-20-3lo-delegated-user-authentication)
   - [Slack Web API & Events](#slack-web-api--events)
4. [Environment Variable Mapping Table](#4-environment-variable-mapping-table)
5. [Code Implementation & Architecture](#5-code-implementation--architecture)
6. [Verification Checklist & Testing](#6-verification-checklist--testing)
7. [Troubleshooting & Common Errors Matrix](#7-troubleshooting--common-errors-matrix)

---

## 1. Architecture & Authentication Methods

DevMinds backend uses **Python 3.11+**, **`httpx`** (sync & async HTTP client), and **`python-dotenv`** to securely authenticate against all three services.

### Supported Authentication Paradigms

1. **Service-to-Service Token Auth (Direct API / Bot Tokens)**:
   - **Jira Cloud**: Basic Auth (`email:api_token`) against `GET /rest/api/3/myself`.
   - **Confluence Cloud**: Basic Auth (`email:api_token`) against `GET /wiki/rest/api/user/current` or `/wiki/rest/api/3/users/me`.
   - **Slack**: Bearer Token Auth (`xoxb-...`) against `POST https://slack.com/api/auth.test`. Inbound webhook verification via HMAC-SHA256 (`SLACK_SIGNING_SECRET`).
   - *Best for*: Background workers, sync bots, and automated team architecture summaries.

2. **OAuth 2.0 (3-Legged OAuth / 3LO)**:
   - **Atlassian Cloud (Jira & Confluence)**: Authorization Code Grant against `https://auth.atlassian.com/authorize`, token exchange, and automatic site resource discovery (`accessible-resources`) to resolve `cloudId`.
   - **Slack**: Sign in with Slack using **OpenID Connect (OIDC)** (`openid`, `profile`, `email`).
   - *Best for*: End-user sign-in flows and delegated permission models.

---

## 2. Environment Configuration (`.env.example`)

Add the following keys to your `.env` file (located in `backend/.env` or repository root `.env`):

```bash
# ==============================================================================
# Jira Cloud Authentication
# ==============================================================================
# Option A: API Token Auth (Recommended for backend services)
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token_here

# Option B: Atlassian OAuth 2.0 (3LO)
ATLASSIAN_CLIENT_ID=your_atlassian_oauth_client_id
ATLASSIAN_CLIENT_SECRET=your_atlassian_oauth_client_secret
ATLASSIAN_REDIRECT_URI=http://localhost:8000/api/auth/atlassian/callback
ATLASSIAN_CLOUD_ID=your_atlassian_cloud_site_id
JIRA_ACCESS_TOKEN=your_oauth_access_token_here
JIRA_REFRESH_TOKEN=your_oauth_refresh_token_here

# ==============================================================================
# Confluence Cloud Authentication
# ==============================================================================
# Option A: API Token Auth
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_EMAIL=your-email@example.com
CONFLUENCE_API_TOKEN=your_confluence_api_token_here

# Option B: Confluence OAuth 2.0
CONFLUENCE_ACCESS_TOKEN=your_oauth_access_token_here
CONFLUENCE_REFRESH_TOKEN=your_oauth_refresh_token_here

# ==============================================================================
# Slack Web API Authentication
# ==============================================================================
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_USER_TOKEN=xoxp-your-user-token-here
SLACK_SIGNING_SECRET=your_slack_signing_secret_here
SLACK_CHANNEL_IDS=C0123456789
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:8000/api/auth/slack/callback
```

---

## 3. Step-by-Step Key Setup Guide

### Atlassian Cloud: Jira & Confluence

#### Option A: API Token Authentication (Recommended for Backend Services)

1. Open your browser and go to [Atlassian Security: API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
2. Log in with your Atlassian account.
3. Click **Create API token**.
4. Label it descriptive (e.g. `DevMinds-Backend-Auth`), then click **Create**.
5. Copy the generated token immediately (it cannot be viewed again).
6. **Determining Base URLs**:
   - Navigate to your Jira Cloud workspace. Look at the browser URL:
     - `JIRA_BASE_URL`: `https://<your-subdomain>.atlassian.net` (do not add `/jira` or trailing slashes).
     - `CONFLUENCE_BASE_URL`: `https://<your-subdomain>.atlassian.net/wiki` (must end with `/wiki` because Confluence Cloud REST APIs are rooted under the `/wiki` subpath).
   - Set `JIRA_EMAIL` and `CONFLUENCE_EMAIL` to the email of your Atlassian account.

---

#### Option B: OAuth 2.0 (3LO) Delegated User Authentication

1. Go to the [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/).
2. Click **Create** > **OAuth 2.0 integration**.
3. Name your integration (e.g. `DevMinds App`) and accept the terms.
4. From the left sidebar:
   - **Settings** > **App details**: Copy **Client ID** (`ATLASSIAN_CLIENT_ID`) and **Secret** (`ATLASSIAN_CLIENT_SECRET`).
   - **Authorization**: Click **Add** next to **OAuth 2.0 (3LO)**. Enter your redirect URI:
     `http://localhost:8000/api/auth/atlassian/callback`
   - **Permissions**: Click **Add** next to **Jira API** and **Confluence API**.
5. **Scopes Configuration (Granular vs Classic Scopes)**:
   > **Note on Atlassian Scopes Migration**: Atlassian migrated from legacy classic scopes to **Granular Scopes**.
   - **Jira Granular Scopes**:
     - `read:me` (user identity)
     - `read:jira-user` (read user accounts and assignees)
     - `read:jira-work` (read issues, projects, and epics)
   - **Confluence Granular Scopes**:
     - `read:confluence-user` (read Confluence profile)
     - `read:confluence-space:summary` (read space metadata)
     - `read:confluence-content.summary` (read pages)
   - **Offline Access Scope**:
     - `offline_access` (required to receive a rotating `refresh_token`; without this scope, access tokens expire after 60 minutes).
6. **How to Find the Site `Cloud ID`**:
   Atlassian 3LO requests route through `https://api.atlassian.com/ex/jira/{cloudId}/...`.
   - **Method 1 (Automatic via API)**: Immediately after exchanging your authorization code for an access token, call:
     ```http
     GET https://api.atlassian.com/oauth/token/accessible-resources
     Authorization: Bearer <access_token>
     ```
     This returns a JSON list of all authorized sites. The `id` attribute is your `cloudId`.
   - **Method 2 (Browser Direct)**: Open `https://<your-subdomain>.atlassian.net/_edge/tenant_info`. The page outputs a JSON dictionary containing the `cloudId`.

---

### Slack Web API & Events

1. Navigate to the [Slack App Directory](https://api.slack.com/apps).
2. Click **Create New App** > **From scratch**.
3. Enter your app name (e.g. `DevMinds Bot`) and pick your Slack workspace.
4. **App Credentials & Signing Secret**:
   - In the left sidebar, click **Basic Information**.
   - Scroll to **App Credentials** and locate **Signing Secret**.
   - Click **Show** and copy the secret into `SLACK_SIGNING_SECRET`.
5. **Configuring Scopes**:
   - In the left sidebar, click **OAuth & Permissions**.
   - Under **Scopes** > **Bot Token Scopes**, click **Add an OAuth Scope** and add:
     - `users:read` (to inspect users and identities)
     - `users:read.email` (to resolve user accounts by email)
     - `channels:read` (to list public channels)
     - `channels:history` (to read channel message context)
     - `chat:write` (to post architecture summaries and updates)
   - **User Token Scopes / Sign in with Slack (OpenID Connect)**:
     > **Note on Slack Auth Migration**: Slack deprecated legacy `users.identity` in favor of **Sign in with Slack via OpenID Connect (OIDC)**.
     - Under **User Token Scopes**, add: `openid`, `profile`, `email`.
6. **Install App & Obtain Bot Token**:
   - On the same **OAuth & Permissions** page, scroll up to **OAuth Tokens for Your Workspace**.
   - Click **Install to Workspace** and click **Allow**.
   - Copy the **Bot User OAuth Token** (starts with `xoxb-...`) into `SLACK_BOT_TOKEN`.
7. **Find Channel ID**:
   - In your Slack desktop app or browser, right-click any channel > **Copy link**.
   - The last segment of the link (e.g. `C0CAV9SUVAQ`) is the channel ID. Add it to `SLACK_CHANNEL_IDS`.

---

## 4. Environment Variable Mapping Table

| Service | Setting / Credential | `.env` Variable Name | Example / Format |
|---|---|---|---|
| **Jira** | Base Site URL | `JIRA_BASE_URL` | `https://your-domain.atlassian.net` |
| **Jira** | Atlassian User Email | `JIRA_EMAIL` | `engineer@company.com` |
| **Jira** | Atlassian API Token | `JIRA_API_TOKEN` | `ATATT3xFfGF0...` |
| **Atlassian (OAuth)** | Developer App Client ID | `ATLASSIAN_CLIENT_ID` | `ab12cd34ef56...` |
| **Atlassian (OAuth)** | Developer App Secret | `ATLASSIAN_CLIENT_SECRET` | `ATOA...` |
| **Atlassian (OAuth)** | Callback Redirect URI | `ATLASSIAN_REDIRECT_URI` | `http://localhost:8000/api/auth/atlassian/callback` |
| **Atlassian (OAuth)** | Cloud Site ID | `ATLASSIAN_CLOUD_ID` | `2f25d767-fd13-4ea4-a7dd-29ef0b3fac72` |
| **Confluence** | Wiki Site URL | `CONFLUENCE_BASE_URL` | `https://your-domain.atlassian.net/wiki` |
| **Confluence** | Atlassian User Email | `CONFLUENCE_EMAIL` | `engineer@company.com` |
| **Confluence** | Atlassian API Token | `CONFLUENCE_API_TOKEN` | `ATATT3xFfGF0...` |
| **Slack** | Bot OAuth Token | `SLACK_BOT_TOKEN` | `xoxb-1234567890-1234567890-...` |
| **Slack** | User OAuth Token | `SLACK_USER_TOKEN` | `xoxp-1234567890-1234567890-...` |
| **Slack** | Request Signing Secret | `SLACK_SIGNING_SECRET` | `8f8a12bc56de78...` |
| **Slack** | Target Channel IDs | `SLACK_CHANNEL_IDS` | `C0CAV9SUVAQ` |

---

## 5. Real Account Login & API Endpoints

The backend supports authenticating users directly with their real Jira, Confluence, and Slack accounts, establishing signed HS256 JWT sessions and assigning `company` mode.

### API Endpoints for Account Login

| Endpoint | Method | Payload | Description |
|---|---|---|---|
| `/api/auth/login/jira` | `POST` | `{"email": "...", "api_token": "...", "base_url": "..."}` (optional) | Authenticates with Jira Cloud `/rest/api/3/myself`. Returns session JWT and creates `usr_jira_{accountId}` user. |
| `/api/auth/login/confluence` | `POST` | `{"email": "...", "api_token": "...", "base_url": "..."}` (optional) | Authenticates with Confluence Cloud `/wiki/rest/api/user/current`. Returns session JWT and creates `usr_confluence_{accountId}` user. |
| `/api/auth/login/slack` | `POST` | `{"token": "..."}` (optional) | Authenticates with Slack `auth.test`. Returns session JWT and creates `usr_slack_{userId}` user. |
| `/api/auth/login` | `POST` | `{"provider": "jira\|confluence\|slack", ...}` | Unified login dispatcher. |
| `/api/auth/atlassian` | `GET` | `?redirect_uri=...` | Initiates 3-legged OAuth code flow for browser/extension login. |
| `/api/auth/atlassian/callback` | `GET` | `?code=...&state=...` | Exchanges Atlassian OAuth code, creates user session, redirects with `#token=<session_token>`. |
| `/api/auth/me` | `GET` | Headers: `Authorization: Bearer <session_token>` | Returns current authenticated user, provider, email, and mode. |
| `/api/integrations/{provider}/connect` | `POST` | Headers: `Authorization: Bearer <session_token>` | Verifies and marks integration as connected. |

> **Note on Omitted Credentials**: If request payload fields are empty or omitted, the endpoints automatically default to the verified credentials configured in your `.env` file!

### Frontend Extension Integration

In `extension/src/services/api.ts`:
- `signInWithJira(credentials?)`: Logs in to Jira, stores JWT in session storage, returns user.
- `signInWithConfluence(credentials?)`: Logs in to Confluence, stores JWT, returns user.
- `signInWithSlack(credentials?)`: Logs in to Slack, stores JWT, returns user.

In `extension/src/components/CompanyIntegrationsView.tsx`:
- Clicking "Connect" on Jira, Confluence, or Slack asynchronously authenticates against the backend, receives real account identity, and marks the integration connected with interactive feedback!

---

## 6. Verification Checklist & Testing

### Running the Live Integration Verifier
From the repository root, run:
```bash
python verify_integrations.py
```

Expected output when configured:
```text
======================================================================
DevMinds Integration & Authentication Verifier
Testing Jira Cloud, Confluence Cloud, and Slack Web API...
======================================================================

[PASS] JIRA AUTHENTICATION
  Status:  CONNECTED
  HTTP:    200
  Latency: 1450.2ms
  Message: Successfully authenticated and verified Jira user identity.
  Identity Details:
    - account_id: 712020:2f25d767-fd13-4ea4-a7dd-29ef0b3fac72
    - display_name: Your Name
    - email_address: your-email@example.com
    - account_type: atlassian
    - active: True
    - time_zone: Asia/Calcutta

[PASS] CONFLUENCE AUTHENTICATION
  Status:  CONNECTED
  HTTP:    200
  Latency: 1210.4ms
  Message: Successfully authenticated and verified Confluence user identity.
  Identity Details:
    - account_id: 712020:2f25d767-fd13-4ea4-a7dd-29ef0b3fac72
    - display_name: Your Name
    - email_address: your-email@example.com
    - type: known
    - status: active

[PASS] SLACK AUTHENTICATION
  Status:  CONNECTED
  HTTP:    200
  Latency: 1680.1ms
  Message: Successfully authenticated and verified Slack Bot/User identity.
  Identity Details:
    - team_name: Your Workspace
    - team_id: T0CAK9K45GT
    - user_name: devminds_bot
    - user_id: U0CBYF8Q1K3
    - bot_id: B0CBUKE7CJJ
    - workspace_url: https://yourworkspace.slack.com/

======================================================================
[SUCCESS] All configured services authenticated successfully!
======================================================================
```

### Running the Automated Unit Test Suite
Unit tests mock network responses to ensure missing variables, HTTP status codes, and signature checks behave reliably:
```bash
python -m pytest backend/tests/integrations/test_auth_verifier.py -v
```

---

## 7. Troubleshooting & Common Errors Matrix

| Service | Error / HTTP Status | Root Cause | Remediation |
|---|---|---|---|
| **Jira / Confluence** | `HTTP 401 Unauthorized` | Invalid email, revoked token, or wrong account. | Ensure `JIRA_EMAIL` / `CONFLUENCE_EMAIL` matches your Atlassian ID exactly. Create a new token at `id.atlassian.com`. |
| **Jira / Confluence** | `HTTP 403 Forbidden` | User lacks Jira/Confluence product license or site enforces IP allowlisting / SSO. | Go to Atlassian Admin (`admin.atlassian.com`) and verify the user account has an active license for Jira Software or Confluence. |
| **Confluence** | `HTTP 404 Not Found` | URL missing the required `/wiki` prefix. | Confluence Cloud endpoints reside at `.../wiki/rest/api/...`. Ensure `CONFLUENCE_BASE_URL` ends with `/wiki`. |
| **Atlassian (OAuth)** | `redirect_uri_mismatch` | Callback URL does not match Developer Console. | In Atlassian Developer Console > App > Authorization, ensure the callback URL matches `ATLASSIAN_REDIRECT_URI` character for character. |
| **Atlassian (OAuth)** | Access token expires after 1 hr | Missing `offline_access` scope. | Include `offline_access` in your OAuth authorization scope string to receive a rotating refresh token. |
| **Slack** | `{"ok": false, "error": "invalid_auth"}` | Malformed or non-bot token copied. | Verify the token starts with `xoxb-` (Bot token) or `xoxp-` (User token). Check for trailing whitespace. |
| **Slack** | `{"ok": false, "error": "token_revoked"}` | App was uninstalled or token was regenerated. | Reinstall the application to the workspace from `api.slack.com/apps` and copy the new token. |
| **Slack** | `{"ok": false, "error": "missing_scope"}` | Token does not have permission for the requested endpoint. | Note the missing scope indicated in the response payload (e.g. `users:read`), add it in **OAuth & Permissions**, and click **Reinstall to Workspace**. |
| **Slack Webhooks** | Signature mismatch (`verify_request_signature` returns `False`) | Body was decoded as JSON before HMAC hash, or request is older than 5 minutes. | Always compute the HMAC hash over the raw unmodified byte string from the HTTP request body (`request.body()`), not parsed JSON. |
