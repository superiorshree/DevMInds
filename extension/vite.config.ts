// File:        extension/vite.config.ts
// Owner:       Shreyansh
// Purpose:     Vite build config that produces a loadable unpacked Chrome extension (side panel + background worker).
// Contains:    Vite defineConfig with react plugin, MV3 entry points, relative base, and a manifest copy plugin.
// Status:      STUB, replace TODOs with real implementation
// Depends on:  extension/manifest.json, extension/index.html, extension/src/background.ts

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

/**
 * Copy manifest.json from the extension root into dist/ so the build output is
 * a loadable unpacked extension. Icons can be copied the same way later.
 */
function copyManifest() {
  return {
    name: "copy-manifest",
    closeBundle() {
      const outDir = resolve(rootDir, "dist");
      mkdirSync(outDir, { recursive: true });
      copyFileSync(resolve(rootDir, "manifest.json"), resolve(outDir, "manifest.json"));
    },
  };
}

export default defineConfig({
  // Relative paths so the extension loads from chrome://extensions unpacked.
  base: "./",
  plugins: [react(), copyManifest()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      // Two entry points: the side panel HTML and the background service worker.
      input: {
        index: resolve(rootDir, "index.html"),
        background: resolve(rootDir, "src/background.ts"),
      },
      output: {
        // Stable filenames referenced by manifest.json.
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
