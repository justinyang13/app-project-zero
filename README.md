# app-project-zero

A small monorepo of standalone personal projects, fronted by a hub page.

| Folder | What it is |
|---|---|
| [`app-project-zero-hub/`](app-project-zero-hub/README.md) | Landing page — cards linking out to every app below |
| [`app-hello-world/`](app-hello-world/README.md) | Full-stack Hello World reference app (React + .NET GraphQL), Clean Architecture template |
| [`app-note-ninja/`](app-note-ninja/README.md) | Ear-training game for piano-playing kids |
| [`app-pool-party-forecast/`](app-pool-party-forecast/README.md) | Green/yellow/red pool-weather verdict for a place and date |
| [`app-loot-raider/`](app-loot-raider/README.md) | Crowd-sourced map for spotted Happy Meal collectibles (React + .NET GraphQL) |

Each folder is a fully standalone app: its own dependencies, its own
README, runnable and testable on its own without the others present. The
hub links out to every app one way — none of the apps link back to the
hub or to each other. New projects get their own top-level `app-*` folder
and a card in [`app-project-zero-hub/src/data/projects.ts`](app-project-zero-hub/src/data/projects.ts).

See each app's own README for how to run and test it locally.

## CI/CD

- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push
  and PR to `main`, with one job per app: the hub's lint/test/build, Hello
  World's backend build + xUnit tests, Hello World's frontend build/lint/
  unit tests, the Playwright e2e suite against the real Hello World stack,
  and Loot Raider's backend build + xUnit tests and frontend build/lint/
  unit tests. `app-note-ninja` and `app-pool-party-forecast` are plain
  static apps with no build step, so they have no CI job. Any failure fails
  the workflow.
- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs after
  CI succeeds on `main`: builds the hub, the Hello World client, and the
  Loot Raider client, copies in Note Ninja's and Pool Party Forecast's
  static files, and assembles all five into one GitHub Pages site — the hub
  at the site root, `app-hello-world/`, `app-note-ninja/`,
  `app-pool-party-forecast/`, and `app-loot-raider/` as subpaths —
  matching the relative links the hub's cards use. It also triggers a
  Render deploy of the Hello World `Api` and the Loot Raider `Api` via
  their own deploy hooks (each app is a separate Render service).

### Deployment configuration

| Where | What | Purpose |
|---|---|---|
| Repo Settings → Pages | Source: **GitHub Actions** | Required for `deploy-pages` job to publish |
| Repo Settings → Secrets → Actions | `RENDER_DEPLOY_HOOK_URL` | Render's deploy hook URL for the Hello World `Api` web service |
| Repo Settings → Variables → Actions | `RENDER_API_URL` | The deployed Render API's GraphQL URL (e.g. `https://app-project-zero-api.onrender.com/graphql`), baked into the Hello World client's Pages build |
| Repo Settings → Secrets → Actions | `RENDER_DEPLOY_HOOK_URL_LOOT_RAIDER` | Render's deploy hook URL for the Loot Raider `Api` web service |
| Repo Settings → Variables → Actions | `RENDER_API_URL_LOOT_RAIDER` | The deployed Loot Raider Render API's GraphQL URL, baked into the Loot Raider client's Pages build |

Loot Raider's Render web service also needs `GITHUB_GIST_TOKEN` and
`GITHUB_GIST_ID` env vars set directly on the service (not via this repo's
Actions secrets) — see [`app-loot-raider/README.md`](app-loot-raider/README.md#persistence--csv-designed-to-be-swappable).

**Known limitation:** Render's free tier spins down after inactivity, so the
first request after idle time can take 30+ seconds while the instance cold
starts. This only affects the deployed demos, not local development.

**Follow-up (not automatable from here):** enable branch protection on
`main` requiring the `CI` workflow to pass before merging (Settings →
Branches → Branch protection rules).

## Docker

The Hello World `Api` project can run standalone in a container (used for
Render deploys). The `Dockerfile` lives at this repo root — build with the
repo root as context, not `app-hello-world/` — because that's what
Render's Docker web service expects by default:

```bash
docker build -t app-project-zero-api .
docker run -p 8080:8080 app-project-zero-api
```

Loot Raider's `Api` is fully self-contained instead: its `Dockerfile` lives
at [`app-loot-raider/server/Dockerfile`](app-loot-raider/server/Dockerfile),
with Render's service root directory set to `app-loot-raider/server` — see
that app's own README for how to build it.

```bash
cd app-loot-raider/server
docker build -t app-loot-raider-api .
docker run -p 8080:8080 app-loot-raider-api
```
