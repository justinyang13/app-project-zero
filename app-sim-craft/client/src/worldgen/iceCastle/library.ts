// The two halls flanking the keep on the wall-top terrace: the timber-gabled
// feast hall on the east (a long hall under a high blue roof, a great hearth,
// a chimney stack) and, mirrored on the west, the library — a four-storey
// reading hall (a 21-block-tall nave ringed by two levels of balconies, every
// wall lined with books, tall lancets between the shelves, chandeliers hung
// from the rafters) under the tallest roof on the castle bar the spire.
//
// Both are authored on the same footprint: outer walls x = ±20 (shared with
// the keep) to ±37, north wall z = -28..-27 (two thick, for the hidden
// passages in secrets.ts), south wall z = -9, floor at y = 13 (standing y = 14).
import { flagstone, h3, wall } from "./builder";
import type { IceBuilder } from "./builder";
import { AIR, B } from "./ids";

// Shared footprint, as seen on the east side (the library mirrors it through x -> -x).
const WALL_N = -28; // outer face of the north wall (it is two thick: -28 and -27)
const IN_N = -26; // first interior row
const IN_S = -10; // last interior row
const WALL_S = -9; // south wall (one thick)
const FLOOR_Y = 14; // standing y

/** Where the roof's surface lies at x: a 45-degree gable with a one-block eave overhang. u = 0 at the eave tip. */
function roofHeight(x: number, x0: number, x1: number, yBase: number): number {
  const u = Math.min(x - (x0 - 1), x1 + 1 - x);
  return yBase + u - 1;
}

/**
 * A gabled roof over a hall whose side walls stand at x0 and x1 (their tops at
 * yBase - 1) and whose gable ends are the north and south walls. Hollow inside
 * (a cathedral ceiling lined with timber), closed at both gable ends with a
 * timber-framed plaster face, snow-laden slate outside, a ridge cap along the
 * top. `windows` are lit lancets set into the gable faces.
 */
function gableRoof(b: IceBuilder, x0: number, x1: number, yBase: number, windows: number[]): void {
  const p = b.p;
  const ridgeU = Math.max(...Array.from({ length: x1 - x0 + 3 }, (_, i) => Math.min(i, x1 - x0 + 2 - i)));
  const centre = (x0 + x1) / 2;
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    const top = roofHeight(x, x0, x1, yBase);
    const u = Math.min(x - (x0 - 1), x1 + 1 - x);
    for (let z = WALL_N - 1; z <= WALL_S + 1; z++) {
      // The slate: ridge cap on the top, snow-laden on about half the rest.
      const block = u === ridgeU ? B.RIDGE : h3(x, top, z, 17) < 0.5 ? B.ROOF_SNOWY : B.ROOF;
      p.set(x, top, z, block);
      const inside = x >= x0 + 1 && x <= x1 - 1 && z >= IN_N && z <= IN_S;
      if (inside) {
        for (let y = yBase; y <= top - 2; y++) p.set(x, y, z, AIR);
        if (top - 1 >= yBase) p.set(x, top - 1, z, B.TIMBER);
      } else if (x >= x0 && x <= x1 && z >= WALL_N && z <= WALL_S && (z < IN_N || z > IN_S)) {
        // A gable face (north: the two-thick wall; south: the single wall), framed in timber.
        for (let y = yBase; y <= top - 1; y++) {
          const post = x === x0 + 3 || x === x1 - 3 || x === Math.floor(centre) || x === Math.ceil(centre);
          const brace = y === top - 1 || y === yBase || (y === yBase + 4 && Math.abs(x - centre) < 6);
          p.set(x, y, z, post || brace ? B.TIMBER : B.PLASTER);
        }
      }
    }
  }
  // Lit lancets in both gable faces.
  for (const wx of windows) {
    for (const wz of [WALL_N, WALL_N + 1, WALL_S]) {
      const top = roofHeight(wx, x0, x1, yBase);
      if (top - 1 >= yBase + 3) {
        p.set(wx, yBase + 1, wz, B.WINDOW);
        p.set(wx, yBase + 2, wz, B.WINDOW_TOP);
      }
    }
  }
  // A pinnacle on each of the four gable-end eave corners.
  for (const x of [x0, x1]) for (const z of [WALL_N, WALL_S]) b.pinnacle(x, yBase, z);
}

