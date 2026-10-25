# File:        backend/app/integrations/base.py
# Owner:       Shreyansh (IntegrationAdapter) / Kunal (BaseConnector)
# Purpose:     Defines the shared interfaces every integration implements: BaseConnector for the company connectors, IntegrationAdapter for provider adapters.
# Contains:    BaseConnector abstract base class (async fetch -> CompanyContext), IntegrationAdapter abstract base class, AdapterError and RateLimitError exceptions.
# Status:      BaseConnector REAL — used by get_company_context(); IntegrationAdapter is the provider adapter contract.
# Depends on:  backend/app/schemas/contracts.py (CompanyContext)

"""The integration interfaces.

Two contracts live in this module:

- ``BaseConnector`` — what the company connectors (Jira, Slack, Confluence)
  implement, so ``get_company_context()`` can run them all the same way and
  collect their failures uniformly.
- ``IntegrationAdapter`` — the provider adapter contract (GitHub and the rest):
  check connection, fetch or send, return clean data with source links, and
  surface errors/rate limits uniformly.
"""


from abc import ABC, abstractmethod
from typing import Any, Literal

from app.schemas.contracts import CompanyContext


class IntegrationAdapter(ABC):
    """Abstract base class for every external integration."""

    #: Short provider identifier, e.g. "github", "jira". Set on subclasses.
    provider: str = "base"

    @abstractmethod
    def check_connection(self) -> bool:
        """Return True when the integration is configured and reachable."""

    @abstractmethod
    def fetch(self, **kwargs: Any) -> Any:
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


class BaseConnector(IntegrationAdapter, ABC):
    """Base class for every company integration connector.

    Connectors return the frozen ``CompanyContext`` from the contracts module.
    They never raise for provider problems: failures come back as
    ``ConnectorError`` entries in ``CompanyContext.errors`` so one broken
    integration never hides the others.
    """

    #: Frozen source_type of the items and errors this connector produces —
    #: "jira", "slack" or "confluence". Set on subclasses.
    source_type: Literal["jira", "slack", "confluence"]

    @property
    def provider(self) -> str:
        return self.source_type

    @abstractmethod
    async def fetch(self, repo_full_name: str = "", query: str = "") -> CompanyContext:
        """Return company items related to a repository for the given query.

        Report failures as ``ConnectorError`` entries in the returned
        context instead of raising. ``get_company_context()`` also accepts a
        synchronous implementation (JiraConnector is synchronous today).
        """

    def check_connection(self) -> bool:
        """Return True when this connector is configured and ready.

        The default answer is "not configured"; connectors with credentials
        override this.
        """
        return False

    def send(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError(f"{self.source_type} is read-only")


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
