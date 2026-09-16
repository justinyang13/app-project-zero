// Fixed, deterministic landmark structures near spawn — a small,
// hard-coded slice of spec/02-world-generation.md §6 (the real spec
// wants chunk-hash-based probabilistic placement across the whole world;
// this is one bridge, one castle, and one campfire pit at fixed world
// coordinates near origin, stamped the same way trees are: by checking,
// for each generated chunk, whether it overlaps the structure's
// world-space bounding box, so it stays correct across chunk
// load/unload and never needs to be treated as a "player edit" for
// persistence purposes).
import { CHUNK_SIZE, Chunk } from "../Chunk";
import { getBlockByKey } from "../../data/blocks";
import { sampleColumn, SEA_LEVEL } from "./terrain";

const WALL_ID = getBlockByKey("greystone").id;
const ROOF_ID = getBlockByKey("roof_tile").id;
const PLANK_ID = getBlockByKey("plank").id;
const LOG_ID = getBlockByKey("log").id;
const AIR_ID = 0;

export const BRIDGE_CENTER = { x: 14, z: 0 };
const BRIDGE_HALF_LENGTH = 8;
const BRIDGE_HALF_WIDTH = 1;

export const CASTLE_CENTER = { x: -34, z: -20 };
const CASTLE_HALF_SIZE = 8;
const CASTLE_WALL_HEIGHT = 7;
const CASTLE_TOWER_EXTRA = 5;
const TOWER_HALF = 1;
const CASTLE_CORNERS: [number, number][] = [
  [CASTLE_CENTER.x - CASTLE_HALF_SIZE, CASTLE_CENTER.z - CASTLE_HALF_SIZE],
  [CASTLE_CENTER.x - CASTLE_HALF_SIZE, CASTLE_CENTER.z + CASTLE_HALF_SIZE],
  [CASTLE_CENTER.x + CASTLE_HALF_SIZE, CASTLE_CENTER.z - CASTLE_HALF_SIZE],
  [CASTLE_CENTER.x + CASTLE_HALF_SIZE, CASTLE_CENTER.z + CASTLE_HALF_SIZE],
];

export const CAMPFIRE_CENTER = { x: 4, z: 6 };

// sampleColumn is a pure function, so these anchor heights are cheap to
// recompute, but every chunk generation calls in here — memoize per seed
// (which only ever changes once per session) rather than resampling.
let cachedSeed: number | null = null;
let cachedBridgeDeckY = 0;
let cachedCastleBaseY = 0;
let cachedCampfireY = 0;

function ensureCache(seed: number): void {
  if (cachedSeed === seed) return;
  cachedSeed = seed;
  const bridgeStart = sampleColumn(seed, BRIDGE_CENTER.x - BRIDGE_HALF_LENGTH, BRIDGE_CENTER.z).height;
  const bridgeEnd = sampleColumn(seed, BRIDGE_CENTER.x + BRIDGE_HALF_LENGTH, BRIDGE_CENTER.z).height;
  cachedBridgeDeckY = Math.max(bridgeStart, bridgeEnd, SEA_LEVEL) + 1;
  cachedCastleBaseY = sampleColumn(seed, CASTLE_CENTER.x, CASTLE_CENTER.z).height + 1;
  cachedCampfireY = sampleColumn(seed, CAMPFIRE_CENTER.x, CAMPFIRE_CENTER.z).height + 1;
}

/** World-space anchor heights for these structures — exported so GameLoop can place the campfire's flame/light without waiting on chunk load. */
export function getStructureAnchors(seed: number): { bridgeDeckY: number; castleBaseY: number; campfireY: number } {
  ensureCache(seed);
  return { bridgeDeckY: cachedBridgeDeckY, castleBaseY: cachedCastleBaseY, campfireY: cachedCampfireY };
}

function chunkOverlapsBox(cx: number, cz: number, minX: number, maxX: number, minZ: number, maxZ: number): boolean {
  const chunkMinX = cx * CHUNK_SIZE;
  const chunkMinZ = cz * CHUNK_SIZE;
  return chunkMinX + CHUNK_SIZE - 1 >= minX && chunkMinX <= maxX && chunkMinZ + CHUNK_SIZE - 1 >= minZ && chunkMinZ <= maxZ;
}

function setWorldVoxel(chunks: Chunk[], cx: number, cz: number, wx: number, wy: number, wz: number, blockId: number): void {
  const lx = wx - cx * CHUNK_SIZE;
  const lz = wz - cz * CHUNK_SIZE;
  if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) return;
  const cy = Math.floor(wy / CHUNK_SIZE);
  const chunk = chunks[cy];
  if (!chunk) return;
  const ly = wy - cy * CHUNK_SIZE;
  const idx = lx | (ly << 5) | (lz << 10);
  chunk.blocks[idx] = blockId;
  chunk.skyLight[idx] = 0;
}

