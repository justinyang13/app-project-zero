// Procedural 16x16 pixel-art painters for the castle's block textures — no
// image assets in this project, so each tile is drawn from a few
// deterministic hashes (never Math.random: a texture must look identical
// on every load). Pure functions over plain byte arrays with no DOM/three
// dependency, so they run (and are unit-testable) anywhere; the browser
// side just uploads the results into a texture array (see
// rendering/blockTextureArray.ts). Each painter fills two RGBA buffers:
// `albedo` (the lit surface color, alpha = cut-out mask for see-through
// textures) and `emissive` (light the pixel gives off regardless of
// scene lighting — lava, window glass, flames, ember veins).
import { TEXTURE_DEFS, TEXTURE_SIZE as S, textureFrames } from "../data/blockTextures";

export type RGB = readonly [number, number, number];

export interface PaintedTile {
  albedo: Uint8Array; // S*S*4, sRGB
  emissive: Uint8Array; // S*S*4, sRGB (alpha unused)
}

function hash(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function wrap(v: number): number {
  return ((v % S) + S) % S;
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function scale(c: RGB, f: number): RGB {
  return [c[0] * f, c[1] * f, c[2] * f];
}

/** Tileable value noise on the 16x16 tile (period = S / cell), smoothly interpolated. */
function tileNoise(x: number, y: number, cell: number, seed: number): number {
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

class Tile {
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

// --- palettes ---------------------------------------------------------
const STONE: RGB = [46, 42, 50];
const BRICK: RGB = [62, 57, 68];
const MORTAR: RGB = [24, 22, 28];
const MOSS_DARK: RGB = [34, 58, 30];
const MOSS_LIGHT: RGB = [58, 88, 40];

/** A per-pixel brightness wobble so flat colors read as rough stone instead of paint. */
function grain(x: number, y: number, seed: number, amount: number): number {
  return 1 + (hash(x, y, seed) - 0.5) * 2 * amount;
}

// --- individual painters ---------------------------------------------

function paintGloomstone(t: Tile): void {
  t.fill((x, y) => {
    const blob = hash(x >> 1, y >> 1, 11);
    const n = hash(x, y, 12);
    let c = scale(STONE, 0.82 + blob * 0.36 + (n - 0.5) * 0.14);
    if (n > 0.94) c = mix(c, [86, 80, 94], 0.7);
    else if (n < 0.05) c = scale(c, 0.55);
    return c;
  });
}

function brickPixel(x: number, y: number, seed: number, base: RGB): { color: RGB; mortar: boolean } {
  const row = y >> 2;
  const offset = (row & 1) * 4;
  const inRow = y & 3;
  const bx = (x + offset) & 7;
  if (inRow === 3 || bx === 7) return { color: scale(MORTAR, 0.8 + hash(x, y, seed + 1) * 0.4), mortar: true };
  const brickId = ((x + offset) >> 3) + row * 3;
  const tint = 0.86 + hash(brickId, row, seed) * 0.28;
  let c = scale(base, tint * grain(x, y, seed + 2, 0.07));
  if (inRow === 0) c = scale(c, 1.14); // lit top edge
  else if (inRow === 2) c = scale(c, 0.9); // shadowed lower edge
  return { color: c, mortar: false };
}

function paintBrick(t: Tile, seed: number, base: RGB): void {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) t.set(x, y, brickPixel(x, y, seed, base).color);
}

function paintBrickCracked(t: Tile): void {
  paintBrick(t, 21, BRICK);
  // Two jagged cracks wandering down the tile, plus a few missing chips.
  for (const [startX, seed] of [[3, 1], [10, 2]] as const) {
    let x = startX;
    for (let y = 0; y < S; y++) {
      t.set(x, y, [16, 14, 20]);
      const r = hash(x, y, 30 + seed);
      if (r < 0.34) x -= 1;
      else if (r > 0.66) x += 1;
      if (hash(x, y, 40 + seed) < 0.3) t.set(x + 1, y, [22, 20, 27]);
    }
  }
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(hash(i, 3, 50) * S);
    const y = Math.floor(hash(i, 4, 50) * S);
    t.set(x, y, MORTAR);
  }
}

function paintBrickMossy(t: Tile): void {
  paintBrick(t, 31, BRICK);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const patch = tileNoise(x, y, 5, 61);
      const n = hash(x, y, 62);
      // Moss creeps up from the bottom of the tile and collects in patches.
      const cover = patch * 0.75 + (y / S) * 0.35 - 0.2;
      if (cover > 0.55 && n > 0.22) t.set(x, y, n > 0.62 ? MOSS_LIGHT : MOSS_DARK);
    }
  }
}

