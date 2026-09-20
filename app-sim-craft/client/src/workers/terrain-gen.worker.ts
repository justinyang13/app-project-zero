// Off-main-thread terrain generation, per
// spec/01-tech-stack-architecture.md §5. Exposes plain-data results
// (not Chunk instances — class methods don't survive structured clone)
// which the main thread turns into real Chunk objects.
import * as Comlink from "comlink";
import { generateColumn as generateColumnPure, sampleBiomeIndexAt } from "../worldgen/terrain";

export interface GeneratedChunkData {
  cx: number;
  cy: number;
  cz: number;
  blocks: Uint16Array;
  skyLight: Uint8Array;
}

const api = {
  generateColumn(seed: number, cx: number, cz: number): GeneratedChunkData[] {
    const chunks = generateColumnPure(seed, cx, cz);
    const results = chunks.map((chunk) => ({
      cx: chunk.coord.cx,
      cy: chunk.coord.cy,
      cz: chunk.coord.cz,
      blocks: chunk.blocks,
      skyLight: chunk.skyLight,
    }));
    const buffers = results.flatMap((r) => [r.blocks.buffer, r.skyLight.buffer]);
    return Comlink.transfer(results, buffers);
  },

  sampleBiomeAt(seed: number, worldX: number, worldZ: number): number {
    return sampleBiomeIndexAt(seed, worldX, worldZ);
  },
};

export type TerrainGenApi = typeof api;

Comlink.expose(api);
