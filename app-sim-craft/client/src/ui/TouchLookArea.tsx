import { useRef } from "react";
import { useIsTouchDevice } from "../hooks/useIsTouchDevice";
import { getActiveGameLoop } from "../engine/activeGameLoop";

/**
 * Transparent full-height overlay across the right ~60% of the screen —
 * dragging anywhere in it turns the camera, using the exact same
 * sensitivity/clamping math mouse-look applies (Camera.ts's
 * applyPointerDelta). Stops at 40vw so it never overlaps
 * TouchJoystick.tsx's pad on the left; on-screen buttons inside this 60%
 * (TouchActionButtons.tsx) sit at a higher z-index, so a tap that lands
 * on one of them is captured by the button, not this overlay — ordinary
 * DOM hit-testing, no extra bookkeeping needed here.
 *
 * Only one finger drives the look at a time (tracked by pointerId) —
 * simultaneous with the joystick's own independent pointerId on the
 * other side of the screen, which is a separate element entirely.
 */
export function TouchLookArea() {
  const isTouch = useIsTouchDevice();
  const activePointerId = useRef<number | null>(null);
  const lastPoint = useRef({ x: 0, y: 0 });

  if (!isTouch) return null;

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== null) return;
    activePointerId.current = e.pointerId;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== e.pointerId) return;
    const dx = e.clientX - lastPoint.current.x;
    const dy = e.clientY - lastPoint.current.y;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    getActiveGameLoop()?.applyTouchLookDelta(dx, dy);
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== e.pointerId) return;
    activePointerId.current = null;
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={{
        position: "fixed",
        top: 0,
        left: "40vw",
        right: 0,
        bottom: 0,
        touchAction: "none",
        zIndex: 1,
      }}
    />
  );
}
