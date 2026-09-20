// The dark castle, drawn block by block into a CastlePlan (castle/plan.ts)
// in the castle's local frame (castle/layout.ts: +x east, +z south = the
// front, y = 0 is the courtyard floor). It follows the concept art it was
// built from: a long, banner-hung curtain wall with a glowing pagoda
// pavilion at each end; behind it a stepped, terraced keep rising through
// tiers to a battlemented crown with flame-topped turrets and a tall
// spire; in front a lava-river courtyard with brazier pillars, a bridge and
// a low outer wall with a gatehouse — all in weathered gloomstone brick
// lit by lattice windows, braziers and molten lava.
//
// Drawing order matters: later calls overwrite earlier ones, so each
// section carves its openings after its walls exist.
import { getBlockByKey } from "../../data/blocks";
import { cragHeight, rampHeight } from "./crag";
import { CASTLE_CENTER, CASTLE_FLOOR_Y, RAMP_START_Z } from "./layout";
import { CastlePlan, type BlockSource, type Facing } from "./plan";

const id = (key: string): number => getBlockByKey(key).id;
const AIR = 0;
const BRICK = id("gloom_brick");
const CRACKED = id("gloom_brick_cracked");
const MOSSY = id("gloom_brick_mossy");
const POLISHED = id("gloom_polished");
const RUNED = id("gloom_runed");
const COLUMN = id("gloom_column");
const SLATE = id("umbral_slate");
const MOSS = id("gloom_moss");
const MAGMA = id("magma");
const EMBER = id("ember_brick");
const LATTICE = id("ember_lattice");
const DARK_LATTICE = id("dark_lattice");
const GRATE = id("iron_grate");
const FLAME = id("brazier_flame");
const ROOF = id("ashslate_roof");
const RIDGE = id("ashslate_ridge");
const CRIMSON = id("crimson_brick");
const NIGHTGLASS = id("nightglass");
const BRAZIER = id("brazier");
const LAMP = id("ember_lamp");
const RUNNER = id("crimson_runner");
const GILDED = id("gilded_trim");

