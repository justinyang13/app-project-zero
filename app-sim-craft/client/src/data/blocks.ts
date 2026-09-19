// Small block catalog for the early build. See
// spec/03-blocks-materials.md for the full ~420-block target catalog;
// this is the slice needed for generated terrain, lakes, and building.
export type ToolType = "pickaxe" | "axe" | "shovel" | "shears" | "none";

export interface DropEntry {
  itemKey: string;
  minCount: number;
  maxCount: number;
  chance: number;
  requiredToolTier?: number;
}

export interface BlockDef {
  id: number;
  key: string;
  name: string;
  hardness: number;
  toolType: ToolType;
  toolTier: number;
  lightEmission: number;
  lightOpacity: number;
  flammable: false | { spreadChance: number; burnOutChance: number; leavesAsh: boolean };
  solid: boolean;
  transparentToRender: boolean;
  gravityAffected: boolean;
  // Passable to player collision (no walking into a wall) and swum
  // through rather than walked on — see engine/Player.ts. Only water
  // today; unset/false for everything else.
  liquid?: boolean;
  // Rendered with the procedural alpha-cutout leaf pattern (own
  // mesh/material, see rendering/leafTexture.ts and
  // engine/ChunkManager.ts) instead of a flat-colored solid cube. Only
  // the leaf variants today; unset/false for everything else.
  foliage?: boolean;
  // Painted with a pixel-art texture (data/blockTextures.ts) instead of a
  // flat color, in the "textured" mesh layer (see rendering/greedyMesh.ts
  // and rendering/texturedMaterial.ts) — the layer that also carries
  // see-through cut-outs, emissive (self-lit) pixels, and animation.
  tex?: BlockTexture;
  // "cross" draws two intersecting diagonal quads (like a flame or a
  // flower) instead of a cube; such a block is never solid.
  shape?: "cube" | "cross";
  // Light this block gives off into the surrounding air, baked into the
  // castle's block-light map (worldgen/castle/lightMap.ts) — level 0-15,
  // falling off one step per block. `stride` thins out big emitter fields
  // (a lava river) so every Nth cell is a source instead of all of them.
  glow?: { level: number; stride?: number };
  dropTable: DropEntry[];
  color: number; // placeholder flat color until textures land (18-visual-art-direction.md §3)
}

/** Texture keys (data/blockTextures.ts) per face. `all` covers any face not otherwise named. */
export interface BlockTexture {
  all?: string;
  top?: string;
  bottom?: string;
  side?: string;
}

export const AIR_ID = 0;

