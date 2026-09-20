// The one contract GameLoop needs to let the player climb onto anything —
// a land animal, a shark or whale, the dragon, a car — and steer it with the
// same throttle/steer/climb scheme (extended with a vertical axis for the
// things that swim or fly). Each implementer owns its own movement rules
// (ground-snapping, staying in water, free flight); GameLoop only glues the
// player's position and camera to it.
import type { World } from "../core/World";
import type { Entity, Vec3 } from "./Entity";

export interface RideInput {
  throttle: number; // -1..1
  steer: number; // -1..1
  climb: number; // -1..1 (ignored by ground-bound mounts)
}

export interface DismountSpot {
  x: number;
  y: number;
  z: number;
  flying: boolean; // true when there's no ground to put the player back on (dragon mid-air)
}

export interface Rideable extends Entity {
  /** False for things too small (tiny fish) or otherwise not mountable — the finder skips them. */
  readonly rideable: boolean;
  readonly ridden: boolean;
  /** "vehicle" (a car: you drive it, and mounting one wins over an animal nearby) or "animal" (climb on and ride). */
  readonly mountKind: "vehicle" | "animal";
  readonly rideName: string;
  readonly mountRange: number;
  /** Camera anchor height above `position` while riding. */
  readonly rideEyeHeight: number;
  readonly rideCameraDistance: number;
  /** Heading in this engine's yaw convention (forward = (sin, cos)) — drives the minimap arrow. */
  readonly rideYaw: number;
  /** True if the rider can look out from the mount's own head (first person); the rest are chase-cam only. */
  readonly supportsFirstPerson?: boolean;
  /** World position of the rider's eyes when riding in first person. */
  firstPersonEye?(): Vec3;
  /** Told each frame whether the rider is in first person, so the mount can fade whatever would block the view (its head) — and keep it solid in third person. */
  setFirstPersonView?(on: boolean): void;
  /** The secondary action (double-tap Space / the touch fly button): nitro for a car, turbo for the dragon. Mounts with nothing to boost leave it out. */
  boost?(): void;
  /** Distance from `from` to this mount if the player could climb on right now, otherwise Infinity. */
  mountDistanceFrom(from: Vec3): number;
  mount(): void;
  /** Ends the ride and says where the player should end up. */
  dismount(world: World): DismountSpot;
  tickRide(dt: number, world: World, input: RideInput): void;
}

/** The common "in range in 3D and free" rule the animal and dragon mounts share. */
export function mountDistance3D(mount: Rideable, from: Vec3): number {
  if (!mount.rideable || mount.ridden) return Infinity;
  const distance = Math.hypot(mount.position.x - from.x, mount.position.y - from.y, mount.position.z - from.z);
  return distance < mount.mountRange ? distance : Infinity;
}
