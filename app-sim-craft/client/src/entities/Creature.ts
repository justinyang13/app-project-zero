// Minimal passive-creature system: a huge scope-down from the full
// spec/08-mobs-creatures.md (no AI states, taming, breeding, or spawn
// tables yet — that's Phase 2+ per spec/22-roadmap-milestones.md). This
// is just enough for ambient, wandering decoration: a species-shaped box
// mesh, a slow random-walk, and ground-snapping so it doesn't float or
// sink. No real pathfinding or collision with the player — a creature
// that wanders into an obstacle (a tree, a cliff, a wall) just turns and
// tries another direction on its next timer tick, which is enough at
// this scale to not look obviously broken.
import * as THREE from "three";
import type { World } from "../core/World";
import { findSurfaceY } from "../core/worldQueries";
import type { RideInput } from "../core/controls";
import { mountDistance3D, type DismountSpot, type Rideable } from "./Rideable";
import type { Vec3 } from "./Entity";
import { disposeObject3D } from "../rendering/disposeObject";
import { integrateRideSpeed } from "./rideKinematics";

export type CreatureSpecies =
  | "llama"
  | "sheep"
  | "cat"
  | "cow"
  | "pig"
  | "chicken"
  | "horse"
  | "fox"
  | "wolf"
  | "deer"
  | "rabbit"
  | "duck"
  | "bear";

export const ALL_SPECIES = Object.keys({
  llama: 0,
  sheep: 0,
  cat: 0,
  cow: 0,
  pig: 0,
  chicken: 0,
  horse: 0,
  fox: 0,
  wolf: 0,
  deer: 0,
  rabbit: 0,
  duck: 0,
  bear: 0,
} satisfies Record<CreatureSpecies, 0>) as CreatureSpecies[];

interface SpeciesSpec {
  speed: number; // blocks/sec
  bodySize: [number, number, number]; // x, y, z
  bodyColor: number;
  headSize: [number, number, number];
  headColor: number;
  headForwardOffset: number;
  legHeight: number;
  legColor: number;
  hasTail: boolean;
}

