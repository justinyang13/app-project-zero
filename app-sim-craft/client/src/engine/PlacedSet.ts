// A persisted collection of things the player has placed in the world that
// each have a small runtime visual — flags, torches. The same toggle
// everywhere: use it near an existing one to remove it, otherwise add a new
// one. `addOnly` (used while a build button is held) never removes, so
// holding over one spot doesn't flip it on and off every interval.
import type * as THREE from "three";

export interface PlacedVisual {
  readonly group: THREE.Object3D;
  update(dt: number): void;
  dispose(): void;
}

export interface PlacedSetConfig<R, V extends PlacedVisual> {
  /** How close (by `distance`) a use must be to an existing one to count as removing it. */
  toggleRange: number;
  distance(record: R, x: number, y: number, z: number): number;
  createRecord(x: number, y: number, z: number, existingCount: number): R;
  createVisual(record: R): V;
}

export class PlacedSet<R, V extends PlacedVisual> {
  private readonly scene: THREE.Scene;
  private readonly config: PlacedSetConfig<R, V>;
  private readonly onChange: () => void;
  private readonly items: R[];
  private visuals: V[] = [];

  /** `onChange` runs after every add/remove (the game saves immediately so a placed spot survives a crash or hard-close). */
  constructor(scene: THREE.Scene, config: PlacedSetConfig<R, V>, initial: readonly R[], onChange: () => void) {
    this.scene = scene;
    this.config = config;
    this.onChange = onChange;
    this.items = [...initial];
    this.syncVisuals();
  }

  get records(): readonly R[] {
    return this.items;
  }

  toggleAt(x: number, y: number, z: number, addOnly = false): void {
    let nearestIndex = -1;
    let nearestDist = this.config.toggleRange;
    for (let i = 0; i < this.items.length; i++) {
      const dist = this.config.distance(this.items[i], x, y, z);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = i;
      }
    }

    if (nearestIndex >= 0) {
      if (addOnly) return;
      this.items.splice(nearestIndex, 1);
    } else {
      this.items.push(this.config.createRecord(x, y, z, this.items.length));
    }
    this.syncVisuals();
    this.onChange();
  }

  update(dt: number): void {
    for (const visual of this.visuals) visual.update(dt);
  }

  dispose(): void {
    this.clearVisuals();
  }

  private syncVisuals(): void {
    this.clearVisuals();
    this.visuals = this.items.map((record) => {
      const visual = this.config.createVisual(record);
      this.scene.add(visual.group);
      return visual;
    });
  }

  private clearVisuals(): void {
    for (const visual of this.visuals) {
      this.scene.remove(visual.group);
      visual.dispose();
    }
    this.visuals = [];
  }
}
