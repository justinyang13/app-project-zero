// Ambient aquatic life, the water counterpart to Creature.ts's land-animal
// roster: species-shaped box meshes doing a slow random-walk, swimming in
// full 3D within whatever water body they spawned in instead of snapping
// to a ground surface. Two tiers share the one Fish class:
//   - tiny reef fish (clownfish, tangs, ...) — decoration only, too small
//     to ride;
//   - shark and whale — big enough to ride, and only ever at home in the
//     deep lake (worldgen/deepLake.ts), since they need real depth.
// No schooling, fleeing, or fishing/catching mechanics.
import * as THREE from "three";
import type { World } from "../core/World";
import { findWaterColumn } from "../core/worldQueries";
import { DEEP_LAKE_CENTER } from "../worldgen/deepLake";
import { mountDistance3D, type DismountSpot, type Rideable, type RideInput } from "./Rideable";
import type { Vec3 } from "./Entity";
import { disposeObject3D } from "../rendering/disposeObject";
import { integrateRideSpeed } from "./rideKinematics";

export type FishSpecies =
  | "clownfish"
  | "tomato_clownfish"
  | "blue_tang"
  | "yellow_tang"
  | "parrotfish"
  | "butterflyfish"
  | "goatfish"
  | "dottyback"
  | "red_snapper"
  | "shark"
  | "whale";

/** The small, decorative species the ambient spawner scatters around — the big ones are placed deliberately (see GameLoop's big-aquatic top-up). */
export const ALL_FISH_SPECIES: FishSpecies[] = [
  "clownfish",
  "tomato_clownfish",
  "blue_tang",
  "yellow_tang",
  "parrotfish",
  "butterflyfish",
  "goatfish",
  "dottyback",
  "red_snapper",
];

export type BigAquaticSpecies = "shark" | "whale";
export const BIG_AQUATIC_SPECIES: BigAquaticSpecies[] = ["whale", "shark"];

interface RideSpec {
  speed: number; // blocks/sec at full throttle
  climb: number; // blocks/sec vertical
  mountRange: number;
  eyeHeight: number;
  cameraDistance: number;
}

interface FishSpec {
  label: string;
  speed: number; // blocks/sec while wandering
  bodySize: [number, number, number]; // x, y, z
  bodyColor: number;
  accentColor: number; // belly band / secondary color
  finColor: number;
  hasBarbels?: boolean; // goatfish's pair of chin whiskers
  turnRate: number; // radians/sec the heading can swing toward its target
  minDepth: number; // water depth (top - bottom) required at every point the body occupies
  spawnDepth: number; // deeper than minDepth, so a fresh spawn isn't already at the edge of where it's allowed
  probes: number[]; // fractions of half-length along the heading to test for water (0 = center only)
  ride?: RideSpec;
}

function reef(spec: Pick<FishSpec, "label" | "speed" | "bodySize" | "bodyColor" | "accentColor" | "finColor"> & { hasBarbels?: boolean }): FishSpec {
  return { ...spec, turnRate: 8, minDepth: 0, spawnDepth: 2, probes: [0] };
}

