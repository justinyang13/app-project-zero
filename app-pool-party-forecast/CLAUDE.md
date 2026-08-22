# Pool Party Forecast

Single-page pool-weather verdict tool: search a location, see a month
calendar with a green/yellow/red icon per day. See [README.md](README.md)
for the forecast/estimate logic and how to run it; this file is for things
the README doesn't cover.

## Stack

Standalone static app: a single self-contained `index.html`, no build step,
no dependencies. Not part of the CI workflow (`.github/workflows/ci.yml`)
since there's nothing to build/test — it's copied as-is into the deployed
site by `deploy.yml`. All weather/geocoding calls go straight to Open-Meteo
(free, no API key) from the client.

## Gotchas

- **iOS Safari has previously overflowed the date input out of its card**
  (fixed in #7) — this repo's apps have a recurring pattern of iOS-Safari-
  specific layout bugs (see also `app-loot-raider`'s `100dvh` viewport
  issue), so treat iOS Safari as a viewport worth checking deliberately on
  any layout change here, not just desktop Chrome.
- Geolocation is restricted on the `file://` scheme in some browsers — use
  `npx serve .` locally when testing the "use current location" flow.

## Working conventions

- "save" means commit + push straight to `main` — no confirmation needed.
