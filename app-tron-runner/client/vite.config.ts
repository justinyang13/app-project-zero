/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  // The Deploy workflow assembles this app's build output under
  // /app-project-zero/app-tron-runner/ inside the combined GitHub Pages site.
  base: command === "build" ? "/app-project-zero/app-tron-runner/" : "/",
  test: { environment: "node", globals: true, testTimeout: 30_000 },
}));
