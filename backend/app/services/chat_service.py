# File:        backend/app/services/chat_service.py
# Owner:       Devyani
# Purpose:     Answers questions about a repository using the AI service, with real source links and plain-English HTTP errors.
# Contains:    answer_question() (collects repo files + company items, calls get_ai_service(), maps AI errors to HTTP 502/503) and source/error helpers.
# Status:      REAL — real GitHub context via collect_repo_files(), Jira/Confluence items only in company mode, provider failures surface as HTTP 502.
# Depends on:  backend/app/schemas/common.py (ChatResponse, SourceLink), backend/app/schemas/contracts.py (RepositoryContext, CompanyItem),
#              backend/app/services/repository_analyzer.py (collect_repo_files), backend/app/integrations/__init__.py (get_company_context),
#              backend/app/ai/__init__.py (get_ai_service), backend/app/core/modes.py (UserMode)

"""Chat service.

Context rules:

* GitHub files — always (the repository the user asked about).
* Jira/Confluence/Slack items — only when the SERVER-SIDE mode is "company".

The privacy rule in app/ai/gateway.py decides which provider may see that
context; this module never weakens it. Provider failures are turned into plain
HTTP errors with sentences a person can act on.
"""

from fastapi import HTTPException

from app.ai import get_ai_service
from app.core.modes import UserMode
from app.integrations import get_company_context
from app.schemas.common import ChatResponse, SourceLink
from app.schemas.contracts import AIError, CompanyItem, RepositoryContext  # noqa: F401 (RepositoryContext used in type hints)
from app.services.repository_analyzer import collect_repo_files

#: AI error code -> plain-English message. No codes, no jargon, one clear fix.
_FRIENDLY_MESSAGES: dict[str, str] = {
    "AI_DISABLED": (
        "AI chat is switched off on this server. Ask whoever runs DevMinds "
        "to turn AI_CHAT_ENABLED on."
    ),
    "PRIVATE_AI_UNAVAILABLE": (
        "The private AI (Ollama) is not running on this machine. Start Ollama "
        "and try again."
    ),
    "EXTERNAL_AI_NOT_ALLOWED": (
        "The outside AI is not allowed to see this data, and the private AI "
        "is not running."
    ),
    "PROVIDER_ERROR": (
        "The AI service had a problem answering that. Please try again in a "
        "moment."
    ),
}

#: Provider failures answer 502 (the AI provider is the "upstream" service).
#: AI_DISABLED is our own configuration, so it answers 503 instead.
_PROVIDER_ERROR_STATUS = 502
_DISABLED_STATUS = 503


async def answer_question(
    owner: str,
    name: str,
    question: str,
    mode: UserMode,
    github_token: str = "",
) -> ChatResponse:
    """Answer a question about a repository, always citing real sources.

    Raises:
        HTTPException: 429 when GitHub rate-limits us, 502 when the AI
            provider fails, 503 when AI is switched off — each with a
            plain-English message.
    """
    repo_context = collect_repo_files(owner, name, "main", github_token)

    company_items: list[CompanyItem] = []
    if mode == UserMode.company:
        # Only company mode may pull Jira/Confluence data, and only this
        # server-side mode decides that — never a value from the request.
        context = get_company_context(f"{owner}/{name}", question, mode.value)
        company_items = list(context.items)

    result = await get_ai_service().answer(
        question, repo_context, company_items, mode.value
    )

    if result.error is not None:
        raise _http_error_for(result.error)
    answer_text = (result.answer or "").strip()
    if not answer_text:
        raise HTTPException(
            status_code=_PROVIDER_ERROR_STATUS,
            detail="The AI came back with an empty answer. Please try again.",
        )

    return ChatResponse(
        answer=answer_text,
        sources=_build_sources(result, owner, name, repo_context, company_items),
    )



def _http_error_for(error: AIError) -> HTTPException:
    """Turn an AIError into an HTTP error with a sentence, not a code."""
    if error.code == "AI_DISABLED":
        status_code = _DISABLED_STATUS
        detail = _FRIENDLY_MESSAGES["AI_DISABLED"]
    else:
        status_code = _PROVIDER_ERROR_STATUS
        detail = _FRIENDLY_MESSAGES.get(error.code, _FRIENDLY_MESSAGES["PROVIDER_ERROR"])
        # Some provider messages are already plain sentences with a fix
        # (e.g. "Model 'x' is not installed. Run `ollama pull x`.") — use them.
        if error.message and error.message[0].isupper() and "PROVIDER_ERROR" not in error.message:
            detail = error.message
    return HTTPException(status_code=status_code, detail=detail)


def _build_sources(
    result,
    owner: str,
    name: str,
    repo_context: RepositoryContext,
    company_items: list[CompanyItem],
) -> list[SourceLink]:
    """Real links only, deduplicated, never empty."""
    links: list[SourceLink] = []
    seen: set[str] = set()

    def add(title: str, url: str, source_type: str) -> None:
        if not url or not url.startswith(("http://", "https://")) or url in seen:
            return
        seen.add(url)
        links.append(SourceLink(title=title, url=url, sourceType=source_type))

    # 1) Whatever the AI itself cited.
    for ref in getattr(result, "sources", None) or []:
        add(ref.title, ref.url, ref.source_type)

    # 2) The repository files we actually read.
    for repo_file in repo_context.files:
        add(repo_file.path, repo_file.url, "github")

    # 3) Company items (company mode only).
    for item in company_items:
        add(item.title, item.url, item.source_type)

    # 4) Last resort: the repository page itself.
    if not links:
        add(f"{owner}/{name}", f"https://github.com/{owner}/{name}", "github")

    return links
