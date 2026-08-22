# Loot Raider

A crowd-sourced tracker for limited-time fast-food collectible promotions
(Happy Meal toy sets, etc). Anyone can report that a specific item from the
current promotion is available at a specific location — no account
required. Reports show on a map so other people nearby can see what's been
spotted and when.

The MVP seeds and shows exactly one promotion — McDonald's × Sanrio ×
Godzilla Happy Meal — but the data model and naming stay
promotion-agnostic: adding a second promotion later never requires a rename
or schema migration, just new seed data (`server/data/promotions.csv` and
`server/data/collectible_items.csv`).

Standalone app: it only depends on itself. Linked to from the hub
(`app-project-zero-hub`) one way — it doesn't link back.

## Architecture

```
client/   React + TypeScript (Vite), urql GraphQL client, Leaflet map
server/   .NET Core Web API (GraphQL.NET), Clean Architecture
```

### Backend — Clean Architecture

```
server/src/Domain          Promotion, CollectibleItem, Venue, CheckIn.
                            Immutable, self-validating. No dependencies.
server/src/Application     Use cases (GetActivePromotionQuery,
                            GetVenuesNearQuery, ReportCheckInCommand, ...)
                            and the repository interfaces Infrastructure
                            implements. Depends on Domain only.
server/src/Infrastructure  CSV-backed repositories + the Overpass venue
                            discovery service. Depends on Application + Domain.
server/src/Api             ASP.NET Core host, GraphQL.NET schema, DI wiring,
                            rate limiting. Depends on all inner layers.
```

Dependencies point inward only (enforced via project references). Domain
and Application have no knowledge of GraphQL, ASP.NET Core, CSV, or
Overpass — Infrastructure is the only layer that knows persistence is CSV
today (see "Persistence" below).

### GraphQL API

```
query activePromotion: Promotion!
query collectibleItems(promotionId: ID!): [CollectibleItem!]!
query venuesNear(lat: Float!, lng: Float!, radiusMeters: Int!, promotionId: ID!): [VenueSummary!]!
query checkInsForVenue(venueId: ID!, promotionId: ID!): [CheckIn!]!
mutation reportCheckIn(input: ReportCheckInInput!): CheckIn!
```

`venuesNear` is cache-first: it only calls out to the free Overpass API
(OpenStreetMap) when nothing is cached for that area yet, and falls back to
whatever's cached if Overpass is unavailable.

### Persistence — CSV, designed to be swappable

Application defines persistence purely as interfaces it owns
(`IPromotionRepository`, `IVenueCache`, `ICheckInRepository`). Infrastructure
implements those interfaces with CSV today, on top of a small
`ICsvTableStore<T>` abstraction with two implementations, chosen by the
`Persistence:Provider` config key:

- `LocalFileCsvTableStore<T>` — plain files under `server/data/`. Used for
  local dev.
- `GitHubGistCsvTableStore<T>` — reads/writes the same CSVs inside one
  secret GitHub Gist via the GitHub REST API. Used in **production**,
  because Render's free tier wipes local disk on every restart/spin-down.
  Requires a GitHub personal access token with `gist` scope, set via the
  `GITHUB_GIST_TOKEN` and `GITHUB_GIST_ID` environment variables.

Swapping to a real database later means adding one new Infrastructure class
per repository interface and flipping DI registration in `Program.cs` —
Domain, Application, and Api don't change.

**Known limitation, accepted at hobby scale:** the Gist-backed store is
eventually-consistent and not built for concurrent writes under real load.

### Location data — no API key required

- Map rendering: Leaflet (`react-leaflet`) with an OpenStreetMap tile layer.
- Nearby venues: the free, public Overpass API, queried for
  `amenity=fast_food` nodes matching the active promotion's chain name.
- Address search / "use my location": browser Geolocation API + Nominatim.

### Abuse mitigation (no accounts, kept light)

- The client soft-limits one active check-in per item per venue per device
  per day via a `localStorage` marker — spam friction, not a security
  boundary. No device identity is ever sent to the server or stored in the
  `CheckIn` record.
- The server rate-limits the `/graphql` endpoint per IP (ASP.NET Core's
  built-in rate limiting middleware).

### Explicitly out of scope for MVP

- No user accounts/auth, no moderation/admin UI.
- No user-uploaded photos (avoids object storage cost, and sidesteps
  hosting others' copyrighted product photos) — catalog items without real
  art fall back to a shared placeholder icon, not licensed character art.
- No promotion-switcher UI — the schema supports multiple `Promotion` rows,
  the client just renders whichever one is `isActive`.

## Prerequisites

- [.NET SDK 10](https://dotnet.microsoft.com/download)
- [Node.js 22+](https://nodejs.org/) and npm

## Running locally

**Backend** (serves GraphQL at `http://localhost:5183/graphql`, reading/
writing CSVs under `server/data/`):

```bash
cd server
dotnet run --project src/Api
```

**Frontend** (serves the app at `http://localhost:5173`, or pass `--port`
to run alongside another app):

```bash
cd client
npm install
npm run dev
```

The client reads its GraphQL endpoint from `VITE_GRAPHQL_URL` (see
`client/.env.example`); it defaults to `http://localhost:5183/graphql`
when unset. Copy `.env.example` to `.env` to override it.

## Running tests

**Backend unit tests** (xUnit, Application layer, isolated from
Infrastructure/Api):

```bash
cd server
dotnet test
```

**Frontend unit tests** (Testing Library):

```bash
cd client
npm test
```

## Docker

Unlike Hello World (which shares the repo-root `Dockerfile`), this app is
self-contained: `server/Dockerfile` builds with `app-loot-raider/server` as
context, matching Render's service root directory for this app.

```bash
cd server
docker build -t app-loot-raider-api .
docker run -p 8080:8080 app-loot-raider-api
```

## CI/CD

Covered by the repo-wide workflows — see the [root README](../README.md#cicd).
Loot Raider's Render deploy hook and deployed GraphQL URL are separate from
Hello World's (`RENDER_DEPLOY_HOOK_URL_LOOT_RAIDER` secret,
`RENDER_API_URL_LOOT_RAIDER` variable) since it's a separate Render service.
