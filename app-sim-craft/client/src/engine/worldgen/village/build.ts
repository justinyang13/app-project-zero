// Draws the village (layout.ts) into a plan (plan.ts): streets, plaza, well,
// market stalls, crop fields, and every building — timber-framed houses
// with a stone base, glowing lattice windows, a chimney and a pitched roof,
// each with one or two furnished rooms inside — plus a town hall, tavern,
// chapel with a bell tower, barn, lamp posts, a footbridge over the stream
// and oak trees in whatever space is left. Later drawing overwrites earlier.
import { getBlockByKey } from "../../../data/blocks";
import { VILLAGE_CORE, VILLAGE_Y, AVENUE_X, AVENUE_Z, PLAZA, STREETS_Z, STREET_HALF, STREET_X, getVillageLayout, hash2, type Building, type Field, type Rect, type Stall } from "./layout";
import { VillagePlan } from "./plan";
import { riverCenterZ } from "./ground";

const id = (key: string): number => getBlockByKey(key).id;
const PLANK = id("plank");
const LOG = id("log");
const COBBLE = id("greystone");
const PLASTER = id("whitewash");
const GRAVEL = id("path_gravel");
const SOIL = id("farmland");
const LEAVES = id("leaves_green");
const WATER = id("water");
const WINDOW = id("ember_lattice");
const LAMP = id("ember_lamp");
const FLAME = id("brazier_flame");
const HAY = id("hay");
const BED = id("bed_red");
const BOOKSHELF = id("bookshelf");
const BARN_RED = id("barn_red");
const AWNING: Record<string, number> = { awning_red: id("awning_red"), awning_white: id("awning_white") };
const ROOF: Record<string, number> = { roof_tile: id("roof_tile"), shingle_brown: id("shingle_brown"), shingle_slate: id("shingle_slate") };
const CROP: Record<string, number> = {
  crop_wheat: id("crop_wheat"), crop_carrot: id("crop_carrot"), crop_cabbage: id("crop_cabbage"), crop_pumpkin: id("crop_pumpkin"), hay: HAY,
};
const G = VILLAGE_Y;

/** Height of one storey (floor slab to floor slab) for each kind of building. */
function levelHeight(b: Building): number {
  if (b.kind === "chapel" || b.kind === "barn") return 7;
  if (b.kind === "tavern") return 5;
  return 4;
}

