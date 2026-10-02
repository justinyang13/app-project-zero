import { describe, it, expect } from 'vitest';
import {
  createScoreState, addBit, addCore, addDistance, addNearMiss,
  addBoost, addPerfectGap, addWallRun, applyHit, addVictoryBonus,
  starRating, TARGET_SCORE, simulateIdealRun,
} from './scoring';
import { sectionSpeedAt, sectionIndexAt } from '../config';
import { buildLevel } from './level';

describe('scoring', () => {
  it('bit gives 100 × mult and raises mult every 8 bits', () => {
    const s = createScoreState();
    addBit(s);
    expect(s.score).toBe(100);
    expect(s.mult).toBe(1);
    for (let i = 0; i < 7; i++) addBit(s);
    expect(s.mult).toBe(2); // 8th bit raised it
    expect(s.bits).toBe(8);
    addBit(s);
    expect(s.score).toBe(8 * 100 + 100 * 2);
  });

  it('mult caps at 15', () => {
    const s = createScoreState();
    for (let i = 0; i < 200; i++) addBit(s);
    expect(s.mult).toBe(15);
  });

  it('hit resets streak and mult', () => {
    const s = createScoreState();
    for (let i = 0; i < 16; i++) addBit(s);
    expect(s.mult).toBe(3);
    applyHit(s);
    expect(s.mult).toBe(1);
    expect(s.streak).toBe(0);
    addBit(s);
    expect(s.score).toBe(8 * 100 + 8 * 200 + 100);
  });

  it('core, distance, near miss, boost, perfect gap, wall run', () => {
    const s = createScoreState();
    addCore(s);
    expect(s.score).toBe(5000);
    addDistance(s, 10);
    expect(s.score).toBe(5000 + 20);
    addNearMiss(s);
    expect(s.score).toBe(5020 + 250);
    expect(s.nearMisses).toBe(1);
    addBoost(s);
    expect(s.score).toBe(5270 + 500);
    addPerfectGap(s);
    expect(s.score).toBe(5770 + 300);
    addWallRun(s, 2);
    expect(s.score).toBe(6070 + 120);
  });

  it('victory bonus and stars', () => {
    const s = createScoreState();
    const before = s.score;
    const bonus = addVictoryBonus(s, 3, 100);
    expect(bonus).toBe(30000 + 2000);
    expect(s.score).toBe(before + 32000);
    expect(starRating(0)).toBe(1);
    expect(starRating(0.7 * TARGET_SCORE)).toBe(2);
    expect(starRating(TARGET_SCORE)).toBe(3);
    expect(starRating(TARGET_SCORE - 1)).toBe(2);
  });
});

describe('simulateIdealRun', () => {
  it('ideal score is within 80%–130% of TARGET_SCORE (SPEC §6)', () => {
    const r = simulateIdealRun(buildLevel());
    expect(r.score).toBeGreaterThan(0.8 * TARGET_SCORE);
    expect(r.score).toBeLessThan(1.3 * TARGET_SCORE);
  });

  it('is deterministic and collects every bit/boost', () => {
    const level = buildLevel();
    const a = simulateIdealRun(level);
    const b = simulateIdealRun(level);
    expect(a.score).toBe(b.score);
    expect(a.bits).toBe(level.obstacles.filter((o) => o.type === 'bit').length);
    expect(a.boosts).toBe(level.obstacles.filter((o) => o.type === 'boost').length);
    expect(a.time).toBeGreaterThan(200); // ~4.5–5.5 min run
  });
});

describe('sectionSpeedAt', () => {
  it('returns section speed in the middle of a section', () => {
    expect(sectionSpeedAt(200)).toBe(20);
    expect(sectionSpeedAt(1000)).toBe(24);
    expect(sectionSpeedAt(7000)).toBe(30);
  });

  it('eases over 40 m at section boundaries', () => {
    expect(sectionSpeedAt(400)).toBe(20);
    expect(sectionSpeedAt(420)).toBe(22);
    expect(sectionSpeedAt(440)).toBe(24);
  });

  it('clamps at the end of the level', () => {
    expect(sectionSpeedAt(99999)).toBe(30);
    expect(sectionIndexAt(99999)).toBe(6);
  });
});
