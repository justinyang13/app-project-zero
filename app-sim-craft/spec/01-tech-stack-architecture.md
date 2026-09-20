# 01 — Tech Stack & Architecture

## 1. Stack decision

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict mode) | Matches every other app in this monorepo; catches the class of bugs (wrong block ID, mismatched schema field) that are otherwise brutal to debug in a voxel engine. |
| UI shell | React 19 | Consistent with `app-project-zero-hub` and `app-storyden`; used only for chrome (menus, HUD, inventory) — never for per-frame game state, see §3. |
| Build tool | Vite | Fast dev server, first-class Web Worker and WASM asset handling, matches the rest of the monorepo. |
| 3D rendering | Three.js (WebGL2 renderer) | Mature, well-documented, huge ecosystem, avoids hand-rolling a WebGL abstraction layer. SimCraft does **not** use Three.js's own mesh/geometry helpers for voxel terrain (see §4) — it uses Three.js as a scene graph, camera, renderer, and material/shader host, and feeds it custom-built `BufferGeometry` per chunk. |
| Voxel meshing | Hand-rolled greedy meshing (TypeScript, with a WASM upgrade path) | The single biggest performance lever in a voxel engine. See [10 — Lighting & Rendering](10-lighting-rendering.md) §3 for the algorithm. |
| Off-main-thread work | Web Workers (native, via Vite's `?worker` imports) + Comlink for ergonomic RPC | Chunk generation and meshing must never block the render thread — see §5. |
| Optional native-speed path | Rust compiled to WASM via `wasm-pack`, for noise generation and meshing inner loops | Deferred to post-MVP; see §6. Nothing in the MVP architecture requires it, but the worker boundary is designed so it can be dropped in without touching call sites. |
| App/UI state | Zustand | Minimal boilerplate, no context-provider tree, plays well with a game loop that reads/writes state outside of React's render cycle. |
| Simulation/game state | A custom in-memory `World` object (plain TS classes, not React state) | Chunk data, entities, and physics tick at up to 60Hz; routing that through React state would be both slow and semantically wrong. React only *observes* a small, throttled slice of it (see §3). |
| Persistence | IndexedDB via the `idb` library | Only browser storage with the capacity (world saves run tens of MB) and structured-clone support voxel data needs; see [14 — Persistence & Saves](14-persistence-saves.md). |
| Audio | Howler.js | Simple spatial/positional audio API over Web Audio, handles sprite-based SFX well; see [13 — Audio](13-audio.md). |
| Noise generation | `simplex-noise` (npm) for MVP, replaceable by a WASM noise kernel later | OpenSimplex/Simplex noise is the standard terrain-generation primitive; see [02 — World Generation](02-world-generation.md). |
| Testing | Vitest (unit/integration) + Playwright (e2e smoke) | Matches the rest of the monorepo's testing stack; see [20 — Testing & QA](20-testing-qa.md). |
| Lint | oxlint | Matches the rest of the monorepo. |
| Deployment | Static build → GitHub Pages, same pipeline as `app-storyden` | No backend at all — see [21 — Deployment & DevOps](21-deployment-devops.md). |
| Offline support | Vite PWA plugin (`vite-plugin-pwa`) + Service Worker | A build-once, play-forever game with no server shouldn't require a network connection after first load. |

### Explicitly not used, and why

- **A general-purpose game engine (Babylon.js, PlayCanvas, Unity WebGL
  export, Godot HTML5 export).** SimCraft's rendering needs are narrow and
  specific (voxel chunk meshes, a handful of shaders) — a general engine's
  scene-graph and asset-pipeline overhead buys nothing here and costs
  bundle size and control. Three.js used as a thin rendering layer is the
  right altitude.
- **A full ECS framework (bitECS, etc.).** Entity count in a single-player
  world is modest (player, a few dozen creatures, a handful of dropped
  items/projectiles at once). A plain class hierarchy with a simple
  `update(dt)` loop is easier to reason about at this scale; revisit only
  if profiling shows entity update, not rendering or chunk work, as the
  bottleneck.
- **Redux / Redux Toolkit.** Zustand covers the UI-state need with far
  less ceremony, and this monorepo has no existing Redux convention to
  match.
- **A relational or document database running in the browser (e.g.
  sql.js).** IndexedDB's native object store is a better fit for
  chunk-keyed binary blobs than shoehorning SQL onto voxel data.
- **Server-side anything.** Per [00 — Vision & Scope](00-vision-and-scope.md),
  no backend exists. If cloud save is ever added, it's an *additive*
  optional layer on top of the existing local-first save system, not a
  replacement for it.

## 2. High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser tab                                                      │
│                                                                    │
│  ┌───────────────┐        ┌────────────────────────────────┐    │
│  │  React shell   │◄──────►│  Zustand stores (UI-facing)     │    │
│  │  (menus, HUD,  │  read/  │  - inventoryStore                │    │
│  │  inventory,    │  write  │  - hudStore (health/hunger/etc.) │    │
│  │  settings)     │        │  - settingsStore                 │    │
│  └───────────────┘        └────────────────────────────────┘    │
│         ▲                              ▲                          │
│         │ subscribes (throttled)       │ pushed by                │
│         │                              │                          │
│  ┌──────┴──────────────────────────────┴────────────────────┐    │
│  │  GameLoop (main thread, requestAnimationFrame)             │    │
│  │  - input handling                                          │    │
│  │  - fixed-timestep simulation tick (physics, ticks, AI)      │    │
│  │  - Three.js render (variable timestep, interpolated)        │    │
│  │  - World: chunk map, entity list, player state               │    │
│  └──────┬───────────────────────────────────────────┬─────────┘    │
│         │ postMessage (chunk requests)               │ chunk meshes │
│         ▼                                             │             │
│  ┌────────────────────┐                    ┌─────────┴─────────┐   │
│  │ Worker pool          │                    │ Three.js scene    │   │
│  │  - terrain-gen.worker │───mesh data──────►│  (chunk meshes,   │   │
│  │  - mesh.worker        │   (transferable    │  entities, sky,   │   │
│  │  (N workers, pooled)  │    ArrayBuffers)    │  water, particles)│   │
│  └────────────────────┘                    └───────────────────┘   │
│         │                                                            │
│         ▼                                                            │
│  ┌────────────────────┐                                              │
│  │ IndexedDB            │  world saves, settings, blueprints          │
│  └────────────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
```

Two loops run concurrently:

1. **The React render tree** — mounted once, re-renders only on UI-state
   changes (opening inventory, a health bar tick, a settings toggle). It
   never re-renders on a per-frame basis.
2. **The game loop** — a single `requestAnimationFrame`-driven loop owned
   outside of React (instantiated in a top-level effect, torn down on
   unmount), which owns the Three.js renderer, the `World` simulation
   state, and pushes throttled snapshots into Zustand stores (health,
   hunger, selected hotbar slot, FPS counter) for the HUD to read.

## 3. Why game state lives outside React

This is the single most important architectural rule in the project, and
worth stating explicitly so it isn't accidentally violated later: **voxel,
entity, and physics state is never stored in React state or Zustand in
its primary form.** It lives in plain TypeScript classes (`World`, `Chunk`,
`Entity`) that the game loop mutates directly, frame by frame. React only
ever sees a *read-only, throttled projection* of that state pushed
one-way into a Zustand store (e.g. `hudStore.setHealth(player.health)`,
called at most once per simulation tick, not once per render frame).

Reasoning: a chunk holds up to 65,536 voxels (see §4); mutating that
through React's reconciler, or even through Zustand's default subscribe-
everything model, would be both needlessly slow and semantically wrong —
this data doesn't need diffing or component re-rendering, it needs direct
mutation and a custom dirty-flag system that feeds the mesher.

## 4. World data model

- **Coordinate system:** right-handed, Y-up, matching Three.js's default.
  1 world unit = 1 block.
- **Chunk size:** 32×32×32 blocks (32,768 voxels/chunk). Chosen as a
  middle ground: large enough that the chunk *count* in view stays
  manageable (fewer draw calls, fewer worker round-trips), small enough
  that a single edit doesn't force re-meshing a huge volume, and a clean
  power of 2 for fast bit-shift indexing (`x | y << 5 | z << 10`).
- **World height:** 256 blocks (Y 0–255), matching the genre convention
  players already have intuition for; chunks stack 8 high per column
  (32 × 8 = 256).
- **Chunk storage:** each chunk holds a flat `Uint16Array(32*32*32)` of
  block-type IDs (see [23 — Data Schema Reference](23-data-schema-reference.md)
  for the full `Chunk` interface), plus two parallel `Uint8Array`s for
  block-light and sky-light levels (0–15 each, see
  [10 — Lighting & Rendering](10-lighting-rendering.md) §1). A `Uint16Array`
  budgets up to 65,536 distinct block IDs — comfortably above the ~400
  block types in [03 — Blocks & Materials](03-blocks-materials.md), room to
  grow.
- **Chunk map:** the loaded world is a `Map<string, Chunk>` keyed by
  `"cx,cy,cz"` chunk coordinates. Only chunks within render distance (see
  [15 — Performance](15-performance.md)) are resident in memory; chunks
  that scroll out of range are serialized and evicted, re-generated or
  re-loaded from IndexedDB on return.
- **Entities:** a flat array on `World`, each a plain class instance
  (`Player`, `Creature`, `DroppedItem`, `Projectile`) with a common
  `update(dt, world)` method. No spatial partitioning beyond "which chunk
  column is this entity in," which is sufficient at single-player entity
  counts (see [15 — Performance](15-performance.md) for the ceiling this
  assumption is valid up to).

## 5. Worker architecture

Two dedicated worker roles, pooled:

- **`terrain-gen.worker.ts`** — given a chunk coordinate and the world
  seed, runs the full noise-based generation pipeline (see
  [02 — World Generation](02-world-generation.md)) and returns a filled
  `Uint16Array` of block IDs via a transferable `ArrayBuffer` (zero-copy
  back to the main thread).
- **`mesh.worker.ts`** — given a chunk's block data plus its 6 face-
  adjacent neighbor chunks' edge data (needed so faces at chunk borders
  cull correctly), runs greedy meshing (see
  [10 — Lighting & Rendering](10-lighting-rendering.md) §3) and returns
  vertex/index/UV typed arrays, again as transferables, which the main
  thread hands straight to a Three.js `BufferGeometry`.

A small pool (default: `navigator.hardwareConcurrency - 1`, clamped to
2–6) of each worker type is spun up once at game start and reused for the
session — not spawned per-chunk, which would thrash. Work is queued and
dispatched via Comlink-wrapped `postMessage`, prioritized by distance from
the player (nearest chunks first, so the visible horizon fills in before
far chunks).

Why generation and meshing are separate worker roles rather than one
"chunk worker": a block edit (placing/breaking one block) needs re-meshing
but never needs re-generation, and re-meshing is the far more frequent
operation during active building — keeping them separate means an edit's
re-mesh request doesn't queue behind unrelated generation work for chunks
scrolling into view at the world's edge.

## 6. WASM upgrade path (post-MVP)

The MVP ships with terrain generation and meshing in TypeScript, run in
workers as described above. This is expected to be fast enough for the
target hardware (see [15 — Performance](15-performance.md) for budgets),
*if* the algorithms are written carefully (typed arrays throughout, no
per-voxel object allocation, no closures in hot loops). If profiling after
MVP shows generation or meshing as the bottleneck on target hardware, the
upgrade path is:

1. Port the noise kernel and/or the greedy-meshing inner loop to Rust,
   compiled via `wasm-pack` to a `.wasm` module.
2. Load it inside the *same* worker files from §5 — the worker's public
   message-passing contract (chunk coord in, typed arrays out) doesn't
   change, so nothing upstream of the worker boundary needs to change.
3. Ship both paths behind a feature check initially (WASM if
   `WebAssembly` + SIMD proposal supported, JS fallback otherwise), then
   drop the JS path once WASM has been stable in production for a while.

This is deliberately deferred rather than done up front: it adds real
build-pipeline complexity (a Rust toolchain, `wasm-pack` in CI), and
premature optimization here would slow down shipping the MVP for a
performance win that may not even be necessary on target hardware.

## 7. Folder structure

> The tree below is the layout this chapter *proposed*. The implemented layout has
> diverged (`core/`, `entities/`, `session/`, `input/`, …) — see
> [`ARCHITECTURE.md`](../ARCHITECTURE.md) for what the code does today.

```
app-sim-craft/
  spec/                        # this specification (pre-implementation)
  client/                      # implementation, once it starts
    src/
      engine/
        World.ts                # chunk map, entity list, world-level state
        Chunk.ts                 # per-chunk block/light data + dirty flags
        GameLoop.ts               # rAF loop, fixed-timestep sim tick
        Camera.ts
        Raycaster.ts              # block-targeting for place/break
        physics/
          AABB.ts
          FluidSim.ts
          BlockUpdateScheduler.ts # tick queue for gravity blocks, crops, fluids
        worldgen/
          noise.ts
          biomes.ts
          caves.ts
          structures.ts
        entities/
          Player.ts
          Creature.ts
          DroppedItem.ts
        logic/                     # signal/automation system, see chapter 09
          SignalGraph.ts
          components/
      workers/
        terrain-gen.worker.ts
        mesh.worker.ts
      rendering/
        ChunkMesher.ts             # greedy meshing (calls into worker)
        materials/                 # shaders: terrain, water, sky, particles
        SceneManager.ts
      data/                        # static game data, generated from spec tables
        blocks.ts
        items.ts
        recipes.ts
        biomes.ts
        creatures.ts
      state/                       # Zustand stores (UI-facing only)
        hudStore.ts
        inventoryStore.ts
        settingsStore.ts
      persistence/
        db.ts                      # IndexedDB (idb) setup
        SaveManager.ts
        WorldSerializer.ts
      ui/                          # React components: menus, HUD, inventory
      audio/
      main.tsx
    public/
      textures/
      sounds/
    package.json
    vite.config.ts
  README.md
```

This mirrors the structure other apps in the monorepo use (`client/` as
the app root, `src/` organized by concern), while adding the
engine/workers/rendering/data separation a voxel game specifically needs.

## 8. Fixed-timestep simulation, variable-rate rendering

The game loop separates simulation from rendering, standard practice for
any physics-bearing real-time game:

- **Simulation tick:** fixed at 20Hz (50ms/tick) — matches the genre
  convention for "game tick" rate, and is the rate at which block ticks
  (crop growth, fluid flow, redstone-equivalent signal propagation,
  furnace-equivalent smelting progress) advance. Player and creature
  physics also integrate on this fixed step for determinism.
- **Render rate:** uncapped, driven by `requestAnimationFrame` (typically
  60Hz, higher on high-refresh displays). Between simulation ticks, entity
  positions are interpolated (or the render step simply reads the latest
  tick's authoritative position — extrapolation is not used, to avoid
  visible correction snapping) so movement looks smooth even though
  physics only advances 20 times/second.
- Input (mouse look, movement keys) is sampled every render frame for
  responsiveness (camera rotation is not tied to the 20Hz tick), but
  movement *forces* are applied on the fixed tick.

## 9. Determinism

World generation must be a pure function of `(seed, chunk coordinate)` —
no global mutable state, no `Date.now()`, no `Math.random()` anywhere in
`worldgen/`. This matters for two concrete reasons: it lets a chunk be
regenerated identically if evicted and reloaded without needing to persist
every unmodified block (only *edited* blocks need to be saved as a diff —
see [14 — Persistence & Saves](14-persistence-saves.md) §2), and it makes
the terrain generator unit-testable (same seed + coordinate in, byte-
identical chunk out, every time).
