// Pixel-art painters for the ice castle's block textures (the "Frostspire"
// palette): royal-blue castle brick with snow-capped tops, slate-blue glacier
// rock, packed and blue ice, steep blue roofs, glowing amber lancet and
// rose windows, timber, books, and the small things that sell it — icicles,
// frosted lanterns, a faint snowflake on the loose brick that hides a secret
// passage. Same rules as blockPainter.ts: deterministic hashes only, plain
// byte arrays, no DOM. The palette is read off the reference image: lit wall
// blue ~ (47, 106, 222), snow ~ (240, 246, 253), window amber ~ (255, 170, 50).
import { TEXTURE_SIZE as S } from "../data/blockTextures";
import { Tile, grain, hash, mix, scale, tileNoise, type RGB } from "./tileKit";

// --- palette ------------------------------------------------------------
const BLUE_HI: RGB = [128, 186, 255];
const BLUE: RGB = [60, 128, 250];
const BLUE_LO: RGB = [36, 82, 190];
const NAVY: RGB = [22, 46, 118];
const SNOW: RGB = [241, 247, 254];
const SNOW_SHADE: RGB = [188, 208, 240];
const RIME: RGB = [214, 229, 249];
const STONE_PALE: RGB = [148, 184, 238];
const ROCK: RGB = [62, 80, 124];
const ROCK_LO: RGB = [40, 54, 92];
const ROCK_HI: RGB = [92, 112, 160];
// The castle's light is cold: stained glass and lanterns glow icy blue-white, never amber.
const AMBER_HI: RGB = [226, 248, 255];
const AMBER: RGB = [128, 206, 255];
const AMBER_LO: RGB = [52, 136, 238];
const WOOD: RGB = [84, 56, 38];
const WOOD_LO: RGB = [52, 34, 24];
const WOOD_HI: RGB = [124, 86, 56];
const IRON: RGB = [38, 40, 56];
const IRON_HI: RGB = [92, 98, 124];

type Painter = (t: Tile, frame: number, frames: number) => void;

// --- brick family -----------------------------------------------------------

interface BrickPix {
  color: RGB;
  mortar: boolean;
}

/** Running-bond brick, 8x4 px, with a lit top edge and a shaded lower edge — the same bond as the dark castle's so the two read as cousins. */
function frostBrickPixel(x: number, y: number, seed: number): BrickPix {
  const row = y >> 2;
  const offset = (row & 1) * 4;
  const inRow = y & 3;
  const bx = (x + offset) & 7;
  if (inRow === 3 || bx === 7) return { color: scale(NAVY, 0.85 + hash(x, y, seed + 1) * 0.4), mortar: true };
  const brickId = ((x + offset) >> 3) + row * 3;
  const tint = 0.86 + hash(brickId, row, seed) * 0.3;
  let c = scale(BLUE, tint * grain(x, y, seed + 2, 0.07));
  if (inRow === 0) c = mix(c, BLUE_HI, 0.38); // lit top edge
  else if (inRow === 2) c = mix(c, BLUE_LO, 0.35); // shadowed lower edge
  if (bx === 0 && inRow < 3) c = mix(c, BLUE_HI, 0.12); // lit left face
  if (hash(x, y, seed + 3) > 0.975) c = mix(c, SNOW, 0.55); // a fleck of frost
  return { color: c, mortar: false };
}

function paintFrostBrick(t: Tile, seed = 301): void {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) t.set(x, y, frostBrickPixel(x, y, seed).color);
}

function paintFrostBrickCracked(t: Tile): void {
  paintFrostBrick(t, 311);
  for (const [startX, seed] of [[4, 1], [11, 2]] as const) {
    let x = startX;
    for (let y = 0; y < S; y++) {
      t.set(x, y, NAVY);
      const r = hash(x, y, 320 + seed);
      if (r < 0.34) x -= 1;
      else if (r > 0.66) x += 1;
      if (hash(x, y, 330 + seed) < 0.3) t.set(x + 1, y, BLUE_LO);
    }
  }
  for (let i = 0; i < 5; i++) t.set(Math.floor(hash(i, 3, 340) * S), Math.floor(hash(i, 4, 340) * S), NAVY);
}

