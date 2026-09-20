// A single closed-loop road that meanders around the landmarks instead of
// a geometric racetrack: a smooth spline through hand-placed control
// points that swings north around the dragon mountain, crosses the deep
// lake on a grand arched bridge, skirts the village's northwest corner,
// loops round the meadows to the south-west and climbs back up west of
// the castle. It's pure geometry (no seed dependency, no noise), so
// world-gen (terrain.ts flattens every column under it to a constant
// elevation, cutting through hills and bridging over water) and runtime
// code (Car's driving AI, the minimaps, the street lamps) can all query
// the exact same shape everywhere.
//
// The road is flat (FLAT_ROAD_Y) everywhere except across the deep lake,
// where the deck climbs in a long, gentle arch to BRIDGE_CREST_Y (see
// bridge.ts for the structure built along that stretch) — so a car can
// drive the whole thing.
import { DEEP_LAKE_CENTER } from "./deepLake";

export const ROAD_WIDTH = 7;
const ROAD_HALF_WIDTH = ROAD_WIDTH / 2;

/** Constant elevation the road sits at (everywhere but the arch of the lake bridge) — this is what makes it flat. */
export const FLAT_ROAD_Y = 70;

// Where the road crosses water it becomes a bridge, with a deck a little
// wider than the roadway so the street lamps (which stand just off its
// shoulder) have something to stand on.
export const BRIDGE_DECK_HALF_WIDTH = ROAD_HALF_WIDTH + 3;

/** How far the deck arches above FLAT_ROAD_Y at the crest of the lake bridge. */
const BRIDGE_ARCH_HEIGHT = 22;
export const BRIDGE_CREST_Y = FLAT_ROAD_Y + BRIDGE_ARCH_HEIGHT;
// The bridge starts where the centerline first comes within this distance of the deep lake's center (its shore is at ~200).
const BRIDGE_RIM = 208;
/** The fraction of the bridge's length over which the deck rises to the crest (each side); the rest in the middle is level. */
const BRIDGE_RAMP_FRACTION = 0.4;

// The loop's control points, world (x, z), listed clockwise as seen on the
// map (+x east, +z south); the spline runs through every one.
const CONTROL_POINTS_CLOCKWISE: [number, number][] = [
  [-218, -98], // northwest, west of the castle
  [-192, -170],
  [-140, -255],
  [-66, -306], // north sweep, clear of the dragon hill
  [15, -328],
  [110, -326],
  [173, -290],
  [196, -230],
  [194, -174], // the lake bridge starts around here
  [207, -118],
  [220, -70],
  [214, -22],
  [190, 20],
  [130, 58],
  [66, 84], // ...and lands on the south shore
  [12, 106],
  [-45, 108], // past the village's northwest corner
  [-70, 138],
  [-76, 190],
  [-100, 222],
  [-175, 228],
  [-245, 200],
  [-282, 132],
  [-262, 62],
  [-246, 8],
  [-236, -52], // ...and back up the castle's west side
];

const SAMPLE_SPACING = 2; // blocks between the resampled centerline points
const GRID_CELL = 16;
const QUERY_REACH = BRIDGE_DECK_HALF_WIDTH + 2; // the farthest any query cares about (trees keep this clear too)

type Point = [number, number];

/** Centripetal Catmull-Rom point between p1 and p2 (u in [0, 1]) — smooth, and never loops back on itself around uneven spacing. */
function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, u: number): Point {
  const knot = (a: Point, b: Point): number => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5);
  const t0 = 0;
  const t1 = t0 + knot(p0, p1);
  const t2 = t1 + knot(p1, p2);
  const t3 = t2 + knot(p2, p3);
  const t = t1 + (t2 - t1) * u;
  const lerp = (a: Point, b: Point, ta: number, tb: number): Point => {
    const k = (t - ta) / (tb - ta);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };
  const a1 = lerp(p0, p1, t0, t1);
  const a2 = lerp(p1, p2, t1, t2);
  const a3 = lerp(p2, p3, t2, t3);
  const b1 = lerp(a1, a2, t0, t2);
  const b2 = lerp(a2, a3, t1, t3);
  return lerp(b1, b2, t1, t2);
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

// --- build the centerline once at load --------------------------------------

const controls = [...CONTROL_POINTS_CLOCKWISE].reverse(); // keep the original counterclockwise driving direction
const DENSE_PER_SPAN = 48;
const dense: Point[] = [];
for (let i = 0; i < controls.length; i++) {
  const p0 = controls[(i - 1 + controls.length) % controls.length];
  const p1 = controls[i];
  const p2 = controls[(i + 1) % controls.length];
  const p3 = controls[(i + 2) % controls.length];
  for (let k = 0; k < DENSE_PER_SPAN; k++) dense.push(catmullRom(p0, p1, p2, p3, k / DENSE_PER_SPAN));
}

let denseLength = 0;
for (let i = 0; i < dense.length; i++) {
  const a = dense[i];
  const b = dense[(i + 1) % dense.length];
  denseLength += Math.hypot(b[0] - a[0], b[1] - a[1]);
}

