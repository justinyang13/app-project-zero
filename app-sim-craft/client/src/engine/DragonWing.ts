// A dragon wing: bone arm + fanned finger bones with one continuous,
// scallop-edged membrane stretched between them. The membrane is a flat
// triangulated fan (not stacked boxes) painted with a procedural,
// pixelated texture — dark near the arm and the wrist, glowing red toward
// the ragged trailing edge, with veins radiating from the wrist out along
// each finger — and cut out with alphaTest so the trailing edge is jagged.
// Main-thread only (DOM canvas), like rendering/leafTexture.ts.
import * as THREE from "three";

// Wing plane coordinates: u = distance outward from the body (the mesh
// mirrors it via `side`), z = forward(+)/backward(-) along the body.
const SHOULDER: [number, number] = [0, 0];
const ELBOW: [number, number] = [15, 3];
const WRIST: [number, number] = [34, -1];
const ROOT: [number, number] = [1.5, -13]; // where the trailing edge meets the flank, behind the hips
const FINGERS = [
  { deg: 10, len: 27 },
  { deg: 45, len: 30 },
  { deg: 78, len: 26 },
  { deg: 108, len: 21 },
];
const SCALLOP_PULL = 0.24; // how far the edge between two fingertips is drawn back toward the wrist
const SAG = 0.05; // membrane droops a little behind the leading edge

const UV_BOUNDS = { uMin: -2, uMax: 66, zMin: -34, zMax: 6 };
const PX_PER_BLOCK = 4;

type P2 = [number, number];

function fingertip(i: number): P2 {
  const a = (FINGERS[i].deg * Math.PI) / 180;
  return [WRIST[0] + Math.cos(a) * FINGERS[i].len, WRIST[1] - Math.sin(a) * FINGERS[i].len];
}

function scallop(a: P2, b: P2): P2 {
  const mx = (a[0] + b[0]) / 2;
  const mz = (a[1] + b[1]) / 2;
  return [mx + (WRIST[0] - mx) * SCALLOP_PULL, mz + (WRIST[1] - mz) * SCALLOP_PULL];
}

/** The membrane's outline, leading edge first, then around the scalloped trailing edge back to the flank. */
function outline(): P2[] {
  const tips = FINGERS.map((_, i) => fingertip(i));
  const pts: P2[] = [SHOULDER, ELBOW, WRIST];
  for (let i = 0; i < tips.length; i++) {
    pts.push(tips[i]);
    pts.push(scallop(tips[i], i + 1 < tips.length ? tips[i + 1] : ROOT));
  }
  pts.push(ROOT);
  return pts;
}

function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}

function distToSegment(p: P2, a: P2, b: P2): number {
  const abx = b[0] - a[0];
  const abz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * abz) / (abx * abx + abz * abz || 1)));
  return Math.hypot(p[0] - (a[0] + abx * t), p[1] - (a[1] + abz * t));
}