const SPECIES: Record<FishSpecies, FishSpec> = {
  clownfish: reef({ label: "clownfish", speed: 1.1, bodySize: [0.3, 0.26, 0.5], bodyColor: 0xe8791a, accentColor: 0xf5f0e6, finColor: 0xe8791a }),
  tomato_clownfish: reef({ label: "tomato clownfish", speed: 1.0, bodySize: [0.32, 0.28, 0.52], bodyColor: 0x9a1f1a, accentColor: 0xf5f0e6, finColor: 0x9a1f1a }),
  blue_tang: reef({ label: "blue tang", speed: 1.4, bodySize: [0.34, 0.34, 0.42], bodyColor: 0x2a5fd0, accentColor: 0x141420, finColor: 0xf2e04a }),
  yellow_tang: reef({ label: "yellow tang", speed: 1.3, bodySize: [0.3, 0.32, 0.38], bodyColor: 0xf2d022, accentColor: 0xf2d022, finColor: 0xf2d022 }),
  parrotfish: reef({ label: "parrotfish", speed: 1.2, bodySize: [0.36, 0.3, 0.55], bodyColor: 0x3fae8a, accentColor: 0xe89ac0, finColor: 0xe89ac0 }),
  butterflyfish: reef({ label: "butterflyfish", speed: 1.1, bodySize: [0.3, 0.3, 0.4], bodyColor: 0xf0ece0, accentColor: 0x1a1a1a, finColor: 0xe8951a }),
  goatfish: reef({ label: "goatfish", speed: 1.0, bodySize: [0.3, 0.24, 0.5], bodyColor: 0xe8ddc0, accentColor: 0xf2c04a, finColor: 0xe8ddc0, hasBarbels: true }),
  dottyback: reef({ label: "dottyback", speed: 1.3, bodySize: [0.24, 0.2, 0.38], bodyColor: 0x8a2fbf, accentColor: 0xf2d022, finColor: 0x8a2fbf }),
  red_snapper: reef({ label: "red snapper", speed: 1.15, bodySize: [0.34, 0.3, 0.5], bodyColor: 0xc0392b, accentColor: 0xf0ece0, finColor: 0xc0392b }),
  shark: {
    label: "shark",
    speed: 3.2,
    bodySize: [1.3, 1.4, 5.6],
    bodyColor: 0x7d8b97,
    accentColor: 0xe9eff2,
    finColor: 0x6a7884,
    turnRate: 1.7,
    minDepth: 5,
    spawnDepth: 8,
    probes: [-1, 0, 1],
    ride: { speed: 14, climb: 5, mountRange: 7, eyeHeight: 2.2, cameraDistance: 11 },
  },
  whale: {
    label: "whale",
    speed: 2.2,
    bodySize: [4.2, 4.2, 14],
    bodyColor: 0x3f5f86,
    accentColor: 0xcdd9e3,
    finColor: 0x35526f,
    turnRate: 0.6,
    minDepth: 10,
    spawnDepth: 14,
    probes: [-1, 0, 1],
    ride: { speed: 10, climb: 4, mountRange: 12, eyeHeight: 5, cameraDistance: 28 },
  },
};

export function isBigAquatic(species: FishSpecies): species is BigAquaticSpecies {
  return SPECIES[species].ride !== undefined;
}

/** Minimum water depth (top - bottom) worth spawning this species into. */
export function spawnDepthFor(species: FishSpecies): number {
  return SPECIES[species].spawnDepth;
}

function clearances(spec: FishSpec): { bottom: number; top: number } {
  // For the tiny reef fish these work out to the original 0.25 off the bed
  // and 0.35 off the surface; big bodies scale with their own height.
  return { bottom: spec.bodySize[1] / 2 + 0.12, top: spec.bodySize[1] / 2 + 0.22 };
}

/** A random Y inside the legal swimming band of a column for this species. */
export function pickSwimY(species: FishSpecies, column: { top: number; bottom: number }): number {
  const { bottom, top } = clearances(SPECIES[species]);
  const lo = column.bottom + bottom;
  const hi = column.top - top;
  return lo + Math.random() * Math.max(0, hi - lo);
}

