import { describe, expect, it } from "vitest";
import { getIcePlan } from "./blueprint";
import { getCastlePlan } from "../castle/blueprint";
import { UNSET } from "../castle/plan";
import { applyIceCrag, iceCragHeight, iceFrost, iceGroundAt, iceRampHeight, ICE_RAMP, ICE_ROCK } from "./crag";
import { ICE_BOUNDS, ICE_CASTLE_CENTER, ICE_FLOOR_Y, ICE_RAMP_START_Z } from "./layout";
import { B } from "./ids";
import { castleBlockLightAt } from "../castle/lightMap";
import { sampleColumn } from "../terrain";
import { getBlockById } from "../../data/blocks";

const plan = getIcePlan();
const MINEABLE = new Set<number>([B.LOOSE_BRICK, B.SHELF_LOOSE]);

/** Whether a local cell blocks the player: a solid block, or untouched ground at/below the crag's surface. `mined` treats the hidden-door blocks as already broken. */
function solidAt(lx: number, ly: number, lz: number, mined: boolean): boolean {
  const b = plan.get(lx, ly, lz);
  if (b === UNSET) return ICE_FLOOR_Y + ly <= iceGroundAt(lx, lz);
  if (b === 0) return false;
  if (mined && MINEABLE.has(b)) return false;
  return getBlockById(b).solid;
}

const key = (x: number, y: number, z: number): string => `${x},${y},${z}`;

/** Every standing cell (feet position) the player can walk to from `start`: steps up one block, drops up to three, two cells of headroom. */
function reachable(start: [number, number, number], mined: boolean): Set<string> {
  const seen = new Set<string>([key(...start)]);
  const queue: [number, number, number][] = [start];
  const { minX, maxX, minZ, maxZ, minY, maxY } = ICE_BOUNDS;
  while (queue.length) {
    const [x, y, z] = queue.pop()!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < minX || nx > maxX || nz < minZ || nz > maxZ) continue;
      for (const dy of [1, 0, -1, -2, -3]) {
        const ny = y + dy;
        if (ny < minY || ny + 2 > maxY) continue;
        if (solidAt(nx, ny, nz, mined) || solidAt(nx, ny + 1, nz, mined) || !solidAt(nx, ny - 1, nz, mined)) continue;
        if (dy === 1 && solidAt(x, y + 2, z, mined)) continue; // no headroom to step up
        if (dy < 0 && (solidAt(nx, y, nz, mined) || solidAt(nx, y + 1, nz, mined))) continue; // the drop is blocked above
        const k = key(nx, ny, nz);
        if (seen.has(k)) continue;
        seen.add(k);
        queue.push([nx, ny, nz]);
        break;
      }
    }
  }
  return seen;
}

const gateY = iceRampHeight(ICE_CASTLE_CENTER.x, ICE_CASTLE_CENTER.z + 36)! - ICE_FLOOR_Y + 1;
const outside = reachable([0, gateY, 36], false);
const withSecrets = reachable([0, gateY, 36], true);

