// Day/night defaults to the real system clock, per the user's original
// "default to system time" request — not spec/07-survival-systems.md's
// accelerated in-game day cycle (that's a separate, later-phase system).
// The caller (GameLoop) decides each frame whether to pass the live clock
// or a player-chosen override (see state/timeStore.ts) — this class just
// renders whatever timeOfDay fraction it's given. Owns the sun/moon
// meshes, the single directional "sky light" (whichever body is up),
// ambient light, and the sky/fog color.
import * as THREE from "three";
import { SkyDome } from "./SkyDome";

const SUNRISE = 6 / 24;
// The sun crosses the horizon at 06:00 and 18:00 (see the orbit in update() below), so the lighting transition is centred on those.
const SUNSET = 18 / 24;
const TRANSITION = 0.75 / 24; // ~45 real minutes of dawn/dusk blend

const DAY_SKY = new THREE.Color(0xbfe3f7); // fog/background before the first frame paints the real sky
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
const SUNSET_SUN_COLOR = new THREE.Color(0xff9a52); // the low sun's light, warm through dawn and dusk
const SUN_DISC_DAY = new THREE.Color(0xfff6d8);
const SUN_DISC_LOW = new THREE.Color(0xfff4cc);
const MOON_COLOR = new THREE.Color(0xaebfe0);

const ORBIT_RADIUS = 300;

const STAR_RADIUS = 280;
const STAR_COUNT = 1500;
const BRIGHT_STAR_COUNT = 160;

/** Tiny deterministic PRNG so the constellations are the same every session (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Scatters `count` points uniformly over a sphere, each a slightly different shade of white-blue-yellow. */
function buildStarField(count: number, size: number, seed: number): THREE.Points {
  const rand = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const tint = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1;
    const phi = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    positions.set([r * Math.cos(phi) * STAR_RADIUS, u * STAR_RADIUS, r * Math.sin(phi) * STAR_RADIUS], i * 3);
    tint.setHSL(rand() < 0.5 ? 0.6 : 0.12, 0.35 * rand(), 0.75 + rand() * 0.25);
    colors.set([tint.r, tint.g, tint.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  // Additive, unlit, fixed pixel size, drawn first with no depth test:
  // terrain (and the sun/moon) simply paint over them, so distant
  // mountains still silhouette against the stars, and fading a star out
  // is just scaling its color toward black (adding nothing to the sky).
  const material = new THREE.PointsMaterial({
    size,
    sizeAttenuation: false,
    vertexColors: true,
    fog: false,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.renderOrder = -1000;
  points.frustumCulled = false;
  return points;
}

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

export class Sky {
  readonly skyLight: THREE.DirectionalLight;
  readonly ambientLight: THREE.AmbientLight;
  private readonly sunMesh: THREE.Mesh;
  private readonly moonMesh: THREE.Mesh;
  private readonly scene: THREE.Scene;
  private readonly dome: SkyDome;
  private readonly stars: THREE.Group;
  private readonly dimStars: THREE.Points;
  private readonly brightStars: THREE.Points;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.dome = new SkyDome();
    scene.add(this.dome.mesh);

    // Many dim pinpricks plus a scattering of larger bright ones; the
    // whole dome follows the player and turns slowly with the time of day.
    this.dimStars = buildStarField(STAR_COUNT, 2.2, 0x57a125);
    this.brightStars = buildStarField(BRIGHT_STAR_COUNT, 3.8, 0x9b3c1f);
    this.stars = new THREE.Group();
    this.stars.add(this.dimStars, this.brightStars);
    this.stars.visible = false;
    scene.add(this.stars);

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
      new THREE.MeshBasicMaterial({ color: SUN_DISC_DAY.clone(), fog: false }),
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

  /** Fades the world into the sky just inside the edge of what's loaded (`blocks` = the render distance in blocks), so there's never a visible hard edge. */
  setViewDistance(blocks: number): void {
    if (!(this.scene.fog instanceof THREE.Fog)) return;
    const far = Math.max(70, blocks - 20);
    this.scene.fog.far = far;
    this.scene.fog.near = far * 0.4;
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

    // Stars fade in through dusk and out through dawn, hidden entirely by day.
    const starLevel = THREE.MathUtils.clamp(1 - day * 2.2, 0, 1);
    this.stars.visible = starLevel > 0.01;
    if (this.stars.visible) {
      this.stars.position.set(playerPosition.x, playerPosition.y, playerPosition.z);
      this.stars.rotation.z = t * Math.PI * 2; // the sky turns once a day, the same way the sun and moon orbit
      const twinkle = 0.85 + 0.15 * Math.sin(performance.now() * 0.0013);
      (this.dimStars.material as THREE.PointsMaterial).color.setScalar(starLevel * twinkle);
      (this.brightStars.material as THREE.PointsMaterial).color.setScalar(starLevel * (1.05 - 0.15 * twinkle));
    }

    // Paint the sky for where the sun and moon actually are, and fade distant terrain into its horizon color.
    const sunDir = sunOffset.clone().normalize();
    const skyColor = this.dome.update(playerPosition, sunDir, moonOffset.clone().normalize());
    if (this.scene.background instanceof THREE.Color) this.scene.background.copy(skyColor);
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.copy(skyColor);

    // The low sun is warmer: its disc and its light shift from white-gold overhead to orange at the horizon.
    const warmth = 1 - THREE.MathUtils.smoothstep(sunDir.y, 0.05, 0.5);
    (this.sunMesh.material as THREE.MeshBasicMaterial).color.copy(SUN_DISC_DAY).lerp(SUN_DISC_LOW, warmth);
    if (usingSun) this.skyLight.color.copy(SUN_COLOR).lerp(SUNSET_SUN_COLOR, warmth * 0.85);
  }

  dispose(): void {
    this.scene.remove(this.skyLight, this.skyLight.target, this.ambientLight, this.sunMesh, this.moonMesh, this.stars, this.dome.mesh);
    this.dome.dispose();
    for (const field of [this.dimStars, this.brightStars]) {
      field.geometry.dispose();
      (field.material as THREE.Material).dispose();
    }
    this.sunMesh.geometry.dispose();
    this.moonMesh.geometry.dispose();
  }
}
