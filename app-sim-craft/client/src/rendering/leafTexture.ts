// A procedural, tileable alpha-cutout leaf pattern — no external image
// assets in this project, so it's drawn on a canvas at runtime. The
// texture is *grayscale* leaf clumps (light highlights, mid tones, dark
// crevices) over transparent gaps; each leaf block's own tinted vertex
// color multiplies it, so one pattern gives every species — crimson maple,
// blush cherry, lime oak, deep-green willow — real depth and dappled light
// instead of a flat wash of one color. Cut out via the material's
// alphaTest rather than alpha blending, so there's no transparency sort
// order to get wrong against the rest of the chunk (see
// engine/ChunkManager.ts's foliageMaterial). Main-thread only (uses the
// DOM canvas API) — call this from ChunkManager, not from inside the mesh
// worker.
import * as THREE from "three";

const GRID = 16; // logical pixels across one tile
const CELL_PX = 4; // canvas pixels per logical pixel — small and blocky, not photographic
const SIZE = GRID * CELL_PX;

// Deterministic per-pixel values — no Math.random, since the texture must
// look identical on every load rather than reshuffle per session.
function hash(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth, tileable value noise over the GRID x GRID tile. */
function noise(x: number, y: number, cell: number, seed: number): number {
  const period = Math.max(1, Math.round(GRID / cell));
  const fx = x / cell;
  const fy = y / cell;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const at = (ix: number, iy: number): number => hash(((ix % period) + period) % period, ((iy % period) + period) % period, seed);
  const a = at(x0, y0);
  const b = at(x0 + 1, y0);
  const c = at(x0, y0 + 1);
  const d = at(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Gray level (0-255) of a leaf pixel, or -1 for a see-through gap. */
export function leafPixel(x: number, y: number): number {
  const clump = noise(x, y, 4, 601);
  const gapNoise = noise(x + 3, y + 5, 3, 602) * 0.6 + hash(x, y, 603) * 0.4;
  // Gaps open up mostly where the clump noise is low, so leaves cluster into readable shapes.
  if (gapNoise < 0.2 + (1 - clump) * 0.16) return -1;
  const shade = 0.6 + clump * 0.28 + hash(x, y, 604) * 0.16;
  // A light catch on the upper-left of each leaf, a darker crevice below-right where a neighbor gap sits.
  const upLeftGap = noise(x - 1, y - 1, 3, 602) * 0.6 + hash(x - 1, y - 1, 603) * 0.4 < 0.2 + (1 - noise(x - 1, y - 1, 4, 601)) * 0.16;
  const downRightGap = noise(x + 1, y + 1, 3, 602) * 0.6 + hash(x + 1, y + 1, 603) * 0.4 < 0.2 + (1 - noise(x + 1, y + 1, 4, 601)) * 0.16;
  let level = shade;
  if (upLeftGap) level += 0.14;
  if (downRightGap) level -= 0.16;
  return Math.max(0, Math.min(255, Math.round(level * 255)));
}

let cached: THREE.CanvasTexture | null = null;

export function getLeafTexture(): THREE.CanvasTexture {
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("leafTexture: 2D canvas context unavailable");

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const level = leafPixel(x, y);
      if (level < 0) continue;
      ctx.fillStyle = `rgb(${level},${level},${level})`;
      ctx.fillRect(x * CELL_PX, y * CELL_PX, CELL_PX, CELL_PX);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  cached = texture;
  return texture;
}