/** Brick with rime clinging to the lower courses and the mortar — drifts creep up from the bottom of the tile. */
function paintFrostBrickRimed(t: Tile): void {
  paintFrostBrick(t, 351);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const patch = tileNoise(x, y, 5, 361);
      const n = hash(x, y, 362);
      const cover = patch * 0.7 + (y / S) * 0.45 - 0.18;
      const mortar = frostBrickPixel(x, y, 351).mortar;
      if (cover > (mortar ? 0.4 : 0.6) && n > 0.18) t.set(x, y, n > 0.6 ? SNOW : RIME);
    }
  }
}

/** The side of a snow-capped block: blue brick under a ragged cap of snow with a shaded lip. */
function paintSnowcapSide(t: Tile): void {
  paintFrostBrick(t, 371);
  for (let x = 0; x < S; x++) {
    const d = (hash(x, 0, 372) * 2 + hash((x + S - 1) % S, 0, 372) + hash((x + 1) % S, 0, 372)) / 4;
    const rows = 3 + Math.round(d * 3);
    for (let y = 0; y < rows; y++) {
      const lip = y === rows - 1;
      let c: RGB = mix(SNOW, SNOW_SHADE, y / (rows + 1));
      if (lip) c = scale(c, 0.9);
      t.set(x, y, scale(c, 0.97 + hash(x, y, 373) * 0.05));
    }
    if (hash(x, 1, 374) > 0.82) t.set(x, rows, mix(RIME, BLUE_HI, 0.35)); // a drip of melt
  }
}

/** Smooth ashlar in a lighter, paler blue: trim, stair treads, door surrounds. */
function paintFrostPolished(t: Tile): void {
  t.fill((x, y) => {
    let c = scale([112, 160, 242], grain(x, y, 381, 0.035));
    if (x === 0 || y === 0) c = mix(c, [168, 204, 250], 0.5);
    if (x === S - 1 || y === S - 1) c = scale(c, 0.7);
    if (hash(x, y, 382) > 0.985) c = mix(c, SNOW, 0.6);
    return c;
  });
}

function paintFrostColumnSide(t: Tile): void {
  t.fill((x, y) => {
    let c = scale([132, 172, 236], grain(x, y, 391, 0.03));
    const g = x & 3;
    if (g === 0) c = scale(c, 0.74);
    else if (g === 1) c = scale(c, 1.14);
    if (y < 2 || y > S - 3) c = scale([164, 198, 246], grain(x, y, 392, 0.04)); // capital/base band
    if (y === 2 || y === S - 3) c = scale(c, 0.6);
    return c;
  });
}

/** Polished marble flags for halls: a pale one and a deep-blue one, laid in a checker by the blueprint. */
function paintFrostFloor(t: Tile, dark: boolean): void {
  const base: RGB = dark ? [36, 70, 164] : [212, 226, 246];
  const vein: RGB = dark ? [98, 140, 224] : [138, 170, 226];
  t.fill((x, y) => {
    const streak = tileNoise(x + y * 0.6, y, 6, dark ? 401 : 402);
    let c = mix(base, vein, streak > 0.62 ? (streak - 0.62) * 2.2 : 0);
    c = scale(c, grain(x, y, dark ? 403 : 404, 0.025));
    if (x === 0 || y === 0) c = scale(c, dark ? 1.35 : 1.06);
    if (x === S - 1 || y === S - 1) c = scale(c, 0.72);
    return c;
  });
}

function paintFrostTrim(t: Tile): void {
  t.fill((x, y) => {
    let c = scale([204, 218, 240], grain(x, y, 411, 0.03));
    if (y === 0 || x === 0) c = scale(c, 1.1);
    if (y === S - 1 || x === S - 1) c = scale(c, 0.7);
    if (y === 7 || y === 8) c = scale(c, 0.9);
    return c;
  });
  for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]] as const) t.set(x, y, [120, 150, 204]); // rivets
}