function paintPolished(t: Tile): void {
  t.fill((x, y) => {
    let c = scale([54, 50, 60], grain(x, y, 71, 0.035));
    if (x === 0 || y === 0) c = scale(c, 1.28);
    if (x === S - 1 || y === S - 1) c = scale(c, 0.66);
    return c;
  });
}

function paintRuned(t: Tile): void {
  paintPolished(t);
  // A carved diamond-and-eye sigil whose grooves smolder red.
  const groove: RGB = [20, 16, 22];
  const ember: RGB = [214, 52, 30];
  const cells: [number, number][] = [];
  for (let i = 0; i <= 5; i++) {
    cells.push([7 - i, 2 + i], [8 + i, 2 + i], [7 - i, 13 - i], [8 + i, 13 - i]);
  }
  cells.push([7, 6], [8, 6], [7, 9], [8, 9], [6, 7], [9, 7], [6, 8], [9, 8], [7, 7], [8, 8]);
  for (const [x, y] of cells) {
    t.set(x, y, groove);
    t.glow(x, y, scale(ember, 0.55 + hash(x, y, 72) * 0.25));
  }
  t.glow(7, 7, [255, 150, 60]);
  t.glow(8, 8, [255, 150, 60]);
}

function paintColumnSide(t: Tile): void {
  t.fill((x, y) => {
    let c = scale([50, 46, 56], grain(x, y, 81, 0.03));
    const g = x & 3;
    if (g === 0) c = scale(c, 0.72);
    else if (g === 1) c = scale(c, 1.2);
    if (y < 2 || y > S - 3) c = scale([64, 60, 72], grain(x, y, 82, 0.04)); // capital/base band
    if (y === 2 || y === S - 3) c = scale(c, 0.6);
    return c;
  });
}

function paintUmbralSlate(t: Tile): void {
  t.fill((x, y) => {
    const streak = hash(0, y, 91);
    const n = hash(x, y, 92);
    let c = scale([30, 30, 38], 0.85 + streak * 0.3 + (n - 0.5) * 0.12);
    if (n > 0.95) c = scale(c, 1.6);
    return c;
  });
}

function paintUmbralCobble(t: Tile): void {
  // Nearest-of-jittered-points cells give irregular cobbles; pixels where
  // the two nearest centers are almost equidistant become the dark seams.
  const centers: { x: number; y: number }[] = [];
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 4; gx++) {
      centers.push({ x: gx * 4 + 0.5 + hash(gx, gy, 101) * 3, y: gy * 4 + 0.5 + hash(gx, gy, 102) * 3 });
    }
  }
  t.fill((x, y) => {
    let best = Infinity;
    let second = Infinity;
    let bestId = 0;
    for (let i = 0; i < centers.length; i++) {
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S], [S, S], [-S, -S], [S, -S], [-S, S]] as const) {
        const d = Math.hypot(x - (centers[i].x + ox), y - (centers[i].y + oy));
        if (d < best) {
          second = best;
          best = d;
          bestId = i;
        } else if (d < second) second = d;
      }
    }
    if (second - best < 0.9) return [15, 15, 20];
    return scale([36, 36, 44], (0.8 + hash(bestId, 1, 103) * 0.4) * grain(x, y, 104, 0.06));
  });
}

