import { describe, expect, it } from "vitest";
import { generateColumn, sampleColumn } from "./terrain";

describe("terrain generation determinism", () => {
  it("is a pure function of (seed, coordinate) — same input always produces the same output", () => {
    // spec/01-tech-stack-architecture.md §9: no Math.random/Date.now
    // anywhere in worldgen — a chunk must regenerate byte-identical.
    const a = generateColumn(42, 3, -2);
    const b = generateColumn(42, 3, -2);
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].blocks).toEqual(b[i].blocks);
      expect(a[i].skyLight).toEqual(b[i].skyLight);
    }
  });

  it("produces a different height for a different seed at the same coordinate (noise is actually seeded)", () => {
    const heightsA: number[] = [];
    const heightsB: number[] = [];
    for (let x = 0; x < 8; x++) {
      heightsA.push(sampleColumn(1, x * 13, 0).height);
      heightsB.push(sampleColumn(2, x * 13, 0).height);
    }
    expect(heightsA).not.toEqual(heightsB);
  });

  it("fills every voxel at or below the surface height and leaves the rest air", () => {
    const chunks = generateColumn(7, 0, 0);
    const { height } = sampleColumn(7, 0, 0);
    for (const chunk of chunks) {
      const baseY = chunk.coord.cy * 32;
      for (let ly = 0; ly < 32; ly++) {
        const worldY = baseY + ly;
        const id = chunk.blocks[0 | (ly << 5) | 0];
        if (worldY <= height) expect(id).not.toBe(0);
        else expect(id).toBe(0);
      }
    }
  });
});
