// A collection of one kind of entity that owns their presence in the scene:
// adding puts the mesh in, removing (or disposing the group) takes it out and
// releases it. Replaces the hand-rolled "push, scene.add, ... scene.remove,
// dispose(), splice" that every entity list used to repeat.
import type * as THREE from "three";
import type { World } from "../core/World";
import type { Entity } from "./Entity";

export class EntityGroup<T extends Entity> implements Iterable<T> {
  private readonly scene: THREE.Scene;
  private readonly items: T[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  get size(): number {
    return this.items.length;
  }

  add(entity: T): void {
    this.items.push(entity);
    this.scene.add(entity.mesh);
  }

  remove(entity: T): void {
    const index = this.items.indexOf(entity);
    if (index < 0) return;
    this.items.splice(index, 1);
    this.scene.remove(entity.mesh);
    entity.dispose();
  }

  /** Removes (and disposes) every entity the predicate matches. */
  removeWhere(predicate: (entity: T) => boolean): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const entity = this.items[i];
      if (!predicate(entity)) continue;
      this.items.splice(i, 1);
      this.scene.remove(entity.mesh);
      entity.dispose();
    }
  }

  count(predicate: (entity: T) => boolean): number {
    let n = 0;
    for (const entity of this.items) if (predicate(entity)) n++;
    return n;
  }

  updateAll(dt: number, world: World): void {
    for (const entity of this.items) entity.update(dt, world);
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }

  dispose(): void {
    for (const entity of this.items) {
      this.scene.remove(entity.mesh);
      entity.dispose();
    }
    this.items.length = 0;
  }
}