function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export class Fish implements Rideable {
  readonly species: FishSpecies;
  readonly mesh: THREE.Group;
  position: Vec3;
  ridden = false;
  private yaw = Math.random() * Math.PI * 2;
  private yawTarget = this.yaw;
  private pitch = 0;
  private wanderTimer = Math.random() * 3;
  private moving = true;
  private tailPhase = Math.random() * Math.PI * 2;
  private rideSpeed = 0;
  private readonly tail: THREE.Object3D;
  private readonly tailAxis: "x" | "y";

  constructor(species: FishSpecies, x: number, y: number, z: number) {
    this.species = species;
    this.position = { x, y, z };
    const built = species === "shark" ? buildSharkMesh() : species === "whale" ? buildWhaleMesh() : buildReefMesh(species);
    this.mesh = built.group;
    this.tail = built.tail;
    this.tailAxis = built.tailAxis;
    this.mesh.position.set(x, y, z);
  }

  get isBig(): boolean {
    return isBigAquatic(this.species);
  }

  // --- Rideable ---------------------------------------------------------
  get rideable(): boolean {
    return SPECIES[this.species].ride !== undefined;
  }
  readonly mountKind = "animal";
  get rideName(): string {
    return SPECIES[this.species].label;
  }
  get mountRange(): number {
    return SPECIES[this.species].ride?.mountRange ?? 0;
  }
  get rideEyeHeight(): number {
    return SPECIES[this.species].ride?.eyeHeight ?? 0;
  }
  get rideCameraDistance(): number {
    return SPECIES[this.species].ride?.cameraDistance ?? 0;
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

  /** Puts the player back at the water's surface just beside the animal (they drop the last block and float/swim from there). */
  dismount(world: World): DismountSpot {
    this.ridden = false;
    this.rideSpeed = 0;
    this.wanderTimer = 0;
    this.yawTarget = this.yaw;
    const side = SPECIES[this.species].bodySize[0] / 2 + 1.5;
    const x = this.position.x + Math.sin(this.yaw + Math.PI / 2) * side;
    const z = this.position.z + Math.cos(this.yaw + Math.PI / 2) * side;
    const column = findWaterColumn(world, x, z) ?? findWaterColumn(world, this.position.x, this.position.z);
    return { x, y: column ? column.top + 1.2 : this.position.y, z, flying: false };
  }

  /** Whether a body of this species centered at (x, y, z) heading `yaw` fits entirely in water it's allowed in — every probe point along its length needs enough depth and vertical clearance. */
  private canOccupy(world: World, x: number, y: number, z: number, yaw: number): boolean {
    const spec = SPECIES[this.species];
    const half = spec.bodySize[2] / 2;
    const clear = clearances(spec);
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    for (const p of spec.probes) {
      const column = findWaterColumn(world, x + fx * half * p, z + fz * half * p);
      if (!column || column.top - column.bottom < spec.minDepth) return false;
      if (y < column.bottom + clear.bottom || y > column.top - clear.top) return false;
    }
    return true;
  }

  tickRide(dt: number, world: World, input: RideInput): void {
    const spec = SPECIES[this.species];
    const ride = spec.ride;
    if (!ride) return;

    this.rideSpeed = integrateRideSpeed(this.rideSpeed, input.throttle, dt, {
      accel: ride.speed * 1.2,
      friction: ride.speed * 0.6,
      maxForward: ride.speed,
      maxReverse: ride.speed * 0.3,
    });

    this.yaw -= input.steer * Math.max(1.4, spec.turnRate * 2) * dt;
    this.yawTarget = this.yaw;

    const vy = input.climb * ride.climb;
    this.pitch = THREE.MathUtils.clamp(Math.atan2(vy, Math.max(Math.abs(this.rideSpeed), 2)), -0.5, 0.5);

    const nx = this.position.x + Math.sin(this.yaw) * this.rideSpeed * dt;
    const nz = this.position.z + Math.cos(this.yaw) * this.rideSpeed * dt;
    const ny = this.position.y + vy * dt;
    const { x, y, z } = this.position;
    let moved = false;
    // Full move first, then progressively simpler fallbacks so it slides
    // along a lake wall or the surface instead of stopping dead against it.
    for (const [tx, ty, tz] of [
      [nx, ny, nz],
      [nx, y, nz],
      [nx, ny, z],
      [x, ny, nz],
      [x, ny, z],
    ]) {
      if (this.canOccupy(world, tx, ty, tz, this.yaw)) {
        this.position.x = tx;
        this.position.y = ty;
        this.position.z = tz;
        moved = true;
        break;
      }
    }
    if (!moved) this.rideSpeed *= 0.3;

    this.animate(dt, Math.max(Math.abs(this.rideSpeed), spec.speed * 0.5));
  }

  update(dt: number, world: World): void {
    if (this.ridden) return; // tickRide owns it while the player is on it

    const spec = SPECIES[this.species];
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 1.5 + Math.random() * 3;
      this.moving = Math.random() < 0.85;
      if (this.moving) {
        this.yawTarget += (Math.random() - 0.5) * 2.2; // a gentle course correction, not a full about-face
        this.pitch = (Math.random() - 0.5) * (this.isBig ? 0.2 : 0.5);
      }
    }

    // The heading eases toward its target at the species' own turn rate —
    // a whale takes many seconds to come about, a reef fish barely lags.
    const diff = wrapAngle(this.yawTarget - this.yaw);
    const step = spec.turnRate * dt;
    this.yaw += Math.max(-step, Math.min(step, diff));
    const aligned = Math.abs(diff) < 0.7; // don't swim forward while still facing the wrong way

    if (this.moving && aligned) {
      const forwardSpeed = spec.speed * Math.cos(this.pitch);
      const nextX = this.position.x + Math.sin(this.yaw) * forwardSpeed * dt;
      const nextZ = this.position.z + Math.cos(this.yaw) * forwardSpeed * dt;
      const nextY = this.position.y + Math.sin(this.pitch) * spec.speed * dt;
      if (this.canOccupy(world, nextX, nextY, nextZ, this.yaw)) {
        this.position.x = nextX;
        this.position.y = nextY;
        this.position.z = nextZ;
      } else {
        // Swam to the edge of its water body (or a lake wall) — stop and
        // pick a fresh heading on the very next tick, same idea as
        // Creature.ts's land-obstacle handling. The big ones head back
        // toward the middle of the deep lake instead of a random
        // direction that would just hit the shore again.
        this.moving = false;
        this.wanderTimer = 0;
        this.pitch = 0;
        this.yawTarget = this.isBig
          ? Math.atan2(DEEP_LAKE_CENTER.x - this.position.x, DEEP_LAKE_CENTER.z - this.position.z) + (Math.random() - 0.5) * 0.8
          : Math.random() * Math.PI * 2;
      }
    }

    this.animate(dt, this.moving ? spec.speed : spec.speed * 0.3);
  }

  private animate(dt: number, swimSpeed: number): void {
    // Whale/shark tails beat slower in absolute terms than a reef fish's flicker.
    const cadence = this.isBig ? 1.6 + swimSpeed * 0.25 : swimSpeed * 5;
    this.tailPhase += dt * cadence;
    const swing = this.isBig ? 0.35 : 0.5;
    this.tail.rotation[this.tailAxis] = Math.sin(this.tailPhase) * swing;

    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.set(-this.pitch, this.yaw, 0);
  }

  dispose(): void {
    disposeObject3D(this.mesh);
  }
}

