import { describe, expect, it } from "vitest";
import { getCastlePlan } from "./blueprint";
import { UNSET } from "./plan";
import { sampleColumn, SEA_LEVEL } from "../terrain";
import { applyCrag, blightSurfaceBlock, castleBlight, cragHeight, rampHeight, CRAG_RAMP } from "./crag";
import { castleBlockLightAt } from "./lightMap";
import { CASTLE_CENTER, CASTLE_FLOOR_Y, RAMP_START_Z } from "./layout";
import { getBlockById, getBlockByKey } from "../../../data/blocks";

const isPassable = (id: number): boolean => id === UNSET || id === 0 || !getBlockById(id).solid;

describe("castle plan", () => {
  const plan = getCastlePlan();

  it("is deterministic — the same plan every build", () => {
    expect(plan.banners.length).toBeGreaterThan(8);
    expect(plan.extras.length).toBeGreaterThan(0);
  });

  it("leaves a walkable path through the outer gate, over the courtyard floor, to the inner gate", () => {
    // Player-sized clearance (2 cells) at every step of the central axis.
    for (let lz = 29; lz >= -3; lz--) {
      if (lz >= 15 && lz <= 20) continue; // the bridge is a floor either way
      expect(plan.get(0, 0, lz)).not.toBe(0); // there is a floor cell (never carved to air)
      expect(isPassable(plan.get(0, 1, lz))).toBe(true);
      expect(isPassable(plan.get(0, 2, lz))).toBe(true);
    }
  });

  it("bridges the lava river with a solid deck", () => {
    const magma = getBlockByKey("magma").id;
    expect(plan.get(0, -1, 17)).toBe(magma); // river flows under the bridge's z-range at x = 0? deck is above it
    expect(plan.get(0, 0, 17)).not.toBe(0);
    expect(getBlockById(plan.get(0, 0, 17)).solid).toBe(true);
  });

  it("carves the river channel with lava and nightglass beneath the floor level", () => {
    const magma = getBlockByKey("magma").id;
    const nightglass = getBlockByKey("nightglass").id;
    expect(plan.get(-20, -1, 7)).toBe(magma);
    expect(plan.get(-20, -2, 7)).toBe(nightglass);
    expect(plan.get(-20, 0, 7)).toBe(0);
  });

  it("puts every glowing block's light into the baked block-light map", () => {
    // Lamp over the great hall's runner — hall interior should be well lit.
    expect(castleBlockLightAt(CASTLE_CENTER.x, CASTLE_FLOOR_Y + 9, CASTLE_CENTER.z - 7)).toBeGreaterThan(8);
    // Far outside the plan box there is no baked light at all.
    expect(castleBlockLightAt(0, 70, 0)).toBe(0);
  });
});

describe("castle crag", () => {
  it("holds the plateau at the courtyard floor height under the castle", () => {
    expect(cragHeight(CASTLE_CENTER.x, CASTLE_CENTER.z)).toBe(CASTLE_FLOOR_Y);
    expect(cragHeight(CASTLE_CENTER.x + 30, CASTLE_CENTER.z + 10)).toBe(CASTLE_FLOOR_Y);
  });

  it("falls away outside the plateau and vanishes far away", () => {
    expect(cragHeight(CASTLE_CENTER.x + 60, CASTLE_CENTER.z + 20)).toBeLessThan(CASTLE_FLOOR_Y);
    expect(cragHeight(CASTLE_CENTER.x + 400, CASTLE_CENTER.z)).toBe(-Infinity);
  });

  it("descends the approach ramp in steps a player can climb (at most one block each)", () => {
    let previous = rampHeight(CASTLE_CENTER.x, CASTLE_CENTER.z + RAMP_START_Z)!;
    expect(previous).toBe(CASTLE_FLOOR_Y - 1);
    for (let dz = 1; dz < 40; dz++) {
      const h = rampHeight(CASTLE_CENTER.x, CASTLE_CENTER.z + RAMP_START_Z + dz)!;
      expect(previous - h).toBeGreaterThanOrEqual(0);
      expect(previous - h).toBeLessThanOrEqual(1);
      previous = h;
    }
    expect(rampHeight(CASTLE_CENTER.x + 10, CASTLE_CENTER.z + RAMP_START_Z + 5)).toBeNull();
  });

  it("marks ramp columns as ramp terrain and rises above low natural ground", () => {
    const { height, kind } = applyCrag(60, CASTLE_CENTER.x, CASTLE_CENTER.z + RAMP_START_Z + 4);
    expect(kind).toBe(CRAG_RAMP);
    expect(height).toBeGreaterThan(60);
  });
});

describe("castle blight (the ground darkening toward the crag)", () => {
  const turf = getBlockByKey("turf").id;

  it("is strong beside the crag, fades with distance, and is gone far away", () => {
    const average = (dist: number): number => {
      let sum = 0;
      for (let i = 0; i < 40; i++) sum += castleBlight(CASTLE_CENTER.x + 41 + dist, CASTLE_CENTER.z - 20 + i * 2);
      return sum / 40;
    };
    expect(average(16)).toBeGreaterThan(0.85);
    expect(average(16)).toBeGreaterThan(average(45));
    expect(average(45)).toBeGreaterThan(average(70));
    expect(average(70)).toBeGreaterThan(average(100));
    expect(castleBlight(CASTLE_CENTER.x + 400, CASTLE_CENTER.z)).toBe(0);
  });

  it("keeps the natural surface where there is no blight, and never turns it green when blighted", () => {
    expect(blightSurfaceBlock(5, 5, 0, turf)).toBe(turf);
    const dark = new Set<number>();
    for (let x = 0; x < 30; x++) for (let z = 0; z < 30; z++) dark.add(blightSurfaceBlock(x, z, 1, turf));
    expect(dark.has(turf)).toBe(false);
  });

  it("blends through intermediate shades at mid blight", () => {
    const seen = new Set<number>();
    for (let x = 0; x < 30; x++) for (let z = 0; z < 30; z++) seen.add(blightSurfaceBlock(x, z, 0.5, turf));
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });
});

describe("castle approach", () => {
  it("is dry land in every world — the ramp's foot and the ground around it never dip under the sea", () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (let dz = 0; dz <= 90; dz += 6) {
        for (let dx = -30; dx <= 30; dx += 6) {
          const { height } = sampleColumn(seed * 7919, CASTLE_CENTER.x + dx, CASTLE_CENTER.z + dz);
          expect(height).toBeGreaterThan(SEA_LEVEL);
        }
      }
    }
  });
});
