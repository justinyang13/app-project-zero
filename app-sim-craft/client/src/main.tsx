import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { lockPageZoom } from "./lockPageZoom";
import "./index.css";

lockPageZoom();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Minimal, no-op-fetch service worker — see public/sw.js. Only exists so
// the installable/standalone PWA behavior (manifest.webmanifest) is
// recognized consistently; registration failing (e.g. in a sandboxed
// preview iframe) is harmless, so it's silently ignored.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // BASE_URL (not a literal "/sw.js") because the deployed build is
    // served from a subpath (see vite.config.ts) — an absolute path
    // would resolve to the site root instead of where sw.js actually is.
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
