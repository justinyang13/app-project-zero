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
  dropTable: DropEntry[];
  color: number; // placeholder flat color until textures land (18-visual-art-direction.md §3)
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
];

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
