// Pooled GPU particle system (SPEC §8.5) — render layer only.
// One shared THREE.Points pool driven by the pure logic pool (logic/particlePool),
// a small ring-mesh pool for shockwaves, and a boost speed-line quad pool.
// No per-frame allocation: all buffers are pre-allocated; dead particles are
// parked far below the scene.

import * as THREE from 'three';
import {
  createParticlePool, spawn, stepParticles, clearPool, spawnBurst,
} from '../logic/particlePool';
import type { ParticlePool } from '../logic/particlePool';

const HIGH_CAP = 4000;
const LOW_CAP = 1500;
const RING_POOL = 10;
const LINE_POOL = 10;
const PARK_Y = -9999;

const C_BIT: [number, number, number] = [1.0, 0.83, 0.0];
const C_LAND: [number, number, number] = [0.1, 0.95, 1.0];
const C_SLIDE: [number, number, number] = [1.0, 0.48, 0.1];
const C_WALL: [number, number, number] = [1.0, 0.85, 1.0];
const C_BOOST: [number, number, number] = [0.1, 0.95, 1.0];
const C_DEATH: [number, number, number] = [0.1, 0.95, 1.0];

interface Ring {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  t: number;
  dur: number;
  maxR: number;
}

export class Particles {
  private scene: THREE.Scene;
  private pool: ParticlePool;
  private points: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private rings: Ring[] = [];
  private ringIdx = 0;
  private lines: THREE.Mesh[] = [];
  private lineMat: THREE.MeshBasicMaterial;
  private boostTimer = 0;
  private quality: 'High' | 'Low';

