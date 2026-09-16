/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // The Deploy workflow assembles this app's build output under
  // /app-project-zero/app-sim-craft/ inside the combined GitHub Pages
  // site — the local dev server stays at the site root, only apply the
  // prefix on build.
  base: command === "build" ? "/app-project-zero/app-sim-craft/" : "/",
  test: {
    // Engine/worldgen/rendering logic is plain TS with no DOM dependency
    // — jsdom will come back once there are React component tests.
    environment: "node",
    globals: true,
  },
}));
