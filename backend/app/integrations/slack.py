# File:        backend/app/integrations/slack.py
# Owner:       Kunal
# Purpose:     Slack connector — company-mode items for a repository, plus the one-way summary share placeholder.
# Contains:    SlackConnector (source_type, check_connection, fetch stub returning NOT_CONNECTED, send and share_summary placeholders).
# Status:      STUB — fetch reports NOT_CONNECTED; later tasks fill in the real calls.
# Depends on:  backend/app/integrations/base.py, backend/app/schemas/contracts.py, backend/app/config.py

"""Slack connector (company mode only).

Until the real Slack task lands, ``fetch`` reports NOT_CONNECTED instead of
raising, so ``get_company_context()`` collects it like any other connector
error. Slack credentials come from SLACK_BOT_TOKEN and SLACK_CHANNEL_IDS.
"""

from typing import Any

from app.integrations.base import BaseConnector
from app.schemas.contracts import CompanyContext, ConnectorError


class SlackConnector(BaseConnector):
    """Slack connector. Stub: reports NOT_CONNECTED until the real API task."""

    source_type = "slack"

    async def fetch(self, repo_full_name: str, query: str) -> CompanyContext:
        """Return Slack items related to a repository.

        TODO(Kunal): the later Slack task fills this in (search the
        configured channels, return CompanyItems with permalinks). Until
        then it reports NOT_CONNECTED, never raises.
        """
        return CompanyContext(
            errors=[
                ConnectorError(
                    source_type="slack",
                    code="NOT_CONNECTED",
                    message="Slack is not connected (SLACK_BOT_TOKEN, SLACK_CHANNEL_IDS)",
                )
            ]
        )

    def check_connection(self) -> bool:
        """Return True when the bot token and channel ids are configured.

        TODO(Kunal): call auth.test and return True on 200.
        """
        return False

    def send(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Slack is send-only for this project.

        TODO(Kunal): we never read Slack messages through this path. Keep
        this raising; the share endpoint uses share_summary().
        """
        raise NotImplementedError("Slack connector is send-only")

    # --- Helper methods Kunal will implement ---

    def share_summary(self, channel: str, message: str) -> dict[str, Any]:
        """Post the architecture summary to a channel (one-way).

        TODO(Kunal): implement with chat.postMessage; return
        {shared: True, channel, ts}.
        """
        raise NotImplementedError("TODO(Kunal): share_summary")
