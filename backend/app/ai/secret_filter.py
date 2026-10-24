# File:        backend/app/ai/secret_filter.py
# Owner:       Devyani
# Purpose:     Remove secrets from any text before it is sent to an AI provider.
# Contains:    filter_secrets(), filter_messages(), the secret regex patterns (PEM blocks,
#              GitHub/AWS/Slack tokens, KEY=value lines, random-looking strings) and helpers.
# Status:      REAL
# Depends on:  (none — standard library `re` only)

"""Secret redaction for everything that leaves the AI module.

Repository files, Jira/Slack/Confluence items and the user question are
untrusted text. Before any message reaches Ollama or the external LLM it
passes through filter_messages(), which redacts credentials with
[REDACTED] so no key or token ever leaves this laptop.

Kept deliberately simple on purpose: plain regular expressions and keyword
search, no extra dependencies (frozen project rule).
"""

import re
from typing import Any, Dict, List, Match

#: Replacement written in place of every matched secret.
REDACTED = "[REDACTED]"

# Variable names whose value must never leave the backend
# (matched case-insensitively, compared as whole "_"-separated words).
_SECRET_WORDS = frozenset({"KEY", "TOKEN", "SECRET", "PASSWORD", "PASSWD", "PWD", "APIKEY"})

# --- Secret patterns, applied in this order (specific first) ---------------

# Entire PEM private key blocks, including multi-line bodies.
_PRIVATE_KEY_BLOCK = re.compile(
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----",
    re.DOTALL,
)

# GitHub tokens: ghp_/ghs_/gho_/ghu_/ghr_ and fine-grained personal tokens.
_GITHUB_TOKEN = re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})")

# AWS access key IDs (permanent AKIA... and temporary ASIA...).
_AWS_ACCESS_KEY = re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")

# Slack tokens: xoxb-, xoxp-, xoxa-, xoxs-, xoxr-, xox2-.
_SLACK_TOKEN = re.compile(r"\bxox[abprs2]-[A-Za-z0-9-]{10,}")

# KEY=value / PASSWORD=value / TOKEN=... / SECRET=... lines (Python, shell, YAML).
# Captures the indentation, an optional `export`, the variable name and the
# separator so the line keeps its shape and only the value is dropped.
_ASSIGNMENT = re.compile(
    r"(?im)^(?P<lead>[ \t]*(?:export[ \t]+)?)(?P<name>[A-Za-z_][A-Za-z0-9_]*)"
    r"(?P<sep>[ \t]*[:=][ \t]*)(?P<value>\S[^\n]*)"
)

# Long random-looking strings (session IDs, base64 keys, generated tokens).
# A run must satisfy ALL of these rules, each chosen to protect normal text:
#   * length >= 32 — ordinary words, identifiers and path segments are far
#     shorter, so the threshold keeps them safe;
#   * at least one digit AND one letter — plain words lack digits, numeric
#     literals lack letters;
#   * at least one non-hex character INSIDE the run (g-z/G-Z/+/=) — a
#     40-character git commit hash is pure hex and must survive;
#   * the alphabet excludes '-', '/', '_' and '.', so file paths, URLs and
#     snake_case names break into short pieces instead of one long match.
# Accepted false negatives: pure-hex tokens and hyphen-only tokens that no
# specific rule above catches — damaging real source code is worse.
_RANDOM_STRING = re.compile(
    r"(?=[A-Za-z0-9+=]{32,}(?![A-Za-z0-9+=]))"   # one unbroken run of 32+ chars
    r"(?=[A-Za-z0-9+=]*[0-9])"                    # ...that contains a digit...
    r"(?=[A-Za-z0-9+=]*[A-Za-z])"                 # ...a letter...
    r"(?=[A-Za-z0-9+=]*[g-zG-Z+=])"                # ...and something non-hex
    r"[A-Za-z0-9+=]{32,}"
)


def _redact_assignment(match: Match[str]) -> str:
    """Keep the variable name, replace its value when the name means 'secret'.

    Args:
        match: one match of _ASSIGNMENT.

    Returns:
        The original line when the name is harmless, otherwise the line with
        its value replaced by [REDACTED].
    """
    name = match.group("name")
    if _SECRET_WORDS.isdisjoint(part.upper() for part in name.split("_")):
        return match.group(0)
    return f"{match.group('lead')}{name}{match.group('sep')}{REDACTED}"


def filter_secrets(text: str) -> str:
    """Return `text` with every detected secret replaced by [REDACTED].

    Covers GitHub tokens, AWS access keys, Slack tokens, private key blocks,
    KEY=value / PASSWORD=value / TOKEN=... / SECRET=... lines and long
    random-looking strings. Normal code and prose are left untouched.

    Args:
        text: any untrusted text (file content, Jira/Slack/Confluence item,
            question).

    Returns:
        The same text with credentials redacted.
    """
    if not text:
        return text
    filtered = _PRIVATE_KEY_BLOCK.sub(REDACTED, text)
    filtered = _GITHUB_TOKEN.sub(REDACTED, filtered)
    filtered = _AWS_ACCESS_KEY.sub(REDACTED, filtered)
    filtered = _SLACK_TOKEN.sub(REDACTED, filtered)
    filtered = _ASSIGNMENT.sub(_redact_assignment, filtered)
    filtered = _RANDOM_STRING.sub(REDACTED, filtered)
    return filtered


def filter_messages(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Return a copy of `messages` with secrets removed from every content.

    Called by gateway.complete() right before provider.generate() so both
    providers (Ollama and external) only ever see redacted messages. The
    original messages are not mutated; roles and any other fields are copied
    unchanged, so only secrets are affected — never the structure.

    Args:
        messages: chat messages as dicts, e.g. {"role": "user", "content": "..."}.

    Returns:
        A new list of message dicts whose string content is redacted.
    """
    filtered: List[Dict[str, Any]] = []
    for message in messages:
        if not isinstance(message, dict):
            filtered.append(message)
            continue
        redacted = dict(message)
        content = redacted.get("content")
        if isinstance(content, str):
            redacted["content"] = filter_secrets(content)
        filtered.append(redacted)
    return filtered
