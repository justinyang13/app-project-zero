// A single closed-loop road — a "stadium" oval (two straights joined by
// semicircular turns) — instead of an infinite tiling grid. It's pure
// geometry (no seed dependency, no noise), so both world-gen (terrain.ts
// flattens every column under it to FLAT_ROAD_Y, cutting through hills
// and filling over water so the loop is genuinely flat rather than a
// surface paint that still follows the terrain) and runtime code (Car's
// driving AI, the minimap) can query the exact same shape everywhere.
export const ROAD_WIDTH = 7;
const ROAD_HALF_WIDTH = ROAD_WIDTH / 2;

// Track centerline: straights at z = ±TURN_RADIUS running from
// x = -STRAIGHT_HALF_LENGTH to +STRAIGHT_HALF_LENGTH, joined by
// semicircular turns of TURN_RADIUS centered at (±STRAIGHT_HALF_LENGTH, 0).
// Bounding box ends up roughly 440 x 180 blocks — a single loop sized to
// span well beyond the starting render distance, not a per-chunk tile.
const STRAIGHT_HALF_LENGTH = 130;
const TURN_RADIUS = 90;

/** Constant elevation the entire loop sits at — this is what makes it flat. */
export const FLAT_ROAD_Y = 70;

export const LOOP_PERIMETER = 4 * STRAIGHT_HALF_LENGTH + 2 * Math.PI * TURN_RADIUS;

/** Distance from (x, z) to the loop's centerline, in world units. */
function distanceToLoop(x: number, z: number): number {
  if (x >= -STRAIGHT_HALF_LENGTH && x <= STRAIGHT_HALF_LENGTH) {
    return Math.min(Math.abs(z - TURN_RADIUS), Math.abs(z + TURN_RADIUS));
  }
  const turnCenterX = x > STRAIGHT_HALF_LENGTH ? STRAIGHT_HALF_LENGTH : -STRAIGHT_HALF_LENGTH;
  return Math.abs(Math.hypot(x - turnCenterX, z) - TURN_RADIUS);
}

/** True if this world column falls within the loop road's width. */
export function isRoadColumn(worldX: number, worldZ: number): boolean {
  return distanceToLoop(worldX, worldZ) <= ROAD_HALF_WIDTH;
}

/**
 * Point on the loop's centerline at arc-length `s` (wraps automatically),
 * plus the heading (this engine's yaw convention: forward = (sin(yaw),
 * cos(yaw))) facing the direction of increasing `s` — i.e. the direction
 * a car driving the loop travels. Used by Car's AI to follow the track
 * without needing intersections or turn decisions like the old grid did.
 */
export function pointAtProgress(s: number): { x: number; z: number; yaw: number } {
  const L = STRAIGHT_HALF_LENGTH;
  const R = TURN_RADIUS;
  let t = ((s % LOOP_PERIMETER) + LOOP_PERIMETER) % LOOP_PERIMETER;

  const straight = 2 * L;
  const turn = Math.PI * R;

  if (t < straight) {
    return { x: -L + t, z: R, yaw: Math.PI / 2 };
  }
  t -= straight;
  if (t < turn) {
    const angle = Math.PI / 2 - t / R;
    return { x: L + R * Math.cos(angle), z: R * Math.sin(angle), yaw: Math.PI - angle };
  }
  t -= turn;
  if (t < straight) {
    return { x: L - t, z: -R, yaw: -Math.PI / 2 };
  }
  t -= straight;
  const angle = -Math.PI / 2 - t / R;
  return { x: -L + R * Math.cos(angle), z: R * Math.sin(angle), yaw: Math.PI - angle };
}