function h3(x: number, y: number, z: number, salt: number): number {
  let h = (Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2246822519) ^ Math.imul(salt, 3266489917)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Weathered wall stone: mostly brick, with clustered cracked/crimson patches and moss near the ground. */
function wall(x: number, y: number, z: number): number {
  const r = h3(x, y, z, 1);
  const patch = h3(x >> 2, y >> 2, z >> 2, 2);
  if (patch > 0.9) return r < 0.5 ? CRIMSON : CRACKED;
  if (patch > 0.8 && r < 0.55) return CRACKED;
  if (r < 0.05) return CRACKED;
  if (y < 4 && r < 0.13) return MOSSY;
  return BRICK;
}

/** Courtyard flagstones: a checker of polished and brick slabs, with cracks and moss creeping in. */
function flagstone(x: number, _y: number, z: number): number {
  const r = h3(x, 0, z, 3);
  const patch = h3(x >> 2, 0, z >> 2, 4);
  if (patch > 0.78 && r < 0.7) return MOSS;
  if (r < 0.06) return CRACKED;
  return ((x >> 1) + (z >> 1)) & 1 ? POLISHED : BRICK;
}

/** Roof-terrace paving: dark slate with polished and cracked flags. */
function terrace(x: number, _y: number, z: number): number {
  const r = h3(x, 13, z, 9);
  return r < 0.55 ? SLATE : r < 0.85 ? POLISHED : CRACKED;
}

/** The lava river's straights: x0, x1, z0, z1 (inclusive). */
const RIVER: [number, number, number, number][] = [
  [-37, -6, 6, 9],
  [-9, -6, 6, 19],
  [-9, 17, 16, 19],
  [14, 17, 11, 19],
  [14, 38, 11, 14],
];

class Builder {
  readonly p: CastlePlan;

  constructor(plan: CastlePlan) {
    this.p = plan;
  }

  /** A crenellated parapet: a solid ring at `y` with alternating merlons one higher. */
  crenels(x0: number, z0: number, x1: number, z1: number, y: number, src: BlockSource = wall): void {
    const p = this.p;
    p.ring(x0, z0, x1, z1, y, y, src);
    const [ax, bx] = x0 <= x1 ? [x0, x1] : [x1, x0];
    const [az, bz] = z0 <= z1 ? [z0, z1] : [z1, z0];
    for (let x = ax; x <= bx; x++) {
      for (let z = az; z <= bz; z++) {
        const onRing = x === ax || x === bx || z === az || z === bz;
        if (onRing && (x + z) % 2 === 0) p.set(x, y + 1, z, typeof src === "number" ? src : src(x, y + 1, z));
      }
    }
  }

  /** A straight crenellated parapet run along one edge (inclusive ends): solid at `y`, merlons alternating one higher. */
  parapetLine(x0: number, z0: number, x1: number, z1: number, y: number): void {
    const p = this.p;
    const [ax, bx] = x0 <= x1 ? [x0, x1] : [x1, x0];
    const [az, bz] = z0 <= z1 ? [z0, z1] : [z1, z0];
    for (let x = ax; x <= bx; x++) {
      for (let z = az; z <= bz; z++) {
        p.set(x, y, z, wall(x, y, z));
        if ((x + z) % 2 === 0) p.set(x, y + 1, z, wall(x, y + 1, z));
      }
    }
  }

  /** A stepped pyramid roof over a square of half-width `half` centered on (cx, cz): one tier per level, upturned eaves, a gilded finial and a flame. Returns the flame's y. */
  pagodaRoof(cx: number, cz: number, y: number, half: number): number {
    const p = this.p;
    for (let k = 0; k <= half; k++) {
      const h = half - k;
      p.box(cx - h, y + k, cz - h, cx + h, y + k, cz + h, ROOF);
      if (h > 0) p.ring(cx - h, cz - h, cx + h, cz + h, y + k, y + k, k % 2 === 0 ? RIDGE : ROOF);
    }
    for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
      p.set(cx + sx * half, y + 1, cz + sz * half, GILDED); // upturned eave corners
    }
    const apex = y + half;
    p.set(cx, apex + 1, cz, GILDED);
    p.set(cx, apex + 2, cz, FLAME);
    return apex + 2;
  }

  /** A lantern room: hollow square walls with corner columns and lattice windows on all four sides, a lamp hanging inside. */
  lanternRoom(cx: number, cz: number, y0: number, y1: number, half: number, lit = true): void {
    const p = this.p;
    p.hollowBox(cx - half, y0, cz - half, cx + half, y1, cz + half, wall, 1, "both");
    for (const [x, z] of [[cx - half, cz - half], [cx - half, cz + half], [cx + half, cz - half], [cx + half, cz + half]] as const) {
      p.box(x, y0, z, x, y1, z, COLUMN);
    }
    const win = lit ? LATTICE : DARK_LATTICE;
    const wy0 = y0 + 1;
    const wy1 = y1 - 1;
    const span = half - 1;
    p.box(cx - span, wy0, cz - half, cx + span, wy1, cz - half, win);
    p.box(cx - span, wy0, cz + half, cx + span, wy1, cz + half, win);
    p.box(cx - half, wy0, cz - span, cx - half, wy1, cz + span, win);
    p.box(cx + half, wy0, cz - span, cx + half, wy1, cz + span, win);
    if (lit) p.set(cx, y1, cz, LAMP);
  }

  /** A pagoda pavilion: lantern room, overhanging cornice, tiered roof. Returns the top flame's y. */
  pavilion(cx: number, cz: number, floorY: number, roomHeight: number, roomHalf: number): number {
    const p = this.p;
    const y1 = floorY + roomHeight - 1;
    this.lanternRoom(cx, cz, floorY, y1, roomHalf);
    const eave = roomHalf + 1;
    p.box(cx - eave, y1 + 1, cz - eave, cx + eave, y1 + 1, cz + eave, POLISHED);
    p.ring(cx - eave, cz - eave, cx + eave, cz + eave, y1 + 1, y1 + 1, GILDED);
    return this.pagodaRoof(cx, cz, y1 + 2, eave + 1);
  }

  /** A brazier pillar: a plinth, a slim column, a capital, a brazier bowl and a flame. Returns the flame's y. */
  brazierPillar(x: number, z: number, y: number, height: number): number {
    const p = this.p;
    p.box(x - 1, y, z - 1, x + 1, y, z + 1, POLISHED);
    p.box(x, y + 1, z, x, y + height - 2, z, COLUMN);
    p.box(x - 1, y + height - 1, z - 1, x + 1, y + height - 1, z + 1, POLISHED);
    p.set(x, y + height, z, BRAZIER);
    p.set(x, y + height + 1, z, FLAME);
    return y + height + 1;
  }

  /** A lit lantern-post: column with an ember lamp on top. */
  lampPost(x: number, y: number, z: number, height: number): void {
    this.p.box(x, y, z, x, y + height - 1, z, COLUMN);
    this.p.set(x, y + height, z, LAMP);
  }

  banner(x: number, y: number, z: number, facing: Facing, width = 3, height = 9): void {
    this.p.addBanner({ x, y, z, facing, width, height });
  }

  /**
   * A straight run of one-block steps. The first step's top surface is at
   * standing cell `startY`; each next step is one higher and one block
   * further along (dx, dz). `across` is the perpendicular half-width.
   * Headroom above each step is carved out so a stair can pierce floors.
   */
  stairRun(x: number, z: number, dx: number, dz: number, across: number, startY: number, steps: number, headroom = 3): void {
    const p = this.p;
    for (let i = 0; i < steps; i++) {
      const sx = x + dx * i;
      const sz = z + dz * i;
      const top = startY + i; // standing cell for this step
      for (let a = -across; a <= across; a++) {
        const ax = sx + (dx === 0 ? a : 0);
        const az = sz + (dz === 0 ? a : 0);
        p.box(ax, top - 1, az, ax, top - 1, az, POLISHED);
        p.box(ax, top, az, ax, top + headroom - 1, az, AIR);
      }
    }
  }
}

