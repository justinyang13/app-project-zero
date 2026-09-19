// The village as a dense voxel plan in world coordinates: build.ts draws
// into this (later drawing overwrites earlier), and worldgen copies its
// cells over the terrain of whichever chunks it overlaps (see stamp.ts).
// A cell is either UNSET (leave the terrain alone) or a block id — there
// is no "carve to air" here, so a building's interior is simply never
// drawn and stays the open air the terrain already left.
import { VILLAGE_CORE, VILLAGE_Y } from "./layout";

export const UNSET = 0xffff;

export const PLAN_MIN_X = VILLAGE_CORE.minX;
export const PLAN_MAX_X = VILLAGE_CORE.maxX;
export const PLAN_MIN_Z = VILLAGE_CORE.minZ;
export const PLAN_MAX_Z = VILLAGE_CORE.maxZ;
export const PLAN_MIN_Y = VILLAGE_Y - 8;
export const PLAN_MAX_Y = VILLAGE_Y + 28;

export class VillagePlan {
  readonly sizeX = PLAN_MAX_X - PLAN_MIN_X + 1;
  readonly sizeY = PLAN_MAX_Y - PLAN_MIN_Y + 1;
  readonly sizeZ = PLAN_MAX_Z - PLAN_MIN_Z + 1;
  readonly blocks = new Uint16Array(this.sizeX * this.sizeY * this.sizeZ).fill(UNSET);

  index(x: number, y: number, z: number): number {
    if (x < PLAN_MIN_X || x > PLAN_MAX_X || y < PLAN_MIN_Y || y > PLAN_MAX_Y || z < PLAN_MIN_Z || z > PLAN_MAX_Z) return -1;
    return (y - PLAN_MIN_Y) * this.sizeZ * this.sizeX + (z - PLAN_MIN_Z) * this.sizeX + (x - PLAN_MIN_X);
  }

  get(x: number, y: number, z: number): number {
    const i = this.index(x, y, z);
    return i < 0 ? UNSET : this.blocks[i];
  }

  set(x: number, y: number, z: number, id: number): void {
    const i = this.index(x, y, z);
    if (i >= 0) this.blocks[i] = id;
  }

  setIfUnset(x: number, y: number, z: number, id: number): void {
    const i = this.index(x, y, z);
    if (i >= 0 && this.blocks[i] === UNSET) this.blocks[i] = id;
  }

  /** Fills an inclusive box (corners in any order). */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number): void {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, z, id);
      }
    }
  }
}
