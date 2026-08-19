# Hello World

A minimal "Hello World" full-stack reference app. The feature is trivial
on purpose — the frontend queries a GraphQL API and renders the string it
returns — so that the surrounding engineering (Clean Architecture, tests,
CI/CD) can serve as a template for real projects.

Standalone app: it only depends on itself. Linked to from the hub
(`app-project-zero-hub`) one way — it doesn't link back.

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

The homepage background is today's photo from NASA's Astronomy Picture of
the Day (APOD) API, fetched client-side. `VITE_NASA_API_KEY` defaults to
the shared `DEMO_KEY`, which works instantly with no signup but has a low
rate limit; get a free personal key at [api.nasa.gov](https://api.nasa.gov)
if you hit it.

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

## Docker

The `Api` project can run standalone in a container (used for Render
deploys). The `Dockerfile` lives at the **repo root**, not here — Render's
Docker web service builds with the repo root as context and expects
`./Dockerfile` there, so build from the repo root:

```bash
cd ..
docker build -t app-project-zero-api .
docker run -p 8080:8080 app-project-zero-api
```

## CI/CD

Covered by the repo-wide workflows — see the [root README](../README.md#cicd).
