// Set pieces (SPEC §10): light arches every ~80 m, a rotating grid-sphere
// hologram at ~1100 m, and a "data waterfall" of falling light streaks beside
// the canyon at 1700–2000 m. Render layer only; pooled, no per-frame allocation.

import * as THREE from 'three';

const ARCH_SPACING = 80;
const ARCH_START = 120;
const ARCH_END = 7700;
const SPHERE_Z = 1100;
const WATERFALL_Z0 = 1700;
const WATERFALL_Z1 = 2000;
const STREAKS = 96;
const STREAK_LEN = 6;

export class SetPieces {
  private scene: THREE.Scene;
  private archRings: THREE.InstancedMesh;
  private archPylons: THREE.InstancedMesh;
  private archMat: THREE.MeshStandardMaterial;
  private archGeo: THREE.TorusGeometry;
  private pylonGeo: THREE.BoxGeometry;
  private archZs: number[] = [];
  private tmpM = new THREE.Matrix4();
  private tmpQ = new THREE.Quaternion();
  private tmpS = new THREE.Vector3(1, 1, 1);
  private tmpP = new THREE.Vector3();
  private sphere: THREE.Group;
  private sphereLines: THREE.LineSegments;
  private sphereCore: THREE.Mesh;
  private streaks: THREE.Points;
  private streakPos: Float32Array;
  private streakSeed: Float32Array;
  private time = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // --- Arches: glowing rings the player runs through (SPEC §8.2, §10). ---
    // Instanced (2 draw calls total) to stay inside the draw-call budget.
    this.archGeo = new THREE.TorusGeometry(6.2, 0.14, 8, 40);
    this.pylonGeo = new THREE.BoxGeometry(0.25, 6.8, 0.25);
    this.archMat = new THREE.MeshStandardMaterial({
      color: 0x001a1a, emissive: 0x19f2ff, emissiveIntensity: 1.6,
      roughness: 0.3, metalness: 0.5,
    });
    for (let z = ARCH_START; z <= ARCH_END; z += ARCH_SPACING) this.archZs.push(z);
    const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
    this.archRings = new THREE.InstancedMesh(this.archGeo, this.archMat, this.archZs.length);
    this.archPylons = new THREE.InstancedMesh(this.pylonGeo, this.archMat, this.archZs.length * 2);
    for (let i = 0; i < this.archZs.length; i++) {
      this.archRings.setMatrixAt(i, HIDDEN);
      this.archPylons.setMatrixAt(i * 2, HIDDEN);
      this.archPylons.setMatrixAt(i * 2 + 1, HIDDEN);
    }
    this.archRings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.archPylons.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.archRings.frustumCulled = false;
    this.archPylons.frustumCulled = false;
    scene.add(this.archRings);
    scene.add(this.archPylons);

    // --- Grid-sphere hologram at 1100 m (SPEC §10). ---
    const sphereGeo = new THREE.IcosahedronGeometry(7, 1);
    const edges = new THREE.EdgesGeometry(sphereGeo);
    sphereGeo.dispose();
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x19f2ff, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.sphereLines = new THREE.LineSegments(edges, lineMat);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x19f2ff, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.sphereCore = new THREE.Mesh(new THREE.IcosahedronGeometry(6.6, 1), coreMat);
    this.sphere = new THREE.Group();
    this.sphere.add(this.sphereLines);
    this.sphere.add(this.sphereCore);
    this.sphere.position.set(0, 9, -SPHERE_Z);
    this.sphere.visible = false;
    scene.add(this.sphere);

