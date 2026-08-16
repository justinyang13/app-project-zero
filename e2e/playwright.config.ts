import { defineConfig, devices } from "@playwright/test";

const API_PORT = 5180;
const CLIENT_PORT = 5190;
const apiUrl = `http://localhost:${API_PORT}`;
const clientUrl = `http://localhost:${CLIENT_PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: clientUrl,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      // --no-launch-profile: skip launchSettings.json so ASPNETCORE_ENVIRONMENT
      // stays unset (Production) here, matching how the real deployment runs,
      // rather than picking up the Development CORS allowlist meant for :5173.
      command: `dotnet run --project ../server/src/Api/Api.csproj --no-launch-profile --urls ${apiUrl}`,
      port: API_PORT,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run dev -- --port ${CLIENT_PORT} --strictPort`,
      cwd: "../client",
      port: CLIENT_PORT,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_GRAPHQL_URL: `${apiUrl}/graphql`,
      },
    },
  ],
});