let cachedPlan: CastlePlan | null = null;

/** The castle plan — built once per thread, identical every time. */
export function getCastlePlan(): CastlePlan {
  if (!cachedPlan) cachedPlan = buildCastle();
  return cachedPlan;
}

function buildCastle(): CastlePlan {
  const plan = new CastlePlan();
  const b = new Builder(plan);
  buildCourtyard(b);
  buildOuterWall(b);
  buildFrontBase(b);
  buildPavilions(b);
  buildKeep(b);
  buildCourtyardFeatures(b);
  buildInterior(b);
  buildLavaFalls(b);
  buildRampLamps(b);
  return plan;
}

// -- the courtyard: flagstones, and the lava river cut through them ---------
function buildCourtyard(b: Builder): void {
  const p = b.p;
  p.box(-37, 0, 2, 37, 0, 28, flagstone);

  for (const [x0, x1, z0, z1] of RIVER) {
    p.box(x0, -2, z0, x1, -2, z1, NIGHTGLASS);
    p.box(x0, -1, z0, x1, -1, z1, MAGMA);
    p.box(x0, 0, z0, x1, 0, z1, AIR);
  }
  // A polished kerb: every floor cell touching the channel.
  for (let x = -38; x <= 38; x++) {
    for (let z = 3; z <= 28; z++) {
      if (p.get(x, 0, z) === AIR) continue;
      const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => p.get(x + dx, 0, z + dz) === AIR && p.get(x + dx, -1, z + dz) === MAGMA);
      if (touches) p.set(x, 0, z, POLISHED);
    }
  }
  // The crimson carpet up the central axis, and the bridge over the river's southern reach.
  p.box(-1, 0, 3, 1, 0, 14, RUNNER);
  p.box(-1, 0, 21, 1, 0, 28, RUNNER);
  p.box(-2, 0, 15, 2, 0, 20, POLISHED);
  p.box(-1, 0, 15, 1, 0, 20, RUNNER);
  for (const x of [-3, 3]) {
    p.box(x, 0, 15, x, 1, 20, POLISHED);
    for (const z of [15, 20]) {
      p.box(x, 0, z, x, 2, z, COLUMN);
      p.set(x, 3, z, BRAZIER);
      p.set(x, 4, z, FLAME);
    }
  }
}

