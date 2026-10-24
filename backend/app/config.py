# File:        backend/app/config.py
# Owner:       Shreyansh
# Purpose:     Re-exports the settings object so `from app.config import settings` works.
# Contains:    Settings re-export from app.core.config (resolved lazily from get_settings())
# Status:      REAL — compatibility re-export backed by the get_settings() cache
# Depends on:  backend/app/core/config.py

"""Public configuration entry point.

`app.core.config` exposes settings through the cached `get_settings()` factory,
not a module-level object. This module forwards `settings` to that same factory
(PEP 562 module `__getattr__`), so `from app.config import settings` keeps
working while returning the *same* instance `get_settings()` returns: no second
Settings is constructed, and the value stays correct after `get_settings.cache_clear()`.
"""

from typing import TYPE_CHECKING

from app.core.config import get_settings

if TYPE_CHECKING:
    from app.core.config import Settings

    settings: Settings


def __getattr__(name: str) -> object:
    """Resolve `settings` from the cached settings factory on first access."""
    if name == "settings":
        return get_settings()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
