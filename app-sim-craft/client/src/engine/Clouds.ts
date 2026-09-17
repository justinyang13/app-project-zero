// Ambient decoration only — drifting puffs at varied altitudes, not a
// real weather system (spec/07-survival-systems.md §4's weather states
// are later-phase work). A fixed scatter is generated once in
// group-local space and each puff is kept within SCATTER_RADIUS of the
// player (wrapping around like an infinite tiled field) rather than
// streamed per-chunk like terrain — cheap, and clouds are far enough
// away that the repeating pattern isn't noticeable during normal play.
import * as THREE from "three";

const CLOUD_COUNT = 160;
// Comfortably beyond ChunkManager's render edge (RENDER_DISTANCE_COLUMNS
// × 32) so the sky reads as covered everywhere the ground is visible,
// not just a small patch near spawn.
const SCATTER_RADIUS = 420;
const ALTITUDE_MIN = 110;
const ALTITUDE_MAX = 190;
const WIND_SPEED = 0.5; // blocks/sec
const PUFFS_PER_CLOUD_MIN = 3;
const PUFFS_PER_CLOUD_MAX = 6;

interface CloudInstance {
  group: THREE.Group;
  baseX: number;
  baseZ: number;
}

export class Clouds {
  readonly group: THREE.Group;
  private readonly clouds: CloudInstance[] = [];
  private windOffset = 0;

  constructor() {
    this.group = new THREE.Group();
    // fog: false — clouds scatter out to SCATTER_RADIUS (420), well past
    // the fog's far distance (300), so without this most of them would
    // read as a dingy haze instead of crisp white (same fix as Sky.ts's
    // sun/moon). MeshBasicMaterial (unlit) instead of Lambert since these
    // are meant to always read bright white regardless of time-of-day
    // lighting.
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false });

    for (let i = 0; i < CLOUD_COUNT; i++) {
      const baseX = (Math.random() * 2 - 1) * SCATTER_RADIUS;
      const baseZ = (Math.random() * 2 - 1) * SCATTER_RADIUS;
      const y = ALTITUDE_MIN + Math.random() * (ALTITUDE_MAX - ALTITUDE_MIN);
      const puff = buildCloudPuff(material);
      puff.position.set(baseX, y, baseZ);
      this.group.add(puff);
      this.clouds.push({ group: puff, baseX, baseZ });
    }
  }

  update(dt: number, playerX: number, playerZ: number): void {
    this.windOffset = (this.windOffset + WIND_SPEED * dt) % (SCATTER_RADIUS * 2);
    for (const cloud of this.clouds) {
      cloud.group.position.x = playerX + wrapCoord(cloud.baseX + this.windOffset, SCATTER_RADIUS);
      cloud.group.position.z = playerZ + cloud.baseZ;
    }
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose();
    });
  }
}

/** Wraps `value` into [-radius, radius) — keeps a drifting cloud cycling smoothly through the scatter field instead of drifting off to infinity. */
function wrapCoord(value: number, radius: number): number {
  const span = radius * 2;
  return (((value + radius) % span) + span) % span - radius;
}

/** One "cloud": a small irregular cluster of overlapping boxes at varied sizes/heights, instead of one flat rectangular slab. */
function buildCloudPuff(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const puffCount = PUFFS_PER_CLOUD_MIN + Math.floor(Math.random() * (PUFFS_PER_CLOUD_MAX - PUFFS_PER_CLOUD_MIN + 1));
  for (let i = 0; i < puffCount; i++) {
    const width = 6 + Math.random() * 14;
    const depth = 5 + Math.random() * 10;
    const height = 1.5 + Math.random() * 2.5;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    // Offset each puff from the cloud's own center so they overlap into
    // one irregular blob instead of stacking into a uniform slab.
    mesh.position.set((Math.random() * 2 - 1) * 8, (Math.random() * 2 - 1) * 1.5, (Math.random() * 2 - 1) * 6);
    group.add(mesh);
  }
  return group;
}
