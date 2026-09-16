# 03 — Blocks & Materials

## 1. Block data model

Every block type is a static entry in `data/blocks.ts` (schema in
[23 — Data Schema Reference](23-data-schema-reference.md) §1), keyed by a
stable numeric ID (stored in chunk arrays, see
[01 — Tech Stack & Architecture](01-tech-stack-architecture.md) §4) and a
string key (used in save-file diffs, blueprints, and tooling, so IDs can
be safely renumbered without breaking references). Every block entry
carries:

- `hardness` — base seconds-to-break with a bare hand (0 = instant, e.g.
  flowers; `Infinity` for unbreakable world-border blocks).
- `toolTier` — minimum tool tier required to actually yield a drop when
  broken (breaking with a lower tier, or bare hands, destroys the block
  but yields nothing) — see [04](04-items-inventory-crafting.md) §3 for
  tiers.
- `toolType` — which tool family is efficient against it (pick/axe/
  shovel/shears/none).
- `lightEmission` — 0–15.
- `lightOpacity` — 0 (fully transparent to light, e.g. glass) to 15 (fully
  opaque).
- `flammable` — bool + spread chance, see [11](11-physics-fluids.md) §4.
- `solid` — collision-relevant; false for flowers, torches, etc.
- `transparentToRender` — whether neighbor faces against it should still
  be meshed (glass, leaves, water).
- `dropTable` — item(s) + quantity range + (optional) required tool tier
  for the drop, see [04](04-items-inventory-crafting.md) §2.

## 2. Block categories

### 2.1 Terrain & stone family

| Block | Hardness | Tool | Notes |
|---|---|---|---|
| Loam | 0.5 | Shovel | Default fertile surface soil |
| Dirt | 0.5 | Shovel | Sub-surface soil, no growth without top exposure |
| Rocky Turf | 0.6 | Shovel | Highland surface variant |
| Frost Turf | 0.6 | Shovel | Cold-biome surface, slightly slippery |
| Bog Turf | 0.7 | Shovel | Swamp surface, slows movement |
| Mycelium | 0.6 | Shovel | Spreads to adjacent Loam/Dirt over time in low light |
| Sand | 0.5 | Shovel | Gravity-affected, see [11](11-physics-fluids.md) §3 |
| Deep Sand | 0.5 | Shovel | Dune-biome variant, visually deeper texture |
| Gravel | 0.6 | Shovel | Gravity-affected; rare flint-equivalent "Shard" drop chance |
| Ash | 0.5 | Shovel | Volcanic surface, fire-resistant |
| Stone | 1.5 | Pickaxe (Tier 1+) | The baseline underground block |
| Deepstone | 3.5 | Pickaxe (Tier 2+) | Harder deep-band stone, see [02](02-world-generation.md) §4 |
| Basalt | 1.25 | Pickaxe (Tier 1+) | Volcanic-biome stone variant |
| Sandstone | 0.8 | Pickaxe (Tier 1+) | Forms naturally under Sand |
| Terracotta (8 color bands) | 1.25 | Pickaxe (Tier 1+) | Mesa biome, decorative and naturally banded |
| Permafrost | 0.6 | Shovel/Pickaxe | Tundra sub-surface, slippery when walked on |
| Mud | 0.5 | Shovel | Slows movement; dries to Dirt if adjacent to fire/lit block for a while |
| Silt | 0.5 | Shovel | Ocean/riverbed floor |
| Clay | 0.6 | Shovel | Found in shallow water-adjacent patches; smelts to Brick |
| Ice | 0.5 | Pickaxe | Melts near light sources above a brightness threshold; slippery |
| Packed Ice | 1.5 | Pickaxe | Does not melt; found in Glacier biome cores |
| Snow Layer | 0.1 | Shovel | Stackable in 8 thin layers, accumulates in cold biomes during snowfall |
| Snow Block | 0.2 | Shovel | Full-block compacted form |

### 2.2 Ores (raw, in-stone form — see [02](02-world-generation.md) §5 for placement)

Copper Ore, Tin Ore, Ferrite Ore, Char Coal Seam, Silver Ore, Aurum Ore,
Lumen Crystal Ore, Sparkstone Ore, Azurite Ore, Quartz Vein (in Basalt),
Amethyst Cluster (decorative + harvestable, found in geode structures).
Each has a Stone-variant and Deepstone-variant texture, and a
`toolTier` requirement matching its rarity tier (see
[04](04-items-inventory-crafting.md) §3 table for the full tier
progression these gate).

