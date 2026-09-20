// Chunk data model per spec/23-data-schema-reference.md §4 and
// spec/01-tech-stack-architecture.md §4 (32^3 blocks, bit-shift indexing).
// Every piece of chunk arithmetic (size, indexing, world<->chunk conversion)
// lives here so nothing else needs to know that a chunk is 32 wide.
import { AIR_ID } from "../data/blocks";

export const CHUNK_BITS = 5;
export const CHUNK_SIZE = 1 << CHUNK_BITS;
export const CHUNK_MASK = CHUNK_SIZE - 1;
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;

export interface ChunkCoord {
  cx: number;
  cy: number;
  cz: number;
}

export function chunkKey(coord: ChunkCoord): string {
  return `${coord.cx},${coord.cy},${coord.cz}`;
}

/** The chunk containing a world-space block position. */
export function chunkCoordOf(wx: number, wy: number, wz: number): ChunkCoord {
  return { cx: Math.floor(wx / CHUNK_SIZE), cy: Math.floor(wy / CHUNK_SIZE), cz: Math.floor(wz / CHUNK_SIZE) };
}

/** Index into a chunk's flat arrays for a chunk-local coordinate. */
export function localIndex(x: number, y: number, z: number): number {
  return x | (y << CHUNK_BITS) | (z << (CHUNK_BITS * 2));
}

export function localX(index: number): number {
  return index & CHUNK_MASK;
}

export function localY(index: number): number {
  return (index >> CHUNK_BITS) & CHUNK_MASK;
}

export function localZ(index: number): number {
  return (index >> (CHUNK_BITS * 2)) & CHUNK_MASK;
}

export class Chunk {
  readonly coord: ChunkCoord;
  readonly blocks: Uint16Array;
  readonly skyLight: Uint8Array;
  readonly blockLight: Uint8Array;
  dirty: boolean;
  modifiedFromGenerated: boolean;

  constructor(coord: ChunkCoord, blocks?: Uint16Array, skyLight?: Uint8Array, blockLight?: Uint8Array) {
    this.coord = coord;
    this.blocks = blocks ?? new Uint16Array(CHUNK_VOLUME);
    this.skyLight = skyLight ?? new Uint8Array(CHUNK_VOLUME).fill(15);
    this.blockLight = blockLight ?? new Uint8Array(CHUNK_VOLUME);
    this.dirty = true;
    this.modifiedFromGenerated = false;
  }

  getBlock(x: number, y: number, z: number): number {
    if (x < 0 || y < 0 || z < 0 || x >= CHUNK_SIZE || y >= CHUNK_SIZE || z >= CHUNK_SIZE) {
      return AIR_ID;
    }
    return this.blocks[localIndex(x, y, z)];
  }

  setBlock(x: number, y: number, z: number, blockId: number): void {
    this.blocks[localIndex(x, y, z)] = blockId;
    this.dirty = true;
    this.modifiedFromGenerated = true;
  }

  getSkyLight(x: number, y: number, z: number): number {
    return this.skyLight[localIndex(x, y, z)];
  }

  /** Returns whether the value actually changed (and so the chunk needs re-meshing). */
  setSkyLight(x: number, y: number, z: number, value: number): boolean {
    const index = localIndex(x, y, z);
    if (this.skyLight[index] === value) return false;
    this.skyLight[index] = value;
    this.dirty = true;
    return true;
  }
}