/** The highest world Y any structure overlapping this chunk needs — used to size the chunk's vertical extent before any blocks are placed. */
export function structureMaxYFor(seed: number, cx: number, cz: number): number {
  ensureCache(seed);
  let maxY = 0;
  if (
    chunkOverlapsBox(
      cx,
      cz,
      BRIDGE_CENTER.x - BRIDGE_HALF_LENGTH,
      BRIDGE_CENTER.x + BRIDGE_HALF_LENGTH,
      BRIDGE_CENTER.z - BRIDGE_HALF_WIDTH,
      BRIDGE_CENTER.z + BRIDGE_HALF_WIDTH,
    )
  ) {
    maxY = Math.max(maxY, cachedBridgeDeckY + 3);
  }
  if (
    chunkOverlapsBox(
      cx,
      cz,
      CASTLE_CENTER.x - CASTLE_HALF_SIZE - TOWER_HALF,
      CASTLE_CENTER.x + CASTLE_HALF_SIZE + TOWER_HALF,
      CASTLE_CENTER.z - CASTLE_HALF_SIZE - TOWER_HALF,
      CASTLE_CENTER.z + CASTLE_HALF_SIZE + TOWER_HALF,
    )
  ) {
    maxY = Math.max(maxY, cachedCastleBaseY + CASTLE_WALL_HEIGHT + CASTLE_TOWER_EXTRA + 4);
  }
  return maxY;
}

function stampBridge(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  const minX = BRIDGE_CENTER.x - BRIDGE_HALF_LENGTH;
  const maxX = BRIDGE_CENTER.x + BRIDGE_HALF_LENGTH;
  const minZ = BRIDGE_CENTER.z - BRIDGE_HALF_WIDTH;
  const maxZ = BRIDGE_CENTER.z + BRIDGE_HALF_WIDTH;
  if (!chunkOverlapsBox(cx, cz, minX, maxX, minZ, maxZ)) return;
  const { bridgeDeckY } = getStructureAnchors(seed);

  for (let wx = minX; wx <= maxX; wx++) {
    for (let wz = minZ; wz <= maxZ; wz++) {
      setWorldVoxel(chunks, cx, cz, wx, bridgeDeckY, wz, PLANK_ID);
    }
    if ((wx - minX) % 4 === 0) {
      setWorldVoxel(chunks, cx, cz, wx, bridgeDeckY + 1, minZ, LOG_ID);
      setWorldVoxel(chunks, cx, cz, wx, bridgeDeckY + 1, maxZ, LOG_ID);
    }
  }
}

function stampCastle(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  const minX = CASTLE_CENTER.x - CASTLE_HALF_SIZE;
  const maxX = CASTLE_CENTER.x + CASTLE_HALF_SIZE;
  const minZ = CASTLE_CENTER.z - CASTLE_HALF_SIZE;
  const maxZ = CASTLE_CENTER.z + CASTLE_HALF_SIZE;
  if (!chunkOverlapsBox(cx, cz, minX - TOWER_HALF, maxX + TOWER_HALF, minZ - TOWER_HALF, maxZ + TOWER_HALF)) return;
  const { castleBaseY } = getStructureAnchors(seed);

  const gateMinX = CASTLE_CENTER.x - 1;
  const gateMaxX = CASTLE_CENTER.x + 1;
  const towerTop = castleBaseY + CASTLE_WALL_HEIGHT + CASTLE_TOWER_EXTRA;

  for (let wx = minX - TOWER_HALF; wx <= maxX + TOWER_HALF; wx++) {
    for (let wz = minZ - TOWER_HALF; wz <= maxZ + TOWER_HALF; wz++) {
      const inTower = CASTLE_CORNERS.some(([tx, tz]) => Math.abs(wx - tx) <= TOWER_HALF && Math.abs(wz - tz) <= TOWER_HALF);
      const insideFootprint = wx >= minX && wx <= maxX && wz >= minZ && wz <= maxZ;
      const onWallLine = insideFootprint && (wx === minX || wx === maxX || wz === minZ || wz === maxZ);
      const isGate = wz === maxZ && wx >= gateMinX && wx <= gateMaxX;

      if (inTower) {
        for (let wy = castleBaseY - 3; wy <= towerTop; wy++) setWorldVoxel(chunks, cx, cz, wx, wy, wz, WALL_ID);
      } else if (onWallLine && !isGate) {
        for (let wy = castleBaseY - 3; wy <= castleBaseY + CASTLE_WALL_HEIGHT; wy++) {
          setWorldVoxel(chunks, cx, cz, wx, wy, wz, WALL_ID);
        }
      } else if (onWallLine && isGate) {
        for (let wy = castleBaseY; wy <= castleBaseY + CASTLE_WALL_HEIGHT; wy++) {
          setWorldVoxel(chunks, cx, cz, wx, wy, wz, AIR_ID);
        }
      }
    }
  }

  for (const [tx, tz] of CASTLE_CORNERS) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) setWorldVoxel(chunks, cx, cz, tx + dx, towerTop + 1, tz + dz, ROOF_ID);
    }
    setWorldVoxel(chunks, cx, cz, tx, towerTop + 2, tz, ROOF_ID);
  }
}

function stampCampfire(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  const { x, z } = CAMPFIRE_CENTER;
  if (!chunkOverlapsBox(cx, cz, x - 1, x + 1, z - 1, z + 1)) return;
  const { campfireY } = getStructureAnchors(seed);

  setWorldVoxel(chunks, cx, cz, x - 1, campfireY, z, LOG_ID);
  setWorldVoxel(chunks, cx, cz, x + 1, campfireY, z, LOG_ID);
  setWorldVoxel(chunks, cx, cz, x, campfireY, z - 1, LOG_ID);
  setWorldVoxel(chunks, cx, cz, x, campfireY, z + 1, LOG_ID);
}

/** Stamps every fixed structure that overlaps this chunk column. Mutates `chunks` in place. */
export function stampStructures(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  stampBridge(seed, cx, cz, chunks);
  stampCastle(seed, cx, cz, chunks);
  stampCampfire(seed, cx, cz, chunks);
}
