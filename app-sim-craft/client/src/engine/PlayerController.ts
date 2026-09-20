// What the player is doing right now and how their body moves because of it.
// The player is always in exactly one mode — walking/flying/swimming on foot,
// riding a mount (an animal, a shark, the dragon, a car), or waiting for the
// ground to stream in after a teleport — and each mode says what happens on
// the fixed sim step and on the rendered frame. Switching mode (mount,
// dismount, teleport) is the only way behaviour changes; nothing else needs
// an `if (riding)` check.
import type { World } from "../core/World";
import { findSurfaceY } from "../core/worldQueries";
import { Player, type PlayerInput } from "./Player";
import type { Rideable, RideInput } from "../entities/Rideable";
import type { Vec3 } from "../entities/Entity";
import type { MountHint } from "../core/mountHint";

/** Which way is "forward" and "right" for this step's movement (already yaw-only when walking, the full look direction when flying). */
export interface MovementBasis {
  forward: Vec3;
  right: { x: number; z: number };
}

interface PlayerMode {
  /** The mount the player is on, if this is the riding mode. */
  readonly mount: Rideable | null;
  /** One fixed-timestep step. */
  simStep(controller: PlayerController, dt: number, world: World, walk: PlayerInput, basis: MovementBasis): void;
  /** Once per rendered frame, after the sim steps. */
  frameStep(controller: PlayerController, dt: number, world: World, ride: RideInput): void;
}

function stop(player: Player): void {
  player.velocity = { x: 0, y: 0, z: 0 };
}

const onFoot: PlayerMode = {
  mount: null,
  simStep(controller, dt, world, walk, basis) {
    controller.player.tick(dt, world, walk, basis.forward, basis.right);
  },
  frameStep() {},
};

class RidingMode implements PlayerMode {
  readonly mount: Rideable;

  constructor(mount: Rideable) {
    this.mount = mount;
  }

  // The mount's own movement is applied once per rendered frame (frameStep, the same cadence the
  // dragon's autonomous flight uses), so the player's own ground/gravity physics is skipped here.
  simStep(controller: PlayerController): void {
    stop(controller.player);
  }

  // The player's position — used for chunk streaming, HUD and save-on-exit — stays glued to the mount.
  frameStep(controller: PlayerController, dt: number, world: World, ride: RideInput): void {
    this.mount.tickRide(dt, world, ride);
    controller.player.position = { ...this.mount.position };
    stop(controller.player);
  }
}

// Hold still (no gravity) until the destination's ground exists, so a long jump doesn't drop the player through unloaded terrain.
class TeleportingMode implements PlayerMode {
  readonly mount = null;
  private readonly x: number;
  private readonly z: number;

  constructor(x: number, z: number) {
    this.x = x;
    this.z = z;
  }

  simStep(controller: PlayerController, _dt: number, world: World): void {
    const groundY = findSurfaceY(world, this.x, this.z);
    if (groundY !== null) {
      controller.player.position = { x: this.x, y: groundY, z: this.z };
      controller.enter(onFoot);
    }
    stop(controller.player);
  }

  frameStep(): void {}
}

export class PlayerController {
  readonly player = new Player();
  private mode: PlayerMode = onFoot;
  private readonly mountSources: Iterable<Rideable>[];

  /** `mountSources` are the groups of entities the player may climb onto or into. */
  constructor(mountSources: Iterable<Rideable>[]) {
    this.mountSources = mountSources;
  }

  get mounted(): Rideable | null {
    return this.mode.mount;
  }

  /** Internal: used by the modes to hand over to the next one. */
  enter(mode: PlayerMode): void {
    this.mode = mode;
  }

  simStep(dt: number, world: World, walk: PlayerInput, basis: MovementBasis): void {
    this.mode.simStep(this, dt, world, walk, basis);
  }

  frameStep(dt: number, world: World, ride: RideInput): void {
    this.mode.frameStep(this, dt, world, ride);
  }

  /** Routes E: get off whatever the player is on; otherwise climb onto (or into) the nearest mount in reach. */
  interact(world: World): void {
    if (this.mounted) {
      this.dismount(world);
      return;
    }
    const target = this.findNearbyMount();
    if (target) this.mount(target);
  }

  /** What E would do right now: get off whatever the player is on, or climb onto what's in reach. */
  hint(): MountHint | null {
    const mount = this.mounted;
    if (mount) return { kind: mount.mountKind === "vehicle" ? "exit-vehicle" : "dismount" };
    const nearby = this.findNearbyMount();
    if (!nearby) return null;
    return nearby.mountKind === "vehicle" ? { kind: "drive" } : { kind: "ride", name: nearby.rideName };
  }

  /** Puts the player at `to` and holds them there until the ground under (to.x, to.z) has streamed in, dropping whatever they were riding. */
  teleportTo(to: Vec3, world: World): void {
    if (this.mounted) this.dismount(world);
    this.player.position = { ...to };
    stop(this.player);
    this.player.flying = false;
    this.enter(new TeleportingMode(to.x, to.z));
  }

  /** The mount the player could climb on right now: the nearest vehicle if any is in reach (a car wins over an animal beside it), else the nearest animal or dragon. */
  private findNearbyMount(): Rideable | null {
    const p = this.player.position;
    let nearestVehicle: Rideable | null = null;
    let nearestAnimal: Rideable | null = null;
    let vehicleDist = Infinity;
    let animalDist = Infinity;
    for (const source of this.mountSources) {
      for (const mount of source) {
        const d = mount.mountDistanceFrom(p);
        if (mount.mountKind === "vehicle") {
          if (d < vehicleDist) {
            nearestVehicle = mount;
            vehicleDist = d;
          }
        } else if (d < animalDist) {
          nearestAnimal = mount;
          animalDist = d;
        }
      }
    }
    return nearestVehicle ?? nearestAnimal;
  }

  private mount(target: Rideable): void {
    target.mount();
    // Riding isn't flying — drop the player's own fly toggle so it isn't still on when they step off a grounded mount.
    this.player.flying = false;
    this.enter(new RidingMode(target));
  }

  private dismount(world: World): void {
    const mount = this.mounted;
    if (!mount) return;
    const spot = mount.dismount(world);
    mount.setFirstPersonView?.(false);
    this.enter(onFoot);
    this.player.position = { x: spot.x, y: spot.y, z: spot.z };
    this.player.flying = spot.flying;
    stop(this.player);
  }
}
