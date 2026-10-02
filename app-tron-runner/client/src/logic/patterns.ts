// Hand-written pattern library (SPEC §5.3). Pure TS.
// Each pattern produces obstacles relative to z = 0 and declares a `length`.
// `id` is a placeholder (0); buildLevel reassigns unique ids after sorting.

import type { Lane, Obstacle, WallSide } from './levelTypes';
import type { Rng } from './rng';

export interface Pattern {
  name: string;
  length: number;
  build: (rng: Rng) => Obstacle[];
}

const L = -1 as Lane;
const C = 0 as Lane;
const R = 1 as Lane;

function bit(lane: Lane, z: number, y: number): Obstacle {
  return { id: 0, type: 'bit', lane, z, y };
}

/** Parabolic bit arc over `span` metres, peaking at `peakY`. */
function bitArc(lane: Lane, z: number, span: number, peakY: number, n: number): Obstacle[] {
  const out: Obstacle[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const y = peakY * 4 * t * (1 - t);
    out.push(bit(lane, z + t * span, y));
  }
  return out;
}

/** Straight low bit line. */
function bitLine(lane: Lane, z: number, span: number, n: number): Obstacle[] {
  const out: Obstacle[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push(bit(lane, z + t * span, 0.6));
  }
  return out;
}

export const PATTERNS: Record<string, Pattern> = {
  jumpOverCenter: {
    name: 'jumpOverCenter',
    length: 10,
    build: () => [
      { id: 0, type: 'barrier', lane: C, z: 4 },
      ...bitArc(C, 0.5, 7, 2.6, 5),
    ],
  },
  jumpOverLeft: {
    name: 'jumpOverLeft',
    length: 10,
    build: () => [
      { id: 0, type: 'barrier', lane: L, z: 4 },
      ...bitArc(L, 0.5, 7, 2.6, 5),
    ],
  },
  jumpOverRight: {
    name: 'jumpOverRight',
    length: 10,
    build: () => [
      { id: 0, type: 'barrier', lane: R, z: 4 },
      ...bitArc(R, 0.5, 7, 2.6, 5),
    ],
  },
  slideLeftLane: {
    name: 'slideLeftLane',
    length: 10,
    build: () => [
      { id: 0, type: 'beam', lane: L, z: 4 },
      ...bitLine(L, 0.5, 7, 5),
    ],
  },
  slideRightLane: {
    name: 'slideRightLane',
    length: 10,
    build: () => [
      { id: 0, type: 'beam', lane: R, z: 4 },
      ...bitLine(R, 0.5, 7, 5),
    ],
  },
  slideAll: {
    name: 'slideAll',
    length: 10,
    build: () => [
      { id: 0, type: 'beam', lane: 'all', z: 4 },
      ...bitLine(C, 0.5, 7, 5),
    ],
  },
  slalom3: {
    name: 'slalom3',
    length: 30,
    build: () => [
      { id: 0, type: 'block', lane: C, z: 2 },
      { id: 0, type: 'block', lane: L, z: 12 },
      { id: 0, type: 'block', lane: R, z: 22 },
      ...bitLine(L, 4, 6, 3),
      ...bitLine(R, 14, 6, 3),
      ...bitLine(L, 24, 5, 3),
    ],
  },
  zigzagBlocks: {
    name: 'zigzagBlocks',
    length: 40,
    build: () => [
      { id: 0, type: 'block', lane: L, z: 2 },
      { id: 0, type: 'block', lane: R, z: 12 },
      { id: 0, type: 'block', lane: L, z: 22 },
      { id: 0, type: 'block', lane: R, z: 32 },
      ...bitLine(R, 4, 6, 3),
      ...bitLine(L, 14, 6, 3),
      ...bitLine(R, 24, 6, 3),
      ...bitLine(L, 34, 5, 3),
    ],
  },
  jumpSlideCombo: {
    name: 'jumpSlideCombo',
    length: 26,
    build: () => [
      { id: 0, type: 'barrier', lane: C, z: 3 },
      { id: 0, type: 'beam', lane: C, z: 18 },
      ...bitArc(C, 0, 6, 2.6, 4),
      ...bitLine(C, 15, 6, 4),
    ],
  },
  gapAndBits: {
    name: 'gapAndBits',
    length: 18,
    build: (rng) => {
      const len = 6 + Math.floor(rng() * 4); // 6–9
      return [
        { id: 0, type: 'gap', z: 6, len },
        ...bitArc(C, 3, len + 6, 2.4, 6),
      ];
    },
  },
  doubleGap: {
    name: 'doubleGap',
    length: 26,
    build: () => [
      { id: 0, type: 'gap', z: 3, len: 6 },
      { id: 0, type: 'gap', z: 17, len: 6 },
      ...bitArc(C, 1, 10, 2.4, 4),
      ...bitArc(C, 15, 10, 2.4, 4),
    ],
  },
  wallHopLeft: {
    name: 'wallHopLeft',
    length: 20,
    build: () => [
      { id: 0, type: 'wallBlock', side: -1, row: 'low', z: 8, len: 6 },
      ...bitLine(L, 2, 16, 6),
    ],
  },
  wallHopRight: {
    name: 'wallHopRight',
    length: 20,
    build: () => [
      { id: 0, type: 'wallBlock', side: 1, row: 'low', z: 8, len: 6 },
      ...bitLine(R, 2, 16, 6),
    ],
  },
  wallLowHighSwap: {
    name: 'wallLowHighSwap',
    length: 26,
    build: (rng) => {
      const side: WallSide = rng() < 0.5 ? -1 : 1;
      const lane: Lane = side === -1 ? L : R;
      return [
        { id: 0, type: 'wallBlock', side, row: 'low', z: 6, len: 6 },
        { id: 0, type: 'wallBlock', side, row: 'high', z: 16, len: 6 },
        ...bitLine(lane, 2, 22, 8),
      ];
    },
  },
  droneCrossing: {
    name: 'droneCrossing',
    length: 12,
    build: (rng) => [
      { id: 0, type: 'drone', lane: C, z: 5, phase: rng() * Math.PI * 2, period: 2.4 },
      ...bitArc(C, 1, 10, 2.2, 4),
    ],
  },
  dronePair: {
    name: 'dronePair',
    length: 24,
    build: (rng) => [
      { id: 0, type: 'drone', lane: L, z: 4, phase: rng() * Math.PI * 2, period: 2.4 },
      { id: 0, type: 'drone', lane: R, z: 16, phase: rng() * Math.PI * 2, period: 2.4 },
      ...bitArc(L, 1, 8, 2.2, 3),
      ...bitArc(R, 13, 8, 2.2, 3),
    ],
  },
  laserPair: {
    name: 'laserPair',
    length: 24,
    build: (rng) => [
      { id: 0, type: 'laser', z: 4, phase: rng() * 2.4 },
      { id: 0, type: 'laser', z: 16, phase: rng() * 2.4 },
      ...bitLine(C, 1, 20, 6),
    ],
  },
  boostArcBits: {
    name: 'boostArcBits',
    length: 16,
    build: (rng) => {
      const lane: Lane = pickLane(rng);
      return [
        { id: 0, type: 'boost', lane, z: 8 },
        ...bitArc(lane, 2, 12, 1.8, 6),
      ];
    },
  },
  rivalWeave: {
    name: 'rivalWeave',
    length: 14,
    build: (rng) => {
      const lane: Lane = pickLane(rng);
      return [
        { id: 0, type: 'rival', lane, z: 6, speedFactor: 0.6 },
        ...bitLine(lane === L ? C : L, 2, 10, 4),
      ];
    },
  },
  doubleBarrier: {
    name: 'doubleBarrier',
    length: 10,
    build: () => [
      { id: 0, type: 'barrier', lane: L, z: 4 },
      { id: 0, type: 'barrier', lane: R, z: 4 },
      ...bitArc(C, 0.5, 7, 2.6, 5),
    ],
  },
  beamBlockMix: {
    name: 'beamBlockMix',
    length: 10,
    build: () => [
      { id: 0, type: 'beam', lane: C, z: 4 },
      { id: 0, type: 'block', lane: R, z: 4 },
      ...bitLine(L, 0.5, 7, 5),
    ],
  },
  barrierBeamCross: {
    name: 'barrierBeamCross',
    length: 10,
    build: () => [
      { id: 0, type: 'barrier', lane: L, z: 4 },
      { id: 0, type: 'beam', lane: R, z: 4 },
      ...bitLine(C, 0.5, 7, 5),
    ],
  },
  laneSqueeze: {
    name: 'laneSqueeze',
    length: 10,
    build: () => [
      { id: 0, type: 'block', lane: L, z: 4 },
      { id: 0, type: 'block', lane: R, z: 4 },
      ...bitLine(C, 0.5, 7, 5),
    ],
  },
  boostLane: {
    name: 'boostLane',
    length: 14,
    build: (rng) => {
      const lane: Lane = pickLane(rng);
      return [
        { id: 0, type: 'boost', lane, z: 7 },
        ...bitLine(lane, 1, 11, 5),
      ];
    },
  },
  wallRunGap: {
    name: 'wallRunGap',
    length: 44,
    build: (rng) => {
      const side: WallSide = rng() < 0.5 ? -1 : 1;
      const lane: Lane = side === -1 ? L : R;
      return [
        { id: 0, type: 'longGap', z: 10, len: 24 },
        { id: 0, type: 'wallBlock', side, row: 'low', z: 14, len: 6 },
        ...bitLine(lane, 4, 36, 10),
      ];
    },
  },
  gapBoost: {
    name: 'gapBoost',
    length: 24,
    build: (rng) => {
      const lane: Lane = pickLane(rng);
      return [
        { id: 0, type: 'gap', z: 4, len: 7 },
        { id: 0, type: 'boost', lane, z: 18 },
        ...bitArc(C, 1, 11, 2.4, 5),
        ...bitLine(lane, 15, 6, 3),
      ];
    },
  },
  bitLineWide: {
    name: 'bitLineWide',
    length: 16,
    build: (rng) => {
      const lane: Lane = pickLane(rng);
      return bitLine(lane, 1, 14, 7);
    },
  },
  wallLaserSwap: {
    // Wall-run the low row past a low wallBlock, then a laser gate on the floor
    // (slide through it while off the wall, or time it).
    name: 'wallLaserSwap',
    length: 30,
    build: (rng) => {
      const side: WallSide = rng() < 0.5 ? -1 : 1;
      const lane: Lane = side === -1 ? L : R;
      return [
        { id: 0, type: 'wallBlock', side, row: 'low', z: 6, len: 8 },
        { id: 0, type: 'laser', z: 22, phase: rng() * 2.4 },
        ...bitLine(lane, 2, 26, 8),
      ];
    },
  },
  wallDroneCombo: {
    // Wall-run a low wallBlock while a drone patrols the floor below.
    name: 'wallDroneCombo',
    length: 26,
    build: (rng) => {
      const side: WallSide = rng() < 0.5 ? -1 : 1;
      const lane: Lane = side === -1 ? L : R;
      return [
        { id: 0, type: 'wallBlock', side, row: 'low', z: 6, len: 8 },
        { id: 0, type: 'drone', lane: C, z: 10, phase: rng() * Math.PI * 2, period: 2.4 },
        ...bitLine(lane, 2, 22, 7),
      ];
    },
  },
  laserDroneMix: {
    // Laser gate, then a drone crossing — slide the laser, jump the drone.
    name: 'laserDroneMix',
    length: 28,
    build: (rng) => [
      { id: 0, type: 'laser', z: 4, phase: rng() * 2.4 },
      { id: 0, type: 'drone', lane: C, z: 18, phase: rng() * Math.PI * 2, period: 2.4 },
      ...bitLine(C, 1, 12, 4),
      ...bitArc(C, 15, 8, 2.2, 4),
    ],
  },
  wallHighSweep: {
    // High-row wallBlock: climb to high, then back down past a floor beam.
    name: 'wallHighSweep',
    length: 34,
    build: (rng) => {
      const side: WallSide = rng() < 0.5 ? -1 : 1;
      const lane: Lane = side === -1 ? L : R;
      return [
        { id: 0, type: 'wallBlock', side, row: 'high', z: 8, len: 8 },
        { id: 0, type: 'beam', lane: C, z: 26 },
        ...bitLine(lane, 2, 30, 9),
      ];
    },
  },
  droneLaserCross: {
    // Drone patrol then a laser gate — jump the drone, slide the laser.
    name: 'droneLaserCross',
    length: 30,
    build: (rng) => [
      { id: 0, type: 'drone', lane: C, z: 4, phase: rng() * Math.PI * 2, period: 2.4 },
      { id: 0, type: 'laser', z: 20, phase: rng() * 2.4 },
      ...bitArc(C, 2, 8, 2.2, 4),
      ...bitLine(C, 18, 10, 5),
    ],
  },
};

function pickLane(rng: Rng): Lane {
  const lanes: Lane[] = [L, C, R];
  return lanes[Math.floor(rng() * 3)];
}

export function patternNames(): string[] {
  return Object.keys(PATTERNS);
}

export function getPattern(name: string): Pattern {
  const p = PATTERNS[name];
  if (!p) throw new Error(`unknown pattern: ${name}`);
  return p;
}