// -- the low outer wall, its gatehouse and towers ---------------------------
function buildOuterWall(b: Builder): void {
  const p = b.p;

  p.box(-38, 0, 26, 38, 6, 29, wall);
  p.box(-38, 0, 2, -35, 6, 29, wall);
  p.box(35, 0, 2, 38, 6, 29, wall);
  // Parapets on the three outward edges, with a few low posts along the inner edge of the walk.
  b.parapetLine(-38, 29, 38, 29, 7);
  b.parapetLine(-38, 2, -38, 29, 7);
  b.parapetLine(38, 2, 38, 29, 7);
  for (let x = -34; x <= 34; x += 4) p.set(x, 7, 26, POLISHED);
  for (let z = 6; z <= 24; z += 4) {
    p.set(-35, 7, z, POLISHED);
    p.set(35, 7, z, POLISHED);
  }

  // The gate: a 7-wide corbelled opening through the wall, a raised portcullis above it.
  p.box(-3, 1, 26, 3, 4, 29, AIR);
  p.box(-2, 5, 26, 2, 5, 29, AIR);
  p.box(-3, 0, 26, 3, 0, 29, POLISHED);
  p.box(-3, 4, 27, 3, 4, 27, GRATE);
  p.box(-2, 5, 27, 2, 5, 27, GRATE);

  // Gatehouse towers flanking the gate, taller than the wall, each topped by a brazier.
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? 5 : -9;
    const x1 = s > 0 ? 9 : -5;
    p.box(x0, 0, 25, x1, 12, 30, wall);
    b.crenels(x0, 25, x1, 30, 13);
    p.set(s * 7, 13, 28, BRAZIER);
    p.set(s * 7, 14, 28, FLAME);
    b.banner(s > 0 ? 7.5 : -6.5, 11, 31.02, "S", 3, 8);
  }
  p.box(-3, 5, 30, 3, 5, 30, POLISHED);

  // Corner towers with a brazier each.
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? 34 : -38;
    const x1 = s > 0 ? 38 : -34;
    p.box(x0, 0, 25, x1, 11, 29, wall);
    b.crenels(x0, 25, x1, 29, 12);
    p.set(s * 36, 12, 27, BRAZIER);
    p.set(s * 36, 13, 27, FLAME);
    p.box(s * 36, 6, 29, s * 36, 8, 29, LATTICE);
  }

  // Two side towers on the east/west walls: lantern rooms under small pagoda roofs.
  for (const [cx, cz] of [[-36, 15], [36, 21]] as const) {
    p.box(cx - 2, 0, cz - 2, cx + 2, 6, cz + 2, wall);
    b.pavilion(cx, cz, 7, 4, 2);
  }

  // The lava river slips through arches in the east and west walls, behind a grate.
  for (const [x0, x1, z0, z1] of [[35, 38, 11, 14], [-38, -35, 6, 9]] as const) {
    p.box(x0, 0, z0, x1, 1, z1, AIR);
    p.box(x0, -1, z0, x1, -1, z1, MAGMA);
    p.box(x0, -2, z0, x1, -2, z1, NIGHTGLASS);
    const gx = x0 > 0 ? 37 : -37;
    p.box(gx, 0, z0, gx, 1, z1, GRATE);
  }
}

