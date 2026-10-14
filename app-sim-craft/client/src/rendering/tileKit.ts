// Shared drawing kit for the procedural 16x16 pixel-art painters
// (blockPainter.ts, frostPainter.ts): deterministic hashes and value noise,
// color math, and the Tile buffer pair every painter fills.
import { TEXTURE_SIZE as S } from "../data/blockTextures";

export type RGB = readonly [number, number, number];

export interface PaintedTile {
  albedo: Uint8Array; // S*S*4, sRGB
  emissive: Uint8Array; // S*S*4, sRGB (alpha unused)
}

export function hash(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function wrap(v: number): number {
  return ((v % S) + S) % S;
}

export function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function scale(c: RGB, f: number): RGB {
  return [c[0] * f, c[1] * f, c[2] * f];
}

/** Tileable value noise on the 16x16 tile (period = S / cell), smoothly interpolated. */
export function tileNoise(x: number, y: number, cell: number, seed: number): number {
  const period = Math.max(1, Math.round(S / cell));
  const fx = x / cell;
  const fy = y / cell;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const at = (ix: number, iy: number) => hash(((ix % period) + period) % period, ((iy % period) + period) % period, seed);
  const a = at(x0, y0);
  const b = at(x0 + 1, y0);
  const c = at(x0, y0 + 1);
  const d = at(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export class Tile {
  readonly albedo = new Uint8Array(S * S * 4);
  readonly emissive = new Uint8Array(S * S * 4);

  set(x: number, y: number, c: RGB, alpha = 255): void {
    const i = (wrap(y) * S + wrap(x)) * 4;
    this.albedo[i] = clamp255(c[0]);
    this.albedo[i + 1] = clamp255(c[1]);
    this.albedo[i + 2] = clamp255(c[2]);
    this.albedo[i + 3] = alpha;
  }

  glow(x: number, y: number, c: RGB): void {
    const i = (wrap(y) * S + wrap(x)) * 4;
    this.emissive[i] = clamp255(c[0]);
    this.emissive[i + 1] = clamp255(c[1]);
    this.emissive[i + 2] = clamp255(c[2]);
    this.emissive[i + 3] = 255;
  }

  get(x: number, y: number): RGB {
    const i = (wrap(y) * S + wrap(x)) * 4;
    return [this.albedo[i], this.albedo[i + 1], this.albedo[i + 2]];
  }

  fill(fn: (x: number, y: number) => RGB): void {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) this.set(x, y, fn(x, y));
  }
}

/** A per-pixel brightness wobble so flat colors read as rough stone instead of paint. */
export function grain(x: number, y: number, seed: number, amount: number): number {
  return 1 + (hash(x, y, seed) - 0.5) * 2 * amount;
}