/** The shell of a hall: walls, a snow band under the eaves, stone buttresses and a floor of checkered marble. */
function hallShell(b: IceBuilder, x0: number, x1: number, wallTop: number): void {
  const p = b.p;
  p.box(x0, FLOOR_Y, WALL_N, x1, wallTop, WALL_S, wall);
  p.box(x0 + 1, FLOOR_Y, IN_N, x1 - 1, wallTop, IN_S, AIR); // the room, leaving the two-thick north wall and the south wall
  p.box(x0 + 1, FLOOR_Y - 1, IN_N, x1 - 1, FLOOR_Y - 1, IN_S, flagstone);
  // A moulded string course under the eaves and a snow-capped base course.
  p.ring(x0, WALL_N, x1, WALL_S, wallTop, wallTop, B.TRIM);
  p.ring(x0, WALL_N, x1, WALL_S, FLOOR_Y, FLOOR_Y, (x, y, z) => (h3(x, y, z, 5) < 0.4 ? B.RIMED : B.BRICK));
}

function buildFeastHall(b: IceBuilder): void {
  const p = b.p;
  const x0 = 20;
  const x1 = 37;
  const wallTop = 21;
  hallShell(b, x0, x1, wallTop);

  // The outer (east) wall: buttress pilasters between tall pointed lancets, a snow-lipped string course between the storeys.
  for (const z of [-26, -22, -18, -14, -10]) p.box(x1, FLOOR_Y, z, x1, wallTop - 1, z, B.COLUMN);
  for (const z of [-24, -20, -16, -12]) {
    b.lancet(x1, 16, z, 4);
    p.box(x1, FLOOR_Y, z, x1, 15, z, B.POLISHED);
  }
  // The south front: a pointed doorway (the staircase from the great hall comes up in front of it), torches and lit lancets.
  b.archX(-19, FLOOR_Y, 17, 20, 1, 5); // through to the keep's gallery
  b.archZ(29, FLOOR_Y, WALL_S, WALL_S, 2, 7);
  b.archSurroundZ(29, FLOOR_Y, WALL_S, 2, 7);
  for (const x of [22, 24, 34, 36]) b.lancet(x, 16, WALL_S, 4);
  for (const x of [23, 35]) p.box(x, FLOOR_Y, WALL_S, x, wallTop - 1, WALL_S, B.COLUMN);
  b.torch(32, FLOOR_Y, WALL_S + 1, 2);
  p.set(26, FLOOR_Y + 3, WALL_S, B.LANTERN); // the stair from the great hall comes up in front of this side, so a wall lantern instead of a torch
  // The north face: pilasters and lancets as well, and the chimney stack behind the hearth.
  for (const x of [22, 25, 33, 36]) p.box(x, FLOOR_Y, WALL_N, x, wallTop - 1, WALL_N, B.COLUMN);
  for (const x of [23, 24, 34, 35]) b.lancet(x, 16, WALL_N, 4);
  p.box(26, FLOOR_Y, WALL_N - 3, 31, 33, WALL_N - 1, wall);
  p.box(26, 34, WALL_N - 3, 31, 34, WALL_N - 1, B.SNOWY);
  for (const x of [26, 31]) for (const z of [WALL_N - 3, WALL_N - 1]) p.set(x, 35, z, B.BRICK);
  p.box(27, 31, WALL_N - 2, 30, 33, WALL_N - 2, B.TRIM);

  // The hall inside: long tables with lanterns, benches, a silver runner, a great hearth.
  p.box(28, 13, IN_N, 29, 13, IN_S, B.CARPET);
  for (const [tx0, tx1] of [[24, 25], [32, 33]] as const) {
    p.box(tx0, FLOOR_Y, -23, tx1, FLOOR_Y, -12, B.PLANKS);
    for (const z of [-22, -18, -14]) p.set(tx0 + (tx0 === 24 ? 1 : 0), FLOOR_Y + 1, z, B.LANTERN);
    for (const x of [tx0 === 24 ? 22 : 35]) p.box(x, FLOOR_Y, -23, x, FLOOR_Y, -12, B.POLISHED);
  }
  for (const x of [22, 35]) for (const z of [-25, -11]) b.torch(x, z, FLOOR_Y, 3);
  // The hearth: a chimney breast jutting into the hall, a cavity with flames, a mantle of trim.
  p.box(26, FLOOR_Y, IN_N, 31, wallTop - 1, IN_N + 1, wall);
  p.box(28, FLOOR_Y, IN_N, 29, FLOOR_Y + 2, IN_N + 1, AIR);
  p.box(27, FLOOR_Y + 3, IN_N, 30, FLOOR_Y + 3, IN_N + 1, B.TRIM);
  p.box(28, FLOOR_Y, IN_N + 1, 29, FLOOR_Y, IN_N + 1, B.FLAME);
  p.box(28, FLOOR_Y, IN_N, 29, FLOOR_Y, IN_N, B.FLAME);
  for (const x of [27, 30]) p.box(x, FLOOR_Y + 4, IN_N, x, FLOOR_Y + 5, IN_N, B.LANTERN);

  gableRoof(b, x0, x1, wallTop + 1, [26, 31]);
  // Lit gable-front lanterns and a crest.
  p.set(28, 28, WALL_S, B.CRYSTAL);
  p.set(29, 28, WALL_S, B.CRYSTAL);
}