  constructor(scene: THREE.Scene, quality: 'High' | 'Low') {
    this.scene = scene;
    this.quality = quality;
    this.pool = createParticlePool(quality === 'High' ? HIGH_CAP : LOW_CAP);

    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.pool.capacity * 3);
    this.colors = new Float32Array(this.pool.capacity * 3);
    for (let i = 0; i < this.pool.capacity; i++) this.positions[i * 3 + 1] = PARK_Y;
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    // Ring pool (bit pickup rings, landing shockwaves).
    const ringGeo = new THREE.RingGeometry(0.85, 1.0, 40);
    for (let i = 0; i < RING_POOL; i++) {
      const m = new THREE.MeshBasicMaterial({
        color: 0xffd400, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(ringGeo, m);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      scene.add(mesh);
      this.rings.push({ mesh, mat: m, active: false, t: 0, dur: 0.5, maxR: 2 });
    }

    // Boost speed lines: stretched additive quads around the player.
    const lineGeo = new THREE.PlaneGeometry(0.08, 1);
    this.lineMat = new THREE.MeshBasicMaterial({
      color: 0x19f2ff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    for (let i = 0; i < LINE_POOL; i++) {
      const mesh = new THREE.Mesh(lineGeo, this.lineMat);
      mesh.visible = false;
      scene.add(mesh);
      this.lines.push(mesh);
    }
  }

  private spawnRing(x: number, y: number, z: number, color: number, maxR: number, dur: number): void {
    const r = this.rings[this.ringIdx];
    this.ringIdx = (this.ringIdx + 1) % this.rings.length;
    r.active = true;
    r.t = 0;
    r.dur = dur;
    r.maxR = maxR;
    r.mesh.position.set(x, y, z);
    r.mat.color.setHex(color);
    r.mesh.visible = true;
  }

  /** Bit pickup: 12 yellow sparks + expanding ring (SPEC §8.5). */
  bitPickup(x: number, y: number, z: number): void {
    spawnBurst(this.pool, x, y, z, 12, 3.5, 0.55, 0.14, C_BIT, 6);
    this.spawnRing(x, y, z, 0xffd400, 2.2, 0.4);
  }

  /** Landing: cyan shockwave ring + dust. */
  landing(x: number, y: number, z: number): void {
    spawnBurst(this.pool, x, y + 0.1, z, 14, 2.6, 0.5, 0.12, C_LAND, 9);
    this.spawnRing(x, y + 0.05, z, 0x19f2ff, 3.0, 0.45);
  }

  /** Slide: orange sparks from the floor (call each frame while sliding). */
  slideSparks(x: number, y: number, z: number): void {
    for (let i = 0; i < 2; i++) {
      spawn(this.pool, {
        x: x + (Math.random() - 0.5) * 0.8, y: y + 0.05, z: z + 0.4,
        vx: (Math.random() - 0.5) * 2, vy: Math.random() * 2.5, vz: 2 + Math.random() * 3,
        life: 0.3, size: 0.1, color: C_SLIDE, gravity: 8,
      });
    }
  }

  /** Wall-run: white/pink sparks flying off the wall under the feet. */
  wallRunSparks(x: number, y: number, z: number, side: number): void {
    for (let i = 0; i < 2; i++) {
      spawn(this.pool, {
        x: x - side * 0.2, y: y + 0.05, z: z + 0.3,
        vx: -side * (1 + Math.random() * 2), vy: Math.random() * 2, vz: 2 + Math.random() * 3,
        life: 0.35, size: 0.1, color: C_WALL, gravity: 6,
      });
    }
  }

  /** Boost: cyan speed lines + FOV handled by camera; sparks trail. */
  boost(x: number, y: number, z: number): void {
    this.boostTimer = 1.5;
    spawnBurst(this.pool, x, y + 0.5, z, 16, 4.5, 0.6, 0.15, C_BOOST, 4);
    this.spawnRing(x, y + 0.1, z, 0x19f2ff, 3.5, 0.5);
  }

  /** Death shatter: big cyan/white burst (complements PlayerModel shatter). */
  deathBurst(x: number, y: number, z: number): void {
    spawnBurst(this.pool, x, y + 0.9, z, 48, 7, 1.1, 0.2, C_DEATH, 10);
    spawnBurst(this.pool, x, y + 0.9, z, 24, 4, 0.9, 0.15, C_WALL, 8);
    this.spawnRing(x, y + 0.1, z, 0x19f2ff, 5, 0.8);
  }

  /** Per-frame update: step pool, write buffers, animate rings/lines. */
  update(dt: number, playerX: number, playerY: number, playerZ: number): void {
    stepParticles(this.pool, dt);
    const parts = this.pool.particles;
    for (let i = 0; i < this.pool.capacity; i++) {
      const p = parts[i];
      if (p.alive) {
        const f = Math.min(1, p.life / p.maxLife);
        this.positions[i * 3] = p.x;
        this.positions[i * 3 + 1] = p.y;
        this.positions[i * 3 + 2] = p.z;
        this.colors[i * 3] = p.r * f;
        this.colors[i * 3 + 1] = p.g * f;
        this.colors[i * 3 + 2] = p.b * f;
      } else {
        this.positions[i * 3 + 1] = PARK_Y;
      }
    }
    (this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;

    for (const r of this.rings) {
      if (!r.active) continue;
      r.t += dt;
      const k = r.t / r.dur;
      if (k >= 1) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const s = 0.3 + k * r.maxR;
      r.mesh.scale.set(s, s, s);
      r.mat.opacity = (1 - k) * 0.9;
    }

    // Boost speed lines orbit the player while the boost is active.
    if (this.boostTimer > 0) {
      this.boostTimer = Math.max(0, this.boostTimer - dt);
      const on = this.boostTimer > 0;
      this.lineMat.opacity = on ? 0.55 : 0;
      for (let i = 0; i < this.lines.length; i++) {
        const mesh = this.lines[i];
        mesh.visible = on;
        if (!on) continue;
        const a = (i / this.lines.length) * Math.PI * 2;
        const rad = 2.2 + (i % 3) * 0.5;
        mesh.position.set(
          playerX + Math.cos(a) * rad,
          playerY + 0.6 + Math.sin(a * 2) * 0.8,
          playerZ + 1.5 + (i % 2) * 1.5,
        );
        const len = 3 + (i % 4);
        mesh.scale.set(1, len, 1);
        mesh.rotation.y = a;
      }
    } else {
      for (const mesh of this.lines) mesh.visible = false;
      this.lineMat.opacity = 0;
    }
  }

  /** Reset all effects (run reset / retry). */
  reset(): void {
    clearPool(this.pool);
    for (const r of this.rings) {
      r.active = false;
      r.mesh.visible = false;
      r.mat.opacity = 0;
    }
    this.boostTimer = 0;
    for (const mesh of this.lines) mesh.visible = false;
  }

  getPool(): ParticlePool {
    return this.pool;
  }

  /** Rebuild the pool capacity when the quality setting changes (SPEC §8.1). */
  setQuality(q: 'High' | 'Low'): void {
    if (q === this.quality) return;
    this.quality = q;
    this.pool = createParticlePool(q === 'High' ? HIGH_CAP : LOW_CAP);
    this.positions = new Float32Array(this.pool.capacity * 3);
    this.colors = new Float32Array(this.pool.capacity * 3);
    for (let i = 0; i < this.pool.capacity; i++) this.positions[i * 3 + 1] = PARK_Y;
    this.points.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.points.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
  }

  dispose(): void {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    for (const r of this.rings) {
      this.scene.remove(r.mesh);
      r.mat.dispose();
    }
    for (const mesh of this.lines) this.scene.remove(mesh);
    this.lineMat.dispose();
  }
}
