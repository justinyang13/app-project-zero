// Pure animation helpers for moving/toggling obstacle visuals (SPEC §5.2, §8.5).
// No three/DOM imports — unit-testable in Node.

import { laserState } from '../logic/timed';
import type { Drone, Laser } from '../logic/levelTypes';

/**
 * Visual intensity of a laser gate in [0, 1] at time `t`.
 * - on: full red beam (1.0)
 * - off: near-dark (0.06)
 * - flicker warning (last 0.3 s of off): pulses 0.15 → 0.75
 */
export function laserIntensity(laser: Laser, t: number): number {
  const s = laserState(laser, t);
  if (s.on) return 1.0;
  if (s.flicker) {
    // raw ∈ [2.1, 2.4) → local 0..1 across the flicker window
    const raw = ((t + laser.phase) % 2.4 + 2.4) % 2.4;
    const local = (raw - 2.1) / 0.3;
    const pulse = 0.5 - 0.5 * Math.cos(local * Math.PI * 4); // 2 pulses
    return 0.15 + 0.6 * pulse;
  }
  return 0.06;
}

/** Spin angle (radians) of a drone's rotor ring at time `t`. Deterministic. */
export function droneSpin(drone: Drone, t: number): number {
  return t * 6 + drone.phase;
}

/**
 * Per-instance colour (r,g,b in [0,1]) for a laser beam at time `t`.
 * Red beam `#ff1744` scaled by intensity.
 */
export function laserColor(laser: Laser, t: number): [number, number, number] {
  const i = laserIntensity(laser, t);
  return [1.0 * i, 0.09 * i, 0.27 * i];
}
