// A single fixed, genuinely deep lake — the natural heightmap only ever
// dips a few blocks under sea level (see terrain.ts's SEA_LEVEL flooding),
// which is plenty for reef fish but nowhere near enough water for a shark
// or a whale to swim in. Like mountain.ts's mountain this is folded into
// sampleColumn's height, so every consumer of column height (chunk fill,
// the minimap, spawn scans) sees it for free — it just bows the terrain
// down instead of up, and the existing flood-to-sea-level rule turns the
// bowl into water.
//
// Placed inside the loop road's east turn (roads.ts: that turn is a
// semicircle of radius 90 centered at (130, 0)), clear of the road, the
// castle, the campfires, and the residential lots.
export const DEEP_LAKE_CENTER = { x: 130, z: 0 };
export const DEEP_LAKE_RADIUS = 70;
const DEEP_LAKE_DEPTH_BELOW_SEA = 26;

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/** Pulls a column's natural height down into the lake bowl: unchanged at the rim, bottoming out flat (a wide floor, not a cone) well inside it. */
export function deepLakeHeight(naturalHeight: number, worldX: number, worldZ: number, seaLevel: number): number {
  const dist = Math.hypot(worldX - DEEP_LAKE_CENTER.x, worldZ - DEEP_LAKE_CENTER.z);
  if (dist >= DEEP_LAKE_RADIUS) return naturalHeight;
  const t = 1 - dist / DEEP_LAKE_RADIUS; // 0 at the rim, 1 at the center
  const w = smoothstep(Math.min(1, t * 2.4)); // fully bowed by ~42% of the way in
  const floorY = seaLevel - DEEP_LAKE_DEPTH_BELOW_SEA;
  return Math.round(naturalHeight + (floorY - naturalHeight) * w);
}
