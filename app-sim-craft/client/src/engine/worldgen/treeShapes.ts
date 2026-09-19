// The trees themselves: a small library of voxel tree builders, one per
// species, each drawn through a `put` callback so the same code works
// against any chunk layout (see trees.ts, which clips every tree to the
// chunk column being generated). Everything is a pure function of the
// TreeSpec — a position plus a seed — so a tree looks the same every time
// its chunk regenerates.
//
// The species, and the picture behind each:
//   oak        small round tree with a lumpy green crown
//   grandOak   thick-trunked oak with limbs reaching out to separate leaf
//              clumps, pink blossoms and the odd hanging lantern
//   birch      slender white trunk with black dashes under a broad, flat
//              orange (or green) crown
//   maple      pale, thick-rooted trunk fanning into layered crimson clouds
//   cherry     dark trunk under a huge dusky-pink dome hung with glowing vines
//   willow     gnarled, buttressed trunk with long curtains of hanging leaves
//   pine/spruce  snow-laden conifers for the cold country
//   frostBirch birch in frost
//   shrub      low leafy clumps that fill in the understory
import { getBlockByKey } from "../../data/blocks";

export type TreeKind =
  | "oak"
  | "grandOak"
  | "birch"
  | "maple"
  | "cherry"
  | "willow"
  | "pine"
  | "spruce"
  | "frostBirch"
  | "shrub"
  | "snowShrub";

/** How the crown of a birch/oak grove is colored. */
export type Palette = "green" | "autumn" | "gold";

export interface TreeSpec {
  kind: TreeKind;
  /** World position of the trunk's base column and the surface height there. */
  x: number;
  z: number;
  y: number;
  seed: number;
  palette: Palette;
  /** Whether the ground is snow-covered (conifers grow snow on their boughs). */
  snowy: boolean;
}

/** The furthest a species reaches sideways from its trunk, and up above the ground — used to decide which chunks a tree can touch. */
export const TREE_REACH: Record<TreeKind, number> = {
  oak: 4, grandOak: 9, birch: 6, maple: 10, cherry: 9, willow: 9, pine: 5, spruce: 6, frostBirch: 5, shrub: 3, snowShrub: 3,
};
export const TREE_HEIGHT: Record<TreeKind, number> = {
  oak: 10, grandOak: 22, birch: 22, maple: 24, cherry: 20, willow: 18, pine: 20, spruce: 28, frostBirch: 18, shrub: 5, snowShrub: 5,
};
/** Species whose trunk is two blocks thick — their extra columns need their own ground height. */
export const THICK_TRUNK: ReadonlySet<TreeKind> = new Set(["grandOak", "maple", "willow"]);

const id = (key: string): number => getBlockByKey(key).id;
const OAK_LOG = id("oak_log");
const BIRCH_LOG = id("birch_log");
const CHERRY_LOG = id("cherry_log");
const WILLOW_LOG = id("willow_log");
const LEAF = {
  green: id("leaves_green"),
  lime: id("leaves_lime"),
  autumn: id("leaves_autumn"),
  gold: id("leaves_gold"),
  maple: id("leaves_maple"),
  mapleLight: id("leaves_maple_light"),
  willow: id("leaves_willow"),
  willowDark: id("leaves_willow_dark"),
  cherry: id("leaves_cherry"),
  cherryDark: id("leaves_cherry_dark"),
  pine: id("leaves_pine"),
  frost: id("leaves_frost"),
  snowy: id("leaves_snowy"),
};
const BLOSSOM = id("blossom");
const VINE = id("glow_vine");
const LAMP = id("ember_lamp");

export type Put = (x: number, y: number, z: number, block: number, onlyIfAir: boolean) => void;
export type GroundAt = (x: number, z: number) => number;

