// What the castle systems need to know about one castle: where it stands and
// how big its dense plan box is. The dark castle (castle/layout.ts) and the
// ice castle (iceCastle/layout.ts) each describe themselves with one of
// these, and the generic parts — stamping a plan into chunks, baking its
// block light, hanging its banners — work from the description alone.
import type { CastlePlan } from "./plan";

/** The inclusive local-coordinate box a castle's dense plan covers (blocks + baked light). */
export interface PlanBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface CastleSite {
  id: "dark" | "ice";
  /** World x/z of the local origin. */
  center: { x: number; z: number };
  /** World Y of local y = 0. */
  floorY: number;
  bounds: PlanBounds;
  /** The highest block above floorY the plan can reach (sizes chunk columns). */
  topAboveFloor: number;
  /** A chunk column this close (blocks) to the center might hold some of the castle; farther ones skip it (and never build the plan). */
  nearRadius: number;
  /** The colour of the light its glowing blocks cast: 0 is warm firelight, 1 the ice castle's cold blue light. */
  glowTint: 0 | 1;
  /** The plan, built once per thread. */
  getPlan(): CastlePlan;
  /** World-space ground height of untouched cells at a local (x, z) — below it an unset plan cell counts as solid rock (for baked light). */
  groundAt(lx: number, lz: number): number;
}
