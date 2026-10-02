import { describe, it, expect } from 'vitest';
import { buildLevel, bitCount, repairPositions, LEVEL_SEED } from './level';
import { SECTIONS } from '../config';
import { obstaclesInRange, obstacleSpan, isGapAt } from './levelTypes';
import type { Obstacle } from './levelTypes';
// (used in lane-aware overlap test)

const HARMFUL = new Set([
  'barrier', 'beam', 'block', 'gap', 'longGap', 'wallBlock',
  'drone', 'laser', 'rival',
]);

describe('buildLevel', () => {
  it('is deterministic for the same seed', () => {
    const a = buildLevel(1337);
    const b = buildLevel(1337);
    expect(a.obstacles).toEqual(b.obstacles);
    expect(a.wallStrips).toEqual(b.wallStrips);
  });

  it('differs across seeds', () => {
    const a = buildLevel(1);
    const b = buildLevel(2);
    expect(a.obstacles).not.toEqual(b.obstacles);
  });

  it('has length 7800 and seed 1337 by default', () => {
    const level = buildLevel();
    expect(level.length).toBe(7800);
    expect(level.seed).toBe(LEVEL_SEED);
  });

  it('obstacles are sorted by z', () => {
    const level = buildLevel();
    for (let i = 1; i < level.obstacles.length; i++) {
      expect(level.obstacles[i].z).toBeGreaterThanOrEqual(level.obstacles[i - 1].z);
    }
  });

  it('has unique ids', () => {
    const level = buildLevel();
    const ids = new Set(level.obstacles.map((o) => o.id));
    expect(ids.size).toBe(level.obstacles.length);
  });

  it('no two harmful obstacles overlap in the same lane', () => {
    const level = buildLevel();
    const harmful = level.obstacles.filter((o) => HARMFUL.has(o.type));
    const full = (o: Obstacle) =>
      o.type === 'gap' || o.type === 'longGap' || o.type === 'laser' ||
      (o.type === 'beam' && o.lane === 'all');
    const laneOf = (o: Obstacle): string => {
      if (full(o)) return 'FULL';
      if (o.type === 'wallBlock') return `wall${o.side}${o.row}`;
      if (o.type === 'laser') return 'FULL';
      if (o.type === 'beam' && o.lane === 'all') return 'FULL';
      if (o.type === 'barrier' || o.type === 'block' || o.type === 'drone' || o.type === 'rival' ||
          o.type === 'boost' || o.type === 'bit' || o.type === 'core' || o.type === 'repair') {
        return String(o.lane);
      }
      return 'FULL';
    };
    for (let i = 0; i < harmful.length; i++) {
      for (let j = i + 1; j < harmful.length; j++) {
        const a = harmful[i];
        const b = harmful[j];
        if (laneOf(a) !== laneOf(b)) continue;
        const [a0, a1] = obstacleSpan(a);
        const [b0, b1] = obstacleSpan(b);
        expect(a0 < b1 && b0 < a1, `overlap between ${a.type}@${a.z} and ${b.type}@${b.z}`).toBe(false);
      }
    }
  });

  it('no obstacle extends past the level length', () => {
    const level = buildLevel();
    for (const o of level.obstacles) {
      const [, end] = obstacleSpan(o);
      expect(end).toBeLessThanOrEqual(7800);
    }
  });

  it('bit count is in 700–900', () => {
    const level = buildLevel();
    const n = bitCount(level);
    expect(n).toBeGreaterThanOrEqual(700);
    expect(n).toBeLessThanOrEqual(900);
  });

  it('has repair pickups at 900, 2000, 3200, 4400, 5800', () => {
    const level = buildLevel();
    const repairs = repairPositions(level).sort((a, b) => a - b);
    expect(repairs).toEqual([900, 2000, 3200, 4400, 5800]);
  });

  it('section 0 has the tutorial barrier at 180 and beam at 280', () => {
    const level = buildLevel();
    const s0 = obstaclesInRange(level, 0, 400);
    expect(s0.some((o) => o.type === 'barrier' && o.z === 180)).toBe(true);
    expect(s0.some((o) => o.type === 'beam' && o.z === 280)).toBe(true);
  });

  it('every wallBlock sits inside a wall strip on its side', () => {
    const level = buildLevel();
    for (const o of level.obstacles) {
      if (o.type !== 'wallBlock') continue;
      const strip = level.wallStrips.find((s) => s.side === o.side && o.z >= s.z0 && o.z + o.len <= s.z1);
      expect(strip, `wallBlock at ${o.z} side ${o.side} has no strip`).toBeTruthy();
    }
  });

  it('longGap is inside a wall strip with margins', () => {
    const level = buildLevel();
    const gaps = level.obstacles.filter((o) => o.type === 'longGap');
    expect(gaps.length).toBeGreaterThanOrEqual(1);
    for (const g of gaps) {
      const strip = level.wallStrips.find(
        (s) => g.z >= s.z0 - 10 && g.z + g.len <= s.z1 + 10,
      );
      expect(strip, `longGap at ${g.z} has no covering strip`).toBeTruthy();
    }
  });

  it('has 3 boss cores at 6900, 7250, 7600', () => {
    const level = buildLevel();
    const cores = level.obstacles.filter((o) => o.type === 'core').map((o) => o.z).sort((a, b) => a - b);
    expect(cores).toEqual([6900, 7250, 7600]);
  });

  it('run duration (sum of section length / speed) is between 255 and 300 s', () => {
    let t = 0;
    for (const s of SECTIONS) t += (s.z1 - s.z0) / s.speed;
    expect(t).toBeGreaterThan(255);
    expect(t).toBeLessThan(300);
  });
});

describe('lookups', () => {
  const level = buildLevel();

  it('obstaclesInRange returns only obstacles in range', () => {
    const out = obstaclesInRange(level, 100, 200);
    for (const o of out) {
      expect(o.z).toBeGreaterThanOrEqual(100);
      expect(o.z).toBeLessThan(200);
    }
  });

  it('isGapAt matches gap obstacles', () => {
    const gap = level.obstacles.find((o) => o.type === 'gap');
    expect(gap).toBeTruthy();
    if (gap && gap.type === 'gap') {
      expect(isGapAt(level, gap.z + 1)).toBe(true);
      expect(isGapAt(level, gap.z + gap.len + 40)).toBe(false);
    }
  });
});