function hash3(x: number, y: number, z: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177) ^ Math.imul(seed | 0, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Ctx {
  spec: TreeSpec;
  put: Put;
  ground: GroundAt;
  rand: () => number;
}

const between = (rand: () => number, lo: number, hi: number): number => lo + rand() * (hi - lo);
const intBetween = (rand: () => number, lo: number, hi: number): number => lo + Math.floor(rand() * (hi - lo + 1));

/** Picks an id from weighted choices using a hash roll in [0, 1). */
function pick(roll: number, choices: readonly (readonly [number, number])[]): number {
  let total = 0;
  for (const [, w] of choices) total += w;
  let t = roll * total;
  for (const [block, w] of choices) {
    t -= w;
    if (t <= 0) return block;
  }
  return choices[choices.length - 1][0];
}

/**
 * A lumpy ellipsoid of leaves. `choose` gets the cell's offset from the
 * center (and a hash roll) and returns the block to use, or 0 to leave it
 * empty — which is how blossoms, cut-away undersides and dappled colors are
 * done.
 */
function blob(
  ctx: Ctx,
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  ry: number,
  rz: number,
  choose: (dx: number, dy: number, dz: number, roll: number) => number,
  rough = 0.55,
): void {
  const ix = Math.ceil(rx) + 1;
  const iy = Math.ceil(ry) + 1;
  const iz = Math.ceil(rz) + 1;
  for (let dx = -ix; dx <= ix; dx++) {
    for (let dy = -iy; dy <= iy; dy++) {
      for (let dz = -iz; dz <= iz; dz++) {
        const d = (dx / rx) ** 2 + (dy / ry) ** 2 + (dz / rz) ** 2;
        const jitter = (hash3(cx + dx, cy + dy, cz + dz, ctx.spec.seed) - 0.5) * rough;
        if (d + jitter > 1) continue;
        const block = choose(dx, dy, dz, hash3(cx + dx, cy + dy, cz + dz, ctx.spec.seed + 77));
        if (block !== 0) ctx.put(Math.round(cx) + dx, Math.round(cy) + dy, Math.round(cz) + dz, block, true);
      }
    }
  }
}

function column(ctx: Ctx, x: number, z: number, y0: number, y1: number, block: number): void {
  for (let y = y0; y <= y1; y++) ctx.put(x, y, z, block, false);
}

/** A 2x2 trunk whose four columns each reach down to their own ground. */
function thickColumn(ctx: Ctx, x: number, z: number, y1: number, block: number): void {
  for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
    const g = ctx.ground(x + dx, z + dz);
    column(ctx, x + dx, z + dz, Math.min(g, ctx.spec.y) + 1, y1, block);
  }
}

/** A limb of logs from (x, y, z) heading (dirX, dirZ) with a given rise; returns its tip. */
function limb(ctx: Ctx, x: number, y: number, z: number, dirX: number, dirZ: number, len: number, rise: number, block: number): [number, number, number] {
  let px = x;
  let pz = z;
  let py = y;
  for (let i = 1; i <= len; i++) {
    px = x + Math.round(dirX * i);
    pz = z + Math.round(dirZ * i);
    py = y + Math.round((rise * i) / len);
    ctx.put(px, py, pz, block, false);
    if (i < len && i % 2 === 0) ctx.put(px, py + 1, pz, block, false); // a little thickness
  }
  return [px, py, pz];
}

function unit(angle: number): [number, number] {
  return [Math.cos(angle), Math.sin(angle)];
}

function crownColors(palette: Palette): readonly (readonly [number, number])[] {
  if (palette === "autumn") return [[LEAF.autumn, 0.5], [LEAF.gold, 0.22], [LEAF.mapleLight, 0.28]];
  if (palette === "gold") return [[LEAF.gold, 0.6], [LEAF.autumn, 0.4]];
  return [[LEAF.green, 0.55], [LEAF.lime, 0.45]];
}

function drawOak(c: Ctx): void {
  const { x, y, z } = c.spec;
  const h = intBetween(c.rand, 4, 6);
  column(c, x, z, y + 1, y + h, OAK_LOG);
  const colors = crownColors(c.spec.palette);
  const r = between(c.rand, 2.6, 3.3);
  blob(c, x, y + h + 1, z, r, r * 0.82, r, (_dx, dy, _dz, roll) => (dy > 0 && roll < 0.35 ? LEAF.lime : pick(roll, colors)));
  const a = c.rand() * Math.PI * 2;
  const [ox, oz] = unit(a);
  blob(c, x + Math.round(ox * 2.4), y + h - 1, z + Math.round(oz * 2.4), 1.9, 1.5, 1.9, (_dx, _dy, _dz, roll) => pick(roll, colors));
}