describe("ice castle plan", () => {
  it("is deterministic and carries banners, extras and hand-built detail", () => {
    expect(plan.banners.length).toBeGreaterThan(8);
    expect(plan.extras.length).toBeGreaterThan(0);
    expect(getIcePlan()).toBe(plan);
  });

  it("is as big as the dark castle: the same footprint and a plan box at least as large", () => {
    const count = (p: { blocks: Uint16Array }): number => p.blocks.reduce((n, b) => n + (b === UNSET ? 0 : 1), 0);
    expect(count(plan)).toBeGreaterThanOrEqual(count(getCastlePlan()));
    expect(plan.sizeX).toBeGreaterThanOrEqual(117);
    expect(plan.sizeZ).toBeGreaterThanOrEqual(133);
  });

  it("opens the front gate onto the courtyard and the great hall", () => {
    expect(outside.has(key(0, 1, 27))).toBe(true); // in the outer gate
    expect(outside.has(key(0, 1, 10))).toBe(true); // courtyard
    expect(outside.has(key(0, 1, 0))).toBe(true); // inner gate
    expect(outside.has(key(0, 1, -10))).toBe(true); // great hall
  });

  it("lets a visitor climb to every public room without breaking anything", () => {
    const reach = (x: number, y: number, z: number): boolean => outside.has(key(x, y, z));
    expect(reach(0, 14, -20)).toBe(true); // tier 1 gallery
    expect(reach(0, 20, -20)).toBe(true); // upper hall
    expect(reach(0, 28, -20)).toBe(true); // tier 2, ground room
    expect(reach(0, 42, -20)).toBe(true); // tier 2, top room
    expect(reach(0, 50, -26)).toBe(true); // the keep's crown walk
    expect(reach(29, 14, -15)).toBe(true); // the feast hall
    expect(reach(-29, 14, -15)).toBe(true); // the library, ground floor
  });

  it("makes the library at least three storeys tall, with balconies reached by its stairs", () => {
    const reach = (x: number, y: number, z: number): boolean => outside.has(key(x, y, z));
    expect(reach(-35, 20, -24)).toBe(true); // first balcony
    expect(reach(-35, 26, -24)).toBe(true); // second balcony
    // 21 open blocks from floor to rafters at the nave's centre.
    for (let y = 14; y <= 34; y++) expect(solidAt(-30, y, -16, false), `y ${y}`).toBe(false);
    // Shelved from floor to rafters on its walls.
    let shelves = 0;
    for (let y = 14; y <= 31; y++) if (plan.get(-36, y, -24) === B.SHELF || plan.get(-36, y, -24) === B.LANTERN) shelves++;
    expect(shelves).toBeGreaterThan(8);
    let books = 0;
    for (const b of plan.blocks) if (b === B.SHELF) books++;
    expect(books).toBeGreaterThan(300);
  });
});

describe("ice castle secrets", () => {
  it("keeps every hidden room out of sight until a loose block is broken", () => {
    expect(outside.has(key(12, 2, -30))).toBe(false); // the treasury vault
    expect(outside.has(key(-24, -12, -28))).toBe(false); // the ice grotto
    expect(outside.has(key(-34, 14, -31))).toBe(false); // the tower study
    expect(outside.has(key(-11, 1, -30))).toBe(false); // the hall's secret corridor
  });

  it("opens all three routes once the loose blocks give way", () => {
    expect(withSecrets.has(key(-11, 1, -30))).toBe(true);
    expect(withSecrets.has(key(-34, 14, -31))).toBe(true); // the study at the top of the spiral
    expect(withSecrets.has(key(-34, 14, -27))).toBe(true); // the passage to the library's north wall
    expect(withSecrets.has(key(12, 2, -30))).toBe(true); // the vault, from the hearth
    expect(withSecrets.has(key(-24, -12, -28))).toBe(true); // the grotto, from the vault
  });

  it("looks like the real thing until it is touched: loose blocks are the same texture as their neighbours", () => {
    expect(getBlockById(B.LOOSE_BRICK).tex?.all).toBe("loose_brick");
    expect(getBlockById(B.SHELF_LOOSE).tex).toEqual(getBlockById(B.SHELF).tex);
    expect(getBlockById(B.SHELF_LOOSE).hardness).toBeLessThan(getBlockById(B.SHELF).hardness);
  });
});

