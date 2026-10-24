# File:        backend/app/ai/base.py
# Owner:       Devyani
# Purpose:     Base provider interface shared by all AI providers
# Contains:    BaseProvider class with async generate()
# Status:      REAL
# Depends on:  None

from typing import List


class BaseProvider:
    """Interface every AI provider implements.

    A provider only sends messages and returns text. Routing (which provider
    may see which data) lives in gateway.py, never here.
    """

    async def generate(self, messages: List[dict]) -> str:
        """Send chat messages to the model and return the answer text."""
        raise NotImplementedError("Subclasses must implement generate()")
