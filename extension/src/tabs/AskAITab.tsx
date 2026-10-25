/**
 * File:        extension/src/tabs/AskAITab.tsx
 * Owner:       Devyani
 * Purpose:     Lets the user ask a question about the repo and shows the AI answer with its sources.
 * Contains:    AskAITab functional component with an AskAITabProps interface and real postChat wiring.
 * Status:      REAL — connected to POST /api/chat with loading, empty, and error states.
 * Depends on:  extension/src/types/architecture.ts (ChatResponse), extension/src/components/SourceCard.tsx,
 *              extension/src/services/api.ts (postChat)
 */

import { useState } from "react";
import type { FormEvent } from "react";
import type { ChatResponse } from "../types/architecture";
import { SourceCard } from "../components/SourceCard";
import { postChat } from "../services/api";
import type { RepoRef } from "../services/repoDetector";

/** Props for the Ask AI tab. */
export interface AskAITabProps {
  answer?: ChatResponse;
  repo?: RepoRef | { owner: string; repo: string } | null;
}

/** A chat box plus the real AI answer and its source cards. */
export function AskAITab({ answer, repo }: AskAITabProps) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<ChatResponse | null>(answer || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const owner = repo?.owner || "";
  const repoName = repo?.repo || "";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const query = question.trim();
    if (!query) return;

    if (!owner || !repoName) {
      setError("No active GitHub repository detected. Please open a repository page.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await postChat(owner, repoName, query);
      setResponse(result);
      if (result.error) {
        setError(result.error.message || `AI Error: ${result.error.code}`);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to reach the AI chat service.";
      if (msg.includes("403") && msg.includes("PRIVATE_REPO_REQUIRES_COMPANY_MODE")) {
        setError("This is a private repository. Switch to Company Employee mode in settings to analyze it.");
      } else if (msg.includes("401")) {
        setError("You are not signed in. Please sign in to ask questions.");
      } else if (msg.includes("429")) {
        setError("GitHub rate limit exceeded. Please wait a moment or configure your GitHub token.");
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
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
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1.5px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--font-size-sm)",
            outline: "none",
            backgroundColor: "#ffffff",
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          style={{
            padding: "8px 16px",
            border: "1.5px solid #18181b",
            borderRadius: "var(--radius-sm)",
            background: isLoading ? "#d1d5db" : "var(--color-primary)",
            color: "#000000",
            cursor: isLoading ? "wait" : "pointer",
            fontWeight: 700,
            fontSize: "var(--font-size-sm)",
            transition: "all 0.1s ease-in-out",
          }}
        >
          {isLoading ? "Thinking…" : "Ask"}
        </button>
      </form>

      {/* Suggested prompts if no question yet */}
      {!response && !isLoading && !error && (
        <div style={{ marginTop: "16px" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontWeight: 600 }}>
            Suggested questions:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {[
              "Explain the project structure and main entry points.",
              "Which technologies and frameworks does this repo use?",
              "How do I set up and run this codebase locally?",
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setQuestion(suggestion)}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  background: "#ffffff",
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  fontSize: "var(--font-size-xs)",
                  color: "#374151",
                  cursor: "pointer",
                }}
              >
                💡 {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div style={{ marginTop: "18px", textAlign: "center", padding: "16px" }}>
          <div
            style={{
              display: "inline-block",
              width: "24px",
              height: "24px",
              border: "3px solid #e5e0d8",
              borderTop: "3px solid #f97316",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ marginTop: "10px", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
            AI mentor is analyzing repository facts…
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            marginTop: "14px",
            padding: "12px",
            backgroundColor: "#fef2f2",
            border: "1.5px solid #f87171",
            borderRadius: "6px",
            color: "#991b1b",
            fontSize: "var(--font-size-xs)",
            lineHeight: 1.45,
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* AI Answer & Sources */}
      {response && !isLoading && (
        <div style={{ marginTop: "16px" }}>
          {response.answer && (
            <div
              style={{
                padding: "12px 14px",
                backgroundColor: "#ffffff",
                border: "1.5px solid var(--color-border)",
                borderRadius: "8px",
                boxShadow: "1.5px 1.5px 0px #000000",
                fontSize: "var(--font-size-sm)",
                lineHeight: 1.6,
                color: "#18181b",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "11px", textTransform: "uppercase", color: "#f97316", marginBottom: "6px" }}>
                AI Mentor Answer {response.provider && `(${response.provider})`}
              </div>
              <p style={{ margin: 0 }}>{response.answer}</p>
            </div>
          )}

          {response.sources && response.sources.length > 0 && (
            <div style={{ marginTop: "14px" }}>
              <div style={{ fontWeight: 700, fontSize: "11px", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "6px" }}>
                Verified Sources ({response.sources.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {response.sources.map((source, index) => (
                  <SourceCard
                    key={index}
                    title={source.title}
                    sourceType={source.sourceType}
                    url={source.url}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
