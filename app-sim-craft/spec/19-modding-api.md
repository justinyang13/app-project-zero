# 19 — Modding & Scripting API (stretch goal)

Per [00 — Vision & Scope](00-vision-and-scope.md) §4, a full modding
marketplace is explicitly out of scope. This chapter specs a much
narrower, sandboxed extension surface that is realistic to ship as a
post-v1 stretch goal without compromising the single-player,
no-backend, security-conscious posture of the rest of the game. Nothing
in the core game (chapters 00–18) depends on this system existing.

## 1. Scope & sandboxing principle

Any user-supplied content (a resource pack, a custom scripted behavior)
runs with the minimum capability needed and never with direct access to:
IndexedDB outside its own namespaced sandbox, the network (`fetch` is
disabled inside the sandbox entirely — no reason a local single-player
mod needs network access, and disabling it removes an entire class of
risk), or the DOM outside of a constrained, purpose-built API surface.
Custom scripts (§3) run inside a Web Worker with no access to
`window`/`document`, communicating only through a narrow, typed message
API — the same worker-boundary pattern already used for terrain
generation and meshing (see
[01 — Tech Stack & Architecture](01-tech-stack-architecture.md) §5),
extended here for untrusted rather than first-party code.

## 2. Resource packs (textures/sounds only, no logic)

- **Format:** a folder (zipped for distribution/import) mirroring the
  built-in asset structure: `textures/blocks/<blockKey>.png`,
  `textures/items/<itemKey>.png`, `sounds/<category>/<soundKey>.ogg`,
  plus a `pack.json` manifest (name, author, description, target
  SimCraft version range).
- **Loading:** imported via the World Select / Settings screen (see
  [12 — UI/UX](12-ui-ux.md) §9), stored in IndexedDB alongside other
  local data, applied by overriding texture-atlas region sources and
  sound-sprite entries at load time — no code execution risk, since a
  resource pack is data (images/audio) only, never script.
- **Validation:** dimension/format checks on import (rejecting anything
  that isn't a valid PNG at an expected size, or audio outside
  expected formats/duration limits) with a clear error rather than
  silently failing or crashing the atlas builder.

## 3. Custom block/item definitions (data-only)

A JSON-defined custom block or item (new `blockId`/`itemId` entries
appended to the runtime tables from
[03 — Blocks & Materials](03-blocks-materials.md) and
[04 — Items, Inventory & Crafting](04-items-inventory-crafting.md),
following the exact schema in
[23 — Data Schema Reference](23-data-schema-reference.md) §1–2) lets a
player add new material variants, decorative blocks, or recipes without
any script execution — pure data, validated against the schema on
import, rejected with a specific error message on any mismatch (unknown
`toolType` enum value, out-of-range `hardness`, etc.).

## 4. Sandboxed scripting API (furthest-out stretch goal)

For genuinely new *behavior* (a custom Sparkwire-compatible logic
component, a scripted creature AI variant, a custom world-generation
decoration rule), a narrow scripting API exposes a small set of
well-defined hook points, each running inside the Worker sandbox from §1
with a hard execution-time budget per call (a call exceeding, e.g., 4ms
is terminated and logged, protecting the simulation tick's overall
budget from
[15 — Performance](15-performance.md) §1 from a single misbehaving
script):

- `onBlockTick(blockPos, blockState, worldReadOnlyView) → BlockUpdate[]`
  — for custom automation components.
- `onCreatureUpdate(creatureState, nearbyReadOnlyView, dt) →
  CreatureAction` — for custom creature AI behavior profiles.
- `onWorldGenDecorate(chunkColumn, biome, heightmap) → BlockPlacement[]`
  — for custom vegetation/decoration rules layered onto existing biomes.

Scripts receive **read-only snapshots** of relevant world state (never a
live mutable reference) and return **declarative action lists** that the
main engine validates and applies — the sandbox never gets direct write
access to chunk memory, entity objects, or the save data, which is what
makes this safe to run untrusted community-authored scripts against a
player's own single-player save without risking corruption or an
exploit reaching outside the sandbox.

## 5. Distribution model

Consistent with SimCraft having no backend (see
[00 — Vision & Scope](00-vision-and-scope.md) §4): there is no in-game
mod marketplace/browser. Packs and scripts are shared the same informal
way Blueprints are (see
[14 — Persistence & Saves](14-persistence-saves.md) §6) — as exported
files a player downloads from wherever they found them and imports
locally. This keeps the system's trust model simple (the player is
always the one choosing to import a specific file) rather than requiring
SimCraft to host, vet, or moderate any third-party content.

## 6. Non-goals for this system

Explicitly not in scope even as a stretch goal: arbitrary DOM/UI
injection by mods, network access from within a mod, mods that can
modify another mod's sandboxed state, and any mechanism that would let
imported content silently auto-update itself after import (every import
is a one-time, explicit, player-initiated action — no background
mod-update-checking, which would require the network access this system
deliberately excludes).
