/**
 * File:        extension/src/components/OpenSourceWelcomeView.tsx
 * Purpose:     Screen 03 — Open-Source Welcome page displayed after an open-source contributor
 *              signs in, guiding them to open any GitHub repository to start exploring.
 */

import { useState } from "react";
import type { SessionUser } from "../services/api";

export interface OpenSourceWelcomeViewProps {
  user: SessionUser;
  onSignOut: () => void;
}

export function OpenSourceWelcomeView({ user, onSignOut }: OpenSourceWelcomeViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleOpenGitHub = () => {
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      chrome.tabs.create({ url: "https://github.com" });
    } else {
      window.open("https://github.com", "_blank");
    }
  };

  const initial = (user.github_login ? user.github_login.charAt(0).toUpperCase() : "P");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#faf7f2",
        color: "#18181b",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        position: "relative",
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          borderBottom: "1px solid #e5e0d8",
          backgroundColor: "#faf7f2",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              backgroundColor: "#18181b",
              borderRadius: "6px",
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
                fontSize: "13px",
                lineHeight: 1,
              }}
            >
              &gt;_
            </span>
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: "17px",
              letterSpacing: "-0.01em",
              color: "#18181b",
            }}
          >
            DevMinds
          </span>
        </div>

        {/* User Profile Badge Menu */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="User account menu"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "#18181b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "13px",
                overflow: "hidden",
              }}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.github_login}
                  width={28}
                  height={28}
                  style={{ borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                initial
              )}
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#18181b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "36px",
                right: 0,
                backgroundColor: "#ffffff",
                border: "1.5px solid #27272a",
                borderRadius: "8px",
                boxShadow: "3px 3px 0px #000000",
                width: "160px",
                zIndex: 50,
                padding: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  padding: "6px 8px",
                  borderBottom: "1px solid #f3f4f6",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                @{user.github_login}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onSignOut();
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px",
                  marginTop: "4px",
                  border: "none",
                  background: "transparent",
                  color: "#dc2626",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  borderRadius: "4px",
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          padding: "20px 20px 28px 20px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Terminal Prompt Indicator (> _) */}
        <div
          style={{
            alignSelf: "flex-start",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            color: "#f97316",
            fontWeight: 900,
            fontSize: "24px",
            marginBottom: "8px",
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            lineHeight: 1,
          }}
        >
          <span>&gt;</span>
          <span>_</span>
        </div>

        {/* Folder with Code Symbol Illustration */}
        <div style={{ marginBottom: "16px" }}>
          <svg
            width="96"
            height="86"
            viewBox="0 0 100 90"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Left radiance sparks */}
            <line
              x1="16"
              y1="30"
              x2="25"
              y2="34"
              stroke="#f59e0b"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <line
              x1="13"
              y1="46"
              x2="23"
              y2="46"
              stroke="#f59e0b"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <line
              x1="16"
              y1="62"
              x2="25"
              y2="58"
              stroke="#f59e0b"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Right radiance sparks */}
            <line
              x1="84"
              y1="30"
              x2="75"
              y2="34"
              stroke="#f59e0b"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <line
              x1="87"
              y1="46"
              x2="77"
              y2="46"
              stroke="#f59e0b"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <line
              x1="84"
              y1="62"
              x2="75"
              y2="58"
              stroke="#f59e0b"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Folder body */}
            <path
              d="M32 23H44L49 28H68C70.2 28 72 29.8 72 32V64C72 66.2 70.2 68 68 68H32C29.8 68 28 66.2 28 64V27C28 24.8 29.8 23 32 23Z"
              stroke="#18181b"
              strokeWidth="3.5"
              strokeLinejoin="round"
              fill="#ffffff"
            />

            {/* Inner </> code symbols in orange */}
            <path
              d="M42 42L37 47L42 52"
              stroke="#f59e0b"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="53"
              y1="40"
              x2="47"
              y2="54"
              stroke="#f59e0b"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M58 42L63 47L58 52"
              stroke="#f59e0b"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#111827",
            margin: "0 0 10px 0",
            textAlign: "center",
            letterSpacing: "-0.02em",
          }}
        >
          Welcome, Contributor!
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.48,
            color: "#4b5563",
            textAlign: "center",
            margin: "0 0 20px 0",
            maxWidth: "320px",
          }}
        >
          Ready to explore a repository and make your first contribution with confidence.
        </p>

        {/* Quick start Card */}
        <div
          style={{
            width: "100%",
            backgroundColor: "#ffffff",
            border: "1.5px solid #27272a",
            borderRadius: "12px",
            padding: "18px",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              fontSize: "15px",
              fontWeight: 800,
              color: "#111827",
              margin: "0 0 14px 0",
            }}
          >
            Quick start
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Step 1 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "#f59e0b",
                  color: "#000000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                1
              </div>
              <span style={{ fontSize: "13px", color: "#374151", lineHeight: 1.45 }}>
                Find a GitHub repository you're interested in.
              </span>
            </div>

            {/* Step 2 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "#f59e0b",
                  color: "#000000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                2
              </div>
              <span style={{ fontSize: "13px", color: "#374151", lineHeight: 1.45 }}>
                Open it in this tab and return to DevMinds.
              </span>
            </div>

            {/* Step 3 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "#f59e0b",
                  color: "#000000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                3
              </div>
              <span style={{ fontSize: "13px", color: "#374151", lineHeight: 1.45 }}>
                Explore, learn and get AI guidance.
              </span>
            </div>
          </div>
        </div>

        {/* Open GitHub Button */}
        <button
          type="button"
          onClick={handleOpenGitHub}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            width: "100%",
            padding: "13px 16px",
            backgroundColor: "#f79f24",
            color: "#000000",
            border: "2px solid #000000",
            borderRadius: "8px",
            boxShadow: isHovered
              ? "4px 4px 0px #000000"
              : "2.5px 2.5px 0px #000000",
            transform: isHovered ? "translate(-1px, -1px)" : "translate(0, 0)",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            transition: "all 0.12s ease-in-out",
            marginBottom: "20px",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017C2 16.446 4.87 20.198 8.84 21.523C9.34 21.616 9.52 21.306 9.52 21.042C9.52 20.806 9.51 20.007 9.51 19.167C6.73 19.771 6.14 17.828 6.14 17.828C5.68 16.671 5.03 16.362 5.03 16.362C4.12 15.742 5.1 15.755 5.1 15.755C6.1 15.827 6.63 16.786 6.63 16.786C7.52 18.318 8.97 17.876 9.54 17.62C9.63 16.974 9.89 16.531 10.17 16.279C7.95 16.027 5.62 15.166 5.62 11.332C5.62 10.239 6.01 9.348 6.66 8.649C6.55 8.398 6.21 7.378 6.76 6.002C6.76 6.002 7.6 5.733 9.51 7.027C10.31 6.804 11.16 6.693 12 6.689C12.84 6.693 13.69 6.804 14.49 7.027C16.4 5.733 17.24 6.002 17.24 6.002C17.79 7.378 17.45 8.398 17.34 8.649C17.99 9.348 18.38 10.239 18.38 11.332C18.38 15.176 16.04 16.024 13.82 16.271C14.18 16.582 14.5 17.2 14.5 18.156C14.5 19.525 14.49 20.627 14.49 20.963C14.49 21.229 14.67 21.545 15.18 21.444C19.14 20.111 22 16.416 22 12.017C22 6.484 17.522 2 12 2Z"
              fill="#000000"
            />
          </svg>
          <span>Open GitHub</span>
        </button>

        {/* Signed in with GitHub Indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#15803d",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#16a34a",
            }}
          />
          <span>Signed in with GitHub</span>
        </div>
      </main>
    </div>
  );
}
