/**
 * M14c: pure helper computing the cyan trim-line mask for the Tron suit
 * shader. The exact same formula is inlined into the GLSL string in
 * RealisticRunner.ts, so this file is the testable source of truth.
 *
 * Coordinates are the REST-POSE object-space position (before skinning),
 * metres, feet at y = 0, character ~1.81 m tall, facing +Z in rest pose.
 *
 * Lines (value 0..1, 1 = full emissive, 0 everywhere else):
 *  - leg outer lines: |x| in [0.17, 0.20], |z+0.04| < 0.03, y in [0.12, 0.95]
 *  - arm top lines:   y in [1.49, 1.52], |z+0.065| < 0.03, |x| in [0.28, 0.69]
 *  - chest ring:      y in [1.29, 1.31], |x| < 0.20 (torso only), all z
 *  - belt:            y in [0.96, 0.98], |x| < 0.20
 *  - spine line:      |x| < 0.010, z < -0.08, y in [1.0, 1.45]
 *
 * Line half-width 0.010 m with 0.006 m soft edge.
 */

export const TRIM_HALF_WIDTH = 0.010;
export const TRIM_SOFT = 0.006;

export interface TrimBands {
  /** leg outer line |x| centre */
  legX: number;
  /** leg line y range */
  legY0: number;
  legY1: number;
  /** leg line z centre (|z - zC| < 0.03) */
  legZC: number;
  /** leg line z half-range */
  legZH: number;
  /** arm top line y range */
  armY0: number;
  armY1: number;
  /** arm top line |x| range */
  armX0: number;
  armX1: number;
  /** arm top line z centre */
  armZC: number;
  /** arm top line z half-range */
  armZH: number;
  /** chest ring y range */
  chestY0: number;
  chestY1: number;
  /** chest ring |x| limit (torso only) */
  chestX: number;
  /** belt y range */
  beltY0: number;
  beltY1: number;
  /** belt |x| limit */
  beltX: number;
  /** spine line |x| limit */
  spineX: number;
  /** spine line z limit (z < -spineZ) */
  spineZ: number;
  /** spine line y range */
  spineY0: number;
  spineY1: number;
  /** line half-width (m) */
  halfWidth: number;
  /** soft edge (m) */
  soft: number;
}

export const TRIM_BANDS: TrimBands = {
  legX: 0.185,
  legY0: 0.12,
  legY1: 0.95,
  legZC: -0.04,
  legZH: 0.03,
  armY0: 1.49,
  armY1: 1.52,
  armX0: 0.28,
  armX1: 0.69,
  armZC: -0.065,
  armZH: 0.03,
  chestY0: 1.29,
  chestY1: 1.31,
  chestX: 0.20,
  beltY0: 0.96,
  beltY1: 0.98,
  beltX: 0.20,
  spineX: 0.010,
  spineZ: 0.08,
  spineY0: 1.0,
  spineY1: 1.45,
  halfWidth: TRIM_HALF_WIDTH,
  soft: TRIM_SOFT
};

/** Smooth band: 1 inside half-width, linear fade over soft edge, 0 outside. */
function band(value: number, center: number, half: number, soft: number): number {
  const d = Math.abs(value - center);
  if (d >= half + soft) return 0;
  if (d <= half) return 1;
  return (half + soft - d) / soft;
}

/** Smooth range: 1 inside [y0, y1], linear fade over soft edge, 0 outside. */
function range(value: number, y0: number, y1: number, soft: number): number {
  if (value < y0 - soft || value > y1 + soft) return 0;
  if (value >= y0 && value <= y1) return 1;
  if (value < y0) return (value - (y0 - soft)) / soft;
  return ((y1 + soft) - value) / soft;
}

/**
 * Compute the trim mask value in [0, 1] for a rest-pose position.
 * `bands` defaults to TRIM_BANDS.
 */
export function trimMask(x: number, y: number, z: number, bands: TrimBands = TRIM_BANDS): number {
  const ax = Math.abs(x);
  const hw = bands.halfWidth;
  const sf = bands.soft;
  let m = 0;

  // Leg outer lines: thin vertical line on the outer face of each leg.
  const leg =
    band(ax, bands.legX, hw, sf) *
    band(z, bands.legZC, bands.legZH, sf) *
    range(y, bands.legY0, bands.legY1, sf);
  m = Math.max(m, leg);

  // Arm top lines: thin line along the top of each arm.
  const arm =
    band(y, (bands.armY0 + bands.armY1) / 2, (bands.armY1 - bands.armY0) / 2, sf) *
    band(z, bands.armZC, bands.armZH, sf) *
    range(ax, bands.armX0, bands.armX1, sf);
  m = Math.max(m, arm);

  // Chest ring: thin horizontal band around the torso (NOT the arms).
  const chest = band(y, (bands.chestY0 + bands.chestY1) / 2, (bands.chestY1 - bands.chestY0) / 2, sf) * range(ax, 0, bands.chestX, sf);
  m = Math.max(m, chest);

  // Belt: thin horizontal band at the waist.
  const belt = band(y, (bands.beltY0 + bands.beltY1) / 2, (bands.beltY1 - bands.beltY0) / 2, sf) * range(ax, 0, bands.beltX, sf);
  m = Math.max(m, belt);

  // Spine line: thin vertical line down the back.
  const spine =
    range(ax, 0, bands.spineX, sf) *
    (z < -bands.spineZ ? 1 : Math.max(0, 1 - (bands.spineZ - z) / sf)) *
    range(y, bands.spineY0, bands.spineY1, sf);
  m = Math.max(m, spine);

  return Math.min(1, m);
}
