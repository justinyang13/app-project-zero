# Loot Raider

Crowd-sourced McDonald's Happy Meal collectible tracker. Users see a map of
venues, filter by which collectible they're hunting, and report check-ins
("I saw item X here just now").

## Stack

- **Client**: React 19 + TypeScript + Vite, react-leaflet/Leaflet for the map,
  urql as the GraphQL client. Lives in `client/`.
- **Server**: .NET 10, Clean Architecture (`server/src/Domain` →
  `Application` → `Infrastructure` → `Api`), GraphQL.NET 8.8.4. No .NET SDK
  is installed on this dev machine — GitHub Actions CI is the real
  compile/test signal for C# changes. For client-side visual verification
  without a live backend, there's a mock GraphQL server script pattern used
  in past sessions (throwaway, recreate as needed rather than hunting for a
  saved copy).
- **Tests**: Vitest + Testing Library (client), xUnit (server).

## Deployment

- **Client**: GitHub Pages, via `.github/workflows/deploy.yml`.
  `VITE_GRAPHQL_URL` is baked in at build time from the
  `RENDER_API_URL_LOOT_RAIDER` repo variable. Live at
  `https://justinyang13.github.io/app-project-zero/app-loot-raider/`.
- **Server**: Render.com, free tier, Docker-based.
- **Data store (production only)**: a GitHub Gist
  (id `71a912caba6d583422601bb0f8b86b5e`), read/written through
  `ICsvTableStore<T>` — `GitHubGistCsvTableStore` in prod,
  `LocalFileCsvTableStore` in dev (reads `server/data/*.csv` directly).

## Known gotchas

- **Render free tier cannot reach `overpass-api.de`** ("Network unreachable").
  Live Overpass venue discovery is broken in production — this isn't a bug
  to keep chasing, it's a platform limitation. Venues have to be
  pre-seeded into the Gist instead (currently California-wide, ~455 rows,
  synced into both `server/data/venues.csv` and the Gist).
- **The Gist is cached in-memory** by the running server process. Any
  out-of-band edit to it (e.g. via `gh api`) needs a service restart
  (Render MCP `trigger_deploy`) before the app will see it.
- **iOS Safari's address bar collapses on scroll**, making `100vh` taller
  than the actually-visible viewport — bottom-anchored UI (the Filter
  panel) can end up below the fold. Fixed via `100dvh` /
  `-webkit-fill-available` in `client/src/App.css`; hard to fully verify
  from this sandbox since there's no real iOS Safari engine available here.
- **Vite asset imports**: reference images via
  `import x from "./assets/x.png"` (ES module import), not files dropped in
  `public/` — the latter bypasses the configured `base` path and breaks
  under the GitHub Pages subpath.

## React patterns used here

- **Deriving state once from async data** (e.g. "auto-open the nearest
  venue's popup on first load only"): don't use `useEffect` for this —
  oxlint's `react(set-state-in-effect)` flags it, and it's also just not
  the idiomatic fit. Instead, guard with a boolean `useState` and call
  `setState` directly in the render body ("adjust state during render," per
  React's own docs). A `useRef` guard won't work either — refs can't be
  read during render (oxlint `react(refs)`).
- **"Fire once, then disarm"** triggers passed down to a list of mounted/
  unmounted children (e.g. `autoOpenVenueId` in `MapView.tsx`): clear the
  trigger from inside the child's own effect via an `onConsumed`-style
  callback, right after using it. Leaving it set is the bug — if that
  child unmounts and remounts later (e.g. scrolled out of view and back),
  a stale trigger fires again.

## Content policy (holds regardless of how the request is framed)

Never reproduce copyrighted character likenesses (e.g. Sanrio, Toho/Godzilla
promo art) or trademarked logos (e.g. McDonald's Golden Arches) as app
assets — not from official art, not from "my own" fan art, not for a
non-commercial hobby project. This has come up multiple times; the answer
doesn't change with the framing. Collectible icons are represented with
initials-based swatches (`client/src/components/CollectibleIcon.tsx`,
`client/src/utils/initials.ts`) instead.

## Working conventions

- **"save" means commit + push straight to `main`** — no confirmation
  needed, this is a standing instruction for this project.
- Default time range filter is "all" (every location shows on load);
  picking a specific collectible switches the default to 24h for that
  session only (see `client/src/utils/timeRange.ts`).
