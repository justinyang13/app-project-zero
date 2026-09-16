// Chunk data model per spec/23-data-schema-reference.md §4 and
// spec/01-tech-stack-architecture.md §4 (32^3 blocks, bit-shift indexing).
import { AIR_ID } from "../data/blocks";

export const CHUNK_SIZE = 32;
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;

export interface ChunkCoord {
  cx: number;
  cy: number;
  cz: number;
}

export function chunkKey(coord: ChunkCoord): string {
  return `${coord.cx},${coord.cy},${coord.cz}`;
}

export function localIndex(x: number, y: number, z: number): number {
  return x | (y << 5) | (z << 10);
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
}
