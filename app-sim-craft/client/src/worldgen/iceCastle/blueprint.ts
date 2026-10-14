// The ice castle, drawn block by block into a CastlePlan (castle/plan.ts) in
// its own local frame (iceCastle/layout.ts: +x east, +z south = the front, y = 0
// is the courtyard floor). It follows the reference art: a long, snow-capped
// royal-blue curtain wall with a spired tower at each end, behind it a stepped
// three-tier keep rising to a crown of conical-roofed turrets and one tall blue
// needle spire, a gabled timber-framed hall on one flank and a four-storey
// library on the other, amber stained-glass lancets and rose windows glowing
// in the blue brick, torch-lit stairs climbing the glacier to the gate — all on
// a footprint the same size as the dark castle's.
//
// Drawing order matters: later calls overwrite earlier ones, so each section
// carves its openings after its walls exist. Sections that need more room live
// in their own files (library.ts: the library and the feast hall; secrets.ts:
// the hidden passages, vault and grotto; lights.ts: baked lamps and icicles).
import { CastlePlan } from "../castle/plan";
import { iceCragHeight, iceRampHeight } from "./crag";
import { IceBuilder, flagstone, h3, wall } from "./builder";
import { AIR, B } from "./ids";
import { ICE_CASTLE_CENTER, ICE_BOUNDS, ICE_FLOOR_Y, ICE_RAMP_START_Z } from "./layout";
import { buildAnnexes } from "./library";
import { buildInteriorLights, hangIcicles } from "./lights";
import { buildSecrets } from "./secrets";

/** The frozen stream's straights: x0, x1, z0, z1 (inclusive) — the dark castle's lava river course, so every bridge and wall arch lines up. */
export const STREAM: [number, number, number, number][] = [
  [-37, -6, 6, 9],
  [-9, -6, 6, 19],
  [-9, 17, 16, 19],
  [14, 17, 11, 19],
  [14, 38, 11, 14],
];

let cachedPlan: CastlePlan | null = null;

/** The ice castle plan — built once per thread, identical every time. */
export function getIcePlan(): CastlePlan {
  if (!cachedPlan) cachedPlan = buildIceCastle();
  return cachedPlan;
}

function buildIceCastle(): CastlePlan {
  const plan = new CastlePlan(ICE_BOUNDS);
  const b = new IceBuilder(plan);
  buildCourtyard(b);
  buildOuterWall(b);
  buildFrontBase(b);
  buildPavilions(b);
  buildKeep(b);
  buildAnnexes(b);
  buildCourtyardFeatures(b);
  buildInterior(b);
  buildSecrets(b);
  buildInteriorLights(b);
  buildIceFalls(b);
  buildRampLights(b);
  hangIcicles(plan);
  return plan;
}

/** Roof-terrace paving under snow: mostly snow-capped brick, with bare flagstone and drifts. */
export function terrace(x: number, _y: number, z: number): number {
  const r = h3(x, 13, z, 9);
  return r < 0.55 ? B.SNOWY : r < 0.82 ? B.POLISHED : B.SNOW;
}

// -- the courtyard: marble flags, and the frozen stream cut through them -------
function buildCourtyard(b: IceBuilder): void {
  const p = b.p;
  p.box(-37, 0, 2, 37, 0, 28, flagstone);

  const streamBed = (x: number, y: number, z: number): number => (y === -2 ? B.BLUE_ICE : (x + z * 3) % 5 === 0 ? B.CRYSTAL : B.PACKED_ICE);
  for (const [x0, x1, z0, z1] of STREAM) {
    p.box(x0, -2, z0, x1, -1, z1, streamBed);
    p.box(x0, 0, z0, x1, 0, z1, AIR);
  }
  // A polished kerb: every floor cell touching the channel.
  for (let x = -38; x <= 38; x++) {
    for (let z = 3; z <= 28; z++) {
      if (p.get(x, 0, z) === AIR) continue;
      const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => p.get(x + dx, 0, z + dz) === AIR && p.get(x + dx, -2, z + dz) === B.BLUE_ICE);
      if (touches) p.set(x, 0, z, B.POLISHED);
    }
  }
  // The silver-and-blue carpet up the central axis, and the bridge over the stream's southern reach.
  p.box(-1, 0, 3, 1, 0, 14, B.CARPET);
  p.box(-1, 0, 21, 1, 0, 28, B.CARPET);
  p.box(-2, 0, 15, 2, 0, 20, B.POLISHED);
  p.box(-1, 0, 15, 1, 0, 20, B.CARPET);
  for (const x of [-3, 3]) {
    p.box(x, 0, 15, x, 1, 20, B.POLISHED);
    for (const z of [15, 20]) {
      p.box(x, 0, z, x, 2, z, B.COLUMN);
      p.set(x, 3, z, B.LANTERN);
    }
  }
}

