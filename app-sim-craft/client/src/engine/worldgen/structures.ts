// Fixed, deterministic landmark structures near spawn — a small,
// hard-coded slice of spec/02-world-generation.md §6 (the real spec
// wants chunk-hash-based probabilistic placement across the whole world;
// this is one bridge, one castle (see worldgen/castle/), and a handful of
// campfire camps at fixed world coordinates, stamped the same way trees are:
// by checking, for each generated chunk, whether it overlaps the
// structure's world-space bounding box, so it stays correct across chunk
// load/unload and never needs to be treated as a "player edit" for
// persistence purposes).
import { CHUNK_SIZE, Chunk } from "../Chunk";
import { getBlockByKey } from "../../data/blocks";
import { sampleColumn, SEA_LEVEL } from "./terrain";
import { pointAtProgress, roadDeckYAtProgress, LOOP_PERIMETER, ROAD_WIDTH } from "./roads";
import { getCastlePlan } from "./castle/blueprint";
import { chunkOverlapsVillage, stampVillage, VILLAGE_TOP_Y } from "./village/stamp";
import { UNSET } from "./castle/plan";
import {
  CASTLE_BASE_Y,
  CASTLE_CENTER,
  CASTLE_FLOOR_Y,
  CASTLE_GATE_SPAWN,
  PLAN_MAX_X,
  PLAN_MAX_Z,
  PLAN_MIN_X,
  PLAN_MIN_Y,
  PLAN_MAX_Y,
  PLAN_MIN_Z,
} from "./castle/layout";
import { getBlockById } from "../../data/blocks";
import { MOUNTAIN_CENTER } from "./mountain";

export { CASTLE_CENTER, CASTLE_GATE_SPAWN };

const WALL_ID = getBlockByKey("greystone").id;
const PLANK_ID = getBlockByKey("plank").id;
const LOG_ID = getBlockByKey("log").id;
const AIR_ID = 0;

export const BRIDGE_CENTER = { x: 14, z: 0 };
const BRIDGE_HALF_LENGTH = 8;
const BRIDGE_HALF_WIDTH = 1;

// The castle is a big plan-based build (worldgen/castle/): the highest
// thing it reaches above the courtyard floor, for sizing chunk columns.
const CASTLE_TOP_ABOVE_FLOOR = 74;
// A chunk column this close to the castle (blocks) might hold some of it or
// of the lava cascading down its crag; anything farther skips the castle
// entirely (and never builds its plan).
const CASTLE_NEAR_RADIUS = 150;

// Several small camps scattered near spawn, each a fire pit ringed by
// seating (see stampCampfireSite) — deliberately kept off the road grid
// (the loop road, worldgen/roads.ts, keeps well away from all of them) so
// a camp never gets paved over.
export const CAMPFIRE_SITES: { x: number; z: number }[] = [
  { x: 4, z: 6 }, // original camp, right by spawn
  { x: 16, z: -48 },
  { x: -16, z: 48 },
  { x: 48, z: 48 },
  { x: -16, z: -48 },
];
export const CAMPFIRE_CENTER = CAMPFIRE_SITES[0];

// Street lamps: posts spaced around the loop road (worldgen/roads.ts),
// alternating shoulders, offset clear of the paved ROAD_WIDTH surface.
// The post itself is baked into terrain like every other structure here;
// the actual glow (bulb color + a night-only point light) is a runtime
// visual on top — see engine/StreetLamp.ts — the same split
// CampfireVisual uses for its flame/light, since a plain voxel block
// would just get Lambert-shaded dark at night like anything else.
export const LAMP_POST_HEIGHT = 4;
const LAMP_SPACING = 90; // road arc-length blocks between posts
const LAMP_OFFSET = ROAD_WIDTH / 2 + 2; // clears the shoulder

export const LAMP_SITES: { x: number; z: number }[] = Array.from(
  { length: Math.floor(LOOP_PERIMETER / LAMP_SPACING) },
  (_, i) => {
    const { x, z, yaw } = pointAtProgress(i * LAMP_SPACING);
    const side = i % 2 === 0 ? 1 : -1;
    return {
      x: Math.floor(x + Math.cos(yaw) * LAMP_OFFSET * side),
      z: Math.floor(z - Math.sin(yaw) * LAMP_OFFSET * side),
    };
  },
);

const SEAT_ID = getBlockByKey("plank").id;
const SEAT_RADIUS = 2.2;
const SEAT_COUNT = 6;

