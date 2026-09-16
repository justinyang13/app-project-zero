# 06 — Building Tools

Building is Pillar 1 (see [00](00-vision-and-scope.md) §2). This chapter
specs the full toolkit — available in Creative Mode from the start, and
unlockable piece-by-piece in Survival Mode (see
[17 — Game Modes & Progression](17-game-modes-progression.md) §1) so
Survival players earn the power tools rather than starting with them.

## 1. Baseline building (available in all modes)

- **Place/break** — see [05 — Player Mechanics](05-player-mechanics.md) §4.
- **Block palette (hotbar + inventory quick-pick):** the inventory screen
  supports a "favorite" pin so frequently used blocks surface at the top
  of the block-picker panel; in Creative Mode, an unlimited Creative
  Inventory tab replaces the survival inventory, organized by category
  tabs (Terrain, Wood, Functional, Decorative, Logic, etc.) with a search
  box.
- **Eyedropper tool (pick block):** middle-click (default) on any visible
  block instantly selects the matching item into the hotbar (Creative:
  always available; Survival: only if the player already has that block
  in inventory, otherwise no-op) — this is a core QoL tool present from
  the start in both modes, not gated.
- **Replace-while-placing:** holding a modifier key (default `Alt`) while
  placing on top of an existing block replaces it instead of placing
  adjacent — useful for swapping terrain/decoration blocks without
  breaking first.

## 2. Creative Mode toolkit

Unlocked entirely from world start in Creative Mode; the equivalent
Survival unlocks are listed per-tool below.

### 2.1 Region select & edit (WorldEdit-style, "Mason's Wand")

A dedicated tool item (Mason's Wand) that:

- Left-click sets point A, right-click sets point B, drawing a live
  wireframe box between them (rendered as an outline overlay, updates
  every frame while held).
- Opens a radial/panel toolbar (see [12](12-ui-ux.md) §6) with operations
  applied to the selected region:
  - **Fill** — fills the selection with the currently held block.
  - **Replace** — replaces only a chosen source block type within the
    selection with the held block (supports "replace air" for a clear/
    hollow-out mode, and "replace any non-air" for a resurface mode).
  - **Hollow** — fills only the outer shell of the selection, leaving the
    interior air (useful for quickly making a building shell).
  - **Outline** — fills only the 12 edges of the box.
  - **Clear** — sets the entire selection to air.
  - **Copy** — captures the selection's blocks (relative to point A) into
    a clipboard buffer, held in memory for the session.
  - **Cut** — Copy + Clear in one action.
  - **Paste** — stamps the clipboard at a targeted location, with a live
    ghost preview (same rendering approach as Blueprint Ghosting, see
    [05](05-player-mechanics.md) §7) before confirming, rotatable in 90°
    steps and flippable on each axis.
  - **Move** — shifts the selection's contents by N blocks in a chosen
    direction, filling the vacated space with a chosen block (default
    air).
- **Undo/redo history:** every Mason's Wand operation (and every manual
  place/break, batched per short time-window) pushes an entry onto a
  per-session undo stack (capped at 200 entries, older entries dropped),
  restorable via `Ctrl+Z` / `Ctrl+Y`. History does not persist across a
  save/reload — it's a working-session convenience, not part of the save
  file.
- **Survival unlock:** the Mason's Wand and its region-select operations
  are Creative-only. Survival players get manual placement only, plus the
  narrower Blueprint system below, keeping Survival's pacing intact.

### 2.2 Symmetry / mirror building

