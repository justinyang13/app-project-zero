// InstancedMesh pools for static obstacles/pickups (SPEC §8.5, §8.6).
// Render layer only — data comes from logic/levelTypes.

import * as THREE from 'three';
import type { Level, Obstacle } from '../logic/levelTypes';
import { droneX, DRONE_Y } from '../logic/timed';
import { laserIntensity } from './obstacleAnim';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

const CAPS = {
  barrier: 64,
  beam: 64,
  block: 48,
  bit: 600,
  boost: 16,
  repair: 16,
  core: 8,
  drone: 16,
  laser: 16,
  wallBlock: 32,
  rival: 8,
} as const;

type PoolKey = keyof typeof CAPS;

interface Pool {
  mesh: THREE.InstancedMesh;
  items: Obstacle[];
}

function laneX(o: Obstacle): number {
  const lane = (o as { lane?: number }).lane;
  return typeof lane === 'number' ? lane * 3 : 0;
}

/** Base world position (x, y, z) of an obstacle instance. Player runs toward -Z (SPEC §1). */
function basePos(o: Obstacle, out: THREE.Vector3): void {
  const z = -o.z;
  switch (o.type) {
    case 'barrier':
      out.set(laneX(o), 0.5, z);
      break;
    case 'beam':
      out.set(o.lane === 'all' ? 0 : laneX(o), 1.35, z);
      break;
    case 'block':
      out.set(laneX(o), 1.5, z);
      break;
    case 'bit':
      out.set(laneX(o), o.y + 0.35, z);
      break;
    case 'boost':
      out.set(laneX(o), 0.06, z);
      break;
    case 'repair':
      out.set(laneX(o), 1.0, z);
      break;
    case 'core':
      out.set(laneX(o), 1.0, z);
      break;
    case 'drone':
      out.set(0, DRONE_Y, z);
      break;
    case 'laser':
      out.set(0, 0.95, z);
      break;
    case 'wallBlock':
      out.set(o.side * 4.2, o.row === 'low' ? 1.6 : 4.8, z - o.len / 2);
      break;
    case 'rival':
      out.set(laneX(o), 0.5, z - 1.1);
      break;
    default:
      out.set(0, 0, z);
  }
}

function makePool(key: PoolKey, scene: THREE.Scene): Pool {
  let geometry: THREE.BufferGeometry;
  let material: THREE.Material;
  switch (key) {
    case 'barrier':
      geometry = new THREE.BoxGeometry(2.4, 1.0, 0.6);
      material = new THREE.MeshStandardMaterial({
        color: 0x1a0500, emissive: 0xff4d1a, emissiveIntensity: 2.2,
        roughness: 0.4, metalness: 0.6,
      });
      break;
    case 'beam':
      geometry = new THREE.BoxGeometry(2.4, 0.5, 0.5);
      material = new THREE.MeshStandardMaterial({
        color: 0x1a0500, emissive: 0xff4d1a, emissiveIntensity: 2.2,
        roughness: 0.4, metalness: 0.6,
      });
      break;
    case 'block':
      geometry = new THREE.BoxGeometry(3, 3, 1.2);
      material = new THREE.MeshStandardMaterial({
        color: 0x0a0a12, emissive: 0xff1744, emissiveIntensity: 0.9,
        roughness: 0.5, metalness: 0.7,
      });
      break;
    case 'bit':
      geometry = new THREE.OctahedronGeometry(0.35);
      material = new THREE.MeshStandardMaterial({
        color: 0x332b00, emissive: 0xffd400, emissiveIntensity: 2.5,
        roughness: 0.3, metalness: 0.4,
      });
      break;
    case 'boost':
      geometry = new THREE.BoxGeometry(2.2, 0.12, 1.4);
      material = new THREE.MeshStandardMaterial({
        color: 0x001a1a, emissive: 0x19f2ff, emissiveIntensity: 2.0,
        roughness: 0.3, metalness: 0.5,
      });
      break;
    case 'repair':
      geometry = new THREE.BoxGeometry(1.0, 0.3, 0.3);
      material = new THREE.MeshStandardMaterial({
        color: 0x001a0d, emissive: 0x2bff88, emissiveIntensity: 2.2,
        roughness: 0.3, metalness: 0.4,
      });
      break;
    case 'core':
      geometry = new THREE.IcosahedronGeometry(0.6);
      material = new THREE.MeshStandardMaterial({
        color: 0x2a2000, emissive: 0xffc400, emissiveIntensity: 2.6,
        roughness: 0.25, metalness: 0.6,
      });
      break;
    case 'drone':
      geometry = new THREE.CylinderGeometry(0.8, 0.8, 0.18, 24);
      material = new THREE.MeshStandardMaterial({
        color: 0x1a0500, emissive: 0xff4d1a, emissiveIntensity: 2.0,
        roughness: 0.3, metalness: 0.7,
      });
      break;
    case 'laser':
      geometry = new THREE.BoxGeometry(9, 0.9, 0.3);
      // MeshBasicMaterial + per-instance color: lets each laser flicker
      // independently (bloom picks up the bright red).
      material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      break;
    case 'wallBlock':
      geometry = new THREE.BoxGeometry(0.8, 2.6, 1);
      material = new THREE.MeshStandardMaterial({
        color: 0x12000a, emissive: 0xff1744, emissiveIntensity: 1.4,
        roughness: 0.4, metalness: 0.6,
      });
      break;
    case 'rival': {
      // Orange light cycle: stretched body + two torus wheels (merged).
      const body = new THREE.BoxGeometry(1.1, 0.55, 2.2);
      body.translate(0, 0.55, 0);
      const wheelGeo = new THREE.TorusGeometry(0.42, 0.1, 8, 20);
      wheelGeo.rotateY(Math.PI / 2);
      const wheelL = wheelGeo.clone();
      wheelL.translate(-0.62, 0.42, 0);
      const wheelR = wheelGeo.clone();
      wheelR.translate(0.62, 0.42, 0);
      const canopy = new THREE.BoxGeometry(0.7, 0.35, 1.0);
      canopy.translate(0, 0.95, -0.2);
      geometry = mergeGeometries([body, wheelL, wheelR, canopy]);
      wheelGeo.dispose();
      material = new THREE.MeshStandardMaterial({
        color: 0x1a0a00, emissive: 0xff7a18, emissiveIntensity: 2.2,
        roughness: 0.3, metalness: 0.6,
      });
      break;
    }
  }
  const mesh = new THREE.InstancedMesh(geometry, material, CAPS[key]);
  mesh.count = 0;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  if (key === 'laser') {
    // Allocate the per-instance color buffer up front (flicker animation).
    const c = new THREE.Color(0xff1744);
    for (let i = 0; i < CAPS[key]; i++) mesh.setColorAt(i, c);
  }
  scene.add(mesh);
  return { mesh, items: [] };
}

