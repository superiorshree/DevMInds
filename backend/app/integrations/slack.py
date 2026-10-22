# File:        backend/app/integrations/slack.py
# Owner:       Kunal
# Purpose:     One-way Slack adapter — send the architecture summary to a channel, never read messages.
# Contains:    SlackAdapter class (check_connection, fetch, send) and a share_summary() helper.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/integrations/base.py, backend/app/core/config.py

"""Slack adapter (one-way send, company mode only).

DevMinds posts the architecture summary to a channel and nothing else. It never
reads Slack messages — `fetch` raises by design.
"""

from typing import Any

from app.integrations.base import IntegrationAdapter


class SlackAdapter(IntegrationAdapter):
    """One-way adapter for Slack (send-only)."""

    provider = "slack"

    def check_connection(self) -> bool:
        """Return True when the bot token is valid and the bot is installed.

        TODO(Kunal): call auth.test and return True on 200.
        """
        return False

    def fetch(self, **kwargs: Any) -> dict[str, Any]:
        """Slack is send-only for this project.

        TODO(Kunal): we never read Slack messages. Keep this raising.
        """
        raise NotImplementedError("Slack adapter is send-only")

    def send(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Send the architecture summary to a Slack channel.

        TODO(Kunal): POST to chat.postMessage with the summary text, returning
        {shared, channel, ts}. Raise RateLimitError on 429.
        """
        raise NotImplementedError("TODO(Kunal): Slack send")

    # --- Helper methods Kunal will implement ---

    def share_summary(self, channel: str, message: str) -> dict[str, Any]:
        """Post the architecture summary to a channel (one-way).

        TODO(Kunal): implement with chat.postMessage; return
        {shared: True, channel, ts}.
        """
        raise NotImplementedError("TODO(Kunal): share_summary")
