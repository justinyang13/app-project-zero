// Lamps and icicles. Block light (castle/lightMap.ts) loses one level per
// block, so a lantern hung under a high ceiling leaves the floor dark: the
// lanterns here sit low — set flush into pillars and walls, or atop short
// posts — and are spaced a few blocks apart so no walkable floor is left in
// the dark. The library, hall and secret rooms light themselves in their own
// files; this is the keep's great hall, stairs, gate tunnels and rooms.
import type { CastlePlan } from "../castle/plan";
import { UNSET } from "../castle/plan";
import { h3 } from "./builder";
import type { IceBuilder } from "./builder";
import { B } from "./ids";

export function buildInteriorLights(b: IceBuilder): void {
  const p = b.p;
  const lamp = (x: number, y: number, z: number): void => p.set(x, y, z, B.LANTERN);

  // The great hall (floor y = 1): a lantern in every pillar, a row of lantern posts
  // flanking the runner, and lanterns in the side, end and gate walls.
  for (const x of [-8, 8]) {
    for (const z of [-8, -14, -20]) lamp(x, 3, z);
  }
  for (const x of [-3, 3]) {
    for (const z of [-5, -11, -17, -23]) b.lampPost(x, 1, z, 3);
  }
  for (const x of [-13, 13]) {
    for (const z of [-8, -14, -20]) lamp(x, 2, z);
  }
  for (const x of [-10, 10]) {
    lamp(x, 3, -26);
    lamp(x, 3, -2);
  }

  // The stair corridors from the hall up to the terrace: a lantern set in the
  // wall every third step, alternating sides, all the way to the top.
  for (const s of [-1, 1]) {
    for (const i of [1, 4, 7, 10]) lamp(s * (15 + i), 1 + i + 2, i % 2 === 1 ? -9 : -5);
  }

  // The gate tunnels, outer and inner.
  for (const x of [-4, 4]) {
    for (const z of [-1, 2, 27, 29]) lamp(x, 3, z);
  }

  // Tier 1's gallery (floor y = 14) and upper hall (floor y = 20).
  for (const floorY of [14, 20]) {
    for (const [x, z] of [[-9, -16], [9, -16], [-9, -24], [9, -24]] as const) lamp(x, floorY + 2, z);
    for (const z of [-13, -19, -26]) b.lampPost(0, floorY + 1, z, 2);
    for (const x of [-5, 5]) {
      b.lampPost(x, floorY + 1, -12, 2);
      b.lampPost(x + Math.sign(x), floorY + 1, -27, 2);
    }
    for (const x of [-17, 17]) {
      for (const z of [-13, -19, -25, -27]) lamp(x, floorY + 2, z);
    }
  }
  // Either side of the gallery's front door, and of the upper hall's.
  for (const x of [-10, -6]) lamp(x, 16, -9);
  for (const x of [-3, 3]) lamp(x, 22, -9);

  // Tier 2's three floors: lanterns in the pillars, the side walls and the middle of the room.
  for (const floorY of [28, 35, 42]) {
    for (const [x, z] of [[-7, -17], [7, -17], [-7, -23], [7, -23]] as const) lamp(x, floorY + 2, z);
    for (const x of [-11, 11]) lamp(x, floorY + 2, -20);
    for (const z of [-16, -24]) b.lampPost(0, floorY + 1, z, 2);
  }
}

const OVERHANG_TOPS = new Set<number>([B.SNOWY, B.ROOF_SNOWY, B.ROOF, B.RIDGE, B.TRIM]);

/**
 * Hangs icicles from every overhang of snow and slate that has open sky beneath it —
 * eaves, cornices, the lips of snow-capped merlons. "Open sky" is a cell the plan
 * never touched (rooms are carved to air, so an UNSET cell below is outside), and
 * a few icicles grow two or three blocks long. Deterministic per cell.
 */
export function hangIcicles(plan: CastlePlan): void {
  const { minX, maxX, minY, maxY, minZ, maxZ } = plan.bounds;
  for (let y = Math.max(minY, 3); y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        if (!OVERHANG_TOPS.has(plan.get(x, y, z))) continue;
        if (plan.get(x, y - 1, z) !== UNSET) continue;
        const r = h3(x, y, z, 91);
        if (r > 0.42) continue;
        const length = r < 0.05 ? 3 : r < 0.16 ? 2 : 1;
        for (let i = 1; i <= length; i++) {
          if (plan.get(x, y - i, z) !== UNSET) break;
          plan.set(x, y - i, z, B.ICICLE);
        }
      }
    }
  }
}
