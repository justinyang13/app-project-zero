import { describe, it, expect } from 'vitest';
import {
  adsr,
  bitPingFreq,
  countdownFreq,
  fanfare,
  gameOverSweep,
  noiseData,
  sweep,
} from './sfxParams';

describe('bitPingFreq', () => {
  it('starts at 520 Hz for streak 0', () => {
    expect(bitPingFreq(0)).toBeCloseTo(520, 3);
  });
  it('rises with the streak', () => {
    expect(bitPingFreq(8)).toBeGreaterThan(bitPingFreq(0));
    expect(bitPingFreq(16)).toBeGreaterThan(bitPingFreq(8));
  });
  it('reaches one octave (1040 Hz) at streak 24', () => {
    expect(bitPingFreq(24)).toBeCloseTo(1040, 3);
  });
  it('clamps out-of-range streaks', () => {
    expect(bitPingFreq(-5)).toBeCloseTo(520, 3);
    expect(bitPingFreq(999)).toBeCloseTo(1040, 3);
  });
});

describe('adsr', () => {
  const A = 0.1;
  const D = 0.2;
  const S = 0.5;
  const R = 0.3;
  const DUR = 1.0;

  it('is 0 before the note starts', () => {
    expect(adsr(-0.1, A, D, S, R, DUR)).toBe(0);
  });
  it('ramps up during attack', () => {
    expect(adsr(0, A, D, S, R, DUR)).toBe(0);
    expect(adsr(A / 2, A, D, S, R, DUR)).toBeCloseTo(0.5, 5);
    expect(adsr(A, A, D, S, R, DUR)).toBeCloseTo(1, 5);
  });
  it('decays to sustain', () => {
    expect(adsr(A + D / 2, A, D, S, R, DUR)).toBeCloseTo(0.75, 5);
    expect(adsr(A + D, A, D, S, R, DUR)).toBeCloseTo(S, 5);
  });
  it('holds sustain, then releases to 0', () => {
    expect(adsr(0.5, A, D, S, R, DUR)).toBeCloseTo(S, 5);
    expect(adsr(DUR - R / 2, A, D, S, R, DUR)).toBeCloseTo(S / 2, 5);
    expect(adsr(DUR, A, D, S, R, DUR)).toBe(0);
    expect(adsr(DUR + 1, A, D, S, R, DUR)).toBe(0);
  });
  it('handles zero attack/decay/release', () => {
    expect(adsr(0, 0, 0, 0.7, 0, 1)).toBeCloseTo(0.7, 5);
  });
  it('returns 0 for non-positive duration', () => {
    expect(adsr(0.5, 0.1, 0.2, 0.5, 0.3, 0)).toBe(0);
  });
});

describe('sweep', () => {
  it('returns f0 at the start and f1 at the end', () => {
    expect(sweep(0, 0, 1, 100, 1000)).toBeCloseTo(100, 5);
    expect(sweep(1, 0, 1, 100, 1000)).toBeCloseTo(1000, 5);
  });
  it('is geometric (log-linear) with curve 1', () => {
    expect(sweep(0.5, 0, 1, 100, 1000)).toBeCloseTo(Math.sqrt(100 * 1000), 3);
  });
  it('clamps outside the window', () => {
    expect(sweep(-1, 0, 1, 100, 1000)).toBeCloseTo(100, 5);
    expect(sweep(2, 0, 1, 100, 1000)).toBeCloseTo(1000, 5);
  });
  it('handles degenerate window and non-positive freqs', () => {
    expect(sweep(0.5, 1, 1, 100, 1000)).toBeCloseTo(100, 5);
    expect(sweep(0.5, 0, 1, 0, 1000)).toBeGreaterThan(0);
  });
  it('curve > 1 accelerates toward the end', () => {
    const c2 = sweep(0.5, 0, 1, 100, 1000, 2);
    const c1 = sweep(0.5, 0, 1, 100, 1000, 1);
    expect(c2).toBeLessThan(c1);
  });
});

describe('noiseData', () => {
  it('produces the requested length', () => {
    expect(noiseData(1, 64).length).toBe(64);
  });
  it('stays within [-1, 1]', () => {
    for (const v of noiseData(42, 512)) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
  it('is deterministic for a given seed', () => {
    expect(noiseData(1337, 32)).toEqual(noiseData(1337, 32));
  });
  it('differs between seeds', () => {
    const a = noiseData(1, 32);
    const b = noiseData(2, 32);
    expect(a).not.toEqual(b);
  });
});

describe('countdownFreq', () => {
  it('is 660 Hz for 3-2-1 and 990 Hz for GO', () => {
    expect(countdownFreq(3)).toBe(660);
    expect(countdownFreq(2)).toBe(660);
    expect(countdownFreq(1)).toBe(660);
    expect(countdownFreq(0)).toBe(990);
  });
});

describe('fanfare', () => {
  it('has 5 rising notes with increasing start times', () => {
    const f = fanfare();
    expect(f.length).toBe(5);
    for (let i = 1; i < f.length; i++) {
      expect(f[i].freq).toBeGreaterThan(f[i - 1].freq);
      expect(f[i].at).toBeGreaterThan(f[i - 1].at);
    }
  });
  it('starts on C5', () => {
    expect(fanfare()[0].freq).toBeCloseTo(523.25, 2);
  });
});

describe('gameOverSweep', () => {
  it('descends from 440 Hz to 55 Hz over 1.2 s', () => {
    const s = gameOverSweep();
    expect(s.f0).toBe(440);
    expect(s.f1).toBe(55);
    expect(s.dur).toBe(1.2);
  });
});
