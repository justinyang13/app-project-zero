// Deterministic tree placement — a small slice of
// spec/02-world-generation.md §2 step 9 (vegetation pass). Scoped down:
// only two biomes grow trees (no desert cacti yet), and a tree is never
// allowed to spill past its own chunk column's edge — a canopy never needs
// to write into a neighboring (possibly not-yet-generated) chunk column, a
// deliberate simplification rather than building cross-chunk vegetation
// stitching for this pass. Three kinds: the original small round tree,
// a tall dark-green pine (a stack of shrinking needle skirts), and a
// pink cherry tree with a wide, low blossom crown. The wider ones need a
// bigger margin from the chunk edge; a column too close to one falls back
// to the small tree so density stays the same.
import { CHUNK_SIZE, Chunk } from "../Chunk";
import { getBlockByKey } from "../../data/blocks";
import { SEA_LEVEL, type ColumnSample } from "./terrain";
import { isRoadColumn } from "./roads";

const LOG_ID = getBlockByKey("log").id;
const PINE_LEAF_ID = getBlockByKey("leaves_pine").id;
const CHERRY_LEAF_ID = getBlockByKey("leaves_cherry").id;
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

const SMALL_MARGIN = 1;
const PINE_RADIUS = 3;
const CHERRY_RADIUS = 3;

type TreeKind = "small" | "pine" | "cherry";

function inChunkInterior(l: number, margin: number): boolean {
  return l >= margin && l < CHUNK_SIZE - margin;
}

/** A round-cornered square of leaves of the given radius at one height. */
function leafDisc(chunks: Chunk[], lx: number, lz: number, y: number, radius: number, leafId: number, onlyIfAir = true): void {
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      if (Math.abs(dx) + Math.abs(dz) > radius + 1) continue; // clip the corners
      setTreeVoxel(chunks, lx + dx, lz + dz, y, leafId, onlyIfAir);
    }
  }
}

/** A tall trunk with tiered, shrinking needle skirts up to a single tip. Reaches 16 blocks above the ground at most (see terrain.ts's TREE_HEADROOM). */
function placePine(chunks: Chunk[], lx: number, lz: number, height: number, roll: number): void {
  const trunk = 9 + Math.floor(roll * 6); // 9-14
  for (let dy = 1; dy <= trunk; dy++) setTreeVoxel(chunks, lx, lz, height + dy, LOG_ID, false);
  const skirtBase = height + 3;
  const layers = trunk - 1;
  for (let i = 0; i < layers; i++) {
    const t = layers > 1 ? i / (layers - 1) : 1;
    let radius = PINE_RADIUS - Math.floor(t * 3.999); // 3 at the bottom tapering to 0 at the top
    if (i % 3 === 2) radius = Math.max(0, radius - 1); // every third layer tucks in, giving the tiered look
    leafDisc(chunks, lx, lz, skirtBase + i, radius, PINE_LEAF_ID);
  }
  setTreeVoxel(chunks, lx, lz, height + trunk + 1, PINE_LEAF_ID, true);
  setTreeVoxel(chunks, lx, lz, height + trunk + 2, PINE_LEAF_ID, true);
}

/** A short, slightly crooked-looking trunk under a wide blossom crown with a few gaps so it reads as flowers, not a solid ball. */
function placeCherry(seed: number, chunks: Chunk[], lx: number, lz: number, height: number, worldX: number, worldZ: number, roll: number): void {
  const trunk = 4 + Math.floor(roll * 3); // 4-6
  for (let dy = 1; dy <= trunk; dy++) setTreeVoxel(chunks, lx, lz, height + dy, LOG_ID, false);
  const crownBase = height + trunk - 1;
  const radii = [2, 3, 3, 2, 1];
  for (let i = 0; i < radii.length; i++) {
    const y = crownBase + i;
    const r = radii[i];
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > r + 1) continue;
        const rim = Math.max(Math.abs(dx), Math.abs(dz)) === r && r > 1;
        if (rim && hash01(seed, worldX + dx * 31, worldZ + dz * 17, 20 + i) < 0.18) continue; // ragged edge
        setTreeVoxel(chunks, lx + dx, lz + dz, y, CHERRY_LEAF_ID, true);
      }
    }
  }
}

/** Scatters trees across one already-terrain-filled chunk column. Mutates `chunks` in place. */
export function placeTrees(seed: number, cx: number, cz: number, columns: ColumnSample[], chunks: Chunk[]): void {
  for (let lx = SMALL_MARGIN; lx < CHUNK_SIZE - SMALL_MARGIN; lx++) {
    for (let lz = SMALL_MARGIN; lz < CHUNK_SIZE - SMALL_MARGIN; lz++) {
      const { height, biome } = columns[lx * CHUNK_SIZE + lz];
      if (height < SEA_LEVEL) continue; // underwater/beach column, no trees
      const density = TREE_DENSITY[biome.key] ?? 0;
      if (density <= 0) continue;

      const worldX = cx * CHUNK_SIZE + lx;
      const worldZ = cz * CHUNK_SIZE + lz;
      if (isRoadColumn(worldX, worldZ)) continue; // keep roads clear of trees
      if (hash01(seed, worldX, worldZ, 1) >= density) continue;

      const kindRoll = hash01(seed, worldX, worldZ, 4);
      let kind: TreeKind =
        biome.key === "tundra"
          ? kindRoll < 0.6 ? "pine" : "small"
          : kindRoll < 0.28 ? "pine" : kindRoll < 0.4 ? "cherry" : "small";
      if (kind === "pine" && !(inChunkInterior(lx, PINE_RADIUS) && inChunkInterior(lz, PINE_RADIUS))) kind = "small";
      if (kind === "cherry" && !(inChunkInterior(lx, CHERRY_RADIUS) && inChunkInterior(lz, CHERRY_RADIUS))) kind = "small";

      if (kind === "pine") {
        placePine(chunks, lx, lz, height, hash01(seed, worldX, worldZ, 5));
        continue;
      }
      if (kind === "cherry") {
        placeCherry(seed, chunks, lx, lz, height, worldX, worldZ, hash01(seed, worldX, worldZ, 6));
        continue;
      }

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
