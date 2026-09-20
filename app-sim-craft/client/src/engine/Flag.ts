// A player-placed location marker (Flag build mode — see hotbarStore.ts
// and ui/Hotbar.tsx). This is the in-world visual counterpart to the
// custom minimap marker GameLoop.ts already tracks (customMarkers /
// MiniMap's "custom" kind, also droppable with the M key at the player's
// feet) — placing/removing a flag adds or removes the same marker record,
// just anchored to whatever block you're looking at instead of your feet.
// Purely decorative, no light.
import * as THREE from "three";
import { disposeObject3D } from "../rendering/disposeObject";

const CLOTH_COLOR = 0xff4fd8;

export class Flag {
  readonly group: THREE.Group;
  private readonly cloth: THREE.Mesh;
  private wavePhase = Math.random() * Math.PI * 2;

  constructor(x: number, y: number, z: number) {
    this.group = new THREE.Group();
    this.group.position.set(x + 0.5, y, z + 0.5);

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x8a5a35 });
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), poleMat);
    pole.position.y = 0.7;
    this.group.add(pole);

    const clothMat = new THREE.MeshBasicMaterial({ color: CLOTH_COLOR, side: THREE.DoubleSide });
    this.cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), clothMat);
    this.cloth.position.set(0.28, 1.15, 0);
    this.group.add(this.cloth);
  }

  /** A small waving animation — cheap (just a rotation oscillation), enough to read as cloth instead of a flat decal. */
  update(dt: number): void {
    this.wavePhase += dt * 4;
    this.cloth.rotation.y = Math.sin(this.wavePhase) * 0.25;
  }

  dispose(): void {
    disposeObject3D(this.group);
  }
}