/** Looks like ordinary brick, but one mortar-light snowflake is etched in a corner — the tell for a hidden door. */
function paintLooseBrick(t: Tile): void {
  paintFrostBrick(t, 301);
  const f: RGB = [130, 178, 252];
  for (const [x, y] of [[12, 5], [12, 6], [12, 7], [11, 6], [13, 6], [11, 5], [13, 7], [11, 7], [13, 5]] as const) t.set(x, y, mix(t.get(x, y), f, 0.55));
}

// --- rock & ice -----------------------------------------------------------

function paintGlacierRock(t: Tile, variant: number): void {
  const seed = 500 + variant * 17;
  t.fill((x, y) => {
    const strata = tileNoise(x * 0.4, y, 3, seed + 1); // flat bands: sedimentary
    const blob = tileNoise(x, y, 4, seed + 2);
    const n = hash(x, y, seed + 3);
    let c = mix(ROCK_LO, ROCK, 0.35 + blob * 0.5 + strata * 0.25);
    c = scale(c, 0.9 + n * 0.2);
    if (n > 0.95) c = mix(c, ROCK_HI, 0.7);
    else if (n < 0.04) c = scale(c, 0.6);
    if (hash(x, y, seed + 4) > 0.985) c = mix(c, SNOW, 0.8); // a dusting of snow
    return c;
  });
}

function paintGlacierCobble(t: Tile, variant: number): void {
  const seed = 520 + variant * 13;
  const centers: { x: number; y: number }[] = [];
  for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) centers.push({ x: gx * 4 + 0.5 + hash(gx, gy, seed) * 3, y: gy * 4 + 0.5 + hash(gx, gy, seed + 1) * 3 });
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
    if (second - best < 0.9) return [20, 28, 54];
    const c = scale(mix(ROCK_LO, ROCK_HI, 0.25 + hash(bestId, 1, seed + 2) * 0.55), grain(x, y, seed + 3, 0.06));
    return hash(x, y, seed + 4) > 0.97 ? mix(c, SNOW, 0.6) : c;
  });
}

/** Rock with a ragged snow cap: the layer you see stepping down the glacier crag. */
function paintSnowRockSide(t: Tile, variant: number): void {
  paintGlacierRock(t, variant + 7);
  const depth = Array.from({ length: S }, (_, x) => 4 + hash(x, variant, 541) * 3.2);
  for (let x = 0; x < S; x++) {
    const d = (depth[x] * 2 + depth[(x + S - 1) % S] + depth[(x + 1) % S]) / 4;
    const rows = Math.round(d);
    for (let y = 0; y < rows; y++) {
      const shade = y === rows - 1 ? 0.86 : 1;
      let c: RGB = mix(SNOW, SNOW_SHADE, y / Math.max(1, rows));
      c = scale(c, shade * (0.97 + hash(x, y, 542) * 0.05));
      t.set(x, y, c);
    }
    if (hash(x, 1, 543) > 0.78) t.set(x, rows, mix(SNOW_SHADE, ROCK, 0.3));
  }
}

function paintPackedIce(t: Tile, variant: number): void {
  const seed = 560 + variant * 11;
  t.fill((x, y) => {
    const cloud = tileNoise(x, y, 5, seed);
    let c = mix([150, 204, 240], [206, 238, 252], cloud);
    const streak = tileNoise(x + y, y - x * 0.4, 3, seed + 1);
    if (streak > 0.68) c = mix(c, [255, 255, 255], (streak - 0.68) * 1.6);
    if (hash(x >> 1, y >> 1, seed + 2) > 0.93) c = mix(c, [106, 168, 226], 0.55); // trapped bubbles/cracks
    c = scale(c, grain(x, y, seed + 3, 0.03));
    if (x === 0 || y === 0) c = mix(c, [255, 255, 255], 0.3);
    return c;
  });
}

