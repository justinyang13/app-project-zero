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
    const stone = getBlockByKey("bridge_concrete").id;
    blocks[5 | (5 << 5) | (5 << 10)] = stone;

    const result = meshChunkGreedy(blocks, skyLight, EMPTY_BOUNDARIES);
    // 6 faces, 4 verts/face, 2 triangles (6 indices)/face
    expect(result.positions.length / 3).toBe(24);
    expect(result.indices.length).toBe(36);
  });

  it("greedily merges a flat 32x32 solid slab's top face into a single quad", () => {
    const { blocks, skyLight } = emptyChunk();
    const turf = getBlockByKey("bridge_steel").id;
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
    const stone = getBlockByKey("bridge_concrete").id;
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

  it("routes a leaf voxel's faces into the foliage buffers, not the opaque ones, with UVs", () => {
    const { blocks, skyLight } = emptyChunk();
    const leaves = getBlockByKey("leaves_green").id;
    blocks[5 | (5 << 5) | (5 << 10)] = leaves;

    const result = meshChunkGreedy(blocks, skyLight, EMPTY_BOUNDARIES);
    expect(result.indices.length).toBe(0);
    expect(result.positions.length).toBe(0);
    expect(result.foliageIndices.length).toBe(36);
    expect(result.foliagePositions.length / 3).toBe(24);
    expect(result.foliageUvs.length / 2).toBe(24); // one (u, v) per vertex
  });

  it("does not emit a face between two touching same-color leaf voxels (merges like a solid block would)", () => {
    const { blocks, skyLight } = emptyChunk();
    const green = getBlockByKey("leaves_green").id;
    blocks[5 | (5 << 5) | (5 << 10)] = green;
    blocks[6 | (5 << 5) | (5 << 10)] = green; // touching along +X

    const result = meshChunkGreedy(blocks, skyLight, EMPTY_BOUNDARIES);
    // Same shape as the equivalent solid-block test above: 2 unmerged
    // end-caps (-X, +X) + 4 merged side pairs = 6 quads, not 12.
    expect(result.foliageIndices.length).toBe(6 * 6);
  });

  it("does emit faces on both sides of a boundary between two different-colored leaf voxels", () => {
    const { blocks, skyLight } = emptyChunk();
    const green = getBlockByKey("leaves_green").id;
    const autumn = getBlockByKey("leaves_autumn").id;
    blocks[5 | (5 << 5) | (5 << 10)] = green;
    blocks[6 | (5 << 5) | (5 << 10)] = autumn; // touching along +X, different color

    const result = meshChunkGreedy(blocks, skyLight, EMPTY_BOUNDARIES);
    // Unlike the same-color case, a different-colored neighbor isn't a
    // seam to hide — both voxels render all 6 faces unmerged (nothing
    // shares a blockId to merge with), 12 quads total, including both
    // sides of the boundary they share (you can see through the gaps in
    // one color's cutout pattern to the other color behind it).
    expect(result.foliageIndices.length).toBe(12 * 6);
  });

  it("does not render a face against an opaque neighbor-chunk boundary voxel", () => {
    const { blocks, skyLight } = emptyChunk();
    const stone = getBlockByKey("bridge_concrete").id;
    blocks[(CHUNK_SIZE - 1) | (5 << 5) | (5 << 10)] = stone; // touching the +X chunk edge

    const boundaryPx = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE);
    boundaryPx[5 * CHUNK_SIZE + 5] = stone; // neighbor chunk is solid right there too

    const result = meshChunkGreedy(blocks, skyLight, { ...EMPTY_BOUNDARIES, px: boundaryPx });
    // Only 5 faces exposed now (the +X face is culled by the neighbor).
    expect(result.indices.length).toBe(5 * 6);
  });

  it("routes a textured block's faces into the textured buffers with UVs, tile layers and glow", () => {
    const { blocks, skyLight } = emptyChunk();
    const brick = getBlockByKey("gloom_brick").id;
    blocks[5 | (5 << 5) | (5 << 10)] = brick;

    const result = meshChunkGreedy(blocks, skyLight, EMPTY_BOUNDARIES, () => 9);
    expect(result.indices.length).toBe(0);
    expect(result.texIndices.length).toBe(36);
    expect(result.texPositions.length / 3).toBe(24);
    expect(result.texUvs.length / 2).toBe(24);
    expect(result.texTiles.length / 2).toBe(24);
    expect(result.texGlow.length / 3).toBe(24);
    expect(Array.from(result.texGlow).some((v) => v > 0)).toBe(true); // baked block light reached the face
  });

  it("only merges textured faces that share the same baked glow", () => {
    const { blocks, skyLight } = emptyChunk();
    const brick = getBlockByKey("gloom_brick").id;
    for (let x = 0; x < 4; x++) blocks[x | (0 << 5) | (0 << 10)] = brick;
    const uniform = meshChunkGreedy(blocks, skyLight, EMPTY_BOUNDARIES, () => 5);
    const varied = meshChunkGreedy(blocks, skyLight, EMPTY_BOUNDARIES, (lx) => lx);
    expect(varied.texIndices.length).toBeGreaterThan(uniform.texIndices.length);
  });

  it("draws a flame block as crossed quads (no cube), and never culls its neighbours' faces", () => {
    const { blocks, skyLight } = emptyChunk();
    const flame = getBlockByKey("brazier_flame").id;
    const brick = getBlockByKey("gloom_brick").id;
    blocks[5 | (5 << 5) | (5 << 10)] = flame;
    blocks[6 | (5 << 5) | (5 << 10)] = brick;
    const result = meshChunkGreedy(blocks, skyLight, EMPTY_BOUNDARIES);
    // The brick keeps all six faces (a flame doesn't hide the one it touches) = 24 verts; the flame adds 2 quads x 2 windings.
    expect(result.texPositions.length / 3).toBe(24 + 8);
    expect(result.texIndices.length).toBe(36 + 24);
  });

  it("shows a face behind a see-through lattice instead of culling it", () => {
    const { blocks, skyLight } = emptyChunk();
    const lattice = getBlockByKey("ember_lattice").id;
    const brick = getBlockByKey("gloom_brick").id;
    blocks[5 | (5 << 5) | (5 << 10)] = lattice;
    blocks[6 | (5 << 5) | (5 << 10)] = brick;
    const result = meshChunkGreedy(blocks, skyLight, EMPTY_BOUNDARIES);
    // The brick keeps all 6 faces (it sees through the lattice); the lattice loses only the one pressed against opaque brick.
    expect(result.texPositions.length / 3).toBe(44);
  });
});

describe("textured ground", () => {
  it("draws grass, dirt, stone and sand in the textured layer, with position-hashed variants", () => {
    for (const key of ["turf", "loam", "greystone", "dune_sand", "path_gravel", "asphalt"]) {
      const id = getBlockByKey(key).id;
      const blocks = new Uint16Array(32 * 32 * 32);
      blocks[16 | (16 << 5) | (16 << 10)] = id;
      const mesh = meshChunkGreedy(blocks, new Uint8Array(32 * 32 * 32).fill(15), EMPTY_BOUNDARIES);
      expect(mesh.indices.length, `${key} is not in the flat layer`).toBe(0);
      expect(mesh.texIndices.length, key).toBe(36);
      // Every face carries a negative frame count: "pick one of N looks by block position".
      const variantCounts = new Set<number>();
      for (let i = 1; i < mesh.texTiles.length; i += 2) variantCounts.add(mesh.texTiles[i]);
      expect([...variantCounts].every((v) => v <= -2), key).toBe(true);
    }
  });
});
