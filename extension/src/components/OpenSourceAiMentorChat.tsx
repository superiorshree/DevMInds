/**
 * File:        extension/src/components/OpenSourceAiMentorChat.tsx
 * Purpose:     Screen 06 — AI Mentor Chat (Chrome Extension Side Panel size).
 *              Interactive conversational mentor grounded in repository context,
 *              with suggested question chips, sources, and prompt input.
 */

import { useState } from "react";
import type { RepoRef } from "../services/repoDetector";
import { postChat } from "../services/api";

export interface OpenSourceAiMentorChatProps {
  repo: RepoRef;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  sources?: string[];
}

const DEFAULT_MESSAGES: Message[] = [
  {
    id: "welcome",
    sender: "ai",
    text: "Hello! I am your DevMinds AI Mentor. Ask me anything about this repository's structure, files, or setup.",
    sources: [],
  },
];

const SUGGESTIONS = [
  "Explain the project structure and main components.",
  "Which technologies and entry points does this repo use?",
  "How do I set up and run this codebase locally?",
];

export function OpenSourceAiMentorChat({ repo, onClose }: OpenSourceAiMentorChatProps) {
  const [messages, setMessages] = useState<Message[]>(DEFAULT_MESSAGES);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const repoName = repo.repo || "";
  const repoOwner = repo.owner || "";

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsTyping(true);

    try {
      const res = await postChat(repoOwner, repoName, text);
      const sourcesList = (res.sources || []).map((s) => s.title || s.url || String(s));
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: res.answer || (res.error ? res.error.message : "I could not find an answer in the repository context."),
        sources: sourcesList,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: err?.message ? `AI Mentor: ${err.message}` : "Unable to reach the AI chat backend. Make sure the backend server is running.",
        sources: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#faf7f2",
        color: "#18181b",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 16px",
          borderBottom: "1px solid #e5e0d8",
          backgroundColor: "#faf7f2",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Logo */}
          <div
            style={{
              width: "24px",
              height: "24px",
              backgroundColor: "#18181b",
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "#f59e0b",
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontWeight: 800,
                fontSize: "11px",
                lineHeight: 1,
              }}
            >
              &gt;_
            </span>
          </div>
          <span style={{ fontWeight: 800, fontSize: "15px", color: "#18181b" }}>
            DevMinds
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              backgroundColor: "#fef3c7",
              color: "#92400e",
              border: "1px solid #f59e0b",
              borderRadius: "9999px",
              padding: "2px 8px",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>AI Mentor</span>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI Mentor"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#6b7280",
            fontSize: "18px",
            padding: "2px 6px",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </header>

      {/* Repository Context Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e5e0d8",
          fontSize: "12px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "#111827" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017C2 16.446 4.87 20.198 8.84 21.523C9.34 21.616 9.52 21.306 9.52 21.042C9.52 20.806 9.51 20.007 9.51 19.167C6.73 19.771 6.14 17.828 6.14 17.828C5.68 16.671 5.03 16.362 5.03 16.362C4.12 15.742 5.1 15.755 5.1 15.755C6.1 15.827 6.63 16.786 6.63 16.786C7.52 18.318 8.97 17.876 9.54 17.62C9.63 16.974 9.89 16.531 10.17 16.279C7.95 16.027 5.62 15.166 5.62 11.332C5.62 10.239 6.01 9.348 6.66 8.649C6.55 8.398 6.21 7.378 6.76 6.002C6.76 6.002 7.6 5.733 9.51 7.027C10.31 6.804 11.16 6.693 12 6.689C12.84 6.693 13.69 6.804 14.49 7.027C16.4 5.733 17.24 6.002 17.24 6.002C17.79 7.378 17.45 8.398 17.34 8.649C17.99 9.348 18.38 10.239 18.38 11.332C18.38 15.176 16.04 16.024 13.82 16.271C14.18 16.582 14.5 17.2 14.5 18.156C14.5 19.525 14.49 20.627 14.49 20.963C14.49 21.229 14.67 21.545 15.18 21.444C19.14 20.111 22 16.416 22 12.017C22 6.484 17.522 2 12 2Z" />
          </svg>
          <span>{repoOwner}/{repoName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#166534", fontSize: "11px", fontWeight: 600 }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#16a34a" }} />
          <span>Repository context active</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
              maxWidth: "92%",
            }}
          >
            {m.sender === "ai" && (
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "#18181b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f59e0b",
                  fontSize: "13px",
                  fontWeight: 900,
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                ✦
              </div>
            )}

            <div
              style={{
                backgroundColor: m.sender === "user" ? "#ffffff" : "#ffffff",
                border: m.sender === "user" ? "1.5px solid #d1d5db" : "1.5px solid #27272a",
                borderRadius: "10px",
                padding: "12px 14px",
                boxShadow: m.sender === "ai" ? "2px 2px 0px #000000" : "none",
              }}
            >
              <div style={{ fontSize: "13px", color: "#18181b", lineHeight: 1.48 }}>
                {m.text}
              </div>

              {m.sources && m.sources.length > 0 && (
                <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "10px", fontWeight: 800, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "4px" }}>
                    SOURCES
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {m.sources.map((src) => (
                      <span
                        key={src}
                        style={{
                          backgroundColor: "#f3f4f6",
                          border: "1px solid #e5e7eb",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          fontSize: "11px",
                          color: "#374151",
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        {src}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {m.sender === "user" && (
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  backgroundColor: "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#4b5563",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#6b7280", fontSize: "12px", marginLeft: "38px" }}>
            <span>DevMinds is thinking...</span>
          </div>
        )}

        {/* Suggested Questions */}
        <div style={{ marginTop: "12px" }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 800,
              color: "#6b7280",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
            </svg>
            <span>SUGGESTED QUESTIONS</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {SUGGESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSend(q)}
                style={{
                  textAlign: "left",
                  padding: "7px 10px",
                  backgroundColor: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#92400e",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.12s ease",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Bottom Footer */}
      <footer
        style={{
          padding: "12px 14px",
          backgroundColor: "#ffffff",
          borderTop: "1px solid #e5e0d8",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Ask anything about this repository..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "1.5px solid #27272a",
              borderRadius: "8px",
              fontSize: "12.5px",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={() => handleSend()}
            aria-label="Send"
            style={{
              backgroundColor: "#f79f24",
              border: "1.5px solid #000000",
              borderRadius: "8px",
              width: "38px",
              height: "38px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontWeight: 800,
              boxShadow: "1.5px 1.5px 0px #000000",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" />
            </svg>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#6b7280", marginTop: "6px" }}>
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#16a34a" }} />
          <span>Answers grounded in repository sources</span>
        </div>
      </footer>
    </div>
  );
}
