# File:        backend/app/ai/errors.py
# Owner:       Devyani
# Purpose:     Custom exception classes for AI provider failures
# Contains:    ProviderError, PrivateAIUnavailable, ExternalNotAllowed
# Status:      REAL
# Depends on:  None


class ProviderError(Exception):
    """Base exception for AI provider failures.

    `code` is one of the frozen AI error codes from
    backend/app/schemas/contracts.py so callers can map it straight onto
    an AIError contract object.
    """

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


class PrivateAIUnavailable(ProviderError):
    """Raised when the private Ollama AI cannot answer (down or misconfigured).

    Private data must never fall back to the external AI, so this error
    disables the answer entirely.
    """

    def __init__(self, message: str = "Private AI is not running. Start Ollama on this laptop."):
        super().__init__(code="PRIVATE_AI_UNAVAILABLE", message=message)


class ExternalNotAllowed(ProviderError):
    """Raised when the external AI must not be used or is not configured."""

    def __init__(self, message: str = "External AI is not allowed or not configured."):
        super().__init__(code="EXTERNAL_AI_NOT_ALLOWED", message=message)
