
"""Read-only Confluence Cloud connector for DevMinds."""

import html
import re
from typing import Any

import httpx

from app.schemas.contracts import CompanyContext, CompanyItem, ConnectorError
from app.integrations.base import BaseConnector
from app.config import settings


MAX_ITEMS = 5
MAX_CONTENT_CHARS = 2000
TIMEOUT = 20.0


def _credentials():
    base = settings.confluence_base_url.strip().rstrip("/")
    email = settings.confluence_email.strip()
    token = settings.confluence_api_token.strip()

    if not all((base, email, token)):
        return None

    return base, email, token


def _clean_html(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value or "")
    value = html.unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def _error(status: int) -> ConnectorError:
    if status == 401:
        code = "TOKEN_EXPIRED"
    elif status == 403:
        code = "NO_PERMISSION"
    elif status == 429:
        code = "RATE_LIMITED"
    else:
        code = "API_DOWN"

    return ConnectorError(
        source_type="confluence",
        code=code,
        message=f"Confluence API request failed (HTTP {status})",
    )


class ConfluenceConnector(BaseConnector):
    source_type = "confluence"

    def check_connection(self) -> bool:
        return _credentials() is not None

    async def fetch(
        self, repo_full_name: str, query: str
    ) -> CompanyContext:
        credentials = _credentials()

        if credentials is None:
            return CompanyContext(
                errors=[
                    ConnectorError(
                        source_type="confluence",
                        code="NOT_CONNECTED",
                        message="Confluence credentials are missing",
                    )
                ]
            )

        base, email, token = credentials
        repo_name = repo_full_name.split("/")[-1]

        # Prefer the repository name, then the supplied query.
        search_term = repo_name or query
        search_term = re.sub(r"[\x00-\x1f\"\\]", " ", search_term)
        search_term = search_term.strip()

        if not search_term:
            return CompanyContext()

        cql = f'type=page AND text ~ "{search_term}"'

        try:
            async with httpx.AsyncClient(
                auth=httpx.BasicAuth(email, token),
                headers={"Accept": "application/json"},
                timeout=TIMEOUT,
            ) as client:

                response = await client.get(
                    f"{base}/rest/api/search",
                    params={"cql": cql, "limit": MAX_ITEMS},
                )

                if response.status_code != 200:
                    return CompanyContext(
                        errors=[_error(response.status_code)]
                    )

                data = response.json()
                items = []

                for result in data.get("results", [])[:MAX_ITEMS]:
                    page = result.get("content") or {}
                    page_id = page.get("id")

                    if not page_id:
                        continue

                    detail = await client.get(
                        f"{base}/rest/api/content/{page_id}",
                        params={
                            "expand": "body.storage,space,version"
                        },
                    )

                    if detail.status_code != 200:
                        return CompanyContext(
                            items=items,
                            errors=[_error(detail.status_code)],
                        )

                    page_data = detail.json()

                    raw_content = (
                        page_data.get("body", {})
                        .get("storage", {})
                        .get("value", "")
                    )

                    title = html.unescape(
                        page_data.get("title", "Untitled")
                    )

                    space = page_data.get("space") or {}
                    version = page_data.get("version") or {}


                    links = page_data.get("_links") or {}
                    webui = links.get("webui", "")

                    if webui.startswith("/"):
                        if webui.startswith("/wiki/"):
                            url = base.split("/wiki")[0] + webui
                        else:
                            url = base + webui
                    else:
                        url = (
                            f"{base}/pages/viewpage.action"
                            f"?pageId={page_id}"
                        )

                    items.append(
                        CompanyItem(
                            source_type="confluence",
                            title=title[:300],
                            content=_clean_html(raw_content)[
                                :MAX_CONTENT_CHARS
                            ],
                            url=url,
                            metadata={
                                "page_id": page_id,
                                "space": space.get("key"),
                                "last_updated": version.get("when"),
                            },
                        )
                    )

                return CompanyContext(items=items)

        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            return CompanyContext(
                errors=[
                    ConnectorError(
                        source_type="confluence",
                        code="API_DOWN",
                        message="Unable to retrieve Confluence pages",
                    )
                ]
            )

    def send(self, payload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError(
            "Confluence connector is read-only"
        )

    def get_pages_for_repo(
        self, owner: str, name: str
    ) -> list[dict[str, Any]]:
        """Synchronous convenience method for listing repository pages."""
        credentials = _credentials()
        if credentials is None:
            return []

        base, email, token = credentials
        search_term = re.sub(r'["\\\x00-\x1f]', " ", name).strip()

        if not search_term:
            return []

        try:
            with httpx.Client(
                auth=(email, token),
                timeout=TIMEOUT,
                headers={"Accept": "application/json"},
            ) as client:
                response = client.get(
                    f"{base}/rest/api/search",
                    params={
                        "cql": f'type=page AND text ~ "{search_term}"',
                        "limit": MAX_ITEMS,
                    },
                )
                response.raise_for_status()

                pages = []
                for result in response.json().get("results", []):
                    content = result.get("content") or {}
                    page_id = content.get("id")
                    if not page_id:
                        continue

                    pages.append({
                        "id": page_id,
                        "title": html.unescape(
                            content.get("title", "")
                        ),
                        "url": (
                            f"{base}/pages/viewpage.action"
                            f"?pageId={page_id}"
                        ),
                        "space": None,
                    })

                return pages

        except (httpx.HTTPError, ValueError, TypeError):
            return []
