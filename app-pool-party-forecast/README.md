# Pool Party Forecast 🏊

A single-page tool that answers one question: is it pool weather? Search a
location (or use your current one), pick a date, and get a green/yellow/red
verdict based on temperature, rain chance, and storms.

Standalone static app — a single self-contained `index.html` (no build
step, no dependency on any other app in this repo).

## How it works

- Location search and current-position lookup use the free
  [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api).
- Dates within 16 days use Open-Meteo's [forecast API](https://open-meteo.com/en/docs);
  dates further out fall back to an estimate averaged from the same
  calendar date across the last 8 years via the
  [historical archive API](https://open-meteo.com/en/docs/historical-weather-api).
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
