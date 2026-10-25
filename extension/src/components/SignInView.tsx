/**
 * File:        extension/src/components/SignInView.tsx
 * Purpose:     First-page landing screen allowing users to choose their experience
 *              (Open-Source Contributor or Company Employee) and sign in securely with GitHub.
 */

import { useState } from "react";
import type { UserMode } from "../types/mode";

export interface SignInViewProps {
  onSelectMode?: (mode: UserMode) => void;
  onSignIn?: (mode: UserMode) => Promise<void>;
  isSigningIn?: boolean;
  signingInMode?: UserMode | null;
  error?: string | null;
  onClose?: () => void;
}

export function SignInView({
  onSelectMode,
  onSignIn,
  isSigningIn = false,
  signingInMode = null,
  error = null,
  onClose,
}: SignInViewProps) {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

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

  const getButtonStyle = (buttonId: string, disabled: boolean) => ({
    width: "100%",
    padding: "12px 14px",
    backgroundColor: "#f79f24",
    color: "#000000",
    border: "2px solid #000000",
    borderRadius: "8px",
    boxShadow:
      hoveredButton === buttonId && !disabled
        ? "3.5px 3.5px 0px #000000"
        : "2.5px 2.5px 0px #000000",
    transform:
      hoveredButton === buttonId && !disabled
        ? "translate(-1px, -1px)"
        : "translate(0, 0)",
    fontWeight: 700,
    fontSize: "13.5px",
    cursor: disabled ? "wait" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    transition: "all 0.12s ease-in-out",
    opacity: disabled && signingInMode !== buttonId ? 0.6 : 1,
  });

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
          {/* Terminal Box Logo */}
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

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          style={{
            background: "none",
            border: "none",
            color: "#4b5563",
            fontSize: "18px",
            fontWeight: 400,
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
          padding: "24px 20px 32px 20px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Terminal Prompt Indicator (> _) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            color: "#f97316",
            fontWeight: 900,
            fontSize: "24px",
            marginBottom: "6px",
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            lineHeight: 1,
          }}
        >
          <span>&gt;</span>
          <span>_</span>
        </div>

        {/* Main Title */}
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#111827",
            margin: "0 0 12px 0",
            letterSpacing: "-0.025em",
          }}
        >
          How will you use
          <br />
          DevMinds?
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.48,
            color: "#4b5563",
            margin: "0 0 24px 0",
          }}
        >
          Choose the experience that best matches your development workflow. You can
          continue securely with GitHub.
        </p>

        {/* Card 1: Open-Source Contributor */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1.5px solid #27272a",
            borderRadius: "12px",
            padding: "18px 18px 20px 18px",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "10px",
            }}
          >
            {/* GitHub Octocat Circle Icon */}
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: "#18181b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017C2 16.446 4.87 20.198 8.84 21.523C9.34 21.616 9.52 21.306 9.52 21.042C9.52 20.806 9.51 20.007 9.51 19.167C6.73 19.771 6.14 17.828 6.14 17.828C5.68 16.671 5.03 16.362 5.03 16.362C4.12 15.742 5.1 15.755 5.1 15.755C6.1 15.827 6.63 16.786 6.63 16.786C7.52 18.318 8.97 17.876 9.54 17.62C9.63 16.974 9.89 16.531 10.17 16.279C7.95 16.027 5.62 15.166 5.62 11.332C5.62 10.239 6.01 9.348 6.66 8.649C6.55 8.398 6.21 7.378 6.76 6.002C6.76 6.002 7.6 5.733 9.51 7.027C10.31 6.804 11.16 6.693 12 6.689C12.84 6.693 13.69 6.804 14.49 7.027C16.4 5.733 17.24 6.002 17.24 6.002C17.79 7.378 17.45 8.398 17.34 8.649C17.99 9.348 18.38 10.239 18.38 11.332C18.38 15.176 16.04 16.024 13.82 16.271C14.18 16.582 14.5 17.2 14.5 18.156C14.5 19.525 14.49 20.627 14.49 20.963C14.49 21.229 14.67 21.545 15.18 21.444C19.14 20.111 22 16.416 22 12.017C22 6.484 17.522 2 12 2Z"
                  fill="#ffffff"
                />
              </svg>
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 800,
                lineHeight: 1.2,
                color: "#111827",
              }}
            >
              Open-Source
              <br />
              Contributor
            </h2>
          </div>

          <p
            style={{
              fontSize: "13px",
              lineHeight: 1.45,
              color: "#4b5563",
              margin: "0 0 16px 0",
            }}
          >
            Explore public and authorized GitHub repositories, understand
            unfamiliar code, and find the right place to start contributing.
          </p>

          <button
            type="button"
            disabled={isSigningIn}
            onClick={() => {
              if (onSelectMode) {
                onSelectMode("open_source");
              } else if (onSignIn) {
                void onSignIn("open_source");
              }
            }}
            onMouseEnter={() => setHoveredButton("open_source")}
            onMouseLeave={() => setHoveredButton(null)}
            style={getButtonStyle("open_source", isSigningIn)}
          >
            {isSigningIn && signingInMode === "open_source"
              ? "Signing in with GitHub…"
              : "Continue as Open-Source Contributor →"}
          </button>
        </div>

        {/* Card 2: Company Employee */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1.5px solid #27272a",
            borderRadius: "12px",
            padding: "18px 18px 20px 18px",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "10px",
            }}
          >
            {/* Office Building Icon */}
            <div
              style={{
                width: "44px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Left smaller building */}
                <rect x="3" y="12" width="13" height="21" rx="1.5" fill="#18181b" />
                {/* Right taller building */}
                <rect x="15" y="5" width="18" height="28" rx="1.5" fill="#18181b" />
                {/* Left building windows */}
                <rect x="6" y="16" width="3" height="2.5" rx="0.5" fill="#faf7f2" />
                <rect x="11" y="16" width="3" height="2.5" rx="0.5" fill="#faf7f2" />
                <rect x="6" y="21" width="3" height="2.5" rx="0.5" fill="#faf7f2" />
                <rect x="11" y="21" width="3" height="2.5" rx="0.5" fill="#faf7f2" />
                <rect x="6" y="26" width="3" height="2.5" rx="0.5" fill="#faf7f2" />
                <rect x="11" y="26" width="3" height="2.5" rx="0.5" fill="#faf7f2" />
                {/* Right building windows */}
                <rect x="19" y="9" width="3" height="2.5" rx="0.5" fill="#faf7f2" />
                <rect x="25" y="9" width="3" height="2.5" rx="0.5" fill="#faf7f2" />
                <rect x="19" y="14" width="3" height="2.5" rx="0.5" fill="#faf7f2" />
                <rect x="25" y="14" width="3" height="2.5" rx="0.5" fill="#faf7f2" />
                <rect x="19" y="19" width="3" height="2.5" rx="0.5" fill="#faf7f2" />
                <rect x="25" y="19" width="3" height="2.5" rx="0.5" fill="#faf7f2" />
                {/* Entrance door */}
                <path
                  d="M22 33V27.5C22 27.22 22.22 27 22.5 27H25.5C25.78 27 26 27.22 26 27.5V33H22Z"
                  fill="#faf7f2"
                />
              </svg>
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 800,
                lineHeight: 1.2,
                color: "#111827",
              }}
            >
              Company Employee
            </h2>
          </div>

          <p
            style={{
              fontSize: "13px",
              lineHeight: 1.45,
              color: "#4b5563",
              margin: "0 0 16px 0",
            }}
          >
            Understand your company's codebase with relevant tasks,
            documentation, and team discussions.
          </p>

          <button
            type="button"
            disabled={isSigningIn}
            onClick={() => {
              if (onSelectMode) {
                onSelectMode("company");
              } else if (onSignIn) {
                void onSignIn("company");
              }
            }}
            onMouseEnter={() => setHoveredButton("company")}
            onMouseLeave={() => setHoveredButton(null)}
            style={getButtonStyle("company", isSigningIn)}
          >
            {isSigningIn && signingInMode === "company"
              ? "Signing in with GitHub…"
              : "Continue as Company Employee →"}
          </button>
        </div>

        {/* Error message if sign-in fails */}
        {error && (
          <div
            role="alert"
            style={{
              marginTop: "8px",
              padding: "12px 14px",
              backgroundColor: "#fef2f2",
              border: "1.5px solid #f87171",
              borderRadius: "8px",
              color: "#991b1b",
              fontSize: "13px",
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
