// Voxel-stepped raycasting for block targeting, per
// spec/05-player-mechanics.md §4 (DDA algorithm, 5-block reach).
import { AIR_ID, getBlockById } from "../data/blocks";
import type { World } from "../core/World";

export interface RaycastHit {
  block: { x: number; y: number; z: number };
  blockId: number;
  /** Outward face normal of the hit block (the face the ray entered through). */
  normal: { x: number; y: number; z: number };
  /** Where a newly placed block would go (block position + normal). */
  placeAt: { x: number; y: number; z: number };
}

export const DEFAULT_REACH = 5;

export function raycastVoxels(
  world: World,
  origin: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
  maxDistance: number = DEFAULT_REACH,
): RaycastHit | null {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = Math.sign(direction.x);
  const stepY = Math.sign(direction.y);
  const stepZ = Math.sign(direction.z);

  const tDeltaX = direction.x !== 0 ? Math.abs(1 / direction.x) : Infinity;
  const tDeltaY = direction.y !== 0 ? Math.abs(1 / direction.y) : Infinity;
  const tDeltaZ = direction.z !== 0 ? Math.abs(1 / direction.z) : Infinity;

  let tMaxX = stepX !== 0 ? ((stepX > 0 ? x + 1 - origin.x : origin.x - x) * tDeltaX) : Infinity;
  let tMaxY = stepY !== 0 ? ((stepY > 0 ? y + 1 - origin.y : origin.y - y) * tDeltaY) : Infinity;
  let tMaxZ = stepZ !== 0 ? ((stepZ > 0 ? z + 1 - origin.z : origin.z - z) * tDeltaZ) : Infinity;

  let normal = { x: 0, y: 1, z: 0 };
  let t = 0;

  while (t <= maxDistance) {
    const blockId = world.getBlock(x, y, z);
    if (blockId !== AIR_ID && getBlockById(blockId).solid) {
      return {
        block: { x, y, z },
        blockId,
        normal,
        placeAt: { x: x + normal.x, y: y + normal.y, z: z + normal.z },
      };
    }

    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX;
      t = tMaxX;
      tMaxX += tDeltaX;
      normal = { x: -stepX, y: 0, z: 0 };
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      t = tMaxY;
      tMaxY += tDeltaY;
      normal = { x: 0, y: -stepY, z: 0 };
    } else {
      z += stepZ;
      t = tMaxZ;
      tMaxZ += tDeltaZ;
      normal = { x: 0, y: 0, z: -stepZ };
    }
  }

  return null;
}
