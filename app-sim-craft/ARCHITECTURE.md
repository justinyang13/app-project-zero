# SimCraft — architecture

How the code in `client/src` is organised and the rules that keep it that way.
The design *intent* lives in [`spec/`](spec/) (start at
[`spec/01-tech-stack-architecture.md`](spec/01-tech-stack-architecture.md));
this document is what the code actually does. The dependency rules below are
enforced by `client/src/architecture.test.ts` — a forbidden import fails the
test suite.

## Layers

Each folder under `client/src` is a layer and may only import from the layers
listed next to it. Files directly in `src/` (`main.tsx`, `App.tsx`) are the
composition root and may import anything.

| Layer | What it is | May import |
|---|---|---|
| `data/` | Static game data: the block catalog, texture definitions | — |
| `platform/` | Browser/environment facts (touch detection) | — |
| `core/` | The world's data model and pure logic: `Chunk`, `World`, chunk maths, lighting, world queries (`findSurfaceY`), control-input types, save-shaped domain types (`PlayerSnapshot`), `MountHint`, world-name slugs | data |
| `worldgen/` | Pure, deterministic terrain/structure generation — a function of `(seed, coordinate)`, never `Math.random` | core, data |
| `rendering/` | Three.js helpers that aren't a scene by themselves: greedy meshing, mesh layers + `ChunkRenderer`, materials, `LightPool`, `disposeObject3D` | core, data |
| `workers/` | Web Worker entry points for terrain generation and meshing, plus the pooled-worker wrapper | core, data, rendering, worldgen |
| `map/` | The minimap and full-screen map (rendering, marker collection, the map worker) | core, data, worldgen, workers |
| `entities/` | Simulated creatures — `Entity`, `Rideable`, `EntityGroup`, `Population` + spawn rules; `Creature`, `Fish`, `Car`, `Dragon` | core, data, rendering, worldgen |
| `persistence/` | IndexedDB: `WorldRepository` (the only code that knows the on-disk layout), `SaveManager` (live session, save triggers), export/import, active-world selection | core, data, worldgen |
| `sync/` | HTTP client for the optional cloud-save server | persistence |
| `input/` | Keyboard/mouse/touch → per-step input and `GameActions`; hotkey table | core, data, state |
| `state/` | Zustand stores — the *UI-facing* projection of the game (never the source of truth) | core, data, platform |
| `engine/` | The running game: `GameLoop` (composition root + heartbeat), `PlayerController`, `CameraRig`, `RenderView`, `BuildTools`, `ChunkManager`, `HudPublisher`, sky/props | core, data, entities, input, map, persistence, rendering, state, workers, worldgen |
| `session/` | What the UI is allowed to do to the game: the `GameCommands` port and the world-switch / cloud-sync flows | core, map, persistence, sync |
| `hooks/` | React hooks over non-React modules | platform |
| `ui/` | React components. Talks to the game only through `session/` and reads only `state/` | core, data, hooks, input, map, platform, session, state |

Dependencies point downward: `ui → session → engine → entities → core → data`.
`ui/` never imports `engine/` — `GameLoop` satisfies `GameCommands`
structurally and `App.tsx` registers it with `setActiveGame`.

## The frame

`GameLoop.frame` (one `requestAnimationFrame`) runs, in order:

1. **Fixed sim steps** at 20 Hz (`SIM_DT`, up to 5 catch-up steps): arrow-key pan,
   `PlayerController.simStep` (on-foot physics), then `creatures`, `fish` and
   `cars` `updateAll`.
