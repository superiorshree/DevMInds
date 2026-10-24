# File:        backend/app/core/config.py
# Owner:       Shreyansh
# Purpose:     Central place for all backend configuration, read from environment variables.
# Contains:    Settings class (pydantic-settings) and a get_settings() singleton accessor.
# Status:      REAL — settings are read from env; auth-related keys (SESSION_SECRET, EXTENSION_REDIRECT_URI) added.
# Depends on:  backend/.env (git-ignored), backend/.env.example (names only)

"""Application configuration.

No secrets live in code. Every value is read from the environment via this
module. Add new config keys here, and add their names to backend/.env.example.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings loaded from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_name: str = "devminds-backend"
    debug: bool = False
    backend_host: str = "localhost"
    backend_port: int = 8000

    # CORS — origins allowed to call the API.
    cors_origins: str = "chrome-extension://<extension-id>,http://localhost:5173"

    # Database — optional for the local demo (models are stubs).
    database_url: str = "sqlite:///./devminds.db"

    # GitHub OAuth — backend only, NEVER shipped to the extension.
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:8000/api/auth/github/callback"

    # Session signing secret (HS256) — backend only, NEVER shipped to the extension.
    # No default on purpose: it MUST come from the environment.
    session_secret: str = ""

    # Where the OAuth callback redirects the browser after sign-in: the
    # chromiumapp.org URL the extension passes to chrome.identity.launchWebAuthFlow.
    extension_redirect_uri: str = ""

    # LLM provider — backend only.
    llm_api_key: str = ""
    llm_model: str = ""

    # Jira (read-only) — company mode only.
    jira_base_url: str = ""
    jira_api_token: str = ""
    jira_email: str = ""

    # Confluence (read-only) — company mode only.
    confluence_base_url: str = ""
    confluence_api_token: str = ""
    confluence_email: str = ""

    # Slack (one-way send) — company mode only.
    slack_bot_token: str = ""
    slack_signing_secret: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        """CORS origins as a list, trimmed and empty-safe."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (read env once per process)."""
    return Settings()
