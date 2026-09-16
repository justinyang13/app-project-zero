// Terrain generation pipeline, scoped down from
// spec/02-world-generation.md §2: climate sampling + a 2D heightmap
// (steps 1-3) and the surface pass (step 5). No 3D density field/
// overhangs, caves, ores, structures, or vegetation yet (steps 4, 6-9
// are Phase 4/5 per spec/22-roadmap-milestones.md) — this is the minimum
// pipeline that produces real, varied, deterministic terrain to walk on
// and mine into.
import { CHUNK_SIZE, Chunk } from "../Chunk";
import { fbm2D, seededNoise2D } from "./noise";
import { pickBiome, type BiomeDef } from "./biomes";
import { getBlockByKey } from "../../data/blocks";
import { placeTrees } from "./trees";
import { stampStructures, structureMaxYFor } from "./structures";

const SALT_TEMPERATURE = 0x5eed01;
const SALT_HEIGHT = 0x5eed02;

const STONE_ID = getBlockByKey("greystone").id;
const WATER_ID = getBlockByKey("water").id;

// Any column whose surface height falls below this gets flooded up to it
// at generation time, forming lakes wherever the noise-based heightmap
// naturally dips low — a global rule rather than a hand-placed pond, so
// it's part of the deterministic pipeline like everything else here (no
// flow simulation yet, see the water BlockDef's own note).
export const SEA_LEVEL = 64;

export interface ColumnSample {
  height: number;
  biome: BiomeDef;
}

/** Pure function of (seed, world x/z) — see spec/01-tech-stack-architecture.md §9. */
export function sampleColumn(seed: number, worldX: number, worldZ: number): ColumnSample {
  const tempNoise = seededNoise2D(seed, SALT_TEMPERATURE);
  const heightNoise = seededNoise2D(seed, SALT_HEIGHT);

  const temperature = fbm2D(tempNoise, worldX, worldZ, 2, 1 / 256);
  const biome = pickBiome(temperature);

  const detail = fbm2D(heightNoise, worldX, worldZ, 4, 1 / 96, 0.5);
  const height = Math.round(biome.heightBase + detail * biome.heightAmplitude);

  return { height, biome };
}

/** Highest chunk-Y layer (inclusive) that can contain solid terrain for a max column height. */
export function maxChunkYFor(height: number): number {
  return Math.floor((height + 2) / CHUNK_SIZE);
}

/**
 * Generates every vertical chunk (cy 0..maxCy) for one chunk column
 * (cx, cz), filling blocks per-column from `sampleColumn` and an initial
 * top-down sky-light flood (correct as-generated, since this pipeline
 * has no overhangs — see engine/Lighting.ts for the post-edit case,
 * which does handle overhangs created by later block edits).
 */
export function generateColumn(seed: number, cx: number, cz: number): Chunk[] {
  const columns: ColumnSample[] = Array.from({ length: CHUNK_SIZE * CHUNK_SIZE });
  let maxHeight = 0;

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const sample = sampleColumn(seed, cx * CHUNK_SIZE + lx, cz * CHUNK_SIZE + lz);
      columns[lx * CHUNK_SIZE + lz] = sample;
      if (sample.height > maxHeight) maxHeight = sample.height;
    }
  }

  // +8 headroom above the tallest column so a tree's trunk+canopy never
  // needs a vertical chunk that wasn't allocated (see worldgen/trees.ts),
  // plus whatever a fixed structure overlapping this chunk needs (a
  // castle tower reaches well above typical terrain — see
  // worldgen/structures.ts).
  const maxCy = maxChunkYFor(Math.max(maxHeight + 8, SEA_LEVEL, structureMaxYFor(seed, cx, cz)));
  const chunks: Chunk[] = [];
  for (let cy = 0; cy <= maxCy; cy++) chunks.push(new Chunk({ cx, cy, cz }));

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const { height, biome } = columns[lx * CHUNK_SIZE + lz];
      const filledTop = Math.max(height, SEA_LEVEL); // top of lake water, or bare ground if above sea level

      for (let cy = 0; cy <= maxCy; cy++) {
        const chunk = chunks[cy];
        const baseY = cy * CHUNK_SIZE;
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          const worldY = baseY + ly;
          if (worldY > filledTop) break; // above the water/surface: leave as air (id 0)
          const idx = lx | (ly << 5) | (lz << 10);
          chunk.skyLight[idx] = 0;
          if (worldY > height) chunk.blocks[idx] = WATER_ID;
          else if (worldY === height) chunk.blocks[idx] = biome.surfaceBlock;
          else if (worldY >= height - 3) chunk.blocks[idx] = biome.subsurfaceBlock;
          else chunk.blocks[idx] = STONE_ID;
        }
      }
    }
  }

  placeTrees(seed, cx, cz, columns, chunks);
  stampStructures(seed, cx, cz, chunks);

  for (const chunk of chunks) chunk.dirty = true;
  return chunks;
}

function biomeIndex(biome: BiomeDef): number {
  if (biome.key === "desert") return 1;
  if (biome.key === "tundra") return 2;
  return 0;
}

/** Dominant biome for a column, sampled at its center — good enough for the debug overlay. */
export function sampleBiomeIndexAt(seed: number, worldX: number, worldZ: number): number {
  return biomeIndex(sampleColumn(seed, worldX, worldZ).biome);
}

export function biomeKeyFromIndex(index: number): string {
  return ["meadow", "desert", "tundra"][index] ?? "meadow";
}