// -- the long banner wall: the keep's low base, with the gate and pilasters ---
function buildFrontBase(b: Builder): void {
  const p = b.p;
  p.box(-38, 0, -34, 38, 13, 1, wall);
  p.box(-38, 13, -34, 38, 13, 3, terrace);

  // Pilasters + banners between them.
  for (const cx of [-22, -11, 11, 22]) {
    p.box(cx - 1, 0, 2, cx + 1, 11, 2, COLUMN);
    p.box(cx - 2, 12, 2, cx + 2, 12, 3, POLISHED);
  }
  p.box(-38, 12, 2, 38, 12, 2, POLISHED);
  p.box(-38, 13, 2, 38, 13, 3, POLISHED);
  for (const bx of [-29, -16, 17, 30]) b.banner(bx, 11, 2.02, "S", 3, 8);

  // The inner gate: a 7-wide corbelled arch flanked by heavy piers.
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? 4 : -7;
    const x1 = s > 0 ? 7 : -4;
    p.box(x0, 0, 2, x1, 11, 3, POLISHED);
    p.box(x0, 4, 3, x1, 4, 3, COLUMN);
    p.box(x0, 8, 3, x1, 8, 3, COLUMN);
    b.banner(s > 0 ? 6 : -5, 11, 4.02, "S", 3, 8);
    b.lampPost(s * 9, 0, 4, 4);
  }
  p.box(-3, 1, -2, 3, 6, 3, AIR);
  p.box(-2, 7, -2, 2, 7, 3, AIR);
  p.box(-1, 8, -2, 1, 8, 3, AIR);
  p.box(-3, 5, 2, 3, 5, 2, GRATE); // raised portcullis
  p.box(-2, 6, 2, 2, 6, 2, GRATE);
  p.box(-2, 7, 2, 2, 7, 2, GRATE);
  p.box(-1, 8, 2, 1, 8, 2, GRATE);
  // A glowing rose window over the gate.
  p.box(-2, 9, -2, 2, 12, 1, AIR);
  p.box(-2, 10, 2, 2, 12, 2, LATTICE);
  p.box(-2, 9, 2, 2, 9, 3, POLISHED);
  p.box(-3, 9, 2, -3, 12, 3, POLISHED);
  p.box(3, 9, 2, 3, 12, 3, POLISHED);

  // Terrace parapet all around the wall-top.
  b.crenels(-38, -34, 38, 3, 14);
}

// -- pagoda pavilions capping each end of the wall ---------------------------
function buildPavilions(b: Builder): void {
  for (const s of [-1, 1]) {
    const cx = s * 33;
    b.pavilion(cx, -3, 14, 6, 3);
    // corner piers running the full height of the wall's outer edges
    b.p.box(s * 38, 0, 1, s * 38, 13, 1, COLUMN);
    b.p.box(s * 38, 0, -7, s * 38, 13, -7, COLUMN);
  }
  // Back-corner towers of the wall block.
  for (const s of [-1, 1]) {
    const cx = s * 33;
    b.p.box(cx - 2, 14, -33, cx + 2, 20, -29, wall);
    b.pavilion(cx, -31, 21, 4, 1);
  }
}

