# File:        backend/app/integrations/base.py
# Owner:       Shreyansh
# Purpose:     Defines the shared interface every external-service adapter (GitHub, Jira, Confluence, Slack) must implement.
# Contains:    IntegrationAdapter abstract base class, AdapterError and RateLimitError exceptions.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  (none — this is the base contract)

"""The adapter interface.

Each external service lives in its own adapter implementing this interface, so
every adapter behaves the same way: check connection, fetch or send, return
clean data with source links, and surface errors/rate limits uniformly.
"""

from abc import ABC, abstractmethod
from typing import Any


class AdapterError(Exception):
    """A provider returned an error we could not handle cleanly."""

    def __init__(self, provider: str, message: str, code: str = "provider_error") -> None:
        self.provider = provider
        self.message = message
        self.code = code
        super().__init__(f"{provider}: {message}")


class RateLimitError(AdapterError):
    """The provider rate-limited us. Surfaces to the client as HTTP 429."""

    def __init__(self, provider: str, message: str = "Rate limited by provider") -> None:
        super().__init__(provider, message, code="rate_limited")


class IntegrationAdapter(ABC):
    """Abstract base class for every external integration."""

    #: Short provider identifier, e.g. "github", "jira". Set on subclasses.
    provider: str = "base"

    @abstractmethod
    def check_connection(self) -> bool:
        """Return True when the integration is configured and reachable."""

    @abstractmethod
    def fetch(self, **kwargs: Any) -> dict[str, Any]:
        """Fetch data from the provider and return clean, source-linked data.

        Adapters must catch provider errors and rate limits, and raise
        AdapterError / RateLimitError instead of leaking raw exceptions.
        """

    @abstractmethod
    def send(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Send data to the provider (write path).

        Read-only integrations (Jira, Confluence) should raise
        NotImplementedError — they never send.
        """