function paintBlueIce(t: Tile): void {
  t.fill((x, y) => {
    const depth = tileNoise(x, y, 6, 581);
    let c = mix([28, 82, 190], [76, 150, 236], depth);
    const band = (x + y) & 7;
    if (band === 0) c = mix(c, [190, 226, 255], 0.5); // diagonal glints
    else if (band === 1) c = mix(c, [190, 226, 255], 0.18);
    c = scale(c, grain(x, y, 582, 0.03));
    if (x === 0 || y === 0) c = mix(c, [210, 238, 255], 0.35);
    return c;
  });
}

/** A faceted cyan crystal that glows on its own — decoration, and the heart of the grotto. */
function paintFrostCrystal(t: Tile): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const facet = (Math.floor((x + y * 0.5) / 4) + Math.floor((x - y * 0.5 + 16) / 4)) & 3;
      const facets: RGB[] = [[70, 196, 240], [120, 226, 255], [46, 156, 224], [164, 244, 255]];
      const base = facets[facet];
      let c = scale(base, grain(x, y, 591, 0.05));
      const edge = (x + y) % 8 === 0 || (x - y + 16) % 8 === 0;
      if (edge) c = mix(c, [235, 252, 255], 0.55);
      t.set(x, y, c);
      t.glow(x, y, scale(c, edge ? 0.85 : 0.6));
    }
  }
}

// --- roofs ----------------------------------------------------------------

/** Blue slate shingles in scalloped rows of 4, each shingle its own tint; the ridge variant is lighter and edge-lit. */
function paintFrostRoof(t: Tile, variant: number, ridge: boolean): void {
  const seed = 600 + variant * 9 + (ridge ? 50 : 0);
  const base: RGB = ridge ? [92, 148, 240] : [34, 70, 168];
  t.fill((x, y) => {
    const row = y >> 2;
    const offset = (row & 1) * 3;
    const inRow = y & 3;
    const sx = (x + offset) % 6;
    const id = Math.floor((x + offset) / 6) + row * 5;
    let c = scale(base, (0.88 + hash(id, row, seed) * 0.26) * grain(x, y, seed + 1, 0.05));
    if (inRow === 3) c = scale(c, 0.58); // shadow under the shingle above
    else if (inRow === 0) c = mix(c, BLUE_HI, ridge ? 0.5 : 0.28);
    if (sx === 5) c = scale(c, 0.74);
    return c;
  });
}

// --- windows & doors --------------------------------------------------------

function glassColor(px: number, py: number, w: number, h: number): RGB {
  const d = Math.hypot((px - (w - 1) / 2) / (w / 2), (py - (h - 1) / 2) / (h / 2));
  return mix(AMBER_HI, AMBER_LO, Math.min(1, d * 0.85 + hash(px, py, 611) * 0.12));
}

/** A lancet window: amber glass in two lights under a stone transom, framed in brick. `top` closes it with a pointed arch. */
function paintFrostWindow(t: Tile, mode: "plain" | "top" | "dark"): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const halfWidth = mode === "top" ? Math.min(5, 1.2 + y * 0.62) : 5;
      const dx = Math.abs(x - 7.5);
      const inGlass = dx <= halfWidth - 0.5;
      const arch = mode === "top" && Math.abs(dx - (halfWidth - 0.5)) < 1 && dx > halfWidth - 1.6; // lit stone edge of the arch
      if (!inGlass) {
        t.set(x, y, arch ? BLUE_HI : frostBrickPixel(x, y, 301).color);
        continue;
      }
      const isMullion = x === 7 || x === 8;
      const isTransom = (y === 7 || y === 8) && mode !== "top";
      if (isMullion || isTransom) {
        t.set(x, y, mode === "dark" ? [44, 56, 96] : STONE_PALE);
        continue;
      }
      if (mode === "dark") {
        const c = mix([28, 40, 74], [12, 20, 44], Math.min(1, dx / 5));
        t.set(x, y, scale(c, 0.9 + hash(x, y, 612) * 0.2));
        if ((x === 4 && y === 3) || (x === 11 && y === 11)) t.set(x, y, [96, 128, 190]);
        continue;
      }
      const c = glassColor(x - 2, y, 12, S);
      t.set(x, y, c);
      t.glow(x, y, c);
    }
  }
  if (mode !== "dark") {
    // Leading: a darker frame line round the glass.
    for (let y = 0; y < S; y++) {
      const halfWidth = mode === "top" ? Math.min(5, 1.2 + y * 0.62) : 5;
      for (const sx of [-1, 1]) {
        const x = Math.round(7.5 + sx * (halfWidth - 0.5));
        if (Math.abs(x - 7.5) <= halfWidth) t.set(x, y, mode === "top" ? NAVY : BLUE_LO);
      }
    }
  }
}