interface BuiltFishMesh {
  group: THREE.Group;
  tail: THREE.Object3D; // what wags
  tailAxis: "x" | "y"; // fish wag side to side, whale flukes beat up and down
}

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  mat: THREE.Material,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  parent.add(mesh);
  return mesh;
}

function buildReefMesh(species: FishSpecies): BuiltFishMesh {
  const spec = SPECIES[species];
  const group = new THREE.Group();
  const [w, h, d] = spec.bodySize;

  const bodyMat = new THREE.MeshLambertMaterial({ color: spec.bodyColor });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
  group.add(body);

  // A contrasting band across the body — most reef fish have some kind of
  // stripe/belly-color break rather than one flat color.
  const accentMat = new THREE.MeshLambertMaterial({ color: spec.accentColor });
  const accent = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, h * 0.35, d * 0.4), accentMat);
  accent.position.set(0, 0, d * 0.05);
  group.add(accent);

  const finMat = new THREE.MeshLambertMaterial({ color: spec.finColor, side: THREE.DoubleSide });

  // Tail fin, hinged at the body so it can wag during swimming.
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0, -d / 2);
  group.add(tailPivot);
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.03, h * 0.9, d * 0.42), finMat);
  tailFin.position.set(0, 0, -d * 0.2);
  tailPivot.add(tailFin);

  const dorsal = new THREE.Mesh(new THREE.BoxGeometry(0.025, h * 0.5, d * 0.3), finMat);
  dorsal.position.set(0, h * 0.55, d * 0.05);
  group.add(dorsal);

  for (const sx of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(d * 0.22, h * 0.35, 0.03), finMat);
    fin.position.set((sx * w) / 2 + sx * 0.02, -h * 0.05, d * 0.2);
    fin.rotation.y = sx * 0.5;
    group.add(fin);
  }

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
  const eyeSize = Math.max(0.04, w * 0.18);
  const eyeGeom = new THREE.BoxGeometry(eyeSize, eyeSize, eyeSize * 0.4);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeom, eyeMat);
    eye.position.set((sx * w) / 2 + 0.01 * sx, h * 0.15, d * 0.42);
    group.add(eye);
  }

  if (spec.hasBarbels) {
    const barbelMat = new THREE.MeshLambertMaterial({ color: spec.accentColor });
    const barbelGeom = new THREE.BoxGeometry(0.02, 0.02, d * 0.22);
    for (const sx of [-1, 1]) {
      const barbel = new THREE.Mesh(barbelGeom, barbelMat);
      barbel.position.set(sx * w * 0.15, -h * 0.45, d * 0.45);
      barbel.rotation.x = 0.4;
      group.add(barbel);
    }
  }

  return { group, tail: tailFin, tailAxis: "y" };
}