// -- the outer wall, its gatehouse and towers --------------------------------
function buildOuterWall(b: IceBuilder): void {
  const p = b.p;

  p.box(-38, 0, 26, 38, 8, 29, wall);
  p.box(-38, 0, 2, -35, 8, 29, wall);
  p.box(35, 0, 2, 38, 8, 29, wall);
  // Rampart walks under snow, parapets on the three outward edges, lantern posts along the inner edge of the walk.
  b.snowWalk(-38, 26, 38, 29, 8);
  b.snowWalk(-38, 2, -35, 25, 8);
  b.snowWalk(35, 2, 38, 25, 8);
  b.parapetLine(-38, 29, 38, 29, 9);
  b.parapetLine(-38, 2, -38, 29, 9);
  b.parapetLine(38, 2, 38, 29, 9);
  for (let x = -34; x <= 34; x += 4) {
    if (Math.abs(x) < 10) continue;
    p.box(x, 9, 26, x, 9, 26, B.COLUMN);
    p.set(x, 10, 26, B.LANTERN);
  }
  for (let z = 6; z <= 24; z += 4) {
    for (const x of [-35, 35]) {
      p.set(x, 9, z, B.COLUMN);
      p.set(x, 10, z, B.LANTERN);
    }
  }
  // Slit windows along the outer face of the wall, glowing between the merlons' shadow.
  for (let x = -30; x <= 30; x += 6) if (Math.abs(x) > 12) p.box(x, 4, 29, x, 5, 29, B.SLIT);

  // The gate: a 7-wide pointed arch through the wall, a raised portcullis in its head, a moulded surround.
  b.archZ(0, 1, 26, 29, 3, 7);
  p.box(-3, 0, 26, 3, 0, 29, B.POLISHED);
  for (const [hw, y] of [[3, 4], [2, 5], [1, 6], [0, 7]] as const) p.box(-hw, y, 27, hw, y, 27, B.GRATE);
  b.archSurroundZ(0, 1, 29, 3, 7);

  // Gatehouse towers flanking the gate: tall, snow-roofed under steep spires, lit slits, a banner each.
  for (const s of [-1, 1]) {
    const cx = s * 7;
    p.box(cx - 3, 0, 25, cx + 3, 13, 31, wall);
    p.box(cx - 4, 14, 24, cx + 4, 14, 32, B.POLISHED);
    p.ring(cx - 4, 24, cx + 4, 32, 14, 14, B.TRIM);
    for (const sy of [5, 9]) {
      p.box(cx - 1, sy, 31, cx - 1, sy + 1, 31, B.SLIT);
      p.box(cx + 1, sy, 31, cx + 1, sy + 1, 31, B.SLIT);
    }
    p.box(cx, 10, 31, cx, 12, 31, B.WINDOW);
    p.set(cx, 12, 31, B.WINDOW_TOP);
    b.spire(cx, 28, 15, 4, 2);
    b.banner(s > 0 ? 9.5 : -9.5, 8, 31.02, "S", 2, 7);
  }
  // Corner towers with a torch each, pinnacles on every corner.
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? 34 : -38;
    const x1 = s > 0 ? 38 : -34;
    p.box(x0, 0, 25, x1, 11, 29, wall);
    b.crenels(x0, 25, x1, 29, 12);
    b.snowWalk(x0 + 1, 26, x1 - 1, 28, 11);
    b.torch(s * 36, 12, 27, 1);
    p.box(s * 36, 5, 29, s * 36, 7, 29, B.WINDOW);
    p.set(s * 36, 7, 29, B.WINDOW_TOP);
    for (const x of [x0, x1]) for (const z of [25, 29]) b.pinnacle(x, 13, z);
  }

  // Two side towers on the east/west walls: round lantern turrets under conical roofs.
  for (const [cx, cz] of [[-36, 15], [36, 21]] as const) {
    p.box(cx - 2, 0, cz - 2, cx + 2, 8, cz + 2, wall);
    b.roundTower(cx, cz, 2, 9, 14, [11]);
    p.box(cx - 1, 9, cz - 1, cx + 1, 9, cz + 1, B.POLISHED);
    b.lancet(cx, 11, cz + 2, 2);
    b.lancet(cx, 11, cz - 2, 2);
    b.cone(cx, cz, 15, 2);
  }

  // The frozen stream slips through arches in the east and west walls, behind a grate.
  for (const [x0, x1, z0, z1] of [[35, 38, 11, 14], [-38, -35, 6, 9]] as const) {
    p.box(x0, 0, z0, x1, 1, z1, AIR);
    p.box(x0, -1, z0, x1, -1, z1, B.PACKED_ICE);
    p.box(x0, -2, z0, x1, -2, z1, B.BLUE_ICE);
    const gx = x0 > 0 ? 37 : -37;
    p.box(gx, 0, z0, gx, 1, z1, B.GRATE);
  }
}