/** An arrow slit: a narrow vertical gap of amber light in the brick. */
function paintFrostSlit(t: Tile): void {
  paintFrostBrick(t, 301);
  for (let y = 2; y <= 13; y++) {
    t.set(7, y, NAVY);
    t.set(8, y, NAVY);
    if (y >= 3 && y <= 12) {
      const c = mix(AMBER_HI, AMBER_LO, Math.abs(y - 7.5) / 6);
      t.set(7, y, c);
      t.set(8, y, c);
      t.glow(7, y, c);
      t.glow(8, y, c);
    }
  }
  t.set(6, 2, BLUE_HI);
  t.set(9, 2, BLUE_HI);
}

/**
 * One of nine tiles of the rose window: a 3x3-block circle of amber glass cut by
 * eight stone spokes and a ring of tracery, set in brick. (tx, ty) is the tile's
 * position in the 3x3 grid; all nine sample one 48x48 design.
 */
function paintRoseTile(t: Tile, tx: number, ty: number): void {
  const R = 24;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const px = tx * S + x;
      const py = ty * S + y;
      const dx = px - (R - 0.5);
      const dy = py - (R - 0.5);
      const r = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      if (r > 22) {
        t.set(x, y, frostBrickPixel(x, y, 301).color);
        continue;
      }
      if (r > 20.2) {
        t.set(x, y, r > 21.2 ? BLUE_HI : STONE_PALE); // outer ring of tracery
        continue;
      }
      const spoke = (Math.abs(((ang / (Math.PI / 4)) % 1 + 1) % 1 - 0.5) > 0.44 && r > 5) || Math.abs(dx) < 0.9 || Math.abs(dy) < 0.9;
      const ring = Math.abs(r - 12.5) < 0.8 || Math.abs(r - 6) < 0.8;
      const hub = r < 3.4;
      const petal = Math.abs(r - 16.5) < 0.6 && Math.floor((ang + Math.PI) / (Math.PI / 8)) % 2 === 0;
      if (hub) {
        t.set(x, y, [236, 250, 255]);
        t.glow(x, y, [236, 250, 255]);
      } else if (spoke || ring || petal) {
        t.set(x, y, r < 3.8 ? NAVY : STONE_PALE);
      } else {
        const c = mix(AMBER_HI, AMBER_LO, Math.min(1, r / 21 + hash(px, py, 621) * 0.12));
        t.set(x, y, c);
        t.glow(x, y, c);
      }
    }
  }
}

/** A heavy plank door under a pointed head: vertical boards, iron straps and studs. */
function paintFrostDoor(t: Tile, upper: boolean): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const board = x >> 2;
      const seam = (x & 3) === 3;
      let c = scale(WOOD, (0.84 + hash(board, 0, 631) * 0.3) * grain(x, y, 632, 0.08));
      if (seam) c = scale(WOOD_LO, 0.9);
      else if ((x & 3) === 0) c = mix(c, WOOD_HI, 0.25);
      t.set(x, y, c);
    }
  }
  const straps = upper ? [4, 12] : [3, 11];
  for (const sy of straps) {
    for (let x = 0; x < S; x++) {
      t.set(x, sy, IRON);
      t.set(x, sy + 1, scale(IRON_HI, 0.8));
    }
    for (const sx of [1, 6, 9, 14]) t.set(sx, sy, IRON_HI); // studs
  }
  if (!upper) {
    t.set(12, 7, IRON_HI);
    t.set(13, 7, IRON);
    t.set(12, 8, IRON);
    t.set(13, 8, IRON_HI); // ring pull
  }
}

