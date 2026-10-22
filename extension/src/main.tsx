/**
 * File:        extension/src/main.tsx
 * Owner:       Shreyansh
 * Purpose:     React entry point that mounts the App into the side panel DOM.
 * Contains:    createRoot mount call.
 * Status:      STUB, replace TODOs with real implementation
 * Depends on:  extension/src/App.tsx, extension/src/styles/tokens.css
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/tokens.css";

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
