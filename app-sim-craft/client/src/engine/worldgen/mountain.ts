// A single fixed landmark: a mountain far taller than anything the normal
// heightmap produces (see terrain.ts's sampleColumn), with a giant cave
// carved into its southern flank (the flank facing spawn) big enough to
// house the giant Dragon (see engine/Dragon.ts). Same "fixed, deterministic
// landmark" approach as worldgen/structures.ts's castle/bridge — one
// hard-coded location rather than probabilistic placement — but the
// mountain's height is folded into the heightmap itself (sampleColumn)
// since it needs to affect every column-fill/lighting/max-chunk-height
// computation that already depends on that pipeline, whereas the cave is a
// pure carve-after-fill stamp like a structure.
import { fbm2D, seededNoise2D } from "./noise";

const MOUNTAIN_SALT = 0x5eed03;

export const MOUNTAIN_CENTER = { x: 60, z: -190 };
export const MOUNTAIN_RADIUS = 66;
const MOUNTAIN_PEAK_BOOST = 120;

/** Extra height added on top of the normal biome heightmap — 0 outside the mountain's footprint, domed up to MOUNTAIN_PEAK_BOOST (plus some ridge jaggedness) at its center. Called from terrain.ts's sampleColumn so every consumer of column height (lighting, chunk sizing, findSurfaceY) sees the mountain for free. */
export function mountainHeightBoost(seed: number, worldX: number, worldZ: number): number {
  const dx = worldX - MOUNTAIN_CENTER.x;
  const dz = worldZ - MOUNTAIN_CENTER.z;
  const dist = Math.hypot(dx, dz);
  if (dist >= MOUNTAIN_RADIUS) return 0;
  const t = 1 - dist / MOUNTAIN_RADIUS;
  const dome = t * t * (3 - 2 * t); // smoothstep: rounded peak, tapering smoothly to the surrounding terrain at the edge
  const ridge = fbm2D(seededNoise2D(seed, MOUNTAIN_SALT), worldX, worldZ, 3, 1 / 36, 0.5);
  return Math.round(dome * MOUNTAIN_PEAK_BOOST + ridge * 12 * dome);
}

// Cave geometry: a tunnel from the mountain's south flank (CAVE_APPROACH
// points from the peak toward the mouth) into a large domed chamber
// closer to the mountain's heart. Both the tunnel and the chamber are
// defined by isCaveVoxel below so the carving stamp (structures.ts) and
// anything that needs the cave's shape at runtime (none yet, but keeps it
// in one place) agree exactly.
const CAVE_APPROACH = { x: 0, z: 1 };
const CAVE_MOUTH_DIST = 48;
export const CAVE_MOUTH = {
  x: MOUNTAIN_CENTER.x + CAVE_APPROACH.x * CAVE_MOUTH_DIST,
  z: MOUNTAIN_CENTER.z + CAVE_APPROACH.z * CAVE_MOUTH_DIST,
};
const CAVE_MOUTH_RADIUS = 15;
const CHAMBER_DIST = 14;
export const CHAMBER_CENTER = {
  x: MOUNTAIN_CENTER.x + CAVE_APPROACH.x * CHAMBER_DIST,
  z: MOUNTAIN_CENTER.z + CAVE_APPROACH.z * CHAMBER_DIST,
};
export const CHAMBER_RADIUS = 40;
export const CHAMBER_HEIGHT = 34;
/** How far below the mouth's natural surface height the cave floor sits — reads as a cave dug into the slope rather than a platform floating at grade. */
export const CAVE_FLOOR_DIG = 6;

export const CAVE_BOUNDS = {
  minX: Math.min(CAVE_MOUTH.x - CAVE_MOUTH_RADIUS, CHAMBER_CENTER.x - CHAMBER_RADIUS) - 1,
  maxX: Math.max(CAVE_MOUTH.x + CAVE_MOUTH_RADIUS, CHAMBER_CENTER.x + CHAMBER_RADIUS) + 1,
  minZ: Math.min(CAVE_MOUTH.z - CAVE_MOUTH_RADIUS, CHAMBER_CENTER.z - CHAMBER_RADIUS) - 1,
  maxZ: Math.max(CAVE_MOUTH.z + CAVE_MOUTH_RADIUS, CHAMBER_CENTER.z + CHAMBER_RADIUS) + 1,
};

