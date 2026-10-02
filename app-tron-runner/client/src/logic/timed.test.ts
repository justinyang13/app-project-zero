import { describe, it, expect } from 'vitest';
import {
  droneX, DRONE_Y, DRONE_RADIUS, DRONE_TOP,
  laserState, LASER_PERIOD, LASER_ON_TIME, LASER_FLICKER,
} from './timed';
import type { Drone, Laser } from './levelTypes';

const drone: Drone = { id: 1, type: 'drone', lane: 0, z: 100, phase: 0, period: 2.4 };
const laser: Laser = { id: 2, type: 'laser', z: 200, phase: 0 };

describe('droneX — deterministic sine patrol', () => {
  it('stays within x ∈ [−3, 3]', () => {
    for (let t = 0; t < 10; t += 0.01) {
      const x = droneX(drone, t);
      expect(x).toBeGreaterThanOrEqual(-3.0001);
      expect(x).toBeLessThanOrEqual(3.0001);
    }
  });

  it('is deterministic: same (t, phase) gives same x', () => {
    for (const t of [0, 0.3, 1.1, 2.4, 5.7]) {
      expect(droneX(drone, t)).toBe(droneX({ ...drone, phase: 0 }, t));
    }
  });

  it('phase shifts the patrol', () => {
    const d2: Drone = { ...drone, phase: Math.PI / 2 };
    // at t=0, x = 3·sin(π/2) = 3
    expect(droneX(d2, 0)).toBeCloseTo(3, 5);
    // at t=0, phase 0 → x = 0
    expect(droneX(drone, 0)).toBeCloseTo(0, 5);
  });

  it('period 2.4 s: x(t) = x(t + 2.4)', () => {
    for (const t of [0, 0.5, 1.3, 2.0]) {
      expect(droneX(drone, t)).toBeCloseTo(droneX(drone, t + 2.4), 5);
    }
  });

  it('hover geometry matches spec (y 0.9, r 0.8, top 1.7)', () => {
    expect(DRONE_Y).toBe(0.9);
    expect(DRONE_RADIUS).toBe(0.8);
    expect(DRONE_TOP).toBeCloseTo(1.7, 5);
  });
});

describe('laserState — on/off schedule + flicker', () => {
  it('period is 2.4 s (1.2 on + 1.2 off)', () => {
    expect(LASER_PERIOD).toBe(2.4);
    expect(LASER_ON_TIME).toBe(1.2);
  });

  it('is on for the first 1.2 s of the cycle', () => {
    expect(laserState(laser, 0).on).toBe(true);
    expect(laserState(laser, 0.6).on).toBe(true);
    expect(laserState(laser, 1.19).on).toBe(true);
  });

  it('is off for the second 1.2 s of the cycle', () => {
    expect(laserState(laser, 1.2).on).toBe(false);
    expect(laserState(laser, 2.0).on).toBe(false);
    expect(laserState(laser, 2.39).on).toBe(false);
  });

  it('repeats deterministically every 2.4 s', () => {
    for (const t of [0, 0.3, 0.9, 1.5, 2.2]) {
      expect(laserState(laser, t).on).toBe(laserState(laser, t + 2.4).on);
      expect(laserState(laser, t).flicker).toBe(laserState(laser, t + 2.4).flicker);
    }
  });

  it('flickers during the last 0.3 s of the off phase only', () => {
    // off phase: [1.2, 2.4); flicker: [2.1, 2.4)
    expect(laserState(laser, 1.3).flicker).toBe(false);
    expect(laserState(laser, 1.9).flicker).toBe(false);
    expect(laserState(laser, 2.09).flicker).toBe(false);
    expect(laserState(laser, 2.1).flicker).toBe(true);
    expect(laserState(laser, 2.3).flicker).toBe(true);
    expect(laserState(laser, 2.39).flicker).toBe(true);
    // never flickers while on
    expect(laserState(laser, 0.5).flicker).toBe(false);
    expect(LASER_FLICKER).toBe(0.3);
  });

  it('phase shifts the schedule deterministically', () => {
    const l2: Laser = { ...laser, phase: 1.2 }; // starts in the off phase
    expect(laserState(l2, 0).on).toBe(false);
    expect(laserState(laser, 0).on).toBe(true);
    // same phase → same state
    expect(laserState({ ...laser, phase: 0.7 }, 3.3).on)
      .toBe(laserState({ ...laser, phase: 0.7 }, 3.3).on);
  });

  it('handles negative time deterministically', () => {
    expect(laserState(laser, -0.5).on).toBe(laserState(laser, 1.9).on);
    expect(droneX(drone, -1.2)).toBeCloseTo(droneX(drone, 1.2), 5);
  });
});
