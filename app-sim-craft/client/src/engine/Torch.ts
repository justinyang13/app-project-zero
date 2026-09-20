// A player-placed light source (Torch build mode — see hotbarStore.ts
// and ui/Hotbar.tsx). Unlike CampfireVisual's flame/light, which sits on
// top of a log pile baked into world generation, a torch isn't part of
// world-gen at all — it's placed and removed at runtime (see GameLoop.ts's
// toggleTorchAt) and persisted alongside custom markers (see
// persistence/db.ts's TorchRecord). Always lit, day or night — a burning
// torch doesn't care what time it is, unlike StreetLamp's night-gated bulb.
import * as THREE from "three";
import { poolLight, releaseLight } from "../rendering/LightPool";
import { disposeObject3D } from "../rendering/disposeObject";

export class Torch {
  readonly group: THREE.Group;
  private readonly flameMeshes: THREE.Mesh[] = [];
  private readonly light: THREE.PointLight;
  private flickerPhase = Math.random() * Math.PI * 2;

  constructor(x: number, y: number, z: number) {
    this.group = new THREE.Group();
    this.group.position.set(x + 0.5, y, z + 0.5);

    const stickMat = new THREE.MeshLambertMaterial({ color: 0x6b4a30 });
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.1), stickMat);
    stick.position.y = 0.28;
    this.group.add(stick);

    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8c2a });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 8), flameMat);
    outer.position.y = 0.68;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 8), coreMat);
    inner.position.y = 0.62;
    this.flameMeshes.push(outer, inner);
    this.group.add(outer, inner);

    this.light = poolLight(new THREE.PointLight(0xff9a40, 2.6, 11, 2));
    this.light.position.y = 0.6;
    this.group.add(this.light);
  }

  update(dt: number): void {
    this.flickerPhase += dt * 9;
    const flicker = 1 + Math.sin(this.flickerPhase) * 0.12 + Math.sin(this.flickerPhase * 2.3) * 0.06;
    for (const mesh of this.flameMeshes) mesh.scale.setScalar(flicker);
    this.light.intensity = 2.3 + Math.sin(this.flickerPhase * 1.7) * 0.4;
  }

  dispose(): void {
    releaseLight(this.light);
    disposeObject3D(this.group);
  }
}
