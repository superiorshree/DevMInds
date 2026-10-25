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

    # Allowed Chrome extension IDs for OAuth redirects (comma-separated list of IDs or URLs).
    # Allows multiple developers with different unpacked extension IDs to sign in.
    allowed_extension_ids: str = ""

    # LLM provider — backend only.
    ai_chat_enabled: bool = True
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    ollama_timeout_seconds: int = 60
    external_llm_base_url: str = ""
    external_llm_api_key: str = ""
    external_llm_model: str = ""
    external_llm_timeout_seconds: int = 30
    allow_external_for_company: bool = False
    use_mock_integrations: bool = True

    # Jira (read-only) — company mode only.
    jira_base_url: str = ""
    jira_email: str = ""
    jira_api_token: str = ""

    # Confluence (read-only) — company mode only.
    confluence_base_url: str = ""
    confluence_email: str = ""
    confluence_api_token: str = ""

    # Slack (one-way send) — company mode only.
    slack_bot_token: str = ""
    slack_channel_ids: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        """CORS origins as a list, trimmed and empty-safe."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def allowed_extension_ids_set(self) -> set[str]:
        """Set of allowed Chrome extension IDs (lowercased) for OAuth redirects.

        Extracts IDs from:
        1. Explicitly configured allowed_extension_ids (IDs or chromiumapp URLs)
        2. extension_redirect_uri (if configured)
        3. cors_origins (e.g. chrome-extension://<id>)
        """
        from urllib.parse import urlsplit

        allowed: set[str] = set()

        if self.allowed_extension_ids:
            for item in self.allowed_extension_ids.split(","):
                item = item.strip().lower()
                if not item:
                    continue
                if ".chromiumapp.org" in item:
                    try:
                        host = urlsplit(item).hostname or item
                        ext_id = host.split(".chromiumapp.org")[0]
                        if ext_id:
                            allowed.add(ext_id)
                    except Exception:
                        pass
                elif item.startswith("chrome-extension://"):
                    ext_id = item.removeprefix("chrome-extension://").strip("/")
                    if ext_id:
                        allowed.add(ext_id)
                else:
                    allowed.add(item)

        if self.extension_redirect_uri:
            try:
                host = (urlsplit(self.extension_redirect_uri).hostname or "").lower()
                if host.endswith(".chromiumapp.org"):
                    ext_id = host[:-len(".chromiumapp.org")]
                    if ext_id:
                        allowed.add(ext_id)
            except Exception:
                pass

        for origin in self.cors_origins_list:
            origin_lower = origin.strip().lower()
            if origin_lower.startswith("chrome-extension://"):
                ext_id = origin_lower.removeprefix("chrome-extension://").strip("/")
                if ext_id and "<" not in ext_id and ">" not in ext_id:
                    allowed.add(ext_id)

        return allowed


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (read env once per process)."""
    return Settings()