export const BLOCKS: BlockDef[] = [
  {
    id: 0,
    key: "air",
    name: "Air",
    hardness: 0,
    toolType: "none",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 0,
    flammable: false,
    solid: false,
    transparentToRender: true,
    gravityAffected: false,
    dropTable: [],
    color: 0x000000,
  },
  {
    id: 1,
    key: "loam",
    name: "Loam",
    hardness: 0.5,
    toolType: "shovel",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 15,
    flammable: false,
    solid: true,
    transparentToRender: false,
    gravityAffected: false,
    dropTable: [{ itemKey: "loam", minCount: 1, maxCount: 1, chance: 1 }],
    color: 0x8a5a35,
  },
  {
    id: 2,
    key: "turf",
    name: "Turf",
    hardness: 0.6,
    toolType: "shovel",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 15,
    flammable: false,
    solid: true,
    transparentToRender: false,
    gravityAffected: false,
    dropTable: [{ itemKey: "loam", minCount: 1, maxCount: 1, chance: 1 }],
    color: 0x6fbf3f,
  },
  {
    id: 3,
    key: "greystone",
    name: "Greystone",
    hardness: 1.5,
    toolType: "pickaxe",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 15,
    flammable: false,
    solid: true,
    transparentToRender: false,
    gravityAffected: false,
    dropTable: [{ itemKey: "greystone_cobble", minCount: 1, maxCount: 1, chance: 1 }],
    color: 0x9d9d9a,
  },
  {
    id: 4,
    key: "dune_sand",
    name: "Dune Sand",
    hardness: 0.5,
    toolType: "shovel",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 15,
    flammable: false,
    solid: true,
    transparentToRender: false,
    gravityAffected: false,
    dropTable: [{ itemKey: "dune_sand", minCount: 1, maxCount: 1, chance: 1 }],
    color: 0xf2da8f,
  },
  {
    id: 5,
    key: "frost_turf",
    name: "Frost Turf",
    hardness: 0.6,
    toolType: "shovel",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 15,
    flammable: false,
    solid: true,
    transparentToRender: false,
    gravityAffected: false,
    dropTable: [{ itemKey: "loam", minCount: 1, maxCount: 1, chance: 1 }],
    color: 0xf0faf9,
  },
  {
    id: 6,
    key: "sandstone",
    name: "Sandstone",
    hardness: 1.2,
    toolType: "pickaxe",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 15,
    flammable: false,
    solid: true,
    transparentToRender: false,
    gravityAffected: false,
    dropTable: [{ itemKey: "sandstone", minCount: 1, maxCount: 1, chance: 1 }],
    color: 0xe3cd9a,
  },
  {
    id: 7,
    key: "water",
    name: "Water",
    // Rendered as a semi-transparent cube (own mesh/material, see
    // rendering/greedyMesh.ts and engine/ChunkManager.ts) and swimmable
    // (`liquid: true` below) — still not a true fluid sim, no flow/
    // spread or currents (that's the full spec/11-physics-fluids.md
    // system, later-phase work). It fills lake basins at world-gen time
    // (see engine/worldgen/terrain.ts's SEA_LEVEL) and can otherwise be
    // placed/mined like any other block.
    hardness: 0,
    toolType: "none",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 15,
    flammable: false,
    solid: true,
    transparentToRender: true,
    gravityAffected: false,
    liquid: true,
    dropTable: [{ itemKey: "water", minCount: 1, maxCount: 1, chance: 1 }],
    color: 0x3fa0e8,
  },
  {
    id: 8,
    key: "log",
    name: "Greenwood Log",
    hardness: 1.0,
    toolType: "axe",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 15,
    flammable: { spreadChance: 0.3, burnOutChance: 0.4, leavesAsh: true },
    solid: true,
    transparentToRender: false,
    gravityAffected: false,
    dropTable: [{ itemKey: "log", minCount: 1, maxCount: 1, chance: 1 }],
    color: 0x6b4a30,
  },
  // Leaves are rendered as plain opaque blocks like water/log (no alpha-
  // tested transparency pass yet — that's spec/10-lighting-rendering.md
  // §5's later-phase work). Four color variants per spec's request for
  // "trees of different colors" — see engine/worldgen/trees.ts for how a
  // tree instance picks one.
  leafVariant(9, "leaves_green", "Greenwood Leaves", 0x4fae3e),
  leafVariant(10, "leaves_autumn", "Amberleaf Leaves", 0xe08a35),
  leafVariant(11, "leaves_gold", "Sunleaf Leaves", 0xf0c94a),
  leafVariant(12, "leaves_frost", "Frostleaf Leaves", 0xd8f2ea),
  {
    id: 13,
    key: "plank",
    name: "Sawn Plank",
    hardness: 0.8,
    toolType: "axe",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 15,
    flammable: { spreadChance: 0.4, burnOutChance: 0.35, leavesAsh: true },
    solid: true,
    transparentToRender: false,
    gravityAffected: false,
    dropTable: [{ itemKey: "plank", minCount: 1, maxCount: 1, chance: 1 }],
    color: 0xc9a066,
  },
  {
    id: 14,
    key: "roof_tile",
    name: "Terracotta Roof Tile",
    hardness: 1.2,
    toolType: "pickaxe",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 15,
    flammable: false,
    solid: true,
    transparentToRender: false,
    gravityAffected: false,
    dropTable: [{ itemKey: "roof_tile", minCount: 1, maxCount: 1, chance: 1 }],
    color: 0xb5502a,
  },
  {
    id: 15,
    key: "asphalt",
    name: "Asphalt",
    // Painted over the terrain surface by the road grid (see
    // engine/worldgen/roads.ts) instead of being hand-placed — it never
    // changes terrain height, just what's on top of it, same as the
    // biome surface swap in worldgen/biomes.ts.
    hardness: 1.0,
    toolType: "pickaxe",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 15,
    flammable: false,
    solid: true,
    transparentToRender: false,
    gravityAffected: false,
    dropTable: [{ itemKey: "asphalt", minCount: 1, maxCount: 1, chance: 1 }],
    color: 0x3c3c3e,
  },
  leafVariant(16, "leaves_pine", "Pine Needles", 0x143f28),
  leafVariant(17, "leaves_cherry", "Cherry Blossom", 0xf4a3c6),
  // --- the dark castle's palette (ids 18+) -------------------------------
  // Everything below renders in the textured layer. Gloomstone is the
  // castle's own dark volcanic rock; the crag it stands on is made of the
  // same stuff plus Umbral slate/cobble (see worldgen/castle/crag.ts).
  textured(18, "gloomstone", "Gloomstone", 1.8, { all: "gloomstone" }, 0x2e2a32),
  textured(19, "gloom_brick", "Gloom Brick", 2.0, { all: "gloom_brick" }, 0x3e3944),
  textured(20, "gloom_brick_cracked", "Cracked Gloom Brick", 1.6, { all: "gloom_brick_cracked" }, 0x3a3540),
  textured(21, "gloom_brick_mossy", "Mossy Gloom Brick", 2.0, { all: "gloom_brick_mossy" }, 0x3a4438),
  textured(22, "gloom_polished", "Polished Gloomstone", 2.0, { all: "gloom_polished" }, 0x36323c),
  textured(23, "gloom_runed", "Runed Gloomstone", 2.0, { all: "gloom_runed" }, 0x36323c, { glow: { level: 5, stride: 2 } }),
  textured(24, "gloom_column", "Gloom Column", 2.0, { side: "gloom_column_side", top: "gloom_polished", bottom: "gloom_polished" }, 0x36323c),
  textured(25, "umbral_slate", "Umbral Slate", 2.0, { all: "umbral_slate" }, 0x1e1e26),
  textured(26, "umbral_cobble", "Umbral Cobble", 1.8, { all: "umbral_cobble" }, 0x242430),
  textured(27, "gloom_moss", "Gloom Moss", 0.8, { top: "gloom_moss_top", side: "gloom_moss_side", bottom: "umbral_cobble" }, 0x2c4a26, { toolType: "shovel" }),
  textured(28, "magma", "Magma", 0, { all: "magma" }, 0xf0781a, {
    liquid: true,
    toolType: "none",
    glow: { level: 12, stride: 3 },
  }),
  textured(29, "ember_brick", "Emberveined Brick", 2.0, { all: "ember_brick" }, 0x4a2a24, { glow: { level: 7, stride: 2 } }),
  // Partial see-through: the pane corners are cut out and the amber glass
  // is emissive, so the window glows and you can still peer through it.
  textured(30, "ember_lattice", "Ember Lattice Window", 0.6, { all: "ember_lattice" }, 0xff9a30, {
    transparentToRender: true,
    glow: { level: 11, stride: 1 },
  }),
  textured(31, "dark_lattice", "Dark Lattice Window", 0.6, { all: "dark_lattice" }, 0x1c2438, { transparentToRender: true }),
  textured(32, "iron_grate", "Iron Grate", 1.5, { all: "iron_grate" }, 0x3a3640, { transparentToRender: true }),
  textured(33, "brazier_flame", "Brazier Flame", 0, { all: "brazier_flame" }, 0xff9a30, {
    solid: false,
    shape: "cross",
    transparentToRender: true,
    lightOpacity: 0,
    glow: { level: 14, stride: 1 },
  }),
  textured(34, "ashslate_roof", "Ashslate Roof Tile", 1.5, { all: "ashslate" }, 0x262a36),
  textured(35, "crimson_brick", "Crimson Brick", 2.0, { all: "crimson_brick" }, 0x602824),
  textured(36, "nightglass", "Nightglass", 4.0, { all: "nightglass" }, 0x120e1c),
  textured(37, "brazier", "Brazier", 2.0, { top: "brazier_top", side: "brazier_side", bottom: "brazier_side" }, 0x40252a, {
    glow: { level: 9, stride: 1 },
  }),
  textured(38, "ember_lamp", "Ember Lamp", 0.5, { all: "ember_lamp" }, 0xffc060, { glow: { level: 15, stride: 1 } }),
  textured(39, "crimson_runner", "Crimson Runner", 0.4, { all: "crimson_runner" }, 0x701820),
  textured(40, "ashslate_ridge", "Ashslate Ridge Tile", 1.5, { all: "ashslate_ridge" }, 0x3a3e4e),
  textured(41, "gilded_trim", "Gilded Trim", 2.0, { all: "gilded_trim" }, 0x845c2a),
  textured(42, "rust_rock", "Rustrock", 1.8, { all: "rust_rock" }, 0x5a3a2c),
  // The blighted ground around the crag: turf that darkens step by step
  // (turf -> dusk -> withered -> gloom moss -> bare rock) so the meadow
  // fades into the castle's dark rock instead of ending at a hard edge
  // (see worldgen/castle/crag.ts's castleBlight).
  flatTurf(43, "dusk_turf", "Dusk Turf", 0x589634),
  flatTurf(44, "withered_turf", "Withered Turf", 0x3e622b),
  // The lake bridge (worldgen/bridge.ts): a steel-blue box girder on pale concrete piers.
  flatStone(45, "bridge_steel", "Bridge Steel", 0x6a9fcc),
  flatStone(46, "bridge_concrete", "Bridge Concrete", 0xcac7be),
];

