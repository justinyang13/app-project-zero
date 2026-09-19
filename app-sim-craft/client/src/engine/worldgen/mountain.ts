// A single fixed landmark: a broad, gentle hill (the "dragon mountain" —
// the two giant dragons circle it, see engine/Dragon.ts). It's just
// terrain: no cave, no summit platform, nothing stamped into it. Its
// height is folded into the heightmap itself (terrain.ts's sampleColumn) so
// every consumer of column height (lighting, chunk sizing, findSurfaceY,
// the maps) sees it for free.
//
// The profile is a wide smoothstep dome — flat-topped at the very summit,
// easing out to nothing at the rim, never steeper than ~0.5 blocks of rise
// per block of run — so it's walkable all the way up and reads as a
// rolling hill rather than a spike. Low, slow noise ripples its flanks so
// it isn't a perfect cone.
import { fbm2D, seededNoise2D } from "./noise";

const MOUNTAIN_SALT = 0x5eed03;

export const MOUNTAIN_CENTER = { x: 60, z: -190 };
export const MOUNTAIN_RADIUS = 130;
export const MOUNTAIN_PEAK_BOOST = 46;

/** Extra height added on top of the normal biome heightmap — 0 outside the hill's footprint, domed up to MOUNTAIN_PEAK_BOOST at its center. */
export function mountainHeightBoost(seed: number, worldX: number, worldZ: number): number {
  const dx = worldX - MOUNTAIN_CENTER.x;
  const dz = worldZ - MOUNTAIN_CENTER.z;
  const dist = Math.hypot(dx, dz);
  if (dist >= MOUNTAIN_RADIUS) return 0;
  const t = 1 - dist / MOUNTAIN_RADIUS;
  const dome = t * t * (3 - 2 * t); // smoothstep: rounded top, tapering smoothly into the surrounding terrain at the rim
  const ripple = fbm2D(seededNoise2D(seed, MOUNTAIN_SALT), worldX, worldZ, 2, 1 / 70, 0.5);
  return Math.round(dome * MOUNTAIN_PEAK_BOOST + ripple * 5 * dome);
}

// The two dragons fly wide circuits round the hill, high above its summit
// (see engine/Dragon.ts): the green-winged one closer and lower, the
// crimson one wider and higher, the other way round.
export const GREEN_DRAGON_FLIGHT_RADIUS = MOUNTAIN_RADIUS + 40;
export const GREEN_DRAGON_ALTITUDE_ABOVE_PEAK = 40;
export const SUMMIT_DRAGON_FLIGHT_RADIUS = MOUNTAIN_RADIUS + 70;
export const SUMMIT_DRAGON_ALTITUDE_ABOVE_PEAK = 55;
