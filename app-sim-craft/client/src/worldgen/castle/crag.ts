// The mountain the castle stands on: a dark, terraced crag — a flat
// plateau under the castle, cliffs stepping down in 3-block ledges with
// noisy, jagged edges, and a handful of tall rock spires around the rim
// for silhouette — plus the causeway ramp cut up its southern face to the
// outer gate. Everything here is a pure function of world (x, z) with a
// fixed internal noise seed (never the world seed), so the castle looks
// identical in every world; terrain.ts folds it into sampleColumn as
// `max(natural terrain, crag)`, exactly the way mountain.ts folds in the
// dragon mountain.
import { seededNoise2D } from "../noise";
import { getBlockByKey } from "../../data/blocks";
import { CASTLE_CENTER, CASTLE_FLOOR_Y, RAMP_DROP_PER_BLOCK, RAMP_HALF_WIDTH, RAMP_START_Z } from "./layout";

const CRAG_SEED = 0x7a11c0de;
const SALT_SHAPE = 0x11;
const SALT_DETAIL = 0x12;
const SALT_BLIGHT = 0x13;

// The plateau (rounded rectangle) that the castle's walls sit on, in
// castle-local coordinates, centered slightly north of the origin since
// the footprint runs further back than forward.
const HULL_HALF_X = 41;
const HULL_HALF_Z = 35;
const HULL_CENTER_LZ = -3;
const HULL_CORNER_RADIUS = 6;
const SLOPE = 1.55; // blocks of height lost per block of run beyond the plateau
const TERRACE = 3; // ledge height
const MAX_RUN = 48; // beyond this the crag is always below any natural terrain
const NOISE_SCALE_SHAPE = 0.07;
const NOISE_SCALE_DETAIL = 0.19;

// The blighted ground: natural terrain beyond the crag keeps its meadow
// biome, but its surface darkens the closer it gets to the castle — solid
// dark within BLIGHT_SOLID blocks of the plateau, fading to plain turf at
// BLIGHT_REACH — so the crag's dark rock blends into the meadow rather
// than butting against it.
const BLIGHT_SOLID = 14;
const BLIGHT_REACH = 84;
const BLIGHT_BOUND_X = HULL_HALF_X + BLIGHT_REACH + 14;
const BLIGHT_BOUND_Z = HULL_HALF_Z + BLIGHT_REACH + 14;
const BLIGHT_STAGES = 4; // 0 = natural surface, 4 = bare dark rock

// Tall rock spires around the rim, as (local dx, local dz, radius, height above the plateau).
const SPIRES: { dx: number; dz: number; r: number; h: number }[] = [
  { dx: -60, dz: 4, r: 12, h: 24 },
  { dx: -55, dz: -28, r: 9, h: 16 },
  { dx: 61, dz: 0, r: 12, h: 28 },
  { dx: 56, dz: -30, r: 10, h: 15 },
  { dx: -28, dz: -54, r: 10, h: 13 },
  { dx: 30, dz: -52, r: 11, h: 19 },
  { dx: 2, dz: -62, r: 13, h: 26 },
  { dx: -58, dz: 30, r: 8, h: 10 },
  { dx: 58, dz: 32, r: 9, h: 12 },
];

const SPIRE_REACH = Math.max(...SPIRES.map((s) => Math.hypot(s.dx, s.dz) + s.r));
const BOUND_X = Math.max(HULL_HALF_X + MAX_RUN, SPIRE_REACH) + 2;
const BOUND_Z = Math.max(HULL_HALF_Z + MAX_RUN, SPIRE_REACH) + 2;

const gloomstone = getBlockByKey("gloomstone").id;
const umbralCobble = getBlockByKey("umbral_cobble").id;
const umbralSlate = getBlockByKey("umbral_slate").id;
const gloomMoss = getBlockByKey("gloom_moss").id;
const gloomPolished = getBlockByKey("gloom_polished").id;
const gloomBrick = getBlockByKey("gloom_brick").id;
const magma = getBlockByKey("magma").id;
const rustRock = getBlockByKey("rust_rock").id;
const duskTurf = getBlockByKey("dusk_turf").id;
const witheredTurf = getBlockByKey("withered_turf").id;

/** What kind of castle terrain a column is (0 = none). Stored on ColumnSample so terrain.ts can pick materials. */
export const CRAG_NONE = 0;
export const CRAG_ROCK = 1;
export const CRAG_RAMP = 2;

