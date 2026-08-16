/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // This app is the root of the combined GitHub Pages site assembled by
  // .github/workflows/deploy.yml — the local dev server stays at the site
  // root, only apply the prefix on build.
  base: command === "build" ? "/app-project-zero/" : "/",
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    globals: true,
  },
}));