/** Torpedo body, pale belly, tall dorsal fin, swept pectorals, and the lopsided (long upper lobe) tail — all boxes, matching the reef fish's visual language. */
function buildSharkMesh(): BuiltFishMesh {
  const spec = SPECIES.shark;
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: spec.bodyColor });
  const belly = new THREE.MeshLambertMaterial({ color: spec.accentColor });
  const fin = new THREE.MeshLambertMaterial({ color: spec.finColor, side: THREE.DoubleSide });
  const dark = new THREE.MeshBasicMaterial({ color: 0x14181c });

  addBox(group, [1.3, 1.4, 3.4], skin, [0, 0, 0.4]);
  addBox(group, [1.0, 1.0, 1.5], skin, [0, -0.05, 2.7]); // snout
  addBox(group, [0.7, 0.75, 1.4], skin, [0, -0.05, 3.6]); // snout tip
  addBox(group, [0.9, 0.9, 1.8], skin, [0, 0, -1.9]); // tail wrist
  addBox(group, [1.0, 0.5, 3.4], belly, [0, -0.5, 0.6]);
  addBox(group, [0.85, 0.35, 1.6], belly, [0, -0.5, 2.6]);
  addBox(group, [0.7, 0.08, 0.5], dark, [0, -0.55, 3.35]); // mouth

  addBox(group, [0.14, 1.2, 1.1], fin, [0, 1.1, 0.2], [-0.4, 0, 0]); // dorsal
  addBox(group, [0.1, 0.5, 0.5], fin, [0, 0.8, -1.7], [-0.4, 0, 0]); // second dorsal
  for (const sx of [-1, 1]) {
    addBox(group, [1.8, 0.1, 0.9], fin, [sx * 1.15, -0.45, 0.9], [0, sx * 0.6, sx * 0.35]); // pectorals
    addBox(group, [0.3, 0.3, 0.14], dark, [sx * 0.62, 0.25, 2.6]); // eyes
  }

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0, -2.8);
  group.add(tailPivot);
  addBox(tailPivot, [0.16, 1.7, 1.5], fin, [0, 0.55, -0.7], [0.45, 0, 0]); // long upper lobe
  addBox(tailPivot, [0.16, 1.0, 1.0], fin, [0, -0.4, -0.5], [-0.45, 0, 0]); // short lower lobe

  return { group, tail: tailPivot, tailAxis: "y" };
}

/** A big baleen-style whale: massive body, pale grooved belly, lower jaw, paddle flippers, and horizontal flukes that beat up and down. */
function buildWhaleMesh(): BuiltFishMesh {
  const spec = SPECIES.whale;
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: spec.bodyColor });
  const belly = new THREE.MeshLambertMaterial({ color: spec.accentColor });
  const fin = new THREE.MeshLambertMaterial({ color: spec.finColor });
  const dark = new THREE.MeshBasicMaterial({ color: 0x0c1520 });

  addBox(group, [4.2, 4.0, 7.2], skin, [0, 0, 0.6]); // torso
  addBox(group, [3.8, 3.4, 3.8], skin, [0, -0.1, 5.2]); // head
  addBox(group, [3.4, 1.3, 4.2], belly, [0, -1.55, 5.5]); // lower jaw
  addBox(group, [3.6, 0.6, 7.4], belly, [0, -1.85, 0.6]); // throat/belly grooves
  addBox(group, [2.6, 2.6, 3.6], skin, [0, -0.1, -4.4]); // tail stock
  addBox(group, [1.5, 1.5, 2.8], skin, [0, -0.1, -7.0]);
  addBox(group, [0.4, 0.7, 0.9], fin, [0, 2.2, -3.6], [-0.3, 0, 0]); // small dorsal
  addBox(group, [0.7, 0.1, 0.7], dark, [0, 1.75, 4.2]); // blowhole
  for (const sx of [-1, 1]) {
    addBox(group, [2.6, 0.3, 1.2], fin, [sx * 3.2, -1.4, 3.2], [0, sx * 0.35, sx * -0.35]); // flippers
    addBox(group, [0.3, 0.3, 0.16], dark, [sx * 1.95, 0.1, 6.4]); // eyes
  }

  const flukes = new THREE.Group();
  flukes.position.set(0, -0.1, -8.4);
  group.add(flukes);
  addBox(flukes, [7, 0.4, 2.1], fin, [0, 0, -0.9]);
  addBox(flukes, [2.2, 0.4, 1.4], fin, [0, 0, -0.1]);

  return { group, tail: flukes, tailAxis: "x" };
}
