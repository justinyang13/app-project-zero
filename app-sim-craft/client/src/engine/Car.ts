// Cars: a box-mesh vehicle that either drives itself around the loop
// road (worldgen/roads.ts) or is possessed by the player (GameLoop.ts's
// E-to-enter/exit control). Like Creature, movement is a simplified
// ground-snap each tick rather than full AABB physics — findSurfaceY is
// reused from there so a car can never fly or fall through the world,
// it just rides whatever surface is beneath it (which, on the loop
// itself, is always the same flat elevation).
import * as THREE from "three";
import type { World } from "./World";
import { findSurfaceY } from "./Creature";
import { pointAtProgress } from "./worldgen/roads";

export interface CarInput {
  throttle: number; // -1..1: forward/reverse
  steer: number; // -1..1: left/right
}

const CAR_SPEED = 6; // AI cruising speed, blocks/sec
const CAR_LENGTH = 1.8;
const CAR_WIDTH = 1.0;
const CAR_HEIGHT = 0.65;
const WHEEL_RADIUS = 0.28;

const DRIVEN_MAX_SPEED = 9;
const DRIVEN_REVERSE_MAX_SPEED = 4;
const DRIVEN_ACCEL = 8;
const DRIVEN_FRICTION = 5;
const DRIVEN_TURN_RATE = 2.4; // radians/sec at full speed

export class Car {
  readonly mesh: THREE.Group;
  position: { x: number; y: number; z: number };
  yaw: number;
  speed = 0; // signed, blocks/sec — only meaningful while player-driven
  driven = false; // true while the player is possessing this car
  parked = false; // true once the player has exited it — stays put instead of resuming AI wandering

  private progress: number; // arc-length position along the loop (worldgen/roads.ts)

  constructor(color: number, y: number, startProgress: number) {
    this.mesh = buildMesh(color);
    this.progress = startProgress;
    const { x, z, yaw } = pointAtProgress(startProgress);
    this.position = { x, y, z };
    this.yaw = yaw;
    this.mesh.position.set(x, y, z);
  }

  /** Autonomous driving: follows the loop road's centerline at a constant pace. */
  tickAI(dt: number, world: World): void {
    this.progress += CAR_SPEED * dt;
    const { x, z, yaw } = pointAtProgress(this.progress);
    this.position.x = x;
    this.position.z = z;
    this.yaw = yaw;

    this.snapToGround(world);
  }

  /**
   * Player-driven: arcade throttle/steer relative to the car's own
   * heading (not the camera), ground-snapped every tick just like AI
   * mode so the car "should only stay on the ground" — it never gets a
   * gravity/jump state of its own to fall or launch out of.
   */
  tickDriven(dt: number, world: World, input: CarInput): void {
    if (input.throttle !== 0) {
      this.speed += input.throttle * DRIVEN_ACCEL * dt;
    } else if (this.speed !== 0) {
      const decel = DRIVEN_FRICTION * dt;
      this.speed = Math.abs(this.speed) <= decel ? 0 : this.speed - Math.sign(this.speed) * decel;
    }
    this.speed = THREE.MathUtils.clamp(this.speed, -DRIVEN_REVERSE_MAX_SPEED, DRIVEN_MAX_SPEED);

    if (Math.abs(this.speed) > 0.05) {
      // Scale turn rate by speed (can't pivot in place) and flip it in
      // reverse (steering right while backing up swings the nose left).
      const turnScale = Math.min(Math.abs(this.speed) / 4, 1) * Math.sign(this.speed);
      this.yaw -= input.steer * DRIVEN_TURN_RATE * turnScale * dt;
    }

    this.position.x += Math.sin(this.yaw) * this.speed * dt;
    this.position.z += Math.cos(this.yaw) * this.speed * dt;

    this.snapToGround(world);
  }

  private snapToGround(world: World): void {
    const groundY = findSurfaceY(world, this.position.x, this.position.z);
    if (groundY !== null) this.position.y = groundY;
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.y = this.yaw;
  }

  dispose(): void {
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose();
    });
  }
}

function buildMesh(color: number): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x9fd3e8 });
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

  const bodyHeight = CAR_HEIGHT * 0.6;
  const body = new THREE.Mesh(new THREE.BoxGeometry(CAR_WIDTH, bodyHeight, CAR_LENGTH), bodyMat);
  body.position.y = WHEEL_RADIUS + bodyHeight / 2;
  group.add(body);

  const cabinHeight = CAR_HEIGHT * 0.5;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(CAR_WIDTH * 0.8, cabinHeight, CAR_LENGTH * 0.55), glassMat);
  cabin.position.set(0, WHEEL_RADIUS + bodyHeight + cabinHeight / 2 - 0.05, -CAR_LENGTH * 0.05);
  group.add(cabin);

  const wheelGeom = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.22, 12);
  const wheelOffsetX = CAR_WIDTH / 2 + 0.02;
  const wheelOffsetZ = CAR_LENGTH / 2 - WHEEL_RADIUS - 0.05;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = new THREE.Mesh(wheelGeom, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * wheelOffsetX, WHEEL_RADIUS, sz * wheelOffsetZ);
      group.add(wheel);
    }
  }

  return group;
}
