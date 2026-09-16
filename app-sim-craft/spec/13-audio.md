# 13 — Audio

## 1. Audio engine

Howler.js sits over the Web Audio API, chosen (see
[01 — Tech Stack & Architecture](01-tech-stack-architecture.md) §1) for
its sprite-sheet audio support (many short SFX packed into one decoded
buffer, avoiding dozens of small HTTP requests) and built-in positional/
spatial audio (stereo panning + distance attenuation relative to the
listener/camera), without needing to hand-roll Web Audio graph
management.

## 2. Sound categories

- **Ambient/environmental:** biome-specific looping beds (wind for
  Tundra/Glacier, insect chirping for Meadow/Forest at night, distant
  waves for Beach/Ocean-adjacent, cave drips/distant rumble underground,
  crackling for Emberglade/Ashfall), crossfaded as the player moves
  between biomes and as day transitions to night (a distinct, sparser
  night ambient layer per biome family).
- **Weather:** rain/snow/thunder/sandstorm loops and one-shots (thunder
  crack timed to lightning strikes, see
  [07 — Survival Systems](07-survival-systems.md) §4), crossfaded in/out
  with weather transitions.
- **Block interaction:** per-block-family footstep sets (stone, wood,
  grass/dirt, sand, gravel, snow, water-splash), place/break one-shots
  (also per-family — breaking Stone sounds different from breaking
  Planks), and a distinct crack-stage sound tier as a block nears
  breaking (subtle pitch-up per stage).
- **UI:** menu navigate/select/back, inventory pick-up/place-down (item-
  clink), crafting confirm, level-up/Insight-gain chime, achievement-style
  toast sound (see [17](17-game-modes-progression.md) §2).
- **Creature:** per-creature idle/hurt/death sounds and, for hostile
  types, an ambient "nearby growl" one-shot at increasing frequency the
  closer an undetected hostile creature is — an audio-only early-warning
  cue that rewards a player paying attention even before something is on
  screen.
- **Player:** footsteps (see block interaction above, material-dependent),
  jump/land grunt, swim stroke, hurt gasp, eating/drinking, breaking-
  surface gasp after near-drowning, sleep (bed rustle + a soft whoosh on
  the sleep time-skip transition).
- **Music:** a rotating pool of ambient background tracks (original
  compositions — see [00](00-vision-and-scope.md) §5 on originality; no
  licensed or genre-soundalike tracks), triggered to fade in during quiet
  exploration moments and fade out during combat/danger (detected via a
  simple "hostile creature within X blocks and alert" flag) so music
  never fights with combat-tension audio cues. A distinct, sparser
  "underground" music sub-pool plays when the player is below the
  surface band.
- **Logic/automation feedback:** Chime Block tones (see
  [09](09-redstone-automation.md) §2), Piston extend/retract thunk,
  Launcher fire, Powder Charge fuse-tick and detonation boom.

## 3. Mixing & settings

Four independent volume sliders (Settings → Audio, see
[12](12-ui-ux.md) §9): **Master**, **Music**, **Ambient** (weather +
biome beds), **SFX** (everything else — blocks, UI, creatures, player).
All persisted in local settings (not per-world). A "Mute on tab
unfocused" toggle (default on) pauses audio entirely when the browser tab
loses focus, both as a courtesy default and to avoid wasted CPU on an
inactive tab.

## 4. Spatial audio rules

- Block interaction, creature, and most one-shot SFX are positioned in
  3D space (Howler's `pos()`/`pannerAttr` API) relative to the listener
  (camera), with distance-based volume falloff and a max audible radius
  tuned per sound category (footsteps/blocks: short radius; a hostile
  creature's growl cue: longer radius, since it's meant to be an early-
  warning signal — see §2).
- Music and full-biome ambient beds are non-positional (2D, full stereo
  field) — they're meant to set overall mood, not to be localized.
- The listener orientation updates every render frame from the camera
  (see [05](05-player-mechanics.md) §2) so stereo panning tracks
  camera-look direction even when the player isn't moving.

## 5. Asset format & loading

All SFX shipped as compressed sprite sheets (one `.ogg`/`.mp3` file per
category + a JSON sprite-map, Howler's native sprite format) to minimize
request count; music tracks are separate streamed files (not sprited,
since they're long and only one plays at a time), lazy-loaded on first
need rather than bundled into the initial load, keeping first-load time
low (see [15 — Performance](15-performance.md) §7 and
[21 — Deployment & DevOps](21-deployment-devops.md) §3 for load-time
budgets this supports).
