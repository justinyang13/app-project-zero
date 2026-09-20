// Dynamic lights are expensive in three's forward renderer: every light in
// the scene is evaluated for every fragment of every lit material, whether
// or not it's anywhere near that fragment — and a big world has dozens of
// lamps, camps, torches and headlights. So none of them are real scene
// lights. Each visual creates its own logical light through `poolLight`
// (which parks it as invisible, so three ignores it) and drives it exactly
// as before; a small fixed set of real lights (the pool) is then re-aimed
// every frame at whichever logical lights are nearest the camera. A fixed
// count also means the shaders never need recompiling as lights come and go.
import * as THREE from "three";

const logical = new Set<THREE.PointLight | THREE.SpotLight>();

/** Registers a light as a pooled source: it stays in its parent's graph (so it follows it), but is never rendered directly. */
export function poolLight<T extends THREE.PointLight | THREE.SpotLight>(light: T): T {
  light.visible = false;
  logical.add(light);
  return light;
}

/** Forgets a pooled light (call from the owning visual's dispose). */
export function releaseLight(light: THREE.PointLight | THREE.SpotLight): void {
  logical.delete(light);
}

const MIN_INTENSITY = 0.05;
/** Beyond this many blocks past a light's own reach it can't matter, so it's skipped outright. */
const CULL_MARGIN = 40;

const worldPos = new THREE.Vector3();
const targetPos = new THREE.Vector3();

interface Candidate {
  light: THREE.PointLight | THREE.SpotLight;
  x: number;
  y: number;
  z: number;
  score: number;
}

export class LightPool {
  private readonly lights: THREE.PointLight[] = [];
  private readonly candidates: Candidate[] = [];

  constructor(scene: THREE.Scene, size: number) {
    this.setSize(scene, size);
  }

  /** Changes how many real lights are in play. (Three recompiles the lit shaders when the count changes, so this is for settings changes, not per-frame use.) */
  setSize(scene: THREE.Scene, size: number): void {
    while (this.lights.length > size) scene.remove(this.lights.pop()!);
    while (this.lights.length < size) {
      const light = new THREE.PointLight(0xffffff, 0, 1, 2);
      scene.add(light);
      this.lights.push(light);
    }
  }

  /** Re-aims the real lights at the logical lights nearest `eye` (the camera). */
  update(eye: THREE.Vector3): void {
    const candidates = this.candidates;
    candidates.length = 0;
    for (const light of logical) {
      if (light.intensity < MIN_INTENSITY) continue;
      light.getWorldPosition(worldPos);
      // A headlight's beam points ahead, so light from a spot a little way down its axis.
      if ((light as THREE.SpotLight).isSpotLight) {
        const spot = light as THREE.SpotLight;
        spot.target.getWorldPosition(targetPos);
        worldPos.lerp(targetPos, 0.25);
      }
      const dist = Math.hypot(worldPos.x - eye.x, worldPos.y - eye.y, worldPos.z - eye.z);
      const reach = light.distance > 0 ? light.distance : 20;
      if (dist > reach + CULL_MARGIN) continue;
      candidates.push({ light, x: worldPos.x, y: worldPos.y, z: worldPos.z, score: dist - reach });
    }
    candidates.sort((a, b) => a.score - b.score);

    for (let i = 0; i < this.lights.length; i++) {
      const real = this.lights[i];
      const source = candidates[i];
      if (!source) {
        real.intensity = 0;
        continue;
      }
      real.position.set(source.x, source.y, source.z);
      real.color.copy(source.light.color);
      real.intensity = source.light.intensity;
      real.distance = source.light.distance;
      real.decay = source.light.decay;
    }
  }

  dispose(scene: THREE.Scene): void {
    for (const light of this.lights) scene.remove(light);
  }
}
