import type * as THREE from 'three';
import type { PlayerState } from '../logic/player';

/**
 * M14a: the interface the game uses for the player model. `PlayerModel`
 * (procedural fallback) and `RealisticRunner` (GLB-based) both implement it.
 */
export interface RunnerView {
  /** The scene-graph root to add to the scene. */
  getModel(): THREE.Object3D;
  /** Reset pose/animation state for a new run. */
  reset(): void;
  /** Per-frame update driven by the pure player state. */
  update(state: PlayerState, dt: number, speed: number): void;
  /** Death effect: shatter into cubes. */
  triggerShatter(): void;
}