// -- the keep: three tiers, a battlemented crown, turrets and a spire -------
function buildKeep(b: Builder): void {
  const p = b.p;

  // Tier 1: the broad lower keep, ly 14..27.
  p.box(-19, 14, -31, 19, 27, -8, wall);
  b.crenels(-19, -31, 19, -8, 28);
  // Buttresses on its front and sides, and a cornice band between its two floors.
  for (const bx of [-18, -12, 12, 18]) p.box(bx, 14, -7, bx, 26, -7, COLUMN);
  for (const bz of [-27, -19, -12]) {
    p.box(-20, 14, bz, -20, 26, bz, COLUMN);
    p.box(20, 14, bz, 20, 26, bz, COLUMN);
  }
  p.ring(-19, -31, 19, -8, 20, 20, POLISHED);
  // Front bays: a lit window pair on the right, banners in the outer bays.
  p.box(8, 16, -8, 8, 18, -8, LATTICE);
  p.box(8, 22, -8, 8, 24, -8, LATTICE);
  p.box(-8, 22, -8, -8, 24, -8, DARK_LATTICE);
  b.banner(-14.5, 26, -6.98, "S", 3, 9);
  b.banner(15.5, 26, -6.98, "S", 3, 9);
  // Side bays: banners between the buttresses.
  b.banner(-19.02, 26, -22.5, "W", 3, 9);
  b.banner(20.02, 26, -22.5, "E", 3, 9);

  // The grand stair up to the raised keep door, with balustrades and braziers.
  for (let i = 0; i < 6; i++) {
    const z = -2 - i;
    p.box(-4, 14, z, 4, 14 + i, z, POLISHED);
    p.box(-5, 14, z, -5, 15 + i, z, wall);
    p.box(5, 14, z, 5, 15 + i, z, wall);
  }
  p.box(-4, 19, -8, 4, 19, -7, POLISHED);
  b.brazierPillar(-6, -1, 14, 4);
  b.brazierPillar(6, -1, 14, 4);
  // The raised keep door (into the upper hall), framed in polished stone.
  p.box(-2, 20, -11, 2, 24, -8, AIR);
  p.box(-3, 20, -8, -3, 25, -8, POLISHED);
  p.box(3, 20, -8, 3, 25, -8, POLISHED);
  p.box(-3, 25, -8, 3, 25, -8, POLISHED);
  p.box(-1, 24, -8, 1, 24, -8, GRATE);
  // The ground-floor door, off to the left of the stair.
  p.box(-9, 14, -10, -7, 17, -8, AIR);
  p.box(-10, 14, -8, -10, 18, -8, POLISHED);
  p.box(-6, 14, -8, -6, 18, -8, POLISHED);
  p.box(-9, 18, -8, -7, 18, -8, POLISHED);
  // A breach burning in the front wall above it, its bricks smoldering.
  p.box(-9, 21, -10, -7, 23, -9, EMBER);
  for (const [fx, fy] of [[-9, 21], [-8, 21], [-7, 22], [-8, 23], [-9, 22]] as const) p.set(fx, fy, -8, FLAME);
  p.set(-8, 22, -9, FLAME);

  // Tier 2: the tall main tower, ly 28..49, with a corbelled, widened crown.
  p.box(-12, 28, -28, 12, 49, -12, wall);
  p.box(-13, 46, -29, 13, 49, -11, wall);
  p.ring(-13, -29, 13, -11, 45, 45, POLISHED);
  p.ring(-13, -29, 13, -11, 46, 46, GILDED);
  b.crenels(-13, -29, 13, -11, 50);
  for (const cx of [-12, 12]) {
    for (const cz of [-28, -12]) p.box(cx, 28, cz, cx, 44, cz, COLUMN);
  }
  // Window bays on every level of every face (a mix of lit and dark).
  const litAt = (x: number, y: number, salt: number): number => (h3(x, y, 5, salt) > 0.3 ? LATTICE : DARK_LATTICE);
  for (const level of [30, 37, 42]) {
    for (const wx of [-7, 6]) p.box(wx, level, -12, wx + 1, level + 2, -12, litAt(wx, level, 34));
    p.box(-1, level, -12, 1, level + 2, -12, litAt(0, level, 34));
    for (const wx of [-7, 6]) p.box(wx, level, -28, wx + 1, level + 2, -28, litAt(wx, level, 35));
    for (const wz of [-25, -14]) {
      p.box(-12, level, wz, -12, level + 2, wz, litAt(wz, level, 36));
      p.box(12, level, wz, 12, level + 2, wz, litAt(wz, level, 37));
    }
  }
  b.banner(-9.5, 45, -10.98, "S", 3, 10);
  b.banner(10.5, 45, -10.98, "S", 3, 10);
  b.banner(-12.02, 45, -19.5, "W", 3, 9);
  b.banner(13.02, 45, -19.5, "E", 3, 9);
  // The tower's own door, from the tier-1 roof.
  p.box(-1, 28, -14, 1, 31, -12, AIR);
  p.box(-2, 28, -12, -2, 32, -12, POLISHED);
  p.box(2, 28, -12, 2, 32, -12, POLISHED);
  p.box(-2, 32, -12, 2, 32, -12, POLISHED);

  // Pagoda turrets on tier 1's front corners, and small flame-roofed towers behind them.
  for (const s of [-1, 1]) {
    b.pavilion(s * 17, -12, 28, 5, 2);
    p.box(s * 17 - 1, 28, -30, s * 17 + 1, 33, -28, wall);
    b.pagodaRoof(s * 17, -29, 34, 2);
  }

  // The crown: four corner turrets and a tall central spire, all flame-topped.
  for (const [tx, tz] of [[-12, -28], [12, -28], [-12, -12], [12, -12]] as const) {
    p.box(tx - 1, 50, tz - 1, tx + 1, 56, tz + 1, wall);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) p.box(tx + dx, 53, tz + dz, tx + dx, 54, tz + dz, LATTICE);
    b.pagodaRoof(tx, tz, 57, 1);
  }
  p.box(-2, 50, -22, 2, 54, -18, wall);
  p.box(-1, 55, -21, 1, 66, -19, wall);
  for (const wy of [57, 62]) {
    p.set(0, wy, -21, LATTICE);
    p.set(0, wy, -19, LATTICE);
    p.set(-1, wy, -20, LATTICE);
    p.set(1, wy, -20, LATTICE);
  }
  p.box(-1, 67, -21, 1, 67, -19, POLISHED);
  p.box(-1, 68, -20, 1, 68, -20, ROOF);
  p.box(0, 68, -21, 0, 68, -19, ROOF);
  p.set(0, 69, -20, ROOF);
  p.set(0, 70, -20, GILDED);
  p.set(0, 71, -20, FLAME);
}