### 2.3 Wood family (per tree type — 7 tree types × 4 block forms each = 28 blocks)

Tree types: Greenwood, Birchcap, Duskpine, Umbrella (savanna), Weeping
(swamp willow-analog), Mangrove, Bloomvale (jungle canopy).

Each tree type has: **Log** (solid, bark texture on side faces, ring
texture on end faces), **Stripped Log** (axe-interact to remove bark
texture, cosmetic), **Planks** (crafted from Log, the primary building
material), **Leaves** (semi-transparent, decays if too far from a log
after a tree is partially cut, drops saplings at low chance).

### 2.4 Plant & vegetation blocks

| Block | Notes |
|---|---|
| Tall Grass | Decorative, non-solid, drops nothing or rare seed |
| Fern | Decorative, forest/jungle biomes |
| Wildflower (6 color variants) | Decorative, used as a dye source |
| Sapling (per tree type) | Plantable, grows into a tree over time given light + space |
| Barrel Cactus | Desert; damages on contact |
| Reed Stalk | Riverbank/beach; craftable into paper-equivalent "Pulp Sheet" |
| Lily Pad | Floats on water surface, walkable-but-fragile |
| Kelp | Underwater, grows toward surface, edible when dried |
| Coral (5 color variants) | Underwater decorative, dies if exposed to air |
| Seagrass | Underwater decorative |
| Vine | Climbable, spreads slowly on jungle/swamp surfaces |
| Mushroom (red-cap, brown-cap) | Placeable/harvestable, food ingredient |
| Giant Mushroom Cap / Stem | Structural blocks from Mushroom Hollow giant mushrooms |
| Glowmoss | Cave ceiling growth, light-emitting (level 6) |
| Crop: Wheatgrass, Root Tuber, Sunberry Bush, Spicevine (pepper-analog), Gourd | Farmable food crops, see [07](07-survival-systems.md) §3 growth-stage mechanics |
| Snarevine | Hazard decoration in Hollow Mine structures, slows movement like cobweb |

### 2.5 Liquids

| Block | Notes |
|---|---|
| Water (Source + Flowing, 8 flow-depth states) | See [11](11-physics-fluids.md) §1 |
| Lava (Source + Flowing, 8 flow-depth states) | Damages on contact, ignites flammable blocks nearby, light emission 15 |
| Sap (rare, found near Bloomvale trees) | Slows movement, harvestable into a sticky-item crafting ingredient |

### 2.6 Functional / crafting-station blocks

| Block | Function |
|---|---|
| Workbench | Opens the 3×3 crafting grid UI, see [04](04-items-inventory-crafting.md) §4 |
| Hearth Furnace | Smelting station, fuel slot + input slot + output slot |
| Blast Hearth | Faster ore smelting, higher fuel cost, unlocked mid-progression |
| Alchemy Basin | Brews status-effect potions-equivalent "Tonics," see [07](07-survival-systems.md) §5 |
| Anvil Stone | Tool/armor repair and renaming station |
| Loom Frame | Dye-pattern crafting for banners/carpets-equivalent decorative textiles |
| Enchant Lectern (renamed system, "Runeforge") | Applies Rune upgrades to tools/armor/weapons, see [04](04-items-inventory-crafting.md) §8 |
| Grindstone | Removes Rune upgrades, restores durability partially |
| Storage Crate (small, 27 slots) | Basic storage container |
| Storage Chest (large, 54 slots, 2-wide) | Larger storage, two placed adjacent auto-merge into one inventory |
| Barrel | Single-item-type bulk storage, no UI needed to deposit (right-click with item) |
| Item Frame | Displays a held item on a wall |
| Signpost | Placeable, editable text label |
| Bell | Rings, alerts passive Tenders (structure-bound), decorative/functional |
| Cartography Table | Generates a map item of the surrounding area |

### 2.7 Light sources

| Block | Light level | Notes |
|---|---|---|
| Torch | 14 | Cheapest, craftable turn 1 |
| Lantern | 15 | Hanging or standing variant, craftable mid-game |
| Glowstone Cluster (found in caves/structures) | 15 | Harvestable, placeable |
| Sea Lantern (found in Sunken Ruins) | 15 | Underwater-safe light source |
| Campfire | 15 | Also cooks food placed above it, emits smoke particle column |
| Candle (8 color variants, stackable 1-4 per block) | 3 per candle stacked | Decorative, low light |
| Glowmoss | 6 | Natural only, not craftable/placeable by player initially |
| Ember Lantern (Emberglade-themed, rare recipe) | 15 | Cosmetic variant, orange flicker shader |

