// Sky-light re-propagation after a block edit, per
// spec/10-lighting-rendering.md §1. Initial generation-time lighting is a
// simple top-down column scan (worldgen/terrain.ts) which is exact
// for freshly generated terrain (no overhangs); once the player mines a
// tunnel or roofs a structure, light needs to spread sideways/upward too
// — that's what this local, bounded BFS does.
//
// Scoped-down vs the spec: block-light (torches/emitters) doesn't exist
// yet (no light-emitting blocks in the catalog), and block removal uses a
// single decay-then-relight BFS rather than the full two-phase darken/
// re-light algorithm the spec calls for — occasionally leaves a stale
// bright voxel behind a newly-placed wall until something nearby forces
// a wider recompute. Correct enough for a first playable pass; flagged
// here rather than silently "fixed."
import { chunkCoordOf, chunkKey, type ChunkCoord } from "./Chunk";
import type { World } from "./World";
import { AIR_ID } from "../data/blocks";

const MAX_LIGHT = 15;

interface LightNode {
  x: number;
  y: number;
  z: number;
}

/** Unloaded space counts as open sky, not a wall. */
function getLight(world: World, x: number, y: number, z: number): number {
  return world.getSkyLight(x, y, z) ?? MAX_LIGHT;
}

function isOpaque(world: World, x: number, y: number, z: number): boolean {
  return world.getBlock(x, y, z) !== AIR_ID;
}

const NEIGHBOR_OFFSETS: LightNode[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
];

/** Re-floods sky light outward from an edited voxel. Returns every chunk whose light data changed. */
export function relightAfterEdit(world: World, wx: number, wy: number, wz: number): ChunkCoord[] {
  const touched = new Map<string, ChunkCoord>();
  const markTouched = (x: number, y: number, z: number) => {
    const coord = chunkCoordOf(x, y, z);
    touched.set(chunkKey(coord), coord);
  };

  const queue: LightNode[] = [];

  if (isOpaque(world, wx, wy, wz)) {
    world.setSkyLight(wx, wy, wz, 0);
    markTouched(wx, wy, wz);
  } else {
    // Recompute this voxel's light from its brightest neighbor, then
    // spread outward — correctly re-lights a block just broken open.
    let best = 0;
    for (const off of NEIGHBOR_OFFSETS) {
      const nx = wx + off.x;
      const ny = wy + off.y;
      const nz = wz + off.z;
      if (isOpaque(world, nx, ny, nz)) continue;
      const decayed = getLight(world, nx, ny, nz) - 1;
      if (decayed > best) best = decayed;
    }
    if (getLight(world, wx, wy, wz) !== best) {
      world.setSkyLight(wx, wy, wz, best);
      markTouched(wx, wy, wz);
    }
  }

  queue.push({ x: wx, y: wy, z: wz });
  let iterations = 0;
  const MAX_ITERATIONS = 20000; // bounds worst-case cost per edit

  // `head` walks the queue instead of shift()ing it, which would be O(n) per pop.
  let head = 0;
  while (head < queue.length && iterations < MAX_ITERATIONS) {
    iterations++;
    const node = queue[head++];
    const currentLight = getLight(world, node.x, node.y, node.z);
    if (currentLight <= 0) continue;

    for (const off of NEIGHBOR_OFFSETS) {
      const nx = node.x + off.x;
      const ny = node.y + off.y;
      const nz = node.z + off.z;
      if (isOpaque(world, nx, ny, nz)) continue;
      const propagated = currentLight - 1;
      if (propagated <= 0) continue;
      if (getLight(world, nx, ny, nz) < propagated) {
        world.setSkyLight(nx, ny, nz, propagated);
        markTouched(nx, ny, nz);
        queue.push({ x: nx, y: ny, z: nz });
      }
    }
  }

  return [...touched.values()];
}