// -- the long banner wall: the keep's low base, with the gate and pilasters ----
function buildFrontBase(b: IceBuilder): void {
  const p = b.p;
  p.box(-38, 0, -34, 38, 12, 1, wall);
  p.box(-38, 13, -34, 38, 13, 3, terrace);

  // Pilasters, banners between them, and a moulded cornice.
  for (const cx of [-22, -11, 11, 22]) {
    p.box(cx - 1, 0, 2, cx + 1, 11, 2, B.COLUMN);
    p.box(cx - 2, 12, 2, cx + 2, 12, 3, B.POLISHED);
  }
  p.box(-38, 12, 2, 38, 12, 2, B.POLISHED);
  p.box(-38, 13, 2, 38, 13, 3, B.TRIM);
  for (const bx of [-29, -16, 17, 30]) b.banner(bx, 11, 2.02, "S", 3, 8);
  // Glowing arrow slits between the pilasters, high on the wall.
  for (const x of [-34, -27, -19, -15, -7, 7, 15, 19, 27, 34]) p.box(x, 7, 2, x, 8, 2, B.SLIT);

  // The inner gate: a 7-wide pointed arch flanked by heavy piers, a torch on each side.
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? 4 : -7;
    const x1 = s > 0 ? 7 : -4;
    p.box(x0, 0, 2, x1, 11, 3, B.POLISHED);
    p.box(x0, 4, 3, x1, 4, 3, B.COLUMN);
    p.box(x0, 8, 3, x1, 8, 3, B.COLUMN);
    b.banner(s > 0 ? 6 : -5, 11, 4.02, "S", 3, 8);
    b.torch(s * 9, 0, 4, 3);
  }
  b.archZ(0, 1, -2, 3, 3, 8);
  for (const [hw, y] of [[3, 5], [2, 6], [1, 7], [0, 8]] as const) p.box(-hw, y, 2, hw, y, 2, B.GRATE);
  b.archSurroundZ(0, 1, 3, 3, 8);
  // A heraldic crest above the arch: a frost crystal between two lit lancets.
  p.box(-1, 11, 3, 1, 11, 3, B.POLISHED);
  p.set(0, 11, 4, B.CRYSTAL);

  // Terrace parapet all around the wall-top.
  b.crenels(-38, -34, 38, 3, 14);
}

// -- spired towers capping each end of the wall --------------------------------
function buildPavilions(b: IceBuilder): void {
  const p = b.p;
  for (const s of [-1, 1]) {
    const cx = s * 33;
    // Front pavilion: a lantern room under a moulded cornice and a steep spire.
    p.hollowBox(cx - 3, 14, -6, cx + 3, 19, 0, wall, 1, "both");
    for (const [x, z] of [[cx - 3, -6], [cx - 3, 0], [cx + 3, -6], [cx + 3, 0]] as const) p.box(x, 14, z, x, 19, z, B.COLUMN);
    for (const x of [cx - 1, cx + 1]) {
      b.lancet(x, 15, -6, 4);
      b.lancet(x, 15, 0, 4);
    }
    for (const z of [-4, -2]) {
      b.lancet(cx - 3, 15, z, 4);
      b.lancet(cx + 3, 15, z, 4);
    }
    p.set(cx, 19, -3, B.LANTERN);
    p.box(cx - 4, 20, -7, cx + 4, 20, 1, B.POLISHED);
    p.ring(cx - 4, -7, cx + 4, 1, 20, 20, B.TRIM);
    b.spire(cx, -3, 21, 4, 2);
    // Corner piers running the full height of the wall's outer edges.
    p.box(s * 38, 0, 1, s * 38, 13, 1, B.COLUMN);
    p.box(s * 38, 0, -7, s * 38, 13, -7, B.COLUMN);
  }
  // Back-corner towers of the wall block: a box with a secret chamber (secrets.ts), a round turret above.
  for (const s of [-1, 1]) {
    const cx = s * 33;
    p.box(cx - 2, 14, -33, cx + 2, 20, -28, wall);
    b.snowWalk(cx - 2, -33, cx + 2, -28, 20);
    b.roundTower(cx, -31, 2, 21, 27, [24]);
    b.lancet(cx, 23, -29, 2);
    b.lancet(cx, 23, -33, 2);
    p.set(cx, 21, -31, B.LANTERN);
    b.cone(cx, -31, 28, 2);
  }
}