function drawBuilding(plan: VillagePlan, b: Building): void {
  const W = b.x1 - b.x0 + 1;
  const D = b.z1 - b.z0 + 1;
  const F = b.floors;
  const H = levelHeight(b);
  const wx = (u: number): number => b.x0 + u;
  const wz = (v: number): number => (b.facing === "S" ? b.z1 - v : b.z0 + v);
  const put = (u: number, y: number, v: number, block: number): void => plan.set(wx(u), y, wz(v), block);
  const wallMat = b.kind === "barn" ? BARN_RED : b.wall === "plank" ? PLANK : PLASTER;
  const doorW = b.kind === "hall" || b.kind === "tavern" || b.kind === "barn" ? 3 : b.kind === "chapel" ? 2 : 1;
  const doorH = b.kind === "barn" ? 4 : b.kind === "hall" || b.kind === "chapel" ? 3 : 2;
  const doorLo = b.doorU - Math.floor((doorW - 1) / 2);
  const doorHi = doorLo + doorW - 1;
  const isDoor = (u: number, v: number, y: number): boolean => v === 0 && u >= doorLo && u <= doorHi && y <= G + doorH;
  const top = G + H * F;

  // Floor.
  for (let u = 0; u < W; u++) for (let v = 0; v < D; v++) put(u, G, v, PLANK);

  // Walls: cobble base, plaster/plank between log beams and posts.
  for (let u = 0; u < W; u++) {
    for (let v = 0; v < D; v++) {
      if (!(u === 0 || u === W - 1 || v === 0 || v === D - 1)) continue;
      const corner = (u === 0 || u === W - 1) && (v === 0 || v === D - 1);
      const post = corner || (u % 5 === 0 && (v === 0 || v === D - 1)) || (v % 5 === 0 && (u === 0 || u === W - 1));
      for (let y = G + 1; y <= top; y++) {
        if (isDoor(u, v, y)) continue;
        const rel = y - G;
        let block = wallMat;
        if (rel === 1) block = COBBLE;
        else if (rel % H === 0) block = LOG;
        else if (post) block = LOG;
        put(u, y, v, block);
      }
    }
  }
  // Door frame.
  for (let y = G + 1; y <= G + doorH; y++) {
    put(doorLo - 1, y, 0, LOG);
    put(doorHi + 1, y, 0, LOG);
  }
  for (let u = doorLo - 1; u <= doorHi + 1; u++) put(u, G + doorH + 1, 0, LOG);
  // A path from the door out to the street.
  for (let u = doorLo; u <= doorHi; u++) {
    put(u, G, -1, GRAVEL);
    put(u, G, -2, GRAVEL);
  }

  // Storeys: a plank floor slab (with a stairwell in the hall) over each.
  for (let k = 1; k <= F; k++) {
    const y = G + H * k;
    for (let u = 1; u < W - 1; u++) {
      for (let v = 1; v < D - 1; v++) {
        if (F === 2 && k === 1 && u >= 1 && u <= 3 && v >= D - 3 && v <= D - 2) continue; // stairwell
        put(u, y, v, PLANK);
      }
    }
  }
  if (F === 2) {
    // Stairs up along the back wall, one block higher per step.
    for (let i = 0; i < 4; i++) put(1 + i, G + 1 + i, D - 2, PLANK);
    for (let i = 0; i < 3; i++) put(1 + i, G + 1 + i, D - 3, PLANK);
  }

  // Windows (glowing amber lattice), on every side and every storey.
  const windowSpan = H >= 6 ? 3 : 2;
  const windows = (u: number, v: number, k: number): void => {
    if (b.kind === "barn") return;
    const y0 = G + H * (k - 1) + 2;
    for (let dy = 0; dy < windowSpan; dy++) put(u, y0 + dy, v, WINDOW);
  };
  for (let k = 1; k <= F; k++) {
    const front = k === 1 ? [doorLo - 3, doorHi + 3] : [2, Math.floor(W / 2), W - 3];
    for (const u of front) if (u > 1 && u < W - 2 && (k > 1 || u < doorLo - 1 || u > doorHi + 1)) windows(u, 0, k);
    for (const u of [3, Math.floor(W / 2), W - 4]) if (u > 1 && u < W - 2) windows(u, D - 1, k);
    for (const v of [Math.floor(D / 2)]) {
      windows(0, v, k);
      windows(W - 1, v, k);
    }
  }
  if (b.kind === "barn") {
    // A hayloft window under each gable instead.
    windows(0, 0, 1);
  }

  // Roof: stepped pitched layers with a one-block overhang, gable ends filled in.
  const roofMat = b.kind === "barn" ? ROOF.shingle_brown : ROOF[b.roof];
  const y0r = top + 1;
  let ridge = 0;
  for (let k = 0; ; k++) {
    const vlo = -1 + k;
    const vhi = D - k;
    if (vlo > vhi) break;
    const y = y0r + k;
    ridge = k;
    for (let u = -1; u <= W; u++) {
      put(u, y, vlo, roofMat);
      put(u, y, vhi, roofMat);
    }
    for (let v = vlo + 1; v <= vhi - 1; v++) {
      put(0, y, v, wallMat);
      put(W - 1, y, v, wallMat);
    }
  }

  // Interior partition (two rooms) with a doorway.
  const v0 = Math.round(D * 0.55);
  const roomFront = { v0: 1, v1: b.rooms === 2 ? v0 - 1 : D - 2 };
  const roomBack = b.rooms === 2 ? { v0: v0 + 1, v1: D - 2 } : roomFront;
  if (b.rooms === 2) {
    const passage = Math.min(W - 3, Math.max(2, b.chimney === "E" ? W - 4 : 3));
    for (let u = 1; u < W - 1; u++) {
      for (let y = G + 1; y < G + H; y++) {
        if (u >= passage && u <= passage + (b.kind === "tavern" || b.kind === "hall" ? 1 : 0) && y <= G + 2) continue;
        put(u, y, v0, y === G + 3 && b.kind !== "chapel" ? LOG : PLANK);
      }
    }
  }

  // Chimney + fireplace.
  if (b.chimney) {
    const cu = b.chimney === "E" ? W - 1 : 0;
    const hu = b.chimney === "E" ? W - 2 : 1;
    const vc = Math.min(roomFront.v1 - 1, 3);
    const chimneyTop = y0r + Math.min(vc + 1, ridge) + 2;
    for (let y = G + 1; y <= chimneyTop; y++) {
      put(cu, y, vc, COBBLE);
      put(cu, y, vc + 1, COBBLE);
    }
    put(hu, G + 1, vc, COBBLE);
    put(hu, G + 1, vc + 1, COBBLE);
    put(hu, G + 2, vc, FLAME);
    put(hu, G + 2, vc + 1, FLAME);
  }

  // Furnishings.
  const lampY = G + H - 1;
  const lightRoom = (r: { v0: number; v1: number }): void => put(Math.floor(W / 2), lampY, Math.floor((r.v0 + r.v1) / 2), LAMP);
  const tableU = b.chimney === "E" ? 2 : W - 4;
  const bedU = b.chimney === "E" ? 1 : W - 2;
  if (b.kind === "house") {
    lightRoom(roomFront);
    if (b.rooms === 2) lightRoom(roomBack);
    // Table and stools in the front room.
    put(tableU, G + 1, 2, PLANK);
    put(tableU + 1, G + 1, 2, PLANK);
    put(tableU, G + 1, 4, HAY);
    // Bookshelf, bed and a crate in the back room.
    const bv = roomBack.v1;
    put(Math.floor(W / 2) - 1, G + 1, bv, BOOKSHELF);
    put(Math.floor(W / 2) - 1, G + 2, bv, BOOKSHELF);
    put(Math.floor(W / 2), G + 1, bv, BOOKSHELF);
    put(Math.floor(W / 2), G + 2, bv, BOOKSHELF);
    put(bedU, G + 1, bv, BED);
    put(bedU, G + 1, bv - 1, BED);
    if (b.rooms === 2 || W >= 12) {
      put(bedU + (b.chimney === "E" ? 1 : -1), G + 1, bv, BED);
      put(bedU + (b.chimney === "E" ? 1 : -1), G + 1, bv - 1, BED);
    }
    put(W - 2 - (b.chimney === "E" ? 0 : W - 4), G + 1, roomFront.v1, PLANK);
  } else if (b.kind === "tavern") {
    for (const v of [2, 4]) put(Math.floor(W / 2), G + H - 1, v, LAMP);
    // Long tables with hay-bale seats in the taproom.
    for (const v of [2, 4]) {
      for (let u = 3; u <= W - 5; u++) if (u % 5 !== 0 || v !== 4) put(u, G + 1, v, PLANK);
      for (let u = 3; u <= W - 5; u += 2) {
        put(u, G + 1, v - 1, HAY);
        put(u, G + 1, v + 1, HAY);
      }
    }
    // Bar along the partition and barrels in the kitchen.
    for (let u = 2; u <= 5; u++) put(u, G + 1, v0 - 1, PLANK);
    for (let u = 2; u <= W - 3; u += 3) put(u, G + 1, D - 2, PLANK);
    put(3, G + 1, D - 3, BED);
    put(3, G + 1, D - 4, BED);
    lightRoom(roomBack);
  } else if (b.kind === "hall") {
    for (const v of [3, 6]) put(Math.floor(W / 2), G + H - 1, v, LAMP);
    // A council table down the middle of the great hall, benches either side.
    for (let u = 5; u <= W - 6; u++) {
      put(u, G + 1, 4, PLANK);
      put(u, G + 1, 3, HAY);
      put(u, G + 1, 5, HAY);
    }
    for (let u = 6; u <= W - 7; u += 2) for (const dy of [1, 2, 3]) put(u, G + dy, D - 2, BOOKSHELF);
    lightRoom(roomBack);
    // Upstairs: a long gallery of shelves, beds and lamps.
    const up = G + H;
    for (let u = 6; u <= W - 3; u += 2) {
      put(u, up + 1, D - 2, BOOKSHELF);
      put(u, up + 2, D - 2, BOOKSHELF);
    }
    for (let u = 5; u <= W - 5; u += 4) {
      put(u, up + 1, 2, BED);
      put(u, up + 1, 3, BED);
    }
    for (let u = 4; u <= W - 4; u += 5) put(u, up + H - 1, Math.floor(D / 2), LAMP);
  } else if (b.kind === "chapel") {
    // Pews in two blocks down the nave, an altar with candles at the far end, and a lamp-lit chancel.
    for (let v = 3; v <= D - 4; v += 2) {
      for (const u0 of [2, W - 6]) for (let u = u0; u < u0 + 4; u++) put(u, G + 1, v, PLANK);
    }
    for (let u = Math.floor(W / 2) - 1; u <= Math.floor(W / 2) + 1; u++) {
      put(u, G + 1, D - 2, PLASTER);
      put(u, G + 1, D - 3, PLASTER);
    }
    put(Math.floor(W / 2), G + 2, D - 2, LAMP);
    for (let u = 3; u <= W - 4; u += 4) put(u, G + H - 2, 4, LAMP);
  } else if (b.kind === "barn") {
    // Hay stacks in the corners and along the back, a few crates.
    for (const [u, v, h] of [[1, D - 2, 3], [2, D - 2, 2], [1, D - 3, 2], [W - 2, D - 2, 3], [W - 3, D - 2, 2], [W - 2, D - 3, 2], [Math.floor(W / 2), D - 2, 2], [Math.floor(W / 2) + 1, D - 2, 1]] as [number, number, number][]) {
      for (let dy = 1; dy <= h; dy++) put(u, G + dy, v, HAY);
    }
    for (const u of [4, W - 5]) put(u, G + 1, 3, PLANK);
    put(Math.floor(W / 2), lampHeight(H), 4, LAMP);
  }

  // A shrub either side of the front door, and a lamp by it.
  put(doorLo - 2, G + 1, -1, LEAVES);
  put(doorHi + 2, G + 1, -1, LEAVES);
  put(doorHi + 2, G + 3, 0, LAMP);
}

