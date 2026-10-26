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

## Punch box

Each feeling page has two buttons: **Punch box activity** and **Punch box collection**.

- **Activity** (`punch-box.html#<feeling>`): a 6 × 4 cardboard punch box under a sheet of paper. Punch a compartment to
  pop out a gift (drawn SVG art with its own animation, sound and handwritten note). Open all 24 and the box
  slides aside, you win a prize, and a differently dressed box slides in. The **Prize collection** button (top right)
  lists every prize won.
- **Collection** (`punch-collection.html#<feeling>`): the finished boxes for that feeling only, one at a time, with
  left/right arrows. Boxes and prizes are saved in this browser's `localStorage` (`heartnote-boxes`, `heartnote-prizes`).

Files: `punch-box.js` (game), `gift-art.js` (shared gift drawings), `themed*.js` (feeling-specific gifts and notes),
`prizes.js` (prizes, box designs, storage), `sfx.js` (synthesized sounds), `punch-collection.js` (collection page).
