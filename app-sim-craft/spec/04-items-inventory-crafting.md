# 04 — Items, Inventory & Crafting

## 1. Inventory model

- **Player inventory:** 36 slots total — a 9-slot hotbar (always visible,
  see [12 — UI/UX](12-ui-ux.md) §4) plus 27 general slots (3 rows,
  revealed in the inventory screen), plus 4 armor slots (head/chest/legs/
  feet) and 1 off-hand slot (for a shield-equivalent "Bulwark" or a
  second torch/tool).
- **Stacking:** most items stack to 64; tools, weapons, and armor never
  stack (max 1); a few consumables (e.g. Tonic bottles) cap at 16.
- **Item data model:** an inventory slot holds `{ itemId, count,
  durability?, runes?: RuneInstance[] }` — see
  [23 — Data Schema Reference](23-data-schema-reference.md) §2 for the
  full `ItemStack` interface.
- **Dropped items:** breaking a block or a creature dying spawns a
  `DroppedItem` entity (small bobbing/rotating item-icon mesh) with a
  short pickup-delay and a despawn timer (5 minutes unpicked), picked up
  automatically on player-collision if inventory has room.
- **Hotbar selection:** number keys 1–9 or scroll wheel; the selected
  slot is the "held item," used for both placing blocks and interacting/
  attacking (see [05 — Player Mechanics](05-player-mechanics.md) §4).

## 2. Item categories

- **Blocks** — every placeable block from
  [03 — Blocks & Materials](03-blocks-materials.md) is also an item (1:1
  mapping; picking up a block via breaking gives you the item that places
  it back).
- **Raw materials** — ore drops before smelting (e.g. "Ferrite Chunk"),
  plant fibers, Fiber Tuft, Squidmurk Ink, bone-equivalent "Marrow Shard"
  (from hostile creature drops).
- **Smelted/refined materials** — Ingots (Copper, Tin, Ferrite, Silver,
  Aurum), Bronze Ingot (Copper + Tin alloy — an original tiering twist,
  see §3), Glass, Brick.
- **Tools** — Pickaxe, Axe, Shovel, Hoe, Shears — each in 6 tiers (§3).
- **Weapons** — Sword-equivalent "Blade," Spear (reach weapon, new to
  SimCraft — see §6), Bow-equivalent "Longshot," ammunition ("Flint Bolt").
