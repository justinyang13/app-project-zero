// The village: a fixed, hand-planned layout (identical in every world) on a
// flattened stretch of meadow south of the castle — three cobbled-gravel
// streets and a cross avenue meeting at a market plaza with a well, ~30
// houses of varying size (each one or two furnished rooms), a town hall, a
// tavern, a chapel with a bell tower, a barn, crop fields, and a stream
// running along the south edge (see ground.ts). Everything here is a pure
// function of nothing but fixed constants and a small integer hash, so the
// meshing workers, terrain generation and the maps all agree without
// sharing state.
//
// Coordinates are world (x, z). Buildings are described by their footprint
// (walls included) and the side their door faces; build.ts draws them.

/** World Y of the village's ground (the surface block); floors sit at this Y and you stand one above. */
export const VILLAGE_Y = 68;

/** The flattened rectangle everything stands on (inclusive); terrain eases back to natural over VILLAGE_FADE blocks outside it. */
export const VILLAGE_CORE = { minX: -52, maxX: 108, minZ: 122, maxZ: 252 };
export const VILLAGE_FADE = 24;

export const VILLAGE_CENTER = { x: 28, z: 186 };

export const PLAZA = { x: 30, z: 180, radius: 12 };
export const AVENUE_X = 30;
export const STREETS_Z = [146, 180, 214];
export const STREET_HALF = 3; // streets are 7 wide
export const STREET_X = { min: -48, max: 104 };
export const AVENUE_Z = { min: 126, max: 242 };

export type Facing = "N" | "S";
export type RoofKind = "roof_tile" | "shingle_brown" | "shingle_slate";
export type WallKind = "whitewash" | "plank";

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface Building extends Rect {
  kind: "house" | "hall" | "tavern" | "chapel" | "barn";
  /** Which side of the footprint the front door is on: "S" = the max-z wall, "N" = the min-z wall. */
  facing: Facing;
  floors: 1 | 2;
  rooms: 1 | 2;
  roof: RoofKind;
  wall: WallKind;
  /** Which end wall the chimney stands on, if any. */
  chimney: "E" | "W" | null;
  /** Position of the door along the front wall, counted from the west end. */
  doorU: number;
  index: number;
}

export interface Field extends Rect {
  crop: "crop_wheat" | "crop_carrot" | "crop_cabbage" | "crop_pumpkin";
}

export interface Stall {
  x: number;
  z: number;
  awning: "awning_red" | "awning_white";
  goods: "hay" | "crop_pumpkin" | "crop_carrot" | "crop_cabbage";
}

export interface VillageLayout {
  houses: Building[];
  hall: Building;
  tavern: Building;
  chapel: Building;
  barn: Building;
  /** All buildings, specials first. */
  buildings: Building[];
  fields: Field[];
  stalls: Stall[];
  benches: { x: number; z: number; along: "x" | "z" }[];
  lamps: { x: number; z: number }[];
  /** Areas nothing else (trees, houses) may be placed on. */
  reserved: Rect[];
}