// --- timber, plaster, lights ------------------------------------------------

function paintFrostTimber(t: Tile): void {
  t.fill((x, y) => {
    let c = scale(WOOD_LO, (0.9 + tileNoise(x * 0.35, y, 4, 641) * 0.4) * grain(x, y, 642, 0.07));
    if (y === 0) c = mix(c, SNOW_SHADE, 0.5); // frost on the upper edge
    if (x === 0) c = scale(c, 0.75);
    if (hash(x, y, 643) > 0.97) c = mix(c, WOOD_HI, 0.6);
    return c;
  });
}

function paintFrostPlaster(t: Tile): void {
  t.fill((x, y) => {
    const n = tileNoise(x, y, 4, 651);
    let c = mix([186, 200, 224], [214, 224, 240], n);
    c = scale(c, grain(x, y, 652, 0.04));
    if (hash(x, y, 653) > 0.96) c = scale(c, 0.85);
    return c;
  });
}

/** A frosted iron lantern: a pale-blue flame in glass, caged in dark iron with a pale rim. */
function paintFrostLantern(t: Tile): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const cage = x < 3 || x > 12 || y < 2 || y > 13 || x === 7 || x === 8;
      if (cage) {
        t.set(x, y, y < 2 || y > 13 ? mix(IRON, SNOW_SHADE, 0.3) : IRON);
        continue;
      }
      const c = mix(AMBER_HI, AMBER, Math.hypot(x - 7.5, y - 7.5) / 6);
      t.set(x, y, c);
      t.glow(x, y, c);
    }
  }
}

/** Hanging icicles on crossed planes: a few long tapering spears with a white glint. */
function paintIcicle(t: Tile): void {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) t.set(x, y, [0, 0, 0], 0);
  const spears: [number, number][] = [[2, 9], [5, 14], [8, 7], [11, 12], [14, 8]];
  for (const [cx, len] of spears) {
    for (let y = 0; y < len; y++) {
      const width = y < len * 0.4 ? 3 : y < len * 0.75 ? 2 : 1;
      for (let w = 0; w < width; w++) {
        const x = cx - Math.floor(width / 2) + w;
        const c = w === 0 ? [226, 246, 255] : mix([150, 206, 240], [200, 232, 252], w / width);
        t.set(x, y, c as RGB);
      }
      if (y > 0 && y < len - 1) t.set(cx - Math.floor(width / 2), y, [255, 255, 255]);
    }
  }
}

// --- cold fire ----------------------------------------------------------------

/** A flickering pixel flame in cold blue-white (cross-plane sprite), swaying differently each frame — the ice castle's torches and braziers. */
function paintFrostFlame(t: Tile, frame: number): void {
  for (let y = 0; y < S; y++) t.albedo.fill(0, y * S * 4, (y + 1) * S * 4);
  const bottom = 15;
  const top = 1 + (frame % 3 === 1 ? 1 : 0);
  const height = bottom - top;
  for (let y = top; y <= bottom; y++) {
    const rise = (bottom - y) / height;
    const sway = Math.sin((frame * 1.05 + rise * 3.2) * 1.4) * (0.3 + rise * 1.1);
    const halfWidth = 5.2 * Math.pow(1 - rise, 0.72) + (hash(y, frame, 761) - 0.5) * 1.4;
    const cx = 7.5 + sway;
    for (let x = Math.floor(cx - halfWidth - 1); x <= Math.ceil(cx + halfWidth + 1); x++) {
      const d = Math.abs(x - cx) / Math.max(0.6, halfWidth);
      if (d > 1) continue;
      const heat = (1 - d) * 0.75 + (1 - rise) * 0.35 + (hash(x, y, 762 + frame) - 0.5) * 0.25;
      let c: RGB;
      if (heat > 0.85) c = [240, 252, 255];
      else if (heat > 0.62) c = [150, 220, 255];
      else if (heat > 0.36) c = [62, 150, 246];
      else c = [30, 78, 196];
      t.set(x, y, c);
      t.glow(x, y, c);
    }
  }
  for (let i = 0; i < 2; i++) {
    const x = Math.floor(hash(frame, i, 763) * 10) + 3;
    const y = Math.floor(hash(frame, i, 764) * 3);
    t.set(x, y, [196, 236, 255]);
    t.glow(x, y, [196, 236, 255]);
  }
}