function paintMossTop(t: Tile): void {
  t.fill((x, y) => {
    const n = hash(x, y, 111);
    const patch = tileNoise(x, y, 4, 112);
    let c = mix(MOSS_DARK, MOSS_LIGHT, patch * 0.8);
    c = scale(c, 0.85 + n * 0.3);
    if (n > 0.93) c = [88, 110, 50];
    else if (n < 0.06) c = [22, 40, 22];
    return c;
  });
}

function paintMossSide(t: Tile): void {
  paintUmbralCobble(t);
  for (let x = 0; x < S; x++) {
    const drip = 3 + Math.floor(hash(x, 0, 121) * 4); // ragged fringe, 3-6 rows deep
    for (let y = 0; y < drip; y++) {
      const n = hash(x, y, 122);
      t.set(x, y, scale(y < 2 ? MOSS_LIGHT : MOSS_DARK, 0.85 + n * 0.3));
    }
  }
}

/** Value-noise lava, scrolling one full tile over the animation so the loop is seamless. */
function paintMagma(t: Tile, frame: number, frames: number): void {
  const shift = (frame * S) / frames;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const a = tileNoise(x, y + shift, 4, 131);
      const b = tileNoise(x + shift, y, 2, 132);
      const v = a * 0.68 + b * 0.32;
      let c: RGB;
      if (v < 0.36) c = mix([78, 14, 6], [168, 34, 8], v / 0.36); // cooling crust
      else if (v < 0.58) c = mix([214, 58, 10], [255, 118, 18], (v - 0.36) / 0.22);
      else c = mix([255, 150, 30], [255, 226, 110], Math.min(1, (v - 0.58) / 0.3));
      t.set(x, y, c);
      t.glow(x, y, v < 0.36 ? scale(c, 0.85) : c);
    }
  }
}

function paintEmberBrick(t: Tile): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const p = brickPixel(x, y, 141, [50, 38, 40]);
      if (p.mortar) {
        const heat = 0.7 + hash(x, y, 142) * 0.3;
        t.set(x, y, [255 * heat, 96 * heat, 24]);
        t.glow(x, y, [255 * heat, 92 * heat, 22]);
      } else {
        t.set(x, y, p.color);
        if (hash(x, y, 143) > 0.965) t.glow(x, y, [200, 70, 20]);
      }
    }
  }
}

const IRON: RGB = [34, 30, 38];
const IRON_HI: RGB = [78, 72, 88];

/** 2x2 leaded panes (5px each) with 2px iron bars between; the pane corners are see-through. */
function paintLattice(t: Tile, lit: boolean): void {
  const isBar = (v: number) => v <= 1 || (v >= 7 && v <= 8) || v >= 14;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (isBar(x) || isBar(y)) {
        const edge = x === 0 || y === 0 || x === 7 || y === 7 || x === 14 || y === 14;
        t.set(x, y, edge ? IRON_HI : IRON);
        continue;
      }
      const px = x < 7 ? x - 2 : x - 9; // 0..4 within the pane
      const py = y < 7 ? y - 2 : y - 9;
      const corner = (px === 0 || px === 4) && (py === 0 || py === 4);
      if (corner) {
        t.set(x, y, [0, 0, 0], 0); // see-through gap
        continue;
      }
      const centerDist = Math.hypot(px - 2, py - 2) / 2.9;
      if (lit) {
        const c = mix([255, 214, 110], [255, 110, 26], Math.min(1, centerDist * 0.9 + hash(x, y, 151) * 0.18));
        t.set(x, y, c);
        t.glow(x, y, c);
      } else {
        const c = mix([34, 44, 66], [16, 20, 32], centerDist);
        t.set(x, y, scale(c, 0.9 + hash(x, y, 152) * 0.2));
        if (px === 1 && py === 1) t.set(x, y, [82, 98, 130]); // glint
      }
    }
  }
}

