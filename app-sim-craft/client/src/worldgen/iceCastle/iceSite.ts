// The ice castle described as a CastleSite (see castle/site.ts).
import type { CastleSite } from "../castle/site";
import { getIcePlan } from "./blueprint";
import { iceGroundAt } from "./crag";
import { ICE_BOUNDS, ICE_CASTLE_CENTER, ICE_FLOOR_Y } from "./layout";

export const ICE_SITE: CastleSite = {
  id: "ice",
  center: ICE_CASTLE_CENTER,
  floorY: ICE_FLOOR_Y,
  bounds: ICE_BOUNDS,
  topAboveFloor: 84,
  glowTint: 1,
  nearRadius: 150,
  getPlan: getIcePlan,
  groundAt: iceGroundAt,
};