function buildLibrary(b: IceBuilder): void {
  const p = b.p;
  const x0 = -37;
  const x1 = -20;
  const wallTop = 35;
  hallShell(b, x0, x1, wallTop);

  // Floors: two balcony levels (standing y = 20 and 26), a U of five-wide walkways round the nave, open on the south side.
  const strip = (floorY: number): void => {
    p.box(-36, floorY - 1, IN_N, -32, floorY - 1, IN_S, B.POLISHED); // west
    p.box(-25, floorY - 1, IN_N, -21, floorY - 1, IN_S, B.POLISHED); // east
    p.box(-36, floorY - 1, IN_N, -21, floorY - 1, -22, B.POLISHED); // north
  };
  strip(20);
  strip(26);
  // The nave's four great columns, and silver runners down the aisle and along each balcony.
  for (const [x, z] of [[-32, -22], [-25, -22], [-32, -13], [-25, -13]] as const) p.box(x, FLOOR_Y, z, x, wallTop - 1, z, B.COLUMN);
  p.box(-29, FLOOR_Y - 1, IN_N, -28, FLOOR_Y - 1, IN_S, B.CARPET);
  for (const fy of [20, 26]) {
    p.box(-35, fy - 1, IN_N, -35, fy - 1, IN_S, B.CARPET);
    p.box(-22, fy - 1, IN_N, -22, fy - 1, IN_S, B.CARPET);
    p.box(-36, fy - 1, -24, -21, fy - 1, -24, B.CARPET);
  }
  // Balustrades along the void's edges: a post every other block, a lantern on every third.
  for (const fy of [20, 26]) {
    for (let z = IN_N; z <= IN_S; z += 2) {
      p.set(-32, fy, z, B.COLUMN);
      p.set(-25, fy, z, B.COLUMN);
      if (((z - IN_N) / 2) % 3 === 1) {
        p.set(-32, fy + 1, z, B.LANTERN);
        p.set(-25, fy + 1, z, B.LANTERN);
      }
    }
    for (let x = -31; x <= -26; x += 2) {
      p.set(x, fy, -22, B.COLUMN);
      if (x === -29 || x === -27) p.set(x, fy + 1, -22, B.LANTERN);
    }
  }

  // Stairs: two solid flights up the west balcony, against its inner edge, from the aisle to the first balcony and on to the second.
  b.stairRun(-33, IN_S - 1, 0, -1, 0, 15, 6, 3, B.POLISHED, 1, FLOOR_Y - 1);
  b.stairRun(-33, IN_S - 7, 0, -1, 0, 21, 6, 3, B.POLISHED, 1, 19);

  // Books: shelves five high on every storey along the west, north and east walls (and the south wall at ground level), a lantern set into the run every fifth bay, bays left clear for the windows.
  const bays = { west: [-23, -18, -13], north: [-33, -28, -23], east: [] as number[] };
  const shelf = (x: number, y: number, z: number): void => {
    const lamp = h3(x, y, z, 31) > 0.9 && (y - FLOOR_Y) % 6 === 2;
    p.set(x, y, z, lamp ? B.LANTERN : B.SHELF);
  };
  for (const fy of [14, 20, 26]) {
    for (let y = fy; y <= fy + 4; y++) {
      for (let z = IN_N; z <= IN_S; z++) {
        if (!bays.west.includes(z)) shelf(-36, y, z);
        // The east wall is shared with the keep; leave the ground-floor doorway clear.
        if (!(fy === 14 && z >= -20 && z <= -18)) shelf(-21, y, z);
      }
      for (let x = -35; x <= -22; x++) {
        if (!bays.north.includes(x)) shelf(x, y, IN_N);
        if (fy === 14 && !(x >= -31 && x <= -27)) shelf(x, y, IN_S);
      }
    }
  }
  // Tall lancets between the shelves, three to a wall on every storey, a taller one under the roof.
  for (const wz of bays.west) {
    for (const fy of [14, 20, 26]) {
      p.box(-37, fy + 2, wz, -37, fy + 4, wz, B.WINDOW);
      p.set(-37, fy + 4, wz, B.WINDOW_TOP);
    }
    p.box(-37, 32, wz, -37, 34, wz, B.WINDOW);
    p.set(-37, 34, wz, B.WINDOW_TOP);
  }
  for (const wx of bays.north) {
    for (const wz of [WALL_N, WALL_N + 1]) {
      for (const fy of [14, 20, 26]) {
        p.box(wx, fy + 2, wz, wx, fy + 4, wz, B.WINDOW);
        p.set(wx, fy + 4, wz, B.WINDOW_TOP);
      }
      p.box(wx, 32, wz, wx, 34, wz, B.WINDOW);
      p.set(wx, 34, wz, B.WINDOW_TOP);
    }
  }
  // The outer faces: pilasters between the lancets, and a band of trim at each storey.
  for (const z of [-26, -21, -16, -11]) p.box(x0, FLOOR_Y, z, x0, wallTop - 1, z, B.COLUMN);
  for (const y of [19, 25, 31]) p.ring(x0, WALL_N, x1, WALL_S, y, y, B.TRIM);

  // The grand doorway on the south front, a smaller door through to the keep, and a lantern either side of each.
  b.archZ(-29, FLOOR_Y, WALL_S, WALL_S, 2, 7);
  b.archSurroundZ(-29, FLOOR_Y, WALL_S, 2, 7);
  for (const x of [-34, -33, -25, -24]) {
    p.box(x, 16, WALL_S, x, 19, WALL_S, B.WINDOW);
    p.set(x, 19, WALL_S, B.WINDOW_TOP);
  }
  for (const x of [-35, -23]) p.box(x, FLOOR_Y, WALL_S, x, wallTop - 1, WALL_S, B.COLUMN);
  b.archX(-19, FLOOR_Y, -20, -17, 1, 5);
  p.box(-20, FLOOR_Y + 5, -19, -17, FLOOR_Y + 5, -19, B.POLISHED);
  b.torch(-32, FLOOR_Y, WALL_S + 1, 2);
  p.set(-26, FLOOR_Y + 3, WALL_S, B.LANTERN); // (as in the feast hall: the stair comes up on this side)

  // Furniture on the nave floor: reading tables with lanterns, lantern posts down the aisle, great chandeliers from the rafters.
  for (const [tx, tz] of [[-34, -20], [-34, -15], [-24, -20], [-24, -15]] as const) {
    p.box(tx, FLOOR_Y, tz, tx + 1, FLOOR_Y, tz + 2, B.PLANKS);
    p.set(tx, FLOOR_Y + 1, tz + 1, B.LANTERN);
  }
  for (const z of [-24, -18, -12]) {
    b.lampPost(-30, FLOOR_Y, z, 2);
    b.lampPost(-27, FLOOR_Y, z, 2);
  }
  for (const [cx, cz] of [[-29, -22], [-28, -16], [-29, -11]] as const) {
    p.box(cx, 31, cz, cx, 34, cz, B.GRATE);
    p.set(cx, 30, cz, B.LANTERN);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) p.set(cx + dx, 31, cz + dz, B.LANTERN);
  }
  gableRoof(b, x0, x1, wallTop + 1, [-33, -24]);
  // The great rose window in the library's south gable, and a crest of crystals.
  b.roseZ(-29, 40, WALL_S);
  p.set(-29, 37, WALL_S, B.TRIM);
}

/** The east and west halls, built after the keep and before the interiors/secrets carve through them. */
export function buildAnnexes(b: IceBuilder): void {
  buildFeastHall(b);
  buildLibrary(b);
}
