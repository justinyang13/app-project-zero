# 20 — Testing & QA

Matches this monorepo's existing testing stack (Vitest + Playwright, see
[01 — Tech Stack & Architecture](01-tech-stack-architecture.md) §1) with
a voxel-game-specific emphasis on determinism testing and performance
smoke testing, since those are the two failure modes hardest to catch
via ordinary unit tests alone.

## 1. Unit tests (Vitest)

- **World generation determinism:** given a fixed seed and chunk
  coordinate, generating the same chunk twice (or across a code-path
  that shouldn't affect output) must produce byte-identical block arrays
  — direct enforcement of the determinism principle in
  [01](01-tech-stack-architecture.md) §9. Snapshot tests pin known-seed
  chunk outputs so an accidental change to noise tuning is caught, not
  silently shipped as an undocumented world-gen change.
- **Greedy meshing correctness:** given a small hand-constructed block
  array (e.g. a single solid cube, an L-shaped region, a checkerboard
  pattern that shouldn't merge), assert the mesher (see
  [10 — Lighting & Rendering](10-lighting-rendering.md) §3) produces the
  expected quad count and no gaps/overlaps — checkerboard patterns
  specifically catch a mesher that over-merges across non-matching
  blocks.
- **Light propagation:** given a small block array with a known light
  source, assert the flood-fill (see
  [10](10-lighting-rendering.md) §1) produces the expected light-level
  falloff, and that the two-phase darken/re-light algorithm correctly
  handles a light source removal without leaving stale bright spots.
- **Inventory & crafting logic:** stack merging/splitting, shaped vs.
  shapeless recipe matching (see
  [04 — Items, Inventory & Crafting](04-items-inventory-crafting.md) §4),
  durability decrement and tool-break-at-zero behavior, Rune slot
  capacity enforcement.
- **Fluid flow rules:** given a small block array, assert Source→Flowing
  propagation, level decay per hop, source-regeneration from two
  adjacent sources, and Water/Lava contact conversion rules (see
  [11 — Physics & Fluids](11-physics-fluids.md) §1) all match the spec's
  stated rules exactly — these are exactly the kind of easy-to-get-
  subtly-wrong rules that benefit from explicit table-driven test cases.
- **Sparkwire signal propagation:** decay-per-block, Pulse Relay delay/
  diode behavior, and each Logic Gate's truth table (see
  [09 — Logic & Automation](09-redstone-automation.md) §2–3) verified
  against constructed small circuits.
- **Save/load round-trip:** serializing a world state and deserializing
  it must reproduce equivalent in-memory state (chunk diffs, entity
  state, inventory) — including the sparse-diff vs. full-array chunk
  storage choice from
  [14 — Persistence & Saves](14-persistence-saves.md) §2 both round-
  tripping correctly.
- **Schema migration:** each versioned migration function (see
  [14](14-persistence-saves.md) §5) tested in isolation with a
  representative "old-shape" input, asserting the expected "new-shape"
  output — critical since these only ever run against real (old) player
  save data, never re-creatable from scratch.

## 2. Integration tests (Vitest, engine-level, no rendering)

Exercise the `World`/`Chunk`/`Entity` classes together without a real
WebGL context (headless): place a block, verify neighbor block-update
scheduling fires; break a supporting block under a gravity-affected
block, verify it converts to a falling entity and lands correctly; light
a Powder Charge, verify the fuse timer and eventual detonation's block
removal radius matches the blast-resistance table (see
[09](09-redstone-automation.md) §5); plant a crop, advance simulated
ticks, verify growth-stage progression timing.

## 3. Playwright e2e smoke tests

A small, deliberately narrow suite (e2e tests are slow and brittle
relative to unit tests, so scope is kept tight) run against a real
browser with WebGL:

- App loads to main menu without console errors.
- Create a new Standard-type world → confirm the player spawns, is
  standing on solid ground, and the HUD renders (health/hunger/hotbar
  present).
- Break a block, confirm it disappears from the world and the
  corresponding item appears in inventory.
- Place a block, confirm it appears in the world at the expected
  position.
- Open the Workbench UI, craft a known recipe (e.g. Planks from Log),
  confirm the output appears.
- Save and reload the world (simulating a tab close/reopen via a fresh
  page load pointed at the same world id), confirm the previously placed/
  broken blocks persisted correctly (a direct end-to-end check of the
  persistence model from chapter 14, exercising the real IndexedDB path
  rather than a mock).
- Toggle Creative Mode flight, confirm no-fall-damage and free vertical
  movement.

## 4. Performance & stress testing

- A scripted scenario (documented in
  [15 — Performance](15-performance.md) §8) spawns the player at world
  origin on a freshly generated Standard-type world at the Medium render-
  distance preset and asserts frame time stays under budget for a fixed
  duration — run in CI where a headless-GPU browser context is reliably
  available, otherwise as a documented manual pre-release checklist item.
- A "large automated build" stress scenario loads a pre-built Blueprint
  (see [06 — Building Tools](06-building-tools.md) §2.4) containing a
  large Sparkwire signal grid and a large fluid-flow area, asserting the
  tick-scheduler's per-tick cost stays under the budget called out in
  [15 — Performance](15-performance.md) §6.
- **Fire-spread containment test:** verifies the tuned spread-chance
  values from [11 — Physics & Fluids](11-physics-fluids.md) §4 behave as
  designed (doesn't runaway-consume a test structure within an
  unreasonably short time), a regression guard specifically because this
  value is tuned by feel/playtesting rather than derived from a formula,
  and is easy to accidentally break with an unrelated refactor.

## 5. Manual QA checklist (pre-release)

A living checklist (maintained alongside the codebase, not duplicated
here) covering: full controller/touch input pass on real devices (real
touch/gamepad hardware behaves subtly differently from browser dev-tool
emulation), audio mix review with headphones and with laptop speakers,
accessibility feature pass (colorblind simulation, reduced-motion,
subtitle coverage — see
[16 — Controls & Accessibility](16-controls-accessibility.md) §4), a
full first-night Survival playthrough on Normal difficulty end-to-end,
and a cross-browser pass (Chrome, Firefox, Safari — WebGL2 support and
IndexedDB quota behavior have historically had real browser-specific
quirks worth checking explicitly rather than assuming parity).

## 6. What's explicitly not tested

Consistent with [00 — Vision & Scope](00-vision-and-scope.md) §4, there
is no multiplayer/netcode test surface, no server/load testing, and no
automated visual-regression/screenshot-diffing suite in the MVP (art
content changes too frequently early on for that to pay off yet) — a
candidate to add once the visual style (chapter 18) has stabilized
post-v1.