### 2.8 Glass & transparent blocks

Glass (clear), Stained Glass (16 dye colors), Glass Pane (thin, connects
visually to neighbors), Ice (see §2.1). All are `transparentToRender:
true` and `lightOpacity: 0` (clear) or low (stained).

### 2.9 Wool, dye, and color-family blocks

Wool Block (16 dye colors, made from Fiber Tuft — a sheep-analog "Woolback
Grazer" creature drop, see [08](08-mobs-creatures.md) §3), Carpet (thin
wool variant, 16 colors), Terracotta (dyeable, 16 colors, in addition to
the 8 natural bands from §2.1), Concrete-equivalent "Cast Block" (16
colors, crafted from dye + Cast Powder + water contact — hardens
instantly on contact like concrete powder does), Glazed Block (16 colors,
decorative patterned variant, kiln-crafted).

Dye sources: 12 Wildflower/plant-derived pigments + Squidmurk Ink (from
the "Inkwell Drifter" ocean creature) + Bonemeal-equivalent "Chalk Dust"
(white, from Deepstone Vault loot or bone drops) round out to 16 total
dye colors matching the standard palette (White, Light Gray, Gray, Black,
Brown, Red, Orange, Yellow, Lime, Green, Cyan, Light Blue, Blue, Purple,
Magenta, Pink).

### 2.10 Building & decorative blocks

Bricks (from Clay), Stone Bricks (+ Mossy/Cracked/Chiseled variants),
Deepstone Bricks, Polished Stone (all stone-family blocks have a
"Polished" crafted variant), Slabs (half-height, every solid block family
has a slab form), Stairs (every solid block family has a stair form),
Fences + Fence Gates (every wood type), Walls (every stone type, taller
collision than a normal block edge), Trapdoors (every wood type + an iron
equivalent "Ferrite Trapdoor"), Doors (every wood type + Ferrite Door),
Ladders, Bookshelf-equivalent "Archive Shelf" (decorative, boosts nearby
Runeforge power), Flower Pot (holds one small plant/sapling decoratively).

### 2.11 Redstone-equivalent logic blocks

Covered in full in [09 — Logic & Automation](09-redstone-automation.md)
§2; summarized here for the catalog: Sparkwire (the wire), Spark Emitter
(constant power source), Lever, Button, Pressure Plate (wood + stone
variants, weighted variant for heavy-only triggers), Pulse Relay
(repeater-equivalent), Comparator-equivalent "Signal Gauge," Piston +
Sticky Piston, Dropper, Dispenser-equivalent "Launcher," Hopper-equivalent
"Chute," Rail (+ Powered Rail, Detector Rail), Note Block-equivalent
"Chime Block," Target Block-equivalent "Signal Drum."

### 2.12 Unbreakable / world blocks

Bedrock-equivalent "Foundation Stone" (forms the world floor at the
bottom-most generated layer, `hardness: Infinity`, never dropped or
obtainable), Barrier (dev/creative-only invisible collision block, not
available in survival inventory), Structure Void (used only inside
blueprint/schematic authoring, see [06](06-building-tools.md) §4 — not a
real placeable block, a "no-op" marker within a schematic).

## 3. Block count summary

Approximate catalog size for the MVP content pass: ~40 terrain/stone
blocks, ~12 ore blocks, ~28 wood-family blocks, ~35 plant/vegetation
blocks, ~6 liquid states × 8 flow levels each, ~20 functional blocks, ~8
light sources, ~20 glass variants, ~64 wool/dye/color-family blocks (16
colors × 4 families), ~180 building/decorative blocks (slabs/stairs/
fences/walls/doors across every material), ~15 logic blocks, 2 world
blocks. Total distinct block IDs: **~420**, comfortably inside the
65,536-ID budget from
[01 — Tech Stack & Architecture](01-tech-stack-architecture.md) §4.

## 4. Block interaction rules

- **Breaking** takes `hardness × toolMultiplierInverse` seconds, shown as
  a cracking-stage overlay texture (10 stages) on the targeted block face.
  Breaking with an incorrect/no tool for a block that requires one still
  eventually breaks the block (no drop) rather than being impossible —
  avoids a player ever being fully blocked from clearing terrain.
- **Placing** requires a valid, non-solid, non-occupied target position
  adjacent to a solid face the player is looking at (raycast-based
  targeting, see [05](05-player-mechanics.md) §4), and the placement
  position must not intersect the player's own collision box (prevents
  self-trapping via floor placement).
