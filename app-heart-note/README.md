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

## Calm games

A feeling can have its own small game. Each one practises something that helps with that feeling, saves your progress
in this browser, and has a "My ..." button for what you have collected. The button appears on the feeling's page.

| Feeling | Game | What you practise |
|---|---|---|
| Anxious | `worry-boat.html` — write a worry, fold a paper boat, then steer it with your breath: hold to rise (in for 4), let go to sink (out for 6) and follow the glowing path to collect pearls. Spot sea friends, earn stars and a sailor rank, then decide if the worry is yours to fix | slow breathing, then "is this mine to fix?" with a small step |
| Lonely | `lantern-friends.html` — release cute kind lanterns in 12 colors; Lantern Keepers (written messages) answer. When 12 lanterns join they are saved as a named constellation (every note still readable under **Constellations**) and the sky clears | reaching out; "Send a real hello" is the real goal |
| Tired | `lullaby-lights.html` — echo the sleepy stars as the sky dims and slows until a sleepy friend falls asleep | winding down, rest without pressure |
| Happy | `joy-jar.html` — catch firefly "good moments", savor each for five seconds, keep them in a jar to reread, and release any of them when you are ready. Filling a jar earns a gift for the **Firefly Gift Collection** | savoring, remembering, and letting go |

Shared files: `game-common.js` (helpers), `games.css`. Planned next: Gratitude Garden, Star Jar, Rain to Rainbow.