function lampHeight(h: number): number {
  return VILLAGE_Y + h - 1;
}

/** The bell tower beside the chapel: a tall whitewashed shaft with an open belfry and a pyramid roof. */
function drawTower(plan: VillagePlan, chapel: Building): void {
  const x1 = chapel.x0 - 1;
  const x0 = x1 - 4;
  const z0 = chapel.z0;
  const z1 = z0 + 4;
  const topWall = G + 16;
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      plan.set(x, G, z, PLANK);
      const edge = x === x0 || x === x1 || z === z0 || z === z1;
      if (!edge) continue;
      const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
      for (let y = G + 1; y <= topWall; y++) {
        const rel = y - G;
        plan.set(x, y, z, rel === 1 ? COBBLE : corner || rel % 5 === 0 ? LOG : PLASTER);
      }
    }
  }
  // Louvred belfry openings and a slit window lower down.
  const cx = Math.floor((x0 + x1) / 2);
  const cz = Math.floor((z0 + z1) / 2);
  for (let y = G + 12; y <= G + 14; y++) {
    for (const [x, z] of [[cx, z0], [cx, z1], [x0, cz], [x1, cz]]) plan.set(x, y, z, WINDOW);
  }
  for (const [x, z] of [[cx, z0], [cx, z1], [x0, cz]]) for (let y = G + 5; y <= G + 6; y++) plan.set(x, y, z, WINDOW);
  plan.set(cx, G + 12, cz, id("gilded_trim")); // the bell
  plan.set(cx, G + 11, cz, LOG);
  // Pyramid roof.
  for (let k = 0; k < 4; k++) {
    for (let x = x0 - 1 + k; x <= x1 + 1 - k; x++) {
      for (let z = z0 - 1 + k; z <= z1 + 1 - k; z++) {
        const edge = x === x0 - 1 + k || x === x1 + 1 - k || z === z0 - 1 + k || z === z1 + 1 - k;
        if (edge || k === 3) plan.set(x, topWall + 1 + k, z, ROOF.shingle_slate);
      }
    }
  }
  plan.set(cx, topWall + 5, cz, ROOF.shingle_slate);
  plan.set(cx, topWall + 6, cz, LOG);
  // A doorway from the churchyard.
  plan.set(cx, G + 1, z1, 0);
  plan.set(cx, G + 2, z1, 0);
}

