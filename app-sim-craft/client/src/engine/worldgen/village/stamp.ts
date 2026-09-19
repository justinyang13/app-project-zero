// Copies the village plan (build.ts) over the terrain of one chunk column.
import { CHUNK_SIZE, Chunk } from "../../Chunk";
import { getVillagePlan } from "./build";
import { PLAN_MAX_X, PLAN_MAX_Y, PLAN_MAX_Z, PLAN_MIN_X, PLAN_MIN_Y, PLAN_MIN_Z, UNSET } from "./plan";

/** True if this chunk column overlaps the village's plan box (so it needs stamping, and possibly extra vertical chunks). */
export function chunkOverlapsVillage(cx: number, cz: number): boolean {
  const x0 = cx * CHUNK_SIZE;
  const z0 = cz * CHUNK_SIZE;
  return x0 + CHUNK_SIZE - 1 >= PLAN_MIN_X && x0 <= PLAN_MAX_X && z0 + CHUNK_SIZE - 1 >= PLAN_MIN_Z && z0 <= PLAN_MAX_Z;
}

/** The highest world Y the village reaches. */
export const VILLAGE_TOP_Y = PLAN_MAX_Y;

export function stampVillage(cx: number, cz: number, chunks: Chunk[]): void {
  if (!chunkOverlapsVillage(cx, cz)) return;
  const plan = getVillagePlan();
  const baseX = cx * CHUNK_SIZE;
  const baseZ = cz * CHUNK_SIZE;
  const minX = Math.max(baseX, PLAN_MIN_X);
  const maxX = Math.min(baseX + CHUNK_SIZE - 1, PLAN_MAX_X);
  const minZ = Math.max(baseZ, PLAN_MIN_Z);
  const maxZ = Math.min(baseZ + CHUNK_SIZE - 1, PLAN_MAX_Z);
  for (let y = PLAN_MIN_Y; y <= PLAN_MAX_Y; y++) {
    const cy = Math.floor(y / CHUNK_SIZE);
    const chunk = chunks[cy];
    if (!chunk) continue;
    const ly = y - cy * CHUNK_SIZE;
    for (let wz = minZ; wz <= maxZ; wz++) {
      for (let wx = minX; wx <= maxX; wx++) {
        const block = plan.get(wx, y, wz);
        if (block === UNSET) continue;
        const idx = (wx - baseX) | (ly << 5) | ((wz - baseZ) << 10);
        chunk.blocks[idx] = block;
        chunk.skyLight[idx] = block === 0 ? 15 : 0;
      }
    }
  }
}
