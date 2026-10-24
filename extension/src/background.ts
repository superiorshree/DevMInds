/**
 * File:        extension/src/background.ts
 * Owner:       Shreyansh
 * Purpose:     MV3 background service worker that opens the side panel when the toolbar icon is clicked.
 * Contains:    setPanelBehavior() call wiring the action click to the side panel.
 * Status:      IMPLEMENTED — toolbar icon opens the panel; no other background logic yet.
 * Depends on:  extension/manifest.json (sidePanel permission, side_panel.default_path)
 */

/**
 * Open the DevMinds side panel whenever the user clicks the toolbar icon.
 * `openPanelOnActionClick` replaces the default popup behaviour, so no
 * action.onClicked listener is needed.
 */
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: Error) => console.error("Failed to set side panel behavior:", error));