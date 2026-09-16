# 22 — Roadmap & Milestones

A phased build order, sequencing the chapters above into shippable
increments. Each phase should be independently playable and mergeable —
this is a personal/portfolio project, so momentum and a working build at
every step matters more than a rigid schedule.

## Phase 0 — Engine skeleton (no gameplay yet)

**Goal:** a flat, single-chunk-type world you can fly around in at 60fps.

- Vite + React + TypeScript + Three.js scaffold under `app-sim-craft/client`
  (see [01 — Tech Stack & Architecture](01-tech-stack-architecture.md) §7
  for the folder layout).
- `World`/`Chunk` data model, a single hardcoded flat chunk, naive
  per-voxel-cube meshing (correctness first, greedy meshing comes next
  phase — don't optimize before there's something to optimize).
  Fly-camera with basic WASD + mouse-look.
  Debug overlay (F3) with FPS counter — instrument from day one.
- **Acceptance:** app loads, renders a flat voxel floor, camera flies
  around it, holds 60fps.

## Phase 1 — Core voxel engine

**Goal:** an infinite, generated, mineable world.

- Greedy meshing in a worker (
  [10 — Lighting & Rendering](10-lighting-rendering.md) §3), chunk
  streaming based on player position ([01](01-tech-stack-architecture.md)
  §5, [15 — Performance](15-performance.md) §3).
- Noise-based terrain generation, first 4–5 biomes
  ([02 — World Generation](02-world-generation.md)), basic cave carving.
- Light propagation ([10](10-lighting-rendering.md) §1).
- Block place/break with raycasting ([05 — Player Mechanics](05-player-mechanics.md)
  §4, [03 — Blocks & Materials](03-blocks-materials.md) §4), player
  collision/physics ([05](05-player-mechanics.md) §5).
- IndexedDB save/load for chunk diffs and player position
  ([14 — Persistence & Saves](14-persistence-saves.md) §1–4, minimum
  viable slice).
- **Acceptance:** create a world, walk around generated terrain, mine and
  place blocks, close the tab, reopen, world state persisted correctly.

## Phase 2 — Survival loop MVP

**Goal:** the core gather → craft → build → survive loop, playable start
to finish for one session.

- Full inventory + hotbar UI ([12 — UI/UX](12-ui-ux.md) §3–4).
- Grid crafting + Workbench + Hearth Furnace (
  [04 — Items, Inventory & Crafting](04-items-inventory-crafting.md)
  §4), first 3 tool tiers (Timberwrought/Stoneforged/Bronzecast).
- Health/hunger/day-night cycle (
  [07 — Survival Systems](07-survival-systems.md) §1–3).
- First 3–4 hostile + passive creatures with basic AI (
  [08 — Mobs & Creatures](08-mobs-creatures.md) §2–3, a representative
  slice, not the full catalog yet).
- Basic audio pass (footsteps, block break/place, ambient day/night, one
  music track — [13 — Audio](13-audio.md)).
- **Acceptance:** a new player can punch a tree, craft a Workbench and
  tools, build basic shelter, survive a night, and die/respawn correctly.

## Phase 3 — Building & Creative Mode

**Goal:** Pillar 1 fully realized.

- Creative Mode + unlimited inventory (
  [17 — Game Modes & Progression](17-game-modes-progression.md) §1).
- Mason's Wand region tools, Blueprint save/load/export/import (
  [06 — Building Tools](06-building-tools.md) §2.1, §2.4).
- Full block catalog build-out toward the ~420-block target (
  [03 — Blocks & Materials](03-blocks-materials.md) §3) — slabs, stairs,
  fences, walls, doors, wool/dye family.
- World Select screen with world creation options (Superflat/Amplified/
  Islands — [02 — World Generation](02-world-generation.md) §7).
- **Acceptance:** a player can build a substantial structure quickly
  using region-fill and Blueprints, save it, and reload it in a new
  world via export/import.

## Phase 4 — Automation & depth

**Goal:** Pillar 4 (systems that combine) fully realized.

- Full Sparkwire signal system + Logic Gates (
  [09 — Logic & Automation](09-redstone-automation.md)).
- Full fluid simulation (Water/Lava flow, Water-Lava interactions,
  gravity blocks — [11 — Physics & Fluids](11-physics-fluids.md)).
- Farming (crop growth ticks, breeding — [07](07-survival-systems.md),
  [08](08-mobs-creatures.md) §5).
- Runeforge / Rune system, Insight, Milestones (
  [04](04-items-inventory-crafting.md) §8,
  [17](17-game-modes-progression.md) §2).
- Remaining tool tiers (Ferrite/Lumenforged/Auric-Lumen) and Deep-band
  content (Extended Depth worlds, Deepstone Vault structure,
  Deepstalker/Voidmaw Lurker creatures).
- **Acceptance:** a player can build a working automated farm or door
  contraption from Sparkwire components, and reach end-game gear tiers
  through normal Survival play.

## Phase 5 — Content completion & polish

**Goal:** every biome, structure, and creature from the catalog present;
full accessibility and platform support.

- All 28 biomes, all structures (
  [02 — World Generation](02-world-generation.md) §3, §6).
- Full creature catalog (
  [08 — Mobs & Creatures](08-mobs-creatures.md) §3), taming/breeding for
  all applicable types.
- Full Tonic/Alchemy system ([04](04-items-inventory-crafting.md) §7).
- Weather system ([07](07-survival-systems.md) §4).
- Touch and gamepad control support (
  [16 — Controls & Accessibility](16-controls-accessibility.md) §2–3).
- Full accessibility pass (§4 of the same chapter).
- Full audio pass (complete sound catalog, multiple music tracks —
  [13 — Audio](13-audio.md)).
- PWA/offline support (
  [21 — Deployment & DevOps](21-deployment-devops.md) §4).
- **Acceptance:** the full feature set described in chapters 00–18 is
  present and playable; the manual QA checklist (
  [20 — Testing & QA](20-testing-qa.md) §5) passes.

## Phase 6 — Stretch goals (post-v1, optional)

- WASM upgrade for terrain generation / meshing, if profiling on real
  hardware shows it's warranted (
  [01 — Tech Stack & Architecture](01-tech-stack-architecture.md) §6).
- Modding & scripting API (
  [19 — Modding & Scripting API](19-modding-api.md)) — the whole chapter
  is explicitly a stretch goal, unlocked only after the phases above are
  solid.
- A second first-party resource pack, demonstrating the data-driven
  texture system end-to-end (
  [18 — Visual & Art Direction](18-visual-art-direction.md) §3).
- Localization pass beyond the string-table groundwork (
  [16 — Controls & Accessibility](16-controls-accessibility.md) §5).

## Notes on sequencing

Phases are ordered to keep the project *playable* at every checkpoint —
Phase 1 alone is already a legitimate "walk around a generated voxel
world" demo, Phase 2 alone is already a complete (if content-light)
survival game loop. This matters for a project built incrementally,
possibly with AI-assisted implementation working chapter by chapter:
each phase's acceptance criterion is a concrete, testable "is this
actually done" bar, not a vague feature checklist.