// sampleColumn is a pure function, so these anchor heights are cheap to
// recompute, but every chunk generation calls in here — memoize per seed
// (which only ever changes once per session) rather than resampling.
let cachedSeed: number | null = null;
let cachedBridgeDeckY = 0;
let cachedCampfireYs: number[] = [];
let cachedLampYs: number[] = [];
let cachedPeakY = 0;

function ensureCache(seed: number): void {
  if (cachedSeed === seed) return;
  cachedSeed = seed;
  const bridgeStart = sampleColumn(seed, BRIDGE_CENTER.x - BRIDGE_HALF_LENGTH, BRIDGE_CENTER.z).height;
  const bridgeEnd = sampleColumn(seed, BRIDGE_CENTER.x + BRIDGE_HALF_LENGTH, BRIDGE_CENTER.z).height;
  cachedBridgeDeckY = Math.max(bridgeStart, bridgeEnd, SEA_LEVEL) + 1;
  cachedCampfireYs = CAMPFIRE_SITES.map((site) => sampleColumn(seed, site.x, site.z).height + 1);
  // Anchored to the loop road's own elevation (its deck height at that
  // point along the loop), not the natural terrain height at the post's
  // shoulder offset — the road itself is flattened to its own level
  // regardless of terrain (roads.ts), so a terrain-height anchor would
  // float the post above (or bury it below) the road wherever a hill was
  // cut down or a lake bridged for it, and on the lake bridge's arch the
  // deck is well above any ground. This is what "sits at road-level"
  // actually means.
  cachedLampYs = LAMP_SITES.map((_, i) => roadDeckYAtProgress(i * LAMP_SPACING) + 1);
  cachedPeakY = sampleColumn(seed, MOUNTAIN_CENTER.x, MOUNTAIN_CENTER.z).height;
}

/** World-space anchor heights for these structures — exported so GameLoop can place each campfire's flame/light (or lamp's bulb/light) without waiting on chunk load. peakY is the dragon hill's summit height, used to set the height of the giant dragons' flight circuits. */
export function getStructureAnchors(
  seed: number,
): {
  bridgeDeckY: number;
  castleBaseY: number;
  campfireYs: number[];
  lampYs: number[];
  peakY: number;
} {
  ensureCache(seed);
  return {
    bridgeDeckY: cachedBridgeDeckY,
    castleBaseY: CASTLE_BASE_Y,
    campfireYs: cachedCampfireYs,
    lampYs: cachedLampYs,
    peakY: cachedPeakY,
  };
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
      CASTLE_CENTER.x + PLAN_MIN_X,
      CASTLE_CENTER.x + PLAN_MAX_X,
      CASTLE_CENTER.z + PLAN_MIN_Z,
      CASTLE_CENTER.z + PLAN_MAX_Z,
    )
  ) {
    maxY = Math.max(maxY, CASTLE_FLOOR_Y + CASTLE_TOP_ABOVE_FLOOR);
  }
  if (chunkOverlapsVillage(cx, cz)) maxY = Math.max(maxY, VILLAGE_TOP_Y);
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

