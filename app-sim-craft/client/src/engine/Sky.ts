// Day/night defaults to the real system clock, per the user's original
// "default to system time" request — not spec/07-survival-systems.md's
// accelerated in-game day cycle (that's a separate, later-phase system).
// The caller (GameLoop) decides each frame whether to pass the live clock
// or a player-chosen override (see state/timeStore.ts) — this class just
// renders whatever timeOfDay fraction it's given. Owns the sun/moon
// meshes, the single directional "sky light" (whichever body is up),
// ambient light, and the sky/fog color.
import * as THREE from "three";

const SUNRISE = 6 / 24;
const SUNSET = 19 / 24;
const TRANSITION = 0.75 / 24; // ~45 real minutes of dawn/dusk blend

const DAY_SKY = new THREE.Color(0x8fd0f0);
const NIGHT_SKY = new THREE.Color(0x0b1230);
// Sunrise/sunset used to blend the sky straight from NIGHT_SKY to
// DAY_SKY, which — since both are blue — just faded from dark blue to
// light blue with no color shift at all through the transition. This
// third stop sits at the transition's midpoint (see skyColorAt below)
// so dawn/dusk actually pass through a warm, soft purple-pink glow
// before settling into day or night, instead of a flat two-color fade.
const TWILIGHT_SKY = new THREE.Color(0xcf7f9e);
const DAY_AMBIENT = 0.95;
// Low enough that an unlit face reads as genuinely dark at midnight
// (previously 0.22 — a wash that barely dimmed anything since it stacks
// with the moon's own directional contribution below) rather than just
// a slightly dimmer version of daytime. Not 0: a small floor keeps
// terrain shapes legible instead of going to pure black everywhere the
// moon isn't directly hitting.
const NIGHT_AMBIENT = 0.08;
const DAY_SUN_INTENSITY = 2.6;
// Dimmer highlight to match — moonlit faces should still read as
// moonlit (brighter than the ambient floor), just not near-daylight.
const NIGHT_MOON_INTENSITY = 0.18;
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
export function dayFactorAt(t: number): number {
  const rising = smoothstep(SUNRISE - TRANSITION, SUNRISE + TRANSITION, t);
  const setting = 1 - smoothstep(SUNSET - TRANSITION, SUNSET + TRANSITION, t);
  return Math.min(rising, setting);
}

/** True once it's dark enough for headlights (car high-beams, etc.) to matter — outside the sunrise/sunset transition, not just past dusk's midpoint. */
export function isNight(timeOfDay: number): boolean {
  return dayFactorAt(timeOfDay) < 0.5;
}

/**
 * Sky/fog color for a given day factor — a 3-stop gradient (night →
 * twilight → day) instead of a straight night-to-day fade, so both
 * sunrise and sunset (day factor rising through or falling through 0.5,
 * which — see dayFactorAt — lands exactly at each transition's midpoint)
 * pass through TWILIGHT_SKY's warm glow rather than just a dimmer blue.
 */
function skyColorAt(day: number): THREE.Color {
  return day <= 0.5
    ? NIGHT_SKY.clone().lerp(TWILIGHT_SKY, day * 2)
    : TWILIGHT_SKY.clone().lerp(DAY_SKY, (day - 0.5) * 2);
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

    // Near/far tuned to RENDER_DISTANCE_COLUMNS (ChunkManager.ts): far sits
    // just inside the loaded-chunk edge (10 columns × 32 blocks = 320) so
    // the world fades to sky color before chunks pop in/out at the streaming
    // boundary, instead of ending in a visible hard edge.
    scene.background = DAY_SKY.clone();
    scene.fog = new THREE.Fog(DAY_SKY.getHex(), 120, 300);
  }

  update(playerPosition: { x: number; y: number; z: number }, timeOfDay: number): void {
    const t = timeOfDay;
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

    const skyColor = skyColorAt(day);
    if (this.scene.background instanceof THREE.Color) this.scene.background.copy(skyColor);
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.copy(skyColor);
  }

  dispose(): void {
    this.scene.remove(this.skyLight, this.skyLight.target, this.ambientLight, this.sunMesh, this.moonMesh);
    this.sunMesh.geometry.dispose();
    this.moonMesh.geometry.dispose();
  }
}