/** A textured (pixel-art) block. `overrides` tweak the defaults — see the notes on BlockDef for what each does. */
function textured(
  id: number,
  key: string,
  name: string,
  hardness: number,
  tex: BlockTexture,
  color: number,
  overrides: Partial<BlockDef> = {},
): BlockDef {
  return {
    id,
    key,
    name,
    hardness,
    toolType: "pickaxe",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 15,
    flammable: false,
    solid: true,
    transparentToRender: false,
    gravityAffected: false,
    tex,
    dropTable: [{ itemKey: key, minCount: 1, maxCount: 1, chance: 1 }],
    color,
    ...overrides,
  };
}

/** A turf variant: same as Turf but a different flat color. */
function flatTurf(id: number, key: string, name: string, color: number): BlockDef {
  return {
    id,
    key,
    name,
    hardness: 0.6,
    toolType: "shovel",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 15,
    flammable: false,
    solid: true,
    transparentToRender: false,
    gravityAffected: false,
    dropTable: [{ itemKey: "loam", minCount: 1, maxCount: 1, chance: 1 }],
    color,
  };
}

/** A plain flat-colored pickaxe block. */
function flatStone(id: number, key: string, name: string, color: number): BlockDef {
  return {
    id,
    key,
    name,
    hardness: 2.0,
    toolType: "pickaxe",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 15,
    flammable: false,
    solid: true,
    transparentToRender: false,
    gravityAffected: false,
    dropTable: [{ itemKey: key, minCount: 1, maxCount: 1, chance: 1 }],
    color,
  };
}