- **Block updates:** placing/breaking a block schedules a tick-queue
  check on itself and its 6 neighbors next simulation tick (gravity
  blocks fall, fluids re-flow, redstone-equivalent signal re-propagates,
  attached decorations like torches/signs pop off if their support block
  is removed).

## 5. Full enumerated catalog (implementation checklist)

The category tables in §2 describe each family's rules once; this section
spells out the full enumeration so `data/blocks.ts` can be authored (or
generated) directly against it without the implementer having to
re-derive "which 7 tree types × which 4 forms" multiplication by hand.

### 5.1 Wood family — full 28-block enumeration

| Tree type | Log | Stripped Log | Planks | Leaves |
|---|---|---|---|---|
| Greenwood | Greenwood Log | Stripped Greenwood Log | Greenwood Planks | Greenwood Leaves |
| Birchcap | Birchcap Log | Stripped Birchcap Log | Birchcap Planks | Birchcap Leaves |
| Duskpine | Duskpine Log | Stripped Duskpine Log | Duskpine Planks | Duskpine Needles |
| Umbrella | Umbrella Log | Stripped Umbrella Log | Umbrella Planks | Umbrella Leaves |
| Weeping | Weeping Log | Stripped Weeping Log | Weeping Planks | Weeping Leaves |
| Mangrove | Mangrove Log | Stripped Mangrove Log | Mangrove Planks | Mangrove Leaves |
| Bloomvale | Bloomvale Log | Stripped Bloomvale Log | Bloomvale Planks | Bloomvale Leaves |

Every **Planks** entry above additionally has a Slab, Stair, Fence, Fence
Gate, Door, Trapdoor, and Pressure Plate form (7 derived blocks × 7 wood
types = 49 more blocks), consistent with the "every solid block family
has a slab/stair form" rule in §2.10.

### 5.2 Stone & mineral family — polished/decorative derivative forms

Each base stone-family block (Stone, Deepstone, Basalt, Sandstone,
Permafrost-adjacent Cut Stone, and the 8 Terracotta color bands) has the
following derived forms, following the same "every material gets the
full decorative set" rule as wood:

| Derived form | Applies to | Notes |
|---|---|---|
| Polished `<Material>` | Stone, Deepstone, Basalt, Sandstone | Smoothed variant, crafted 1:1 via Workbench/Anvil-adjacent stonecutting interaction |
| `<Material>` Bricks | Stone, Deepstone | Crafted from 4× the base block |
| Mossy `<Material>` Bricks | Stone Bricks, Deepstone Bricks | Crafted by combining Bricks with Glowmoss/Vine |
| Cracked `<Material>` Bricks | Stone Bricks, Deepstone Bricks | Smelted variant, cosmetic-only reskin |
| Chiseled `<Material>` | Stone, Deepstone, Sandstone, all 8 Terracotta bands | Decorative carved-face variant |
| `<Material>` Slab | Every stone-family block, both natural and derived forms above | Half-height |
| `<Material>` Stairs | Every stone-family block, both natural and derived forms above | Directional, 4 rotations + 2 flip states |
| `<Material>` Wall | Stone, Deepstone, Basalt, Cobble-equivalent rough-cut forms | Taller collision than a block edge, connects visually to neighbors |

### 5.3 Wool / dye / color family — full 16-color enumeration

Applies uniformly to Wool Block, Carpet, Cast Block, and Glazed Block (4
block families × 16 colors = 64 blocks, matching the count in §3); Glass
and Candle also use this same 16-color set (see §2.8–2.9):

White, Light Gray, Gray, Black, Brown, Red, Orange, Yellow, Lime, Green,
Cyan, Light Blue, Blue, Purple, Magenta, Pink.

Dyeable Terracotta additionally uses this same 16-color set layered on
top of its 8 natural (undyed) bands, per §2.9.

### 5.4 Tool & weapon family — full cross-product

Every one of the 5 tool types (Pickaxe, Axe, Shovel, Hoe, Shears) and the
Blade weapon exists in each of the 6 material tiers from
[04 — Items, Inventory & Crafting](04-items-inventory-crafting.md) §3
(Timberwrought through Auric-Lumen) — 6 tools × 6 tiers = 36 items (Shears
is craftable starting at Tier 2/Stoneforged rather than Tier 1, since a
wooden pair of shears has no in-fiction justification and no gameplay
need). The Spear, Longshot, and Sling weapons do not follow the full
6-tier ladder (see [04](04-items-inventory-crafting.md) §6 for their own,
simpler progression), and armor follows a parallel 4-piece × applicable-
tier cross-product per [04](04-items-inventory-crafting.md) §3.