const SPECIES: Record<CreatureSpecies, SpeciesSpec> = {
  llama: {
    speed: 1.6,
    bodySize: [0.7, 0.9, 1.3],
    bodyColor: 0xcbb593,
    headSize: [0.35, 0.5, 0.35],
    headColor: 0xe8ddc7,
    headForwardOffset: 0.75,
    legHeight: 0.6,
    legColor: 0x8a7a5c,
    hasTail: false,
  },
  sheep: {
    speed: 1.2,
    bodySize: [0.7, 0.6, 0.9],
    bodyColor: 0xf2f2ea,
    headSize: [0.3, 0.3, 0.3],
    headColor: 0xe8ddc7,
    headForwardOffset: 0.5,
    legHeight: 0.35,
    legColor: 0x3a3a3a,
    hasTail: false,
  },
  cat: {
    speed: 1.9,
    bodySize: [0.28, 0.28, 0.5],
    bodyColor: 0x2b2b2b,
    headSize: [0.22, 0.2, 0.2],
    headColor: 0x2b2b2b,
    headForwardOffset: 0.32,
    legHeight: 0.22,
    legColor: 0x1c1c1c,
    hasTail: true,
  },
  cow: {
    speed: 1.3,
    bodySize: [0.78, 0.85, 1.45],
    bodyColor: 0xe8e0d0,
    headSize: [0.4, 0.4, 0.4],
    headColor: 0x3a3a3a,
    headForwardOffset: 0.85,
    legHeight: 0.65,
    legColor: 0x2a2a2a,
    hasTail: true,
  },
  pig: {
    speed: 1.0,
    bodySize: [0.55, 0.5, 0.8],
    bodyColor: 0xf2b5c4,
    headSize: [0.3, 0.28, 0.3],
    headColor: 0xf2b5c4,
    headForwardOffset: 0.45,
    legHeight: 0.3,
    legColor: 0xd89aa8,
    hasTail: true,
  },
  chicken: {
    speed: 1.5,
    bodySize: [0.26, 0.28, 0.34],
    bodyColor: 0xf5f0e0,
    headSize: [0.15, 0.15, 0.15],
    headColor: 0xf5f0e0,
    headForwardOffset: 0.2,
    legHeight: 0.24,
    legColor: 0xe8951a,
    hasTail: false,
  },
  horse: {
    speed: 2.4,
    bodySize: [0.65, 0.95, 1.5],
    bodyColor: 0x6b4a30,
    headSize: [0.28, 0.4, 0.34],
    headColor: 0x6b4a30,
    headForwardOffset: 0.88,
    legHeight: 0.9,
    legColor: 0x3a2a1a,
    hasTail: true,
  },
  fox: {
    speed: 2.0,
    bodySize: [0.3, 0.3, 0.6],
    bodyColor: 0xd2691e,
    headSize: [0.22, 0.22, 0.26],
    headColor: 0xd2691e,
    headForwardOffset: 0.36,
    legHeight: 0.25,
    legColor: 0x8a4a12,
    hasTail: true,
  },
  wolf: {
    speed: 2.1,
    bodySize: [0.35, 0.4, 0.75],
    bodyColor: 0x6b6b6b,
    headSize: [0.26, 0.26, 0.3],
    headColor: 0x6b6b6b,
    headForwardOffset: 0.42,
    legHeight: 0.4,
    legColor: 0x4a4a4a,
    hasTail: true,
  },
  deer: {
    speed: 2.3,
    bodySize: [0.4, 0.55, 0.9],
    bodyColor: 0xa67c52,
    headSize: [0.2, 0.25, 0.25],
    headColor: 0xa67c52,
    headForwardOffset: 0.5,
    legHeight: 0.55,
    legColor: 0x6b4a30,
    hasTail: true,
  },
  rabbit: {
    speed: 1.8,
    bodySize: [0.22, 0.2, 0.32],
    bodyColor: 0xe8e0d0,
    headSize: [0.17, 0.17, 0.17],
    headColor: 0xe8e0d0,
    headForwardOffset: 0.2,
    legHeight: 0.14,
    legColor: 0xd8d0c0,
    hasTail: true,
  },
  duck: {
    speed: 1.0,
    bodySize: [0.25, 0.25, 0.35],
    bodyColor: 0xf2e04a,
    headSize: [0.14, 0.14, 0.14],
    headColor: 0xf2e04a,
    headForwardOffset: 0.2,
    legHeight: 0.15,
    legColor: 0xe8951a,
    hasTail: false,
  },
  bear: {
    speed: 1.4,
    bodySize: [0.8, 0.75, 1.3],
    bodyColor: 0x4a3a2a,
    headSize: [0.35, 0.35, 0.35],
    headColor: 0x4a3a2a,
    headForwardOffset: 0.7,
    legHeight: 0.4,
    legColor: 0x2a1e14,
    hasTail: false,
  },
};

// A creature can step up onto a low ledge (a curb, a single stair-like
// block) but not climb a tree trunk, cliff, or wall — findSurfaceY's
// straight-down scan treats a tree's canopy the same as solid ground
// (both are just "the first non-air block"), so without this a
// creature wandering under a tree would snap straight up onto its top
// instead of being stopped by it like any other obstacle.
const MAX_STEP_HEIGHT = 1.1;

// Anything smaller than this (cat, rabbit, chicken, duck — about the size
// of the tiny reef fish) is too small to sit on; everything from a fox up
// can be ridden.
const MIN_RIDEABLE_BODY_LENGTH = 0.55;
const RIDE_SPEED_FACTOR = 3.6; // ridden speed = species wander speed * this, floored below
const RIDE_MIN_SPEED = 5;
const RIDE_ACCEL = 10;
const RIDE_FRICTION = 8;
const RIDE_TURN_RATE = 2.6; // radians/sec

interface AnimatedLeg {
  pivot: THREE.Group;
  phaseOffset: number;
}

