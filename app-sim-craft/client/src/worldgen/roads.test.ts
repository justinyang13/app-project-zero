import { describe, expect, it } from "vitest";
import {
  BRIDGE_CREST_Y,
  BRIDGE_SPAN,
  FLAT_ROAD_Y,
  LOOP_PERIMETER,
  isRoadColumn,
  isRoadCorridorColumn,
  pointAtProgress,
  roadDeckYAtProgress,
  sampleRoad,
} from "./roads";
import { classifyRoadColumn, grandBridgeBlock } from "./bridge";
import { generateColumn, sampleColumn } from "./terrain";
import { CAMPFIRE_SITES } from "./structures";
import { VILLAGE_CORE } from "./village/layout";
import { CASTLE_CENTER, PLAN_MAX_X, PLAN_MAX_Z, PLAN_MIN_X, PLAN_MIN_Z } from "./castle/layout";
import { MOUNTAIN_CENTER, MOUNTAIN_RADIUS } from "./mountain";
import { getBlockByKey } from "../data/blocks";

const SEED = 42;

describe("loop road", () => {
  it("is a closed loop of evenly spaced points that heads forward", () => {
    const start = pointAtProgress(0);
    const end = pointAtProgress(LOOP_PERIMETER);
    expect(Math.hypot(start.x - end.x, start.z - end.z)).toBeLessThan(1e-6);
    for (let s = 0; s < LOOP_PERIMETER; s += 7) {
      const a = pointAtProgress(s);
      const b = pointAtProgress(s + 2);
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeGreaterThan(1.8);
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(2.05);
      // yaw convention: forward = (sin yaw, cos yaw)
      expect(Math.sin(a.yaw) * (b.x - a.x) + Math.cos(a.yaw) * (b.z - a.z)).toBeGreaterThan(1.7);
    }
  });

  it("never comes near itself except along its own length (no pinches, no crossings)", () => {
    for (let a = 0; a < LOOP_PERIMETER; a += 6) {
      for (let b = a + 150; b < LOOP_PERIMETER - 150; b += 6) {
        const pa = pointAtProgress(a);
        const pb = pointAtProgress(b);
        expect(Math.hypot(pa.x - pb.x, pa.z - pb.z)).toBeGreaterThan(20);
      }
    }
  });

  it("winds naturally: it turns gradually, with no sharp corners", () => {
    let worst = 0;
    for (let s = 0; s < LOOP_PERIMETER; s += 4) {
      const a = pointAtProgress(s);
      const b = pointAtProgress(s + 12);
      let turn = Math.abs(b.yaw - a.yaw);
      if (turn > Math.PI) turn = 2 * Math.PI - turn;
      worst = Math.max(worst, turn);
    }
    expect(worst).toBeLessThan(0.75); // radians turned over 12 blocks (a radius of at least ~16)
  });

  it("keeps clear of the castle, village, camps and the dragon hill", () => {
    for (let s = 0; s < LOOP_PERIMETER; s += 3) {
      const { x, z } = pointAtProgress(s);
      expect(x > CASTLE_CENTER.x + PLAN_MIN_X - 20 && x < CASTLE_CENTER.x + PLAN_MAX_X + 20 && z > CASTLE_CENTER.z + PLAN_MIN_Z - 20 && z < CASTLE_CENTER.z + PLAN_MAX_Z + 20).toBe(false);
      const vx = Math.max(VILLAGE_CORE.minX - x, 0, x - VILLAGE_CORE.maxX);
      const vz = Math.max(VILLAGE_CORE.minZ - z, 0, z - VILLAGE_CORE.maxZ);
      expect(Math.hypot(vx, vz)).toBeGreaterThan(5); // clear of the village's flattened ground
      for (const camp of CAMPFIRE_SITES) expect(Math.hypot(camp.x - x, camp.z - z)).toBeGreaterThan(20);
      expect(Math.hypot(x - MOUNTAIN_CENTER.x, z - MOUNTAIN_CENTER.z)).toBeGreaterThan(MOUNTAIN_RADIUS + 1);
    }
  });

  it("finds the road under its own centerline and not far from it", () => {
    for (let s = 0; s < LOOP_PERIMETER; s += 25) {
      const { x, z } = pointAtProgress(s);
      expect(isRoadColumn(Math.floor(x), Math.floor(z))).toBe(true);
      const { yaw } = pointAtProgress(s);
      expect(isRoadColumn(Math.floor(x + Math.cos(yaw) * 12), Math.floor(z - Math.sin(yaw) * 12))).toBe(false); // 12 blocks to the side
    }
    expect(isRoadCorridorColumn(-1000, 1000)).toBe(false);
  });
});

describe("lake bridge", () => {
  it("stays flat everywhere except across the deep lake, where the deck arches up in gentle steps", () => {
    expect(BRIDGE_SPAN).not.toBeNull();
    const { start, length } = BRIDGE_SPAN!;
    expect(length).toBeGreaterThan(200);
    let crest = 0;
    for (let s = 0; s < LOOP_PERIMETER; s += 1) {
      const y = roadDeckYAtProgress(s);
      crest = Math.max(crest, y);
      const along = (((s - start) % LOOP_PERIMETER) + LOOP_PERIMETER) % LOOP_PERIMETER;
      if (along > length + 2) expect(y).toBe(FLAT_ROAD_Y);
      expect(Math.abs(roadDeckYAtProgress(s + 3) - y)).toBeLessThanOrEqual(1); // never steeper than 1 block per 3
    }
    expect(crest).toBe(BRIDGE_CREST_Y);
  });

  it("builds a road deck, girder and parapet at the crest, with open water beneath it", () => {
    const { start, length } = BRIDGE_SPAN!;
    const mid = pointAtProgress(start + length / 2);
    const x = Math.floor(mid.x);
    const z = Math.floor(mid.z);
    const road = sampleRoad(x, z)!;
    expect(road.onBridge).toBe(true);
    const height = sampleColumn(SEED, x, z).height;
    expect(height).toBeLessThan(40); // deep water
    const column = classifyRoadColumn(x, z, height)!;
    expect(column.kind).toBe("grand");
    expect(column.deckY).toBe(BRIDGE_CREST_Y);

    const chunks = generateColumn(SEED, Math.floor(x / 32), Math.floor(z / 32));
    const at = (y: number): number => {
      const chunk = chunks[Math.floor(y / 32)];
      expect(chunk).toBeDefined();
      return chunk.blocks[(((x % 32) + 32) % 32) | ((((y % 32) + 32) % 32) << 5) | ((((z % 32) + 32) % 32) << 10)];
    };
    expect(getBlockByKey("asphalt").id === at(BRIDGE_CREST_Y) || getBlockByKey("bridge_concrete").id === at(BRIDGE_CREST_Y)).toBe(true);
    expect(at(BRIDGE_CREST_Y - 1)).toBe(getBlockByKey("bridge_steel").id);
    expect(at(BRIDGE_CREST_Y + 4)).toBe(0);
    expect(grandBridgeBlock({ ...column, lateral: 0, pierOffset: 14 }, BRIDGE_CREST_Y - 10)).toBe(0); // between piers: nothing under the girder
    expect(grandBridgeBlock({ ...column, lateral: 3, pierOffset: 0 }, BRIDGE_CREST_Y - 10)).toBe(getBlockByKey("bridge_concrete").id); // a pier leg
  });
});