- **Armor** — Helm, Cuirass, Greaves, Boots — same 6-tier material
  progression as tools where applicable (cloth/leather-equivalent
  "Hidecloth" tiers don't gate on mining, see §3).
- **Food** — raw and cooked variants of every harvestable/huntable food
  source (§5).
- **Tonics** — brewed consumables with timed status effects (§7).
- **Crafting components** — String-equivalent "Sinew," Pulp Sheet (paper
  analog, used for maps/books), Ink, Fletching Feather (from bird
  creatures), Powder Charge (gunpowder-analog, from a rare Hollow Reach
  creature drop, used in Launchers and a firework-equivalent "Skyburst"
  item).
- **Utility items** — Map, Compass-equivalent "Wayfinder," Clock-
  equivalent "Sunglass" (shows time of day), Bucket (Empty/Water/Lava/
  Fish variants), Lead-equivalent "Tether" (for leading tamed creatures),
  Boat, Minecart-equivalent "Rail Sled," Blueprint Scroll (see
  [06 — Building Tools](06-building-tools.md) §4), Totem-equivalent
  "Lifewarden Charm" (rare, consumes itself to prevent one fatal hit).

## 3. Tool & material tiers

Six progression tiers, gating which blocks yield drops (see
[03](03-blocks-materials.md) §1 `toolTier`) and dealing scaled damage/
mining speed:

| Tier | Material | Mining speed mult. | Weapon damage mult. | Durability | Unlocked via |
|---|---|---|---|---|---|
| 0 | Bare hands | 1.0× | 1.0× | n/a | Always |
| 1 | Timberwrought (wood) | 2.0× | 1.3× | 60 uses | First Workbench craft |
| 2 | Stoneforged | 3.0× | 1.6× | 130 uses | Mining Stone |
| 3 | Bronzecast (Copper+Tin alloy) | 4.5× | 2.0× | 260 uses | Smelting both ores + Hearth Furnace |
| 4 | Ferrite (iron-equivalent) | 6.0× | 2.6× | 400 uses | Mining Ferrite Ore + smelting |
| 5 | Lumenforged (diamond-equivalent, from Lumen Crystal) | 9.0× | 3.5× | 1100 uses | Deep-band mining, requires Ferrite pick to harvest |
| 6 | Auric-Lumen (Aurum + Lumen composite, end-game) | 12.0× | 4.5× | 2000 uses, self-repairs 1 durability per in-game day if unused | Crafted at max-level Runeforge only |

Bronzecast (tier 3) is an original twist on the usual 5-tier ladder: it
sits between Stone and Ferrite as an *alloy* tier, giving early-game
players a reason to run both a Copper and a Tin vein before their first
Ferrite tool, and a natural teaching moment for the smelting/alloy system
generally (also used later for Aurum-Lumen).

## 4. Crafting system

- **Grid crafting:** a 3×3 shaped-recipe grid (matches the genre
  standard), available in a reduced 2×2 form directly from the player
  inventory screen (no station needed) for early/simple recipes, and full
  3×3 at a placed Workbench.
- **Recipe matching:** shaped (exact grid layout matters, e.g. tool
  heads/handles) or shapeless (ingredients present in any grid position,
  e.g. dye mixing) — both supported, per-recipe flag in the recipe table
  schema (see [23](23-data-schema-reference.md) §3).
- **Recipe Book:** a searchable, filterable panel next to the crafting
  grid listing every recipe the player has *discovered* (discovery =
  either crafted once manually, or unlocked automatically the first time
  the player's inventory contains all required ingredients — removes
  memorization burden without removing the grid-puzzle feel for
  new/uncommon recipes). Clicking a known recipe auto-fills the grid from
  inventory if possible.
- **Smelting (Hearth Furnace / Blast Hearth):** input slot + fuel slot →
  output slot, real-time progress bar. Fuel items have a burn-duration
  value (e.g. Plank: 15s equivalent-tick-time, Char Coal Seam: 80s,
  Aurum Ingot: 100s as a joke high-tier fuel, Lava Bucket: 1000s). Blast
  Hearth halves smelt time but only accepts ore inputs (not food/misc)
  and consumes fuel 2× as fast.
- **Alchemy Basin:** base Tonic + one or more reagents → status-effect
  Tonic (see §7), separate UI with a bubbling-progress animation, no grid
  — reagent slots are unordered.
- **Runeforge:** tool/armor/weapon + Rune-material + XP-equivalent
  "Insight" cost → applies a Rune (see §8). Nearby Archive Shelf blocks
  (within 1 block, up to 15 shelves) increase the max Rune tier offered,
  matching the genre's bookshelf-power convention with an original name.

## 5. Food & hunger interaction

Every food item has a `nutrition` (hunger restored, 0–20 scale) and
`saturation` (how slowly hunger subsequently drains, see
[07 — Survival Systems](07-survival-systems.md) §3) value. Cooking (via
Hearth Furnace or standing on a Campfire) roughly doubles both values over
the raw form and removes food-poisoning risk from raw meat-equivalent
items.

| Food | Raw nutrition/saturation | Cooked nutrition/saturation | Source |
|---|---|---|---|
| Root Tuber | 2 / low | 5 / medium | Farmed crop |
| Wheatgrass (→ Flatbread) | n/a (crafted only) | 6 / medium | Farmed crop, crafted into bread-equivalent |
| Sunberry | 3 / low | n/a (eaten raw) | Farmed bush |
| Gourd Slice | 3 / medium | 5 / medium | Farmed crop |
| Mushroom | 2 / low | 3 / low | Foraged |
| Fish Fillet | 3 / low | 6 / medium | Fished/hunted from ocean creatures |
| Haunch (from grazer creatures) | 3 / low (poisoning risk) | 8 / high | Hunted |
| Fowl Cut | 2 / low (poisoning risk) | 6 / medium | Hunted |
| Honeycomb Chew | 4 / high | n/a | Harvested from wild hives |
| Stew (bowl, crafted from 2+ ingredients) | n/a | 10 / high | Crafted, consumes the bowl |
| Golden Sunberry (rare, Aurum-infused) | n/a | 20 / max + brief regeneration Tonic effect | Crafted, end-game |

## 6. Weapons & combat items

- **Blade** (sword-equivalent): fast, moderate damage, short reach, sweep-
  hit chance to graze adjacent targets.
- **Spear** (original to SimCraft, no direct genre-standard equivalent):
  slower swing, longer reach (1.5 blocks further than Blade), bonus
  damage vs. multiple lined-up targets, can be thrown as a single-use
  ranged option (recoverable if it hits terrain, breaks on creature hit).
- **Longshot** (bow-equivalent): charge-and-release ranged weapon,
  consumes Flint Bolt ammunition, damage scales with charge time.
- **Sling** (early-game ranged option, unlocked before Longshot):
  low damage, uses any small stone/ore chunk as ammo — gives new players
  a ranged option before the Longshot's higher material cost.
- **Powder Charge items:** Launcher block ammunition, and a craftable
  "Skyburst" firework-equivalent (cosmetic burst, optional light damage
  variant) for celebration/signaling use.

## 7. Tonics (status-effect consumables)

Brewed at the Alchemy Basin from a base Tonic (Water Bottle-equivalent →
Neutral Tonic via a base reagent) plus modifier reagents:

| Tonic | Effect | Base reagent |
|---|---|---|
| Vigor Tonic | Regeneration over time | Sunberry |
| Fleetfoot Tonic | Movement speed boost | Fowl Feather |
| Stonehide Tonic | Damage resistance | Deepstone dust |
| Nightsight Tonic | Full-brightness vision in dark areas | Glowmoss |
| Aqualung Tonic | No breath loss underwater, faster swim | Kelp |
| Featherfall Tonic | No fall damage | Fowl Feather + Sunberry |
| Emberward Tonic | Fire/lava damage resistance | Ash + Sunberry |
| Withering Tonic (thrown variant only) | Damage-over-time, offensive use | Marrow Shard + Spicevine |
| Clarity Tonic | Removes all active negative effects | Chalk Dust |

Each has a Lingering (thrown, area-effect, weaker/longer) and a
Concentrated (drunk, single-target, stronger/shorter) brewing branch,
mirroring the genre's potion-modifier convention with SimCraft-original
names and reagents throughout.

## 8. Rune (enchantment-equivalent) system

Applied at the Runeforge, consuming Insight (see
[17 — Game Modes & Progression](17-game-modes-progression.md) §3 for how
Insight is earned) and a Rune-material item (Sparkstone dust or, for
higher tiers, Azurite). Runes are original names for familiar
enchantment-style modifiers:

| Rune | Applies to | Effect (scales with Rune level I–V where noted) |
|---|---|---|
| Keen Edge | Weapons | +damage per level |
| Swiftstrike | Weapons | Faster swing recovery |
| Harvestbound | Tools | Mining speed +per level |
| Bountiful Yield | Tools | Chance to duplicate a block drop |
| Unbreaking Ward | Tools/Armor/Weapons | Reduces durability loss chance per use |
| Steadfast Mend | Tools/Armor/Weapons | Slowly self-repairs using spare Insight |
| Aegis | Armor | Flat damage reduction per level |
| Emberproof | Armor | Fire/lava immunity threshold |
| Featherstep | Boots | Reduces/removes fall damage |
| Depth Strider | Boots | Faster underwater movement |
| Frost Walker | Boots | Freezes water surface into temporary walkable ice |
| Piercing Shot | Longshot | Arrows pass through multiple targets |
| Quickdraw | Longshot | Faster charge time |
| Luck of the Deep | Fishing (rod-equivalent "Angler's Line") | Better fishing loot odds |

A tool/armor/weapon has a small number of Rune slots (2–4, scaling with
tier), and higher Rune levels cost more Insight and require rarer Rune
materials, giving natural end-game progression depth without adding new
mechanical systems.

## 9. Recipe table (representative sample)

The full recipe table lives in `data/recipes.ts` and is enumerated
completely in
[23 — Data Schema Reference](23-data-schema-reference.md) §4; a
representative slice:

| Output | Grid (3×3, `.` = empty) | Station |
|---|---|---|
| 4× Planks | `L..` / `...` / `...` (1 Log, any position) | Inventory (2×2 OK) |
| 4× Sticks | `P..`/`P..`/`...` (2 Planks stacked) | Inventory (2×2 OK) |
| 1× Workbench | `PP.`/`PP.`/`...` (4 Planks) | Inventory (2×2 OK) |
| 1× Timberwrought Pickaxe | `PPP`/`.S.`/`.S.` (3 Planks, 2 Sticks) | Workbench |
| 1× Stoneforged Pickaxe | `CCC`/`.S.`/`.S.` (3 Stone, 2 Sticks) | Workbench |
| 1× Bronzecast Ingot | Smelted from 1 Copper Ingot + 1 Tin Ingot in Hearth Furnace (alloy recipe, not grid) | Hearth Furnace |
| 8× Torch | `.C.`/`.S.`/`...` (1 Char Coal, 1 Stick) | Inventory (2×2 OK) |
| 1× Storage Crate | `PPP`/`P.P`/`PPP` (8 Planks) | Workbench |
| 1× Hearth Furnace | `CCC`/`C.C`/`CCC` (8 Stone) | Workbench |
| 1× Blade (any tier) | `.M.`/`.M.`/`.S.` (2 Material, 1 Stick) | Workbench |
| 1× Bucket | `M.M`/`.M.`/`...` (3 Ferrite Ingot) | Workbench |
| 1× Boat | `MMM`/`M.M`/`...` (5 Planks) | Workbench |
| 1× Rail Sled | `M.M`/`MMM`/`...` (5 Ferrite Ingot) | Workbench |
| 1× Wayfinder | `.M.`/`MRM`/`.M.` (4 Ferrite Ingot, 1 Sparkstone) | Workbench |
| 1× Sparkwire (16×) | `.R.`/`.R.`/`.R.` (Sparkstone dust ×1, yields 16 wire) | Inventory (2×2 OK) |

### 9.1 Full tool/weapon material-tier recipes

Every tool below follows the same 3 grid shapes regardless of tier — only
the material symbol (`M`) changes per the tier table in §3. Listed once
here rather than 6× per tool to avoid needless repetition; `S` = Stick
throughout.

| Output | Grid | Notes |
|---|---|---|
| Pickaxe | `MMM`/`.S.`/`.S.` | 3 Material, 2 Stick |
| Axe | `MM.`/`MS.`/`.S.` | 3 Material, 2 Stick |
| Shovel | `.M.`/`.S.`/`.S.` | 1 Material, 2 Stick |
| Hoe | `MM.`/`.S.`/`.S.` | 2 Material, 2 Stick |
| Shears | `.M`/`M.` (2×2 grid) | 2 Material, Stoneforged tier minimum (§5.4 of chapter 03) |
| Blade | `.M.`/`.M.`/`.S.` | 2 Material, 1 Stick |
| Helm | `MMM`/`M.M`/`...` | 5 Material |
| Cuirass | `M.M`/`MMM`/`MMM` | 8 Material |
| Greaves | `MMM`/`M.M`/`M.M` | 7 Material |
| Boots | `M.M`/`M.M`/`...` | 4 Material |
| Bulwark (shield) | `.M.`/`MFM`/`.M.` | 6 Material + 1 Framing (Planks) |

### 9.2 Food & farming recipes

| Output | Grid / process | Station |
|---|---|---|
| Flatbread | `WWW` (3 Wheatgrass, shapeless) | Inventory |
| Stew (bowl) | Any 2+ food ingredients + 1 Bowl (shapeless) | Inventory |
| Bowl | `P.P`/`.P.`/`...` (3 Planks) | Inventory (2×2 OK) |
| Cooked Haunch/Fowl Cut/Fish Fillet | Raw item + fuel | Hearth Furnace or Campfire |
| Golden Sunberry | Sunberry wrapped in 8× Aurum Nugget (`AAA`/`ASA`/`AAA`) | Workbench |
| Aurum Nugget (9×) | 1 Aurum Ingot (shapeless, reverse of ingot-from-nuggets) | Inventory |
| Pulp Sheet (3×) | 3 Reed Stalk in a row (shapeless) | Inventory |
| Farmland tilling | Hoe used on Loam/Dirt (not a grid recipe — a tool-use action) | n/a, see [05](05-player-mechanics.md) §4 |

### 9.3 Logic (Sparkwire) component recipes

| Output | Grid | Notes |
|---|---|---|
| Spark Emitter | `RRR`/`RCR`/`RRR` (8 Sparkstone dust, 1 Char Coal) | Workbench, Bronzecast-tier unlock |
| Lever | `.C.`/`.M.` (2×2: 1 Cobble-equivalent, 1 Stick) | Workbench |
| Button | `.M.` single-cell shapeless (1 Material block) | Inventory |
| Pressure Plate | `MM` (2×2, 2 Material in a row) | Inventory |
| Pulse Relay | `RRR`/`SPS`/`RRR` (2 Sparkstone dust, 3 Stone, 1 Signal Post-piece) | Workbench, Bronzecast-tier unlock |
| Signal Gauge | `.R.`/`RQR`/`SSS` (Sparkstone dust, 1 Azurite, 3 Stone) | Workbench, Bronzecast-tier unlock |
| Piston | `SSS`/`MRM`/`MCM` (3 Planks, 2 Material, 1 Sparkstone dust, 1 Char Coal, 1 Cobble) | Workbench |
| Sticky Piston | 1 Piston + 1 Sap (shapeless) | Workbench |
| Dropper | `CCC`/`C.C`/`CRC` (7 Cobble, 1 Sparkstone dust) | Workbench |
| Launcher | 1 Dropper + 1 Char Coal Seam + 1 Sinew (shapeless) | Workbench |
| Chute | `M.M`/`MCM`/`.M.` (5 Material, 1 Storage Crate) | Workbench |
| Rail (16×) | `M.M`/`MRM`/`M.M` (6 Ferrite Ingot, 1 Sparkstone dust) | Workbench |
| Powered Rail (6×) | `M.M`/`MRM`/`MFM` (6 Ferrite, 1 Sparkstone dust, 1 fuel item) | Workbench |
| NOT Gate | `.R.`/`RCR`/`.S.` (2 Sparkstone dust, 1 Char Coal, 1 Stone) | Workbench, requires the raw-wiring unlock flag, §3 of chapter 09 |
| AND Gate | 2× NOT Gate + 1 Sparkstone dust (shapeless) | Workbench |
| OR Gate | 2× NOT Gate + 2 Sparkstone dust, different arrangement (shapeless) | Workbench |
| XOR Gate | 1 AND Gate + 1 OR Gate + 1 NOT Gate (shapeless) | Workbench |
| Powder Charge Block | `PCP`/`CPC`/`PCP` (4 Powder Charge item, 5 Ash) | Workbench |

### 9.4 Decorative & building recipes

| Output | Grid | Notes |
|---|---|---|
| Slab (6×) | `MMM` single row (3 Material) | Inventory (2×2 OK) |
| Stairs (4×) | `M..`/`MM.`/`MMM` (6 Material) | Inventory (2×2 OK) |
| Fence | `MSM`/`MSM` (2×2 grid extended... see note) | Workbench — 4 Material + 2 Stick in a 3×2 arrangement |
| Wall | `MMM`/`MMM` (6 Material, 2 rows) | Workbench |
| Door | `MM`/`MM`/`MM` (6 Material, 3 rows of 2) | Workbench |
| Trapdoor | `MMM`/`MMM` (6 Material, 2 rows) | Workbench |
| Ladder | `S.S`/`SSS`/`S.S` (7 Stick) | Workbench |
| Glass (from Sand) | Sand + fuel | Hearth Furnace |
| Stained Glass | 8 Glass + 1 Dye (shapeless, surrounding arrangement) | Workbench |
| Dye mixing (e.g. Orange from Red+Yellow) | 2 base dyes (shapeless) | Inventory |
| Item Frame | `SSS`/`SPS`/`SSS` (8 Sinew, 1 Pulp Sheet) | Workbench |
| Signpost | `PPP`/`PPP`/`.S.` (6 Planks, 1 Stick) | Workbench |
| Cartography Table | `PPP`/`PPP`/`.S.` variant using Pulp Sheet instead (4 Planks, 2 Pulp Sheet) | Workbench |
