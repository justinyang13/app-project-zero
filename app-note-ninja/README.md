# Note Ninja 🎹🐱

A cute ear-training game for piano-playing kids: listen to a note and guess
which one it is. Play solo or head-to-head with two players.

Standalone static app — no build step, no dependency on any other app in
this repo.

## How to run

No install needed — just open `index.html` in a browser:

```bash
open index.html
```

Or, to run it via a local server (optional, useful if double-clicking
doesn't play audio in your browser):

```bash
npx serve .
```

## How to play

1. Pick 1 or 2 players, a difficulty (Easy/Medium/Hard), and how many
   rounds per player.
2. Click **Start Game**.
3. Listen to the note that plays automatically (use **Play Note** to hear
   it again, or **Reference (Middle C)** for an anchor pitch).
4. Click the piano key you think matches the note.
5. In 2-player mode, turns alternate each round — most correct guesses at
   the end wins!

Difficulty controls note range and whether sharps/flats are included:
- **Easy** — natural notes, one octave
- **Medium** — natural notes, three octaves
- **Hard** — all 12 notes (sharps/flats), three octaves
