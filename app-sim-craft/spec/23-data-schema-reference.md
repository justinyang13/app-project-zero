# 23 — Data Schema Reference

The consolidated appendix: every TypeScript interface and enum referenced
across chapters 00–22, in one place. This is the file to paste alongside
a narrative chapter when prompting an implementer (human or AI) so the
concrete shapes are always at hand. Nothing here introduces new *rules* —
it's a reference restatement of what earlier chapters already specify.

## 1. Block definitions (`data/blocks.ts`)

Referenced throughout [03 — Blocks & Materials](03-blocks-materials.md).

```ts
type ToolType = 'pickaxe' | 'axe' | 'shovel' | 'shears' | 'none';

interface DropEntry {
  itemKey: string;
  minCount: number;
  maxCount: number;
  chance: number;          // 0-1
  requiredToolTier?: number; // omit = no tool requirement
}

interface BlockDef {
  id: number;               // stable numeric id, stored in chunk arrays
  key: string;               // stable string id, used in saves/blueprints
  name: string;               // display name
  hardness: number;            // seconds to break bare-handed; Infinity = unbreakable
  toolType: ToolType;
  toolTier: number;              // 0-6, see 04 §3; 0 = no tier requirement
  lightEmission: number;          // 0-15
  lightOpacity: number;            // 0-15
  flammable: false | { spreadChance: number; burnOutChance: number; leavesAsh: boolean };
  solid: boolean;
  transparentToRender: boolean;
  gravityAffected: boolean;
  dropTable: DropEntry[];
  textureKeys: { top: string; bottom: string; side: string } | { all: string };
}
```

## 2. Item & inventory (`data/items.ts`)

Referenced throughout
[04 — Items, Inventory & Crafting](04-items-inventory-crafting.md).

```ts
type ItemCategory =
  | 'block' | 'raw_material' | 'refined_material' | 'tool' | 'weapon'
  | 'armor' | 'food' | 'tonic' | 'crafting_component' | 'utility';

interface ItemDef {
  id: number;
  key: string;
  name: string;
  category: ItemCategory;
  maxStack: number;              // 1, 16, or 64
  tier?: number;                   // for tools/weapons/armor, 0-6 (04 §3)
  durability?: number;              // max uses, for tools/weapons/armor
  toolType?: ToolType;
  miningSpeedMultiplier?: number;
  weaponDamageMultiplier?: number;
  armorSlot?: 'head' | 'chest' | 'legs' | 'feet' | 'offhand';
  armorDamageReduction?: number;
  nutrition?: number;                // 0-20, food only
  saturation?: number;                 // food only
  runeSlots?: number;                    // 0-4
}

interface RuneInstance {
  runeKey: string;      // e.g. 'keen_edge'
  level: number;         // I-V, stored as 1-5
}

interface ItemStack {
  itemKey: string;
  count: number;
  durabilityRemaining?: number;
  runes?: RuneInstance[];
  customName?: string;      // from Marking Collar / Anvil Stone rename
}
```

## 3. Recipes (`data/recipes.ts`)

Referenced in
[04 — Items, Inventory & Crafting](04-items-inventory-crafting.md) §4, §9.

```ts
type CraftingStation = 'inventory' | 'workbench' | 'hearth_furnace' |
  'blast_hearth' | 'alchemy_basin' | 'anvil_stone' | 'loom_frame' |
  'runeforge';

interface GridRecipe {
  kind: 'shaped';
  station: CraftingStation;
  grid: (string | null)[][];  // 2x2 or 3x3, null = empty cell, string = ingredient key
  ingredientKeys: Record<string, string>; // grid symbol -> itemKey
  outputKey: string;
  outputCount: number;
}

interface ShapelessRecipe {
  kind: 'shapeless';
  station: CraftingStation;
  ingredients: { itemKey: string; count: number }[];
  outputKey: string;
  outputCount: number;
}

interface SmeltingRecipe {
  kind: 'smelting';
  station: 'hearth_furnace' | 'blast_hearth';
  inputKey: string;
  outputKey: string;
  outputCount: number;
  smeltTimeTicks: number;
}

type Recipe = GridRecipe | ShapelessRecipe | SmeltingRecipe;
```

## 4. World, chunk, and coordinate types

Referenced in
[01 — Tech Stack & Architecture](01-tech-stack-architecture.md) §4 and
[02 — World Generation](02-world-generation.md).

```ts
interface ChunkCoord { cx: number; cy: number; cz: number; }

interface Chunk {
  coord: ChunkCoord;
  blocks: Uint16Array;      // length 32*32*32, index = x | y<<5 | z<<10
  skyLight: Uint8Array;      // length 32*32*32, 0-15
  blockLight: Uint8Array;     // length 32*32*32, 0-15
  dirty: boolean;               // needs re-mesh
  modifiedFromGenerated: boolean; // needs persisting
}

interface World {
  seed: number;
  worldType: 'standard' | 'superflat' | 'amplified' | 'islands';
  extendedDepth: boolean;
  worldTime: number;             // ticks, 24000/day
  weather: 'clear' | 'rain' | 'snow' | 'thunderstorm' | 'sandstorm';
  chunks: Map<string, Chunk>;    // key = `${cx},${cy},${cz}`
  entities: Entity[];
  spawnPoint: { x: number; y: number; z: number };
}
```

## 5. Blueprint / schematic format

Referenced in [06 — Building Tools](06-building-tools.md) §2.4 and
[02 — World Generation](02-world-generation.md) §6 (shared format).

```ts
interface BlueprintBlockRun {
  dx: number; dy: number; dz: number;  // relative to blueprint origin
  blockKey: string;
  runLength: number;    // consecutive blocks along +x, for RLE compression
}

interface Blueprint {
  id: string;
  name: string;
  dimensions: { x: number; y: number; z: number };
  blocks: BlueprintBlockRun[];
  thumbnailDataUrl?: string;
  schemaVersion: number;
  createdAt: number;   // epoch ms
}
```