// -- courtyard furniture -----------------------------------------------------
function buildCourtyardFeatures(b: Builder): void {
  for (const [x, z, h] of [[-27, 13, 7], [-13, 12, 6], [-20, 22, 7], [20, 22, 7], [27, 7, 7], [8, 8, 6]] as const) {
    b.brazierPillar(x, z, 1, h);
  }
  // Rubble and low ruined walls for character.
  for (const [x, z] of [[-30, 20], [-31, 21], [31, 18], [24, 22], [-6, 24]] as const) {
    b.p.set(x, 1, z, wall(x, 1, z));
    if (h3(x, 2, z, 12) > 0.4) b.p.set(x, 2, z, CRACKED);
  }
}

// -- interiors: the great hall, stairwells and the keep's rooms ---------------
function buildInterior(b: Builder): void {
  const p = b.p;

  // The great hall behind the gate: pillars, chandeliers, a crimson runner and a dais.
  p.box(-13, 1, -26, 13, 11, -3, AIR);
  p.box(-13, 0, -26, 13, 0, -3, flagstone);
  p.box(-1, 0, -25, 1, 0, -3, RUNNER);
  for (const x of [-8, 8]) {
    for (const z of [-8, -14, -20]) {
      p.box(x, 1, z, x, 11, z, COLUMN);
      p.set(x, 5, z + 1, BRAZIER);
      p.set(x, 6, z + 1, FLAME);
    }
  }
  for (const z of [-7, -15, -23]) {
    p.set(0, 10, z, LAMP);
    p.set(0, 11, z, id("iron_grate"));
  }
  p.box(-6, 1, -26, 6, 1, -24, POLISHED);
  p.box(-3, 2, -26, 3, 2, -25, POLISHED);
  p.box(0, 3, -26, 0, 5, -26, NIGHTGLASS);
  p.set(-1, 3, -26, GILDED);
  p.set(1, 3, -26, GILDED);
  p.box(-4, 1, -26, -4, 4, -26, RUNED);
  p.box(4, 1, -26, 4, 4, -26, RUNED);

  // Stair corridors from the hall's side doors up to the terrace, one in each wing.
  for (const s of [-1, 1]) {
    p.box(s * 13, 1, -8, s * 14, 3, -6, AIR);
    for (let i = 0; i <= 12; i++) {
      const x = s * (15 + i);
      const floorY = 1 + i;
      p.box(x, floorY, -8, x, floorY, -6, POLISHED);
      p.box(x, floorY + 1, -8, x, floorY + 3, -6, AIR);
    }
  }

  // Tier 1's two floors: a ground-floor gallery and an upper hall, joined by a stair.
  p.box(-16, 14, -28, 16, 18, -11, AIR);
  p.box(-16, 19, -28, 16, 19, -11, POLISHED);
  p.box(-16, 20, -28, 16, 25, -11, AIR);
  for (const [x, z] of [[-9, -16], [9, -16], [-9, -24], [9, -24]] as const) {
    p.box(x, 14, z, x, 18, z, COLUMN);
    p.box(x, 20, z, x, 25, z, COLUMN);
  }
  for (const z of [-15, -23]) {
    p.set(0, 18, z, LAMP);
    p.set(0, 25, z, LAMP);
  }
  p.box(-15, 20, -27, 15, 20, -27, POLISHED);
  for (const [bx] of [[-14], [14]] as const) {
    p.set(bx, 15, -27, BRAZIER);
    p.set(bx, 16, -27, FLAME);
  }
  // Ground floor -> upper hall (west), upper hall -> roof terrace (east).
  b.stairRun(-15, -28, 0, 1, 1, 15, 6);
  b.stairRun(15, -28, 0, 1, 1, 21, 8);

  // Tier 2: three floors, joined by alternating stairs, with a lamp on each.
  for (const [level, ceilingY] of [[28, 34], [35, 41], [42, 48]] as const) {
    p.box(-10, level, -26, 10, ceilingY - 1, -14, AIR);
    p.set(0, ceilingY - 2, -20, LAMP);
    for (const [x, z] of [[-7, -17], [7, -17], [-7, -23], [7, -23]] as const) {
      p.box(x, level, z, x, ceilingY - 1, z, COLUMN);
    }
  }
  p.box(-10, 34, -26, 10, 34, -14, POLISHED);
  p.box(-10, 41, -26, 10, 41, -14, POLISHED);
  b.stairRun(-9, -26, 0, 1, 1, 29, 7);
  b.stairRun(9, -26, 0, 1, 1, 36, 7);
  b.stairRun(-9, -26, 0, 1, 1, 43, 8);
}