/** Small deterministic hash in [0, 1) of (a, b) — no Math.random anywhere, so the village is identical every visit. */
export function hash2(a: number, b: number): number {
  let h = (Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function overlaps(a: Rect, b: Rect, margin = 0): boolean {
  return a.x0 - margin <= b.x1 && a.x1 + margin >= b.x0 && a.z0 - margin <= b.z1 && a.z1 + margin >= b.z0;
}

const ROOFS: RoofKind[] = ["roof_tile", "shingle_brown", "shingle_slate", "shingle_brown"];

let cached: VillageLayout | null = null;

export function getVillageLayout(): VillageLayout {
  if (cached) return cached;

  const hall: Building = {
    kind: "hall", x0: 20, x1: 40, z0: 152, z1: 164, facing: "S", floors: 2, rooms: 2,
    roof: "shingle_slate", wall: "whitewash", chimney: null, doorU: 10, index: 0,
  };
  const tavern: Building = {
    kind: "tavern", x0: 22, x1: 38, z0: 197, z1: 207, facing: "N", floors: 1, rooms: 2,
    roof: "shingle_brown", wall: "plank", chimney: "E", doorU: 8, index: 1,
  };
  const chapel: Building = {
    kind: "chapel", x0: -38, x1: -24, z0: 133, z1: 141, facing: "S", floors: 1, rooms: 1,
    roof: "shingle_slate", wall: "whitewash", chimney: null, doorU: 7, index: 2,
  };
  const barn: Building = {
    kind: "barn", x0: 80, x1: 95, z0: 222, z1: 232, facing: "N", floors: 1, rooms: 1,
    roof: "shingle_brown", wall: "plank", chimney: null, doorU: 8, index: 3,
  };
  const specials = [hall, tavern, chapel, barn];

  const plazaRect: Rect = {
    x0: PLAZA.x - PLAZA.radius - 2, x1: PLAZA.x + PLAZA.radius + 2, z0: PLAZA.z - PLAZA.radius - 2, z1: PLAZA.z + PLAZA.radius + 2,
  };
  const chapelTower: Rect = { x0: chapel.x0 - 8, x1: chapel.x0 - 1, z0: chapel.z0 - 1, z1: chapel.z0 + 6 };

  const fields: Field[] = [];
  const crops: Field["crop"][] = ["crop_wheat", "crop_carrot", "crop_cabbage", "crop_pumpkin", "crop_wheat"];
  [-42, -29, -16, -3, 10, 37, 50, 63].forEach((x0, i) => {
    fields.push({ x0, x1: x0 + 10, z0: 220, z1: 229, crop: crops[i % crops.length] });
  });

  const reserved: Rect[] = [
    plazaRect,
    { x0: hall.x0 - 3, x1: hall.x1 + 3, z0: hall.z0 - 3, z1: hall.z1 + 3 },
    { x0: tavern.x0 - 3, x1: tavern.x1 + 3, z0: tavern.z0 - 3, z1: tavern.z1 + 3 },
    { x0: chapel.x0 - 3, x1: chapel.x1 + 3, z0: chapel.z0 - 3, z1: chapel.z1 + 3 },
    chapelTower,
    { x0: barn.x0 - 3, x1: barn.x1 + 3, z0: barn.z0 - 3, z1: barn.z1 + 3 },
    { x0: AVENUE_X - 4, x1: AVENUE_X + 4, z0: AVENUE_Z.min, z1: AVENUE_Z.max }, // the avenue
    ...fields.map((f) => ({ x0: f.x0 - 1, x1: f.x1 + 1, z0: f.z0 - 1, z1: f.z1 + 1 })),
  ];

  // Rows of houses along each street, both sides; a house's front door faces the street.
  const rows: { street: number; side: Facing }[] = [
    { street: STREETS_Z[0], side: "S" }, // north of the north street, door facing south
    { street: STREETS_Z[0], side: "N" }, // south of it, door facing north
    { street: STREETS_Z[1], side: "S" },
    { street: STREETS_Z[1], side: "N" },
    { street: STREETS_Z[2], side: "S" },
  ];
  const houses: Building[] = [];
  let index = 10;
  rows.forEach((row, r) => {
    let x = -46 + ((r * 5) % 9);
    while (x < 88) {
      index++;
      const w = 10 + Math.floor(hash2(index, 1) * 4); // 10-13 wide
      const d = 9 + Math.floor(hash2(index, 2) * 3); // 9-11 deep
      const z1 = row.side === "S" ? row.street - (STREET_HALF + 2) : row.street + (STREET_HALF + 2) + d - 1;
      const z0 = z1 - d + 1;
      const rect: Rect = { x0: x, x1: x + w - 1, z0, z1 };
      const gap = 5 + Math.floor(hash2(index, 3) * 4);
      if (rect.x1 > 100 || reserved.some((res) => overlaps(rect, res, 1))) {
        x += 4;
        continue;
      }
      if (hash2(index, 4) < 0.1) {
        x += w + gap; // a gap left for a garden
        continue;
      }
      const rooms: 1 | 2 = w >= 12 || hash2(index, 5) < 0.45 ? 2 : 1;
      houses.push({
        ...rect,
        kind: "house",
        facing: row.side,
        floors: 1,
        rooms,
        roof: ROOFS[Math.floor(hash2(index, 6) * ROOFS.length)],
        wall: hash2(index, 7) < 0.62 ? "whitewash" : "plank",
        chimney: hash2(index, 8) < 0.5 ? "E" : "W",
        doorU: Math.floor(w / 2) - (hash2(index, 9) < 0.5 ? 1 : 0),
        index,
      });
      x += w + gap;
    }
  });

  // Market stalls ringed round the plaza.
  const stalls: Stall[] = [];
  const awnings: Stall["awning"][] = ["awning_red", "awning_white"];
  const goods: Stall["goods"][] = ["hay", "crop_pumpkin", "crop_carrot", "crop_cabbage", "crop_pumpkin", "hay"];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
    stalls.push({
      x: Math.round(PLAZA.x + Math.cos(angle) * 8.5),
      z: Math.round(PLAZA.z + Math.sin(angle) * 8.5),
      awning: awnings[i % 2],
      goods: goods[i],
    });
  }

  const benches = [
    { x: PLAZA.x - 4, z: PLAZA.z - 3, along: "x" as const },
    { x: PLAZA.x + 4, z: PLAZA.z + 3, along: "x" as const },
    { x: PLAZA.x - 3, z: PLAZA.z + 4, along: "z" as const },
    { x: PLAZA.x + 3, z: PLAZA.z - 4, along: "z" as const },
  ];

  // Lamp posts along the streets, every 13 blocks, alternating sides.
  const lamps: { x: number; z: number }[] = [];
  STREETS_Z.forEach((sz, si) => {
    for (let x = STREET_X.min + 6, k = 0; x <= STREET_X.max - 4; x += 13, k++) {
      if (Math.abs(x - AVENUE_X) < 5) continue;
      if (Math.hypot(x - PLAZA.x, sz - PLAZA.z) < PLAZA.radius + 2) continue;
      lamps.push({ x, z: (k + si) % 2 === 0 ? sz - STREET_HALF - 1 : sz + STREET_HALF + 1 });
    }
  });
  for (let z = AVENUE_Z.min + 8, k = 0; z <= AVENUE_Z.max - 6; z += 13, k++) {
    if (STREETS_Z.some((sz) => Math.abs(z - sz) < 5) || Math.abs(z - PLAZA.z) < PLAZA.radius + 2) continue;
    lamps.push({ x: AVENUE_X + (k % 2 === 0 ? -1 : 1) * (STREET_HALF + 1), z });
  }

  cached = { houses, hall, tavern, chapel, barn, buildings: [...specials, ...houses], fields, stalls, benches, lamps, reserved };
  return cached;
}
