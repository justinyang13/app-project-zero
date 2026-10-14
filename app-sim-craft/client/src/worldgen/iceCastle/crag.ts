// The glacier the ice castle stands on: a terraced crag of slate-blue rock
// under snow — a flat plateau beneath the castle, cliffs stepping down in
// 3-block ledges with ragged edges and bands of packed and blue ice, a ring
// of tall crystalline ice spires for silhouette, and the stair-ramp cut up
// its southern face to the outer gate. Everything is a pure function of world
// (x, z) with a fixed internal noise seed (never the world seed), so the
// castle looks identical in every world; terrain.ts folds it into
// sampleColumn as `max(natural terrain, crag)`, the same way it folds in the
// dark castle's crag (worldgen/castle/crag.ts).
//
// The ground around it is frosted: whatever biome the seed put there, the
// snowfield around the glacier is snow-covered, with packed-ice patches
// closer in (iceFrost / iceFrostSurfaceBlock), so the castle always stands
// in its snowy country.
import { seededNoise2D } from "../noise";
import { getBlockByKey } from "../../data/blocks";
import { ICE_CASTLE_CENTER, ICE_FLOOR_Y, ICE_RAMP_DROP_PER_BLOCK, ICE_RAMP_HALF_WIDTH, ICE_RAMP_START_Z } from "./layout";

const CRAG_SEED = 0x1ce5ca51;
const SALT_SHAPE = 0x21;
const SALT_DETAIL = 0x22;
const SALT_FROST = 0x23;

// The plateau (rounded rectangle) the castle's walls sit on, in castle-local
// coordinates — the same footprint as the dark castle's.
const HULL_HALF_X = 41;
const HULL_HALF_Z = 35;
const HULL_CENTER_LZ = -3;
const HULL_CORNER_RADIUS = 6;
const SLOPE = 1.5; // blocks of height lost per block of run beyond the plateau
const TERRACE = 3; // ledge height
const MAX_RUN = 48; // beyond this the crag is always below any natural terrain
const NOISE_SCALE_SHAPE = 0.07;
const NOISE_SCALE_DETAIL = 0.19;

// The frosted ground: solid frost within FROST_SOLID blocks of the plateau,
// easing to the natural surface at FROST_REACH.
const FROST_SOLID = 26;
const FROST_REACH = 110;
const FROST_BOUND_X = HULL_HALF_X + FROST_REACH + 14;
const FROST_BOUND_Z = HULL_HALF_Z + FROST_REACH + 14;

// Tall ice spires around the rim, as (local dx, local dz, radius, height above the plateau).
const SPIRES: { dx: number; dz: number; r: number; h: number }[] = [
  { dx: -61, dz: 8, r: 11, h: 30 },
  { dx: -54, dz: -26, r: 9, h: 21 },
  { dx: 62, dz: 4, r: 12, h: 34 },
  { dx: 55, dz: -31, r: 10, h: 19 },
  { dx: -26, dz: -55, r: 10, h: 17 },
  { dx: 31, dz: -53, r: 11, h: 24 },
  { dx: 4, dz: -63, r: 13, h: 32 },
  { dx: -57, dz: 31, r: 8, h: 13 },
  { dx: 58, dz: 33, r: 9, h: 15 },
];

const SPIRE_REACH = Math.max(...SPIRES.map((s) => Math.hypot(s.dx, s.dz) + s.r));
const BOUND_X = Math.max(HULL_HALF_X + MAX_RUN, SPIRE_REACH) + 2;
const BOUND_Z = Math.max(HULL_HALF_Z + MAX_RUN, SPIRE_REACH) + 2;

const glacierRock = getBlockByKey("glacier_rock").id;
const glacierCobble = getBlockByKey("glacier_cobble").id;
const snowRock = getBlockByKey("snow_rock").id;
const snowBlock = getBlockByKey("snow_block").id;
const snowTurf = getBlockByKey("snow_turf").id;
const packedIce = getBlockByKey("packed_ice").id;
const blueIce = getBlockByKey("blue_ice").id;
const frostPolished = getBlockByKey("frost_polished").id;
const frostBrick = getBlockByKey("frost_brick");

/** What kind of ice-castle terrain a column is (0 = none). Continues the dark crag's 1 (rock) and 2 (ramp). */
export const ICE_NONE = 0;
export const ICE_ROCK = 3;
export const ICE_RAMP = 4;

