// Off-main-thread greedy meshing, per spec/01-tech-stack-architecture.md
// §5. Takes a chunk's own block/light data plus its 6 face-adjacent
// neighbor boundary layers (needed for correct cross-chunk face culling)
// and returns transferable vertex buffers.
import * as Comlink from "comlink";
import { meshChunkGreedy, type BoundaryLayers, type MeshedChunk } from "../rendering/greedyMesh";

const api = {
  meshChunk(blocks: Uint16Array, skyLight: Uint8Array, boundaries: BoundaryLayers): MeshedChunk {
    const result = meshChunkGreedy(blocks, skyLight, boundaries);
    return Comlink.transfer(result, [
      result.positions.buffer,
      result.normals.buffer,
      result.colors.buffer,
      result.indices.buffer,
    ]);
  },
};

export type MeshApi = typeof api;

Comlink.expose(api);
