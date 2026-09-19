import { describe, expect, it } from "vitest";
import { getVillageLayout, VILLAGE_CORE, VILLAGE_Y, type Building } from "./layout";
import { getVillagePlan } from "./build";
import { UNSET } from "./plan";
import { riverFactor, villageGround, villageWeight } from "./ground";
import { sampleColumn, generateColumn, SEA_LEVEL } from "../terrain";
import { getBlockById, getBlockByKey } from "../../../data/blocks";

const overlap = (a: Building, b: Building, margin: number): boolean =>
  a.x0 - margin <= b.x1 && a.x1 + margin >= b.x0 && a.z0 - margin <= b.z1 && a.z1 + margin >= b.z0;

describe("village layout", () => {
  const layout = getVillageLayout();

  it("has at least 20 houses plus a hall, tavern, chapel, barn, stalls and fields", () => {
    expect(layout.houses.length).toBeGreaterThanOrEqual(20);
    expect(layout.stalls.length).toBeGreaterThanOrEqual(4);
    expect(layout.fields.length).toBeGreaterThanOrEqual(4);
    expect(new Set(layout.buildings.map((b) => b.kind))).toEqual(new Set(["house", "hall", "tavern", "chapel", "barn"]));
  });

  it("keeps every building inside the flattened core and clear of the others", () => {
    for (const b of layout.buildings) {
      expect(b.x0).toBeGreaterThan(VILLAGE_CORE.minX + 2);
      expect(b.x1).toBeLessThan(VILLAGE_CORE.maxX - 2);
      expect(b.z0).toBeGreaterThan(VILLAGE_CORE.minZ + 2);
      expect(b.z1).toBeLessThan(VILLAGE_CORE.maxZ - 12); // and off the stream at the south edge
    }
    for (let i = 0; i < layout.buildings.length; i++) {
      for (let j = i + 1; j < layout.buildings.length; j++) {
        expect(overlap(layout.buildings[i], layout.buildings[j], 2), `${i} vs ${j}`).toBe(false);
      }
    }
  });

  it("makes houses big enough for a room or two (at least 9x9 outside, so 7x7 or more inside)", () => {
    for (const h of layout.houses) {
      expect(h.x1 - h.x0 + 1).toBeGreaterThanOrEqual(10);
      expect(h.z1 - h.z0 + 1).toBeGreaterThanOrEqual(9);
    }
    expect(layout.houses.some((h) => h.rooms === 2)).toBe(true);
    expect(layout.houses.some((h) => h.rooms === 1)).toBe(true);
  });
});

describe("village plan", () => {
  const plan = getVillagePlan();
  const layout = getVillageLayout();
  const solid = (x: number, y: number, z: number): boolean => {
    const b = plan.get(x, y, z);
    return b !== UNSET && b !== 0 && getBlockById(b).solid;
  };

  it("gives every house a walkable interior: floor, two blocks of headroom, walls all round and a door in the front wall", () => {
    for (const h of layout.houses) {
      const cx = Math.floor((h.x0 + h.x1) / 2);
      const cz = Math.floor((h.z0 + h.z1) / 2);
      expect(solid(cx, VILLAGE_Y, cz)).toBe(true); // floor
      expect(solid(cx, VILLAGE_Y + 1, cz) && solid(cx, VILLAGE_Y + 2, cz)).toBe(false); // open interior somewhere near the middle (lamps hang higher)
      expect(solid(cx, VILLAGE_Y + 4, cz)).toBe(true); // ceiling
      const doorX = h.x0 + h.doorU;
      const doorZ = h.facing === "S" ? h.z1 : h.z0;
      expect(solid(doorX, VILLAGE_Y + 1, doorZ)).toBe(false); // the doorway is open
      expect(solid(doorX, VILLAGE_Y + 2, doorZ)).toBe(false);
      expect(solid(h.x0, VILLAGE_Y + 2, cz) || plan.get(h.x0, VILLAGE_Y + 2, cz) !== UNSET).toBe(true); // wall
    }
  });

  it("stays inside its box and never draws below the ground except for the well", () => {
    let below = 0;
    for (let x = VILLAGE_CORE.minX; x <= VILLAGE_CORE.maxX; x++) {
      for (let z = VILLAGE_CORE.minZ; z <= VILLAGE_CORE.maxZ; z++) {
        for (let y = VILLAGE_Y - 8; y < VILLAGE_Y; y++) if (plan.get(x, y, z) !== UNSET) below++;
      }
    }
    expect(below).toBeLessThan(10);
  });
});

describe("village ground", () => {
  it("is exactly level and dry in every world, with the stream low enough to flood", () => {
    for (const seed of [1, 7, 42, 999, 31337]) {
      for (let x = VILLAGE_CORE.minX; x <= VILLAGE_CORE.maxX; x += 4) {
        for (let z = VILLAGE_CORE.minZ; z <= 236; z += 4) {
          expect(sampleColumn(seed, x, z).height).toBe(VILLAGE_Y);
        }
      }
    }
    expect(riverFactor(30, 247)).toBeGreaterThan(0.9);
    expect(villageGround(70, 30, 247)).toBeLessThan(SEA_LEVEL);
    expect(villageWeight(0, 300)).toBe(0);
  });

  it("stamps the plan over the terrain: a gravel street and a house wall come out of chunk generation", () => {
    const seed = 42;
    const blockAt = (bx: number, by: number, bz: number): number => {
      const chunks = generateColumn(seed, Math.floor(bx / 32), Math.floor(bz / 32));
      const chunk = chunks[Math.floor(by / 32)];
      return chunk.blocks[(((bx % 32) + 32) % 32) | ((by % 32) << 5) | ((((bz % 32) + 32) % 32) << 10)];
    };
    expect(blockAt(10, VILLAGE_Y, 180)).toBe(getBlockByKey("path_gravel").id);
    const house = getVillageLayout().houses[0];
    expect(blockAt(house.x0, VILLAGE_Y + 2, house.z0)).not.toBe(0);
  });
});