function hash3(x: number, y: number, z: number, salt: number): number {
  let h = (Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2246822519) ^ Math.imul(salt, 3266489917)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Signed distance (blocks) from the castle plateau's rounded-rectangle edge: <= 0 on the plateau, growing outward. */
function hullDistance(dx: number, dz: number): number {
  const qx = Math.abs(dx) - (HULL_HALF_X - HULL_CORNER_RADIUS);
  const qz = Math.abs(dz - HULL_CENTER_LZ) - (HULL_HALF_Z - HULL_CORNER_RADIUS);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - HULL_CORNER_RADIUS;
}

/** Height (world Y of the surface block) of the crag at (x, z), or -Infinity well outside its footprint. */
export function cragHeight(x: number, z: number): number {
  const dx = x - CASTLE_CENTER.x;
  const dz = z - CASTLE_CENTER.z;
  if (Math.abs(dx) > BOUND_X || Math.abs(dz) > BOUND_Z) return -Infinity;

  const shape = seededNoise2D(CRAG_SEED, SALT_SHAPE);
  const detail = seededNoise2D(CRAG_SEED, SALT_DETAIL);

  const outside = hullDistance(dx, dz);

  let h = -Infinity;
  if (outside <= 0) {
    h = CASTLE_FLOOR_Y;
  } else if (outside < MAX_RUN) {
    const ragged = shape(x * NOISE_SCALE_SHAPE, z * NOISE_SCALE_SHAPE) * 8 + detail(x * NOISE_SCALE_DETAIL, z * NOISE_SCALE_DETAIL) * 2.4;
    const drop = outside * SLOPE + ragged * Math.min(1, outside / 5);
    h = CASTLE_FLOOR_Y - TERRACE * Math.round(drop / TERRACE);
    h = Math.min(h, CASTLE_FLOOR_Y);
  }

  for (const spire of SPIRES) {
    const d = Math.hypot(dx - spire.dx, dz - spire.dz);
    if (d >= spire.r) continue;
    const jag = detail(x * 0.31, z * 0.31) * 1.6;
    const spireTop = CASTLE_FLOOR_Y + Math.floor(spire.h * Math.pow(1 - d / spire.r, 1.35) + jag);
    if (spireTop > h) h = spireTop;
  }
  return h;
}

/** World Y of the approach ramp's surface at (x, z), or null off the ramp. The ramp descends from just under the courtyard floor, south of the outer gate. */
export function rampHeight(x: number, z: number): number | null {
  const dx = x - CASTLE_CENTER.x;
  const dz = z - (CASTLE_CENTER.z + RAMP_START_Z);
  if (dz < 0 || Math.abs(dx) > RAMP_HALF_WIDTH) return null;
  return CASTLE_FLOOR_Y - 1 - Math.round(dz * RAMP_DROP_PER_BLOCK);
}

// Low ground around the castle is filled in to a dry meadow: depending on
// the world seed the natural heightmap can dip under sea level right at the
// foot of the approach ramp, which would drown the stairs in a pond. Within
// LAND_FULL blocks of the plateau the ground is never lower than
// LAND_FLOOR_Y, easing back to the natural terrain by LAND_FADE.
const LAND_FLOOR_Y = 67;
const LAND_FULL = 60;
const LAND_FADE = 100;

/** Natural terrain height with any low ground near the castle raised to dry land. */
export function raiseCastleGround(naturalHeight: number, x: number, z: number): number {
  if (naturalHeight >= LAND_FLOOR_Y) return naturalHeight;
  const dx = x - CASTLE_CENTER.x;
  const dz = z - CASTLE_CENTER.z;
  if (Math.abs(dx) > HULL_HALF_X + LAND_FADE || Math.abs(dz) > HULL_HALF_Z + LAND_FADE + 6) return naturalHeight;
  const t = Math.min(1, Math.max(0, (hullDistance(dx, dz) - LAND_FULL) / (LAND_FADE - LAND_FULL)));
  const w = 1 - t * t * (3 - 2 * t);
  return Math.round(naturalHeight + (LAND_FLOOR_Y - naturalHeight) * w);
}

/** Combines the natural terrain height with the crag and ramp: rock rises out of the ground wherever it's higher, and the ramp is cut (or built up) to its own gentle slope until it meets the natural ground. */
export function applyCrag(naturalHeight: number, x: number, z: number): { height: number; kind: number } {
  let height = naturalHeight;
  let kind = CRAG_NONE;
  const crag = cragHeight(x, z);
  if (crag > height) {
    height = crag;
    kind = CRAG_ROCK;
  }
  const ramp = rampHeight(x, z);
  if (ramp !== null && ramp > naturalHeight) {
    height = ramp;
    kind = CRAG_RAMP;
  }
  return { height, kind };
}

/** The block for the very top of a crag/ramp column. */
export function cragSurfaceBlock(x: number, z: number, kind: number): number {
  if (kind === CRAG_RAMP) {
    const dx = x - CASTLE_CENTER.x;
    if (Math.abs(dx) === RAMP_HALF_WIDTH || (z & 3) === 0) return gloomBrick;
    return gloomPolished;
  }
  const patch = seededNoise2D(CRAG_SEED, SALT_DETAIL)(x * 0.12 + 40, z * 0.12 - 17);
  if (patch > 0.28) return gloomMoss;
  const r = hash3(x >> 1, 0, z >> 1, 5) * 0.7 + hash3(x, 0, z, 6) * 0.3;
  if (hash3(x >> 2, 3, z >> 2, 9) > 0.86) return rustRock;
  return r < 0.4 ? gloomstone : umbralCobble;
}

/** The block for a crag/ramp column below its surface: dark rock in coherent 2-block clumps, with the odd vein of magma glowing out of a cliff face. */
export function cragBodyBlock(x: number, y: number, z: number, surfaceY: number, kind: number): number {
  const depth = surfaceY - y;
  const clump = hash3(x >> 1, y >> 1, z >> 1, 7);
  const fine = hash3(x, y, z, 8);
  const r = clump * 0.65 + fine * 0.35;
  // Veins of magma: a rare 2x2x2 clump is "hot", and within it most blocks glow.
  if (kind === CRAG_ROCK && depth > 2 && hash3(x >> 1, y >> 1, z >> 1, 13) > 0.982 && fine > 0.28) return magma;
  if (hash3(x >> 2, y >> 2, z >> 2, 14) > 0.9) return rustRock;
  if (depth <= 3) return r < 0.5 ? umbralCobble : r < 0.85 ? gloomstone : umbralSlate;
  return r < 0.5 ? umbralSlate : r < 0.82 ? gloomstone : umbralCobble;
}

/** How blighted the natural ground at (x, z) is: 1 hugging the castle's crag, easing to 0 (plain meadow) BLIGHT_REACH blocks out. Ragged with slow noise so the fade is blotchy rather than a ring. */
export function castleBlight(x: number, z: number): number {
  const dx = x - CASTLE_CENTER.x;
  const dz = z - CASTLE_CENTER.z;
  if (Math.abs(dx) > BLIGHT_BOUND_X || Math.abs(dz) > BLIGHT_BOUND_Z) return 0;
  const blotch = seededNoise2D(CRAG_SEED, SALT_BLIGHT);
  const distance = hullDistance(dx, dz) + blotch(x * 0.045, z * 0.045) * 11 + blotch(x * 0.16 + 90, z * 0.16) * 3;
  const t = Math.min(1, Math.max(0, (distance - BLIGHT_SOLID) / (BLIGHT_REACH - BLIGHT_SOLID)));
  return 1 - t * t * (3 - 2 * t);
}

/** The surface block for a natural (non-crag) column with the given blight: the natural block when there's none, otherwise a dithered blend that darkens turf -> dusk -> withered -> gloom moss -> bare rock as blight grows. */
export function blightSurfaceBlock(x: number, z: number, blight: number, natural: number): number {
  if (blight <= 0.02) return natural;
  const jitter = (hash3(x >> 1, 21, z >> 1, 22) * 0.6 + hash3(x, 21, z, 23) * 0.4 - 0.5) * 1.3;
  const stage = Math.round(blight * BLIGHT_STAGES + jitter);
  if (stage <= 0) return natural;
  if (stage === 1) return duskTurf;
  if (stage === 2) return witheredTurf;
  if (stage === 3) return gloomMoss;
  return hash3(x >> 1, 24, z >> 1, 25) < 0.55 ? umbralCobble : gloomstone;
}
