// The ice castle's secret passageways, hidden inside its thick walls and the
// glacier it stands on. Every concealed door is a "loose" block — one that
// looks like its neighbours (frost brick with one faint etched snowflake, or a
// library bookshelf that is a hair too easy to pull out) but gives way to a
// bare hand. Three routes, all dark and lit only by a lantern here and there:
//
//   1. The great hall's north wall -> a long corridor under the keep -> a
//      spiral stair up inside the north-west tower -> a little study -> out
//      behind a loose bookcase into the library.
//   2. The feast hall's hearth -> a hidden stair running west under the keep
//      -> the treasury vault.
//   3. The vault's west wall -> a corridor and a long stair down into the
//      glacier -> the ice grotto, a cavern of blue ice, crystals and icicles
//      with a frozen relic on a pedestal at its heart.
import { h3 } from "./builder";
import type { IceBuilder } from "./builder";
import { AIR, B } from "./ids";

// Route 1 geometry.
const HALL_SECRET_X = -11;
const CORRIDOR_Z = -32;
const TOWER_CX = -33;
const TOWER_CZ = -31;
/** The eight cells of the spiral's ring, clockwise from the corridor's end (dx, dz relative to the tower's centre column). */
const RING: [number, number][] = [[1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]];
const SPIRAL_STEPS = 14; // treads at y = 0..13, standing y = 1..14
const STUDY_PASSAGE_X = -34;

// Route 2/3 geometry.
const HEARTH_X = [28, 29];
const VAULT = { x0: 6, x1: 15, z0: -31, z1: -28, y0: 2, y1: 7 };
const GROTTO = { cx: -25, cy: -8, cz: -28, rx: 12, ry: 6, rz: 9, floorY: -13 };

function lanternAt(b: IceBuilder, x: number, y: number, z: number): void {
  b.p.set(x, y, z, B.LANTERN);
}

function buildHallRoute(b: IceBuilder): void {
  const p = b.p;
  // The hidden door: two loose bricks at the foot of the hall's north wall, between the pillars.
  p.box(HALL_SECRET_X, 1, -27, HALL_SECRET_X, 2, -27, B.LOOSE_BRICK);
  // North behind it, then west along the corridor to the tower.
  p.box(HALL_SECRET_X, 1, CORRIDOR_Z, HALL_SECRET_X, 4, -28, AIR);
  p.box(TOWER_CX - 2, 1, CORRIDOR_Z, HALL_SECRET_X, 4, CORRIDOR_Z, AIR);
  for (let x = HALL_SECRET_X - 3; x >= TOWER_CX + 2; x -= 6) lanternAt(b, x, 4, CORRIDOR_Z);
  p.box(HALL_SECRET_X, 1, CORRIDOR_Z - 1, HALL_SECRET_X, 1, CORRIDOR_Z - 1, B.POLISHED);

  // The spiral stair round the tower's centre column: treads at y = 0..13, a stairwell three high above each.
  p.box(TOWER_CX, 1, TOWER_CZ, TOWER_CX, 19, TOWER_CZ, B.COLUMN);
  for (let n = 0; n < SPIRAL_STEPS; n++) {
    const [dx, dz] = RING[n % 8];
    const x = TOWER_CX + dx;
    const z = TOWER_CZ + dz;
    p.set(x, n, z, B.POLISHED);
    p.box(x, n + 1, z, x, n + 3, z, AIR);
  }
  // The study at the top: the whole ring open from y = 14 to 19, lit by lanterns set into the walls.
  for (const [dx, dz] of RING) p.box(TOWER_CX + dx, 14, TOWER_CZ + dz, TOWER_CX + dx, 19, TOWER_CZ + dz, AIR);
  for (const y of [7, 15]) lanternAt(b, TOWER_CX - 2, y, TOWER_CZ);
  for (const y of [3, 11, 16]) lanternAt(b, TOWER_CX + 2, y, TOWER_CZ);
  p.set(TOWER_CX - 1, 14, TOWER_CZ - 1, B.SHELF); // a little desk of books
  p.set(TOWER_CX - 1, 15, TOWER_CZ - 1, B.SHELF);

  // Out through the tower's south wall and the library's two-thick north wall, ending behind a loose bookcase.
  p.box(STUDY_PASSAGE_X, 14, TOWER_CZ + 1, STUDY_PASSAGE_X, 16, -27, AIR);
  p.box(STUDY_PASSAGE_X, 14, -26, STUDY_PASSAGE_X, 15, -26, B.SHELF_LOOSE);
  lanternAt(b, STUDY_PASSAGE_X, 16, -29);
}