2. **Per-frame movement** — variable `dt`: `PlayerController.frameStep` (a mount's
   `tickRide`, which keeps the player's position glued to it) and the dragons.
3. Camera (`CameraRig`), player model / held item, sky, clouds, props, lights
   (`LightPool.update` re-aims the few real lights at the nearest logical ones).
4. Minimap, chunk streaming (`ChunkManager.update`), populations
   (`Population.update` spawns/despawns), the E-key hint, `BuildTools.update`
   (crosshair target + hold-to-repeat), render, then the throttled HUD snapshot.

Everything React sees goes through `HudPublisher` into `state/` stores — React
never reads the world, and the game never reads React state (it reads a few
UI-owned settings such as the selected hotbar slot and graphics preset).

## The player

`PlayerController` is a small state machine: `onFoot`, `RidingMode(mount)`,
`TeleportingMode`. Each mode says what happens on the sim step and on the frame;
mounting, dismounting and teleporting are the only transitions. Cars, animals,
sea creatures and dragons are all `Rideable`, so there is one mount path.

## Terrain

`ChunkManager` streams columns of chunks around the player through two worker
pools (generation, meshing). A `MeshJob` per chunk guards against stale results:
a mesh that lands after its chunk was evicted is dropped, and an edit made while a
mesh is in flight triggers a follow-up pass. `ChunkRenderer` turns a
`MeshedChunk` into one `THREE.Mesh` per non-empty entry of `MESH_LAYERS`.

## Persistence

Edits are saved as sparse diffs on top of the deterministic terrain.
`SaveManager` holds the live diffs and decides *when* to write (autosave, page
hide/unload, chunk eviction, and on demand); `WorldRepository` decides *how*.
The game registers a snapshot provider (`trackPlayerState`) instead of owning
save triggers itself. `worldExport` builds the cloud-sync blob from the stored
record types, so a field added to a record travels automatically.

## How to…

- **Add a creature or fish species** — add it to the species union and `SPECIES`
  table in `entities/Creature.ts` / `Fish.ts` (the compiler flags a missing entry);
  for fish also list it in `ALL_FISH_SPECIES`.
- **Add a new kind of entity** — implement `Entity` (and `Rideable` if it can be
  ridden); give `GameLoop` an `EntityGroup` and a `Population` with rules in
  `entities/populations.ts`; call `updateAll` from the fixed step or the frame
  depending on how it should tick; dispose the group in `GameLoop.dispose`.
- **Add a hotkey** — one line in `ON_PRESS` in `input/InputManager.ts`. If it must
  act on the game, add a method to `GameActions` and implement it on `GameLoop`.
- **Let the UI do something to the game** — add it to `GameCommands`
  (`session/activeGame.ts`) and implement it on `GameLoop`; never import `engine/` from `ui/`.
- **Add a render layer** — add its typed arrays to `MeshedChunk` in
  `rendering/greedyMesh.ts` and one entry to `MESH_LAYERS` in `rendering/meshLayers.ts`.
  The worker transfer list and `ChunkRenderer` follow automatically.
- **Add something the player places and that persists** — a record type and a
  `PlayerSnapshot` field in `core/playerState.ts`, an optional column in
  `PlayerStateRecord` (`persistence/db.ts`), the mapping in
  `WorldRepository.loadPlayerSnapshot`, and a `PlacedSet` in `GameLoop`.
- **Change a layer rule** — edit `ALLOWED` in `client/src/architecture.test.ts` and
  the table above, on purpose.

## Known trade-offs

- `engine/` still reads a few UI stores (hotbar mode/slot, minimap range, time of
  day, graphics settings) and `ChunkManager` talks to `SaveManager` directly.
  Turning those into injected interfaces would let the engine run headless.
- The simulation uses `Math.random` (spawning, wandering) — worldgen never does, but
  entity behaviour isn't seedable or replayable.
- Player position is not interpolated between 20 Hz sim steps (the spec allows
  reading the latest tick).
- UI components style themselves inline; shared pieces live in `ui/styles.ts` and
  `ui/touchLayout.ts`, but there is no design-token system.
- `client/src/core/slug.ts` and `sync-server/src/slug.ts` duplicate the map-name
  rule (separate npm packages); `core/slug.contract.test.ts` fails if they drift.
