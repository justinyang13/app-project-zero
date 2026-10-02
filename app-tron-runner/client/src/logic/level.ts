// buildLevel: deterministic level from pattern library (SPEC §5.1, §5.3).
// Pure TS, no three/DOM imports.

import { mulberry32, pick } from './rng';
import { getPattern } from './patterns';
import type { Level, Obstacle, WallStrip, Lane } from './levelTypes';
import { obstacleSpan } from './levelTypes';

export const LEVEL_SEED = 1337;
export const REPAIR_Z = [900, 2000, 3200, 4400, 5800] as const;

const HARMFUL = new Set([
  'barrier', 'beam', 'block', 'gap', 'longGap', 'wallBlock',
  'drone', 'laser', 'rival',
]);

function isHarmful(o: Obstacle): boolean {
  return HARMFUL.has(o.type);
}

interface Recipe {
  z0: number;
  z1: number;
  patterns: string[];
  spacing: number;
}

const RECIPES: Recipe[] = [
  { z0: 400, z1: 1500, spacing: 40, patterns: [
    'jumpOverCenter', 'slideLeftLane', 'slideRightLane', 'slalom3',
    'zigzagBlocks', 'jumpSlideCombo', 'doubleBarrier', 'beamBlockMix',
    'barrierBeamCross', 'laneSqueeze', 'boostArcBits', 'bitLineWide',
  ]},
  { z0: 1500, z1: 2600, spacing: 40, patterns: [
    'wallHopLeft', 'wallHopRight', 'wallLowHighSwap', 'wallLaserSwap',
    'wallDroneCombo', 'wallHighSweep',
    'bitLineWide', 'boostArcBits', 'jumpOverCenter',
  ]},
  { z0: 2600, z1: 3700, spacing: 35, patterns: [
    'gapAndBits', 'doubleGap', 'droneCrossing', 'dronePair',
    'laserPair', 'laserDroneMix', 'gapBoost', 'boostLane', 'jumpSlideCombo',
  ]},
  { z0: 3700, z1: 5000, spacing: 35, patterns: [
    'rivalWeave', 'jumpOverCenter', 'slideLeftLane', 'slideRightLane',
    'gapAndBits', 'boostArcBits', 'doubleBarrier', 'bitLineWide',
  ]},
  { z0: 5000, z1: 6700, spacing: 35, patterns: [
    'slalom3', 'zigzagBlocks', 'jumpSlideCombo', 'droneCrossing',
    'laserPair', 'laserDroneMix', 'gapAndBits', 'doubleBarrier',
    'beamBlockMix', 'boostLane', 'bitLineWide',
    'wallHopLeft', 'wallHopRight', 'wallLowHighSwap', 'wallLaserSwap',
  ]},
  { z0: 6700, z1: 7800, spacing: 35, patterns: [
    'jumpOverCenter', 'slideLeftLane', 'slideRightLane', 'gapAndBits',
    'doubleBarrier', 'laneSqueeze', 'boostArcBits', 'bitLineWide',
  ]},
];

function addStrip(wallStrips: WallStrip[], z0: number, z1: number, side: -1 | 1) {
  for (const s of wallStrips) {
    if (s.side === side && z0 < s.z1 + 4 && z1 > s.z0 - 4) {
      s.z0 = Math.min(s.z0, z0);
      s.z1 = Math.max(s.z1, z1);
      return;
    }
  }
  wallStrips.push({ side, z0, z1 });
}

