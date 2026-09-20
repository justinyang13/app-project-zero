// How many of one kind of entity exist and where they come from. A Population
// waits for the world to be ready, spawns an initial batch, then keeps the
// group topped up on a timer while despawning stragglers left far behind —
// the shared shape behind ambient creatures, fish and the loop-road cars. What
// is spawned, how many and how far away is all in the PopulationRules.
import type { World } from "../core/World";
import type { Entity } from "./Entity";
import type { EntityGroup } from "./EntityGroup";

/** What a population needs to know about the world each frame. */
export interface SpawnContext {
  world: World;
  playerX: number;
  playerZ: number;
  /** Ground exists to snap to: the initial chunk load has settled. */
  worldReady: boolean;
}

export interface PopulationRules<T extends Entity> {
  /** Ceiling for the ambient top-up. */
  max: number;
  /** Seconds between ambient top-ups; Infinity for a population that is only ever spawned once. */
  interval: number;
  /** How far (horizontally) from the player an entity may stray before it is removed. */
  despawnRadius(entity: T): number;
  /** The first batch, spawned once the world is ready. */
  spawnInitial(ctx: SpawnContext, group: EntityGroup<T>): void;
  /** One ambient top-up. Callers check `group.size` against `max` themselves as they add. */
  spawnAmbient?(ctx: SpawnContext, group: EntityGroup<T>): void;
  /** Runs on every interval tick before the ambient top-up, exempt from `max` (e.g. topping big sea creatures back up). */
  onInterval?(ctx: SpawnContext, group: EntityGroup<T>): void;
}

export class Population<T extends Entity> {
  private readonly group: EntityGroup<T>;
  private readonly rules: PopulationRules<T>;
  private started = false;
  private timer = 0;

  constructor(group: EntityGroup<T>, rules: PopulationRules<T>) {
    this.group = group;
    this.rules = rules;
  }

  update(ctx: SpawnContext, dt: number): void {
    if (!this.started && ctx.worldReady) {
      this.started = true;
      this.rules.spawnInitial(ctx, this.group);
    }

    this.group.removeWhere(
      (entity) => Math.hypot(entity.position.x - ctx.playerX, entity.position.z - ctx.playerZ) > this.rules.despawnRadius(entity),
    );

    if (!this.started) return; // wait for the initial batch first
    if (!this.rules.spawnAmbient && !this.rules.onInterval) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.rules.interval;

    this.rules.onInterval?.(ctx, this.group);
    if (this.group.size >= this.rules.max) return;
    this.rules.spawnAmbient?.(ctx, this.group);
  }
}
