// The ground the village stands on: the natural terrain is levelled to a
// single elevation (VILLAGE_Y) across the core rectangle and eased back to
// the natural height over the fade band around it — so the village is
// always on dry, flat meadow whatever the world seed — and a stream is cut
// along its south edge (the existing flood-to-sea-level rule fills it).
import { VILLAGE_CORE, VILLAGE_FADE, VILLAGE_Y } from "./layout";

const RIVER_BED_Y = 60;
const RIVER_X = { min: -58, max: 116 };
const RIVER_TAPER = 28; // the stream narrows to nothing over this many blocks at each end
const RIVER_HALF_WIDTH = 3.4;
const RIVER_BANK = 3.4; // blocks over which the bank slopes up from the water

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** Z of the stream's centerline at world x. */
export function riverCenterZ(x: number): number {
  return 247 + 4 * Math.sin(x * 0.045) + 2 * Math.sin(x * 0.11 + 1);
}

/** 1 in the stream's channel, easing to 0 across its banks. */
export function riverFactor(x: number, z: number): number {
  if (x < RIVER_X.min || x > RIVER_X.max) return 0;
  const taper = smoothstep((x - RIVER_X.min) / RIVER_TAPER) * smoothstep((RIVER_X.max - x) / RIVER_TAPER);
  const half = RIVER_HALF_WIDTH * taper;
  if (half < 0.4) return 0;
  const d = Math.abs(z - riverCenterZ(x));
  return 1 - smoothstep((d - half * 0.55) / (half * 0.45 + RIVER_BANK));
}

/** 1 inside the village's core, easing to 0 across VILLAGE_FADE blocks outside it. */
export function villageWeight(x: number, z: number): number {
  const dx = Math.max(VILLAGE_CORE.minX - x, 0, x - VILLAGE_CORE.maxX);
  const dz = Math.max(VILLAGE_CORE.minZ - z, 0, z - VILLAGE_CORE.maxZ);
  const d = Math.hypot(dx, dz);
  if (d >= VILLAGE_FADE) return 0;
  return 1 - smoothstep(d / VILLAGE_FADE);
}

/** The natural height, levelled to the village's ground near it (and with the stream cut through). */
export function villageGround(naturalHeight: number, x: number, z: number): number {
  const w = villageWeight(x, z);
  if (w <= 0) return naturalHeight;
  let h = naturalHeight + (VILLAGE_Y - naturalHeight) * w;
  const river = riverFactor(x, z) * w;
  if (river > 0) h = h - (h - RIVER_BED_Y) * river;
  return Math.round(h);
}
