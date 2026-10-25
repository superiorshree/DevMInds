# File:        backend/app/main.py
# Owner:       Shreyansh
# Purpose:     Creates the FastAPI app, configures CORS, registers every router, and exposes the /health endpoint.
# Contains:    FastAPI app instance, CORS middleware, router registration, health() route.
# Status:      REAL — registers auth, modes, repositories, integrations, chat, ai, and company routers.
# Depends on:  backend/app/core/config.py, backend/app/api/* routers

"""DevMinds backend entrypoint.

Run locally with:  uvicorn app.main:app --reload
Then check:        GET http://localhost:8000/health  ->  {"status": "ok", ...}
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import ai, auth, chat, company, integrations, modes, repositories
from app.core.config import get_settings
from app.schemas.common import HealthResponse

settings = get_settings()

app = FastAPI(
    title="DevMinds Backend",
    version="0.1.0",
    description="Codebase Mentor — the backend finds facts, the AI explains them, the extension displays them.",
)

# CORS — restricted to the configured origins (the local extension during dev).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register every feature router.
app.include_router(auth.router)
app.include_router(modes.router)
app.include_router(repositories.router)
app.include_router(integrations.router)
app.include_router(chat.router)
app.include_router(ai.router)
app.include_router(company.router)


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    """Liveness check used by local dev, tests and (later) monitoring."""
    return HealthResponse(status="ok", service=settings.app_name, version="0.1.0")
