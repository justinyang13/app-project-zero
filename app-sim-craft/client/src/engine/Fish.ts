// Ambient aquatic decoration, the water counterpart to Creature.ts's
// land-animal roster: a species-shaped box mesh, a slow random-walk, but
// swimming in full 3D within whatever water body the fish spawned in
// instead of snapping to a ground surface. No schooling, fleeing, or
// fishing/catching mechanics — same "ambient decoration" scope as
// Creature.ts, just wet.
import * as THREE from "three";
import type { World } from "./World";
import { WATER_ID } from "./worldgen/terrain";

export type FishSpecies =
  | "clownfish"
  | "tomato_clownfish"
  | "blue_tang"
  | "yellow_tang"
  | "parrotfish"
  | "butterflyfish"
  | "goatfish"
  | "dottyback"
  | "red_snapper";

export const ALL_FISH_SPECIES = Object.keys({
  clownfish: 0,
  tomato_clownfish: 0,
  blue_tang: 0,
  yellow_tang: 0,
  parrotfish: 0,
  butterflyfish: 0,
  goatfish: 0,
  dottyback: 0,
  red_snapper: 0,
} satisfies Record<FishSpecies, 0>) as FishSpecies[];

interface FishSpec {
  speed: number; // blocks/sec
  bodySize: [number, number, number]; // x, y, z
  bodyColor: number;
  accentColor: number; // belly band / secondary color
  finColor: number;
  hasBarbels?: boolean; // goatfish's pair of chin whiskers
}

const SPECIES: Record<FishSpecies, FishSpec> = {
  clownfish: { speed: 1.1, bodySize: [0.3, 0.26, 0.5], bodyColor: 0xe8791a, accentColor: 0xf5f0e6, finColor: 0xe8791a },
  tomato_clownfish: { speed: 1.0, bodySize: [0.32, 0.28, 0.52], bodyColor: 0x9a1f1a, accentColor: 0xf5f0e6, finColor: 0x9a1f1a },
  blue_tang: { speed: 1.4, bodySize: [0.34, 0.34, 0.42], bodyColor: 0x2a5fd0, accentColor: 0x141420, finColor: 0xf2e04a },
  yellow_tang: { speed: 1.3, bodySize: [0.3, 0.32, 0.38], bodyColor: 0xf2d022, accentColor: 0xf2d022, finColor: 0xf2d022 },
  parrotfish: { speed: 1.2, bodySize: [0.36, 0.3, 0.55], bodyColor: 0x3fae8a, accentColor: 0xe89ac0, finColor: 0xe89ac0 },
  butterflyfish: { speed: 1.1, bodySize: [0.3, 0.3, 0.4], bodyColor: 0xf0ece0, accentColor: 0x1a1a1a, finColor: 0xe8951a },
  goatfish: { speed: 1.0, bodySize: [0.3, 0.24, 0.5], bodyColor: 0xe8ddc0, accentColor: 0xf2c04a, finColor: 0xe8ddc0, hasBarbels: true },
  dottyback: { speed: 1.3, bodySize: [0.24, 0.2, 0.38], bodyColor: 0x8a2fbf, accentColor: 0xf2d022, finColor: 0x8a2fbf },
  red_snapper: { speed: 1.15, bodySize: [0.34, 0.3, 0.5], bodyColor: 0xc0392b, accentColor: 0xf0ece0, finColor: 0xc0392b },
};

const WATER_SEARCH_TOP = 100;
const WATER_SEARCH_BOTTOM = 0;

/**
 * Scans straight down for a contiguous run of water blocks and returns its
 * vertical span (top surface Y, bottom-most water block's Y), or null if
 * this column has no water — dry land, an unloaded chunk, or (mid-scan)
 * water sitting with nothing solid under it, which shouldn't happen given
 * how worldgen/terrain.ts floods lake basins but is treated as "no water"
 * rather than crashing if it ever does.
 */
export function findWaterColumn(world: World, x: number, z: number): { top: number; bottom: number } | null {
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  let top: number | null = null;
  for (let y = WATER_SEARCH_TOP; y >= WATER_SEARCH_BOTTOM; y--) {
    const block = world.getBlock(bx, y, bz);
    if (block === WATER_ID) {
      if (top === null) top = y;
      continue;
    }
    if (block === 0) {
      if (top === null) continue; // still scanning down through open air above the water
      return null;
    }
    return top === null ? null : { top, bottom: y + 1 };
  }
  return null;
}

// A fish needs real depth to swim in — Fish.tick's vertical clearance
// margins (0.25 off the bed, 0.35 off the surface) already add up to 0.6
// blocks, so a column any shallower than this would leave it with no legal
// Y at all and freeze it in place the instant it tried to move. Below this
// threshold (e.g. a 1-block-deep puddle, common wherever the heightmap
// dips only slightly under SEA_LEVEL) a spot just isn't worth spawning a
// fish in.
export const MIN_SWIMMABLE_DEPTH = 2;