// -- the keep: three tiers, a crown of conical turrets and one tall needle -------
function buildKeep(b: IceBuilder): void {
  const p = b.p;

  // Tier 1: the broad lower keep, ly 14..27, its roof under snow.
  p.box(-19, 14, -31, 19, 27, -8, wall);
  b.snowWalk(-18, -30, 18, -9, 27);
  b.crenels(-19, -31, 19, -8, 28);
  // Buttresses on its front, and a cornice band between its two floors.
  for (const bx of [-18, -12, 12, 18]) p.box(bx, 14, -7, bx, 26, -7, B.COLUMN);
  p.ring(-19, -31, 19, -8, 20, 20, B.POLISHED);
  // Front bays: lit lancets between the buttresses, banners in the outer bays.
  for (const x of [-15, 10, 15]) b.lancet(x, 16, -8, 3);
  for (const x of [-15, -10, 10, 15]) b.lancet(x, 22, -8, 3);
  b.banner(-14.5, 26, -6.98, "S", 3, 8);
  b.banner(15.5, 26, -6.98, "S", 3, 8);
  // The north face: a row of lancets on both floors, an arrow slit between each.
  for (const x of [-12, -6, 6, 12]) {
    b.lancet(x, 16, -31, 3);
    b.lancet(x, 22, -31, 3);
  }
  for (const x of [-9, -3, 3, 9]) p.box(x, 18, -31, x, 19, -31, B.SLIT);

  // The grand stair up to the raised keep door, with balustrades and torches.
  for (let i = 0; i < 6; i++) {
    const z = -2 - i;
    p.box(-4, 14, z, 4, 14 + i, z, B.POLISHED);
    p.box(-5, 14, z, -5, 15 + i, z, wall);
    p.box(5, 14, z, 5, 15 + i, z, wall);
    p.set(-5, 16 + i, z, B.SNOWY);
    p.set(5, 16 + i, z, B.SNOWY);
  }
  p.box(-4, 19, -8, 4, 19, -7, B.POLISHED);
  b.brazierPillar(-6, -1, 14, 4);
  b.brazierPillar(6, -1, 14, 4);
  // The raised keep door (into the upper hall), a pointed arch framed in polished stone.
  b.archZ(0, 20, -11, -8, 2, 6);
  b.archSurroundZ(0, 20, -8, 2, 6);
  p.box(-1, 24, -8, 1, 24, -8, B.GRATE);
  // The ground-floor door, off to the left of the stair.
  p.box(-9, 14, -10, -7, 17, -8, AIR);
  p.box(-10, 14, -8, -10, 18, -8, B.POLISHED);
  p.box(-6, 14, -8, -6, 18, -8, B.POLISHED);
  p.box(-9, 18, -8, -7, 18, -8, B.POLISHED);
  p.set(-8, 19, -8, B.TRIM);

  // Tier 2: the tall main tower, ly 28..49, with a corbelled, widened crown.
  p.box(-12, 28, -28, 12, 49, -12, wall);
  p.box(-13, 46, -29, 13, 49, -11, wall);
  p.ring(-13, -29, 13, -11, 45, 45, B.POLISHED);
  p.ring(-13, -29, 13, -11, 46, 46, B.TRIM);
  b.snowWalk(-12, -28, 12, -12, 49);
  b.crenels(-13, -29, 13, -11, 50);
  for (const cx of [-12, 12]) {
    for (const cz of [-28, -12]) p.box(cx, 28, cz, cx, 44, cz, B.COLUMN);
  }
  // Window bays on every level of every face: pointed lancets, with the great rose window over the front.
  for (const level of [29, 36, 43]) {
    const lancets = level === 36 ? [-9, -5, 5, 9] : [-9, -5, 0, 5, 9];
    for (const wx of lancets) b.lancet(wx, level, -12, 3);
    for (const wx of level === 36 ? [-9, -5, 5, 9] : [-9, -5, 0, 5, 9]) b.lancet(wx, level, -28, 3);
    for (const wz of [-25, -21, -17, -14]) {
      b.lancet(-12, level, wz, 3);
      b.lancet(12, level, wz, 3);
    }
  }
  p.box(-1, 36, -12, 1, 38, -12, AIR);
  b.roseZ(0, 37, -12);
  b.banner(-7, 45, -10.98, "S", 3, 8);
  b.banner(7, 45, -10.98, "S", 3, 8);
  b.banner(-12.02, 45, -19.5, "W", 3, 8);
  b.banner(13.02, 45, -19.5, "E", 3, 8);
  // The tower's own door, from the tier-1 roof.
  b.archZ(0, 28, -14, -12, 1, 5);
  p.box(-2, 28, -12, -2, 32, -12, B.POLISHED);
  p.box(2, 28, -12, 2, 32, -12, B.POLISHED);
  p.box(-2, 33, -12, 2, 33, -12, B.POLISHED);

  // Round turrets on tier 1's front corners with lit lancets, and snow-roofed towers behind them.
  for (const s of [-1, 1]) {
    b.roundTower(s * 17, -12, 2, 28, 34, [31]);
    p.box(s * 17 - 1, 28, -13, s * 17 + 1, 28, -11, B.POLISHED);
    b.lancet(s * 17, 30, -10, 3);
    b.cone(s * 17, -12, 35, 2);
    p.box(s * 17 - 1, 28, -30, s * 17 + 1, 33, -28, wall);
    b.cone(s * 17, -29, 34, 1);
  }

  // The crown: four conical-roofed turrets at the corners and a tall central needle, pinnacles on every merlon corner.
  for (const [tx, tz] of [[-12, -28], [12, -28], [-12, -12], [12, -12]] as const) {
    b.roundTower(tx, tz, 2, 50, 57, [53]);
    p.box(tx - 1, 50, tz - 1, tx + 1, 50, tz + 1, B.POLISHED);
    b.cone(tx, tz, 58, 2);
  }
  for (const [px, pz] of [[-13, -29], [13, -29], [-13, -11], [13, -11], [0, -29], [0, -11], [-13, -20], [13, -20]] as const) b.pinnacle(px, 51, pz);
  p.box(-2, 50, -22, 2, 54, -18, wall);
  p.box(-1, 55, -21, 1, 66, -19, wall);
  for (const wy of [57, 62]) {
    p.set(0, wy, -21, B.WINDOW);
    p.set(0, wy, -19, B.WINDOW);
    p.set(-1, wy, -20, B.WINDOW);
    p.set(1, wy, -20, B.WINDOW);
  }
  p.box(-2, 67, -22, 2, 67, -18, B.POLISHED);
  b.spire(0, -20, 68, 2, 3, 0.2);
  buildCrownLights(b);
}

