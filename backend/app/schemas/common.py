# File:        backend/app/schemas/common.py
# Owner:       Shreyansh
# Purpose:     Small shared Pydantic models used across many endpoints (health, mode, links, errors).
# Contains:    HealthResponse, ModeResponse, SourceLink, LinkList, generic message/detail models.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/core/modes.py (UserMode, MODE_FEATURES)

"""Common request/response models shared across endpoints."""

from typing import Literal
from pydantic import BaseModel

from app.schemas.contracts import Mode


class HealthResponse(BaseModel):
    """Response shape for GET /health."""

    status: str
    service: str
    version: str


class ModeFeatures(BaseModel):
    """The per-mode feature flags the frontend reads to decide what to render."""

    privateRepos: bool = False
    contributeTab: bool = False
    contextTab: bool = False
    jira: bool = False
    confluence: bool = False
    slackShare: bool = False


class ModeResponse(BaseModel):
    """Response shape for GET/PUT /api/me/mode."""

    mode: Mode
    features: ModeFeatures


class ModeRequest(BaseModel):
    """Request body for PUT /api/me/mode.

    ``mode`` is a plain string on purpose: an unknown value must surface as
    HTTP 400 with a clear message (per API_CONTRACT.md), not as a 422
    validation error from a Literal field. The route validates it against
    UserMode.
    """

    mode: str


class SourceLink(BaseModel):
    """A link to a source of truth (GitHub file, Jira issue, Confluence page)."""

    id: str | None = None
    title: str
    url: str
    sourceType: str


class LinkList(BaseModel):
    """A repository's saved links (GET/PUT .../links)."""

    owner: str
    name: str
    links: list[SourceLink] = []


class AnalyzeRequest(BaseModel):
    """Request body for POST /api/repositories/analyze."""

    owner: str
    name: str
    branch: str = "main"


class AnalyzeResponse(BaseModel):
    """Response shape for POST /api/repositories/analyze."""

    job_id: str
    owner: str
    name: str
    status: str


class ChatRequest(BaseModel):
    """Request body for POST /api/chat."""

    owner: str
    name: str
    question: str


class ChatResponse(BaseModel):
    """Response shape for POST /api/chat."""

    answer: str
    sources: list[SourceLink] = []


class DetailResponse(BaseModel):
    """Generic {detail: ...} response used by auth and integration routes."""

    detail: str
