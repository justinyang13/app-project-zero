# 02 — World Generation

## 1. Overview

The world is infinite (bounded only by IEEE-754 float precision, in
practice ~30 million blocks from spawn in any direction before floating-
point jitter becomes visible — far beyond what a single-player save will
ever reach), generated lazily in 32×32×32 chunks as the player approaches
them, and fully deterministic: a given seed always produces the same
world. Generation is a layered pipeline — each layer reads the output of
the previous one and adds detail — run inside `terrain-gen.worker.ts` (see
[01 — Tech Stack & Architecture](01-tech-stack-architecture.md) §5).

## 2. Generation pipeline

For a given chunk column (x, z at all y):

1. **Climate sampling** — two low-frequency noise fields, *temperature*
   and *moisture*, sampled once per block-column (x, z), each in [-1, 1].
   These two values are what select the biome (§3).
2. **Continentalness & erosion** — two more low-frequency noise fields
   that bias base terrain height and "roughness" respectively, so oceans,
   plains, and mountains emerge as broad regions rather than per-block
   noise.
3. **Base heightmap** — a 2D value per (x, z) combining continentalness,
   erosion, and a higher-frequency detail noise octave, producing the
   surface height (the topmost solid block) for that column.
4. **Density field (3D)** — a 3D simplex noise field, biased by the
   heightmap, determines solid-vs-air per voxel. This (rather than a pure
   heightmap) is what allows overhangs, arches, and floating terrain
   features to exist, not just a smooth height surface.
5. **Surface pass** — replaces the top few blocks of solid terrain per
   biome's surface rule (e.g. grass-top/dirt-below in Meadow biomes, sand
   in Dune biomes — see §3's per-biome surface block table).
6. **Caves & ravines** — subtractive 3D noise (see §4) carves air pockets
   and tunnels out of the solid density field.
7. **Ore & resource placement** — per-ore noise-blob placement within
   valid Y ranges (see §5).
8. **Structures** — deterministically placed, per-chunk-checked landmark
   structures (see §6).
9. **Vegetation & decoration pass** — trees, grass, flowers, mushrooms,
   cacti, etc., placed on valid surface blocks per biome (see §3).
10. **Lighting initialization** — sky-light flood-fill from the top of
    each column downward (see
    [10 — Lighting & Rendering](10-lighting-rendering.md) §1).

Each step operates on typed arrays with no per-voxel allocation, and the
whole pipeline for one chunk is budgeted at under 8ms on target hardware
(see [15 — Performance](15-performance.md)).

## 3. Biomes

Biome selection is a 2D lookup over (temperature, moisture), producing 28
biomes across 6 climate bands. Each biome defines: surface block(s),
sub-surface block, foliage density/type, tree type and density, ambient
particle effects, fog color tint, and which creatures are eligible to
spawn there (cross-referenced in
[08 — Mobs & Creatures](08-mobs-creatures.md) §3).

| Biome | Temp | Moisture | Surface | Sub-surface | Trees/Flora | Notes |
|---|---|---|---|---|---|---|
| Meadow | Temperate | Medium | Loam | Dirt | Oak-analog "Greenwood" trees, wildflowers | Default spawn-eligible biome |
| Sunfield Plains | Temperate | Low-Medium | Loam | Dirt | Sparse trees, tall grass | Rolling hills, occasional flower rings |
| Whisperwood Forest | Temperate | Medium-High | Loam | Dirt | Dense Greenwood + Birchcap trees | Canopy shade lowers local light level |
| Duskpine Taiga | Cold | Medium | Loam (thin) | Stone (shallow) | Duskpine conifers | Sparse undergrowth, ferns |
| Frostreach Tundra | Very Cold | Low | Frost Turf | Permafrost | No trees, scattered shrubs | Permafrost blocks are slippery |
| Glacier Peaks | Very Cold | Any | Snow / Ice | Stone | None | High elevation only; extreme slopes |
| Sunscar Desert | Hot | Very Low | Sand | Sandstone | Barrel Cacti | Frequent Sun Temples (see §6) |
| Dune Sea | Hot | Very Low | Deep Sand | Sandstone | None | Rolling dunes, buried structure risk higher |
| Redrock Mesa | Hot | Low | Terracotta bands | Terracotta/Stone | Sparse dead trees | Distinct horizontal color banding by height |
| Savanna Reach | Hot | Low-Medium | Loam (dry) | Dirt | Acacia-analog "Umbrella trees" | Flat-topped tree canopies |
| Mistmarsh Swamp | Warm | High | Bog Turf | Mud | Willow-analog "Weeping trees", lily pads | Shallow standing water throughout |
| Mangrove Shallows | Warm | Very High | Mud | Mud | Mangrove-analog stilt trees | Borders ocean biomes |
| Bloomvale Jungle | Hot | Very High | Loam (rich) | Dirt | Dense canopy trees, vines | Tallest trees in the game; canopy layer |
| Emberglade Volcanic | Hot | Low | Ash | Basalt | Charred trees (rare) | Scattered lava pools, ambient ash particles |
| Bramblewild Hills | Temperate | Medium | Loam | Stone (shallow) | Thorn bushes, scattered trees | Steep, rocky, berry bushes common |
| Cliffhome Highlands | Cool | Medium | Rocky Turf | Stone | Sparse hardy trees | Sheer cliffs, waterfalls common |
| Mushroom Hollow | Temperate | High | Mycelium | Dirt | Giant Mushroom Caps | Rare biome; unique bioluminescent flora |
| Crystal Barrens | Cold | Low | Frost Turf | Stone | None | Surface-exposed crystal ore clusters |
| Ashfall Wastes | Hot | Very Low | Ash | Basalt | None | Volcanic biome variant, no water source |
| Coral Shallows (ocean) | Warm | — | Sand (seabed) | Sandstone | Coral formations, kelp | Underwater biome, bright/colorful |
| Kelp Forest (ocean) | Temperate | — | Silt | Stone | Dense kelp columns | Underwater biome |
| Abyssal Trench (ocean) | Any | — | Silt | Stone | Sparse | Deepest ocean biome, near-zero light |
| Frozen Ocean | Very Cold | — | Silt (icecap above) | Stone | None | Surface ice layer, breakable |
| River | Any | — | Gravel/Sand (bed) | Stone | Reeds along banks | Carves through land biomes |
| Beach | Any (warm-neutral) | — | Sand | Sandstone | Driftwood debris | Border biome between land and ocean |
| Stony Shore | Any (cool-neutral) | — | Gravel/Stone | Stone | None | Rocky border biome |
| Floating Isles (rare) | Any | Any | Loam | Stone | Sparse trees | Rare vertical-generation anomaly biome, small islands at Y 140-200 |
| Deep Caverns (underground) | — | — | — | Stone/Deepstone | Glowmoss, cave crystals | Y < 0 equivalent depth band, see §4 |
| Hollow Reach (underground) | — | — | — | Deepstone | Giant fungi, rare | Deepest cave band, highest ore/danger density |