export class ObstacleMeshes {
  private pools: Record<PoolKey, Pool>;
  private level: Level;
  private lastChunk = -1;
  private tmpPos = new THREE.Vector3();
  private tmpQuat = new THREE.Quaternion();
  private tmpQuat2 = new THREE.Quaternion();
  private tmpScale = new THREE.Vector3(1, 1, 1);
  private tmpMatrix = new THREE.Matrix4();
  private time = 0;
  private dist = 0;
  private droneRing: THREE.InstancedMesh;

  constructor(scene: THREE.Scene, level: Level) {
    this.level = level;
    this.pools = {
      barrier: makePool('barrier', scene),
      beam: makePool('beam', scene),
      block: makePool('block', scene),
      wallBlock: makePool('wallBlock', scene),
      drone: makePool('drone', scene),
      laser: makePool('laser', scene),
      rival: makePool('rival', scene),
      bit: makePool('bit', scene),
      boost: makePool('boost', scene),
      repair: makePool('repair', scene),
      core: makePool('core', scene),
    };
    // Drone spinning ring (SPEC §5.2: disc + ring) — companion instanced mesh.
    const ringGeo = new THREE.TorusGeometry(0.95, 0.07, 8, 28);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x1a0500, emissive: 0xff4d1a, emissiveIntensity: 2.4,
      roughness: 0.3, metalness: 0.6,
    });
    this.droneRing = new THREE.InstancedMesh(ringGeo, ringMat, CAPS.drone);
    this.droneRing.count = 0;
    this.droneRing.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.droneRing.frustumCulled = false;
    scene.add(this.droneRing);
  }

  /** First index whose obstacle z >= z (obstacles are sorted by z). */
  private lowerBound(z: number): number {
    const obs = this.level.obstacles;
    let lo = 0;
    let hi = obs.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (obs[mid].z < z) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Rebuild instance lists for the visible window [dist-40, dist+220]. */
  private rebuild(dist: number): void {
    const z0 = dist - 40;
    const z1 = dist + 220;
    const obs = this.level.obstacles;
    for (const key of Object.keys(this.pools) as PoolKey[]) {
      this.pools[key].items.length = 0;
    }
    const start = this.lowerBound(z0);
    for (let i = start; i < obs.length && obs[i].z < z1; i++) {
      const pool = this.pools[obs[i].type as PoolKey];
      if (pool) pool.items.push(obs[i]);
    }
    this.lastChunk = Math.floor(dist / 40);
    this.writeMatrices();
  }

  private writeMatrices(): void {
    for (const key of Object.keys(this.pools) as PoolKey[]) {
      const pool = this.pools[key];
      for (let i = 0; i < pool.items.length; i++) {
        const o = pool.items[i];
        basePos(o, this.tmpPos);
        if (key === 'repair') {
          // Plus shape: horizontal bar + vertical bar (two instances per pickup).
          this.tmpQuat.identity();
          this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
          pool.mesh.setMatrixAt(i * 2, this.tmpMatrix);
          this.tmpQuat.setFromAxisAngle(AXIS_Z, Math.PI / 2);
          this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
          pool.mesh.setMatrixAt(i * 2 + 1, this.tmpMatrix);
          continue;
        }
        if (key === 'bit' || key === 'core') {
          this.tmpQuat.setFromAxisAngle(AXIS_Y, this.time * 2 + o.id * 0.7);
        } else if (key === 'wallBlock') {
          this.tmpQuat.identity();
          this.tmpScale.set(1, 1, (o as { len: number }).len);
        } else {
          this.tmpQuat.identity();
          this.tmpScale.set(1, 1, 1);
        }
        this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
        pool.mesh.setMatrixAt(i, this.tmpMatrix);
      }
      const count = key === 'repair' ? pool.items.length * 2 : pool.items.length;
      pool.mesh.count = Math.min(count, key === 'repair' ? CAPS.repair * 2 : CAPS[key]);
      pool.mesh.instanceMatrix.needsUpdate = true;
    }
    this.animateMoving();
  }

  /** Per-frame animation of moving/toggling obstacles (only visible instances). */
  private animateMoving(): void {
    // Drones: lateral sine patrol + rotor spin (SPEC §5.2).
    const dronePool = this.pools.drone;
    for (let i = 0; i < dronePool.items.length; i++) {
      const o = dronePool.items[i] as Extract<Obstacle, { type: 'drone' }>;
      const x = droneX(o, this.time);
      this.tmpPos.set(x, DRONE_Y, -o.z);
      this.tmpQuat.setFromAxisAngle(AXIS_Y, this.time * 6 + o.phase);
      this.tmpScale.set(1, 1, 1);
      this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
      dronePool.mesh.setMatrixAt(i, this.tmpMatrix);
      // Spinning ring: tilted in X, rotating around its own axis.
      this.tmpQuat.setFromAxisAngle(AXIS_X, Math.PI / 2)
        .multiply(this.tmpQuat2.setFromAxisAngle(AXIS_Y, this.time * 9 + o.phase));
      this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
      this.droneRing.setMatrixAt(i, this.tmpMatrix);
    }
    dronePool.mesh.instanceMatrix.needsUpdate = true;
    this.droneRing.count = dronePool.items.length;
    this.droneRing.instanceMatrix.needsUpdate = true;

    // Lasers: per-instance flicker (on / off / warning) via instance color.
    const laserPool = this.pools.laser;
    if (laserPool && laserPool.items.length > 0) {
      const c = laserPool.mesh.instanceColor;
      if (c) {
        for (let i = 0; i < laserPool.items.length; i++) {
          const o = laserPool.items[i] as Extract<Obstacle, { type: 'laser' }>;
          const v = laserIntensity(o, this.time);
          c.setXYZ(i, 0.9 * v, 0.09 * v, 0.27 * v);
        }
        c.needsUpdate = true;
      }
    }

    // Rivals: move at 60% of player speed (SPEC §5.2) — lag behind the player.
    const rivalPool = this.pools.rival;
    if (rivalPool && rivalPool.items.length > 0) {
      for (let i = 0; i < rivalPool.items.length; i++) {
        const o = rivalPool.items[i] as Extract<Obstacle, { type: 'rival' }>;
        const rz = o.z + o.speedFactor * this.dist;
        const inView = rz > this.dist - 40 && rz < this.dist + 220;
        this.tmpPos.set(laneX(o), 0.55, -rz);
        this.tmpQuat.identity();
        this.tmpScale.set(inView ? 1 : 0, inView ? 1 : 0, inView ? 1 : 0);
        this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
        rivalPool.mesh.setMatrixAt(i, this.tmpMatrix);
      }
      rivalPool.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /**
   * Per-frame update: rebuild on chunk change, animate pickups, hide collected.
   * `collected` is the set of already-collected pickup ids (bits/boost/repair/core).
   */
  update(dist: number, time: number, collected: Set<number>): void {
    this.time = time;
    this.dist = dist;
    const chunk = Math.floor(dist / 40);
    if (chunk !== this.lastChunk) this.rebuild(dist);
    this.animateMoving();

    // Hide collected pickups by collapsing their instance.
    for (const key of ['bit', 'boost', 'repair', 'core'] as const) {
      const pool = this.pools[key];
      for (let i = 0; i < pool.items.length; i++) {
        if (collected.has(pool.items[i].id)) {
          const idx = key === 'repair' ? i * 2 : i;
          pool.mesh.setMatrixAt(idx, HIDDEN);
          if (key === 'repair') pool.mesh.setMatrixAt(idx + 1, HIDDEN);
          pool.mesh.instanceMatrix.needsUpdate = true;
        }
      }
    }

    // (Pickup rotation/bob is baked in at rebuild time; no per-frame matrix work.)
  }

  /** Reset visibility state (used on retry). */
  reset(dist: number): void {
    this.lastChunk = -1;
    this.rebuild(dist);
  }

  dispose(scene: THREE.Scene): void {
    for (const key of Object.keys(this.pools) as PoolKey[]) {
      const pool = this.pools[key];
      scene.remove(pool.mesh);
      pool.mesh.geometry.dispose();
      (pool.mesh.material as THREE.Material).dispose();
      pool.mesh.dispose();
    }
  }
}
