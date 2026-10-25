/**
 * File:        extension/src/tabs/AskAITab.tsx
 * Owner:       Devyani (co-maintained with Shreyansh)
 * Purpose:     Lets the user ask a question about the repo and shows the AI answer with its sources.
 * Contains:    AskAITab functional component with an AskAITabProps interface and live chat query.
 * Status:      REAL — wires to real backend chat API or live repo context, no hardcoded mock chat.
 * Depends on:  extension/src/types/architecture.ts (ChatResponse), extension/src/components/SourceCard.tsx, extension/src/services/api.ts
 */

import { useState } from "react";
import type { FormEvent } from "react";
import type { ChatResponse } from "../types/architecture";
import { SourceCard } from "../components/SourceCard";
import { postChat } from "../services/api";

/** Props for the Ask AI tab. */
export interface AskAITabProps {
  answer?: ChatResponse;
  owner?: string;
  repo?: string;
}

/** A chat box plus the answer and its source cards. */
export function AskAITab({ answer, owner, repo }: AskAITabProps) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<ChatResponse>(
    answer ?? {
      answer: "Ask any question about this repository's architecture, setup, or code.",
      sources: [],
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const q = question.trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      if (owner && repo) {
        const res = await postChat(owner, repo, q);
        setResponse(res);
      } else {
        setError("Repository context is not detected.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get AI answer from backend.");
      setResponse({
        answer: "AI answer unavailable. Ensure the DevMinds backend and AI service are running.",
        sources: [],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ask-ai-tab">
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "var(--space-2)" }}>
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask anything about this repo…"
          style={{
            flex: 1,
            padding: "var(--space-2)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--font-size-sm)",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "var(--space-2) var(--space-3)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: loading ? "var(--color-bg-subtle)" : "var(--color-primary)",
            color: "var(--color-primary-contrast)",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Asking…" : "Ask"}
        </button>
      </form>

      {error && (
        <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "8px" }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: "var(--space-3)" }}>
        <p style={{ marginTop: 0 }}>{response.answer}</p>
        {response.sources.map((source, index) => (
          <SourceCard
            key={index}
            title={source.title}
            sourceType={source.sourceType}
            url={source.url}
          />
        ))}
      </div>
    </section>
  );
}
