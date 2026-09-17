import { useIsTouchDevice } from "../hooks/useIsTouchDevice";
import { getActiveGameLoop } from "../engine/activeGameLoop";
import { useHudStore } from "../state/hudStore";
import { useHotbarStore, type BuildMode } from "../state/hotbarStore";

// All touch targets are >=44px per the platform accessibility minimum
// (Apple HIG / WCAG 2.5.5) — see each button's width/height below.
const BUTTON_STYLE_BASE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  border: "2px solid rgba(255, 255, 255, 0.4)",
  background: "rgba(0, 0, 0, 0.45)",
  color: "#fff",
  fontFamily: "monospace",
  userSelect: "none",
  touchAction: "manipulation",
  zIndex: 10,
};

const MODE_LABELS: Record<BuildMode, string> = { break: "⛏", place: "▦", torch: "🔥", flag: "🚩" };

/**
 * Bottom-right cluster: jump, fly toggle (+ up/down while flying), the
 * primary break/place/torch/flag action, and a mode-cycle button
 * mirroring the "B" key. Positioned to stay clear of TouchJoystick.tsx
 * (bottom-left) and Hotbar.tsx (bottom-center) — see App.tsx for mount
 * order. Every button sits above TouchLookArea.tsx's drag-to-look
 * overlay in z-index, so a tap on a button is captured by the button,
 * never treated as a look-drag.
 */
export function TouchActionButtons() {
  const isTouch = useIsTouchDevice();
  const flying = useHudStore((s) => s.debug.flying);
  const mode = useHotbarStore((s) => s.mode);
  const cycleMode = useHotbarStore((s) => s.cycleMode);

  if (!isTouch) return null;

  const safeBottom = "max(16px, env(safe-area-inset-bottom) + 16px)";
  const safeRight = "max(16px, env(safe-area-inset-right) + 16px)";

  return (
    <>
      {/* Primary action: whatever the current Build/Break mode does on left-click. */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          getActiveGameLoop()?.triggerPrimaryAction();
        }}
        style={{ ...BUTTON_STYLE_BASE, position: "fixed", bottom: safeBottom, right: safeRight, width: 64, height: 64, fontSize: 26 }}
        title={`${mode} (tap)`}
      >
        {MODE_LABELS[mode]}
      </button>

      {/* Jump — held, matching Space's hold-to-jump behavior. */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          getActiveGameLoop()?.setTouchJump(true);
        }}
        onPointerUp={() => getActiveGameLoop()?.setTouchJump(false)}
        onPointerCancel={() => getActiveGameLoop()?.setTouchJump(false)}
        onPointerLeave={() => getActiveGameLoop()?.setTouchJump(false)}
        style={{ ...BUTTON_STYLE_BASE, position: "fixed", bottom: "calc(16px + 90px)", right: safeRight, width: 56, height: 56, fontSize: 22 }}
        title="Jump"
      >
        ↑
      </button>

      {/* Mode cycle — mirrors the "B" key (Hotbar's own mode icons also select a mode directly). */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          cycleMode();
        }}
        style={{ ...BUTTON_STYLE_BASE, position: "fixed", bottom: safeBottom, right: "calc(16px + 90px)", width: 48, height: 48, fontSize: 18 }}
        title="Cycle Build/Break mode (B)"
      >
        ⟳
      </button>

      {/* Fly toggle — a single tap, no need to replicate desktop's double-tap-Space gesture on touch. */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          getActiveGameLoop()?.toggleFlying();
        }}
        style={{
          ...BUTTON_STYLE_BASE,
          position: "fixed",
          bottom: "calc(16px + 160px)",
          right: safeRight,
          width: 48,
          height: 48,
          fontSize: 18,
          borderColor: flying ? "#7dc4ff" : "rgba(255, 255, 255, 0.4)",
        }}
        title={flying ? "Stop flying" : "Start flying"}
      >
        ✈
      </button>

      {flying && (
        <>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              getActiveGameLoop()?.setTouchFlyUp(true);
            }}
            onPointerUp={() => getActiveGameLoop()?.setTouchFlyUp(false)}
            onPointerCancel={() => getActiveGameLoop()?.setTouchFlyUp(false)}
            onPointerLeave={() => getActiveGameLoop()?.setTouchFlyUp(false)}
            style={{ ...BUTTON_STYLE_BASE, position: "fixed", bottom: "calc(16px + 320px)", right: "calc(16px + 32px)", width: 44, height: 44, fontSize: 16 }}
            title="Fly up"
          >
            ▲
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              getActiveGameLoop()?.setTouchFlyDown(true);
            }}
            onPointerUp={() => getActiveGameLoop()?.setTouchFlyDown(false)}
            onPointerCancel={() => getActiveGameLoop()?.setTouchFlyDown(false)}
            onPointerLeave={() => getActiveGameLoop()?.setTouchFlyDown(false)}
            style={{ ...BUTTON_STYLE_BASE, position: "fixed", bottom: "calc(16px + 370px)", right: "calc(16px + 32px)", width: 44, height: 44, fontSize: 16 }}
            title="Fly down"
          >
            ▼
          </button>
        </>
      )}
    </>
  );
}