A toggleable per-axis mirror mode (X, Z, or both, plus a diagonal option)
centered on a player-set anchor point: every manual block placement (not
just Mason's Wand operations) is automatically mirrored across the active
plane(s) in real time. Available in both Creative and Survival (Survival
consumes materials for every mirrored placement too — it's a precision
aid, not a duplication exploit).

### 2.3 Terrain sculpting brush

A separate tool (Terra Brush, Creative-only) for organic terrain editing
rather than block-grid precision work: a spherical or cylindrical brush
of configurable radius (1–8 blocks) that raises, lowers, smooths
(averages density toward neighbors), or paints (replaces surface-layer
blocks only, e.g. reskinning a hillside from Loam to Sand) terrain with a
soft falloff at the brush edge, useful for reshaping generated terrain
without a fully manual per-block process.

### 2.4 Blueprints (Schematics) — available in both modes

- **Saving:** any Mason's Wand selection (Creative) — or, in Survival, a
  smaller hand-placed "Frame Marker" pair of blocks defining a region up
  to 16×16×16 — can be saved as a **Blueprint**: a named, thumbnail-
  rendered structure stored in the player's local Blueprint library
  (persisted in IndexedDB, see [14](14-persistence-saves.md) §4).
- **Format:** a Blueprint is a compact relative-coordinate block list
  (`{dx, dy, dz, blockId}[]`, run-length-encoded for large flat regions)
  — see [23](23-data-schema-reference.md) §5 for the exact schema. This
  is the same format the world-generation structure stamper
  ([02](02-world-generation.md) §6) uses internally, so hand-built player
  creations and hand-authored world structures share one file format and
  one placement code path.
- **Placing:** via a Blueprint Scroll item bound to a chosen Blueprint —
  see the Blueprint Ghosting mechanic in
  [05 — Player Mechanics](05-player-mechanics.md) §7. In Survival, missing
  materials block full placement (partial-fill behavior as described
  there); in Creative, placement is immediate and free.
- **Export/import:** a Blueprint can be exported as a downloadable `.json`
  file from the Blueprint Library screen (see [12](12-ui-ux.md) §9) and
  re-imported into another world/save — the one supported way to move a
  player creation between worlds or (informally) share it with someone
  else, consistent with the no-backend, fully local architecture (see
  [00](00-vision-and-scope.md) §4).

### 2.5 Structure Block (Creative-only precision variant)

A placeable block (not a held tool) offering the same Save/Load
functionality as the Blueprint system but with typed corner coordinates
instead of a wand-drawn box — useful for precisely repeatable structure
authoring, e.g. building world-generation structures for
[02](02-world-generation.md) §6 content or precision-testing a redstone-
equivalent contraption's exact footprint before saving it as a Blueprint.

## 3. Color & material tools

- **Dye Brush:** applies a dye color to any dyeable block (Wool, Carpet,
  Terracotta, Cast Block, Candle, Glass) directly in-world without
  needing to break/re-place — right-click with a dye item selected while
  aiming at a compatible block.
- **Material palette swap (Creative-only):** select a placed structure
  region with the Mason's Wand, then choose "Swap Material Family" to
  re-skin every block in the selection from one family to an equivalent
  block in another family of the same shape-set (e.g. every Greenwood
  Plank/Slab/Stair/Fence in a selection becomes the Duskpine equivalent)
  — a high-leverage iteration tool for players who build a structure, then
  want to try it in a different wood/stone without manually swapping
  every block.

## 4. Camera & documentation tools

- **Photo Mode (original to SimCraft):** a free-fly, player-decoupled
  camera (accessible from the pause menu or a dedicated key) for
  composing and capturing screenshots of builds, with depth-of-field,
  time-of-day override, and hiding-HUD toggles — purely cosmetic,
  available in both modes, does not affect world state.
- **Minimap / Full Map (see [12](12-ui-ux.md) §8):** while not a building
  tool per se, the Cartography Table's generated Map item is commonly
  used alongside building tools to plan large builds relative to
  explored terrain.

## 5. Building-adjacent QoL

- **Block rotation preview:** placeable directional blocks (stairs,
  logs, fences, rails, doors) show a live rotation/orientation preview
  attached to the crosshair before placing, matching the face/angle the
  player is aiming from (standard, expected behavior — called out
  explicitly here since it's load-bearing for fast building).
- **Snap-to-grid always on:** there is no "free placement" off the voxel
  grid — this is a deliberate simplicity choice (see
  [00](00-vision-and-scope.md) §1) that keeps building predictable and
  keeps the meshing/collision model simple; sub-block decoration (Slabs,
  Stairs, Carpets) is how finer visual granularity is achieved instead of
  arbitrary free placement.
