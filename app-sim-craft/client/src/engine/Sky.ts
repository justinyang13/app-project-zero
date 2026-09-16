// Day/night driven by the real system clock, per the user's explicit
// "default to system time" request — not spec/07-survival-systems.md's
// accelerated in-game day cycle (that's a separate, later-phase system;
// this one always matches whatever time it actually is when you play).
// Owns the sun/moon meshes, the single directional "sky light" (whichever
// body is up), ambient light, and the sky/fog color, all driven by one
// continuously-read Date().
import * as THREE from "three";

const SUNRISE = 6 / 24;
const SUNSET = 19 / 24;
const TRANSITION = 0.75 / 24; // ~45 real minutes of dawn/dusk blend

const DAY_SKY = new THREE.Color(0x8fd0f0);
const NIGHT_SKY = new THREE.Color(0x0b1230);
const DAY_AMBIENT = 0.95;
const NIGHT_AMBIENT = 0.22;
const DAY_SUN_INTENSITY = 2.6;
const NIGHT_MOON_INTENSITY = 0.5;
const SUN_COLOR = new THREE.Color(0xfff3d0);
const MOON_COLOR = new THREE.Color(0xaebfe0);

const ORBIT_RADIUS = 300;

/** Fraction of the day elapsed right now, in [0, 1) — a pure read of the real clock. */
export function getSystemTimeOfDay(): number {
  const now = new Date();
  return (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** 0 = full night, 1 = full day, with a smooth blend across sunrise/sunset. */
function dayFactorAt(t: number): number {
  const rising = smoothstep(SUNRISE - TRANSITION, SUNRISE + TRANSITION, t);
  const setting = 1 - smoothstep(SUNSET - TRANSITION, SUNSET + TRANSITION, t);
  return Math.min(rising, setting);
}

export class Sky {
  readonly skyLight: THREE.DirectionalLight;
  readonly ambientLight: THREE.AmbientLight;
  private readonly sunMesh: THREE.Mesh;
  private readonly moonMesh: THREE.Mesh;
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.skyLight = new THREE.DirectionalLight(SUN_COLOR, DAY_SUN_INTENSITY);
    scene.add(this.skyLight);
    scene.add(this.skyLight.target);

    this.ambientLight = new THREE.AmbientLight(0xffffff, DAY_AMBIENT);
    scene.add(this.ambientLight);

    // fog: false — at ORBIT_RADIUS (300) they sit beyond the fog's far
    // distance (190), so without this they'd blend almost entirely into
    // the fog color and read as invisible instead of a crisp sun/moon.
    this.sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(9, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false }),
    );
    this.moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(7, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xdbe4f5, fog: false }),
    );
    scene.add(this.sunMesh, this.moonMesh);

    scene.background = DAY_SKY.clone();
    scene.fog = new THREE.Fog(DAY_SKY.getHex(), 60, 190);
  }

  get isDay(): boolean {
    const t = getSystemTimeOfDay();
    return t >= SUNRISE && t < SUNSET;
  }

  update(playerPosition: { x: number; y: number; z: number }): void {
    const t = getSystemTimeOfDay();
    const day = dayFactorAt(t);

    // Sun and moon arc opposite each other across a fixed compass line —
    // decorative, not astronomically accurate (true azimuth/elevation is
    // out of scope here).
    const angle = t * Math.PI * 2 - Math.PI / 2;
    const sunOffset = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0.3).multiplyScalar(ORBIT_RADIUS);
    const moonOffset = sunOffset.clone().negate();

    this.sunMesh.position.set(playerPosition.x + sunOffset.x, playerPosition.y + sunOffset.y, playerPosition.z + sunOffset.z);
    this.moonMesh.position.set(
      playerPosition.x + moonOffset.x,
      playerPosition.y + moonOffset.y,
      playerPosition.z + moonOffset.z,
    );
    this.sunMesh.visible = sunOffset.y > 0;
    this.moonMesh.visible = moonOffset.y > 0;

    // One shared light plays the role of whichever body is actually up,
    // rather than two competing directional lights.
    const usingSun = sunOffset.y >= moonOffset.y;
    const lightOffset = usingSun ? sunOffset : moonOffset;
    this.skyLight.position.set(
      playerPosition.x + lightOffset.x,
      playerPosition.y + lightOffset.y,
      playerPosition.z + lightOffset.z,
    );
    this.skyLight.target.position.set(playerPosition.x, playerPosition.y, playerPosition.z);
    this.skyLight.color.copy(usingSun ? SUN_COLOR : MOON_COLOR);
    this.skyLight.intensity = usingSun
      ? THREE.MathUtils.lerp(NIGHT_MOON_INTENSITY, DAY_SUN_INTENSITY, day)
      : NIGHT_MOON_INTENSITY;

    this.ambientLight.intensity = THREE.MathUtils.lerp(NIGHT_AMBIENT, DAY_AMBIENT, day);

    const skyColor = NIGHT_SKY.clone().lerp(DAY_SKY, day);
    if (this.scene.background instanceof THREE.Color) this.scene.background.copy(skyColor);
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.copy(skyColor);
  }

  dispose(): void {
    this.scene.remove(this.skyLight, this.skyLight.target, this.ambientLight, this.sunMesh, this.moonMesh);
    this.sunMesh.geometry.dispose();
    this.moonMesh.geometry.dispose();
  }
}
