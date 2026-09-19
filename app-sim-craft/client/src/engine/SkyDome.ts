// The sky itself: a big camera-centred dome painted by a small shader
// instead of one flat background color. Its colors are a vertical
// gradient (horizon -> mid-sky -> zenith) whose three stops change with
// the sun's height — deep blue day, indigo-magenta-orange twilight (pinker
// at dawn, hotter orange at sunset), near-black night — plus a soft glow
// of scattered light around the sun (a wide haze, a brighter halo and a
// tight bloom around the disc), a warm band hugging the horizon on the
// sun's side, and a faint halo round the moon. Everything is driven by
// `update(sunDir, moonDir)`; the colors are authored in sRGB and written
// straight to the screen.
import * as THREE from "three";

type RGB = [number, number, number];

interface Palette {
  zenith: RGB;
  mid: RGB;
  horizon: RGB;
}

const DAY: Palette = { zenith: [0.2, 0.46, 0.84], mid: [0.4, 0.67, 0.92], horizon: [0.74, 0.89, 0.97] };
const NIGHT: Palette = { zenith: [0.015, 0.025, 0.08], mid: [0.045, 0.07, 0.18], horizon: [0.09, 0.13, 0.28] };
// Dawn is the reference look: an indigo top, a magenta-pink middle and a gold horizon.
const DAWN: Palette = { zenith: [0.17, 0.16, 0.45], mid: [0.8, 0.4, 0.62], horizon: [1.0, 0.7, 0.42] };
// Sunset runs hotter and more orange.
const DUSK: Palette = { zenith: [0.15, 0.12, 0.38], mid: [0.87, 0.37, 0.4], horizon: [1.0, 0.5, 0.14] };

const DAY_GLOW: RGB = [1.0, 0.93, 0.76];
const DAWN_GLOW: RGB = [1.0, 0.62, 0.32];
const DUSK_GLOW: RGB = [1.0, 0.5, 0.16];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function blendPalettes(day: Palette, twilight: Palette, night: Palette, wDay: number, wTwilight: number, wNight: number): Palette {
  const pick = (key: keyof Palette): RGB => [
    day[key][0] * wDay + twilight[key][0] * wTwilight + night[key][0] * wNight,
    day[key][1] * wDay + twilight[key][1] * wTwilight + night[key][1] * wNight,
    day[key][2] * wDay + twilight[key][2] * wTwilight + night[key][2] * wNight,
  ];
  return { zenith: pick("zenith"), mid: pick("mid"), horizon: pick("horizon") };
}

/** How the sky looks for a sun at height `sunElevation` (sin of its angle above the horizon: 1 overhead, 0 on the horizon, negative below) on the eastern (`east` true, dawn) or western (dusk) side. */
export function skyState(sunElevation: number, east: boolean): {
  palette: Palette;
  glow: RGB;
  twilight: number;
  sunVisibility: number;
  night: number;
} {
  const wDay = smoothstep(0.08, 0.42, sunElevation);
  const wNight = 1 - smoothstep(-0.3, -0.03, sunElevation);
  const wTwilight = Math.max(0, 1 - wDay - wNight);
  const twilightPalette = east ? DAWN : DUSK;
  const palette = blendPalettes(DAY, twilightPalette, NIGHT, wDay, wTwilight, wNight);
  const twilightGlow = east ? DAWN_GLOW : DUSK_GLOW;
  // Glow color: white-gold in full day, warm through twilight.
  const glow = mix(DAY_GLOW, twilightGlow, Math.min(1, wTwilight * 1.6));
  return {
    palette,
    glow,
    twilight: wTwilight,
    // The glow lingers a little after the sun dips below the horizon, then dies away.
    sunVisibility: smoothstep(-0.3, -0.02, sunElevation),
    night: wNight,
  };
}

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
varying vec3 vDir;
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform vec3 uGlow;
uniform float uTwilight;
uniform float uSunVisibility;
uniform float uNight;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;

  // Vertical gradient: horizon color climbs into the mid band, then into the zenith.
  float up = max(h, 0.0);
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.3, up));
  col = mix(col, uZenith, smoothstep(0.22, 0.9, up));
  // Below the horizon (seen over water and gaps in the terrain): the horizon color, dimmed toward the ground.
  col = mix(col, uHorizon * 0.55, smoothstep(0.0, -0.35, h));

  // Sun glow: wide haze + halo + tight bloom round the disc.
  float c = max(dot(d, uSunDir), 0.0);
  float haze = pow(c, 3.0) * 0.32 + pow(c, 14.0) * 0.5 + pow(c, 70.0) * 0.55 + pow(c, 320.0) * 1.3;
  col += uGlow * haze * mix(0.55, 1.0, uTwilight) * uSunVisibility;

  // A warm band hugging the horizon on the sun's side of the sky.
  vec2 az = normalize(d.xz + vec2(1e-5));
  vec2 sunFlat = normalize(uSunDir.xz + vec2(1e-5));
  float side = pow(max(dot(az, sunFlat), 0.0), 2.0);
  float band = exp(-pow(h / 0.2, 2.0));
  col += uGlow * band * side * uTwilight * 0.5;

  // A pale halo round the moon.
  float m = max(dot(d, uMoonDir), 0.0);
  col += vec3(0.55, 0.65, 0.95) * (pow(m, 40.0) * 0.16 + pow(m, 500.0) * 0.5) * uNight;

  col = min(col, vec3(1.0));
  // Dither: a whisper of noise so the smooth gradient doesn't band on 8-bit screens.
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

const DOME_RADIUS = 500;

export class SkyDome {
  readonly mesh: THREE.Mesh;
  private readonly uniforms = {
    uZenith: { value: new THREE.Vector3() },
    uMid: { value: new THREE.Vector3() },
    uHorizon: { value: new THREE.Vector3() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
    uGlow: { value: new THREE.Vector3() },
    uTwilight: { value: 0 },
    uSunVisibility: { value: 1 },
    uNight: { value: 0 },
  };

  constructor() {
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: THREE.BackSide,
      depthTest: false,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 32, 20), material);
    this.mesh.renderOrder = -2000; // before the stars, before everything
    this.mesh.frustumCulled = false;
  }

  /** Re-paints for the given sun/moon directions (unit vectors from the viewer) and re-centres on the viewer. Returns the color distant terrain should fade to. */
  update(center: { x: number; y: number; z: number }, sunDir: THREE.Vector3, moonDir: THREE.Vector3): THREE.Color {
    this.mesh.position.set(center.x, center.y, center.z);
    const state = skyState(sunDir.y, sunDir.x >= 0);
    const u = this.uniforms;
    u.uZenith.value.set(...state.palette.zenith);
    u.uMid.value.set(...state.palette.mid);
    u.uHorizon.value.set(...state.palette.horizon);
    u.uGlow.value.set(...state.glow);
    u.uSunDir.value.copy(sunDir);
    u.uMoonDir.value.copy(moonDir);
    u.uTwilight.value = state.twilight;
    u.uSunVisibility.value = state.sunVisibility;
    u.uNight.value = state.night;
    // Fog is one color for the whole sky: the horizon's, leaning a little toward the mid band so twilight haze isn't a flat orange wall.
    const fog = mix(state.palette.horizon, state.palette.mid, 0.3 * state.twilight);
    return new THREE.Color().setRGB(fog[0], fog[1], fog[2], THREE.SRGBColorSpace);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
