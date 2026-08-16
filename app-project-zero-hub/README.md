# Project Zero Hub

The landing page for this repo's projects: a single page of cards, one per
standalone app, each linking out to that app.

Links are one-way — the hub links out to every other app, but none of
them link back here.

## Architecture

```
src/
  data/projects.ts   The list of projects shown on the hub. Add an entry
                      here (name, description, tags, href) when a new
                      standalone app is added to the repo.
  pages/Hub.tsx       Renders the card grid from data/projects.ts
  components/NavBar.tsx   Site header
```

Project card links are plain relative paths (e.g. `app-hello-world/`), so
they resolve correctly both when this app is served at the site root in
dev and when deployed alongside the other apps under a shared origin (see
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml), which
assembles the hub and every other app into one GitHub Pages site with the
hub at the root).

## Prerequisites

- [Node.js 22+](https://nodejs.org/) and npm

## Running locally

```bash
npm install
npm run dev
```

Serves at `http://localhost:5173`. Note: in local dev the other apps
aren't hosted alongside the hub, so their card links won't resolve until
everything is built and assembled together (as the Deploy workflow does)
— to try a sibling app locally, run it from its own folder instead.

## Running tests

```bash
npm test
```

Lightweight Testing Library check that each project card renders with the
right link — no backend or other app required.

## CI/CD

Covered by the repo-wide workflows — see the [root README](../README.md#cicd).
