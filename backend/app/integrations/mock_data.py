# File:        backend/app/integrations/mock_data.py
# Owner:       Kunal
# Purpose:     Offline sample company data so the demo works with USE_MOCK_INTEGRATIONS=true.
# Contains:    MOCK_COMPANY_ITEMS (2 Jira, 2 Slack, 2 Confluence CompanyItems) and mock_company_items().
# Status:      REAL — sample data only; loaded exclusively by the mock branch in app/integrations/__init__.py.
# Depends on:  backend/app/schemas/contracts.py (CompanyItem)

"""Sample company items used when USE_MOCK_INTEGRATIONS is true.

These items are fake but shaped exactly like real ones: the frozen fields,
working-looking source urls, and no secrets. Real connector code never
imports this module — only the mock branch in app/integrations/__init__.py
loads it, and only when mock mode is on, so the demo works with no internet.
"""

from app.schemas.contracts import CompanyItem

MOCK_COMPANY_ITEMS: list[CompanyItem] = [
    CompanyItem(
        source_type="jira",
        title="DEV-101: Migrate router to the new matcher",
        content=(
            "Move the webapp router to the new matcher used by acme/webapp. "
            "The old matcher drops query parameters on redirect, which breaks "
            "the login flow. Acceptance criteria: all router tests pass and "
            "the redirect cache is invalidated on deploy."
        ),
        url="https://acme.atlassian.net/browse/DEV-101",
        metadata={"status": "In Progress", "assignee": "Devyani", "priority": "High"},
    ),
    CompanyItem(
        source_type="jira",
        title="DEV-102: Add login page tests",
        content=(
            "Cover the login flow of acme/webapp with end-to-end tests: happy "
            "path, wrong password and expired session. Blocks the release "
            "checklist for the router migration in DEV-101."
        ),
        url="https://acme.atlassian.net/browse/DEV-102",
        metadata={"status": "To Do", "assignee": "Unassigned", "priority": "Medium"},
    ),
    CompanyItem(
        source_type="slack",
        title="#platform-eng: router migration plan",
        content=(
            "Devyani: the router migration for acme/webapp lands Thursday. "
            "Shreyansh: I will update the architecture summary once the "
            "matcher change is merged. Kunal: integrations stay read-only."
        ),
        url="https://acme.slack.com/archives/C01PLATFORM/p1730000000000100",
        metadata={
            "channel": "#platform-eng",
            "channel_id": "C01PLATFORM",
            "ts": "1730000000.000100",
            "author": "Devyani",
        },
    ),
    CompanyItem(
        source_type="slack",
        title="#incidents: login redirect loop",
        content=(
            "Kunal: users hitting a redirect loop on login after the router "
            "deploy. Devyani: the matcher fell back to the default route. "
            "Fix is in DEV-101, rolling out now."
        ),
        url="https://acme.slack.com/archives/C01INCIDENTS/p1730000000000200",
        metadata={
            "channel": "#incidents",
            "channel_id": "C01INCIDENTS",
            "ts": "1730000000.000200",
            "author": "Kunal",
        },
    ),
    CompanyItem(
        source_type="confluence",
        title="Architecture Overview",
        content=(
            "The acme/webapp repository is a FastAPI backend plus a Chrome "
            "extension. Requests flow: extension -> API router -> services -> "
            "integrations layer. The router owns all path matching and "
            "redirects; see DEV-101 for the current migration."
        ),
        url="https://acme.atlassian.net/wiki/spaces/ENG/pages/10011001/Architecture+Overview",
        metadata={"space": "ENG", "page_id": "10011001", "last_updated": "2026-10-14"},
    ),
    CompanyItem(
        source_type="confluence",
        title="Onboarding Guide",
        content=(
            "Day one on acme/webapp: clone the repository, copy .env.example "
            "to .env, run the backend with uvicorn, load the extension. Ask "
            "in #platform-eng if the login flow fails, and read the "
            "Architecture Overview before touching the router."
        ),
        url="https://acme.atlassian.net/wiki/spaces/ENG/pages/10011002/Onboarding+Guide",
        metadata={"space": "ENG", "page_id": "10011002", "last_updated": "2026-10-02"},
    ),
]


def mock_company_items() -> list[CompanyItem]:
    """Return a fresh list of the mock items, safe for callers to modify."""
    return list(MOCK_COMPANY_ITEMS)
