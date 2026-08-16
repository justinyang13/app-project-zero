# app-project-zero

A minimal "Hello World" full-stack reference project. The feature is trivial
on purpose — the frontend queries a GraphQL API and renders the string it
returns — so that the surrounding engineering (Clean Architecture, tests,
CI/CD) can serve as a template for real projects.

## Architecture

```
client/   React + TypeScript (Vite), urql GraphQL client
server/   .NET Core Web API (GraphQL.NET), Clean Architecture
e2e/      Playwright end-to-end suite driving the real running stack
```

### Backend — Clean Architecture

```
server/src/Domain          Greeting value object. No dependencies.
server/src/Application     GetGreetingQuery / GetGreetingHandler use case,
                            IGreetingProvider interface. Depends on Domain only.
server/src/Infrastructure  GreetingProvider (implements IGreetingProvider).
                            Depends on Application + Domain.
server/src/Api             ASP.NET Core host, GraphQL.NET schema, DI wiring.
                            Depends on all inner layers.
```

Dependencies point inward only (enforced via project references): `Api` →
`Infrastructure`/`Application` → `Domain`. `Domain` and `Application` have no
knowledge of GraphQL, ASP.NET Core, or how the greeting is actually produced.

The GraphQL schema exposes a single field: `Query { hello: String! }`.

## Prerequisites

- [.NET SDK 10](https://dotnet.microsoft.com/download) (LTS)
- [Node.js 22+](https://nodejs.org/) and npm

## Running locally

**Backend** (serves GraphQL at `http://localhost:5043/graphql`):

```bash
cd server
dotnet run --project src/Api
```

**Frontend** (serves the app at `http://localhost:5173`):

```bash
cd client
npm install
npm run dev
```

The client reads its GraphQL endpoint from `VITE_GRAPHQL_URL` (see
[`client/.env.example`](client/.env.example)); it defaults to
`http://localhost:5043/graphql` when unset, matching the backend's default
local port. Copy `.env.example` to `.env` to override it.

## Running tests

**Backend unit tests** (xUnit, Application layer, isolated from
Infrastructure/Api):

```bash
cd server
dotnet test
```

**Frontend unit tests** (Testing Library, mocks the GraphQL response):

```bash
cd client
npm test
```

**End-to-end tests** (Playwright — starts the real API and client and
asserts the greeting renders from a live, unmocked GraphQL call):

```bash
cd e2e
npm install
npx playwright install --with-deps chromium
npm test
```

## CI/CD

- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push
  and PR to `main`: backend build + xUnit tests, frontend build + lint +
  unit tests, then the Playwright e2e suite against the real stack. Any
  failure fails the workflow.
- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs after
  CI succeeds on `main`: builds and publishes `client/dist` to GitHub Pages,
  and triggers a Render deploy of the `Api` project via a deploy hook.

### Deployment configuration

| Where | What | Purpose |
|---|---|---|
| Repo Settings → Pages | Source: **GitHub Actions** | Required for `deploy-pages` job to publish |
| Repo Settings → Secrets → Actions | `RENDER_DEPLOY_HOOK_URL` | Render's deploy hook URL for the `Api` web service |
| Repo Settings → Variables → Actions | `RENDER_API_URL` | The deployed Render API's GraphQL URL (e.g. `https://app-project-zero-api.onrender.com/graphql`), baked into the Pages build |

**Known limitation:** Render's free tier spins down after inactivity, so the
first request after idle time can take 30+ seconds while the instance cold
starts. This only affects the deployed demo, not local development.

**Follow-up (not automatable from here):** enable branch protection on
`main` requiring the `CI` workflow to pass before merging (Settings →
Branches → Branch protection rules).

## Docker

The `Api` project can run standalone in a container (used for Render
deploys). The `Dockerfile` lives at the repo root — build with the repo
root as context, not `server/` — because that's what Render's Docker web
services expect by default:

```bash
docker build -t app-project-zero-api .
docker run -p 8080:8080 app-project-zero-api
```
