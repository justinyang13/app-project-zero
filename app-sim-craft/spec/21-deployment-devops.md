# 21 — Deployment & DevOps

## 1. Build & hosting

SimCraft is a fully static build — no backend, no server-rendered
content (see [00 — Vision & Scope](00-vision-and-scope.md) §4) — so it
follows the exact deployment pattern this monorepo already uses for
[`app-storyden`](../../app-storyden/README.md): `vite build` produces a
static `dist/` bundle, deployed to GitHub Pages as a subpath of the
monorepo's existing Pages site (`app-sim-craft/` alongside the other
`app-*` subpaths — see the [repo root README](../../README.md#cicd) for
the current deploy pipeline shape).

## 2. CI

A new job added to the repo's existing `.github/workflows/ci.yml`,
matching the pattern already used for the other frontend-only apps
(build + lint + unit test, no backend job needed):

```yaml
# illustrative addition, not the final workflow file
sim-craft:
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: app-sim-craft/client
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 20 }
    - run: npm ci
    - run: npm run lint
    - run: npm run test
    - run: npm run build
```

Playwright e2e tests (see
[20 — Testing & QA](20-testing-qa.md) §3) run as a separate CI step/job
(they need a browser binary install step, `npx playwright install
--with-deps`, and are slower — kept separate so a lint/unit failure
surfaces fast without waiting on the full e2e suite, matching how the
existing Hello World Playwright suite is already split out in this
repo's CI).

## 3. Deploy

Added to `.github/workflows/deploy.yml` alongside the existing per-app
build-and-copy steps: `app-sim-craft/client`'s `dist/` output is copied
into the assembled Pages site under `app-sim-craft/`, and a card is added
to `app-project-zero-hub/src/data/projects.ts` linking to it — following
the repo root README's stated convention that "new projects get their
own top-level `app-*` folder and a card in the hub's project list." No
Render (or other backend host) deploy step is needed for SimCraft, since
there is no backend service — unlike Hello World and Loot Raider's
`Api` projects, SimCraft has nothing analogous to deploy there.

## 4. Offline support (PWA)

`vite-plugin-pwa` generates a Service Worker that precaches the full app
shell (JS/CSS bundles, the texture atlas, core SFX sprite sheets) on
first visit, so subsequent visits — including with no network connection
at all — load and play normally. Manifest (`manifest.webmanifest`)
includes name, icons, and `display: standalone` so the game can be
"installed" as a PWA (added to home screen / OS app list) for a more
app-like launch experience, fully optional and not required to play in a
normal browser tab.

- **Cache versioning:** the Service Worker's precache manifest is
  content-hashed per build (Vite's default asset hashing), so a new
  deploy correctly invalidates stale cached assets rather than serving
  an old bundle indefinitely — standard Vite PWA plugin behavior, called
  out here because getting this wrong (stale JS served against a
  migrated save schema) is a plausible real bug class for a game with a
  persistent local save (see
  [14 — Persistence & Saves](14-persistence-saves.md) §5's migration
  system, which exists specifically to make a version-skew scenario like
  this safe rather than corrupting).
- Music tracks (lazy-loaded per
  [13 — Audio](13-audio.md) §5) are cached opportunistically after first
  play, not precached up front, keeping the initial installable payload
  smaller.

## 5. Browser support matrix

| Browser | Support level |
|---|---|
| Chrome/Edge (Chromium), recent 2 major versions | Primary target — WebGL2, IndexedDB, Web Workers, WASM all well-supported |
| Firefox, recent 2 major versions | Fully supported |
| Safari (macOS/iOS), recent 2 major versions | Supported; historically the browser most likely to have IndexedDB quota/Storage-API quirks — explicitly covered in the manual QA cross-browser pass (see [20](20-testing-qa.md) §5) |
| Mobile Chrome (Android) | Supported, touch controls per [16 — Controls & Accessibility](16-controls-accessibility.md) §2 |
| Mobile Safari (iOS) | Supported, same touch controls; iOS Safari's stricter Storage API/PWA install behavior tracked in QA |
| Internet Explorer / legacy Edge | Not supported (no WebGL2/modern JS support) — a clear, friendly "unsupported browser" message shown rather than a silent broken page |

No WebGPU dependency anywhere in the MVP (see
[00 — Vision & Scope](00-vision-and-scope.md) §4) — WebGL2 is the
universal baseline this matrix is built on.

## 6. Environment configuration

Because there is no backend, there are effectively no secrets or
environment-specific API URLs to manage for SimCraft (unlike Hello
World's `RENDER_API_URL` or Loot Raider's equivalent, per the
[repo root README](../../README.md#deployment-configuration)) — the
build is identical regardless of target environment, which simplifies
this app's slice of the deploy pipeline relative to the backend-having
apps in this monorepo.

## 7. Monitoring & error reporting

Given the no-backend, no-telemetry stance (see
[00 — Vision & Scope](00-vision-and-scope.md) §4), SimCraft does not
phone home any error/crash reports by default. A client-side error
boundary (React error boundary around the app shell, plus a top-level
`window.onerror`/`onunhandledrejection` handler around the game loop)
catches unexpected crashes and surfaces a friendly recovery screen
("Something went wrong — your last autosave is safe") with an option to
copy the error details to the clipboard for the player to manually
report (e.g. via a GitHub issue on this repo), rather than silently
losing the session or auto-submitting data anywhere.