Biome boundaries are smoothed with a blend noise so transitions aren't
hard edges — a 4–8 block wide blend zone interpolates surface block choice
between adjacent biomes.

## 4. Caves, ravines, and underground layout

- **Worm caves:** 3D Perlin-worm style tunnels (a noise-guided random
  walk with varying radius) — the primary cave type, producing winding
  tunnel networks between Y 0–120.
- **Cavern chambers:** large, low-frequency 3D noise "blobs" (density
  threshold carving) that create open rooms rather than tunnels, more
  common below Y 40.
- **Ravines:** rare, narrow-but-deep surface-to-underground gashes, using
  a 2D noise-guided spline carved with a wedge cross-section, occasionally
  exposing multiple underground layers at once.
- **Underground water/lava lakes:** flood-filled pockets placed at cavern
  intersections below a per-biome water table (lava below Y 10, water
  above).
- **Depth bands** (affects stone variant, ambient light, ore density, and
  creature spawn tables — see [08 — Mobs & Creatures](08-mobs-creatures.md)):
  - Y 60–255: **Surface band** — standard Stone.
  - Y 0–59: **Deep Caverns band** — Deepstone (harder variant, requires
    better tools, see [03 — Blocks & Materials](03-blocks-materials.md)),
    denser ore veins, ambient ceiling glowmoss light sources.
  - Y -1 to -64 (below the nominal 0 floor, see §7 for the extended-depth
    world option): **Hollow Reach band** — rarest ores, largest open
    caverns, highest hostile creature density, ambient light near zero.

## 5. Ore & resource distribution

Each ore uses a 3D noise "blob" placement (a threshold on a dedicated
per-ore noise field, seeded as `worldSeed XOR oreSaltValue` so ore layouts
are independent of each other) restricted to a Y range and a per-chunk
vein-count cap.

| Resource | Y range | Rarity (veins/chunk, avg) | Found in |
|---|---|---|---|
| Copper Ore | 0–255 (peak ~50-80) | 1.2 | Stone |
| Tin Ore | 0–255 (peak ~40-70) | 1.0 | Stone |
| Iron-equivalent "Ferrite Ore" | 0–160 | 0.9 | Stone, Deepstone |
| Coal-equivalent "Char Coal Seam" | 0–200 | 1.4 | Stone |
| Silver Ore | 0–60 | 0.5 | Deepstone |
| Gold-equivalent "Aurum Ore" | -32–32 | 0.3 | Deepstone |
| Diamond-equivalent "Lumen Crystal" | -64–16 | 0.15 | Deepstone |
| Redstone-equivalent "Sparkstone" | -64–32 | 0.6 | Deepstone |
| Lapis-equivalent "Azurite" | -32–48 | 0.3 | Stone, Deepstone |
| Quartz (found in Emberglade/Ashfall only) | 8–120 | 0.8 | Basalt |
| Obsidian-equivalent "Voidglass" | Forms where lava meets water | n/a (reactive, see [11 — Physics & Fluids](11-physics-fluids.md)) | n/a |
| Amethyst Geodes (rare pocket structure) | -48–30 | 1 per ~12 chunks | Hollow chamber lined with crystal blocks |

