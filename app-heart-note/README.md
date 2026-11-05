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
| Anxious | `worry-boat.html` — write a worry, fold a paper boat, and your worry becomes the patched sail of a cute old wooden boat. Steer it through a sunset-to-dawn night by breathing (hold to rise = in for 4, let go to sink = out for 6), collecting pearls (golden = 3), tapping jumping fish, and tapping sea friends so they join your crew and help you. Calm streaks bring dolphins. Stars, a sailor rank that dresses up your boat, then "is this mine to fix?" | slow breathing, then "is this mine to fix?" with a small step |
| Lonely | `lantern-friends.html` — each constellation is a picture to draw (Heart, Sun, Flower, Gem): every lantern flies to the next glowing spot. Warm each lantern by holding a button while you breathe slowly (a steady flame drops stardust), catch shooting stars for stardust, and spend it to unlock more lantern colors. Finished pictures are saved as named constellations with every note readable | reaching out; "Send a real hello" is the real goal |
| Tired | `lullaby-lights.html` — echo the sleepy stars (some nights you play them backwards), watch the stars you tap join into lines, earn dream stars for each round and extra for perfect ones, and spend them in the Sleepy room on things that stay in your sleepy friends' room. Seven rounds tuck in a sleepy friend | winding down, rest without pressure |
| Happy | `joy-jar.html` — fireflies react to your pointer: move gently and they come close, rush and they flit away (and sometimes slip a click). Golden fireflies are rare and fill two spots. Savor each moment for five seconds, release any of them when you are ready, and every full jar earns a gift for the **Firefly Gift Collection** | savoring, remembering, and letting go |

Shared files: `game-common.js` (helpers), `games.css`. Planned next: Gratitude Garden, Star Jar, Rain to Rainbow.

`games.html` lists every game: the ones you can play now (with your progress) and what is coming soon for each feeling. It is linked from the main page as **All games**.

## More feelings

Besides the first ten, HeartNote also has **Scared, Disappointed, Jealous, Embarrassed and Excited**. Each has its own tips, scroll notes,
punch box gifts (they reuse the gift drawings, with notes written for that feeling in `feelings-more.js`) and a game:

| Feeling | Game | What you practise |
|---|---|---|
| Scared | `brave-light.html` — hold a flashlight steady on a scary shadow until it turns into something friendly (3 rooms) | facing a fear calmly makes it smaller |
| Disappointed | `silver-lining.html` — open gray clouds and answer a gentle question to find each silver lining | reframing, planning a different way |
| Jealous | `my-own-garden.html` — plant flowers from true things about you; peeking over the fence dims your garden | noticing your own strengths instead of comparing |
| Embarrassed | `zoom-out.html` — zoom from the room to the galaxy, finding yourself each time, then say a kind word to yourself | perspective: it's one small moment |
| Excited | `firework-show.html` — time your launches to the meter, then settle with three slow breaths | using energy, then calming down |

## A playable game for every feeling

| Feeling | Game | What you practise |
|---|---|---|
| Sad | `rain-rainbow.html` — name the feeling inside each raindrop and it turns into a band of the rainbow | naming feelings makes them smaller |
| Angry | `dragon-whisperer.html` — stomp the steam out safely, then match an angry dragon's slow breathing until it calms | letting anger out safely, then slowing down |
| Stressed | `sort-bubbles.html` — sort bubbles into Today (only 3 fit), Later, and Let it go | choosing what matters, and putting things down |
| Overwhelmed | `one-thing-jar.html` — put everything in a jar, shake it, and do just one thing for five minutes | one small step at a time |
| Guilty | `golden-mend.html` — mend a broken plate with five kind steps (sorry, make it right, learn, be fair, forgive yourself) and golden seams | repair and self-forgiveness |
| Grateful | `gratitude-garden.html` — plant what you're thankful for, water it daily for butterflies and a past thank-you | noticing the good, day after day |