// -- lava cascading down the cliff, following the crag's own terraces --------
function buildLavaFalls(b: Builder): void {
  const p = b.p;
  const wx0 = CASTLE_CENTER.x;
  const wz0 = CASTLE_CENTER.z;
  // Lava laid over the crag's surface from the plateau edge outward, each
  // column filled down to the next ledge so the flow reads as one sheet.
  const carpet = (startLx: number, dir: 1 | -1, rows: number[]): void => {
    for (const lz of rows) {
      const z = wz0 + lz;
      let x = wx0 + startLx;
      for (let n = 0; n < 70; n++, x += dir) {
        const top = cragHeight(x, z);
        if (top < 66) break;
        if (top === CASTLE_FLOOR_Y) {
          p.addExtra({ x, y: top, z, id: AIR });
          p.addExtra({ x, y: top - 1, z, id: MAGMA });
          continue;
        }
        const next = cragHeight(x + dir, z);
        for (let y = Math.max(next + 1, 66); y <= top; y++) p.addExtra({ x, y, z, id: MAGMA });
        if (next < 66) break;
      }
    }
  };
  carpet(39, 1, [11, 12, 13, 14]);
  // A smaller spill from a drain in the west wall.
  for (const lz of [21, 22]) {
    p.box(-38, 3, lz, -38, 4, lz, MAGMA);
    p.box(-39, -1, lz, -39, 4, lz, MAGMA);
  }
  carpet(-40, -1, [21, 22]);
  void b;
}

// -- lamp posts along the approach ramp --------------------------------------
function buildRampLamps(b: Builder): void {
  for (let lz = RAMP_START_Z + 4; lz <= RAMP_START_Z + 28; lz += 8) {
    const y = rampHeight(CASTLE_CENTER.x, CASTLE_CENTER.z + lz);
    if (y === null) continue;
    for (const s of [-1, 1]) b.lampPost(s * 3, y + 1 - CASTLE_FLOOR_Y, lz, 2);
  }
}