// -- the glow at the top: the crown, the turrets and the needle burn brighter than anywhere else --------
function buildCrownLights(b: IceBuilder): void {
  const p = b.p;
  // A lantern in place of every fourth merlon round the crown, so the whole rim glows.
  for (let x = -12; x <= 12; x += 4) for (const z of [-29, -11]) if ((x + z) % 2 === 0) p.set(x, 51, z, B.LANTERN);
  for (const z of [-24, -16]) for (const x of [-13, 13]) if ((x + z) % 2 === 0) p.set(x, 51, z, B.LANTERN);
  // Frostfire torches on the crown walk, flanking the needle.
  for (const [x, z] of [[-7, -26], [7, -26], [-7, -14], [7, -14], [-6, -20], [6, -20]] as const) b.torch(x, 50, z, 1);
  // Lanterns ringing the needle's shaft, and a halo of crystals round its base.
  for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]] as const) p.set(dx, 56, -20 + dz, B.LANTERN);
  for (const [dx, dz] of [[2, 2], [-2, 2], [2, -2], [-2, -2]] as const) p.set(dx, 55, -20 + dz, B.CRYSTAL);
  // The tier-1 roof: lanterns along its parapet and torches at the stair head.
  for (let x = -16; x <= 16; x += 8) for (const z of [-30, -9]) p.set(x, 29, z, B.LANTERN);
  for (const x of [-18, 18]) for (const z of [-30, -22, -15, -9]) if ((x + z) % 2 === 0) p.set(x, 29, z, B.LANTERN);
}