function hash3(x: number, y: number, z: number, salt: number): number {
  let h = (Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2246822519) ^ Math.imul(salt, 3266489917)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Signed distance (blocks) from the plateau's rounded-rectangle edge: <= 0 on the plateau, growing outward. */
function hullDistance(dx: number, dz: number): number {
  const qx = Math.abs(dx) - (HULL_HALF_X - HULL_CORNER_RADIUS);
  const qz = Math.abs(dz - HULL_CENTER_LZ) - (HULL_HALF_Z - HULL_CORNER_RADIUS);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - HULL_CORNER_RADIUS;
}

/** Height (world Y of the surface block) of the crag at (x, z), or -Infinity well outside its footprint. */
export function iceCragHeight(x: number, z: number): number {
  const dx = x - ICE_CASTLE_CENTER.x;
  const dz = z - ICE_CASTLE_CENTER.z;
  if (Math.abs(dx) > BOUND_X || Math.abs(dz) > BOUND_Z) return -Infinity;

  const shape = seededNoise2D(CRAG_SEED, SALT_SHAPE);
  const detail = seededNoise2D(CRAG_SEED, SALT_DETAIL);

  const outside = hullDistance(dx, dz);

  let h = -Infinity;
  if (outside <= 0) {
    h = ICE_FLOOR_Y;
  } else if (outside < MAX_RUN) {
    const ragged = shape(x * NOISE_SCALE_SHAPE, z * NOISE_SCALE_SHAPE) * 8 + detail(x * NOISE_SCALE_DETAIL, z * NOISE_SCALE_DETAIL) * 2.4;
    const drop = outside * SLOPE + ragged * Math.min(1, outside / 5);
    h = ICE_FLOOR_Y - TERRACE * Math.round(drop / TERRACE);
    h = Math.min(h, ICE_FLOOR_Y);
  }

  for (const spire of SPIRES) {
    const d = Math.hypot(dx - spire.dx, dz - spire.dz);
    if (d >= spire.r) continue;
    // Sharper than the dark crag's spires: a steeper exponent gives a needle with a faceted, crystalline jag.
    const jag = detail(x * 0.34, z * 0.34) * 2.2;
    const spireTop = ICE_FLOOR_Y + Math.floor(spire.h * Math.pow(1 - d / spire.r, 1.7) + jag);
    if (spireTop > h) h = spireTop;
  }
  return h;
}

/** World Y of the approach ramp's surface at (x, z), or null off the ramp. The ramp descends from just under the courtyard floor, south of the outer gate. */
export function iceRampHeight(x: number, z: number): number | null {
  const dx = x - ICE_CASTLE_CENTER.x;
  const dz = z - (ICE_CASTLE_CENTER.z + ICE_RAMP_START_Z);
  if (dz < 0 || Math.abs(dx) > ICE_RAMP_HALF_WIDTH) return null;
  return ICE_FLOOR_Y - 1 - Math.round(dz * ICE_RAMP_DROP_PER_BLOCK);
}

// Low ground around the castle is filled in to dry snowfield: depending on
// the world seed the natural heightmap can dip under sea level right at the
// foot of the approach ramp, which would drown the stairs in a pond.
const LAND_FLOOR_Y = 67;
const LAND_FULL = 60;
const LAND_FADE = 100;

/** Natural terrain height with any low ground near the castle raised to dry land. */
export function raiseIceGround(naturalHeight: number, x: number, z: number): number {
  if (naturalHeight >= LAND_FLOOR_Y) return naturalHeight;
  const dx = x - ICE_CASTLE_CENTER.x;
  const dz = z - ICE_CASTLE_CENTER.z;
  if (Math.abs(dx) > HULL_HALF_X + LAND_FADE || Math.abs(dz) > HULL_HALF_Z + LAND_FADE + 6) return naturalHeight;
  const t = Math.min(1, Math.max(0, (hullDistance(dx, dz) - LAND_FULL) / (LAND_FADE - LAND_FULL)));
  const w = 1 - t * t * (3 - 2 * t);
  return Math.round(naturalHeight + (LAND_FLOOR_Y - naturalHeight) * w);
}

/** Combines the natural terrain height with the crag and ramp: rock rises out of the ground wherever it's higher, and the ramp is cut (or built up) to its own gentle slope until it meets the natural ground. */
export function applyIceCrag(naturalHeight: number, x: number, z: number): { height: number; kind: number } {
  let height = naturalHeight;
  let kind = ICE_NONE;
  const crag = iceCragHeight(x, z);
  if (crag > height) {
    height = crag;
    kind = ICE_ROCK;
  }
  const ramp = iceRampHeight(x, z);
  if (ramp !== null && ramp > naturalHeight) {
    height = ramp;
    kind = ICE_RAMP;
  }
  return { height, kind };
}

/** World-space ground height of a castle-local (x, z), for the baked light map (the ramp is cut through the crag, so on its columns the ramp is the ground). */
export function iceGroundAt(lx: number, lz: number): number {
  const crag = iceCragHeight(ICE_CASTLE_CENTER.x + lx, ICE_CASTLE_CENTER.z + lz);
  const ramp = iceRampHeight(ICE_CASTLE_CENTER.x + lx, ICE_CASTLE_CENTER.z + lz);
  return ramp ?? (crag === -Infinity ? 68 : crag);
}

/** The block for the very top of a crag/ramp column: snow-capped rock, with windblown snow drifts and glassy patches of ice. The ramp is stair-stone with a brick kerb. */
export function iceCragSurfaceBlock(x: number, z: number, kind: number): number {
  if (kind === ICE_RAMP) {
    const dx = x - ICE_CASTLE_CENTER.x;
    if (Math.abs(dx) === ICE_RAMP_HALF_WIDTH || (z & 3) === 0) return frostBrick.id;
    return frostPolished;
  }
  const patch = seededNoise2D(CRAG_SEED, SALT_DETAIL)(x * 0.12 + 40, z * 0.12 - 17);
  if (patch > 0.3) return packedIce; // a glassy shelf
  if (hash3(x >> 2, 3, z >> 2, 9) > 0.84) return snowBlock; // a drift
  return snowRock;
}

/** The block for a crag/ramp column below its surface: slate rock in coherent clumps, banded with packed and blue ice like the strata of a glacier face. */
export function iceCragBodyBlock(x: number, y: number, z: number, surfaceY: number, kind: number): number {
  const depth = surfaceY - y;
  const clump = hash3(x >> 1, y >> 1, z >> 1, 27);
  const fine = hash3(x, y, z, 28);
  const r = clump * 0.65 + fine * 0.35;
  // Ice strata: horizontal bands a few blocks thick, wavering with x/z so each ledge looks layered.
  const band = Math.floor((y + Math.round(seededNoise2D(CRAG_SEED, SALT_SHAPE)(x * 0.05, z * 0.05) * 4)) / 5);
  if (kind === ICE_ROCK && depth > 1 && hash3(band, 0, 0, 29) > 0.55 && fine > 0.18) return hash3(band, 1, 0, 30) > 0.5 ? packedIce : blueIce;
  if (kind === ICE_ROCK && depth > 2 && hash3(x >> 1, y >> 1, z >> 1, 31) > 0.975) return blueIce; // a pocket of deep ice
  if (depth <= 3) return r < 0.5 ? glacierCobble : glacierRock;
  return r < 0.7 ? glacierRock : glacierCobble;
}

/** How frosted the natural ground at (x, z) is: 1 hugging the castle's crag, easing to 0 (the natural surface) FROST_REACH blocks out. Ragged with slow noise so the edge is blotchy rather than a ring. */
export function iceFrost(x: number, z: number): number {
  const dx = x - ICE_CASTLE_CENTER.x;
  const dz = z - ICE_CASTLE_CENTER.z;
  if (Math.abs(dx) > FROST_BOUND_X || Math.abs(dz) > FROST_BOUND_Z) return 0;
  const blotch = seededNoise2D(CRAG_SEED, SALT_FROST);
  const distance = hullDistance(dx, dz) + blotch(x * 0.045, z * 0.045) * 14 + blotch(x * 0.16 + 90, z * 0.16) * 3;
  const t = Math.min(1, Math.max(0, (distance - FROST_SOLID) / (FROST_REACH - FROST_SOLID)));
  return 1 - t * t * (3 - 2 * t);
}

/** The surface block for natural (non-crag) ground with the given frost: the natural block when there's none, otherwise snow turf, deepening to drifts and glassy ice patches close to the glacier. */
export function iceFrostSurfaceBlock(x: number, z: number, frost: number, natural: number): number {
  if (frost <= 0.08) return natural;
  const jitter = (hash3(x >> 1, 41, z >> 1, 42) * 0.6 + hash3(x, 41, z, 43) * 0.4 - 0.5) * 0.9;
  const stage = frost + jitter;
  if (stage < 0.18) return natural;
  if (stage < 0.72) return snowTurf;
  if (stage < 0.9) return snowBlock;
  return hash3(x >> 1, 44, z >> 1, 45) < 0.5 ? packedIce : snowBlock;
}