Surface-exposed ore is intentionally allowed (small chance per vein to
poke through into a cave wall or cliff face) so exploration is rewarded
without always requiring digging.

## 6. Structures

Structures are placed via a deterministic per-chunk hash check (a chunk's
`(seed, cx, cz)` hash is tested against each structure's spawn probability
and spacing/exclusion rules — the same technique used for chunk-based
structure placement across the genre) and then stamped from a schematic
(see [06 — Building Tools](06-building-tools.md) §4 for the schematic
format these are authored in) or algorithmically generated on the fly.

| Structure | Biome(s) | Frequency | Contents/Notes |
|---|---|---|---|
| Sun Temple | Desert, Mesa | ~1 per 12 chunks in-biome | Sandstone/terracotta ruin, buried chambers, trapped loot room with a pressure-plate dart trap (logic-driven, see chapter 09) |
| Sunken Ruins | Ocean, Coral Shallows | ~1 per 16 chunks | Underwater structure, loot chests, requires holding-breath/swim mechanics |
| Wayfarer Outpost | Plains, Savanna | ~1 per 20 chunks | Small abandoned camp, a few loot crates, no hostile spawns inside |
| Hollow Mine | Underground, any biome above | ~1 per 10 chunks | Pre-carved mineshaft with support beams, rail track fragments, cobweb-equivalent "Snarevine" hazard blocks |
| Sky Shard | Floating Isles | ~1 per Floating Isles cluster | Small ruin atop a floating island, rare loot |
| Deepstone Vault | Hollow Reach band | ~1 per 24 chunks | Guarded vault room, puzzle-lock door (logic circuit puzzle), best loot tier in the game |
| Witherwood Hut | Swamp | ~1 per 14 chunks | Small hut on stilts, alchemy-station structure inside (see [04](04-items-inventory-crafting.md) §7) |
| Giant Mushroom Circle | Mushroom Hollow | Guaranteed 1+ per biome pocket | Non-lootable landmark, ambient light source cluster |
| Crystal Spire | Crystal Barrens | ~1 per 18 chunks | Surface-exposed large crystal formation, high-value harvest, no loot room |
| Village analog "Hearthstead" | Meadow, Plains, Savanna | ~1 per 30 chunks | Multi-building settlement generated from a small set of building schematics + road-stitching logic; passive Villager-analog "Tenders" live here (see chapter 08) |

Structures never overwrite terrain destructively at their edges — a
buffer/foundation pass smooths the terrain seam so structures don't look
like they're clipping through the ground (small terrain edits, not full
flattening, to preserve natural look).

## 7. World types

Presented as options at world creation (see
[12 — UI/UX](12-ui-ux.md) §2 for the creation-screen spec):

- **Standard** — the full pipeline described above, infinite in X/Z,
  Y 0–255 (extended option below for Y -64–255).
- **Superflat** — a fixed, configurable stack of horizontal layers (e.g.
  Deepstone, Stone, Dirt, Loam ×1) repeated infinitely in X/Z, no biome
  variation, no caves. Intended for pure-building sessions.
- **Amplified** — same pipeline as Standard but with terrain-height noise
  amplitude multiplied (~×2.5) and a lower "solid" density threshold,
  producing extreme mountains, overhangs, and floating terrain far more
  often. Performance note: taller/more complex terrain increases mesh
  complexity — see [15 — Performance](15-performance.md).
- **Islands** — continentalness noise is remapped so most of the world
  reads as deep ocean, with sparse landmasses. Encourages boat/bridge
  building.
- **Extended Depth (toggle, any type above)** — extends the world down to
  Y -64 instead of Y 0, unlocking the full Hollow Reach band described in
  §4. Off by default (keeps early-game mining shallower) but selectable
  at world creation.

## 8. Seeds

- A seed is any string, hashed (e.g. via a 32-bit FNV-1a or similar fast
  string hash) down to a numeric seed used to initialize every noise
  field in the pipeline (each field XORs the base seed with a distinct
  salt constant, so changing one noise layer's tuning doesn't correlate
  all the others).
- Leaving the seed field blank at world creation generates a random seed
  string (e.g. from `crypto.getRandomValues`) and displays it to the
  player before confirming, so it can be noted down and shared/reused.
- The same seed + same world-type + same SimCraft version always produces
  a byte-identical world (see
  [01 — Tech Stack & Architecture](01-tech-stack-architecture.md) §9 on
  determinism). A version bump to the generation pipeline itself
  (tuning changes, new biomes) is allowed to change what a given seed
  produces — this is called out in
  [14 — Persistence & Saves](14-persistence-saves.md) §5's versioning
  policy, since it only affects *ungenerated* chunks in existing saves,
  never already-generated ones (which are stored, not regenerated).

## 9. Spawn point selection

On world creation, the generator samples outward from world origin (0, z)
in a small spiral until it finds a column that is: land (not ocean/river
biome), not on a steep slope (heightmap gradient below a threshold across
a 5×5 sample), and not inside a structure's exclusion radius. The player
spawns standing on the surface block of that column. This search is
capped (falls back to accepting a slightly-imperfect spot after ~200
samples) so world creation never hangs looking for a "perfect" spawn.
