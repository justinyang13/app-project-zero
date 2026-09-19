// Terrain generation pipeline, scoped down from
// spec/02-world-generation.md §2: climate sampling + a 2D heightmap
// (steps 1-3) and the surface pass (step 5). No 3D density field/
// overhangs, caves, ores, structures, or vegetation yet (steps 4, 6-9
// are Phase 4/5 per spec/22-roadmap-milestones.md) — this is the minimum
// pipeline that produces real, varied, deterministic terrain to walk on
// and mine into.
import { CHUNK_SIZE, Chunk } from "../Chunk";
import { fbm2D, seededNoise2D } from "./noise";
import { pickBiome, CRAG_BIOME, type BiomeDef } from "./biomes";
import { getBlockByKey } from "../../data/blocks";
import { placeTrees } from "./trees";
import { stampStructures, structureMaxYFor } from "./structures";
import { isRoadColumn, isBridgeDeckColumn, FLAT_ROAD_Y } from "./roads";
import { mountainHeightBoost } from "./mountain";
import { deepLakeHeight } from "./deepLake";
import { applyCrag, cragBodyBlock, cragSurfaceBlock, CRAG_NONE } from "./castle/crag";

const SALT_TEMPERATURE = 0x5eed01;
const SALT_HEIGHT = 0x5eed02;

const STONE_ID = getBlockByKey("greystone").id;
export const WATER_ID = getBlockByKey("water").id;
const ROAD_ID = getBlockByKey("asphalt").id;
const PLANK_ID = getBlockByKey("plank").id;
const LOG_ID = getBlockByKey("log").id;
const BRIDGE_PILLAR_SPACING = 10; // blocks between the support pillars under a bridge (leaves wide gaps for fish and whales to swim through)

// Any column whose surface height falls below this gets flooded up to it
// at generation time, forming lakes wherever the noise-based heightmap
// naturally dips low — a global rule rather than a hand-placed pond, so
// it's part of the deterministic pipeline like everything else here (no
// flow simulation yet, see the water BlockDef's own note).
export const SEA_LEVEL = 64;

// Vertical room above the tallest column reserved for trees — the tallest
// pine (worldgen/trees.ts) tops out 16 blocks above its ground.
const TREE_HEADROOM = 18;

export interface ColumnSample {
  height: number;
  biome: BiomeDef;
  /** Nonzero where the castle's crag or approach ramp shapes this column (see worldgen/castle/crag.ts); it picks the column's blocks. */
  crag: number;
}

/** Pure function of (seed, world x/z) — see spec/01-tech-stack-architecture.md §9. */
export function sampleColumn(seed: number, worldX: number, worldZ: number): ColumnSample {
  const tempNoise = seededNoise2D(seed, SALT_TEMPERATURE);
  const heightNoise = seededNoise2D(seed, SALT_HEIGHT);

  const temperature = fbm2D(tempNoise, worldX, worldZ, 2, 1 / 256);
  const biome = pickBiome(temperature);

  const detail = fbm2D(heightNoise, worldX, worldZ, 4, 1 / 96, 0.5);
  const naturalHeight =
    Math.round(biome.heightBase + detail * biome.heightAmplitude) + mountainHeightBoost(seed, worldX, worldZ);
  const lakeHeight = deepLakeHeight(naturalHeight, worldX, worldZ, SEA_LEVEL);
  const { height, kind } = applyCrag(lakeHeight, worldX, worldZ);

  return { height, biome: kind === CRAG_NONE ? biome : CRAG_BIOME, crag: kind };
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

  // Headroom above the tallest column (TREE_HEADROOM — enough for a tall
  // pine) so a tree's trunk+canopy never
  // needs a vertical chunk that wasn't allocated (see worldgen/trees.ts),
  // plus whatever a fixed structure overlapping this chunk needs (a
  // castle tower reaches well above typical terrain — see
  // worldgen/structures.ts).
  const maxCy = maxChunkYFor(Math.max(maxHeight + TREE_HEADROOM, SEA_LEVEL, FLAT_ROAD_Y, structureMaxYFor(seed, cx, cz)));
  const chunks: Chunk[] = [];
  for (let cy = 0; cy <= maxCy; cy++) chunks.push(new Chunk({ cx, cy, cz }));

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const { height, biome, crag } = columns[lx * CHUNK_SIZE + lz];

      // The loop road is flattened, not just surface-painted: every
      // column under it is cut/filled to a single constant elevation
      // (FLAT_ROAD_Y) regardless of the natural heightmap, cutting
      // through hills and bridging over lakes so the whole loop reads
      // as genuinely flat (see worldgen/roads.ts).
      const worldX = cx * CHUNK_SIZE + lx;
      const worldZ = cz * CHUNK_SIZE + lz;
      const isRoad = isRoadColumn(worldX, worldZ);
      // Over water the road is a bridge rather than a causeway: just a
      // deck (and a few pillars) at road height with open water and air
      // beneath, so fish can swim under it and around the lake.
      const isBridge = height < SEA_LEVEL && isBridgeDeckColumn(worldX, worldZ);
      const isPillar = worldX % BRIDGE_PILLAR_SPACING === 0 && worldZ % BRIDGE_PILLAR_SPACING === 0;
      const filledTop = isRoad || isBridge ? FLAT_ROAD_Y : Math.max(height, SEA_LEVEL); // top of road/lake/bare ground

      for (let cy = 0; cy <= maxCy; cy++) {
        const chunk = chunks[cy];
        const baseY = cy * CHUNK_SIZE;
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          const worldY = baseY + ly;
          if (worldY > filledTop) break; // above the road/water/surface: leave as air (id 0)
          const idx = lx | (ly << 5) | (lz << 10);
          chunk.skyLight[idx] = 0;
          if (isBridge) {
            if (worldY === FLAT_ROAD_Y) chunk.blocks[idx] = isRoad ? ROAD_ID : PLANK_ID;
            else if (worldY === FLAT_ROAD_Y - 1) chunk.blocks[idx] = PLANK_ID; // deck underside
            else if (worldY > height && isPillar) chunk.blocks[idx] = LOG_ID;
            else if (worldY > SEA_LEVEL) chunk.skyLight[idx] = 15; // open air under the deck
            else if (worldY > height) chunk.blocks[idx] = WATER_ID;
            else if (worldY === height) chunk.blocks[idx] = biome.surfaceBlock;
            else if (worldY >= height - 3) chunk.blocks[idx] = biome.subsurfaceBlock;
            else chunk.blocks[idx] = STONE_ID;
          } else if (crag !== CRAG_NONE && !isRoad) {
            // The castle's crag / approach ramp: dark rock all the way down, since its cliffs expose every layer.
            if (worldY > height) chunk.blocks[idx] = WATER_ID;
            else if (worldY === height) chunk.blocks[idx] = cragSurfaceBlock(worldX, worldZ, crag);
            else chunk.blocks[idx] = cragBodyBlock(worldX, worldY, worldZ, height, crag);
          } else if (isRoad) {
            if (worldY === FLAT_ROAD_Y) chunk.blocks[idx] = ROAD_ID;
            else if (worldY >= FLAT_ROAD_Y - 3) chunk.blocks[idx] = biome.subsurfaceBlock;
            else chunk.blocks[idx] = STONE_ID;
          } else if (worldY > height) chunk.blocks[idx] = WATER_ID;
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
