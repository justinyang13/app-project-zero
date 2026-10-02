// Skyline (SPEC §8.2): two layers of instanced neon towers beyond the walls
// (x ∈ ±[12, 90], heights 20–140 m), dark bodies with emissive edge lines,
// recycled as the player advances. Plus a few flying light streaks.

import * as THREE from 'three';

const TOWERS_PER_SIDE = 26;
const TOWERS_PER_SLOT = TOWERS_PER_SIDE;
const SPAN_Z = 420; // metres of track covered by the tower pool
const EDGE_COLORS = [0x19f2ff, 0xff7a18, 0xff2bd6];

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export class Skyline {
  private bodies: THREE.InstancedMesh;
  private edges: THREE.LineSegments;
  private streaks: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private streakDummy = new THREE.Object3D();
  private time = 0;

  constructor(scene: THREE.Scene) {
    // Tower bodies: dark boxes.
    const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x06091a });
    this.bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, TOWERS_PER_SIDE * 2);
    this.bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bodies.frustumCulled = false;
    scene.add(this.bodies);

    // Emissive edge lines: one merged LineSegments, rebuilt when the pool
    // window changes (cheap: 52 towers × 24 vertices).
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    });
    this.edges = new THREE.LineSegments(new THREE.BufferGeometry(), edgeMat);
    this.edges.frustumCulled = false;
    scene.add(this.edges);

    // Flying light streaks (thin glowing quads) in the distance.
    const streakGeo = new THREE.BoxGeometry(14, 0.12, 0.12);
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0x9ff7ff, blending: THREE.AdditiveBlending, transparent: true,
      opacity: 0.8, depthWrite: false, fog: false,
    });
    this.streaks = new THREE.InstancedMesh(streakGeo, streakMat, 8);
    this.streaks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.streaks.frustumCulled = false;
    scene.add(this.streaks);
  }

  private edgeBase = -1;

  private rebuildEdges(base: number): void {
    const n = TOWERS_PER_SIDE * 2;
    const pos = new Float32Array(n * 24);
    const col = new Float32Array(n * 24);
    const c = new THREE.Color();
    // Unit box edge segments (12 edges × 2 verts), corners of a unit box.
    const corners: Array<[number, number, number]> = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
    ];
    const segs: Array<[number, number]> = [
      [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    for (let i = 0; i < n; i++) {
      const side = i < TOWERS_PER_SLOT ? -1 : 1;
      const j = i % TOWERS_PER_SLOT;
      const w = 6 + hash(i * 3.1 + 1) * 14;
      const d = 8 + hash(i * 3.1 + 2) * 16;
      const h = 20 + hash(i * 3.1 + 3) * 120;
      const x = side * (12 + hash(i * 3.1 + 4) * 78);
      const z = -(base + j * (SPAN_Z / TOWERS_PER_SLOT) + hash(i * 3.1 + 5) * 12);
      c.setHex(EDGE_COLORS[i % EDGE_COLORS.length]);
      for (let s = 0; s < segs.length; s++) {
        for (let v = 0; v < 2; v++) {
          const ci = corners[segs[s][v]];
          const o = (i * 24 + s * 2 + v) * 3;
          pos[o] = x + ci[0] * w * 0.5;
          pos[o + 1] = h * 0.5 + ci[1] * h * 0.5;
          pos[o + 2] = z + ci[2] * d * 0.5;
          col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b;
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.edges.geometry.dispose();
    this.edges.geometry = geo;
    this.edgeBase = base;
  }

  public update(playerDist: number, dt = 0): void {
    this.time += dt;
    const base = Math.floor(playerDist / SPAN_Z) * SPAN_Z;

    for (let i = 0; i < TOWERS_PER_SIDE * 2; i++) {
      const side = i < TOWERS_PER_SLOT ? -1 : 1;
      const j = i % TOWERS_PER_SLOT;
      const w = 6 + hash(i * 3.1 + 1) * 14;
      const d = 8 + hash(i * 3.1 + 2) * 16;
      const h = 20 + hash(i * 3.1 + 3) * 120;
      const x = side * (12 + hash(i * 3.1 + 4) * 78);
      const z = -(base + j * (SPAN_Z / TOWERS_PER_SLOT) + hash(i * 3.1 + 5) * 12);
      this.dummy.position.set(x, h / 2, z);
      this.dummy.scale.set(w, h, d);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.bodies.setMatrixAt(i, this.dummy.matrix);
    }
    this.bodies.instanceMatrix.needsUpdate = true;
    if (base !== this.edgeBase) this.rebuildEdges(base);

    // Streaks fly along z at high altitude, wrapping around the player.
    for (let i = 0; i < 8; i++) {
      const speed = 60 + hash(i * 7.7) * 80;
      const z = -(playerDist + ((this.time * speed + i * 53) % 300) - 150);
      const x = (i % 2 === 0 ? -1 : 1) * (20 + hash(i * 9.3) * 60);
      const y = 30 + hash(i * 5.5) * 90;
      this.streakDummy.position.set(x, y, z);
      this.streakDummy.rotation.set(0, 0, 0);
      this.streakDummy.updateMatrix();
      this.streaks.setMatrixAt(i, this.streakDummy.matrix);
    }
    this.streaks.instanceMatrix.needsUpdate = true;
  }
}