function drawGrandOak(c: Ctx): void {
  const { x, y, z } = c.spec;
  const h = intBetween(c.rand, 9, 13);
  thickColumn(c, x, z, y + h, OAK_LOG);
  // Buttress roots at the base.
  for (const [dx, dz] of [[-1, 0], [2, 1], [0, -1], [1, 2]] as const) if (c.rand() < 0.75) c.put(x + dx, y + 1, z + dz, OAK_LOG, false);
  const colors = crownColors(c.spec.palette);
  const blossoms = (dy: number, ry: number, roll: number, base: number): number => (dy > ry * 0.3 && roll < 0.07 ? BLOSSOM : base);
  const branches = intBetween(c.rand, 3, 4);
  let lantern = c.rand() < 0.5;
  for (let i = 0; i < branches; i++) {
    const angle = ((i + c.rand() * 0.6) / branches) * Math.PI * 2;
    const [ux, uz] = unit(angle);
    const startY = y + Math.round(h * between(c.rand, 0.5, 0.82));
    const len = intBetween(c.rand, 3, 5);
    const [tx, ty, tz] = limb(c, x + (ux > 0 ? 1 : 0), startY, z + (uz > 0 ? 1 : 0), ux, uz, len, intBetween(c.rand, 1, 3), OAK_LOG);
    const ry = between(c.rand, 1.9, 2.4);
    blob(c, tx, ty + 1, tz, between(c.rand, 2.9, 3.6), ry, between(c.rand, 2.9, 3.6), (_dx, dy, _dz, roll) => blossoms(dy, ry, roll, pick(roll * 0.999, colors)));
    if (lantern && c.rand() < 0.7) {
      lantern = false;
      c.put(tx, ty - 1, tz, VINE, true);
      c.put(tx, ty - 2, tz, LAMP, true);
    }
  }
  blob(c, x + 0.5, y + h + 2, z + 0.5, between(c.rand, 4.0, 4.8), 2.8, between(c.rand, 4.0, 4.8), (_dx, dy, _dz, roll) => blossoms(dy, 2.8, roll, pick(roll * 0.999, colors)));
}

function drawBirch(c: Ctx, frost = false): void {
  const { x, y, z } = c.spec;
  const h = frost ? intBetween(c.rand, 7, 11) : intBetween(c.rand, 8, 14);
  column(c, x, z, y + 1, y + h, BIRCH_LOG);
  const colors = frost ? ([[LEAF.frost, 0.55], [LEAF.snowy, 0.45]] as const) : crownColors(c.spec.palette);
  const rx = frost ? between(c.rand, 2.6, 3.3) : between(c.rand, 3.5, 4.6);
  // A broad, flat crown in two tiers, plus a couple of side lobes on short limbs.
  blob(c, x, y + h, z, rx, frost ? 1.6 : 1.8, rx, (_dx, _dy, _dz, roll) => pick(roll, colors), 0.7);
  blob(c, x, y + h + 2, z, rx * 0.62, 1.3, rx * 0.62, (_dx, _dy, _dz, roll) => pick(roll, colors), 0.6);
  const lobes = frost ? 1 : intBetween(c.rand, 1, 2);
  for (let i = 0; i < lobes; i++) {
    const [ux, uz] = unit(c.rand() * Math.PI * 2);
    const startY = y + Math.round(h * between(c.rand, 0.55, 0.75));
    const [tx, ty, tz] = limb(c, x, startY, z, ux, uz, 2, 1, BIRCH_LOG);
    blob(c, tx, ty + 1, tz, 2.4, 1.3, 2.4, (_dx, _dy, _dz, roll) => pick(roll, colors), 0.6);
  }
}

