import { describe, expect, it } from "vitest";
import { MOUNTAIN_CENTER, MOUNTAIN_PEAK_BOOST, MOUNTAIN_RADIUS, mountainHeightBoost } from "./mountain";
import { generateColumn, sampleColumn } from "./terrain";

describe("dragon hill", () => {
  it("is a broad, gentle rise: never steeper than about half a block per block", () => {
    let steepest = 0;
    for (const seed of [3, 42, 999]) {
      for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
        let previous = mountainHeightBoost(seed, MOUNTAIN_CENTER.x + Math.cos(angle) * (MOUNTAIN_RADIUS + 4), MOUNTAIN_CENTER.z + Math.sin(angle) * (MOUNTAIN_RADIUS + 4));
        for (let r = MOUNTAIN_RADIUS + 3; r >= 0; r--) {
          const h = mountainHeightBoost(seed, MOUNTAIN_CENTER.x + Math.cos(angle) * r, MOUNTAIN_CENTER.z + Math.sin(angle) * r);
          steepest = Math.max(steepest, Math.abs(h - previous));
          previous = h;
        }
      }
    }
    expect(steepest).toBeLessThanOrEqual(2); // per single block of run (rounded heights + ripple)
  });

  it("rises to a modest summit and is flat ground outside its footprint", () => {
    const centerBoost = mountainHeightBoost(42, MOUNTAIN_CENTER.x, MOUNTAIN_CENTER.z);
    expect(centerBoost).toBeGreaterThan(MOUNTAIN_PEAK_BOOST - 8);
    expect(centerBoost).toBeLessThan(MOUNTAIN_PEAK_BOOST + 8);
    expect(mountainHeightBoost(42, MOUNTAIN_CENTER.x + MOUNTAIN_RADIUS + 1, MOUNTAIN_CENTER.z)).toBe(0);
  });

  it("is solid all the way through — no cave, no platform: the summit is natural ground and nothing hollow is carved beneath it", () => {
    const seed = 42;
    const cx = Math.floor(MOUNTAIN_CENTER.x / 32);
    const cz = Math.floor(MOUNTAIN_CENTER.z / 32);
    const chunks = generateColumn(seed, cx, cz);
    const { height } = sampleColumn(seed, MOUNTAIN_CENTER.x, MOUNTAIN_CENTER.z);
    const lx = MOUNTAIN_CENTER.x - cx * 32;
    const lz = MOUNTAIN_CENTER.z - cz * 32;
    for (let y = 0; y <= height; y++) {
      const chunk = chunks[Math.floor(y / 32)];
      expect(chunk.blocks[lx | ((y % 32) << 5) | (lz << 10)]).not.toBe(0);
    }
    const above = chunks[Math.floor((height + 1) / 32)];
    expect(above.blocks[lx | (((height + 1) % 32) << 5) | (lz << 10)]).toBe(0);
  });
});
