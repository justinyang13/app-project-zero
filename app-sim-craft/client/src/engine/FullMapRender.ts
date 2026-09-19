// Renders the big overview map: the whole area SimCraft's landmarks live
// in (the loop road, castle, village, dragon mountain, deep lake), sampled
// straight from the same deterministic terrain function chunk generation
// uses — so like the minimap it needs no loaded chunks and shows terrain
// the player has never visited. The world itself is unbounded, so "the
// entire map" here means this whole landmark region rather than infinity.
// Painting happens in background workers (engine/fullMapCache.ts,
// workers/map-render.worker.ts) so the map never freezes the game.
import { sampleColumn, SEA_LEVEL } from "./worldgen/terrain";
import { isRoadColumn } from "./worldgen/roads";
import { DEEP_LAKE_FLOOR_Y } from "./worldgen/deepLake";

export const FULL_MAP_HALF_RANGE = 560; // blocks either side of the origin
export const FULL_MAP_STEP = 2; // blocks per map pixel
export const FULL_MAP_PIXELS = (FULL_MAP_HALF_RANGE * 2) / FULL_MAP_STEP;

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function shade(rgb: [number, number, number], k: number): [number, number, number] {
  return [Math.min(255, rgb[0] * k), Math.min(255, rgb[1] * k), Math.min(255, rgb[2] * k)];
}

const BIOME_LAND: Record<string, [number, number, number]> = {
  meadow: [92, 148, 70],
  desert: [226, 200, 130],
  tundra: [214, 232, 232],
};

/** One map pixel's color for a world column. */
export function terrainColor(seed: number, wx: number, wz: number): [number, number, number] {
  const { height, biome } = sampleColumn(seed, wx, wz);
  if (isRoadColumn(wx, wz)) return [120, 120, 124]; // roads are flattened above water too (a causeway across the lake)
  if (height < SEA_LEVEL) {
    const depth = Math.min(1, (SEA_LEVEL - height) / (SEA_LEVEL - DEEP_LAKE_FLOOR_Y)); // the deep lake is the deepest water
    return [mix(84, 22, depth), mix(158, 58, depth), mix(228, 140, depth)];
  }
  const base = BIOME_LAND[biome.key] ?? BIOME_LAND.meadow;
  // Relief shading: higher ground is lighter, and the mountain's upper slopes blend to bare rock and snow.
  const rise = Math.max(0, height - SEA_LEVEL);
  let color = shade(base, 0.82 + Math.min(1, rise / 60) * 0.3);
  if (rise > 45) {
    const rock = Math.min(1, (rise - 45) / 50);
    color = [mix(color[0], 150, rock), mix(color[1], 148, rock), mix(color[2], 146, rock)];
  }
  if (rise > 110) {
    const snow = Math.min(1, (rise - 110) / 40);
    color = [mix(color[0], 246, snow), mix(color[1], 248, snow), mix(color[2], 252, snow)];
  }
  return color;
}