// -- courtyard furniture -------------------------------------------------------
function buildCourtyardFeatures(b: IceBuilder): void {
  const p = b.p;
  for (const [x, z, h] of [[-27, 13, 7], [-13, 12, 6], [-20, 22, 7], [20, 22, 7], [27, 7, 7], [8, 8, 6]] as const) b.brazierPillar(x, z, 1, h);
  // Snowdrifts and a frozen fountain: a stepped ice basin with a blue-ice spire, left of the carpet.
  p.box(-8, 1, 22, -4, 1, 26, B.BLUE_ICE);
  p.box(-7, 2, 23, -5, 2, 25, B.PACKED_ICE);
  p.box(-6, 3, 24, -6, 7, 24, B.BLUE_ICE);
  p.set(-6, 8, 24, B.CRYSTAL);
  for (const [x, z] of [[-30, 20], [-31, 21], [31, 18], [24, 22], [-6, 2], [34, 5], [-34, 5], [30, 24]] as const) {
    p.set(x, 1, z, B.SNOW);
    if (h3(x, 2, z, 12) > 0.4) p.set(x, 2, z, B.SNOW);
  }
}

// -- interiors: the great hall, stairwells and the keep's rooms -----------------
function buildInterior(b: IceBuilder): void {
  const p = b.p;

  // The great hall behind the gate: pillars, chandeliers, a silver runner, stained glass and a dais with a blue-ice throne.
  p.box(-13, 1, -26, 13, 11, -3, AIR);
  p.box(-13, 0, -26, 13, 0, -3, flagstone);
  p.box(-1, 0, -25, 1, 0, -3, B.CARPET);
  for (const x of [-8, 8]) {
    for (const z of [-8, -14, -20]) {
      p.box(x, 1, z, x, 11, z, B.COLUMN);
      p.set(x, 5, z + 1, B.BRAZIER);
      p.set(x, 6, z + 1, B.FLAME);
    }
  }
  for (const z of [-7, -15, -23]) {
    p.set(0, 10, z, B.LANTERN);
    p.set(0, 11, z, B.GRATE);
  }
  // Stained-glass lancets set in the side walls, and a rose window over the throne.
  for (const z of [-5, -11, -17, -23]) {
    b.lancet(-14, 4, z, 4);
    b.lancet(14, 4, z, 4);
  }
  b.roseZ(0, 9, -27);
  p.box(-6, 1, -26, 6, 1, -24, B.POLISHED);
  p.box(-3, 2, -26, 3, 2, -25, B.POLISHED);
  p.box(-1, 3, -26, 1, 3, -25, B.BLUE_ICE);
  p.box(0, 4, -26, 0, 6, -26, B.BLUE_ICE);
  p.box(-1, 4, -26, -1, 5, -26, B.BLUE_ICE);
  p.box(1, 4, -26, 1, 5, -26, B.BLUE_ICE);
  p.set(0, 7, -26, B.CRYSTAL);
  p.set(-1, 4, -25, B.PACKED_ICE);
  p.set(1, 4, -25, B.PACKED_ICE);

  // Stair corridors from the hall's side doors up to the terrace, one in each wing.
  for (const s of [-1, 1]) {
    p.box(s * 13, 1, -8, s * 14, 3, -6, AIR);
    for (let i = 0; i <= 12; i++) {
      const x = s * (15 + i);
      const floorY = 1 + i;
      p.box(x, floorY, -8, x, floorY, -6, B.POLISHED);
      p.box(x, floorY + 1, -8, x, floorY + 3, -6, AIR);
    }
  }

  // Tier 1's two floors: a ground-floor gallery and an upper hall, joined by a stair.
  p.box(-16, 14, -28, 16, 18, -11, AIR);
  p.box(-16, 19, -28, 16, 19, -11, flagstone);
  p.box(-16, 20, -28, 16, 25, -11, AIR);
  p.box(-16, 13, -28, 16, 13, -11, flagstone);
  for (const [x, z] of [[-9, -16], [9, -16], [-9, -24], [9, -24]] as const) {
    p.box(x, 14, z, x, 18, z, B.COLUMN);
    p.box(x, 20, z, x, 25, z, B.COLUMN);
  }
  for (const z of [-15, -23]) {
    p.set(0, 18, z, B.LANTERN);
    p.set(0, 25, z, B.LANTERN);
  }
  p.box(-1, 13, -27, 1, 13, -12, B.CARPET);
  p.box(-1, 19, -27, 1, 19, -12, B.CARPET);
  for (const [bx] of [[-14], [14]] as const) {
    p.set(bx, 15, -27, B.BRAZIER);
    p.set(bx, 16, -27, B.FLAME);
  }
  // Ground floor -> upper hall (west), upper hall -> roof terrace (east).
  b.stairRun(-15, -28, 0, 1, 1, 15, 6);
  b.stairRun(15, -28, 0, 1, 1, 21, 8);

  // Tier 2: three floors, joined by alternating stairs, with a lantern in each.
  for (const [level, ceilingY] of [[28, 34], [35, 41], [42, 48]] as const) {
    p.box(-10, level, -26, 10, ceilingY - 1, -14, AIR);
    p.set(0, ceilingY - 2, -20, B.LANTERN);
    for (const [x, z] of [[-7, -17], [7, -17], [-7, -23], [7, -23]] as const) p.box(x, level, z, x, ceilingY - 1, z, B.COLUMN);
    p.box(-1, level - 1, -26, 1, level - 1, -14, B.CARPET);
  }
  p.box(-10, 34, -26, 10, 34, -14, flagstone);
  p.box(-10, 41, -26, 10, 41, -14, flagstone);
  b.stairRun(-9, -26, 0, 1, 1, 29, 7);
  b.stairRun(9, -26, 0, 1, 1, 36, 7);
  b.stairRun(-9, -26, 0, 1, 1, 43, 8);
}

