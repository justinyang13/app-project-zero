# Hello World

Minimal full-stack reference app — the feature (frontend queries GraphQL,
renders a greeting string) is intentionally trivial so the surrounding
engineering (Clean Architecture, tests, CI/CD) can serve as a template for
real projects in this repo. See [README.md](README.md) for architecture,
local run/test commands, and Docker; this file is for things the README
doesn't cover.

## Stack

- **Client**: React + TypeScript (Vite), urql GraphQL client.
- **Server**: .NET Core Web API, GraphQL.NET, Clean Architecture
  (`Domain` → `Application` → `Infrastructure` → `Api`, dependencies point
  inward only).
- **e2e**: Playwright, drives the real running stack (not mocked).
- No .NET SDK is installed on this dev machine — GitHub Actions CI
  (`.github/workflows/ci.yml`) is the real compile/test signal for any C#
  change; don't assume a local `dotnet build`/`dotnet test` is available.

## Deployment

- Client: GitHub Pages at `app-hello-world/` subpath (assembled by the
  repo-root `deploy.yml` alongside the hub and other apps).
- Server: Render, Docker-based, `Dockerfile` at the **repo root** (not
  `server/`) — Render's Docker web service builds with repo root as
  context. Config: `RENDER_DEPLOY_HOOK_URL` secret,
  `RENDER_API_URL` variable (see root [README.md](../README.md#cicd)).
- Homepage background is fetched client-side from NASA's APOD API.
  `VITE_NASA_API_KEY` defaults to the shared `DEMO_KEY` (works with no
  signup, low rate limit) — if the background image starts failing
  intermittently, check for a NASA API 429 before assuming a code bug.

## Relationship to other apps

Standalone — depends on nothing else in the repo. The hub
(`app-project-zero-hub`) links to it one-way; it doesn't link back.

## Working conventions

- "save" means commit + push straight to `main` — no confirmation needed.