export class Creature implements Rideable {
  readonly species: CreatureSpecies;
  readonly mesh: THREE.Group;
  position: Vec3;
  ridden = false;
  private yaw = Math.random() * Math.PI * 2;
  private wanderTimer = Math.random() * 3;
  private moving = false;
  private rideSpeed = 0;
  private walkPhase = 0;
  private readonly legs: AnimatedLeg[];

  constructor(species: CreatureSpecies, x: number, y: number, z: number) {
    this.species = species;
    this.position = { x, y, z };
    const built = buildMesh(species);
    this.mesh = built.group;
    this.legs = built.legs;
    this.mesh.position.set(x, y, z);
  }

  get rideable(): boolean {
    return SPECIES[this.species].bodySize[2] >= MIN_RIDEABLE_BODY_LENGTH;
  }
  readonly mountKind = "animal";
  get rideName(): string {
    return this.species;
  }
  readonly mountRange = 3.2;
  get rideEyeHeight(): number {
    const spec = SPECIES[this.species];
    return spec.legHeight + spec.bodySize[1] + 0.7;
  }
  get rideCameraDistance(): number {
    return 4.5 + SPECIES[this.species].bodySize[2] * 2.5;
  }
  get rideYaw(): number {
    return this.yaw;
  }

  mountDistanceFrom(from: Vec3): number {
    return mountDistance3D(this, from);
  }

  mount(): void {
    this.ridden = true;
    this.rideSpeed = 0;
    this.moving = false;
  }

  dismount(world: World): DismountSpot {
    this.ridden = false;
    this.rideSpeed = 0;
    this.wanderTimer = 0; // go back to wandering right away
    const x = this.position.x + Math.sin(this.yaw + Math.PI / 2) * 1.6;
    const z = this.position.z + Math.cos(this.yaw + Math.PI / 2) * 1.6;
    return { x, y: findSurfaceY(world, x, z) ?? this.position.y, z, flying: false };
  }

  /** Player-steered ground movement: same throttle/steer feel as Car's driven mode, with the same "can't walk onto water or up a cliff" rules the wander AI follows. */
  tickRide(dt: number, world: World, input: RideInput): void {
    const maxSpeed = Math.max(RIDE_MIN_SPEED, SPECIES[this.species].speed * RIDE_SPEED_FACTOR);
    this.rideSpeed = integrateRideSpeed(this.rideSpeed, input.throttle, dt, {
      accel: RIDE_ACCEL,
      friction: RIDE_FRICTION,
      maxForward: maxSpeed,
      maxReverse: maxSpeed * 0.4,
    });

    // Can pivot slowly even from a standstill, unlike a car.
    const turnScale = Math.max(0.35, Math.min(Math.abs(this.rideSpeed) / 3, 1)) * (this.rideSpeed < 0 ? -1 : 1);
    this.yaw -= input.steer * RIDE_TURN_RATE * turnScale * dt;

    const nextX = this.position.x + Math.sin(this.yaw) * this.rideSpeed * dt;
    const nextZ = this.position.z + Math.cos(this.yaw) * this.rideSpeed * dt;
    let moved = false;
    for (const [tx, tz] of [
      [nextX, nextZ],
      [nextX, this.position.z], // slide along a wall instead of stopping dead
      [this.position.x, nextZ],
    ]) {
      const groundY = findSurfaceY(world, tx, tz);
      if (groundY !== null && Math.abs(groundY - this.position.y) <= MAX_STEP_HEIGHT) {
        this.position.x = tx;
        this.position.z = tz;
        this.position.y = groundY;
        moved = true;
        break;
      }
    }
    if (!moved) this.rideSpeed = 0;

    this.animateLegs(dt, Math.abs(this.rideSpeed));
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.y = this.yaw;
  }

  update(dt: number, world: World): void {
    if (this.ridden) return; // tickRide owns it while the player is on it

    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 2 + Math.random() * 4;
      this.moving = Math.random() < 0.6;
      if (this.moving) this.yaw = Math.random() * Math.PI * 2;
    }

