// The lamp post itself is baked into world generation (deterministic, see
// worldgen/structures.ts's stampStreetLamps) — this is just the glowing
// bulb and its light on top, since a plain voxel block is Lambert-shaded
// and would go dark at night same as anything else. Gated on/off exactly
// like Car's headlights (see engine/Sky.ts's isNight): a color swap on an
// unlit material for the always-visible lens, plus one real light that
// only costs anything while it's actually on.
import * as THREE from "three";
import { poolLight, releaseLight } from "../rendering/LightPool";
import { disposeObject3D } from "../rendering/disposeObject";

const BULB_ON = 0xfff2b0;
const BULB_OFF = 0x3a3a30;
const LIGHT_INTENSITY = 2.2;
const LIGHT_DISTANCE = 14;

export class StreetLamp {
  readonly group: THREE.Group;
  private readonly bulbMesh: THREE.Mesh;
  private readonly bulbMat: THREE.MeshBasicMaterial;
  private readonly light: THREE.PointLight;
  private on = false;

  constructor(x: number, groundY: number, z: number, postHeight: number) {
    this.group = new THREE.Group();
    this.group.position.set(x + 0.5, groundY + postHeight + 0.4, z + 0.5);

    this.bulbMat = new THREE.MeshBasicMaterial({ color: BULB_OFF });
    this.bulbMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), this.bulbMat);
    this.group.add(this.bulbMesh);

    this.light = poolLight(new THREE.PointLight(BULB_ON, 0, LIGHT_DISTANCE, 2));
    this.group.add(this.light);
  }

  /** Switches the bulb + light on/off — called every frame from GameLoop based on time of day. */
  setOn(on: boolean): void {
    if (on === this.on) return;
    this.on = on;
    this.bulbMat.color.setHex(on ? BULB_ON : BULB_OFF);
    this.light.intensity = on ? LIGHT_INTENSITY : 0;
  }

  dispose(): void {
    releaseLight(this.light);
    disposeObject3D(this.group);
  }
}