/** True if this world voxel is inside the tunnel-or-chamber cavity and should be carved to air. floorY is the cave's world-Y floor (see structures.ts's getStructureAnchors). Never carves the floor layer itself. */
export function isCaveVoxel(wx: number, wy: number, wz: number, floorY: number): boolean {
  const dy = wy - floorY;
  if (dy <= 0) return false;

  const cdx = wx - CHAMBER_CENTER.x;
  const cdz = wz - CHAMBER_CENTER.z;
  const chamberDist = Math.hypot(cdx, cdz);
  const chamberU = dy / CHAMBER_HEIGHT;
  if (chamberU < 1) {
    const chamberRadiusHere = CHAMBER_RADIUS * Math.sqrt(Math.max(0, 1 - chamberU * chamberU));
    if (chamberDist <= chamberRadiusHere) return true;
  }

  const segX = CHAMBER_CENTER.x - CAVE_MOUTH.x;
  const segZ = CHAMBER_CENTER.z - CAVE_MOUTH.z;
  const segLenSq = segX * segX + segZ * segZ || 1;
  const rawAlong = ((wx - CAVE_MOUTH.x) * segX + (wz - CAVE_MOUTH.z) * segZ) / segLenSq;
  const along = Math.max(0, Math.min(1, rawAlong));
  const projX = CAVE_MOUTH.x + segX * along;
  const projZ = CAVE_MOUTH.z + segZ * along;
  const tunnelDist = Math.hypot(wx - projX, wz - projZ);
  const tunnelRadiusHere = CAVE_MOUTH_RADIUS + (CHAMBER_RADIUS - CAVE_MOUTH_RADIUS) * along;
  const tunnelHeightHere = CAVE_MOUTH_RADIUS * 1.6 + (CHAMBER_HEIGHT - CAVE_MOUTH_RADIUS * 1.6) * along;
  return tunnelDist <= tunnelRadiusHere && dy <= tunnelHeightHere;
}

// Where the giant dragon lives (see engine/Dragon.ts + GameLoop.ts's
// spawnDragon): perched on a raised dais at the chamber's center while
// resting, occasionally launching out through the mouth to circle the
// mountain's peak before returning.
export const DRAGON_PERCH = { x: CHAMBER_CENTER.x, z: CHAMBER_CENTER.z };
export const DRAGON_FLIGHT_RADIUS = MOUNTAIN_RADIUS + 44;
export const DRAGON_FLIGHT_ALTITUDE_ABOVE_PEAK = 30;

// The green-winged dragon shares the cave: its own dais on the far side of
// the chamber from the original dragon's.
export const GREEN_DRAGON_PERCH = { x: CHAMBER_CENTER.x - 22, z: CHAMBER_CENTER.z - 2 };
export const GREEN_DRAGON_FLIGHT_RADIUS = MOUNTAIN_RADIUS + 68;
export const GREEN_DRAGON_ALTITUDE_ABOVE_PEAK = 45;

// The crimson dragon roosts on a flattened platform at the very summit and
// circles the mountain the other way, wider and higher than the cave
// dragon (see engine/Dragon.ts's createDragons).
export const SUMMIT_ROOST_RADIUS = 10;
export const SUMMIT_DRAGON_FLIGHT_RADIUS = MOUNTAIN_RADIUS + 90;
export const SUMMIT_DRAGON_ALTITUDE_ABOVE_PEAK = 60;

/** Torch positions ringing the chamber wall, evenly spaced — see GameLoop's landmark Torch visuals (always lit, same as CAMPFIRE_SITES). */
export const CAVE_TORCH_OFFSETS: { x: number; z: number }[] = Array.from({ length: 6 }, (_, i) => {
  const angle = (i / 6) * Math.PI * 2;
  const r = CHAMBER_RADIUS - 6;
  return { x: Math.round(Math.cos(angle) * r), z: Math.round(Math.sin(angle) * r) };
});

/** Small stalagmite positions scattered around the chamber floor, away from the dais and the mouth-facing approach lane, purely for atmosphere. */
export const CAVE_SPIKE_OFFSETS: { x: number; z: number; height: number }[] = [
  { x: 24, z: 14, height: 5 },
  { x: -26, z: 16, height: 4 },
  { x: 10, z: -30, height: 6 },
  { x: -18, z: -24, height: 4 },
  { x: 30, z: -8, height: 5 },
  { x: -10, z: 28, height: 4 },
];
