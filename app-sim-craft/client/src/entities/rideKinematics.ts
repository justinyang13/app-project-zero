// The throttle -> speed integration every steerable thing shares (cars, land
// animals, sea creatures, dragons): throttle accelerates, no throttle coasts
// to a stop under friction, and speed is clamped between a reverse and a
// forward limit. Each ride keeps its own turning and movement rules.
import * as THREE from "three";

export interface RideSpeedParams {
  accel: number; // units/sec² while the throttle is held
  friction: number; // units/sec² of coast-down with no throttle
  maxForward: number;
  maxReverse: number; // magnitude, positive
}

export function integrateRideSpeed(speed: number, throttle: number, dt: number, params: RideSpeedParams): number {
  let next = speed;
  if (throttle !== 0) {
    next += throttle * params.accel * dt;
  } else if (next !== 0) {
    const decel = params.friction * dt;
    next = Math.abs(next) <= decel ? 0 : next - Math.sign(next) * decel;
  }
  return THREE.MathUtils.clamp(next, -params.maxReverse, params.maxForward);
}