## 6. Entities & creatures

Referenced in [08 — Mobs & Creatures](08-mobs-creatures.md) and
[05 — Player Mechanics](05-player-mechanics.md).

```ts
type CreatureCategory = 'passive' | 'neutral' | 'hostile' | 'aquatic';
type AIState = 'idle' | 'alert' | 'flee' | 'attack' | 'follow' | 'sit';

interface CreatureDef {
  id: number;
  key: string;
  name: string;
  category: CreatureCategory;
  maxHealth: number;
  moveSpeed: number;
  attackDamage?: number;
  attackCooldownTicks?: number;
  detectionRadius: number;
  eligibleBiomes: string[];         // biome keys
  spawnMinLight?: number;
  spawnMaxLight?: number;
  dropTable: DropEntry[];
  tameItemKey?: string;
  breedItemKey?: string;
}

interface Entity {
  entityId: string;         // uuid, session-scoped
  kind: 'player' | 'creature' | 'dropped_item' | 'projectile';
  creatureKey?: string;        // if kind === 'creature'
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  rotationY: number;
  health?: number;
  aiState?: AIState;
  tamed?: boolean;
  ownerName?: string;
  customName?: string;
  despawnAtTick?: number;      // dropped items
}

interface PlayerState extends Entity {
  kind: 'player';
  hunger: number;              // 0-20
  saturation: number;
  stamina: number;               // 0-100
  oxygen: number;                  // 0-max, underwater only
  inventory: (ItemStack | null)[]; // length 36
  armor: (ItemStack | null)[];       // length 4
  offhand: ItemStack | null;
  gameMode: 'survival' | 'creative' | 'adventure' | 'spectator';
  spawnPoint: { x: number; y: number; z: number };
}
```

## 7. Tick scheduler

Referenced in [11 — Physics & Fluids](11-physics-fluids.md) §5.

```ts
type TickType = 'fluid_flow' | 'gravity_check' | 'fire_spread' |
  'crop_growth' | 'mycelium_spread' | 'signal_propagation';

interface ScheduledTick {
  chunkKey: string;
  localIndex: number;    // 0-32767, position within chunk
  tickType: TickType;
  dueAtTick: number;
}
```

## 8. Persistence (IndexedDB object store shapes)

Referenced in [14 — Persistence & Saves](14-persistence-saves.md).

```ts
interface WorldRecord {
  id: string;
  name: string;
  seed: number;
  worldType: World['worldType'];
  gameMode: PlayerState['gameMode'];
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard';
  createdAt: number;
  lastPlayedAt: number;
  playTimeSeconds: number;
  thumbnailDataUrl?: string;
  schemaVersion: number;
}

interface WorldStateRecord {
  worldId: string;
  worldTime: number;
  weather: World['weather'];
  player: PlayerState;
  entities: Entity[];       // non-player entities worth persisting (tamed/named)
  schemaVersion: number;
}

type ChunkDiff =
  | { kind: 'sparse'; overrides: { localIndex: number; blockId: number }[] }
  | { kind: 'full'; blocks: Uint16Array };

interface ChunkRecord {
  worldId: string;
  coordKey: string;    // `${cx},${cy},${cz}`
  diff: ChunkDiff;
  schemaVersion: number;
}

interface SettingsRecord {
  video: Record<string, unknown>;
  audio: { master: number; music: number; ambient: number; sfx: number };
  controls: Record<string, string>;   // action key -> bound input
  accessibility: Record<string, boolean | number>;
  gameplay: Record<string, boolean>;
}
```

## 9. Biome definitions

Referenced in [02 — World Generation](02-world-generation.md) §3.

```ts
interface BiomeDef {
  key: string;
  name: string;
  temperatureRange: [number, number];   // -1 to 1
  moistureRange: [number, number];        // -1 to 1
  surfaceBlockKey: string;
  subsurfaceBlockKey: string;
  treeKeys: string[];
  treeDensity: number;      // 0-1
  foliageDensity: number;
  fogColorTint: string;      // hex
  eligibleCreatureKeys: string[];
  isOcean: boolean;
  isUnderground: boolean;
}
```

## 10. ID range conventions

To keep the ~420-block and ~200+-item catalogs (see
[03](03-blocks-materials.md) §3,
[04](04-items-inventory-crafting.md)) organized and to leave room for
content growth without renumbering, numeric IDs are allocated in
reserved bands:

| Range | Reserved for |
|---|---|
| 0 | Air (always block id 0) |
| 1–999 | Terrain & stone family blocks |
| 1000–1499 | Ore blocks |
| 1500–1999 | Wood family blocks |
| 2000–2499 | Plant & vegetation blocks |
| 2500–2999 | Liquid blocks (all flow states) |
| 3000–3499 | Functional / crafting-station blocks |
| 3500–3999 | Light source blocks |
| 4000–4999 | Glass & transparent blocks |
| 5000–5999 | Wool / dye / color-family blocks |
| 6000–7999 | Building & decorative blocks (slabs/stairs/fences/walls/doors) |
| 8000–8499 | Logic (Sparkwire) blocks |
| 8500–8999 | Unbreakable / world blocks |
| 9000–65535 | Reserved for future content and resource-pack/modding custom blocks (see [19](19-modding-api.md) §3) |

Item IDs follow an analogous banded scheme in `data/items.ts`, documented
inline in that file once implementation begins; this table exists so the
banding *policy* — leave generous headroom per category, never reuse a
retired ID — is decided once, here, rather than improvised ad hoc during
implementation.
