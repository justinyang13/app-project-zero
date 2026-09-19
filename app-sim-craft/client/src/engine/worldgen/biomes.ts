// Scoped-down biome table for the first playable world. The full spec
// (spec/02-world-generation.md §3) is a 28-biome, 2D temperature x
// moisture lookup with per-biome trees/structures/creatures — deferred to
// Phase 5 (spec/22-roadmap-milestones.md). This is a deliberately small
// 1D-temperature slice (3 biomes) so terrain generation is real and
// varied without pulling in vegetation/structures/caves yet.
import { getBlockByKey } from "../../data/blocks";

export interface BiomeDef {
  key: string;
  name: string;
  surfaceBlock: number;
  subsurfaceBlock: number;
  heightBase: number;
  heightAmplitude: number;
}

export const BIOMES: Record<"meadow" | "desert" | "tundra", BiomeDef> = {
  meadow: {
    key: "meadow",
    name: "Meadow",
    surfaceBlock: getBlockByKey("turf").id,
    subsurfaceBlock: getBlockByKey("loam").id,
    heightBase: 68,
    heightAmplitude: 14,
  },
  desert: {
    key: "desert",
    name: "Sunscar Desert",
    surfaceBlock: getBlockByKey("dune_sand").id,
    subsurfaceBlock: getBlockByKey("sandstone").id,
    heightBase: 64,
    heightAmplitude: 8,
  },
  tundra: {
    key: "tundra",
    name: "Frostreach Tundra",
    surfaceBlock: getBlockByKey("snow_turf").id,
    subsurfaceBlock: getBlockByKey("loam").id,
    heightBase: 70,
    heightAmplitude: 10,
  },
};

/** Picks a biome from a single temperature field in [-1, 1]. */
export function pickBiome(temperature: number): BiomeDef {
  if (temperature < -0.3) return BIOMES.tundra;
  if (temperature > 0.35) return BIOMES.desert;
  return BIOMES.meadow;
}

/** Not a real biome: what columns shaped by the castle's crag report (see worldgen/castle/crag.ts), so the minimaps can draw them as bare dark rock and trees skip them. */
export const CRAG_BIOME: BiomeDef = {
  key: "crag",
  name: "Gloom Crag",
  surfaceBlock: getBlockByKey("gloomstone").id,
  subsurfaceBlock: getBlockByKey("umbral_slate").id,
  heightBase: 68,
  heightAmplitude: 0,
};
