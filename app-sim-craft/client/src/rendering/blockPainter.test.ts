import { describe, expect, it } from "vitest";
import { paintAllTiles } from "./blockPainter";
import { TEXTURE_LAYER_COUNT, TEXTURE_SIZE, textureFrames, textureLayer } from "../data/blockTextures";
import { BLOCKS } from "../data/blocks";

describe("block texture painters", () => {
  const tiles = paintAllTiles();

  it("paints exactly one 16x16 RGBA tile per texture layer", () => {
    expect(tiles.length).toBe(TEXTURE_LAYER_COUNT);
    for (const t of tiles) {
      expect(t.albedo.length).toBe(TEXTURE_SIZE * TEXTURE_SIZE * 4);
      expect(t.emissive.length).toBe(TEXTURE_SIZE * TEXTURE_SIZE * 4);
    }
  });

  it("is deterministic", () => {
    const again = paintAllTiles();
    expect(again[3].albedo).toEqual(tiles[3].albedo);
  });

  it("makes see-through textures partly transparent and solid ones fully opaque", () => {
    const alphaOf = (key: string): number[] => {
      const layer = textureLayer(key);
      return Array.from({ length: TEXTURE_SIZE * TEXTURE_SIZE }, (_, i) => tiles[layer].albedo[i * 4 + 3]);
    };
    for (const key of ["ember_lattice", "dark_lattice", "iron_grate", "brazier_flame"]) {
      const a = alphaOf(key);
      expect(a.some((v) => v === 0)).toBe(true);
      expect(a.some((v) => v === 255)).toBe(true);
    }
    for (const key of ["gloom_brick", "magma", "gloomstone", "oak_bark", "birch_bark", "cherry_bark", "willow_bark", "snow_top", "snow_side", "oak_log_top", "birch_log_top"]) {
      expect(alphaOf(key).every((v) => v === 255)).toBe(true);
    }
    const vine = alphaOf("glow_vine");
    expect(vine.filter((v) => v === 0).length).toBeGreaterThan(100); // mostly air around a thin strand
    expect(vine.some((v) => v === 255)).toBe(true);
  });

  it("gives emissive textures some glowing pixels", () => {
    for (const key of ["magma", "ember_lattice", "brazier_flame", "ember_lamp", "glow_vine"]) {
      const layer = textureLayer(key);
      let lit = 0;
      for (let i = 0; i < TEXTURE_SIZE * TEXTURE_SIZE; i++) lit += tiles[layer].emissive[i * 4 + 3] > 0 ? 1 : 0;
      expect(lit).toBeGreaterThan(key === "glow_vine" ? 2 : 8);
    }
  });

  it("animates lava and flames across distinct frames", () => {
    expect(textureFrames("magma")).toBe(8);
    const first = tiles[textureLayer("magma")].albedo;
    const later = tiles[textureLayer("magma") + 3].albedo;
    expect(first).not.toEqual(later);
  });

  it("gives every textured block a resolvable texture", () => {
    for (const def of BLOCKS) {
      if (!def.tex) continue;
      for (const key of [def.tex.all, def.tex.top, def.tex.bottom, def.tex.side]) {
        if (key) expect(() => textureLayer(key)).not.toThrow();
      }
    }
  });
});
