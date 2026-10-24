# HeartNote 💌

A gentle emotional-support page: pick the feeling closest to how you feel
right now and get a short validation, a few small things to try, a guided
breathing circle (in 4, hold 2, out 6), and crisis-line info (988 / text
HOME to 741741 / 911 in the US).

HeartNote is a self-help tool, not therapy or medical advice.

Standalone static app — no build step, no dependency on any other app in
this repo. Respects the system light/dark theme.

## How to run

No install needed — just open `index.html` in a browser:

```bash
open index.html
```

Or via a local server:

```bash
npx serve .
```

## Adding or editing feelings

Each feeling is an entry in the `EMOTIONS` object at the top of
[`app.js`](app.js): an emoji, a label, a validating sentence, and a list of
tips. The sidebar buttons are generated from that object.