function paintFrostBrazierTop(t: Tile): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const rim = x < 2 || y < 2 || x > S - 3 || y > S - 3;
      if (rim) {
        t.set(x, y, x === 0 || y === 0 ? IRON_HI : IRON);
        continue;
      }
      const n = hash(x, y, 771);
      const glowing = n > 0.42;
      t.set(x, y, glowing ? [110 + n * 60, 190 + n * 50, 255] : [22, 32, 56]);
      if (glowing) t.glow(x, y, [90 + n * 60, 170 + n * 60, 255]);
    }
  }
}

function paintFrostBrazierSide(t: Tile): void {
  t.fill((x, y) => {
    let c: RGB = scale([40, 44, 62], grain(x, y, 781, 0.06));
    if (y < 2 || y > S - 3) c = scale(IRON_HI, 0.8);
    if ((x === 3 || x === 12) && (y === 4 || y === 11)) c = [96, 108, 140]; // rivets
    return c;
  });
  for (let x = 4; x < 12; x++) {
    if (x === 7 || x === 8) continue;
    for (const y of [6, 7, 8, 9]) {
      t.set(x, y, [20, 40, 90]);
      t.glow(x, y, [80 + ((hash(x, y, 782) * 60) | 0), 170, 255]);
    }
  }
}

// --- the library ------------------------------------------------------------

const SPINES: RGB[] = [
  [150, 40, 46],
  [44, 66, 150],
  [42, 108, 76],
  [204, 172, 104],
  [104, 60, 134],
  [48, 138, 150],
  [176, 96, 44],
  [230, 224, 206],
];

function paintBookshelfSide(t: Tile, variant: number): void {
  const seed = 700 + variant * 31;
  t.fill((x, y) => {
    const board = y <= 1 || (y >= 7 && y <= 8) || y >= 14;
    const post = x === 0 || x === 15;
    if (board || post) return scale(WOOD, (0.9 + hash(x, y, seed) * 0.25) * (y === 0 ? 1.15 : 1));
    return scale(WOOD_LO, 0.8);
  });
  for (const [y0, y1] of [[2, 6], [9, 13]] as const) {
    let x = 1;
    while (x < 15) {
      const w = 1 + Math.floor(hash(x, y0, seed + 1) * 3);
      const h = (y1 - y0 + 1) - Math.floor(hash(x, y0, seed + 2) * 3);
      const color = SPINES[Math.floor(hash(x, y0, seed + 3) * SPINES.length)];
      const skip = hash(x, y0, seed + 4) > 0.9; // a gap in the row
      for (let i = 0; i < w && x + i < 15 && !skip; i++) {
        for (let y = y1 - h + 1; y <= y1; y++) {
          t.set(x + i, y, scale(color, i === 0 ? 1.12 : i === w - 1 ? 0.78 : 0.95));
        }
        t.set(x + i, y1 - h + 1, scale(color, 1.3)); // lit top of the spine
        if (w >= 2 && y1 - h + 3 <= y1) t.set(x + (i === 0 ? 0 : 1), y1 - Math.floor(h / 2), mix(color, [236, 200, 110], 0.55)); // gilt band
      }
      x += w + (skip ? 1 : 0);
    }
  }
}

