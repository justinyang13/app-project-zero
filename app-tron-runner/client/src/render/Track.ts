// Track: floor chunks, lane lines, rails, walls, wall-run strips, gap voids
// (SPEC §8.2, §8.6). Chunks are 40 m, pooled/recycled around the player.

import * as THREE from 'three';
import { SECTION_PALETTES } from './Environment';

export interface WallStrip {
  side: -1 | 1;
  z0: number;
  z1: number;
}

export interface Gap {
  z0: number;
  z1: number;
}

const CHUNK = 40;
const AHEAD = 5; // ~220 m ahead
const BEHIND = 1; // ~40 m behind
const VOID_Y = -30;

// Procedural wall panel texture (M13): dark navy panels with 1 px seams
// every 64 px and a few small cyan/orange "screen" rectangles. Used as both
// map and emissiveMap so the screens glow with the section wall colour.
function makeWallTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#070b18';
  ctx.fillRect(0, 0, 512, 256);
  // 1 px lighter seams every 64 px (panel grid).
  ctx.strokeStyle = '#1b2a4a';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 64) {
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, 256); ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(512, y + 0.5); ctx.stroke();
  }
  // A few small emissive "screens" (cyan / orange).
  const screens: Array<[number, number, number, number, string]> = [
    [24, 30, 26, 14, '#19f2ff'],
    [150, 96, 34, 18, '#ff7a18'],
    [300, 40, 22, 22, '#19f2ff'],
    [420, 130, 30, 12, '#ff7a18'],
    [80, 190, 28, 16, '#19f2ff'],
    [360, 200, 24, 12, '#ff7a18'],
  ];
  for (const [sx, sy, sw, sh, col] of screens) {
    ctx.fillStyle = col;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = '#0a1226';
    ctx.fillRect(sx + 2, sy + 2, sw - 4, sh - 4);
    ctx.fillStyle = col;
    ctx.fillRect(sx + 4, sy + 4, sw - 8, sh - 8);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeGridTexture(color: string, cell: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#02020a';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += cell) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export class Track {
  private scene: THREE.Scene;
  private chunks = new Map<number, THREE.Group>();
  private gaps: Gap[] = [];
  private wallStrips: WallStrip[] = [];

  // Shared geometry / materials (created once, reused by every chunk).
  private floorMat: THREE.MeshStandardMaterial;
  private dividerMat: THREE.MeshStandardMaterial;
  private railMat: THREE.MeshStandardMaterial;
  private wallMat: THREE.MeshStandardMaterial;
  private stripMat: THREE.MeshStandardMaterial;
  private edgeMat: THREE.MeshStandardMaterial;
  private voidMat: THREE.MeshBasicMaterial;
  private stripCyanMat: THREE.MeshStandardMaterial;
  private stripOrangeMat: THREE.MeshStandardMaterial;
  private wallRailMat: THREE.MeshStandardMaterial;
  private base: string;
  private debug: boolean;

  constructor(scene: THREE.Scene, baseUrl: string) {
    this.scene = scene;
    this.base = baseUrl;
    this.debug = new URLSearchParams(window.location.search).get('debug') === '1';

    const floorTex = new THREE.TextureLoader().load(`${this.base}assets/img/floor.jpg`);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(1, CHUNK / 12);
    this.floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      emissive: 0xff7a18,
      emissiveMap: floorTex,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.8,
    });

    this.dividerMat = new THREE.MeshStandardMaterial({
      color: 0x001a1a, emissive: 0x19f2ff, emissiveIntensity: 2.0,
    });
    this.railMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a00, emissive: 0xff7a18, emissiveIntensity: 1.8,
    });
    // Un-flattened wall: procedural panel texture as map + emissiveMap
    // (M13 #2). One tile covers 12 m of wall (CHUNK = 40 m → repeat 40/12).
    const panelTex = makeWallTexture();
    panelTex.repeat.set(CHUNK / 12, 1); // one tile per 12 m along the wall (6 m tall)
    this.wallMat = new THREE.MeshStandardMaterial({
      map: panelTex,
      emissive: 0x19f2ff,
      emissiveMap: panelTex,
      emissiveIntensity: 0.35,
      color: 0x070b18,
      roughness: 0.6,
      metalness: 0.5,
    });

    const wallTex = new THREE.TextureLoader().load(`${this.base}assets/img/wall.jpg`);
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(2, 4); // tile the magenta grid across the strip
    this.stripMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      emissive: 0xff2bd6,
      emissiveMap: wallTex,
      emissiveIntensity: 1.6,
      color: 0x220018,
      roughness: 0.4,
      metalness: 0.4,
      side: THREE.DoubleSide,
    });

    // Bright vertical light strips on normal walls (cyan/orange alternating).
    this.stripCyanMat = new THREE.MeshStandardMaterial({
      color: 0x001a1a, emissive: 0x19f2ff, emissiveIntensity: 2.5,
    });
    this.stripOrangeMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a00, emissive: 0xff7a18, emissiveIntensity: 2.5,
    });
    this.wallRailMat = new THREE.MeshStandardMaterial({
      color: 0x001a1a, emissive: 0x19f2ff, emissiveIntensity: 2.2,
    });

    this.edgeMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a00, emissive: 0xff7a18, emissiveIntensity: 2.4,
    });
    const voidTex = makeGridTexture('#ff2bd6', 32);
    voidTex.repeat.set(3, 2);
    this.voidMat = new THREE.MeshBasicMaterial({
      map: voidTex, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
  }

  /** Tint the normal-wall emissive with the section palette (M13 #5). */
  public setSection(section: number): void {
    const idx = Math.min(Math.max(section, 0), SECTION_PALETTES.length - 1);
    this.wallMat.emissive.setHex(SECTION_PALETTES[idx].wall);
  }

  public setLevelGeometry({ gaps, wallStrips }: { gaps: Gap[]; wallStrips: WallStrip[] }) {
    this.gaps = gaps;
    this.wallStrips = wallStrips;
    for (const [idx, chunk] of this.chunks) {
      this.scene.remove(chunk);
      this.disposeChunk(chunk);
      this.chunks.delete(idx);
    }
  }

  /** Solid (non-gap) intervals inside [a, b). */
  private solidIntervals(a: number, b: number): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    let cur = a;
    for (const g of this.gaps) {
      if (g.z1 <= a || g.z0 >= b) continue;
      if (g.z0 > cur) out.push([cur, g.z0]);
      cur = Math.max(cur, g.z1);
    }
    if (cur < b) out.push([cur, b]);
    return out;
  }

  private addBox(
    parent: THREE.Group, mat: THREE.Material,
    w: number, h: number, d: number, x: number, y: number, z: number,
  ): void {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
  }

  private createChunk(index: number): THREE.Group {
    const z0 = index * CHUNK; // distance start
    const z1 = z0 + CHUNK;
    const group = new THREE.Group();

    // Floor sub-segments (gaps omitted → void below).
    for (const [s, e] of this.solidIntervals(z0, z1)) {
      const len = e - s;
      const cz = -((s + e) / 2);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, len), this.floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, 0, cz);
      group.add(floor);

      for (const dx of [-3, 3]) {
        this.addBox(group, this.dividerMat, 0.1, 0.06, len, dx, 0.04, cz);
      }
      for (const dx of [-4.5, 4.5]) {
        this.addBox(group, this.railMat, 0.18, 0.12, len, dx, 0.06, cz);
      }
    }

    // Walls (6 m tall, M13 #1 — sky and skyline visible above).
    const cz = -(z0 + CHUNK / 2);
    for (const side of [-1, 1] as const) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 6, CHUNK), this.wallMat);
      wall.position.set(side * 4.5, 3, cz);
      group.add(wall);
      // Bright vertical emissive light strips every 6 m (cyan/orange alternating).
      for (let k = 0; k < CHUNK / 6; k++) {
        const sz = -(z0 + 3 + k * 6);
        const mat = k % 2 === 0 ? this.stripCyanMat : this.stripOrangeMat;
        this.addBox(group, mat, 0.35, 5.4, 0.22, side * 4.56, 3, sz);
      }
      // Bright horizontal neon rails at y = 0.3 and y = 5.7.
      this.addBox(group, this.wallRailMat, 0.14, 0.1, CHUNK, side * 4.56, 0.3, cz);
      this.addBox(group, this.wallRailMat, 0.14, 0.1, CHUNK, side * 4.56, 5.7, cz);
    }

    // Wall-run strips (magenta grid, inset to avoid z-fighting).
    for (const side of [-1, 1] as const) {
      for (const s of this.wallStrips) {
        if (s.side !== side) continue;
        const a = Math.max(s.z0, z0);
        const b = Math.min(s.z1, z1);
        if (b <= a) continue;
        const len = b - a;
        const mz = -((a + b) / 2);
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 6, len), this.stripMat);
        strip.position.set(side * 4.42, 3, mz);
        group.add(strip);
        // Bright pink floor-level rail along the strip.
        this.addBox(group, this.stripMat, 0.2, 0.14, len, side * 4.42, 0.07, mz);
      }
    }

    // Gap edge strips (bright orange) + deep void grid far below.
    for (const g of this.gaps) {
      if (g.z1 <= z0 || g.z0 >= z1) continue;
      for (const edge of [g.z0, g.z1]) {
        if (edge > z0 && edge < z1) {
          this.addBox(group, this.edgeMat, 9, 0.16, 0.3, 0, 0.08, -edge);
        }
      }
      const a = Math.max(g.z0, z0);
      const b = Math.min(g.z1, z1);
      const len = b - a;
      const voidPlane = new THREE.Mesh(new THREE.PlaneGeometry(9, len), this.voidMat);
      voidPlane.rotation.x = -Math.PI / 2;
      voidPlane.position.set(0, VOID_Y, -((a + b) / 2));
      group.add(voidPlane);
    }

    return group;
  }

  private disposeChunk(chunk: THREE.Group): void {
    for (const child of Array.from(chunk.children)) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    }
  }

  public update(playerDist: number): void {
    const pc = Math.floor(playerDist / CHUNK);
    const want = new Set<number>();
    for (let i = pc - BEHIND; i <= pc + AHEAD; i++) want.add(i);
    for (const idx of want) {
      if (!this.chunks.has(idx)) {
        const chunk = this.createChunk(idx);
        this.chunks.set(idx, chunk);
        this.scene.add(chunk);
      }
    }
    if (this.debug) {
      let strips = 0;
      for (const chunk of this.chunks.values()) {
        for (const child of chunk.children) {
          const m = child as THREE.Mesh;
          if (m.material === this.stripMat) strips++;
        }
      }
      console.log(`[Track] chunks=${this.chunks.size} wallStripMeshes=${strips} strips=${this.wallStrips.length}`);
    }
    for (const [idx, chunk] of this.chunks) {
      if (!want.has(idx)) {
        this.scene.remove(chunk);
        this.disposeChunk(chunk);
        this.chunks.delete(idx);
      }
    }
  }
}
