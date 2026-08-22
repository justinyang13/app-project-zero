/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // The Deploy workflow assembles this app's build output under
  // /app-project-zero/app-loot-raider/ inside the combined GitHub Pages
  // site (see .github/workflows/deploy.yml) — the local dev server stays
  // at the site root, only apply the prefix on build.
  base: command === "build" ? "/app-project-zero/app-loot-raider/" : "/",
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    globals: true,
  },
}));
