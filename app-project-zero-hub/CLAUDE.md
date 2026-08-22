# Project Zero Hub

The repo's landing page — a card grid, one card per standalone app, linking
out to each. See [README.md](README.md) for architecture and local run/test
commands; this file is for things the README doesn't cover.

## Stack

React + TypeScript (Vite). No backend — `src/data/projects.ts` is the only
"data source," a hand-maintained list of `{ name, description, tags, href }`.

## Adding a new app to the repo

Three places need updating, not just this one:
1. `src/data/projects.ts` here — add the card.
2. Root [`README.md`](../README.md) — add the row to the folder table.
3. `.github/workflows/ci.yml` and `deploy.yml` at the repo root — add the
   new app's build/test/deploy steps (a plain static app with no build step
   needs no CI job, only a copy step in `deploy.yml`; see how
   `app-note-ninja`/`app-pool-party-forecast` are handled there for that
   case).

## Gotchas

- Card links are relative paths (e.g. `app-hello-world/`) that only resolve
  correctly once everything is built and assembled together the way
  `deploy.yml` does. In local dev (`npm run dev`), sibling apps aren't
  hosted alongside the hub, so their cards won't actually navigate anywhere
  — that's expected, not a bug. To try a sibling app, run it from its own
  folder instead.

## Relationship to other apps

Links out to every app one-way; no app links back here.

## Working conventions

- "save" means commit + push straight to `main` — no confirmation needed.