// Resample at exactly equal spacing so arc length maps straight to an index (the cars drive at constant speed along it).
const COUNT = Math.round(denseLength / SAMPLE_SPACING);
const STEP = denseLength / COUNT;
export const LOOP_PERIMETER = COUNT * STEP;
const sampleX = new Float64Array(COUNT);
const sampleZ = new Float64Array(COUNT);
{
  let seg = 0;
  let segStart = 0; // arc length at dense[seg]
  let segLen = Math.hypot(dense[1][0] - dense[0][0], dense[1][1] - dense[0][1]);
  for (let j = 0; j < COUNT; j++) {
    const target = j * STEP;
    while (target > segStart + segLen && seg < dense.length - 1) {
      segStart += segLen;
      seg++;
      const a = dense[seg];
      const b = dense[(seg + 1) % dense.length];
      segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    const a = dense[seg];
    const b = dense[(seg + 1) % dense.length];
    const k = segLen > 0 ? Math.min(1, (target - segStart) / segLen) : 0;
    sampleX[j] = a[0] + (b[0] - a[0]) * k;
    sampleZ[j] = a[1] + (b[1] - a[1]) * k;
  }
}

// The lake bridge: the longest contiguous run of samples near the deep
// lake. `elevation[j]` is the deck's height above FLAT_ROAD_Y at sample j.
const elevation = new Float64Array(COUNT);
const onBridge = new Uint8Array(COUNT);
let bridgeStartIndex = -1;
let bridgeSamples = 0;
{
  const near = (j: number): boolean =>
    Math.hypot(sampleX[j] - DEEP_LAKE_CENTER.x, sampleZ[j] - DEEP_LAKE_CENTER.z) < BRIDGE_RIM;
  let best = 0;
  let bestStart = -1;
  let runStart = -1;
  let run = 0;
  for (let j = 0; j < COUNT * 2; j++) {
    if (near(j % COUNT)) {
      if (run === 0) runStart = j;
      run++;
      if (run > best && run <= COUNT) {
        best = run;
        bestStart = runStart;
      }
    } else {
      run = 0;
    }
  }
  if (best > 4 && best < COUNT) {
    bridgeStartIndex = bestStart % COUNT;
    bridgeSamples = best;
    const ramp = (best - 1) * STEP * BRIDGE_RAMP_FRACTION;
    for (let k = 0; k < best; k++) {
      const j = (bridgeStartIndex + k) % COUNT;
      onBridge[j] = 1;
      const fromEnd = Math.min(k, best - 1 - k) * STEP;
      elevation[j] = BRIDGE_ARCH_HEIGHT * smoothstep(fromEnd / ramp);
    }
  }
}

/** Arc-length span of the lake bridge along the loop, or null if the road never meets the lake. `start` is where it leaves the shore (it may exceed LOOP_PERIMETER - length if the run wraps past s = 0). */
export const BRIDGE_SPAN: { start: number; length: number } | null =
  bridgeStartIndex >= 0 ? { start: bridgeStartIndex * STEP, length: (bridgeSamples - 1) * STEP } : null;

// --- spatial index -----------------------------------------------------------

const cellKey = (cx: number, cz: number): number => (cx + 2048) * 4096 + (cz + 2048);
const grid = new Map<number, number[]>();
for (let i = 0; i < COUNT; i++) {
  const j = (i + 1) % COUNT;
  const minX = Math.floor((Math.min(sampleX[i], sampleX[j]) - QUERY_REACH) / GRID_CELL);
  const maxX = Math.floor((Math.max(sampleX[i], sampleX[j]) + QUERY_REACH) / GRID_CELL);
  const minZ = Math.floor((Math.min(sampleZ[i], sampleZ[j]) - QUERY_REACH) / GRID_CELL);
  const maxZ = Math.floor((Math.max(sampleZ[i], sampleZ[j]) + QUERY_REACH) / GRID_CELL);
  for (let cx = minX; cx <= maxX; cx++) {
    for (let cz = minZ; cz <= maxZ; cz++) {
      const key = cellKey(cx, cz);
      const list = grid.get(key);
      if (list) list.push(i);
      else grid.set(key, [i]);
    }
  }
}

export interface RoadSample {
  /** Distance from the column's center to the road's centerline. */
  dist: number;
  /** Signed sideways offset from the centerline (which side doesn't matter — use its magnitude). */
  lateral: number;
  /** Arc length along the loop of the nearest centerline point. */
  s: number;
  /** Deck elevation (world Y of the road surface) at this point. */
  deckY: number;
  /** True along the lake bridge's stretch. */
  onBridge: boolean;
  /** Distance along the bridge from where it leaves the shore (only meaningful when onBridge). */
  bridgeS: number;
}

// Reused between queries so the hot per-column checks don't allocate.
const scratch: RoadSample = { dist: 0, lateral: 0, s: 0, deckY: FLAT_ROAD_Y, onBridge: false, bridgeS: 0 };

function nearest(worldX: number, worldZ: number, reach: number): RoadSample | null {
  const px = worldX + 0.5; // measure from the column's center
  const pz = worldZ + 0.5;
  const list = grid.get(cellKey(Math.floor(px / GRID_CELL), Math.floor(pz / GRID_CELL)));
  if (!list) return null;
  let bestDist = reach;
  let bestIndex = -1;
  let bestT = 0;
  let bestSide = 0;
  for (let n = 0; n < list.length; n++) {
    const i = list[n];
    const j = i + 1 === COUNT ? 0 : i + 1;
    const ax = sampleX[i];
    const az = sampleZ[i];
    const dx = sampleX[j] - ax;
    const dz = sampleZ[j] - az;
    const lenSq = dx * dx + dz * dz;
    let t = lenSq > 0 ? ((px - ax) * dx + (pz - az) * dz) / lenSq : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ox = px - (ax + dx * t);
    const oz = pz - (az + dz * t);
    const d = Math.hypot(ox, oz);
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
      bestT = t;
      bestSide = dx * oz - dz * ox;
    }
  }
  if (bestIndex < 0) return null;
  const j = bestIndex + 1 === COUNT ? 0 : bestIndex + 1;
  scratch.dist = bestDist;
  scratch.lateral = bestSide >= 0 ? bestDist : -bestDist;
  scratch.s = (bestIndex + bestT) * STEP;
  scratch.deckY = FLAT_ROAD_Y + Math.round(elevation[bestIndex] + (elevation[j] - elevation[bestIndex]) * bestT);
  scratch.onBridge = onBridge[bestIndex] === 1 && onBridge[j] === 1;
  if (scratch.onBridge && bridgeStartIndex >= 0) {
    const along = (bestIndex - bridgeStartIndex + COUNT) % COUNT;
    scratch.bridgeS = (along + bestT) * STEP;
  } else {
    scratch.bridgeS = 0;
  }
  return scratch;
}

