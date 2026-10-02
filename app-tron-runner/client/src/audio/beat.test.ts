import { describe, it, expect } from 'vitest';
import { beatAt, beatPulse, trackForDist, RUN_BPM, BOSS_BPM } from './beat';

describe('beatAt', () => {
  it('starts at beat 0, phase 0', () => {
    const b = beatAt(0, 120);
    expect(b.bpm).toBe(120);
    expect(b.phase).toBe(0);
    expect(b.beatIndex).toBe(0);
  });

  it('advances one beat per 0.5 s at 120 BPM', () => {
    const b = beatAt(0.5, 120);
    expect(b.beatIndex).toBe(1);
    expect(b.phase).toBeCloseTo(0, 5);
  });

  it('computes phase correctly mid-beat', () => {
    const b = beatAt(0.25, 120);
    expect(b.beatIndex).toBe(0);
    expect(b.phase).toBeCloseTo(0.5, 5);
  });

  it('uses 60/bpm seconds per beat at 140 BPM', () => {
    const b = beatAt(60 / 140, 140);
    expect(b.beatIndex).toBe(1);
    expect(b.phase).toBeCloseTo(0, 5);
  });

  it('clamps negative elapsed to 0', () => {
    const b = beatAt(-3, 120);
    expect(b.phase).toBe(0);
    expect(b.beatIndex).toBe(0);
  });

  it('throws on non-positive bpm', () => {
    expect(() => beatAt(1, 0)).toThrow();
    expect(() => beatAt(1, -120)).toThrow();
  });

  it('is deterministic', () => {
    const a = beatAt(123.456, 140);
    const b = beatAt(123.456, 140);
    expect(a).toEqual(b);
  });
});

describe('beatPulse', () => {
  it('peaks at phase 0', () => {
    expect(beatPulse(0)).toBeCloseTo(1, 5);
  });

  it('decays toward the floor through the beat', () => {
    const mid = beatPulse(0.5);
    const end = beatPulse(0.999);
    expect(mid).toBeLessThan(1);
    expect(end).toBeLessThan(mid);
    expect(end).toBeGreaterThanOrEqual(0.8);
  });

  it('wraps phases outside [0,1)', () => {
    expect(beatPulse(1.25)).toBeCloseTo(beatPulse(0.25), 5);
    expect(beatPulse(-0.5)).toBeCloseTo(beatPulse(0.5), 5);
  });

  it('respects a custom floor', () => {
    expect(beatPulse(0.999999, 0.5)).toBeCloseTo(0.5, 2);
    expect(beatPulse(0.999999, 0.5)).toBeLessThan(0.52);
  });
});

describe('trackForDist', () => {
  it('plays run before 3700 m and boss after', () => {
    expect(trackForDist(0)).toBe('run');
    expect(trackForDist(3699.9)).toBe('run');
    expect(trackForDist(3700)).toBe('boss');
    expect(trackForDist(7800)).toBe('boss');
  });

  it('supports a custom crossfade point', () => {
    expect(trackForDist(100, 50)).toBe('boss');
    expect(trackForDist(49.9, 50)).toBe('run');
  });
});

describe('BPM constants', () => {
  it('match SPEC §9', () => {
    expect(RUN_BPM).toBe(120);
    expect(BOSS_BPM).toBe(140);
  });
});
