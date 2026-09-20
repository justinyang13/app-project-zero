// Read-only questions the simulation asks of the loaded world — where is the
// ground under this column, how deep is the water — shared by every entity
// that walks, drives or swims. Everything here reads through World.getBlock,
// so an unloaded column simply answers "nothing there".
import type { World } from "./World";
import { AIR_ID, WATER_ID } from "../data/blocks";

const GROUND_SEARCH_TOP = 110;
const GROUND_SEARCH_BOTTOM = 0;

/**
 * Scans straight down for the first solid voxel; returns its top surface
 * Y, or null if the column isn't loaded/found — or if that surface is
 * water. Water is deliberately treated the same as "no ground here": a
 * land creature landing on it would otherwise read as standing/swimming
 * on top of a lake, since water is a solid, non-air block as far as this
 * scan is concerned (see worldgen/terrain.ts's SEA_LEVEL flooding). This
 * relies on water only ever being the *topmost* block of a flooded
 * column — the moment it isn't the first non-air hit, we've already
 * found real land above it.
 */
export function findSurfaceY(world: World, x: number, z: number): number | null {
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  for (let y = GROUND_SEARCH_TOP; y >= GROUND_SEARCH_BOTTOM; y--) {
    const block = world.getBlock(bx, y, bz);
    if (block === AIR_ID) continue;
    return block === WATER_ID ? null : y + 1;
  }
  return null;
}

const WATER_SEARCH_TOP = 100;
const WATER_SEARCH_BOTTOM = 0;

/**
 * Scans straight down for a contiguous run of water blocks and returns its
 * vertical span (top surface Y, bottom-most water block's Y), or null if
 * this column has no water — dry land, an unloaded chunk, or (mid-scan)
 * water sitting with nothing solid under it, which shouldn't happen given
 * how worldgen/terrain.ts floods lake basins but is treated as "no water"
 * rather than crashing if it ever does.
 */
export function findWaterColumn(world: World, x: number, z: number): { top: number; bottom: number } | null {
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  let top: number | null = null;
  for (let y = WATER_SEARCH_TOP; y >= WATER_SEARCH_BOTTOM; y--) {
    const block = world.getBlock(bx, y, bz);
    if (block === WATER_ID) {
      if (top === null) top = y;
      continue;
    }
    if (block === AIR_ID) {
      if (top === null) continue; // still scanning down through open air above the water
      return null;
    }
    return top === null ? null : { top, bottom: y + 1 };
  }
  return null;
}

// A fish needs real depth to swim in — the vertical clearance margins
// already add up to 0.6 blocks for a tiny fish, so a column any shallower
// than this would leave it with no legal Y at all and freeze it in place
// the instant it tried to move. Below this threshold (e.g. a 1-block-deep
// puddle, common wherever the heightmap dips only slightly under
// SEA_LEVEL) a spot just isn't worth spawning a fish in.
export const MIN_SWIMMABLE_DEPTH = 2;

export function hasSwimmingRoom(
  column: { top: number; bottom: number } | null,
  minDepth = MIN_SWIMMABLE_DEPTH,
): column is { top: number; bottom: number } {
  return column !== null && column.top - column.bottom >= minDepth;
}

const SPOT_SCAN_STEP = 3; // blocks between sampled columns — fine enough to land inside most lakes without checking every single column

/**
 * Grid-scans a disc around (originX, originZ) for columns with real
 * swimming depth. A blind random dart within a wide radius (the first cut
 * of this spawner) turns out to almost always miss: water deep enough to
 * swim in is a small fraction of the world's surface, so a handful of
 * random points rarely lands inside the one nearby lake. Walking the grid
 * instead finds every candidate that's actually there, so spawning can
 * sample from real hits rather than hoping to land on one. Stops early
 * once `maxResults` are found — plenty for sampling a spawn batch from,
 * and enough to cap the cost of scanning a very large lake.
 */
export function findNearbyWaterSpots(
  world: World,
  originX: number,
  originZ: number,
  maxRadius: number,
  maxResults: number,
  minDepth = MIN_SWIMMABLE_DEPTH,
): { x: number; z: number; top: number; bottom: number }[] {
  const spots: { x: number; z: number; top: number; bottom: number }[] = [];
  const radiusSq = maxRadius * maxRadius;
  for (let dx = -maxRadius; dx <= maxRadius; dx += SPOT_SCAN_STEP) {
    for (let dz = -maxRadius; dz <= maxRadius; dz += SPOT_SCAN_STEP) {
      if (dx * dx + dz * dz > radiusSq) continue;
      const x = originX + dx;
      const z = originZ + dz;
      const column = findWaterColumn(world, x, z);
      if (hasSwimmingRoom(column, minDepth)) {
        spots.push({ x, z, top: column.top, bottom: column.bottom });
        if (spots.length >= maxResults) return spots;
      }
    }
  }
  return spots;
}
