/**
 * File:        extension/src/main.tsx
 * Owner:       Shreyansh
 * Purpose:     React entry point that mounts the App into the side panel DOM.
 * Contains:    createRoot mount call.
 * Status:      IMPLEMENTED — mounts <App /> inside StrictMode with the shared design tokens.
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