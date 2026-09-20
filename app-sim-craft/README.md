# SimCraft

A single-player, web-based voxel world-building game — build, mine, automate,
and explore a procedurally generated 3D world entirely in the browser, with
no server, no account, and no backend. Inspired by the voxel sandbox genre
(Minecraft chief among them) but original in art, naming, and lore
throughout, so it stands as its own IP rather than a clone.

**Status:** A playable prototype is implemented in [`client/`](client/) —
procedural terrain with biomes, a dragon hill, a castle, a village, a lake and a
loop road with cars; creatures, fish, sharks and whales; mounts (animals, cars,
dragons); break/place/torch/flag building; day/night; saves with named worlds;
optional cloud sync via [`sync-server/`](sync-server/); and touch controls. The
spec below is the design target it is built toward, not a description of what
exists — for what the code actually does and how it is organised, read
[`ARCHITECTURE.md`](ARCHITECTURE.md).

```bash
cd client
npm ci
npm run dev      # http://localhost:5173
npm test         # unit tests + the architecture (layering) test
npm run build
```

## Why this exists

Voxel sandbox building games are one of the richest genres to spec out:
world generation, chunk-based rendering at 60fps in a browser, an inventory
and crafting economy, a signal/logic automation layer, mob AI, physics for
fluids and falling blocks, and a full save/load persistence model — all of
it has to work with just a browser tab, a GPU via WebGL, and local storage.
This spec treats that as a real engineering project: every system gets a
chapter, every chapter gets concrete data (block tables, recipe tables,
biome tables, save-file schemas), not just prose description.

## How to use this spec

Read [`spec/26-genre-analysis.md`](spec/26-genre-analysis.md) first if
you want the "why" — it's a mechanic-by-mechanic breakdown of what makes
the voxel-sandbox genre (Minecraft chief among them) actually work, and
an explicit mapping from each finding to a SimCraft design decision.
Read [`spec/00-vision-and-scope.md`](spec/00-vision-and-scope.md) first
if you want the "what" — it states the five pillars everything else is
judged against, and states plainly what SimCraft is *not* trying to be.
From there, the chapters are mostly independent references; jump to
whichever system you're implementing or asking an AI assistant to
implement. [`spec/23-data-schema-reference.md`](spec/23-data-schema-reference.md)
is the data appendix (every TypeScript interface and ID table in one
place), [`spec/24-glossary.md`](spec/24-glossary.md) cross-references
every original term back to its genre-baseline equivalent, and
[`spec/25-worked-examples.md`](spec/25-worked-examples.md) walks through
several scenarios end-to-end to show how chapters compose in practice —
all three are useful single files to paste into a prompt alongside
whichever narrative chapter you're working from.

## Spec chapters

| # | Chapter | Covers |
|---|---|---|
| 00 | [Vision & Scope](spec/00-vision-and-scope.md) | Pillars, target player, what's explicitly out of scope, originality/IP stance |
| 01 | [Tech Stack & Architecture](spec/01-tech-stack-architecture.md) | Full stack decision + rationale, folder layout, engine loop, worker/WASM architecture |
| 02 | [World Generation](spec/02-world-generation.md) | Chunking, noise layers, biomes, caves, ores, structures, world types, seeds |
| 03 | [Blocks & Materials](spec/03-blocks-materials.md) | Full block catalog and per-block property tables |
| 04 | [Items, Inventory & Crafting](spec/04-items-inventory-crafting.md) | Inventory model, tool/armor tiers, crafting & smelting, recipe tables |
| 05 | [Player Mechanics](spec/05-player-mechanics.md) | Movement, camera, health/hunger/stamina, interaction |
| 06 | [Building Tools](spec/06-building-tools.md) | Creative toolkit, region select/copy/paste, blueprints, symmetry, undo history |
| 07 | [Survival Systems](spec/07-survival-systems.md) | Day/night, weather, hunger, status effects, sleep, difficulty |
| 08 | [Mobs & Creatures](spec/08-mobs-creatures.md) | Creature catalog, AI states, spawning, taming/breeding |
| 09 | [Logic & Automation](spec/09-redstone-automation.md) | Signal wiring, logic gates, pistons, rail/elevator mechanisms |
| 10 | [Lighting & Rendering](spec/10-lighting-rendering.md) | Light propagation, greedy meshing, LOD, shaders |
| 11 | [Physics & Fluids](spec/11-physics-fluids.md) | Fluid flow simulation, gravity blocks, tick scheduling |
| 12 | [UI/UX](spec/12-ui-ux.md) | Every screen: menus, HUD, inventory, debug overlay, console |
| 13 | [Audio](spec/13-audio.md) | Sound categories, ambient/music system, spatialization |
| 14 | [Persistence & Saves](spec/14-persistence-saves.md) | Save format, IndexedDB schema, autosave, import/export, versioning |
| 15 | [Performance](spec/15-performance.md) | Budgets, chunk streaming, worker pool, WASM roadmap |
| 16 | [Controls & Accessibility](spec/16-controls-accessibility.md) | Keybindings, touch/gamepad, accessibility features |
| 17 | [Game Modes & Progression](spec/17-game-modes-progression.md) | Creative/Survival/Adventure/Spectator, achievements, stats |
| 18 | [Visual & Art Direction](spec/18-visual-art-direction.md) | Art style, palette, resource pack system |
| 19 | [Modding & Scripting API](spec/19-modding-api.md) | Sandboxed plugin API, custom content format |
| 20 | [Testing & QA](spec/20-testing-qa.md) | Unit/e2e strategy, manual QA checklists |
| 21 | [Deployment & DevOps](spec/21-deployment-devops.md) | Static build, GitHub Pages fit, PWA/offline, browser matrix |
| 22 | [Roadmap & Milestones](spec/22-roadmap-milestones.md) | Phased build order, MVP → v1 → v2 → stretch |
| 23 | [Data Schema Reference](spec/23-data-schema-reference.md) | Every TypeScript interface and ID table, consolidated |
| 24 | [Glossary](spec/24-glossary.md) | Every original term cross-referenced to its genre-baseline equivalent and source chapter |
| 25 | [Worked Examples](spec/25-worked-examples.md) | End-to-end scenarios showing systems from multiple chapters composing together |
| 26 | [Genre Analysis](spec/26-genre-analysis.md) | What makes the voxel-sandbox genre work, mechanic by mechanic, and how each finding maps to a SimCraft design decision |
| 27 | [Risks & Open Questions](spec/27-risks-and-open-questions.md) | Known technical risks, unresolved design tensions, and scope risks, stated explicitly rather than hidden |

## Tech stack (short version)

React 19 + TypeScript + Vite for the shell and UI, Three.js (WebGL2) for
rendering with a hand-rolled greedy-meshed voxel chunk pipeline, Web
Workers for chunk generation/meshing off the main thread (with a Rust/WASM
upgrade path for the hot paths once profiling calls for it), Zustand for
app state, IndexedDB for world saves, and zero backend — fully static,
deployable the same way [`app-storyden`](../app-storyden/README.md) is.
Full rationale in [`spec/01-tech-stack-architecture.md`](spec/01-tech-stack-architecture.md).

## Note on originality

SimCraft borrows the *genre* (voxel building/survival sandbox) but not the
IP. No Minecraft trademarks, textures, sounds, block names, mob names, or
copyrighted assets are to be used anywhere in implementation — every block,
creature, and mechanic in this spec has been given its own name and, where
it matters, its own twist on the mechanic. See
[`spec/00-vision-and-scope.md`](spec/00-vision-and-scope.md#originality--ip-stance)
for the full stance.