function drawStreets(plan: VillagePlan): void {
  for (const sz of STREETS_Z) {
    for (let x = STREET_X.min; x <= STREET_X.max; x++) for (let z = sz - STREET_HALF; z <= sz + STREET_HALF; z++) plan.set(x, G, z, GRAVEL);
  }
  for (let z = AVENUE_Z.min; z <= AVENUE_Z.max; z++) for (let x = AVENUE_X - STREET_HALF; x <= AVENUE_X + STREET_HALF; x++) plan.set(x, G, z, GRAVEL);
}

function drawPlaza(plan: VillagePlan): void {
  const r = PLAZA.radius;
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > r) continue;
      const cobble = d < r - 1 && (dx + dz) % 2 === 0 && d > 2.5;
      plan.set(PLAZA.x + dx, G, PLAZA.z + dz, cobble ? COBBLE : GRAVEL);
    }
  }
  // The well: a stone rim round a shaft of water, four posts and a little roof.
  const cx = PLAZA.x;
  const cz = PLAZA.z;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) {
        for (let y = G - 3; y <= G; y++) plan.set(cx, y, cz, WATER);
      } else {
        plan.set(cx + dx, G, cz + dz, COBBLE);
        plan.set(cx + dx, G + 1, cz + dz, COBBLE);
      }
    }
  }
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let y = G + 1; y <= G + 4; y++) plan.set(cx + dx, y, cz + dz, LOG);
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) plan.set(cx + dx, G + 5, cz + dz, ROOF.shingle_brown);
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) plan.set(cx + dx, G + 6, cz + dz, ROOF.shingle_brown);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) plan.set(cx + dx, G + 7, cz + dz, ROOF.shingle_brown);
  plan.set(cx, G + 4, cz, LAMP);
}