function paintIronGrate(t: Tile): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const vertical = (x >= 2 && x <= 3) || (x >= 7 && x <= 8) || (x >= 12 && x <= 13);
      const cross = y >= 7 && y <= 8;
      if (vertical || cross) t.set(x, y, x === 2 || x === 7 || x === 12 || y === 7 ? IRON_HI : IRON);
      else t.set(x, y, [0, 0, 0], 0);
    }
  }
}

/** A flickering pixel flame (cross-plane sprite), swaying differently each frame. */
function paintFlame(t: Tile, frame: number): void {
  for (let y = 0; y < S; y++) t.albedo.fill(0, y * S * 4, (y + 1) * S * 4);
  const bottom = 15;
  const top = 1 + (frame % 3 === 1 ? 1 : 0);
  const height = bottom - top;
  for (let y = top; y <= bottom; y++) {
    const rise = (bottom - y) / height; // 0 at the base, 1 at the tip
    const sway = Math.sin((frame * 1.05 + rise * 3.2) * 1.4) * (0.3 + rise * 1.1);
    const halfWidth = 5.2 * Math.pow(1 - rise, 0.72) + (hash(y, frame, 161) - 0.5) * 1.4;
    const cx = 7.5 + sway;
    for (let x = Math.floor(cx - halfWidth - 1); x <= Math.ceil(cx + halfWidth + 1); x++) {
      const d = Math.abs(x - cx) / Math.max(0.6, halfWidth);
      if (d > 1) continue;
      const heat = (1 - d) * 0.75 + (1 - rise) * 0.35 + (hash(x, y, 162 + frame) - 0.5) * 0.25;
      let c: RGB;
      if (heat > 0.85) c = [255, 244, 170];
      else if (heat > 0.62) c = [255, 190, 50];
      else if (heat > 0.36) c = [246, 112, 22];
      else c = [188, 40, 12];
      t.set(x, y, c);
      t.glow(x, y, c);
    }
  }
  // Loose sparks drifting above the flame.
  for (let i = 0; i < 2; i++) {
    const x = Math.floor(hash(frame, i, 163) * 10) + 3;
    const y = Math.floor(hash(frame, i, 164) * 3);
    t.set(x, y, [255, 176, 60]);
    t.glow(x, y, [255, 176, 60]);
  }
}

function paintAshslate(t: Tile, ridge: boolean): void {
  t.fill((x, y) => {
    const row = y >> 2;
    const inRow = y & 3;
    const offset = (row & 1) * 2;
    const sx = (x + offset) & 3;
    const id = ((x + offset) >> 2) + row * 5;
    let c = scale(ridge ? [58, 62, 78] : [38, 42, 54], (0.88 + hash(id, row, 171) * 0.24) * grain(x, y, 172, 0.05));
    if (inRow === 0) c = scale(c, 1.22);
    if (inRow === 3) c = scale(c, 0.55);
    if (sx === 3) c = scale(c, 0.78);
    return c;
  });
}

function paintCrimsonBrick(t: Tile): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const p = brickPixel(x, y, 181, [96, 40, 36]);
      t.set(x, y, p.mortar ? scale([34, 14, 14], 0.8 + hash(x, y, 182) * 0.4) : p.color);
    }
  }
}

function paintNightglass(t: Tile): void {
  t.fill((x, y) => {
    const n = hash(x, y, 191);
    let c = scale([18, 14, 28], 0.85 + n * 0.3);
    if ((x + y) % 7 === 0) c = mix(c, [60, 42, 96], 0.45);
    if (n > 0.965) c = [70, 52, 112];
    return c;
  });
}

function paintBrazierTop(t: Tile): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const rim = x < 2 || y < 2 || x > S - 3 || y > S - 3;
      if (rim) {
        t.set(x, y, x === 0 || y === 0 ? IRON_HI : IRON);
        continue;
      }
      const n = hash(x, y, 201);
      const glowing = n > 0.42;
      t.set(x, y, glowing ? [255, 130 + n * 90, 34] : [36, 24, 22]);
      if (glowing) t.glow(x, y, [255, 110 + n * 80, 30]);
    }
  }
}

