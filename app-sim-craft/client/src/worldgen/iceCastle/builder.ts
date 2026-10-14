// Drawing helpers for the ice castle's blueprint: the dark castle's box/ring
// primitives (castle/plan.ts) plus the architecture this castle is made of —
// snow-capped crenellations, round turrets under conical spires, square
// pyramid spires, pointed arches, lancet and rose windows, lantern posts and
// stairs — all in the castle's local frame (iceCastle/layout.ts).
import { CastlePlan, type BlockSource, type Facing } from "../castle/plan";
import { AIR, B } from "./ids";

export function h3(x: number, y: number, z: number, salt: number): number {
  let h = (Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2246822519) ^ Math.imul(salt, 3266489917)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** The castle's wall stone: clean royal-blue frost brick, with rime clinging low down and the odd cracked brick. */
export function wall(x: number, y: number, z: number): number {
  const r = h3(x, y, z, 1);
  const patch = h3(x >> 2, y >> 2, z >> 2, 2);
  if (patch > 0.93) return B.CRACKED;
  if (y < 5 && r < 0.2) return B.RIMED;
  if (r < 0.03) return B.CRACKED;
  return B.BRICK;
}

/** Hall flagstones: a 2x2 checker of pale and deep frostmarble. */
export function flagstone(x: number, _y: number, z: number): number {
  return ((x >> 1) + (z >> 1)) & 1 ? B.FLOOR_LIGHT : B.FLOOR_DARK;
}

/** A pointed arch's half-width at height `dy` above its springing line: full width up the straight jambs, then closing a block per row to a one-block point at the top (so `height` should be at least `halfWidth` + the jamb height). */
function archHalfWidth(dy: number, height: number, halfWidth: number): number {
  const jambs = height - halfWidth;
  if (dy < jambs) return halfWidth;
  return Math.max(0, halfWidth - 1 - (dy - jambs));
}

export class IceBuilder {
  readonly p: CastlePlan;

  constructor(plan: CastlePlan) {
    this.p = plan;
  }

  /** The top block of a wall: snow-capped brick, so every rampart walk and merlon reads white from above. */
  cap(x: number, y: number, z: number): void {
    this.p.set(x, y, z, B.SNOWY);
  }

  /** Re-lays the top surface of a rectangle at `y` as snow-capped brick (a rampart walk under snow). */
  snowWalk(x0: number, z0: number, x1: number, z1: number, y: number): void {
    this.p.box(x0, y, z0, x1, y, z1, B.SNOWY);
  }

  /** A crenellated parapet: a ring at `y` with alternating merlons one higher, all snow-capped. */
  crenels(x0: number, z0: number, x1: number, z1: number, y: number): void {
    const p = this.p;
    const [ax, bx] = x0 <= x1 ? [x0, x1] : [x1, x0];
    const [az, bz] = z0 <= z1 ? [z0, z1] : [z1, z0];
    p.ring(ax, az, bx, bz, y, y, wall);
    for (let x = ax; x <= bx; x++) {
      for (let z = az; z <= bz; z++) {
        const onRing = x === ax || x === bx || z === az || z === bz;
        if (!onRing) continue;
        if ((x + z) % 2 === 0) {
          p.set(x, y, z, wall(x, y, z));
          this.cap(x, y + 1, z);
        } else {
          this.cap(x, y, z);
        }
      }
    }
  }

  /** A straight crenellated parapet run (inclusive ends): snow-capped, merlons alternating one higher. */
  parapetLine(x0: number, z0: number, x1: number, z1: number, y: number): void {
    const p = this.p;
    const [ax, bx] = x0 <= x1 ? [x0, x1] : [x1, x0];
    const [az, bz] = z0 <= z1 ? [z0, z1] : [z1, z0];
    for (let x = ax; x <= bx; x++) {
      for (let z = az; z <= bz; z++) {
        if ((x + z) % 2 === 0) {
          p.set(x, y, z, wall(x, y, z));
          this.cap(x, y + 1, z);
        } else this.cap(x, y, z);
      }
    }
  }

  /** A filled disc (x/z) over a y range; `r` is the radius, with the usual +0.5 fudge so small radii stay round. */
  disc(cx: number, cz: number, r: number, y0: number, y1: number, src: BlockSource): void {
    const p = this.p;
    for (let y = y0; y <= y1; y++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dz * dz > r * r + r * 0.8) continue;
          p.set(cx + dx, y, cz + dz, typeof src === "number" ? src : src(cx + dx, y, cz + dz));
        }
      }
    }
  }

  /** Carves a disc to air. */
  carveDisc(cx: number, cz: number, r: number, y0: number, y1: number): void {
    this.disc(cx, cz, r, y0, y1, AIR);
  }

  /** The roof tile for a spire layer: snow-laden on some layers, plain blue on others, so snow lies in drifts across the roof. */
  private roofBlock(x: number, y: number, z: number, snowChance: number): number {
    return h3(x, y, z, 7) < snowChance ? B.ROOF_SNOWY : B.ROOF;
  }

  /** A conical roof over a round tower of radius `r` starting at layer `y`: two layers per radius step, up to a glowing finial. Returns the apex y. */
  cone(cx: number, cz: number, y: number, r: number): number {
    const p = this.p;
    let layer = y;
    for (let rr = r + 1; rr >= 1; rr--) {
      for (let k = 0; k < 2; k++) {
        this.disc(cx, cz, rr, layer, layer, (x, yy, z) => this.roofBlock(x, yy, z, 0.5));
        layer++;
      }
    }
    p.box(cx, layer, cz, cx, layer + 1, cz, B.RIDGE);
    this.finial(cx, layer + 2, cz);
    return layer + 3;
  }

  /** The glowing tip of a spire, cone or pinnacle: a blue-lit lantern under a crystal that shines on its own. */
  finial(x: number, y: number, z: number): void {
    this.p.set(x, y, z, B.LANTERN);
    this.p.set(x, y + 1, z, B.CRYSTAL);
  }

  /** A square pyramid spire over a square of half-width `half` centered on (cx, cz): steep, two layers per step in, a glowing finial on top. Returns the apex y. */
  spire(cx: number, cz: number, y: number, half: number, steep = 2, snowChance = 0.5): number {
    const p = this.p;
    let layer = y;
    for (let h = half; h >= 0; h--) {
      for (let k = 0; k < steep; k++) {
        p.box(cx - h, layer, cz - h, cx + h, layer, cz + h, (x, yy, z) => this.roofBlock(x, yy, z, snowChance));
        if (h > 0 && k === 0) p.ring(cx - h, cz - h, cx + h, cz + h, layer, layer, B.ROOF); // an unsnowed eave line on the lower layer of each step
        layer++;
      }
    }
    p.box(cx, layer, cz, cx, layer + 1, cz, B.RIDGE);
    this.finial(cx, layer + 2, cz);
    return layer + 3;
  }

  /** A small pinnacle on a wall corner: two blocks of brick and a gilded point. */
  pinnacle(x: number, y: number, z: number): void {
    this.p.set(x, y, z, B.BRICK);
    this.cap(x, y + 1, z);
    this.p.set(x, y + 2, z, B.LANTERN);
  }

  /** A lantern-post: column with a frost lantern on top. */
  lampPost(x: number, y: number, z: number, height: number): void {
    this.p.box(x, y, z, x, y + height - 1, z, B.COLUMN);
    this.p.set(x, y + height, z, B.LANTERN);
  }

  /** A brazier pillar: plinth, slim column, capital, a brazier bowl and its flame. Returns the flame's y. */
  brazierPillar(x: number, z: number, y: number, height: number): number {
    const p = this.p;
    p.box(x - 1, y, z - 1, x + 1, y, z + 1, B.POLISHED);
    p.box(x, y + 1, z, x, y + height - 2, z, B.COLUMN);
    p.box(x - 1, y + height - 1, z - 1, x + 1, y + height - 1, z + 1, B.POLISHED);
    p.set(x, y + height, z, B.BRAZIER);
    p.set(x, y + height + 1, z, B.FLAME);
    return y + height + 1;
  }

  /** A wall torch: a short column with a brazier cup and flame — the torches that flank the stairs. */
  torch(x: number, y: number, z: number, height = 2): void {
    this.p.box(x, y, z, x, y + height - 1, z, B.COLUMN);
    this.p.set(x, y + height, z, B.BRAZIER);
    this.p.set(x, y + height + 1, z, B.FLAME);
  }

  /** A tall pointed window of `height` blocks at (x, y..) in a wall (the wall block under it already placed). */
  lancet(x: number, y: number, z: number, height: number, lit = true): void {
    const p = this.p;
    for (let i = 0; i < height; i++) {
      const top = i === height - 1;
      p.set(x, y + i, z, lit ? (top ? B.WINDOW_TOP : B.WINDOW) : B.WINDOW_DARK);
    }
  }

  /** The same, for a run of windows along x (a row of lancets with brick between). */
  lancetRowX(xs: number[], y: number, z: number, height: number, lit = true): void {
    for (const x of xs) this.lancet(x, y, z, height, lit);
  }

  /** A 3x3 rose window centered on (cx, cy) in the plane z = `z` (facing north/south) or x = `x` (facing east/west). */
  roseZ(cx: number, cy: number, z: number): void {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) this.p.set(cx - 1 + c, cy + 1 - r, z, B.ROSE[r * 3 + c]);
  }

  roseX(x: number, cy: number, cz: number): void {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) this.p.set(x, cy + 1 - r, cz - 1 + c, B.ROSE[r * 3 + c]);
  }

  /** Carves a pointed-arch opening through a wall running along z (the opening is `halfWidth` either side of cx, `height` tall from y0), over the z range z0..z1. */
  archZ(cx: number, y0: number, z0: number, z1: number, halfWidth: number, height: number): void {
    for (let dy = 0; dy < height; dy++) {
      const hw = archHalfWidth(dy, height, halfWidth);
      this.p.clear(cx - hw, y0 + dy, z0, cx + hw, y0 + dy, z1);
    }
  }

  /** The same for a wall running along x (an opening through it in the x direction). */
  archX(cz: number, y0: number, x0: number, x1: number, halfWidth: number, height: number): void {
    for (let dy = 0; dy < height; dy++) {
      const hw = archHalfWidth(dy, height, halfWidth);
      this.p.clear(x0, y0 + dy, cz - hw, x1, y0 + dy, cz + hw);
    }
  }

  /** A moulding line of polished stone around the head of a z-facing arch opening (drawn on the wall face at `z`). */
  archSurroundZ(cx: number, y0: number, z: number, halfWidth: number, height: number): void {
    for (let dy = 0; dy < height; dy++) {
      const hw = archHalfWidth(dy, height, halfWidth);
      this.p.set(cx - hw - 1, y0 + dy, z, B.POLISHED);
      this.p.set(cx + hw + 1, y0 + dy, z, B.POLISHED);
    }
    const hwTop = archHalfWidth(height - 1, height, halfWidth);
    this.p.box(cx - hwTop, y0 + height, z, cx + hwTop, y0 + height, z, B.POLISHED);
    this.p.set(cx, y0 + height + 1, z, B.TRIM);
  }

  banner(x: number, y: number, z: number, facing: Facing, width = 3, height = 9): void {
    this.p.addBanner({ x, y, z, facing, width, height });
  }

  /**
   * A straight run of one-block steps. The first step's top surface is at
   * standing cell `startY`; each next step is one higher and one block
   * further along (dx, dz). `across` is the perpendicular half-width.
   * Headroom above each step is carved out so a stair can pierce floors.
   * `rise` is the height change per step: 1 climbs, -1 descends. With `base`, each step is a solid column down to that y instead of a floating tread.
   */
  stairRun(x: number, z: number, dx: number, dz: number, across: number, startY: number, steps: number, headroom = 3, tread: number = B.POLISHED, rise = 1, base?: number): void {
    const p = this.p;
    for (let i = 0; i < steps; i++) {
      const sx = x + dx * i;
      const sz = z + dz * i;
      const top = startY + i * rise;
      for (let a = -across; a <= across; a++) {
        const ax = sx + (dx === 0 ? a : 0);
        const az = sz + (dz === 0 ? a : 0);
        p.box(ax, base === undefined ? top - 1 : Math.min(base, top - 1), az, ax, top - 1, az, tread);
        p.box(ax, top, az, ax, top + headroom - 1, az, AIR);
      }
    }
  }

  /** A round tower: a disc wall with a hollow core, arrow slits at the four quarters on each `slitRows` row, closed by a floor-level slab. */
  roundTower(cx: number, cz: number, r: number, y0: number, y1: number, slitRows: number[]): void {
    const p = this.p;
    this.disc(cx, cz, r, y0, y1, wall);
    this.carveDisc(cx, cz, r - 1, y0 + 1, y1);
    for (const sy of slitRows) {
      for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]] as const) p.set(cx + dx, sy, cz + dz, B.SLIT);
    }
  }
}
