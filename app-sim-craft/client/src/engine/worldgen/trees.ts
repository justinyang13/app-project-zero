// Deterministic tree placement — a small slice of
// spec/02-world-generation.md §2 step 9 (vegetation pass). Scoped down:
// only two biomes grow trees (no desert cacti yet), canopies are a fixed
// blob shape, and placement is skipped within 1 block of a chunk edge so
// a canopy never needs to write into a neighboring (possibly not-yet-
// generated) chunk column — a deliberate simplification rather than
// building cross-chunk vegetation stitching for this pass.
import { CHUNK_SIZE, Chunk } from "../Chunk";
import { getBlockByKey } from "../../data/blocks";
import { SEA_LEVEL, type ColumnSample } from "./terrain";
import { isRoadColumn } from "./roads";

const LOG_ID = getBlockByKey("log").id;
const LEAF_IDS = [
  getBlockByKey("leaves_green").id,
  getBlockByKey("leaves_autumn").id,
  getBlockByKey("leaves_gold").id,
  getBlockByKey("leaves_frost").id,
];

const TREE_DENSITY: Record<string, number> = {
  meadow: 0.025,
  tundra: 0.012,
  desert: 0,
};

/** Deterministic pseudo-random float in [0, 1) from (seed, world x, z, salt) — not a noise field, just a placement coin-flip. */
function hash01(seed: number, x: number, z: number, salt: number): number {
  let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(salt, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function setTreeVoxel(chunks: Chunk[], lx: number, lz: number, worldY: number, blockId: number, onlyIfAir: boolean): void {
  const cy = Math.floor(worldY / CHUNK_SIZE);
  const chunk = chunks[cy];
  if (!chunk) return; // out of the generated vertical range — shouldn't happen given the +8 headroom in generateColumn
  const ly = worldY - cy * CHUNK_SIZE;
  const idx = lx | (ly << 5) | (lz << 10);
  if (onlyIfAir && chunk.blocks[idx] !== 0) return;
  chunk.blocks[idx] = blockId;
  chunk.skyLight[idx] = 0;
}

/** Scatters trees across one already-terrain-filled chunk column. Mutates `chunks` in place. */
export function placeTrees(seed: number, cx: number, cz: number, columns: ColumnSample[], chunks: Chunk[]): void {
  for (let lx = 1; lx < CHUNK_SIZE - 1; lx++) {
    for (let lz = 1; lz < CHUNK_SIZE - 1; lz++) {
      const { height, biome } = columns[lx * CHUNK_SIZE + lz];
      if (height < SEA_LEVEL) continue; // underwater/beach column, no trees
      const density = TREE_DENSITY[biome.key] ?? 0;
      if (density <= 0) continue;

      const worldX = cx * CHUNK_SIZE + lx;
      const worldZ = cz * CHUNK_SIZE + lz;
      if (isRoadColumn(worldX, worldZ)) continue; // keep roads clear of trees
      if (hash01(seed, worldX, worldZ, 1) >= density) continue;

      const trunkHeight = 3 + Math.floor(hash01(seed, worldX, worldZ, 2) * 3); // 3-5
      const leafRoll = hash01(seed, worldX, worldZ, 3);
      const leafId =
        biome.key === "tundra"
          ? leafRoll < 0.7 ? LEAF_IDS[3] : LEAF_IDS[0]
          : LEAF_IDS[Math.floor(leafRoll * 3)]; // green/autumn/gold

      for (let dy = 1; dy <= trunkHeight; dy++) {
        setTreeVoxel(chunks, lx, lz, height + dy, LOG_ID, false);
      }

      const canopyBase = height + trunkHeight - 1;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          setTreeVoxel(chunks, lx + dx, lz + dz, canopyBase, leafId, true);
        }
      }
      for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        setTreeVoxel(chunks, lx + dx, lz + dz, canopyBase + 1, leafId, true);
      }
      setTreeVoxel(chunks, lx, lz, canopyBase + 2, leafId, true);
    }
  }
}