function placePatterns(
  obstacles: Obstacle[],
  wallStrips: WallStrip[],
  rng: () => number,
  recipe: Recipe,
  reserved: Array<[number, number]>,
): void {
  let z = recipe.z0 + 15;
  const end = recipe.z1 - 15;
  while (z < end) {
    const name = pick(rng, recipe.patterns);
    const p = getPattern(name);
    const obs = p.build(rng);
    const harmful = obs.filter(isHarmful);
    const conflict = harmful.some((o) => {
      const [s0, s1] = obstacleSpan(o);
      return reserved.some(([a, b]) => z + s0 < b && z + s1 > a);
    });
    if (conflict) {
      z += 10;
      continue;
    }
    const wallBlocks = obs.filter((o): o is Extract<Obstacle, { type: 'wallBlock' }> => o.type === 'wallBlock');
    if (wallBlocks.length > 0) {
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (const o of wallBlocks) {
        minZ = Math.min(minZ, z + o.z);
        maxZ = Math.max(maxZ, z + o.z + o.len);
      }
      for (const o of wallBlocks) {
        addStrip(wallStrips, minZ - 4, maxZ + 4, o.side);
      }
    }
    for (const o of obs) {
      o.z += z;
      if (isHarmful(o)) {
        const [s0, s1] = obstacleSpan(o);
        reserved.push([s0, s1]);
      }
    }
    obstacles.push(...obs);
    z += p.length + recipe.spacing;
  }
}

export function buildLevel(seed: number = LEVEL_SEED): Level {
  const rng = mulberry32(seed);
  const obstacles: Obstacle[] = [];
  const wallStrips: WallStrip[] = [];
  const reserved: Array<[number, number]> = [];

  // Section 0: BOOT SEQUENCE — fixed content (SPEC §5.1)
  // Bit lines for tutorial prompts at 40, 150, 260 m
  const tutorialBits: Obstacle[] = [];
  for (const tz of [40, 150, 260]) {
    for (let i = 0; i < 8; i++) {
      tutorialBits.push({ id: 0, type: 'bit', lane: 0, z: tz + i * 1.5, y: 0.6 });
    }
  }
  obstacles.push(...tutorialBits);
  obstacles.push({ id: 0, type: 'barrier', lane: 0, z: 180 });
  obstacles.push({ id: 0, type: 'beam', lane: 0, z: 280 });
  reserved.push([175, 186], [275, 286]);

  // Repair pickups at fixed distances (SPEC §10)
  for (const rz of REPAIR_Z) {
    obstacles.push({ id: 0, type: 'repair', lane: 0, z: rz });
    reserved.push([rz - 2, rz + 2]);
  }

  // Sections 1–6
  for (const recipe of RECIPES) {
    placePatterns(obstacles, wallStrips, rng, recipe, reserved);
  }

  // Guaranteed longGap at 2200 (SPEC §5.1) — only crossable via wall-run.
  {
    const side: -1 | 1 = rng() < 0.5 ? -1 : 1;
    const lane: Lane = side === -1 ? -1 : 1;
    const z = 2200;
    obstacles.push({ id: 0, type: 'longGap', z, len: 24 });
    addStrip(wallStrips, z - 10, z + 24 + 10, side);
    for (let i = 0; i < 10; i++) {
      obstacles.push({ id: 0, type: 'bit', lane, z: z - 4 + i * 4.8, y: 0.6 });
    }
    reserved.push([z - 5, z + 29]);
  }

  // Boss cores at 6900 / 7250 / 7600 (SPEC §5.4) — risky lanes.
  {
    const coreLanes: Lane[] = [-1, 1, 0];
    const coreZs = [6900, 7250, 7600];
    for (let i = 0; i < coreZs.length; i++) {
      obstacles.push({ id: 0, type: 'core', lane: coreLanes[i], z: coreZs[i] });
      reserved.push([coreZs[i] - 2, coreZs[i] + 2]);
    }
  }

  // Sort by z, assign unique ids
  obstacles.sort((a, b) => a.z - b.z || a.type.localeCompare(b.type));
  obstacles.forEach((o, i) => { o.id = i; });
  wallStrips.sort((a, b) => a.z0 - b.z0);

  return { length: 7800, seed, obstacles, wallStrips };
}

export function bitCount(level: Level): number {
  let n = 0;
  for (const o of level.obstacles) if (o.type === 'bit') n++;
  return n;
}

export function repairPositions(level: Level): number[] {
  return level.obstacles.filter((o) => o.type === 'repair').map((o) => o.z);
}
