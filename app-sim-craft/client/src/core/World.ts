// World data model per spec/23-data-schema-reference.md §4.
import { CHUNK_SIZE, Chunk, chunkCoordOf, chunkKey, type ChunkCoord } from "./Chunk";

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

  /** The chunk holding a world-space block, and that block's chunk-local coordinates — undefined while the chunk isn't loaded. */
  private locate(wx: number, wy: number, wz: number): { chunk: Chunk; lx: number; ly: number; lz: number } | undefined {
    const coord = chunkCoordOf(wx, wy, wz);
    const chunk = this.getChunk(coord);
    if (!chunk) return undefined;
    return { chunk, lx: wx - coord.cx * CHUNK_SIZE, ly: wy - coord.cy * CHUNK_SIZE, lz: wz - coord.cz * CHUNK_SIZE };
  }

  /** Block id at a world position; air (0) wherever no chunk is loaded. */
  getBlock(wx: number, wy: number, wz: number): number {
    const at = this.locate(wx, wy, wz);
    return at ? at.chunk.getBlock(at.lx, at.ly, at.lz) : 0;
  }

  setBlock(wx: number, wy: number, wz: number, blockId: number): Chunk | null {
    const at = this.locate(wx, wy, wz);
    if (!at) return null;
    at.chunk.setBlock(at.lx, at.ly, at.lz, blockId);
    return at.chunk;
  }

  /** Sky-light level (0-15) at a world position, or undefined while its chunk isn't loaded. */
  getSkyLight(wx: number, wy: number, wz: number): number | undefined {
    const at = this.locate(wx, wy, wz);
    return at ? at.chunk.getSkyLight(at.lx, at.ly, at.lz) : undefined;
  }

  /** Returns whether the stored value changed (false too when the chunk isn't loaded). */
  setSkyLight(wx: number, wy: number, wz: number, value: number): boolean {
    const at = this.locate(wx, wy, wz);
    return at ? at.chunk.setSkyLight(at.lx, at.ly, at.lz, value) : false;
  }
}