function drawStall(plan: VillagePlan, s: Stall): void {
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let y = G + 1; y <= G + 3; y++) plan.set(s.x + dx, y, s.z + dz, LOG);
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const stripe = (dx + 2 + dz + 2) % 2 === 0 ? AWNING[s.awning] : AWNING.awning_white;
      plan.set(s.x + dx, G + 4, s.z + dz, stripe);
    }
  }
  plan.set(s.x, G + 1, s.z, PLANK);
  plan.set(s.x, G + 2, s.z, CROP[s.goods]);
  plan.set(s.x - 1, G + 1, s.z, CROP[s.goods]);
  plan.set(s.x + 1, G + 1, s.z, CROP[s.goods]);
}

function drawField(plan: VillagePlan, f: Field): void {
  for (let x = f.x0; x <= f.x1; x++) {
    for (let z = f.z0; z <= f.z1; z++) {
      plan.set(x, G, z, SOIL);
      if ((z - f.z0) % 2 === 0 && x > f.x0 - 1) plan.set(x, G + 1, z, CROP[f.crop]);
    }
  }
  // A log fence round the plot, open in the middle of the north side; a scarecrow in the middle.
  const gap = Math.floor((f.x0 + f.x1) / 2);
  for (let x = f.x0 - 1; x <= f.x1 + 1; x++) {
    for (const z of [f.z0 - 1, f.z1 + 1]) if ((x - f.x0) % 2 === 0 && !(z === f.z0 - 1 && Math.abs(x - gap) <= 1)) plan.set(x, G + 1, z, LOG);
  }
  for (let z = f.z0; z <= f.z1; z += 2) for (const x of [f.x0 - 1, f.x1 + 1]) plan.set(x, G + 1, z, LOG);
  const cz = Math.floor((f.z0 + f.z1) / 2);
  plan.set(gap, G + 1, cz, LOG);
  plan.set(gap, G + 2, cz, LOG);
  plan.set(gap, G + 3, cz, HAY);
}

function drawLampPost(plan: VillagePlan, x: number, z: number): void {
  plan.set(x, G, z, COBBLE);
  for (let y = G + 1; y <= G + 3; y++) plan.set(x, y, z, LOG);
  plan.set(x, G + 4, z, LAMP);
}