function buildVaultRoute(b: IceBuilder): void {
  const p = b.p;
  // The hearth's back: loose bricks behind the flames, and a pocket in the wall beyond.
  for (const x of HEARTH_X) {
    p.box(x, 14, -27, x, 15, -27, B.LOOSE_BRICK);
    p.box(x, 14, -28, x, 16, -28, AIR);
  }
  lanternAt(b, 28, 16, -29);
  // A narrow stair west under the keep, twelve steps down to the vault.
  b.stairRun(27, -28, -1, 0, 0, 13, 12, 3, B.POLISHED, -1);
  for (const i of [2, 6, 10]) lanternAt(b, 27 - i, 14 - i, -29);

  // The treasury: carved from the base's mass, lined with shelves, a pedestal and a gilded hoard.
  const v = VAULT;
  p.box(v.x0, v.y0, v.z0, v.x1, v.y1, v.z1, AIR);
  p.box(v.x0, v.y0 - 1, v.z0, v.x1, v.y0 - 1, v.z1, (x, _y, z) => (((x >> 1) + (z >> 1)) & 1 ? B.FLOOR_LIGHT : B.FLOOR_DARK));
  p.box(v.x0 + 1, v.y0 - 1, -30, v.x1, v.y0 - 1, -29, B.CARPET);
  for (let x = v.x0 + 1; x <= v.x1 - 1; x++) p.box(x, v.y0, v.z0, x, v.y0 + 2, v.z0, B.SHELF);
  p.box(10, v.y0, -30, 11, v.y0 + 1, -29, B.COLUMN);
  p.box(10, v.y0 + 2, -30, 11, v.y0 + 2, -29, B.POLISHED);
  p.set(10, v.y0 + 3, -30, B.CRYSTAL);
  p.set(11, v.y0 + 3, -29, B.GILDED);
  p.set(10, v.y0 + 3, -29, B.GILDED);
  p.set(11, v.y0 + 3, -30, B.CRYSTAL);
  for (const [x, z] of [[v.x0, -28], [v.x0, v.z0], [v.x1, v.z0]] as const) b.lampPost(x, v.y0, z, 2);
  for (const [x, z, h] of [[7, -29, 2], [8, -29, 1], [14, -30, 2], [14, -29, 1]] as const) p.box(x, v.y0, z, x, v.y0 + h - 1, z, B.GILDED);
  lanternAt(b, 10, v.y1, -29);
  lanternAt(b, 13, v.y1, -29);
}

function buildGrottoRoute(b: IceBuilder): void {
  const p = b.p;
  // The vault's west wall hides the way down.
  p.box(5, 2, -30, 5, 3, -30, B.LOOSE_BRICK);
  p.box(-4, 2, -30, 4, 4, -30, AIR);
  for (const x of [2, -2]) lanternAt(b, x, 4, -30);

  // The grotto: an ellipsoid cavern, lined in ice, its floor levelled, hung with icicles and studded with crystals.
  const g = GROTTO;
  const norm = (x: number, y: number, z: number): number => ((x - g.cx) / g.rx) ** 2 + ((y - g.cy) / g.ry) ** 2 + ((z - g.cz) / g.rz) ** 2;
  const lining = (x: number, y: number, z: number): number => {
    const r = h3(x, y, z, 77);
    return r < 0.5 ? B.PACKED_ICE : r < 0.84 ? B.BLUE_ICE : r < 0.92 ? B.CRYSTAL : B.ROCK;
  };
  for (let y = g.cy - g.ry - 2; y <= g.cy + g.ry + 2; y++) {
    for (let z = g.cz - g.rz - 2; z <= g.cz + g.rz + 2; z++) {
      for (let x = g.cx - g.rx - 2; x <= g.cx + g.rx + 2; x++) {
        const d = norm(x, y, z);
        if (d <= 1) {
          if (y <= g.floorY) p.set(x, y, z, (x + z) % 3 === 0 ? B.BLUE_ICE : B.PACKED_ICE);
          else p.set(x, y, z, AIR);
        } else if (d <= 1.34) {
          p.set(x, y, z, lining(x, y, z));
        }
      }
    }
  }
  // Stalactites and stalagmites, crystal clusters, a frozen pool and the relic on its pedestal.
  const nearPath = (x: number, z: number): boolean => x > g.cx - 3 && Math.abs(z - -30) < 3;
  for (let z = g.cz - g.rz; z <= g.cz + g.rz; z++) {
    for (let x = g.cx - g.rx; x <= g.cx + g.rx; x++) {
      if (norm(x, g.floorY + 1, z) > 0.9) continue;
      const r = h3(x, 0, z, 78);
      if (!nearPath(x, z) && r > 0.955) p.box(x, g.floorY + 1, z, x, g.floorY + 1 + (r > 0.985 ? 2 : 1), z, B.PACKED_ICE);
      else if (!nearPath(x, z) && r > 0.92) p.set(x, g.floorY + 1, z, B.CRYSTAL);
      // Stalactites: from the ceiling lining down.
      for (let y = g.cy + g.ry; y > g.floorY + 3; y--) {
        if (p.get(x, y, z) === AIR && p.get(x, y + 1, z) !== AIR && h3(x, y, z, 79) > 0.55) {
          p.set(x, y, z, B.ICICLE);
          break;
        }
      }
    }
  }
  const px = g.cx - 3;
  const pz = g.cz;
  p.box(px - 3, g.floorY, pz - 3, px + 3, g.floorY, pz + 3, B.BLUE_ICE);
  p.box(px - 1, g.floorY + 1, pz - 1, px + 1, g.floorY + 1, pz + 1, B.POLISHED);
  p.box(px, g.floorY + 2, pz, px, g.floorY + 3, pz, B.COLUMN);
  p.set(px, g.floorY + 4, pz, B.CRYSTAL);
  for (const [dx, dz] of [[2, 2], [-2, 2], [2, -2], [-2, -2]] as const) b.lampPost(px + dx, g.floorY + 1, pz + dz, 1);

  // The long stair down into the glacier, carved last so the cavern's icy lining doesn't wall its mouth.
  b.stairRun(-5, -30, -1, 0, 0, 2, 15, 3, B.POLISHED, -1);
  for (let i = 1; i < 15; i += 4) lanternAt(b, -5 - i, 2 - i + 2, -31);
}

/** Draws every hidden route. Runs after the halls and interiors so it can carve through them. */
export function buildSecrets(b: IceBuilder): void {
  buildHallRoute(b);
  buildVaultRoute(b);
  buildGrottoRoute(b);
}
