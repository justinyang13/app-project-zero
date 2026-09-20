// Pure math for touch controls, kept separate from the React components
// (ui/TouchJoystick.tsx) so it's unit-testable without a DOM.

export interface JoystickVector {
  x: number; // right axis, -1..1
  y: number; // forward axis, -1..1
}

/**
 * Converts a raw drag offset from the pad's center into the same
 * normalized `{x, y}` shape GameLoop.ts's buildPlayerInput() derives from
 * WASD (x = right, y = forward). Clamped to the pad's radius as a circle
 * (not a square) — dragging to a corner gives full magnitude, not more.
 * Screen-space dy is positive downward, but pushing the stick *up* should
 * mean "forward", hence the sign flip on y.
 */
export function computeJoystickVector(dx: number, dy: number, radius: number): JoystickVector {
  if (radius <= 0) return { x: 0, y: 0 };
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { x: 0, y: 0 };
  const magnitude = Math.min(distance, radius) / radius; // 0..1
  const ux = dx / distance;
  const uy = dy / distance;
  return { x: ux * magnitude, y: -uy * magnitude };
}

/** The thumb's visual offset from the pad center, in the same pixel units as dx/dy — clamped to the pad radius (a circle) so the thumb never renders outside the pad. */
export function clampToRadius(dx: number, dy: number, radius: number): { x: number; y: number } {
  const distance = Math.hypot(dx, dy);
  if (distance <= radius || distance === 0) return { x: dx, y: dy };
  const scale = radius / distance;
  return { x: dx * scale, y: dy * scale };
}
