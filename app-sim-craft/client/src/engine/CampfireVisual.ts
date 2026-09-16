// The campfire's log pile is baked into world generation (deterministic,
// see worldgen/structures.ts) — this is just the flame effect and warm
// light on top of it, since neither is expressible as chunk block data.
// A simple flicker (scale + light-intensity jitter), not a particle
// system — that's spec/10-lighting-rendering.md §6's later-phase work.
import * as THREE from "three";

export class CampfireVisual {
  readonly group: THREE.Group;
  private readonly flameMeshes: THREE.Mesh[] = [];
  private readonly light: THREE.PointLight;
  private flickerPhase = 0;

  constructor(x: number, y: number, z: number) {
    this.group = new THREE.Group();
    this.group.position.set(x + 0.5, y + 0.6, z + 0.5);

    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8c2a });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 8), flameMat);
    outer.position.y = 0.35;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 8), coreMat);
    inner.position.y = 0.3;
    this.flameMeshes.push(outer, inner);
    this.group.add(outer, inner);

    this.light = new THREE.PointLight(0xff9a40, 3, 12, 2);
    this.light.position.y = 0.5;
    this.group.add(this.light);
  }

  update(dt: number): void {
    this.flickerPhase += dt * 9;
    const flicker = 1 + Math.sin(this.flickerPhase) * 0.12 + Math.sin(this.flickerPhase * 2.3) * 0.06;
    for (const mesh of this.flameMeshes) mesh.scale.setScalar(flicker);
    this.light.intensity = 2.6 + Math.sin(this.flickerPhase * 1.7) * 0.5;
  }

  dispose(): void {
    for (const mesh of this.flameMeshes) mesh.geometry.dispose();
  }
}
