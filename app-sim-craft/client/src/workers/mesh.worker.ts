// Off-main-thread greedy meshing, per spec/01-tech-stack-architecture.md
// §5. Takes a chunk's own block/light data plus its 6 face-adjacent
// neighbor boundary layers (needed for correct cross-chunk face culling)
// and returns transferable vertex buffers.
import * as Comlink from "comlink";
import { meshChunkGreedy, type BoundaryLayers, type MeshedChunk } from "../rendering/greedyMesh";
import { castleBlockLightSampler } from "../engine/worldgen/castle/lightMap";

const api = {
  // (cx, cy, cz) is the chunk's coordinate — the castle's baked block-light
  // map is addressed in world space, so the sampler needs the chunk origin.
  meshChunk(blocks: Uint16Array, skyLight: Uint8Array, boundaries: BoundaryLayers, cx: number, cy: number, cz: number): MeshedChunk {
    const result = meshChunkGreedy(blocks, skyLight, boundaries, castleBlockLightSampler(cx * 32, cy * 32, cz * 32));
    return Comlink.transfer(result, [
      result.positions.buffer,
      result.normals.buffer,
      result.colors.buffer,
      result.indices.buffer,
      result.waterPositions.buffer,
      result.waterNormals.buffer,
      result.waterColors.buffer,
      result.waterIndices.buffer,
      result.foliagePositions.buffer,
      result.foliageNormals.buffer,
      result.foliageColors.buffer,
      result.foliageUvs.buffer,
      result.foliageIndices.buffer,
      result.texPositions.buffer,
      result.texNormals.buffer,
      result.texColors.buffer,
      result.texUvs.buffer,
      result.texTiles.buffer,
      result.texGlow.buffer,
      result.texIndices.buffer,
    ]);
  },
};

export type MeshApi = typeof api;

Comlink.expose(api);
