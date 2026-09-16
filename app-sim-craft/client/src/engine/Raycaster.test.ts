import { describe, expect, it } from "vitest";
import { raycastVoxels } from "./Raycaster";
import type { World } from "./World";

function fakeWorld(solidVoxels: Set<string>): World {
  return {
    getBlock: (x: number, y: number, z: number) => (solidVoxels.has(`${x},${y},${z}`) ? 1 : 0),
  } as unknown as World;
}

describe("raycastVoxels", () => {
  it("hits a block directly below, with an upward-facing normal and a placeAt one block above it", () => {
    const world = fakeWorld(new Set(["0,0,0"]));
    const hit = raycastVoxels(world, { x: 0.5, y: 5, z: 0.5 }, { x: 0, y: -1, z: 0 }, 10);
    expect(hit).not.toBeNull();
    expect(hit!.block).toEqual({ x: 0, y: 0, z: 0 });
    expect(hit!.normal).toEqual({ x: 0, y: 1, z: 0 });
    expect(hit!.placeAt).toEqual({ x: 0, y: 1, z: 0 });
  });

  it("returns null when nothing solid is within reach", () => {
    const world = fakeWorld(new Set());
    const hit = raycastVoxels(world, { x: 0.5, y: 5, z: 0.5 }, { x: 0, y: -1, z: 0 }, 3);
    expect(hit).toBeNull();
  });

  it("hits a block to the side with a correctly-facing normal", () => {
    const world = fakeWorld(new Set(["3,0,0"]));
    const hit = raycastVoxels(world, { x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 0, z: 0 }, 10);
    expect(hit).not.toBeNull();
    expect(hit!.block).toEqual({ x: 3, y: 0, z: 0 });
    expect(hit!.normal).toEqual({ x: -1, y: 0, z: 0 });
    expect(hit!.placeAt).toEqual({ x: 2, y: 0, z: 0 });
  });

  it("does not hit anything beyond max reach", () => {
    const world = fakeWorld(new Set(["0,-10,0"]));
    const hit = raycastVoxels(world, { x: 0.5, y: 5, z: 0.5 }, { x: 0, y: -1, z: 0 }, 5);
    expect(hit).toBeNull();
  });
});
