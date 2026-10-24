# HeartNote

Emotional-support page — choose a feeling, get validation, tips, a breathing
exercise, and crisis resources. See [README.md](README.md) for how to run
it; this file is for things the README doesn't cover.

## Stack

Standalone static app: `index.html` + `app.js` + `style.css`. No build
step, no dependencies, nothing to install. Not part of the CI workflow
(`.github/workflows/ci.yml`) since there's no build/test to run — it's
copied as-is into the deployed site by `deploy.yml`.

## Gotchas

- Tone matters: copy is validating and non-clinical. Keep the "not therapy
  or medical advice" disclaimer and the crisis-line card (988 / 741741 /
  911) on every view when editing the UI.
- Tips are rendered via `innerHTML` from the static `EMOTIONS` object; if
  that ever takes user-supplied text, switch to `textContent`.