function paintBookshelfTop(t: Tile): void {
  t.fill((x, y) => {
    let c = scale(WOOD, (0.9 + hash(x >> 2, y, 711) * 0.25) * grain(x, y, 712, 0.06));
    if ((x & 3) === 3) c = scale(c, 0.78);
    return c;
  });
}

function paintFrostCarpet(t: Tile): void {
  t.fill((x, y) => {
    let c = scale([30, 58, 150], grain(x, y, 721, 0.05));
    if (x < 2 || x > S - 3) c = scale([196, 212, 240], grain(x, y, 722, 0.05)); // silver border
    else if (x === 2 || x === S - 3) c = scale([18, 34, 96], 1);
    const dx = Math.abs(x - 7.5);
    const dy = Math.abs((y % 8) - 3.5);
    if (dx + dy < 3.2 && dx + dy > 1.8) c = scale([120, 164, 240], grain(x, y, 723, 0.05)); // diamond motif
    return c;
  });
}

/** Painters for every ice-castle texture key (data/blockTextures.ts), merged into blockPainter's registry. */
export const FROST_PAINTERS: Record<string, Painter> = {
  frost_brick: (t) => paintFrostBrick(t),
  frost_brick_cracked: (t) => paintFrostBrickCracked(t),
  frost_brick_rimed: (t) => paintFrostBrickRimed(t),
  frost_snowcap_side: (t) => paintSnowcapSide(t),
  frost_polished: (t) => paintFrostPolished(t),
  frost_column_side: (t) => paintFrostColumnSide(t),
  frost_floor_light: (t) => paintFrostFloor(t, false),
  frost_floor_dark: (t) => paintFrostFloor(t, true),
  frost_trim: (t) => paintFrostTrim(t),
  loose_brick: (t) => paintLooseBrick(t),
  glacier_rock: (t, v) => paintGlacierRock(t, v),
  glacier_cobble: (t, v) => paintGlacierCobble(t, v),
  snow_rock_side: (t, v) => paintSnowRockSide(t, v),
  packed_ice: (t, v) => paintPackedIce(t, v),
  blue_ice: (t) => paintBlueIce(t),
  frost_crystal: (t) => paintFrostCrystal(t),
  frost_roof: (t, v) => paintFrostRoof(t, v, false),
  frost_roof_ridge: (t, v) => paintFrostRoof(t, v, true),
  frost_window: (t) => paintFrostWindow(t, "plain"),
  frost_window_top: (t) => paintFrostWindow(t, "top"),
  frost_window_dark: (t) => paintFrostWindow(t, "dark"),
  frost_slit: (t) => paintFrostSlit(t),
  frost_rose_0: (t) => paintRoseTile(t, 0, 0),
  frost_rose_1: (t) => paintRoseTile(t, 1, 0),
  frost_rose_2: (t) => paintRoseTile(t, 2, 0),
  frost_rose_3: (t) => paintRoseTile(t, 0, 1),
  frost_rose_4: (t) => paintRoseTile(t, 1, 1),
  frost_rose_5: (t) => paintRoseTile(t, 2, 1),
  frost_rose_6: (t) => paintRoseTile(t, 0, 2),
  frost_rose_7: (t) => paintRoseTile(t, 1, 2),
  frost_rose_8: (t) => paintRoseTile(t, 2, 2),
  frost_door_bottom: (t) => paintFrostDoor(t, false),
  frost_door_top: (t) => paintFrostDoor(t, true),
  frost_timber: (t) => paintFrostTimber(t),
  frost_plaster: (t) => paintFrostPlaster(t),
  frost_lantern: (t) => paintFrostLantern(t),
  icicle: (t) => paintIcicle(t),
  frost_bookshelf_side: (t, v) => paintBookshelfSide(t, v),
  frost_bookshelf_top: (t) => paintBookshelfTop(t),
  frost_carpet: (t) => paintFrostCarpet(t),
  frost_flame: (t, f) => paintFrostFlame(t, f),
  frost_brazier_top: (t) => paintFrostBrazierTop(t),
  frost_brazier_side: (t) => paintFrostBrazierSide(t),
};