function paintBrazierSide(t: Tile): void {
  t.fill((x, y) => {
    let c: RGB = scale([40, 37, 45], grain(x, y, 211, 0.06));
    if (y < 2 || y > S - 3) c = scale(IRON_HI, 0.8);
    if ((x === 3 || x === 12) && (y === 4 || y === 11)) c = [92, 86, 100]; // rivets
    return c;
  });
  for (let x = 4; x < 12; x++) {
    if (x === 7 || x === 8) continue;
    for (const y of [6, 7, 8, 9]) {
      t.set(x, y, [58, 22, 12]);
      t.glow(x, y, [255, 106 + (hash(x, y, 212) * 60) | 0, 26]);
    }
  }
}

function paintEmberLamp(t: Tile): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const border = x < 2 || y < 2 || x > S - 3 || y > S - 3;
      const mid = x === 7 || x === 8 || y === 7 || y === 8;
      if (border || mid) {
        t.set(x, y, [44, 34, 28]);
        continue;
      }
      const c = mix([255, 232, 150], [255, 160, 50], Math.hypot(x - 7.5, y - 7.5) / 9);
      t.set(x, y, c);
      t.glow(x, y, c);
    }
  }
}

function paintCrimsonRunner(t: Tile): void {
  t.fill((x, y) => {
    const weave = (x + y) & 1 ? 1.06 : 0.94;
    let c = scale([112, 24, 30], weave * grain(x, y, 221, 0.05));
    if (x === 0 || x === S - 1) c = [22, 10, 12];
    else if (x === 1 || x === S - 2) c = [176, 132, 52];
    else if (x === 2 || x === S - 3) c = [60, 14, 18];
    if (Math.abs(x - 7.5) < 1.6 && (y % 8 === 2 || y % 8 === 3)) c = [176, 132, 52]; // repeating gilded lozenge
    return c;
  });
}

function paintGildedTrim(t: Tile): void {
  t.fill((x, y) => {
    let c = scale([132, 92, 42], grain(x, y, 231, 0.09));
    if (y < 2) c = scale(c, 1.3);
    if (y > S - 3) c = scale(c, 0.55);
    if (x % 8 === 0) c = scale(c, 0.8);
    return c;
  });
}

/** Weathered reddish-brown rock: streaks of rust through dark stone, for the crag's warmer patches. */
function paintRustRock(t: Tile): void {
  t.fill((x, y) => {
    const n = hash(x, y, 241);
    const vein = tileNoise(x, y, 4, 242);
    let c = mix([50, 36, 36], [92, 52, 40], vein * 0.9);
    c = scale(c, 0.82 + n * 0.34);
    if (n > 0.95) c = mix(c, [130, 78, 52], 0.6);
    else if (n < 0.06) c = scale(c, 0.55);
    return c;
  });
}

// --- trees and snow ----------------------------------------------------

/** Vertical bark: dark furrows between raised, mottled ridges, with the odd knot. */
function paintBark(t: Tile, base: RGB, furrow: RGB, light: RGB, seed: number, mossy = false): void {
  t.fill((x, y) => {
    const ridge = tileNoise(x, y * 0.35, 3, seed); // stretched vertically so the grain runs up the trunk
    const groove = (x + Math.floor(hash(y >> 2, 0, seed + 1) * 2)) % 4 === 0;
    let c = mix(base, light, ridge * 0.7);
    if (groove) c = mix(c, furrow, 0.75);
    c = scale(c, grain(x, y, seed + 2, 0.08));
    if (hash(x >> 1, y >> 1, seed + 3) > 0.965) c = mix(c, furrow, 0.85); // knot
    if (mossy && tileNoise(x, y, 5, seed + 4) > 0.66) c = mix(c, [74, 108, 54], 0.75);
    return c;
  });
}