function drawBench(plan: VillagePlan, x: number, z: number, along: "x" | "z"): void {
  for (let i = -1; i <= 1; i++) plan.set(along === "x" ? x + i : x, G + 1, along === "x" ? z : z + i, PLANK);
}

function drawFootbridge(plan: VillagePlan): void {
  const c = Math.round(riverCenterZ(AVENUE_X));
  for (let z = c - 7; z <= c + 7; z++) {
    for (let x = AVENUE_X - 2; x <= AVENUE_X + 2; x++) plan.set(x, G, z, PLANK);
    if ((z - c) % 2 === 0) for (const x of [AVENUE_X - 2, AVENUE_X + 2]) plan.set(x, G + 1, z, LOG);
  }
}

function drawOak(plan: VillagePlan, x: number, z: number, seed: number): void {
  const height = 4 + Math.floor(hash2(seed, 21) * 3);
  for (let y = 1; y <= height; y++) plan.set(x, G + y, z, LOG);
  const base = G + height - 1;
  for (let dy = 0; dy <= 3; dy++) {
    const r = dy === 0 ? 2 : dy === 1 ? 2 : dy === 2 ? 1 : 1;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r && r > 1 && hash2(x * 7 + dx, z * 5 + dz + dy) < 0.5) continue;
        if (dy === 3 && Math.abs(dx) + Math.abs(dz) > 1) continue;
        plan.setIfUnset(x + dx, base + dy, z + dz, LEAVES);
      }
    }
  }
}

function expand(r: Rect, m: number): Rect {
  return { x0: r.x0 - m, x1: r.x1 + m, z0: r.z0 - m, z1: r.z1 + m };
}

function buildPlan(): VillagePlan {
  const plan = new VillagePlan();
  const layout = getVillageLayout();

  drawStreets(plan);
  drawPlaza(plan);
  for (const f of layout.fields) drawField(plan, f);
  for (const b of layout.buildings) drawBuilding(plan, b);
  drawTower(plan, layout.chapel);
  for (const s of layout.stalls) drawStall(plan, s);
  for (const b of layout.benches) drawBench(plan, b.x, b.z, b.along);
  for (const l of layout.lamps) drawLampPost(plan, l.x, l.z);
  drawFootbridge(plan);

  // Trees fill the gaps: on a jittered grid, wherever nothing else stands.
  const blocked: Rect[] = [
    ...layout.buildings.map((b) => expand(b, 2)),
    ...layout.fields.map((f) => expand(f, 2)),
    ...layout.reserved,
    ...STREETS_Z.map((sz) => ({ x0: STREET_X.min - 2, x1: STREET_X.max + 2, z0: sz - STREET_HALF - 2, z1: sz + STREET_HALF + 2 })),
    { x0: AVENUE_X - 4, x1: AVENUE_X + 4, z0: AVENUE_Z.min, z1: AVENUE_Z.max },
    { x0: PLAZA.x - PLAZA.radius - 3, x1: PLAZA.x + PLAZA.radius + 3, z0: PLAZA.z - PLAZA.radius - 3, z1: PLAZA.z + PLAZA.radius + 3 },
  ];
  const free = (x: number, z: number): boolean => !blocked.some((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
  const placed: { x: number; z: number }[] = [];
  for (let gx = VILLAGE_CORE.minX + 3; gx < VILLAGE_CORE.maxX - 3; gx += 5) {
    for (let gz = VILLAGE_CORE.minZ + 3; gz < 236; gz += 5) {
      const seed = gx * 131 + gz;
      const x = gx + Math.floor(hash2(seed, 31) * 4);
      const z = gz + Math.floor(hash2(seed, 32) * 4);
      if (hash2(seed, 33) > 0.66) continue;
      if (!free(x, z) || !free(x - 2, z - 2) || !free(x + 2, z + 2) || !free(x - 2, z + 2) || !free(x + 2, z - 2)) continue;
      if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < 5)) continue;
      placed.push({ x, z });
      drawOak(plan, x, z, seed);
    }
  }
  return plan;
}

let cachedPlan: VillagePlan | null = null;

/** The village plan, built once per thread. */
export function getVillagePlan(): VillagePlan {
  if (!cachedPlan) cachedPlan = buildPlan();
  return cachedPlan;
}
