import { describe, it, expect } from 'vitest';
import { laserIntensity, droneSpin, laserColor } from '../render/obstacleAnim';
import { laserState } from '../logic/timed';

const laser = { id: 1, type: 'laser' as const, z: 100, phase: 0 };
const drone = { id: 2, type: 'drone' as const, z: 100, lane: 0 as const, phase: 0.5, period: 2.4 };

describe('laserIntensity', () => {
  it('is full when on', () => {
    expect(laserIntensity(laser, 0.6)).toBe(1.0); // mid on-phase
  });
  it('is dim when off (no flicker)', () => {
    expect(laserIntensity(laser, 1.5)).toBeCloseTo(0.06);
  });
  it('pulses during the flicker window', () => {
    const v = laserIntensity(laser, 2.325); // mid flicker (sin peak)
    expect(v).toBeGreaterThan(0.15);
    expect(v).toBeLessThanOrEqual(0.75);
  });
  it('is deterministic and periodic (2.4 s)', () => {
    for (const t of [0.1, 0.9, 1.7, 2.2]) {
      expect(laserIntensity(laser, t)).toBeCloseTo(laserIntensity(laser, t + 2.4), 10);
    }
  });
  it('agrees with laserState on/off', () => {
    for (let t = 0; t < 2.4; t += 0.05) {
      const s = laserState(laser, t);
      const v = laserIntensity(laser, t);
      if (s.on) expect(v).toBe(1.0);
      else if (!s.flicker) expect(v).toBeCloseTo(0.06);
      else expect(v).toBeGreaterThan(0.1);
    }
  });
  it('respects phase shift', () => {
    const l2 = { ...laser, phase: 1.2 };
    // at t=0, l2 is at raw=1.2 → just off (no flicker)
    expect(laserIntensity(l2, 0)).toBeCloseTo(0.06);
    // at t=1.2, l2 is at raw=2.4→0 → on
    expect(laserIntensity(l2, 1.2)).toBe(1.0);
  });
});

describe('droneSpin', () => {
  it('is deterministic and time-linear', () => {
    expect(droneSpin(drone, 0)).toBeCloseTo(0.5);
    expect(droneSpin(drone, 1)).toBeCloseTo(6.5);
    expect(droneSpin(drone, 2)).toBeCloseTo(12.5);
  });
  it('differs per phase', () => {
    const d2 = { ...drone, phase: 1.5 };
    expect(droneSpin(d2, 1)).not.toBeCloseTo(droneSpin(drone, 1));
  });
});

describe('laserColor', () => {
  it('is red scaled by intensity', () => {
    const [r, g, b] = laserColor(laser, 0.6);
    expect(r).toBe(1.0);
    expect(g).toBeCloseTo(0.09);
    expect(b).toBeCloseTo(0.27);
    const [r2] = laserColor(laser, 1.5);
    expect(r2).toBeCloseTo(0.06);
  });
});