function insidePolygon(p: P2, poly: P2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

const textureCache = new Map<string, THREE.CanvasTexture>();

/** Pixelated membrane texture: `dark` at the veins/arm/wrist fading to `red` at the ragged trailing edge. */
export function getWingTexture(dark: number, red: number): THREE.CanvasTexture {
  const key = `${dark}-${red}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const W = Math.round((UV_BOUNDS.uMax - UV_BOUNDS.uMin) * PX_PER_BLOCK);
  const H = Math.round((UV_BOUNDS.zMax - UV_BOUNDS.zMin) * PX_PER_BLOCK);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("DragonWing: 2D canvas context unavailable");
  const img = ctx.createImageData(W, H);

  const poly = outline();
  const trailing = poly.slice(2).concat([poly[0]]); // wrist -> tips/scallops -> root -> shoulder: the free edge
  const dc = new THREE.Color(dark);
  const rc = new THREE.Color(red);
  const ember = new THREE.Color(0xff7a4a);
  const veinAngles = [10, 27.5, 45, 61.5, 78, 93, 108, 124, 140, 158, 178];
  const primary = new Set([10, 45, 78, 108, 140]);

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const u = UV_BOUNDS.uMin + ((px + 0.5) / W) * (UV_BOUNDS.uMax - UV_BOUNDS.uMin);
      const z = UV_BOUNDS.zMax - ((py + 0.5) / H) * (UV_BOUNDS.zMax - UV_BOUNDS.zMin);
      const p: P2 = [u, z];
      const idx = (py * W + px) * 4;
      if (!insidePolygon(p, poly)) {
        img.data[idx + 3] = 0;
        continue;
      }

      // Ragged trailing edge: pixels near the free edge drop out at random,
      // more of them the closer they are to it.
      let edge = Infinity;
      for (let i = 0; i + 1 < trailing.length; i++) edge = Math.min(edge, distToSegment(p, trailing[i], trailing[i + 1]));
      const n = hash(px, py);
      if (edge < 1.4 && n < ((1.4 - edge) / 1.4) * 0.65) {
        img.data[idx + 3] = 0;
        continue;
      }

      const dx = u - WRIST[0];
      const dz = z - WRIST[1];
      const r = Math.hypot(dx, dz);
      const angDeg = (Math.atan2(-dz, dx) * 180) / Math.PI;

      // Base: dark near the wrist, glowing red out toward the trailing edge.
      let t = Math.max(0, Math.min(1, (r - 3) / 24));
      t = t * t * (3 - 2 * t);
      const shade = new THREE.Color().copy(dc).lerp(rc, Math.pow(t, 0.85));

      // Veins radiate from the wrist along (and between) the fingers.
      let veinStrength = 0;
      for (const a of veinAngles) {
        const arc = r * Math.abs(((angDeg - a) * Math.PI) / 180);
        const width = primary.has(a) ? 0.75 : 0.4;
        if (arc < width) veinStrength = Math.max(veinStrength, primary.has(a) ? 0.95 : 0.55);
      }
      // Darker where the membrane hugs the arm bones.
      const armDist = Math.min(distToSegment(p, SHOULDER, ELBOW), distToSegment(p, ELBOW, WRIST));
      const armShade = Math.max(0, 1 - armDist / 4.5) * 0.85;
      shade.lerp(dc, Math.max(veinStrength, armShade));

      // Speckle so the red isn't a flat gradient, plus the odd bright ember pixel.
      const speckle = 0.86 + n * 0.28;
      shade.multiplyScalar(speckle);
      if (n > 0.985 && t > 0.3) shade.lerp(ember, 0.7);

      img.data[idx] = Math.min(255, shade.r * 255);
      img.data[idx + 1] = Math.min(255, shade.g * 255);
      img.data[idx + 2] = Math.min(255, shade.b * 255);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

/** Membrane material — lit, plus a modest self-glow (the same texture) so the red keeps burning at night. */
export function makeWingMaterial(texture: THREE.CanvasTexture): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    map: texture,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    emissive: 0xffffff,
    emissiveMap: texture,
    emissiveIntensity: 0.4,
  });
}

function planeToWorld(side: number, p: P2): THREE.Vector3 {
  return new THREE.Vector3(side * p[0], SAG * p[1], p[1]);
}

function addBone(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, thick: number, mat: THREE.Material): void {
  const dir = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thick, thick, dir.length()), mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
  parent.add(mesh);
}

export interface WingParts {
  pivot: THREE.Group; // shoulder joint: rotation.z flaps, rotation.y sweeps, scale.x folds the span in
}

/** One wing. side: -1 = left (-x), +1 = right (+x). */
export function buildWing(side: number, boneMat: THREE.Material, membraneMat: THREE.Material): WingParts {
  const pivot = new THREE.Group();

  // Membrane: fan triangles from the wrist around the scalloped edge, plus the panels that close the flank side.
  const pts = outline();
  const tris: [P2, P2, P2][] = [];
  tris.push([SHOULDER, ELBOW, WRIST]);
  tris.push([SHOULDER, WRIST, ROOT]);
  const trailingRing = pts.slice(3, pts.length - 1); // tip0, scallop0, tip1, ..., tip3, scallop3
  trailingRing.push(ROOT);
  for (let i = 0; i + 1 < trailingRing.length; i++) tris.push([WRIST, trailingRing[i], trailingRing[i + 1]]);

  const positions: number[] = [];
  const uvs: number[] = [];
  for (const tri of tris) {
    for (const p of tri) {
      const w = planeToWorld(side, p);
      positions.push(w.x, w.y, w.z);
      uvs.push((p[0] - UV_BOUNDS.uMin) / (UV_BOUNDS.uMax - UV_BOUNDS.uMin), (p[1] - UV_BOUNDS.zMin) / (UV_BOUNDS.zMax - UV_BOUNDS.zMin));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  pivot.add(new THREE.Mesh(geometry, membraneMat));

  // Bones: arm (thick), forearm, and a finger out to each tip, plus a small thumb claw at the wrist.
  addBone(pivot, planeToWorld(side, SHOULDER), planeToWorld(side, ELBOW), 1.7, boneMat);
  addBone(pivot, planeToWorld(side, ELBOW), planeToWorld(side, WRIST), 1.3, boneMat);
  FINGERS.forEach((_, i) => addBone(pivot, planeToWorld(side, WRIST), planeToWorld(side, fingertip(i)), 0.85 - i * 0.1, boneMat));
  const claw = planeToWorld(side, WRIST);
  addBone(pivot, claw, claw.clone().add(new THREE.Vector3(side * 1.5, 1.6, 2.4)), 0.6, boneMat);

  return { pivot };
}
