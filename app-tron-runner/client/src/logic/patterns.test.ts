import { describe, it, expect } from 'vitest';
import { PATTERNS, patternNames, getPattern } from './patterns';
import { mulberry32 } from './rng';

describe('patterns', () => {
  it('has at least 24 named patterns', () => {
    expect(patternNames().length).toBeGreaterThanOrEqual(24);
  });

  it('every pattern declares a positive length', () => {
    for (const p of Object.values(PATTERNS)) {
      expect(p.length).toBeGreaterThan(0);
    }
  });

  it('every pattern builds obstacles with z >= 0 within its length', () => {
    const rng = mulberry32(1337);
    for (const p of Object.values(PATTERNS)) {
      const obs = p.build(rng);
      expect(obs.length).toBeGreaterThan(0);
      for (const o of obs) {
        expect(o.z).toBeGreaterThanOrEqual(0);
        expect(o.z).toBeLessThan(p.length);
      }
    }
  });

  it('is deterministic for the same seed', () => {
    const a = getPattern('slalom3').build(mulberry32(5));
    const b = getPattern('slalom3').build(mulberry32(5));
    expect(a).toEqual(b);
  });

  it('throws on unknown pattern', () => {
    expect(() => getPattern('nope')).toThrow();
  });

  it('wall patterns emit wallBlocks on the correct side/row', () => {
    for (const name of ['wallLaserSwap', 'wallDroneCombo', 'wallHighSweep']) {
      const obs = getPattern(name).build(mulberry32(1));
      const wb = obs.filter((o) => o.type === 'wallBlock');
      expect(wb.length, name).toBeGreaterThanOrEqual(1);
      for (const o of wb) {
        if (o.type === 'wallBlock') {
          expect([-1, 1]).toContain(o.side);
          expect(['low', 'high']).toContain(o.row);
        }
      }
    }
  });

  it('wallRunGap emits a 24 m longGap', () => {
    const obs = getPattern('wallRunGap').build(mulberry32(1));
    const lg = obs.find((o) => o.type === 'longGap');
    expect(lg).toBeDefined();
    if (lg && lg.type === 'longGap') {
      expect(lg.len).toBe(24);
    }
  });

  it('timed patterns place drones and lasers with valid fields', () => {
    for (const name of ['laserDroneMix', 'droneLaserCross', 'droneCrossing', 'laserPair']) {
      const obs = getPattern(name).build(mulberry32(7));
      const drones = obs.filter((o) => o.type === 'drone');
      const lasers = obs.filter((o) => o.type === 'laser');
      expect(drones.length + lasers.length, name).toBeGreaterThan(0);
      for (const o of drones) {
        if (o.type === 'drone') {
          expect(o.period).toBeGreaterThan(0);
          expect(o.phase).toBeGreaterThanOrEqual(0);
        }
      }
      for (const o of lasers) {
        if (o.type === 'laser') {
          expect(o.phase).toBeGreaterThanOrEqual(0);
          expect(o.phase).toBeLessThan(2.4);
        }
      }
    }
  });
});
