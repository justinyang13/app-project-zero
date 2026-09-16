// Minimal passive-creature system: a huge scope-down from the full
// spec/08-mobs-creatures.md (no AI states, taming, breeding, or spawn
// tables yet — that's Phase 2+ per spec/22-roadmap-milestones.md). This
// is just enough for ambient, wandering decoration: a species-shaped box
// mesh, a slow random-walk, and ground-snapping so it doesn't float or
// sink. No collision with the player or terrain obstacles — a creature
// that wanders into a wall just turns and tries another direction on its
// next timer tick, which is enough at this scale to not look obviously
// broken.
import * as THREE from "three";
import type { World } from "./World";

export type CreatureSpecies = "llama" | "sheep" | "cat";

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
};

const GROUND_SEARCH_TOP = 110;
const GROUND_SEARCH_BOTTOM = 0;

/** Scans straight down for the first solid voxel; returns its top surface Y, or null if the column isn't loaded/found. */
export function findSurfaceY(world: World, x: number, z: number): number | null {
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  for (let y = GROUND_SEARCH_TOP; y >= GROUND_SEARCH_BOTTOM; y--) {
    if (world.getBlock(bx, y, bz) !== 0) return y + 1;
  }
  return null;
}

export class Creature {
  readonly species: CreatureSpecies;
  readonly mesh: THREE.Group;
  position: { x: number; y: number; z: number };
  private yaw = Math.random() * Math.PI * 2;
  private wanderTimer = Math.random() * 3;
  private moving = false;

  constructor(species: CreatureSpecies, x: number, y: number, z: number) {
    this.species = species;
    this.position = { x, y, z };
    this.mesh = buildMesh(species);
    this.mesh.position.set(x, y, z);
  }

  tick(dt: number, world: World): void {
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 2 + Math.random() * 4;
      this.moving = Math.random() < 0.6;
      if (this.moving) this.yaw = Math.random() * Math.PI * 2;
    }

    if (this.moving) {
      const spec = SPECIES[this.species];
      this.position.x += Math.sin(this.yaw) * spec.speed * dt;
      this.position.z += Math.cos(this.yaw) * spec.speed * dt;
    }

    const groundY = findSurfaceY(world, this.position.x, this.position.z);
    if (groundY !== null) this.position.y = groundY;

    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.y = this.yaw;
  }

  dispose(): void {
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
  }
}

function buildMesh(species: CreatureSpecies): THREE.Group {
  const spec = SPECIES[species];
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: spec.bodyColor });
  const body = new THREE.Mesh(new THREE.BoxGeometry(...spec.bodySize), bodyMat);
  body.position.y = spec.legHeight + spec.bodySize[1] / 2;
  group.add(body);

  const headMat = new THREE.MeshLambertMaterial({ color: spec.headColor });
  const head = new THREE.Mesh(new THREE.BoxGeometry(...spec.headSize), headMat);
  head.position.set(0, spec.legHeight + spec.bodySize[1] / 2 + spec.headSize[1] / 4, spec.headForwardOffset);
  group.add(head);

  const legMat = new THREE.MeshLambertMaterial({ color: spec.legColor });
  const legRadius = Math.min(spec.bodySize[0], spec.bodySize[2]) * 0.15;
  const legGeom = new THREE.BoxGeometry(legRadius, spec.legHeight, legRadius);
  const legOffsetX = spec.bodySize[0] / 2 - legRadius / 2;
  const legOffsetZ = spec.bodySize[2] / 2 - legRadius / 2;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(sx * legOffsetX, spec.legHeight / 2, sz * legOffsetZ);
      group.add(leg);
    }
  }

  if (spec.hasTail) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.3), bodyMat);
    tail.position.set(0, spec.legHeight + spec.bodySize[1] / 2, -spec.bodySize[2] / 2 - 0.12);
    group.add(tail);
  }

  return group;
}