/** The road near this column (within the deck's width, shoulders included), or null. The returned object is reused by the next call — copy anything you need to keep. */
export function sampleRoad(worldX: number, worldZ: number): RoadSample | null {
  return nearest(worldX, worldZ, BRIDGE_DECK_HALF_WIDTH);
}

/** True if this world column falls within a bridge deck's width (the road plus its shoulders) — only meaningful where the terrain under it is water. */
export function isBridgeDeckColumn(worldX: number, worldZ: number): boolean {
  return nearest(worldX, worldZ, BRIDGE_DECK_HALF_WIDTH) !== null;
}

/** True if this world column falls within the loop road's width. */
export function isRoadColumn(worldX: number, worldZ: number): boolean {
  return nearest(worldX, worldZ, ROAD_HALF_WIDTH) !== null;
}

/** True if this column is on the road, its shoulders, or just beside them — the strip trees and other scenery keep clear. */
export function isRoadCorridorColumn(worldX: number, worldZ: number): boolean {
  return nearest(worldX, worldZ, QUERY_REACH) !== null;
}

/** 0 = not road, 1 = road, 2 = road on the lake bridge (for the maps). */
export function roadKindAt(worldX: number, worldZ: number): 0 | 1 | 2 {
  const sample = nearest(worldX, worldZ, ROAD_HALF_WIDTH);
  if (!sample) return 0;
  return sample.onBridge && sample.deckY > FLAT_ROAD_Y ? 2 : 1;
}

/** Deck elevation (world Y of the road's surface) at arc length `s` along the loop. */
export function roadDeckYAtProgress(s: number): number {
  const t = (((s % LOOP_PERIMETER) + LOOP_PERIMETER) % LOOP_PERIMETER) / STEP;
  const i = Math.floor(t) % COUNT;
  const j = (i + 1) % COUNT;
  return FLAT_ROAD_Y + Math.round(elevation[i] + (elevation[j] - elevation[i]) * (t - Math.floor(t)));
}

/**
 * Point on the loop's centerline at arc-length `s` (wraps automatically),
 * plus the heading (this engine's yaw convention: forward = (sin(yaw),
 * cos(yaw))) facing the direction of increasing `s` — i.e. the direction
 * a car driving the loop travels. Used by Car's AI to follow the track
 * without needing intersections or turn decisions like the old grid did.
 */
export function pointAtProgress(s: number): { x: number; z: number; yaw: number } {
  const t = (((s % LOOP_PERIMETER) + LOOP_PERIMETER) % LOOP_PERIMETER) / STEP;
  const i = Math.floor(t) % COUNT;
  const j = (i + 1) % COUNT;
  const k = t - Math.floor(t);
  const x = sampleX[i] + (sampleX[j] - sampleX[i]) * k;
  const z = sampleZ[i] + (sampleZ[j] - sampleZ[i]) * k;
  return { x, z, yaw: Math.atan2(sampleX[j] - sampleX[i], sampleZ[j] - sampleZ[i]) };
}
