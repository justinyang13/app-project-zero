// Ambient decoration only — drifting, slowly-morphing puffs at varied
// altitudes, not a real weather system (spec/07-survival-systems.md §4's
// weather states are later-phase work). A fixed scatter is generated
// once in a world-space field and each puff is kept within
// SCATTER_RADIUS of the field's current origin (wrapping around like an
// infinite tiled field) rather than streamed per-chunk like terrain —
// cheap, and clouds are far enough away that the repeating pattern isn't
// noticeable during normal play. The field only re-centers on the player
// once they've wandered past its edge (see RECENTER_MARGIN below), not
// every frame, so clouds read as anchored to the world and drifting on
// their own wind rather than rigidly tracking the camera.
import * as THREE from "three";
import { dayFactorAt } from "./Sky";

const CLOUD_COUNT = 160;
// Comfortably beyond ChunkManager's render edge (RENDER_DISTANCE_COLUMNS
// × 32) so the sky reads as covered everywhere the ground is visible,
// not just a small patch near spawn.
const SCATTER_RADIUS = 420;
const ALTITUDE_MIN = 110;
const ALTITUDE_MAX = 190;
const WIND_SPEED = 1.2; // blocks/sec — a genuine, if unhurried, drift
const PUFFS_PER_CLOUD_MIN = 3;
const PUFFS_PER_CLOUD_MAX = 6;

// Re-center the field once the player has crossed well into its edge,
// rather than continuously — an occasional jump-cut far off in the sky
// is imperceptible, but recentering every frame would make the whole
// field visibly ride along with the player instead of feeling fixed.
const RECENTER_MARGIN = SCATTER_RADIUS * 0.6;

// Cloud color tints from a dim, bluish night shade up to bright white by
// day, following the same day/night curve as the sky and sun/moon
// lighting (Sky.ts's dayFactorAt) instead of always reading full-bright
// regardless of time of day.
const NIGHT_TINT = new THREE.Color(0x4d5568);
const DAY_TINT = new THREE.Color(0xffffff);
const TWILIGHT_TINT = new THREE.Color(0xffa98a);
const MIN_OPACITY = 0.35;
const MAX_OPACITY = 0.9;
// Fraction of a cloud's own size its "breathing" scale oscillates by —
// enough to read as slowly changing shape without looking like it's
// pulsing.
const SHAPE_AMPLITUDE = 0.16;

interface CloudInstance {
  group: THREE.Group;
  material: THREE.MeshBasicMaterial;
  baseX: number;
  baseZ: number;
  opacityPhase: number;
  opacitySpeed: number;
  shapeSpeed: number;
  shapePhaseX: number;
  shapePhaseY: number;
  shapePhaseZ: number;
}

export class Clouds {
  readonly group: THREE.Group;
  private readonly clouds: CloudInstance[] = [];
  private windOffset = 0;
  private elapsed = 0;
  private fieldOriginX = 0;
  private fieldOriginZ = 0;

  constructor() {
    this.group = new THREE.Group();

    for (let i = 0; i < CLOUD_COUNT; i++) {
      const baseX = (Math.random() * 2 - 1) * SCATTER_RADIUS;
      const baseZ = (Math.random() * 2 - 1) * SCATTER_RADIUS;
      const y = ALTITUDE_MIN + Math.random() * (ALTITUDE_MAX - ALTITUDE_MIN);
      // Each cloud gets its own material (not a shared one) so its
      // opacity can breathe independently of every other cloud's.
      // fog: false — clouds scatter out to SCATTER_RADIUS (420), well
      // past the fog's far distance (300), so without this most of them
      // would read as a dingy haze instead of crisp white (same fix as
      // Sky.ts's sun/moon). MeshBasicMaterial (unlit) since brightness
      // here is driven by the day/night tint above, not scene lighting.
      const material = new THREE.MeshBasicMaterial({
        color: DAY_TINT.clone(),
        transparent: true,
        opacity: MAX_OPACITY,
        fog: false,
      });
      const puff = buildCloudPuff(material);
      puff.position.set(baseX, y, baseZ);
      this.group.add(puff);
      this.clouds.push({
        group: puff,
        material,
        baseX,
        baseZ,
        opacityPhase: Math.random() * Math.PI * 2,
        opacitySpeed: 0.02 + Math.random() * 0.03, // one breathe cycle every ~2-5 minutes
        shapeSpeed: 0.05 + Math.random() * 0.05,
        shapePhaseX: Math.random() * Math.PI * 2,
        shapePhaseY: Math.random() * Math.PI * 2,
        shapePhaseZ: Math.random() * Math.PI * 2,
      });
    }
  }

  /** Off hides the sky's clouds entirely; Low draws every third one. */
  setQuality(quality: "off" | "low" | "high"): void {
    this.group.visible = quality !== "off";
    this.clouds.forEach((cloud, i) => {
      cloud.group.visible = quality === "high" || i % 3 === 0;
    });
  }

  update(dt: number, playerX: number, playerZ: number, timeOfDay: number): void {
    this.elapsed += dt;
    this.windOffset = (this.windOffset + WIND_SPEED * dt) % (SCATTER_RADIUS * 2);

    if (Math.abs(playerX - this.fieldOriginX) > RECENTER_MARGIN) this.fieldOriginX = playerX;
    if (Math.abs(playerZ - this.fieldOriginZ) > RECENTER_MARGIN) this.fieldOriginZ = playerZ;

    const day = dayFactorAt(timeOfDay);
    // Catch the low sun: clouds blush pink-orange through dawn and dusk (strongest at the midpoint, when day is 0.5).
    const twilight = 1 - Math.abs(day * 2 - 1);
    const tint = NIGHT_TINT.clone().lerp(DAY_TINT, day).lerp(TWILIGHT_TINT, twilight * 0.75);

    for (const cloud of this.clouds) {
      cloud.group.position.x = this.fieldOriginX + wrapCoord(cloud.baseX + this.windOffset, SCATTER_RADIUS);
      cloud.group.position.z = this.fieldOriginZ + cloud.baseZ;

      const opacityWave = (Math.sin(this.elapsed * cloud.opacitySpeed + cloud.opacityPhase) + 1) / 2;
      cloud.material.opacity = MIN_OPACITY + (MAX_OPACITY - MIN_OPACITY) * opacityWave;
      cloud.material.color.copy(tint);

      // Non-uniform, independently-phased axis scaling reads as an
      // irregular cloud slowly billowing rather than a uniform pulse.
      cloud.group.scale.set(
        1 + SHAPE_AMPLITUDE * Math.sin(this.elapsed * cloud.shapeSpeed + cloud.shapePhaseX),
        1 + SHAPE_AMPLITUDE * 0.7 * Math.sin(this.elapsed * cloud.shapeSpeed * 0.8 + cloud.shapePhaseY),
        1 + SHAPE_AMPLITUDE * Math.sin(this.elapsed * cloud.shapeSpeed * 1.1 + cloud.shapePhaseZ),
      );
    }
  }

  dispose(): void {
    for (const cloud of this.clouds) cloud.material.dispose();
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
