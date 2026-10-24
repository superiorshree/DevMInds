/**
 * File:        extension/src/components/ModeSwitcher.tsx
 * Owner:       Shreyansh
 * Purpose:     Lets the user switch between Open Contributor and Company Employee modes, which changes which tabs and features are available.
 * Contains:    ModeSwitcher functional component with a ModeSwitcherProps interface; calls setMode and hands the refreshed features back to the parent.
 * Status:      IMPLEMENTED — switches mode through the API and falls back to local features when the backend is unreachable.
 * Depends on:  extension/src/types/mode.ts (UserMode), extension/src/services/api.ts (setMode, localModeResponse, BackendUnreachableError)
 */

import { useState } from "react";
import type { UserMode } from "../types/mode";
import { BackendUnreachableError, localModeResponse, setMode } from "../services/api";
import type { ModeResponse } from "../services/api";

/** Props for the mode switcher. */
export interface ModeSwitcherProps {
  mode: UserMode;
  /** Called with the refreshed mode + features after a successful switch. */
  onChange: (response: ModeResponse) => void;
}

const MODES: { value: UserMode; label: string }[] = [
  { value: "open_source", label: "Open Contributor" },
  { value: "company", label: "Company Employee" },
];

/**
 * Two-button switcher for the user's mode.
 *
 * Switching only changes what the UI shows; the backend re-checks the
 * server-side mode on every gated request (hiding a button is not security).
 */
export function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  const [isSwitching, setIsSwitching] = useState(false);

  /** Ask the backend to switch modes, then let the parent refresh the features. */
  async function handleSelect(value: UserMode): Promise<void> {
    if (value === mode || isSwitching) return;
    setIsSwitching(true);
    try {
      onChange(await setMode(value));
    } catch (error) {
      if (error instanceof BackendUnreachableError) {
        // Backend down: switch locally so the UI keeps working.
        onChange(localModeResponse(value));
      }
    } finally {
      setIsSwitching(false);
    }
  }

  return (
    <div
      className="mode-switcher"
      role="group"
      aria-label="Mode"
      style={{ display: "flex", gap: "var(--space-2)" }}
    >
      {MODES.map((option) => {
        const isActive = option.value === mode;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            disabled={isSwitching}
            onClick={() => void handleSelect(option.value)}
            style={{
              flex: 1,
              padding: "var(--space-2)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
              background: isActive ? "var(--color-primary)" : "var(--color-bg-subtle)",
              color: isActive ? "var(--color-primary-contrast)" : "var(--color-text)",
              cursor: "pointer",
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}