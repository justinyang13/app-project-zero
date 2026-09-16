// World data model per spec/23-data-schema-reference.md §4.
import { Chunk, chunkKey, type ChunkCoord } from "./Chunk";

export type WorldType = "standard" | "superflat" | "amplified" | "islands";

export class World {
  readonly seed: number;
  readonly worldType: WorldType;
  worldTime: number;
  readonly chunks: Map<string, Chunk>;
  spawnPoint: { x: number; y: number; z: number };

  constructor(seed: number, worldType: WorldType = "standard") {
    this.seed = seed;
    this.worldType = worldType;
    this.worldTime = 0;
    this.chunks = new Map();
    this.spawnPoint = { x: 0, y: 96, z: 0 };
  }

  getChunk(coord: ChunkCoord): Chunk | undefined {
    return this.chunks.get(chunkKey(coord));
  }

  setChunk(chunk: Chunk): void {
    this.chunks.set(chunkKey(chunk.coord), chunk);
  }

  getBlock(wx: number, wy: number, wz: number): number {
    const cx = Math.floor(wx / 32);
    const cy = Math.floor(wy / 32);
    const cz = Math.floor(wz / 32);
    const chunk = this.getChunk({ cx, cy, cz });
    if (!chunk) return 0;
    return chunk.getBlock(wx - cx * 32, wy - cy * 32, wz - cz * 32);
  }

  setBlock(wx: number, wy: number, wz: number, blockId: number): Chunk | null {
    const cx = Math.floor(wx / 32);
    const cy = Math.floor(wy / 32);
    const cz = Math.floor(wz / 32);
    const chunk = this.getChunk({ cx, cy, cz });
    if (!chunk) return null;
    chunk.setBlock(wx - cx * 32, wy - cy * 32, wz - cz * 32, blockId);
    return chunk;
  }
}
