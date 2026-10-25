#!/usr/bin/env python3
"""DevMinds Integration Verification Runner.

Runs verified test calls against Jira Cloud, Confluence Cloud, and Slack Web API
using credentials stored in your environment or .env file.

Usage:
    python verify_integrations.py
"""

import sys
from pathlib import Path

# Add backend directory to sys.path so app modules can be imported directly
backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.integrations.auth_verifier import run_all_verifications

if __name__ == "__main__":
    success = run_all_verifications()
    sys.exit(0 if success else 1)