/** A log's cut end: pale heartwood rings inside a bark border. */
function paintLogTop(t: Tile, bark: RGB, wood: RGB, ring: RGB, seed: number): void {
  t.fill((x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 6.5) return scale(bark, grain(x, y, seed, 0.1));
    const rings = Math.floor(d) % 2 === 0 ? wood : ring;
    return scale(rings, grain(x, y, seed + 1, 0.05));
  });
}

/** Paper-white birch bark with the characteristic dark horizontal dashes. */
function paintBirchBark(t: Tile): void {
  t.fill((x, y) => {
    let c: RGB = mix([236, 234, 226], [212, 210, 204], tileNoise(x, y, 4, 501) * 0.6);
    c = scale(c, grain(x, y, 502, 0.04));
    // Dashes: short horizontal marks at pseudo-random spots, clustered in rows.
    const row = hash(0, y, 503);
    const start = Math.floor(hash(y, 1, 504) * S);
    const len = 2 + Math.floor(hash(y, 2, 505) * 4);
    const inDash = row > 0.55 && ((x - start + S) % S) < len;
    if (inDash) c = scale([32, 30, 34], 0.8 + hash(x, y, 506) * 0.5);
    else if (row > 0.55 && ((x - start + S) % S) === len) c = mix(c, [110, 108, 110], 0.5);
    return c;
  });
}

function paintSnowTop(t: Tile): void {
  t.fill((x, y) => {
    const drift = tileNoise(x, y, 4, 511);
    let c = mix([242, 247, 251], [212, 226, 242], drift * 0.65);
    const n = hash(x, y, 512);
    if (n > 0.94) c = [255, 255, 255];
    else if (n < 0.07) c = mix(c, [190, 208, 232], 0.6);
    return c;
  });
}

function paintLoamDirt(t: Tile): void {
  t.fill((x, y) => {
    let c = mix([104, 70, 44], [132, 92, 58], tileNoise(x, y, 3, 521));
    c = scale(c, grain(x, y, 522, 0.1));
    if (hash(x, y, 523) > 0.95) c = mix(c, [150, 148, 140], 0.5); // pebble
    return c;
  });
}

/** Dirt with a ragged snow cap: the layer you see stepping down a snowy slope. */
function paintSnowSide(t: Tile): void {
  paintLoamDirt(t);
  const depth = Array.from({ length: S }, (_, x) => 4 + hash(x, 0, 531) * 3);
  for (let x = 0; x < S; x++) {
    const d = (depth[x] * 2 + depth[(x + S - 1) % S] + depth[(x + 1) % S]) / 4; // smooth the fringe a little
    const rows = Math.round(d);
    for (let y = 0; y < rows; y++) {
      const shade = y === rows - 1 ? 0.88 : 1; // the lower lip of the snow sits in shadow
      const n = hash(x, y, 532);
      let c: RGB = mix([244, 248, 252], [214, 228, 244], y / Math.max(1, rows));
      c = scale(c, shade * (0.97 + n * 0.05));
      t.set(x, y, c);
    }
    if (hash(x, 1, 533) > 0.8) t.set(x, rows, [226, 236, 246]); // a drip of melt
  }
}

/** A hanging vine (drawn on crossed planes): a thin dark strand, small leaves, and glowing berries. */
function paintGlowVine(t: Tile): void {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) t.set(x, y, [0, 0, 0], 0);
  for (let y = 0; y < S; y++) {
    const sway = Math.round(Math.sin(y * 0.55) * 1.2);
    const sx = 7 + sway;
    t.set(sx, y, scale([48, 96, 48], 0.85 + hash(sx, y, 541) * 0.3));
    t.set(sx + 1, y, scale([38, 80, 44], 0.85 + hash(sx, y, 542) * 0.3));
    if (y % 3 === 1) {
      const side = hash(y, 0, 543) < 0.5 ? -1 : 1;
      t.set(sx + (side < 0 ? -1 : 2), y, [104, 188, 78]);
      t.set(sx + (side < 0 ? -2 : 3), y, [128, 210, 92]);
    }
    if (y % 5 === 3) {
      const bx = sx + (hash(y, 1, 544) < 0.5 ? -2 : 3);
      t.set(bx, y + 1, [255, 232, 130]);
      t.glow(bx, y + 1, [255, 226, 120]);
    }
  }
}