    // --- Data waterfall beside the canyon at 1700–2000 m (SPEC §10). ---
    this.streakPos = new Float32Array(STREAKS * 3);
    this.streakSeed = new Float32Array(STREAKS);
    for (let i = 0; i < STREAKS; i++) {
      this.streakSeed[i] = (i * 0.61803398875) % 1; // golden-ratio spread
      this.streakPos[i * 3] = -7.5 - this.streakSeed[i] * 6; // left side beyond wall
      this.streakPos[i * 3 + 1] = (this.streakSeed[i] * 14) % 16;
      this.streakPos[i * 3 + 2] = -(WATERFALL_Z0 + this.streakSeed[i] * (WATERFALL_Z1 - WATERFALL_Z0));
    }
    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute('position', new THREE.BufferAttribute(this.streakPos, 3));
    const streakMat = new THREE.PointsMaterial({
      color: 0xff2bd6, size: 0.5, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    this.streaks = new THREE.Points(streakGeo, streakMat);
    this.streaks.frustumCulled = false;
    this.streaks.visible = false;
    scene.add(this.streaks);
  }

  /** Show/hide set pieces near the player; animate the hologram + waterfall. */
  update(dist: number, dt: number): void {
    this.time += dt;

    // Arches: only the ones within ~240 m are visible (instance matrices updated).
    const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
    let ringDirty = false;
    for (let i = 0; i < this.archZs.length; i++) {
      const z = this.archZs[i];
      if (Math.abs(z - dist) < 240) {
        this.tmpQ.identity();
        this.tmpS.set(1, 1, 1);
        this.tmpP.set(0, 3.4, -z);
        this.tmpM.compose(this.tmpP, this.tmpQ, this.tmpS);
        this.archRings.setMatrixAt(i, this.tmpM);
        this.tmpP.set(-6.2, 3.4, -z);
        this.tmpM.compose(this.tmpP, this.tmpQ, this.tmpS);
        this.archPylons.setMatrixAt(i * 2, this.tmpM);
        this.tmpP.set(6.2, 3.4, -z);
        this.tmpM.compose(this.tmpP, this.tmpQ, this.tmpS);
        this.archPylons.setMatrixAt(i * 2 + 1, this.tmpM);
      } else {
        this.archRings.setMatrixAt(i, HIDDEN);
        this.archPylons.setMatrixAt(i * 2, HIDDEN);
        this.archPylons.setMatrixAt(i * 2 + 1, HIDDEN);
      }
      ringDirty = true;
    }
    if (ringDirty) {
      this.archRings.instanceMatrix.needsUpdate = true;
      this.archPylons.instanceMatrix.needsUpdate = true;
    }

    // Grid-sphere hologram: visible within 300 m, slow rotation.
    const nearSphere = Math.abs(SPHERE_Z - dist) < 300;
    this.sphere.visible = nearSphere;
    if (nearSphere) {
      this.sphere.rotation.y = this.time * 0.35;
      this.sphere.rotation.x = Math.sin(this.time * 0.2) * 0.2;
      const s = 1 + 0.03 * Math.sin(this.time * 2);
      this.sphere.scale.setScalar(s);
    }

    // Data waterfall: falling streaks (wrap vertically), visible in the zone.
    const nearWater = dist > WATERFALL_Z0 - 150 && dist < WATERFALL_Z1 + 150;
    this.streaks.visible = nearWater;
    if (nearWater) {
      for (let i = 0; i < STREAKS; i++) {
        this.streakPos[i * 3 + 1] -= dt * (8 + this.streakSeed[i] * 10);
        if (this.streakPos[i * 3 + 1] < -STREAK_LEN) this.streakPos[i * 3 + 1] = 16;
      }
      (this.streaks.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  dispose(): void {
    this.scene.remove(this.archRings);
    this.scene.remove(this.archPylons);
    this.archGeo.dispose();
    this.pylonGeo.dispose();
    this.archMat.dispose();
    this.archRings.dispose();
    this.archPylons.dispose();
    this.scene.remove(this.sphere);
    this.sphereLines.geometry.dispose();
    (this.sphereLines.material as THREE.Material).dispose();
    this.sphereCore.geometry.dispose();
    (this.sphereCore.material as THREE.Material).dispose();
    this.scene.remove(this.streaks);
    this.streaks.geometry.dispose();
    (this.streaks.material as THREE.Material).dispose();
  }
}
