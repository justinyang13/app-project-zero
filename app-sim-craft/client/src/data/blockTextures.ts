// Registry of the procedurally-painted block textures (see
// rendering/blockPainter.ts for how each one is drawn). Pure data with no
// DOM/three dependency so the mesh worker can resolve a block's texture
// layer without pulling in any painting code. Every texture is a square
// tile; an animated one (lava, flame) occupies `frames` consecutive layers
// of the texture array and the shader steps through them over time.
export const TEXTURE_SIZE = 16;

export interface TextureDef {
  key: string;
  frames: number;
  /**
   * Interchangeable look-alikes painted on consecutive layers: the shader
   * picks one per block position from a hash, so a big flat meadow or road
   * doesn't visibly repeat one 16x16 tile. (A texture is either animated —
   * `frames` — or varied — `variants` — never both.)
   */
  variants?: number;
}

export const TEXTURE_DEFS: TextureDef[] = [
  { key: "gloomstone", frames: 1 },
  { key: "gloom_brick", frames: 1 },
  { key: "gloom_brick_cracked", frames: 1 },
  { key: "gloom_brick_mossy", frames: 1 },
  { key: "gloom_polished", frames: 1 },
  { key: "gloom_runed", frames: 1 },
  { key: "gloom_column_side", frames: 1 },
  { key: "umbral_slate", frames: 1 },
  { key: "umbral_cobble", frames: 1 },
  { key: "gloom_moss_top", frames: 1 },
  { key: "gloom_moss_side", frames: 1 },
  { key: "magma", frames: 8 },
  { key: "ember_brick", frames: 1 },
  { key: "ember_lattice", frames: 1 },
  { key: "dark_lattice", frames: 1 },
  { key: "iron_grate", frames: 1 },
  { key: "brazier_flame", frames: 6 },
  { key: "ashslate", frames: 1 },
  { key: "crimson_brick", frames: 1 },
  { key: "nightglass", frames: 1 },
  { key: "brazier_top", frames: 1 },
  { key: "brazier_side", frames: 1 },
  { key: "ember_lamp", frames: 1 },
  { key: "crimson_runner", frames: 1 },
  { key: "ashslate_ridge", frames: 1 },
  { key: "gilded_trim", frames: 1 },
  { key: "rust_rock", frames: 1 },
  { key: "oak_bark", frames: 1 },
  { key: "oak_log_top", frames: 1 },
  { key: "birch_bark", frames: 1 },
  { key: "birch_log_top", frames: 1 },
  { key: "cherry_bark", frames: 1 },
  { key: "cherry_log_top", frames: 1 },
  { key: "willow_bark", frames: 1 },
  { key: "willow_log_top", frames: 1 },
  { key: "snow_top", frames: 1 },
  { key: "snow_side", frames: 1 },
  { key: "loam_dirt", frames: 1 },
  { key: "glow_vine", frames: 1 },
  // Everyday ground and building materials (painted in rendering/blockPainter.ts).
  { key: "grass_top", frames: 1, variants: 4 },
  { key: "grass_side", frames: 1, variants: 2 },
  { key: "grass_dusk_top", frames: 1, variants: 4 },
  { key: "grass_dusk_side", frames: 1, variants: 2 },
  { key: "grass_withered_top", frames: 1, variants: 4 },
  { key: "grass_withered_side", frames: 1, variants: 2 },
  { key: "dirt", frames: 1, variants: 4 },
  { key: "stone", frames: 1, variants: 4 },
  { key: "cobble", frames: 1, variants: 2 },
  { key: "sand", frames: 1, variants: 4 },
  { key: "sandstone_top", frames: 1, variants: 2 },
  { key: "sandstone_side", frames: 1, variants: 2 },
  { key: "gravel", frames: 1, variants: 4 },
  { key: "farmland_top", frames: 1, variants: 2 },
  { key: "asphalt", frames: 1, variants: 4 },
  { key: "planks", frames: 1, variants: 2 },
  { key: "plaster", frames: 1, variants: 2 },
  { key: "roof_terracotta", frames: 1, variants: 2 },
  { key: "roof_brown", frames: 1, variants: 2 },
  { key: "roof_slate", frames: 1, variants: 2 },
];

const layerByKey = new Map<string, number>();
const framesByKey = new Map<string, number>();
const variantsByKey = new Map<string, number>();
let nextLayer = 0;
for (const def of TEXTURE_DEFS) {
  layerByKey.set(def.key, nextLayer);
  framesByKey.set(def.key, def.frames);
  variantsByKey.set(def.key, def.variants ?? 1);
  nextLayer += def.variants ?? def.frames;
}

/** Total layers in the texture array (animated textures count once per frame). */
export const TEXTURE_LAYER_COUNT = nextLayer;

/** First layer of a texture's frames. */
export function textureLayer(key: string): number {
  const layer = layerByKey.get(key);
  if (layer === undefined) throw new Error(`Unknown block texture: ${key}`);
  return layer;
}

export function textureFrames(key: string): number {
  return framesByKey.get(key) ?? 1;
}

/** How many interchangeable variants a texture has (1 if it has just the one look). */
export function textureVariants(key: string): number {
  return variantsByKey.get(key) ?? 1;
}