describe("ice castle lighting", () => {
  /** Roofed standing cells in a box that a player can reach, with their baked light. */
  function roomLight(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): number[] {
    const out: number[] = [];
    for (const k of outside) {
      const [x, y, z] = k.split(",").map(Number);
      if (x < x0 || x > x1 || y < y0 || y > y1 || z < z0 || z > z1) continue;
      out.push(castleBlockLightAt(ICE_CASTLE_CENTER.x + x, ICE_FLOOR_Y + y + 1, ICE_CASTLE_CENTER.z + z));
    }
    return out;
  }

  it("lights the great hall, the library and the feast hall so no walkable floor is dark", () => {
    for (const [name, cells] of [
      ["great hall", roomLight(-12, 12, 1, 1, -25, -4)],
      ["library ground", roomLight(-36, -21, 14, 14, -26, -10)],
      ["library balconies", roomLight(-36, -21, 20, 26, -26, -10)],
      ["feast hall", roomLight(21, 36, 14, 14, -26, -10)],
    ] as const) {
      expect(cells.length, name).toBeGreaterThan(20);
      expect(Math.min(...cells), name).toBeGreaterThanOrEqual(5);
    }
  });
});

describe("ice crag and frosted ground", () => {
  it("stands the plateau at the courtyard floor and falls away in terraces", () => {
    expect(iceCragHeight(ICE_CASTLE_CENTER.x, ICE_CASTLE_CENTER.z)).toBe(ICE_FLOOR_Y);
    expect(iceCragHeight(ICE_CASTLE_CENTER.x + 30, ICE_CASTLE_CENTER.z + 10)).toBe(ICE_FLOOR_Y);
    expect(iceCragHeight(ICE_CASTLE_CENTER.x + 60, ICE_CASTLE_CENTER.z + 20)).toBeLessThan(ICE_FLOOR_Y);
    expect(iceCragHeight(ICE_CASTLE_CENTER.x + 400, ICE_CASTLE_CENTER.z)).toBe(-Infinity);
  });

  it("cuts the approach ramp down from the gate in gentle steps", () => {
    let previous = iceRampHeight(ICE_CASTLE_CENTER.x, ICE_CASTLE_CENTER.z + ICE_RAMP_START_Z)!;
    expect(previous).toBe(ICE_FLOOR_Y - 1);
    for (let dz = 1; dz < 40; dz++) {
      const h = iceRampHeight(ICE_CASTLE_CENTER.x, ICE_CASTLE_CENTER.z + ICE_RAMP_START_Z + dz)!;
      expect(previous - h).toBeLessThanOrEqual(1);
      previous = h;
    }
    const { kind } = applyIceCrag(60, ICE_CASTLE_CENTER.x, ICE_CASTLE_CENTER.z + ICE_RAMP_START_Z + 4);
    expect(kind).toBe(ICE_RAMP);
    expect(applyIceCrag(60, ICE_CASTLE_CENTER.x + 20, ICE_CASTLE_CENTER.z).kind).toBe(ICE_ROCK);
  });

  it("frosts the snowfield whatever the world's climate, easing out with distance", () => {
    expect(iceFrost(ICE_CASTLE_CENTER.x + 400, ICE_CASTLE_CENTER.z)).toBe(0);
    let near = 0;
    let far = 0;
    for (let i = 0; i < 40; i++) {
      near += iceFrost(ICE_CASTLE_CENTER.x + 50 + 2 * i, ICE_CASTLE_CENTER.z + 70);
      far += iceFrost(ICE_CASTLE_CENTER.x + 130 + 2 * i, ICE_CASTLE_CENTER.z + 150);
    }
    expect(near / 40).toBeGreaterThan(far / 40);
    for (const seed of [1, 42, 12345, 987654]) {
      const s = sampleColumn(seed, ICE_CASTLE_CENTER.x + 20, ICE_CASTLE_CENTER.z + 80);
      expect(s.snowy || s.crag !== 0, `seed ${seed}`).toBe(true);
    }
  });

  it("never leaves the foot of the ramp underwater", () => {
    for (const seed of [1, 42, 20260930, 77]) {
      for (let dz = 0; dz <= 70; dz += 5) {
        const { height } = sampleColumn(seed, ICE_CASTLE_CENTER.x, ICE_CASTLE_CENTER.z + ICE_RAMP_START_Z + dz);
        expect(height, `seed ${seed} dz ${dz}`).toBeGreaterThanOrEqual(64);
      }
    }
  });
});
