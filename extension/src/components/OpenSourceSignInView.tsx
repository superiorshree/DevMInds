/**
 * File:        extension/src/components/OpenSourceSignInView.tsx
 * Purpose:     Screen 02 — GitHub Sign-in page for Open-Source Contributor flow.
 */

import { useState } from "react";

export interface OpenSourceSignInViewProps {
  onSignIn: () => Promise<void>;
  isSigningIn: boolean;
  error: string | null;
  onChangeMode: () => void;
  onClose?: () => void;
}

export function OpenSourceSignInView({
  onSignIn,
  isSigningIn,
  error,
  onChangeMode,
  onClose,
}: OpenSourceSignInViewProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      try {
        window.close();
      } catch {
        // window.close may be restricted in some extension contexts
      }
    }
  };

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

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          style={{
            background: "none",
            border: "none",
            color: "#4b5563",
            fontSize: "18px",
            cursor: "pointer",
            padding: "4px 8px",
            lineHeight: 1,
            borderRadius: "4px",
          }}
        >
          ✕
        </button>
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
        {/* Mode Selector Pill Button */}
        <button
          type="button"
          onClick={onChangeMode}
          title="Click to switch experience mode"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            backgroundColor: "#fef3c7",
            border: "1.5px solid #f59e0b",
            borderRadius: "9999px",
            color: "#18181b",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: "24px",
            transition: "all 0.15s ease",
          }}
        >
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
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Open-Source Contributor</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4b5563"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Book with Code Illustration */}
        <div style={{ marginBottom: "20px" }}>
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
              y1="32"
              x2="26"
              y2="35"
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
              y1="60"
              x2="26"
              y2="57"
              stroke="#f59e0b"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Right radiance sparks */}
            <line
              x1="84"
              y1="32"
              x2="74"
              y2="35"
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
              y1="60"
              x2="74"
              y2="57"
              stroke="#f59e0b"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Open Book Outline */}
            <path
              d="M50 25V73M50 25C44.5 22 36.5 21 28 23C26.5 23.3 25 24.5 25 26V68C25 69.5 26.5 70.5 28 70.2C35.5 68.5 44 70 50 73M50 25C55.5 22 63.5 21 72 23C73.5 23.3 75 24.5 75 26V68C75 69.5 73.5 70.5 72 70.2C64.5 68.5 56 70 50 73"
              fill="#18181b"
              stroke="#18181b"
              strokeWidth="3"
              strokeLinejoin="round"
            />

            {/* Inner code symbols in white */}
            <path
              d="M43 40L37.5 47L43 54"
              stroke="#ffffff"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="50"
              y1="39"
              x2="50"
              y2="56"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M57 40L62.5 47L57 54"
              stroke="#ffffff"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#111827",
            margin: "0 0 12px 0",
            textAlign: "center",
            letterSpacing: "-0.02em",
          }}
        >
          Your codebase,
          <br />
          understood.
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.48,
            color: "#4b5563",
            textAlign: "center",
            maxWidth: "290px",
            margin: "0 auto 24px auto",
          }}
        >
          Explore repositories, understand unfamiliar code, and find your starting point
          with AI.
        </p>

        {/* Continue with GitHub Button */}
        <button
          type="button"
          disabled={isSigningIn}
          onClick={() => void onSignIn()}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            width: "100%",
            padding: "13px 16px",
            backgroundColor: "#f79f24",
            color: "#000000",
            border: "2px solid #000000",
            borderRadius: "8px",
            boxShadow:
              isHovered && !isSigningIn
                ? "4px 4px 0px #000000"
                : "2.5px 2.5px 0px #000000",
            transform:
              isHovered && !isSigningIn
                ? "translate(-1px, -1px)"
                : "translate(0, 0)",
            fontWeight: 700,
            fontSize: "14px",
            cursor: isSigningIn ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            transition: "all 0.12s ease-in-out",
          }}
        >
          {/* GitHub Icon */}
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
          <span>{isSigningIn ? "Signing in with GitHub…" : "Continue with GitHub"}</span>
        </button>

        {/* Error message if sign-in fails */}
        {error && (
          <div
            role="alert"
            style={{
              width: "100%",
              marginTop: "12px",
              padding: "10px 14px",
              backgroundColor: "#fef2f2",
              border: "1.5px solid #f87171",
              borderRadius: "8px",
              color: "#991b1b",
              fontSize: "13px",
              lineHeight: 1.4,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Divider Line */}
        <div
          style={{
            width: "100%",
            height: "1px",
            backgroundColor: "#e5e0d8",
            margin: "24px 0 20px 0",
          }}
        />

        {/* Trust / Security Bullets */}
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#18181b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.4 }}>
              Secure sign-in powered by GitHub OAuth.
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#18181b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, marginTop: "2px" }}
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.4 }}>
              You control which repositories DevMinds can access.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
