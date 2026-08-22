# Note Ninja

Ear-training game for piano-playing kids — hear a note, click the matching
piano key. Solo or 2-player. See [README.md](README.md) for how to play and
run it; this file is for things the README doesn't cover.

## Stack

Standalone static app: `index.html` + `game.js` + `style.css`. No build
step, no dependencies, nothing to install. Not part of the CI workflow
(`.github/workflows/ci.yml`) since there's no build/test to run — it's
copied as-is into the deployed site by `deploy.yml`.

## Gotchas

- Audio via Web Audio API may not autoplay when the page is opened directly
  from `file://` in some browsers — that's why the README suggests
  `npx serve .` as a fallback. If a future change to note-playback stops
  working locally, check this before assuming a code bug.

## Working conventions

- "save" means commit + push straight to `main` — no confirmation needed.
