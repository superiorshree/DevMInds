# File:        backend/app/database/models.py
# Owner:       Shreyansh
# Purpose:     SQLAlchemy table definitions for users, saved links and analysis cache.
# Contains:    SQLAlchemy declarative models: User, SavedLink, AnalysisCache.
# Status:      STUB, replace TODOs with real implementation
# Depends on:  backend/app/core/config.py (DATABASE_URL)

"""Database models (SQLAlchemy stubs).

A local demo may start without PostgreSQL — config defaults to SQLite. These
tables are defined so the shape is agreed, but no queries are written yet.
"""

from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Declarative base for all models."""


class User(Base):
    """A signed-in user and their server-side mode."""

    __tablename__ = "users"

    id = Column(String, primary_key=True)
    github_login = Column(String, unique=True, nullable=False)
    avatar_url = Column(String, default="")
    # TODO(Shreyansh): store the persisted mode (open_contributor / company_employee).
    mode = Column(String, default="open_contributor")


class SavedLink(Base):
    """A source link a user saved for a repository."""

    __tablename__ = "saved_links"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    owner = Column(String, nullable=False)
    name = Column(String, nullable=False)
    title = Column(String, default="")
    url = Column(String, default="")
    source_type = Column(String, default="github_file")


class AnalysisCache(Base):
    """Cached analysis bundle for a repository + branch."""

    __tablename__ = "analysis_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    owner = Column(String, nullable=False)
    name = Column(String, nullable=False)
    branch = Column(String, default="main")
    # TODO(Shreyansh): store the serialized ArchitectureBundle as JSON.
    bundle_json = Column(Text, default="")
