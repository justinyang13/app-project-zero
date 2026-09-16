# 05 — Player Mechanics

## 1. Movement

- **Walk speed:** 4.3 blocks/s (baseline tuning value, matching genre
  feel; exact constant tunable in `data/tuning.ts`).
- **Sprint:** 5.6 blocks/s, toggled by holding Sprint (default `Ctrl` /
  double-tap forward), automatically cancelled on taking damage or
  stopping forward input; increases hunger drain slightly (see
  [07](07-survival-systems.md) §3).
- **Sneak:** 1.3 blocks/s, prevents walking off block edges (the player's
  collision box won't step off a ledge while sneaking — a deliberate
  building-safety affordance), camera lowers slightly, third-person model
  crouches, hides player name/nothing-relevant in single-player but kept
  for consistency with the genre feel and a future-proof multiplayer hook.
- **Swim:** 2.2 blocks/s surface swimming, slower underwater without the
  Aqualung Tonic or Depth Strider Rune (see [04](04-items-inventory-crafting.md)).
- **Climb:** on Ladder or Vine blocks, 2.0 blocks/s vertical, no fall
  damage while attached.
- **Jump:** fixed impulse reaching 1.25 blocks height, ~0.6s airtime;
  jump height is not variable by hold-duration (kept simple/predictable
  for precise building-related platforming).
- **Fly (Creative Mode only):** double-tap Jump toggles flight; while
  flying, Jump/Sneak control vertical movement, horizontal speed 10.8
  blocks/s (configurable multiplier in settings), no fall damage, no
  collision with fluids slowing movement.
- **Fall damage:** triggers above a 3-block fall, 1 damage-equivalent
  "Heart" per block beyond that, capped at instant-lethal past 23 blocks
  unless mitigated (Featherfall Tonic, Featherstep Rune, landing in
  water/hay-equivalent "Strawbale" block which fully negates it).

## 2. Camera

- **First-person (default):** eye-height camera, standard mouse-look with
  configurable sensitivity and optional acceleration curve toggle.
- **Third-person (back/front toggle):** cycled via a dedicated key
  (default `F5`), orbits behind or in front of the player model at a
  fixed radius with camera-vs-terrain collision (radius shrinks if a wall
  is behind the player to avoid clipping through it).
- **Field of view:** 70° default, adjustable 30°–110° in settings, with an
  optional dynamic FOV increase (+~7°) while sprinting for speed feel.
- **Head bob:** subtle, togglable in settings (accessibility — see
  [16](16-controls-accessibility.md) §4).

## 3. Health, hunger, stamina

- **Health:** 20 points (10 "Hearts," half-heart granularity), regenerates
  slowly over time only while hunger is above a threshold and no damage
  taken recently (see [07](07-survival-systems.md) §2 for exact regen
  rules); reaching 0 triggers death (see §6).
- **Hunger:** 20 points, drains via a per-action cost table (idle: slow
  passive drain; sprinting/jumping/mining: higher drain; see
  [07](07-survival-systems.md) §3), restored by eating.
- **Stamina (original mechanic, not in the genre baseline):** a 100-point
  bar that drains on sprint-jumping, swimming against current, and
  climbing, regenerating when below half-drain activity. Running out of
  stamina doesn't stop movement outright but removes the sprint-speed
  bonus and applies a brief slowed-recovery penalty — a soft pacing tool
  that discourages permanently sprint-everywhere play without being
  punishing. Fully optional per difficulty (see
  [07](07-survival-systems.md) §6 — Peaceful/Creative disables stamina
  drain entirely).

## 4. Interaction model

- **Raycast targeting:** every frame, a ray is cast from the camera along
  its facing direction up to a 5-block reach (Creative Mode: 6 blocks),
  voxel-stepped (DDA algorithm) against the loaded chunk data, returning
  the first solid block hit plus which face was hit (needed for
  placement-adjacency, see [03](03-blocks-materials.md) §4).
- **Primary action (default Left Click):** on a block — begin/continue
  breaking it (hold-to-break, progress resets if the target changes or
  the player moves out of reach); on a creature — attack with the held
  item; on empty air — swing animation only.
- **Secondary action (default Right Click):** on a block with an
  interactive UI (Workbench, Furnace, Chest, doors, levers) — open/toggle
  it; otherwise, if holding a placeable block — place it on the targeted
  face; if holding a consumable — consume it; if holding a tool with a
  special use (Hoe on Loam → tills to Farmland-equivalent; Shears on
  leaves → harvest without waiting for decay), perform that use.
- **Mining assist:** an optional "auto-mine similar" toggle (holds down
  primary and continues to the next matching-type block if still facing
  one) — a modern QoL convenience, off by default, on by request in
  settings (kept optional since some players prefer the classic manual
  feel).

## 5. Player collision & physics

- **Collision box:** 0.6 × 1.8 × 0.6 blocks (width × height × depth),
  standard AABB-vs-voxel-grid sweep test each fixed tick (see
  [01](01-tech-stack-architecture.md) §8 for the fixed-timestep model),
  resolved axis-by-axis (X, then Z, then Y) to allow sliding along walls
  rather than sticking.
- **Step-up:** the player auto-steps up 1 full block height when walking
  into a ledge at walking speed (no need to jump for single-block steps —
  standard genre convenence), does not auto-step while sprint-jumping
  mid-air.
- **Sneaking collision box:** height reduces to 1.5 blocks, allowing
  crawl-through of 1.5-tall gaps that a standing player can't enter.
- **Fluid buoyancy:** partial submersion applies an upward force
  proportional to submerged fraction; full submersion in Water allows
  free vertical swim control; Lava applies strong upward buoyancy plus
  continuous damage (see [11](11-physics-fluids.md) §1–2).

## 6. Death & respawn

- On health reaching 0: a death screen shows cause of death (fall, lava,
  creature name, drowning, starvation), stats for that life (time
  survived, blocks placed/broken — cosmetic, not competitive since
  single-player), and a Respawn button.
- **Item drop on death (Survival difficulty setting dependent, see
  [07](07-survival-systems.md) §6):** default behavior drops the full
  inventory at the death location as DroppedItem entities (with the
  standard 5-minute despawn timer, extended to 10 minutes for death
  drops specifically so a player has a fair chance to recover them); a
  "Keep Inventory" difficulty toggle disables this for players who prefer
  a lower-stakes building-focused session.
- Respawn returns the player to their last-set spawn point (a slept-in
  Bed block sets spawn; otherwise the world's original spawn point from
  [02](02-world-generation.md) §9) at full health/hunger.

## 7. Original mechanic: Blueprint Ghosting

Not present in the genre baseline — while holding a Blueprint Scroll (see
[06 — Building Tools](06-building-tools.md) §4) bound to a saved
structure, a semi-transparent "ghost" preview of that structure renders
at the targeted placement location, block-snapped, rotatable in 90°
increments with the scroll's secondary-use key. Confirming placement
consumes matching materials from inventory block-by-block (missing blocks
are shown highlighted red in the ghost and simply left unplaced,
letting the player fill them in manually later) rather than requiring
every material up front — this keeps blueprint placement approachable
without making it a free "spend nothing" shortcut.