// -- ice cascading down the glacier, following the crag's own terraces ----------
function buildIceFalls(b: IceBuilder): void {
  const p = b.p;
  const wx0 = ICE_CASTLE_CENTER.x;
  const wz0 = ICE_CASTLE_CENTER.z;
  // Blue ice laid over the crag's surface from the plateau edge outward, each
  // column filled down to the next ledge so the frozen fall reads as one sheet.
  const cascade = (startLx: number, dir: 1 | -1, rows: number[]): void => {
    for (const lz of rows) {
      const z = wz0 + lz;
      let x = wx0 + startLx;
      for (let n = 0; n < 70; n++, x += dir) {
        const top = iceCragHeight(x, z);
        if (top < 66) break;
        if (top === ICE_FLOOR_Y) {
          p.addExtra({ x, y: top, z, id: B.PACKED_ICE });
          continue;
        }
        const next = iceCragHeight(x + dir, z);
        for (let y = Math.max(next + 1, 66); y <= top; y++) p.addExtra({ x, y, z, id: y === top ? B.PACKED_ICE : B.BLUE_ICE });
        if (next < 66) break;
      }
    }
  };
  cascade(39, 1, [11, 12, 13, 14]);
  cascade(-40, -1, [6, 7, 8, 9]);
  void b;
}

// -- lamp posts and torches along the approach stair --------------------------------
// A pair every sixth block, from the gate down to the snowfield at the ramp's
// foot, so no stretch of the long stair is dark — the lamps' baked light falls
// on the steps between. Torches (a flame on a column) stand at the very top.
const RAMP_LAMP_SPACING = 6;
const RAMP_LAMP_MIN_Y = 66;

function buildRampLights(b: IceBuilder): void {
  for (let lz = ICE_RAMP_START_Z + 4; ; lz += RAMP_LAMP_SPACING) {
    const y = iceRampHeight(ICE_CASTLE_CENTER.x, ICE_CASTLE_CENTER.z + lz);
    if (y === null || y < RAMP_LAMP_MIN_Y) break;
    for (const s of [-1, 1]) {
      if (lz < ICE_RAMP_START_Z + 12) b.torch(s * 3, y + 1 - ICE_FLOOR_Y, lz, 2);
      else b.lampPost(s * 3, y + 1 - ICE_FLOOR_Y, lz, 2);
    }
  }
}
