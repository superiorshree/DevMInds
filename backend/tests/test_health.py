# File:        backend/tests/test_health.py
# Owner:       Shreyansh
# Purpose:     Verifies the backend boots and the /health endpoint returns ok.
# Contains:    test_health_returns_ok().
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/main.py (FastAPI app)

"""Smoke test: the app imports and /health responds."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    """GET /health returns 200 with status "ok"."""
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "devminds-backend"
