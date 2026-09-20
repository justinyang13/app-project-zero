// The castle's red banners: thin cloth planes hung flat against its walls
// (a full voxel cube would jut a whole block out of the wall), one merged
// mesh for all of them. The cloth is a pixel-art canvas texture — crimson
// with dark borders, a forked swallow-tail bottom and a glowing horned
// sigil that stays lit at night through an emissive map — and sways gently
// in a vertex shader (bottom edge most, top edge pinned to its rod). The
// placements come from the castle plan (worldgen/castle/blueprint.ts), so
// they line up with the walls they hang on by construction.
import * as THREE from "three";
import { getCastlePlan } from "../worldgen/castle/blueprint";
import { CASTLE_CENTER, CASTLE_FLOOR_Y } from "../worldgen/castle/layout";
import type { BannerSpec } from "../worldgen/castle/plan";

const TEX_W = 48; // 3 blocks at 16 px per block, like the block textures
const TEX_H = 144; // 9 blocks

function hash(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

interface BannerTextures {
  map: THREE.CanvasTexture;
  emissive: THREE.CanvasTexture;
}

/** Bresenham line of 1px squares. */
function pixelLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    ctx.fillRect(x, y, 1, 1);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** Draws the horned-skull sigil (mirrored about the banner's center line) in the current fill style. */
function drawSigil(ctx: CanvasRenderingContext2D): void {
  const mirror = (fn: (m: (x: number) => number) => void): void => {
    fn((x) => x);
    fn((x) => TEX_W - 1 - x);
  };
  mirror((m) => {
    // Horns sweeping up and out from the brow.
    pixelLine(ctx, m(18), 40, m(13), 35);
    pixelLine(ctx, m(13), 35, m(10), 28);
    pixelLine(ctx, m(10), 28, m(11), 21);
    pixelLine(ctx, m(11), 21, m(14), 17);
    // Skull outline: brow, cheek, taper to the chin.
    pixelLine(ctx, m(18), 40, m(18), 51);
    pixelLine(ctx, m(18), 51, m(24), 58);
    pixelLine(ctx, m(20), 40, m(24), 35);
    // Spine chevrons.
    for (const y of [68, 78, 88, 98]) pixelLine(ctx, m(24), y, m(17), y - 6);
    // Ribs' outer flourish.
    pixelLine(ctx, m(17), 62, m(15), 74);
    pixelLine(ctx, m(15), 74, m(17), 86);
    // Fork of the tail.
    pixelLine(ctx, m(24), 108, m(19), 118);
    pixelLine(ctx, m(24), 112, m(21), 122);
  });
  ctx.fillRect(18, 40, 12, 1); // brow line
  ctx.fillRect(24, 58, 1, 52); // spine
  ctx.fillRect(23, 58, 1, 52);
}

function paintBanner(): BannerTextures {
  const map = document.createElement("canvas");
  map.width = TEX_W;
  map.height = TEX_H;
  const emissive = document.createElement("canvas");
  emissive.width = TEX_W;
  emissive.height = TEX_H;
  const ctx = map.getContext("2d");
  const ectx = emissive.getContext("2d");
  if (!ctx || !ectx) throw new Error("banner texture: 2D canvas unavailable");

  // Cloth: crimson with vertical folds and a darkening toward the hem.
  for (let y = 0; y < TEX_H; y++) {
    for (let x = 0; x < TEX_W; x++) {
      const fold = 0.86 + 0.14 * Math.sin(x * 0.85 + Math.sin(y * 0.11) * 1.4);
      const fade = 1 - (y / TEX_H) * 0.32;
      const grain = 0.94 + hash(x, y, 3) * 0.12;
      const k = fold * fade * grain;
      ctx.fillStyle = `rgb(${Math.round(112 * k)},${Math.round(20 * k)},${Math.round(24 * k)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Borders: a black edge with a thin crimson-bright line inside it.
  ctx.fillStyle = "#1c0507";
  ctx.fillRect(0, 0, 3, TEX_H);
  ctx.fillRect(TEX_W - 3, 0, 3, TEX_H);
  ctx.fillStyle = "#8a1a1d";
  ctx.fillRect(3, 6, 1, TEX_H);
  ctx.fillRect(TEX_W - 4, 6, 1, TEX_H);
  // The rod at the top, with gilded ends.
  ctx.fillStyle = "#1a1416";
  ctx.fillRect(0, 0, TEX_W, 5);
  ctx.fillStyle = "#3a3236";
  ctx.fillRect(0, 0, TEX_W, 1);
  ctx.fillStyle = "#a8842f";
  ctx.fillRect(1, 1, 3, 3);
  ctx.fillRect(TEX_W - 4, 1, 3, 3);

  // The sigil, drawn dim-orange on the cloth and bright in the emissive map.
  ctx.fillStyle = "#e0561f";
  drawSigil(ctx);
  ctx.fillStyle = "#ffc24a";
  for (const [x, y] of [[20, 44], [21, 44], [20, 45], [21, 45], [27, 44], [28, 44], [27, 45], [28, 45]]) ctx.fillRect(x, y, 1, 1);
  ectx.fillStyle = "#000";
  ectx.fillRect(0, 0, TEX_W, TEX_H);
  ectx.fillStyle = "#e85a1e";
  drawSigil(ectx);
  ectx.fillStyle = "#ffd060";
  for (const [x, y] of [[20, 44], [21, 44], [20, 45], [21, 45], [27, 44], [28, 44], [27, 45], [28, 45]]) ectx.fillRect(x, y, 1, 1);

  // Swallow-tail hem plus a ragged edge: cut to transparent (alpha-tested).
  for (const c of [ctx, ectx]) {
    for (let x = 0; x < TEX_W; x++) {
      const notch = Math.round(20 * (1 - Math.abs(x - (TEX_W - 1) / 2) / (TEX_W / 2)));
      const ragged = Math.floor(hash(x, 7, 5) * 4);
      const cutFrom = TEX_H - notch - ragged;
      c.clearRect(x, cutFrom, 1, TEX_H - cutFrom);
    }
    for (let y = 0; y < TEX_H; y += 1) {
      if (hash(0, y, 11) > 0.93 && y > 20) c.clearRect(0, y, 1, 1);
      if (hash(1, y, 12) > 0.93 && y > 20) c.clearRect(TEX_W - 1, y, 1, 1);
    }
  }

  const finish = (canvas: HTMLCanvasElement, srgb: boolean): THREE.CanvasTexture => {
    const t = new THREE.CanvasTexture(canvas);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: finish(map, true), emissive: finish(emissive, true) };
}

export class CastleBanners {
  readonly group = new THREE.Group();
  private readonly timeUniform = { value: 0 };
  private readonly mesh: THREE.Mesh | null;
  private readonly textures: BannerTextures | null;

  constructor() {
    const banners = getCastlePlan().banners;
    if (banners.length === 0) {
      this.mesh = null;
      this.textures = null;
      return;
    }

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    // A banner is a grid of quads (not one) so the sway can bend it smoothly.
    const ROWS = 8;
    for (const banner of banners) {
      const base = positions.length / 3;
      for (let r = 0; r <= ROWS; r++) {
        const t = r / ROWS;
        const y = CASTLE_FLOOR_Y + banner.y - banner.height * t;
        for (const side of [0, 1]) {
          const along = side * banner.width - banner.width / 2;
          const p = worldPoint(banner, along);
          positions.push(p.x, y, p.z);
          normals.push(p.nx, 0, p.nz);
          uvs.push(side, 1 - t);
        }
      }
      for (let r = 0; r < ROWS; r++) {
        const a = base + r * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    this.textures = paintBanner();
    const material = new THREE.MeshLambertMaterial({
      map: this.textures.map,
      emissiveMap: this.textures.emissive,
      emissive: new THREE.Color(1, 1, 1),
      emissiveIntensity: 0.9,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
    const timeUniform = this.timeUniform;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uBannerTime = timeUniform;
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", "uniform float uBannerTime;\nvoid main() {")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
  // Sway along the wall normal: pinned at the rod (uv.y = 1), freest at the hem.
  float hang = 1.0 - uv.y;
  float wave = sin(uBannerTime * 1.7 + (position.x + position.z) * 0.6 + position.y * 0.55);
  float flutter = sin(uBannerTime * 3.1 + position.y * 1.4 + position.x * 0.9);
  transformed += normal * (wave * 0.07 + flutter * 0.025) * hang * hang * 2.0;`,
        );
    };
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false; // vertices sway in the shader, and the whole set is one object spread over the castle
    this.group.add(this.mesh);
  }

  update(timeSeconds: number): void {
    this.timeUniform.value = timeSeconds;
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
    this.textures?.map.dispose();
    this.textures?.emissive.dispose();
  }
}

/** World-space position (x, z) `along` the banner's width from its center, and the outward wall normal. */
function worldPoint(b: BannerSpec, along: number): { x: number; z: number; nx: number; nz: number } {
  const cx = CASTLE_CENTER.x + b.x;
  const cz = CASTLE_CENTER.z + b.z;
  switch (b.facing) {
    case "S":
      return { x: cx + along, z: cz, nx: 0, nz: 1 };
    case "N":
      return { x: cx - along, z: cz, nx: 0, nz: -1 };
    case "E":
      return { x: cx, z: cz - along, nx: 1, nz: 0 };
    case "W":
      return { x: cx, z: cz + along, nx: -1, nz: 0 };
  }
}