const PAINTERS: Record<string, (t: Tile, frame: number, frames: number) => void> = {
  gloomstone: (t) => paintGloomstone(t),
  gloom_brick: (t) => paintBrick(t, 5, BRICK),
  gloom_brick_cracked: (t) => paintBrickCracked(t),
  gloom_brick_mossy: (t) => paintBrickMossy(t),
  gloom_polished: (t) => paintPolished(t),
  gloom_runed: (t) => paintRuned(t),
  gloom_column_side: (t) => paintColumnSide(t),
  umbral_slate: (t) => paintUmbralSlate(t),
  umbral_cobble: (t) => paintUmbralCobble(t),
  gloom_moss_top: (t) => paintMossTop(t),
  gloom_moss_side: (t) => paintMossSide(t),
  magma: (t, f, n) => paintMagma(t, f, n),
  ember_brick: (t) => paintEmberBrick(t),
  ember_lattice: (t) => paintLattice(t, true),
  dark_lattice: (t) => paintLattice(t, false),
  iron_grate: (t) => paintIronGrate(t),
  brazier_flame: (t, f) => paintFlame(t, f),
  ashslate: (t) => paintAshslate(t, false),
  ashslate_ridge: (t) => paintAshslate(t, true),
  crimson_brick: (t) => paintCrimsonBrick(t),
  nightglass: (t) => paintNightglass(t),
  brazier_top: (t) => paintBrazierTop(t),
  brazier_side: (t) => paintBrazierSide(t),
  ember_lamp: (t) => paintEmberLamp(t),
  crimson_runner: (t) => paintCrimsonRunner(t),
  gilded_trim: (t) => paintGildedTrim(t),
  rust_rock: (t) => paintRustRock(t),
  oak_bark: (t) => paintBark(t, [92, 64, 40], [44, 30, 20], [122, 88, 56], 551),
  oak_log_top: (t) => paintLogTop(t, [84, 58, 36], [176, 140, 88], [150, 114, 68], 553),
  birch_bark: (t) => paintBirchBark(t),
  birch_log_top: (t) => paintLogTop(t, [226, 224, 216], [214, 198, 156], [190, 172, 128], 557),
  cherry_bark: (t) => paintBark(t, [86, 42, 50], [42, 18, 24], [128, 66, 74], 561),
  cherry_log_top: (t) => paintLogTop(t, [76, 36, 44], [188, 120, 128], [156, 92, 102], 563),
  willow_bark: (t) => paintBark(t, [108, 96, 74], [58, 50, 38], [138, 124, 96], 571, true),
  willow_log_top: (t) => paintLogTop(t, [96, 84, 62], [178, 156, 108], [146, 126, 84], 573),
  snow_top: (t) => paintSnowTop(t),
  snow_side: (t) => paintSnowSide(t),
  loam_dirt: (t) => paintLoamDirt(t),
  glow_vine: (t) => paintGlowVine(t),
};

/** Paints every texture layer, in registry order (an animated texture yields one tile per frame). */
export function paintAllTiles(): PaintedTile[] {
  const out: PaintedTile[] = [];
  for (const def of TEXTURE_DEFS) {
    const painter = PAINTERS[def.key];
    if (!painter) throw new Error(`No painter for block texture: ${def.key}`);
    const frames = textureFrames(def.key);
    for (let f = 0; f < frames; f++) {
      const tile = new Tile();
      painter(tile, f, frames);
      out.push({ albedo: tile.albedo, emissive: tile.emissive });
    }
  }
  return out;
}
