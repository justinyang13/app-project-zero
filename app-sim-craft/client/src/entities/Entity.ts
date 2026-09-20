// The minimum every simulated, on-screen thing shares: a mesh to put in the
// scene, a position, a per-tick update and a way to release its GPU resources.
// EntityGroup (EntityGroup.ts) manages a collection of them; Population
// (Population.ts) decides how many exist and where.
import type { Object3D } from "three";
import type { World } from "../core/World";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Entity {
  readonly mesh: Object3D;
  readonly position: Vec3;
  /** Advances the entity by `dt` seconds. The caller picks the cadence (fixed sim step or per rendered frame). */
  update(dt: number, world: World): void;
  dispose(): void;
}