function drawMaple(c: Ctx): void {
  const { x, y, z } = c.spec;
  const h = intBetween(c.rand, 8, 12);
  thickColumn(c, x, z, y + 4, BIRCH_LOG);
  column(c, x, z, y + 5, y + h, BIRCH_LOG);
  for (const [dx, dz] of [[-1, 0], [2, 1], [1, 2], [0, -1]] as const) if (c.rand() < 0.7) c.put(x + dx, y + 1, z + dz, BIRCH_LOG, false);
  const colors = [[LEAF.maple, 0.65], [LEAF.mapleLight, 0.35]] as const;
  const clump = (bx: number, by: number, bz: number, r: number): void => {
    // Two flattened tiers, like stacked clouds.
    blob(c, bx, by, bz, r, 1.5, r, (_dx, dy, _dz, roll) => pick(dy > 0 ? roll * 0.6 + 0.4 : roll, colors), 0.75);
    blob(c, bx, by + 2, bz, r * 0.68, 1.2, r * 0.68, (_dx, _dy, _dz, roll) => pick(roll * 0.7 + 0.3, colors), 0.7);
  };
  const branches = intBetween(c.rand, 4, 5);
  for (let i = 0; i < branches; i++) {
    const angle = ((i + c.rand() * 0.5) / branches) * Math.PI * 2;
    const [ux, uz] = unit(angle);
    const startY = y + Math.round(h * between(c.rand, 0.45, 0.85));
    const [tx, ty, tz] = limb(c, x, startY, z, ux, uz, intBetween(c.rand, 3, 5), intBetween(c.rand, 2, 3), BIRCH_LOG);
    clump(tx, ty + 1, tz, between(c.rand, 3.0, 3.8));
  }
  blob(c, x, y + h + 2, z, between(c.rand, 4.2, 5), 2.2, between(c.rand, 4.2, 5), (_dx, dy, _dz, roll) => pick(dy > 0 ? roll * 0.6 + 0.4 : roll, colors), 0.75);
}

function drawCherry(c: Ctx): void {
  const { x, y, z } = c.spec;
  const h = intBetween(c.rand, 6, 8);
  let tx = x;
  let tz = z;
  const [bx, bz] = unit(c.rand() * Math.PI * 2);
  for (let dy = 1; dy <= h; dy++) {
    if (dy === Math.floor(h / 2)) {
      tx += Math.round(bx);
      tz += Math.round(bz);
    }
    c.put(tx, y + dy, tz, CHERRY_LOG, false);
    if (dy <= 2) for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) if (hash3(x + ox, dy, z + oz, c.spec.seed) < 0.5) c.put(tx + ox, y + dy, tz + oz, CHERRY_LOG, false);
  }
  const cy = y + h + 2;
  const rx = between(c.rand, 5, 6.2);
  const ry = between(c.rand, 3.6, 4.2);
  const colors = [[LEAF.cherryDark, 0.55], [LEAF.cherry, 0.45]] as const;
  // A dome: the ellipsoid with its lower part cut away.
  blob(c, tx, cy, tz, rx, ry, rx, (_dx, dy, _dz, roll) => (dy < -2 ? 0 : dy > 0 && roll < 0.05 ? BLOSSOM : pick(roll * 0.999, colors)), 0.8);
  // Glowing vines hanging from the rim and underside.
  const vines = intBetween(c.rand, 9, 13);
  for (let i = 0; i < vines; i++) {
    const a = c.rand() * Math.PI * 2;
    const r = rx * between(c.rand, 0.35, 0.9);
    const vx = Math.round(tx + Math.cos(a) * r);
    const vz = Math.round(tz + Math.sin(a) * r);
    const top = cy - 2; // just under the dome's lower edge
    const len = intBetween(c.rand, 2, 6);
    for (let k = 0; k < len; k++) c.put(vx, top - k, vz, VINE, true);
  }
}

function drawWillow(c: Ctx): void {
  const { x, y, z } = c.spec;
  const h = intBetween(c.rand, 6, 8);
  thickColumn(c, x, z, y + h, WILLOW_LOG);
  // Roots splaying out from the base of the trunk.
  const roots: [number, number, number, number][] = [
    [x - 1, z, -1, 0], [x - 1, z + 1, -1, 0], [x + 2, z, 1, 0], [x + 2, z + 1, 1, 0],
    [x, z - 1, 0, -1], [x + 1, z - 1, 0, -1], [x, z + 2, 0, 1], [x + 1, z + 2, 0, 1],
  ];
  for (const [rx0, rz0, sx, sz] of roots) {
    if (c.rand() > 0.7) continue;
    c.put(rx0, y + 1, rz0, WILLOW_LOG, false);
    if (c.rand() < 0.5) c.put(rx0 + sx, y + 1, rz0 + sz, WILLOW_LOG, false);
  }
  // Two forks leaning out from the top.
  const blobs: [number, number, number, number][] = [[x, y + h + 2, z, 4.4]];
  const forks = intBetween(c.rand, 3, 4);
  for (let i = 0; i < forks; i++) {
    const [ux, uz] = unit(((i + c.rand() * 0.5) / forks) * Math.PI * 2);
    const [tx, ty, tz] = limb(c, x, y + h - 1, z, ux, uz, 3, 2, WILLOW_LOG);
    blobs.push([tx, ty + 1, tz, between(c.rand, 3.3, 4.0)]);
  }
  for (const [bx, by, bz, r] of blobs) {
    blob(c, bx, by, bz, r, 2.3, r, (_dx, _dy, _dz, roll) => (roll < 0.6 ? LEAF.willow : LEAF.willowDark), 0.7);
    // Curtains of leaves hanging from the underside of the clump.
    const reach = Math.ceil(r);
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dz = -reach; dz <= reach; dz++) {
        const d = Math.hypot(dx, dz);
        if (d > r - 0.3 || d < r * 0.35) continue;
        if (hash3(bx + dx, by, bz + dz, c.spec.seed + 5) > 0.62) continue;
        const len = 3 + Math.floor(hash3(bx + dx, by + 1, bz + dz, c.spec.seed + 6) * 6);
        const top = by - Math.round(2.3 * Math.sqrt(Math.max(0, 1 - (d / r) ** 2)));
        for (let k = 0; k < len; k++) c.put(bx + dx, top - k, bz + dz, k < len * 0.45 ? LEAF.willow : LEAF.willowDark, true);
      }
    }
  }
}

