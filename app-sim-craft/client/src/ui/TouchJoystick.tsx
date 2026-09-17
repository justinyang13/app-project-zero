import { useRef, useState } from "react";
import { useIsTouchDevice } from "../hooks/useIsTouchDevice";
import { getActiveGameLoop } from "../engine/activeGameLoop";
import { clampToRadius, computeJoystickVector } from "../engine/touchMath";

const PAD_DIAMETER = 120;
const PAD_RADIUS = PAD_DIAMETER / 2;
const THUMB_DIAMETER = 52;

/**
 * Bottom-left virtual joystick — feeds GameLoop's buildPlayerInput() the
 * same forward/right shape WASD produces (see touchMath.ts). Pointer
 * events, not touch events, so it also behaves correctly with a stylus.
 * Tracks its own pointerId so it stays independent of TouchLookArea's
 * drag happening at the same time on the other side of the screen.
 */
export function TouchJoystick() {
  const isTouch = useIsTouchDevice();
  const padRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });
  const [thumbOffset, setThumbOffset] = useState({ x: 0, y: 0 });

  if (!isTouch) return null;

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== null) return; // one thumb at a time
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    activePointerId.current = e.pointerId;
    center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPoint(e.clientX, e.clientY);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== e.pointerId) return;
    updateFromPoint(e.clientX, e.clientY);
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== e.pointerId) return;
    activePointerId.current = null;
    setThumbOffset({ x: 0, y: 0 });
    getActiveGameLoop()?.setTouchMoveVector(0, 0);
  }

  function updateFromPoint(clientX: number, clientY: number) {
    const dx = clientX - center.current.x;
    const dy = clientY - center.current.y;
    setThumbOffset(clampToRadius(dx, dy, PAD_RADIUS));
    const vector = computeJoystickVector(dx, dy, PAD_RADIUS);
    getActiveGameLoop()?.setTouchMoveVector(vector.x, vector.y);
  }

  return (
    <div
      ref={padRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={{
        position: "fixed",
        bottom: "max(16px, env(safe-area-inset-bottom) + 16px)",
        left: "max(16px, env(safe-area-inset-left) + 16px)",
        width: PAD_DIAMETER,
        height: PAD_DIAMETER,
        borderRadius: "50%",
        background: "rgba(0, 0, 0, 0.35)",
        border: "2px solid rgba(255, 255, 255, 0.35)",
        touchAction: "none",
        userSelect: "none",
        zIndex: 5,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: THUMB_DIAMETER,
          height: THUMB_DIAMETER,
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.55)",
          border: "1px solid rgba(255, 255, 255, 0.8)",
          transform: `translate(-50%, -50%) translate(${thumbOffset.x}px, ${thumbOffset.y}px)`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
