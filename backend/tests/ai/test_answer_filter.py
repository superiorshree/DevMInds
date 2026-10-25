import asyncio
from types import SimpleNamespace

import app.ai as ai_module
import app.ai.gateway as gateway_module
from app.ai import AIService

FAKE_TOKEN = "ghp_" + "A1b2C3d4E5" * 3  # obviously fake


def test_answer_removes_secrets_before_ollama(monkeypatch):
    received = []

    class FakeOllama:
        async def generate(self, messages):
            received.append(messages)
            return "ok"

    monkeypatch.setattr(gateway_module, "OllamaProvider", FakeOllama)
    monkeypatch.setattr(
        ai_module, "get_settings",
        lambda: SimpleNamespace(ai_chat_enabled=True, ollama_model="test"),
    )

    private_repo = {"visibility": "private", "analysis": {}, "files": []}
    result = asyncio.run(
        AIService().answer(f"What is {FAKE_TOKEN}?", private_repo, [], "company")
    )

    assert result.provider == "ollama"
    assert len(received) == 1
    assert FAKE_TOKEN not in str(received[0])
    assert "[REDACTED]" in str(received[0])