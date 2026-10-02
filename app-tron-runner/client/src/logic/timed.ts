// Deterministic timing helpers for moving / toggling obstacles (SPEC §5.2).
// Pure TS, no three/DOM imports.

import type { Drone, Laser } from './levelTypes';

// ---------------------------------------------------------------------------
// Drone — sine patrol across the track x ∈ [−3, 3], period 2.4 s (SPEC §5.2)
// ---------------------------------------------------------------------------

/**
 * Lateral x position of a drone at time `t` (seconds since run start).
 * Deterministic: x = 3 · sin(2π·t / period + phase).
 */
export function droneX(drone: Drone, t: number): number {
  return 3 * Math.sin((2 * Math.PI * t) / drone.period + drone.phase);
}

/** Drone hover height (centre of the disc). */
export const DRONE_Y = 0.9;
/** Drone disc radius. */
export const DRONE_RADIUS = 0.8;
/** Drone top (y + radius) — jumping above this clears the drone. */
export const DRONE_TOP = DRONE_Y + DRONE_RADIUS; // 1.7

// ---------------------------------------------------------------------------
// Laser — on 1.2 s / off 1.2 s, flicker warning during last 0.3 s of off (SPEC §5.2)
// ---------------------------------------------------------------------------

export const LASER_PERIOD = 2.4; // 1.2 on + 1.2 off
export const LASER_ON_TIME = 1.2;
export const LASER_FLICKER = 0.3; // last 0.3 s of the off phase
export const LASER_Y0 = 0.5; // bottom of the gate (visual glow)
export const LASER_Y1 = 1.4; // top of the gate
/**
 * Bottom of the *harmful* beam core. The spec's 0.5 m bottom is the outer
 * glow; the solid core starts at 0.9 m so a slide (height 0.8 m) passes
 * underneath, matching the spec's "slide … through" avoidance rule.
 */
export const LASER_Y0_HARMFUL = 0.9;

export interface LaserState {
  /** True while the beam is active (harmful). */
  on: boolean;
  /** True during the last 0.3 s of the off phase (visual warning). */
  flicker: boolean;
  /** Normalised cycle position in [0, 1). */
  cycle: number;
}

/**
 * Laser on/off state at time `t` (seconds since run start).
 * Deterministic: cycle = ((t + phase) mod 2.4) / 2.4.
 * on  when cycle < 0.5, off when cycle >= 0.5.
 * flicker when cycle is in [0.5 + (1 − 0.3/1.2)/2, 1)  i.e. last 0.3 s of off.
 */
export function laserState(laser: Laser, t: number): LaserState {
  const raw = ((t + laser.phase) % LASER_PERIOD + LASER_PERIOD) % LASER_PERIOD;
  const cycle = raw / LASER_PERIOD;
  const on = raw < LASER_ON_TIME - 1e-9;
  // off phase is raw ∈ [1.2, 2.4); flicker is the last 0.3 s → raw ∈ [2.1, 2.4)
  const flicker = !on && raw >= LASER_ON_TIME + (LASER_PERIOD - LASER_ON_TIME - LASER_FLICKER);
  return { on, flicker, cycle };
}
