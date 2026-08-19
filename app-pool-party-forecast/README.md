# Pool Party Forecast 🏊

A single-page tool that answers one question: is it pool weather? Search a
location (or use your current one) and see a month calendar with a
green/yellow/red pool-day icon on every day — tap any day for the full
verdict, temperatures, and rain chance.

Standalone static app — a single self-contained `index.html` (no build
step, no dependency on any other app in this repo).

## How it works

- Location search and current-position lookup use the free
  [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api).
- The month calendar fills in with as few requests as possible: one bulk
  call to the [forecast API](https://open-meteo.com/en/docs) for
  today..+15 days, one bulk call to the
  [historical archive API](https://open-meteo.com/en/docs/historical-weather-api)
  for any already-passed days this month, and one more (on last year's
  matching dates) as a lightweight estimate for days beyond the 16-day
  forecast horizon.
- Tapping a specific day always runs the full per-day calculation for its
  detail view: a real forecast within 16 days, the actual recorded weather
  for a past date, or an estimate averaged from the same calendar date
  across the last 8 years for dates further out.
- All calls are free and require no API key.

## How to run

No install needed — just open `index.html` in a browser:

```bash
open index.html
```

Or serve it locally (useful for geolocation, which some browsers restrict
on the `file://` scheme):

```bash
npx serve .
```
