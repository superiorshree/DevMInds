/**
 * File:        extension/src/background.ts
 * Owner:       Shreyansh
 * Purpose:     MV3 background service worker that opens the side panel when the toolbar icon is clicked.
 * Contains:    onInstalled listener and the side-panel action-click behavior setup.
 * Status:      STUB, replace TODOs with real implementation
 * Depends on:  extension/manifest.json (sidePanel permission, side_panel.default_path)
 */

/**
 * Open the DevMinds side panel whenever the user clicks the toolbar icon.
 * `openPanelOnActionClick` replaces the default popup behaviour.
 */
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error: Error) => console.error("Failed to set side panel behavior:", error));

chrome.runtime.onInstalled.addListener((details) => {
  // TODO(Shreyansh): on first install, optionally open the panel once or show
  // a short welcome state so the user knows the extension is active.
  console.log("DevMinds installed:", details.reason);
});