/** Tiered conifer; boughs carry snow on their upper faces when the ground is snowy. */
function drawConifer(c: Ctx, tall: boolean): void {
  const { x, y, z, snowy } = c.spec;
  const trunk = tall ? intBetween(c.rand, 15, 21) : intBetween(c.rand, 9, 14);
  const maxR = tall ? 4 : 3;
  column(c, x, z, y + 1, y + trunk, OAK_LOG);
  const base = y + (tall ? 3 : 2);
  const layers = trunk - (tall ? 2 : 1);
  const radiusAt = (i: number): number => {
    const t = layers > 1 ? i / (layers - 1) : 1;
    let r = maxR - Math.floor(t * (maxR + 0.999));
    if (i % 3 === 2) r = r - 1;
    return Math.max(i >= layers - 3 ? 0 : 1, r); // boughs stay at least a block wide until the very tip
  };
  for (let i = 0; i < layers; i++) {
    const r = radiusAt(i);
    const above = radiusAt(i + 1);
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > r + 1) continue;
        const coveredAbove = i + 1 < layers && Math.abs(dx) + Math.abs(dz) <= above + 1 && Math.max(Math.abs(dx), Math.abs(dz)) <= above;
        const roll = hash3(x + dx, y + i, z + dz, c.spec.seed);
        const block = snowy && !coveredAbove && roll < 0.82 ? LEAF.snowy : LEAF.pine;
        c.put(x + dx, base + i, z + dz, block, true);
      }
    }
  }
  // Cap the tip in needles (over the bare top of the trunk) so no pole shows above the crown.
  for (let k = trunk - 1; k <= trunk + 2; k++) c.put(x, y + k, z, snowy && k >= trunk ? LEAF.snowy : LEAF.pine, false);
}

function drawShrub(c: Ctx, snowy: boolean): void {
  const { x, y, z } = c.spec;
  const r = between(c.rand, 1.3, 1.9);
  const colors: readonly (readonly [number, number])[] = snowy ? [[LEAF.snowy, 0.6], [LEAF.pine, 0.4]] : [[LEAF.green, 0.5], [LEAF.lime, 0.5]];
  blob(c, x, y + 1, z, r, r * 0.8, r, (_dx, dy, _dz, roll) => (!snowy && dy >= 0 && roll < 0.06 ? BLOSSOM : pick(roll * 0.999, colors)), 0.5);
}

/** Draws one tree through `put`. */
export function drawTree(spec: TreeSpec, put: Put, ground: GroundAt): void {
  const ctx: Ctx = { spec, put, ground, rand: makeRng(spec.seed ^ 0x9e3779b9) };
  switch (spec.kind) {
    case "oak": return drawOak(ctx);
    case "grandOak": return drawGrandOak(ctx);
    case "birch": return drawBirch(ctx);
    case "frostBirch": return drawBirch(ctx, true);
    case "maple": return drawMaple(ctx);
    case "cherry": return drawCherry(ctx);
    case "willow": return drawWillow(ctx);
    case "pine": return drawConifer(ctx, false);
    case "spruce": return drawConifer(ctx, true);
    case "shrub": return drawShrub(ctx, false);
    case "snowShrub": return drawShrub(ctx, true);
  }
}