export function hasSwimmingRoom(column: { top: number; bottom: number } | null): column is { top: number; bottom: number } {
  return column !== null && column.top - column.bottom >= MIN_SWIMMABLE_DEPTH;
}

const SPOT_SCAN_STEP = 3; // blocks between sampled columns — fine enough to land inside most lakes without checking every single column

/**
 * Grid-scans a disc around (originX, originZ) for columns with real
 * swimming depth. A blind random dart within a wide radius (the first cut
 * of this spawner) turns out to almost always miss: water deep enough to
 * swim in is a small fraction of the world's surface, so a handful of
 * random points rarely lands inside the one nearby lake. Walking the grid
 * instead finds every candidate that's actually there, so spawning can
 * sample from real hits rather than hoping to land on one. Stops early
 * once `maxResults` are found — plenty for sampling a spawn batch from,
 * and enough to cap the cost of scanning a very large lake.
 */
export function findNearbyWaterSpots(
  world: World,
  originX: number,
  originZ: number,
  maxRadius: number,
  maxResults: number,
): { x: number; z: number; top: number; bottom: number }[] {
  const spots: { x: number; z: number; top: number; bottom: number }[] = [];
  const radiusSq = maxRadius * maxRadius;
  for (let dx = -maxRadius; dx <= maxRadius; dx += SPOT_SCAN_STEP) {
    for (let dz = -maxRadius; dz <= maxRadius; dz += SPOT_SCAN_STEP) {
      if (dx * dx + dz * dz > radiusSq) continue;
      const x = originX + dx;
      const z = originZ + dz;
      const column = findWaterColumn(world, x, z);
      if (hasSwimmingRoom(column)) {
        spots.push({ x, z, top: column.top, bottom: column.bottom });
        if (spots.length >= maxResults) return spots;
      }
    }
  }
  return spots;
}

/** Picks up to `count` random, non-repeating entries from `list` — used to scatter spawns across whatever water spots were found rather than clustering on the first ones scanned. */
export function sampleRandom<T>(list: T[], count: number): T[] {
  const pool = [...list];
  const result: T[] = [];
  while (result.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

export class Fish {
  readonly species: FishSpecies;
  readonly mesh: THREE.Group;
  position: { x: number; y: number; z: number };
  private yaw = Math.random() * Math.PI * 2;
  private pitch = 0;
  private wanderTimer = Math.random() * 3;
  private moving = true;
  private tailPhase = Math.random() * Math.PI * 2;
  private readonly tailFin: THREE.Mesh;

  constructor(species: FishSpecies, x: number, y: number, z: number) {
    this.species = species;
    this.position = { x, y, z };
    const built = buildMesh(species);
    this.mesh = built.group;
    this.tailFin = built.tailFin;
    this.mesh.position.set(x, y, z);
  }

  tick(dt: number, world: World): void {
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 1.5 + Math.random() * 3;
      this.moving = Math.random() < 0.85;
      if (this.moving) {
        this.yaw += (Math.random() - 0.5) * 2.2; // a gentle course correction, not a full about-face
        this.pitch = (Math.random() - 0.5) * 0.5;
      }
    }

    if (this.moving) {
      const spec = SPECIES[this.species];
      const forwardSpeed = spec.speed * Math.cos(this.pitch);
      const nextX = this.position.x + Math.sin(this.yaw) * forwardSpeed * dt;
      const nextZ = this.position.z + Math.cos(this.yaw) * forwardSpeed * dt;
      const nextY = this.position.y + Math.sin(this.pitch) * spec.speed * dt;
      const column = findWaterColumn(world, nextX, nextZ);
      // Stay clear of the surface and the lakebed by a small margin so the
      // fish never pokes visibly out of the water or clips into the floor.
      const blocked = column === null || nextY < column.bottom + 0.25 || nextY > column.top - 0.35;
      if (!blocked) {
        this.position.x = nextX;
        this.position.y = nextY;
        this.position.z = nextZ;
      } else {
        // Swam to the edge of its water body (or a lake wall) — stop and
        // pick a fresh heading on the very next tick, same idea as
        // Creature.ts's land-obstacle handling.
        this.moving = false;
        this.wanderTimer = 0;
        this.yaw = Math.random() * Math.PI * 2;
        this.pitch = 0;
      }
    }

    this.tailPhase += dt * SPECIES[this.species].speed * 5;
    this.tailFin.rotation.y = Math.sin(this.tailPhase) * 0.5;

    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.rotation.set(-this.pitch, this.yaw, 0);
  }

  dispose(): void {
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose();
    });
  }
}

function buildMesh(species: FishSpecies): { group: THREE.Group; tailFin: THREE.Mesh } {
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

  return { group, tailFin };
}