    const spec = SPECIES[this.species];
    if (this.moving) {
      const nextX = this.position.x + Math.sin(this.yaw) * spec.speed * dt;
      const nextZ = this.position.z + Math.cos(this.yaw) * spec.speed * dt;
      const nextGroundY = findSurfaceY(world, nextX, nextZ);
      const blocked = nextGroundY === null || Math.abs(nextGroundY - this.position.y) > MAX_STEP_HEIGHT;
      if (!blocked) {
        this.position.x = nextX;
        this.position.z = nextZ;
        this.position.y = nextGroundY;
      } else {
        // Stepping there would mean water, an unloaded chunk, or a step
        // too tall to walk up (a tree, a cliff, a wall) — treat it like
        // bumping into an obstacle: stay put and pick a new direction on
        // the very next tick instead of waiting out the full timer
        // facing it.
        this.moving = false;
        this.wanderTimer = 0;
      }
    }

    this.animateLegs(dt, this.moving ? spec.speed : 0);
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.y = this.yaw;
  }

  /** Diagonal-pair leg swing, amplitude and cadence scaled by how fast it's actually moving; settles back to standing when still. */
  private animateLegs(dt: number, speed: number): void {
    const amp = Math.min(1, speed / 3) * 0.7;
    this.walkPhase += dt * (2 + speed * 1.8);
    for (const leg of this.legs) {
      const target = Math.sin(this.walkPhase + leg.phaseOffset) * amp;
      leg.pivot.rotation.x += (target - leg.pivot.rotation.x) * Math.min(1, dt * 14);
    }
  }

  dispose(): void {
    disposeObject3D(this.mesh);
  }
}

function buildMesh(species: CreatureSpecies): { group: THREE.Group; legs: AnimatedLeg[] } {
  const spec = SPECIES[species];
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: spec.bodyColor });
  const body = new THREE.Mesh(new THREE.BoxGeometry(...spec.bodySize), bodyMat);
  body.position.y = spec.legHeight + spec.bodySize[1] / 2;
  group.add(body);

  const headMat = new THREE.MeshLambertMaterial({ color: spec.headColor });
  const head = new THREE.Mesh(new THREE.BoxGeometry(...spec.headSize), headMat);
  const headY = spec.legHeight + spec.bodySize[1] / 2 + spec.headSize[1] / 4;
  head.position.set(0, headY, spec.headForwardOffset);
  group.add(head);

  // Two small dark dots on the head's front face — MeshBasicMaterial so
  // they read as flat dots regardless of lighting/time of day, rather
  // than disappearing into shadow like a lit material would.
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x141414 });
  const eyeSize = THREE.MathUtils.clamp(spec.headSize[0] * 0.16, 0.035, 0.09);
  const eyeGeom = new THREE.BoxGeometry(eyeSize, eyeSize, eyeSize * 0.6);
  const eyeSpacing = spec.headSize[0] * 0.28;
  const eyeZ = spec.headForwardOffset + spec.headSize[2] / 2 + 0.01;
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeom, eyeMat);
    eye.position.set(sx * eyeSpacing, headY, eyeZ);
    group.add(eye);
  }

  const legMat = new THREE.MeshLambertMaterial({ color: spec.legColor });
  const legRadius = Math.min(spec.bodySize[0], spec.bodySize[2]) * 0.15;
  const legGeom = new THREE.BoxGeometry(legRadius, spec.legHeight, legRadius);
  const legOffsetX = spec.bodySize[0] / 2 - legRadius / 2;
  const legOffsetZ = spec.bodySize[2] / 2 - legRadius / 2;
  // Each leg hangs from a hip pivot at the belly line so it can swing
  // (diagonal pairs move together, like a real walk) instead of being a
  // rigid post.
  const legs: AnimatedLeg[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * legOffsetX, spec.legHeight, sz * legOffsetZ);
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.y = -spec.legHeight / 2;
      pivot.add(leg);
      group.add(pivot);
      legs.push({ pivot, phaseOffset: sx * sz > 0 ? 0 : Math.PI });
    }
  }

  if (spec.hasTail) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.3), bodyMat);
    tail.position.set(0, spec.legHeight + spec.bodySize[1] / 2, -spec.bodySize[2] / 2 - 0.12);
    group.add(tail);
  }

  return { group, legs };
}
