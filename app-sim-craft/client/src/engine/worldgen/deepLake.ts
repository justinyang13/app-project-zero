// A single fixed, genuinely deep lake — the natural heightmap only ever
// dips a few blocks under sea level (see terrain.ts's SEA_LEVEL flooding),
// which is plenty for reef fish but nowhere near enough water for a shark
// or a whale to swim in. Like mountain.ts's mountain this is folded into
// sampleColumn's height, so every consumer of column height (chunk fill,
// the minimap, spawn scans) sees it for free — it just bows the terrain
// down instead of up, and the existing flood-to-sea-level rule turns the
// bowl into water.
//
// Sized to be a proper inland sea: ~10x the original area (radius 70 -> 221)
// and as deep as the world allows — chunks start at y=0, so with the sea at
// y=64 the floor can drop at most ~60 blocks (a 5x-deeper 130 would fall
// below the bottom of the world). Placed east of the loop road's east turn
// (roads.ts: a semicircle of radius 90 centered at (130, 0)) with its west
// rim just past the campfires/castle/village side of the map, so it drowns
// none of them and clear of the dragon mountain; the road itself bridges
// the stretch of the lake its turn crosses, on pillars with room for fish
// to swim beneath (see terrain.ts's bridge columns).
export const DEEP_LAKE_CENTER = { x: 300, z: 0 };
export const DEEP_LAKE_RADIUS = 221;
/** World Y of the lake bed at its deepest — a few blocks of solid ground above the bottom of the world. */
export const DEEP_LAKE_FLOOR_Y = 4;

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/** Pulls a column's natural height down into the lake bowl: unchanged at the rim, bottoming out flat (a wide floor, not a cone) well inside it. */
export function deepLakeHeight(naturalHeight: number, worldX: number, worldZ: number, _seaLevel: number): number {
  const dist = Math.hypot(worldX - DEEP_LAKE_CENTER.x, worldZ - DEEP_LAKE_CENTER.z);
  if (dist >= DEEP_LAKE_RADIUS) return naturalHeight;
  const t = 1 - dist / DEEP_LAKE_RADIUS; // 0 at the rim, 1 at the center
  const w = smoothstep(Math.min(1, t * 2.4)); // fully bowed by ~42% of the way in
  const floorY = DEEP_LAKE_FLOOR_Y;
  return Math.round(naturalHeight + (floorY - naturalHeight) * w);
}