function leafVariant(id: number, key: string, name: string, color: number): BlockDef {
  return {
    id,
    key,
    name,
    hardness: 0.3,
    toolType: "shears",
    toolTier: 0,
    lightEmission: 0,
    lightOpacity: 1,
    flammable: { spreadChance: 0.6, burnOutChance: 0.3, leavesAsh: false },
    solid: true,
    transparentToRender: true,
    gravityAffected: false,
    foliage: true,
    dropTable: [{ itemKey: "leaves", minCount: 1, maxCount: 1, chance: 0.3 }],
    color,
  };
}

const byKey = new Map(BLOCKS.map((b) => [b.key, b]));
const byId = new Map(BLOCKS.map((b) => [b.id, b]));

export function getBlockByKey(key: string): BlockDef {
  const def = byKey.get(key);
  if (!def) throw new Error(`Unknown block key: ${key}`);
  return def;
}

export function getBlockById(id: number): BlockDef {
  const def = byId.get(id);
  if (!def) throw new Error(`Unknown block id: ${id}`);
  return def;
}

export const WATER_ID = getBlockByKey("water").id;

export function isLiquid(id: number): boolean {
  return id !== AIR_ID && (byId.get(id)?.liquid ?? false);
}

/** False for air and for non-solid decorations (a flame): things the player walks straight through. */
export function isSolidBlock(id: number): boolean {
  return id !== AIR_ID && (byId.get(id)?.solid ?? false);
}
