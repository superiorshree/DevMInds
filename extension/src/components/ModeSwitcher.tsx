/**
 * File:        extension/src/components/ModeSwitcher.tsx
 * Owner:       Shreyansh
 * Purpose:     Lets the user switch between Open Contributor and Company Employee modes, which changes which tabs and features are available.
 * Contains:    ModeSwitcher functional component with a ModeSwitcherProps interface.
 * Status:      STUB, replace TODOs with real implementation
 * Depends on:  extension/src/types/mode.ts (UserMode)
 */

import type { UserMode } from "../types/mode";

/** Props for the mode switcher. */
export interface ModeSwitcherProps {
  mode: UserMode;
  onChange: (mode: UserMode) => void;
}

const MODES: { value: UserMode; label: string }[] = [
  { value: "open_contributor", label: "Open Contributor" },
  { value: "company_employee", label: "Company Employee" },
];

/**
 * Two-button switcher for the user's mode.
 *
 * Switching only changes what the UI shows; the backend re-checks the
 * server-side mode on every gated request (hiding a button is not security).
 */
export function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div
      className="mode-switcher"
      style={{ display: "flex", gap: "var(--space-2)" }}
      role="tablist"
      aria-label="Mode"
    >
      {MODES.map((option) => {
        const isActive = option.value === mode;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
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
