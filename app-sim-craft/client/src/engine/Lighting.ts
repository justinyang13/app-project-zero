// Sky-light re-propagation after a block edit, per
// spec/10-lighting-rendering.md §1. Initial generation-time lighting is a
// simple top-down column scan (engine/worldgen/terrain.ts) which is exact
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
import { CHUNK_SIZE, localIndex, type ChunkCoord } from "./Chunk";
import type { World } from "./World";

const MAX_LIGHT = 15;

interface LightNode {
  x: number;
  y: number;
  z: number;
}

function getLight(world: World, x: number, y: number, z: number): number {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cy = Math.floor(y / CHUNK_SIZE);
  const cz = Math.floor(z / CHUNK_SIZE);
  const chunk = world.getChunk({ cx, cy, cz });
  if (!chunk) return MAX_LIGHT; // unloaded space treated as open sky, not a wall
  const lx = x - cx * CHUNK_SIZE;
  const ly = y - cy * CHUNK_SIZE;
  const lz = z - cz * CHUNK_SIZE;
  return chunk.skyLight[localIndex(lx, ly, lz)];
}

function setLight(world: World, x: number, y: number, z: number, value: number): boolean {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cy = Math.floor(y / CHUNK_SIZE);
  const cz = Math.floor(z / CHUNK_SIZE);
  const chunk = world.getChunk({ cx, cy, cz });
  if (!chunk) return false;
  const lx = x - cx * CHUNK_SIZE;
  const ly = y - cy * CHUNK_SIZE;
  const lz = z - cz * CHUNK_SIZE;
  const idx = localIndex(lx, ly, lz);
  if (chunk.skyLight[idx] === value) return false;
  chunk.skyLight[idx] = value;
  chunk.dirty = true;
  return true;
}

function isOpaque(world: World, x: number, y: number, z: number): boolean {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cy = Math.floor(y / CHUNK_SIZE);
  const cz = Math.floor(z / CHUNK_SIZE);
  const chunk = world.getChunk({ cx, cy, cz });
  if (!chunk) return false;
  const lx = x - cx * CHUNK_SIZE;
  const ly = y - cy * CHUNK_SIZE;
  const lz = z - cz * CHUNK_SIZE;
  return chunk.blocks[localIndex(lx, ly, lz)] !== 0;
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
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    touched.set(`${cx},${cy},${cz}`, { cx, cy, cz });
  };

  const queue: LightNode[] = [];

  if (isOpaque(world, wx, wy, wz)) {
    setLight(world, wx, wy, wz, 0);
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
      setLight(world, wx, wy, wz, best);
      markTouched(wx, wy, wz);
    }
  }

  queue.push({ x: wx, y: wy, z: wz });
  let iterations = 0;
  const MAX_ITERATIONS = 20000; // bounds worst-case cost per edit

  while (queue.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    const node = queue.shift()!;
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
        setLight(world, nx, ny, nz, propagated);
        markTouched(nx, ny, nz);
        queue.push({ x: nx, y: ny, z: nz });
      }
    }
  }

  return [...touched.values()];
}
