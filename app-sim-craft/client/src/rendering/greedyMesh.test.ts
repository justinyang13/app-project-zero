import { describe, expect, it } from "vitest";
import { meshChunkGreedy } from "./greedyMesh";
import { CHUNK_SIZE, CHUNK_VOLUME } from "../engine/Chunk";
import { getBlockByKey } from "../data/blocks";

const EMPTY_BOUNDARIES = { px: null, nx: null, py: null, ny: null, pz: null, nz: null };

function emptyChunk() {
  return {
    blocks: new Uint16Array(CHUNK_VOLUME),
    skyLight: new Uint8Array(CHUNK_VOLUME).fill(15),
  };
}

describe("meshChunkGreedy", () => {
  it("emits nothing for a fully empty chunk", () => {
    const { blocks, skyLight } = emptyChunk();
    const result = meshChunkGreedy(blocks, skyLight, EMPTY_BOUNDARIES);
    expect(result.indices.length).toBe(0);
    expect(result.positions.length).toBe(0);
  });

  it("emits exactly one merged quad per face for a single solid voxel surrounded by air", () => {
    const { blocks, skyLight } = emptyChunk();
    const stone = getBlockByKey("greystone").id;
    blocks[5 | (5 << 5) | (5 << 10)] = stone;

    const result = meshChunkGreedy(blocks, skyLight, EMPTY_BOUNDARIES);
    // 6 faces, 4 verts/face, 2 triangles (6 indices)/face
    expect(result.positions.length / 3).toBe(24);
    expect(result.indices.length).toBe(36);
  });

  it("greedily merges a flat 32x32 solid slab's top face into a single quad", () => {
    const { blocks, skyLight } = emptyChunk();
    const turf = getBlockByKey("turf").id;
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        blocks[x | (0 << 5) | (z << 10)] = turf; // a full y=0 layer, nothing above or below it
      }
    }

    const result = meshChunkGreedy(blocks, skyLight, EMPTY_BOUNDARIES);
    // A full 32x32 slab has a top face, a bottom face, and 4 perimeter
    // side walls (each a 32x1 strip that merges into one quad) — 6 quads
    // total, not 32*32*6 unmerged faces. This is greedy meshing's entire
    // point (spec/10-lighting-rendering.md §3).
    expect(result.indices.length).toBe(6 * 6);
  });

  it("does not emit a face between two touching solid voxels of the same block", () => {
    const { blocks, skyLight } = emptyChunk();
    const stone = getBlockByKey("greystone").id;
    blocks[5 | (5 << 5) | (5 << 10)] = stone;
    blocks[6 | (5 << 5) | (5 << 10)] = stone; // touching along +X

    const result = meshChunkGreedy(blocks, skyLight, EMPTY_BOUNDARIES);
    // 10 exposed faces total (6+6, minus the 2 hidden at the shared
    // seam), but greedy merging collapses 4 of the 6 directions
    // (top/bottom/front/back) into one rectangle each, since both cubes'
    // faces are coplanar, adjacent, and same block+light: 2 unmerged
    // end-caps (-X, +X) + 4 merged pairs = 6 quads, not 10.
    expect(result.indices.length).toBe(6 * 6);
  });

  it("does not render a face against an opaque neighbor-chunk boundary voxel", () => {
    const { blocks, skyLight } = emptyChunk();
    const stone = getBlockByKey("greystone").id;
    blocks[(CHUNK_SIZE - 1) | (5 << 5) | (5 << 10)] = stone; // touching the +X chunk edge

    const boundaryPx = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE);
    boundaryPx[5 * CHUNK_SIZE + 5] = stone; // neighbor chunk is solid right there too

    const result = meshChunkGreedy(blocks, skyLight, { ...EMPTY_BOUNDARIES, px: boundaryPx });
    // Only 5 faces exposed now (the +X face is culled by the neighbor).
    expect(result.indices.length).toBe(5 * 6);
  });
});
