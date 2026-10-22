/**
 * File:        extension/src/tabs/AskAITab.tsx
 * Owner:       Devyani
 * Purpose:     Lets the user ask a question about the repo and shows the AI answer with its sources.
 * Contains:    AskAITab functional component with an AskAITabProps interface and a local input state.
 * Status:      STUB, replace TODOs with real implementation
 * Depends on:  extension/src/types/architecture.ts (ChatResponse), extension/src/components/SourceCard.tsx, extension/src/mocks/mockData.ts
 */

import { useState } from "react";
import type { FormEvent } from "react";
import type { ChatResponse } from "../types/architecture";
import { SourceCard } from "../components/SourceCard";
import { mockChat } from "../mocks/mockData";

/** Props for the Ask AI tab. */
export interface AskAITabProps {
  answer: ChatResponse;
}

/** A chat box plus the answer and its source cards. */
export function AskAITab({ answer }: AskAITabProps) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<ChatResponse>(answer);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    // TODO(Devyani): call postChat(owner, name, question) instead of the mock.
    setResponse(mockChat);
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
          style={{
            padding: "var(--space-2) var(--space-3)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-primary)",
            color: "var(--color-primary-contrast)",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Ask
        </button>
      </form>

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

      {/* TODO(Devyani): wire to the real chat API, stream answers, handle errors. */}
    </section>
  );
}
