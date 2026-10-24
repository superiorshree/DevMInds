from typing import Literal, Optional, Any
from pydantic import BaseModel

Mode = Literal["open_source", "company"]
Visibility = Literal["public", "private"]

class SourceRef(BaseModel):
    title: str
    url: str
    source_type: Literal["github", "jira", "slack", "confluence"]

class RepoFile(BaseModel):          # supplied by Shreyansh
    path: str
    content: str                    # text only
    url: str                        # link to the file on GitHub

class RepositoryContext(BaseModel): # supplied by Shreyansh
    visibility: Visibility
    analysis: dict                  # the repository analysis
    files: list[RepoFile] = []      # up to 200 text files, each max 50 KB

class CompanyItem(BaseModel):       # produced by Kunal
    source_type: Literal["jira", "slack", "confluence"]
    title: str
    content: str
    url: str
    metadata: dict[str, Any] = {}

class ConnectorError(BaseModel):
    source_type: Literal["jira", "slack", "confluence"]
    code: Literal["NOT_CONNECTED", "TOKEN_EXPIRED", "NO_PERMISSION", "RATE_LIMITED", "API_DOWN"]
    message: str

class CompanyContext(BaseModel):    # produced by Kunal
    items: list[CompanyItem] = []
    errors: list[ConnectorError] = []

class AIError(BaseModel):
    code: Literal["PRIVATE_AI_UNAVAILABLE", "EXTERNAL_AI_NOT_ALLOWED", "AI_DISABLED", "PROVIDER_ERROR"]
    message: str

class AIAnswer(BaseModel):          # produced by Devyani
    answer: Optional[str] = None
    sources: list[SourceRef] = []
    provider: Optional[Literal["ollama", "external"]] = None
    error: Optional[AIError] = None