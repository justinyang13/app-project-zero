// What the player is asking their body to do this step — the shape both the
// keyboard and the touch controls are reduced to (input/InputManager), and
// what the on-foot physics and every mount consume.

/** On-foot movement input for one physics step. */
export interface PlayerInput {
  forward: number; // -1..1
  right: number; // -1..1
  jump: boolean;
  sprint: boolean;
  flyUp: boolean;
  flyDown: boolean;
}

/** Steering input for whatever the player is riding or driving. */
export interface RideInput {
  throttle: number; // -1..1
  steer: number; // -1..1
  climb: number; // -1..1 (ignored by ground-bound mounts)
}
