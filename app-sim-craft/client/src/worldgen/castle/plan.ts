// The castle as a dense voxel plan in its own local frame (see
// castle/layout.ts): the blueprint (castle/blueprint.ts) draws into this
// with box/ring/roof helpers — later drawing overwrites earlier, which is
// what makes layered, overlapping architecture easy to author — and
// worldgen then copies the plan's cells over the terrain of whichever
// chunks it overlaps. A cell is either UNSET (leave the terrain alone),
// air (carve), or a block id. Because the plan is a plain function of
// nothing but the fixed layout, it is built once per worker/thread and
// cached.
import { CASTLE_CENTER, CASTLE_FLOOR_Y, PLAN_MAX_X, PLAN_MAX_Y, PLAN_MAX_Z, PLAN_MIN_X, PLAN_MIN_Y, PLAN_MIN_Z } from "./layout";
import type { PlanBounds } from "./site";

/** The dark castle's plan box (the default). */
export const DARK_BOUNDS: PlanBounds = { minX: PLAN_MIN_X, maxX: PLAN_MAX_X, minY: PLAN_MIN_Y, maxY: PLAN_MAX_Y, minZ: PLAN_MIN_Z, maxZ: PLAN_MAX_Z };

export const UNSET = 0xffff;

export type BlockSource = number | ((x: number, y: number, z: number) => number);

export type Facing = "N" | "S" | "E" | "W";

/** A hanging banner: `x`,`z` is the center of its wall-side edge, `y` its top edge (all local); `facing` is which way the cloth faces (the side you read it from). */
export interface BannerSpec {
  x: number;
  y: number;
  z: number;
  facing: Facing;
  width: number;
  height: number;
}

/** A block placed at an absolute world coordinate — terrain-following pieces (lava cascading down the crag) that can't live in the fixed-size plan box. */
export interface WorldExtra {
  x: number;
  y: number;
  z: number;
  id: number;
}

export class CastlePlan {
  readonly sizeX: number;
  readonly sizeY: number;
  readonly sizeZ: number;
  readonly blocks: Uint16Array;
  readonly banners: BannerSpec[] = [];
  readonly extras: WorldExtra[] = [];
  readonly bounds: PlanBounds;

  constructor(bounds: PlanBounds = DARK_BOUNDS) {
    this.bounds = bounds;
    this.sizeX = bounds.maxX - bounds.minX + 1;
    this.sizeY = bounds.maxY - bounds.minY + 1;
    this.sizeZ = bounds.maxZ - bounds.minZ + 1;
    this.blocks = new Uint16Array(this.sizeX * this.sizeY * this.sizeZ).fill(UNSET);
  }

  index(lx: number, ly: number, lz: number): number {
    const b = this.bounds;
    if (lx < b.minX || lx > b.maxX || ly < b.minY || ly > b.maxY || lz < b.minZ || lz > b.maxZ) return -1;
    return (ly - b.minY) * this.sizeZ * this.sizeX + (lz - b.minZ) * this.sizeX + (lx - b.minX);
  }

  get(lx: number, ly: number, lz: number): number {
    const i = this.index(lx, ly, lz);
    return i < 0 ? UNSET : this.blocks[i];
  }

  set(lx: number, ly: number, lz: number, id: number): void {
    const i = this.index(lx, ly, lz);
    if (i >= 0) this.blocks[i] = id;
  }

  /** Sets a cell only if nothing has been drawn there yet. */
  setIfUnset(lx: number, ly: number, lz: number, id: number): void {
    const i = this.index(lx, ly, lz);
    if (i >= 0 && this.blocks[i] === UNSET) this.blocks[i] = id;
  }

  /** Fills an inclusive box (corners in any order) with a block id or a per-cell function. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, src: BlockSource): void {
    const [ax, bx] = x0 <= x1 ? [x0, x1] : [x1, x0];
    const [ay, by] = y0 <= y1 ? [y0, y1] : [y1, y0];
    const [az, bz] = z0 <= z1 ? [z0, z1] : [z1, z0];
    for (let y = ay; y <= by; y++) {
      for (let z = az; z <= bz; z++) {
        for (let x = ax; x <= bx; x++) this.set(x, y, z, typeof src === "number" ? src : src(x, y, z));
      }
    }
  }

  /** Carves an inclusive box to air. */
  clear(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): void {
    this.box(x0, y0, z0, x1, y1, z1, 0);
  }

  /** Only the perimeter cells of a rectangle (in x/z), over a y range. */
  ring(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, src: BlockSource): void {
    const [ax, bx] = x0 <= x1 ? [x0, x1] : [x1, x0];
    const [az, bz] = z0 <= z1 ? [z0, z1] : [z1, z0];
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      for (let x = ax; x <= bx; x++) {
        for (const z of az === bz ? [az] : [az, bz]) this.set(x, y, z, typeof src === "number" ? src : src(x, y, z));
      }
      for (let z = az + 1; z < bz; z++) {
        for (const x of ax === bx ? [ax] : [ax, bx]) this.set(x, y, z, typeof src === "number" ? src : src(x, y, z));
      }
    }
  }

  /** A solid box with an air-filled core, leaving `t`-thick walls on the sides (x/z) and closed at top and bottom by `t` too unless `open` is set. */
  hollowBox(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, src: BlockSource, t = 1, open: "none" | "top" | "both" = "none"): void {
    this.box(x0, y0, z0, x1, y1, z1, src);
    const [ax, bx] = x0 <= x1 ? [x0, x1] : [x1, x0];
    const [ay, by] = y0 <= y1 ? [y0, y1] : [y1, y0];
    const [az, bz] = z0 <= z1 ? [z0, z1] : [z1, z0];
    const yLo = open === "both" ? ay : ay + t;
    const yHi = open === "none" ? by - t : by;
    this.clear(ax + t, yLo, az + t, bx - t, yHi, bz - t);
  }

  addBanner(banner: BannerSpec): void {
    this.banners.push(banner);
  }

  addExtra(extra: WorldExtra): void {
    this.extras.push(extra);
  }
}

/** World-space corner helpers (the plan's local frame is a pure translation of the world). */
export function worldFromLocal(lx: number, ly: number, lz: number): { x: number; y: number; z: number } {
  return { x: CASTLE_CENTER.x + lx, y: CASTLE_FLOOR_Y + ly, z: CASTLE_CENTER.z + lz };
}