/** Copies the castle plan (worldgen/castle/blueprint.ts) over this chunk column, then re-derives the sky light of every column it touched: open air above the roofs stays lit, rooms under them go dark. */
function stampCastle(cx: number, cz: number, chunks: Chunk[]): void {
  if (!chunkOverlapsBox(cx, cz, CASTLE_CENTER.x - CASTLE_NEAR_RADIUS, CASTLE_CENTER.x + CASTLE_NEAR_RADIUS, CASTLE_CENTER.z - CASTLE_NEAR_RADIUS, CASTLE_CENTER.z + CASTLE_NEAR_RADIUS)) return;
  const plan = getCastlePlan();

  const chunkMinX = cx * CHUNK_SIZE;
  const chunkMinZ = cz * CHUNK_SIZE;
  const minX = Math.max(chunkMinX, CASTLE_CENTER.x + PLAN_MIN_X);
  const maxX = Math.min(chunkMinX + CHUNK_SIZE - 1, CASTLE_CENTER.x + PLAN_MAX_X);
  const minZ = Math.max(chunkMinZ, CASTLE_CENTER.z + PLAN_MIN_Z);
  const maxZ = Math.min(chunkMinZ + CHUNK_SIZE - 1, CASTLE_CENTER.z + PLAN_MAX_Z);

  const touched: [number, number][] = [];
  if (minX <= maxX && minZ <= maxZ) {
    for (let wx = minX; wx <= maxX; wx++) {
      for (let wz = minZ; wz <= maxZ; wz++) {
        let any = false;
        for (let ly = PLAN_MIN_Y; ly <= PLAN_MAX_Y; ly++) {
          const block = plan.get(wx - CASTLE_CENTER.x, ly, wz - CASTLE_CENTER.z);
          if (block === UNSET) continue;
          setWorldVoxel(chunks, cx, cz, wx, CASTLE_FLOOR_Y + ly, wz, block);
          any = true;
        }
        if (any) touched.push([wx, wz]);
      }
    }
  }
  // Blocks that follow the terrain rather than the plan box (lava down the crag).
  for (const extra of plan.extras) {
    if (extra.x < chunkMinX || extra.x >= chunkMinX + CHUNK_SIZE || extra.z < chunkMinZ || extra.z >= chunkMinZ + CHUNK_SIZE) continue;
    setWorldVoxel(chunks, cx, cz, extra.x, extra.y, extra.z, extra.id);
    touched.push([extra.x, extra.z]);
  }

  // A plan cell is only ever opaque or air, so a straight top-down scan is exact (same rule as terrain.ts's initial lighting).
  for (const [wx, wz] of touched) {
    let sky = 15;
    for (let cy = chunks.length - 1; cy >= 0; cy--) {
      const chunk = chunks[cy];
      const lx = wx - chunkMinX;
      const lz = wz - chunkMinZ;
      for (let ly = CHUNK_SIZE - 1; ly >= 0; ly--) {
        const idx = lx | (ly << 5) | (lz << 10);
        if (chunk.blocks[idx] !== AIR_ID) {
          sky = getBlockById(chunk.blocks[idx]).lightOpacity >= 15 ? 0 : sky;
          chunk.skyLight[idx] = 0;
        } else chunk.skyLight[idx] = sky;
      }
    }
  }
}

/** One camp: a crossed-log fire pit plus a ring of plank seats around it, each seat resting at its own local ground height since terrain isn't flattened for these camps. */
function stampCampfireSite(
  seed: number,
  cx: number,
  cz: number,
  chunks: Chunk[],
  site: { x: number; z: number },
  fireY: number,
): void {
  const { x, z } = site;
  setWorldVoxel(chunks, cx, cz, x - 1, fireY, z, LOG_ID);
  setWorldVoxel(chunks, cx, cz, x + 1, fireY, z, LOG_ID);
  setWorldVoxel(chunks, cx, cz, x, fireY, z - 1, LOG_ID);
  setWorldVoxel(chunks, cx, cz, x, fireY, z + 1, LOG_ID);

  for (let i = 0; i < SEAT_COUNT; i++) {
    const angle = (i / SEAT_COUNT) * Math.PI * 2;
    const sx = Math.round(x + Math.cos(angle) * SEAT_RADIUS);
    const sz = Math.round(z + Math.sin(angle) * SEAT_RADIUS);
    const seatY = sampleColumn(seed, sx, sz).height + 1;
    setWorldVoxel(chunks, cx, cz, sx, seatY, sz, SEAT_ID);
  }
}

function stampCampfires(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  const { campfireYs } = getStructureAnchors(seed);
  const margin = Math.ceil(SEAT_RADIUS) + 1;
  for (let i = 0; i < CAMPFIRE_SITES.length; i++) {
    const site = CAMPFIRE_SITES[i];
    if (!chunkOverlapsBox(cx, cz, site.x - margin, site.x + margin, site.z - margin, site.z + margin)) continue;
    stampCampfireSite(seed, cx, cz, chunks, site, campfireYs[i]);
  }
}

function stampStreetLamps(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  const { lampYs } = getStructureAnchors(seed);
  for (let i = 0; i < LAMP_SITES.length; i++) {
    const { x, z } = LAMP_SITES[i];
    if (!chunkOverlapsBox(cx, cz, x, x, z, z)) continue;
    const baseY = lampYs[i];
    for (let dy = 0; dy < LAMP_POST_HEIGHT; dy++) setWorldVoxel(chunks, cx, cz, x, baseY + dy, z, LOG_ID);
    setWorldVoxel(chunks, cx, cz, x, baseY + LAMP_POST_HEIGHT, z, WALL_ID);
  }
}

/** Stamps every fixed structure that overlaps this chunk column. Mutates `chunks` in place. */
export function stampStructures(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  stampBridge(seed, cx, cz, chunks);
  stampCastle(cx, cz, chunks);
  stampCampfires(seed, cx, cz, chunks);
  stampStreetLamps(seed, cx, cz, chunks);
  stampVillage(cx, cz, chunks);
}
