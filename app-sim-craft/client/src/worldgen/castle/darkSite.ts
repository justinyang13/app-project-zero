// The dark castle described as a CastleSite (see castle/site.ts).
import { getCastlePlan } from "./blueprint";
import { cragHeight, rampHeight } from "./crag";
import { CASTLE_CENTER, CASTLE_FLOOR_Y } from "./layout";
import { DARK_BOUNDS } from "./plan";
import type { CastleSite } from "./site";

export const DARK_SITE: CastleSite = {
  id: "dark",
  center: CASTLE_CENTER,
  floorY: CASTLE_FLOOR_Y,
  bounds: DARK_BOUNDS,
  topAboveFloor: 74,
  glowTint: 0,
  nearRadius: 150,
  getPlan: getCastlePlan,
  groundAt(lx, lz) {
    const crag = cragHeight(CASTLE_CENTER.x + lx, CASTLE_CENTER.z + lz);
    const ramp = rampHeight(CASTLE_CENTER.x + lx, CASTLE_CENTER.z + lz);
    // The approach ramp is cut through the crag (applyCrag), so on its columns the ramp, not the crag, is the ground.
    return ramp ?? (crag === -Infinity ? 68 : crag);
  },
};
