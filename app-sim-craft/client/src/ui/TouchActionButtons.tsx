import { useIsTouchDevice } from "../hooks/useIsTouchDevice";
import { getActiveGame } from "../session/activeGame";
import { isMounted } from "../core/mountHint";
import { useHudStore } from "../state/hudStore";
import { useHotbarStore } from "../state/hotbarStore";
import { ModeGlyph } from "./ModeGlyph";
import { useCompactViewport } from "../hooks/useCompactViewport";
import { EDGE_MARGIN, safeBottom, safeRight } from "./touchLayout";

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

// Button placement (px from the bottom-right corner, before the safe-area
// inset). Portrait stacks a column up the right edge, above which the
// hotbar row sits (see Hotbar.tsx); landscape is too short for that, so it
// spreads into rows along the bottom, with the fly up/down pair beside
// the cluster instead of far above it.
interface Spot {
  bottom: number;
  right: number;
}
interface Layout {
  primary: Spot;
  jump: Spot;
  cycle: Spot;
  fly: Spot;
  view: Spot;
}
const PORTRAIT: Layout = {
  primary: { bottom: 0, right: 0 },
  jump: { bottom: 90, right: 0 },
  cycle: { bottom: 0, right: 90 },
  fly: { bottom: 160, right: 0 },
  view: { bottom: 0, right: 144 },
};
const LANDSCAPE: Layout = {
  primary: { bottom: 0, right: 0 },
  jump: { bottom: 4, right: 76 },
  cycle: { bottom: 76, right: 4 },
  fly: { bottom: 76, right: 60 },
  view: { bottom: 80, right: 116 },
};

/**
 * Bottom-right cluster: jump, fly toggle (+ up/down while flying), the
 * primary break/place/torch/flag action, a mode-cycle button mirroring
 * the "B" key and a first/third-person view toggle (F5). While driving a
 * car or riding the dragon the fly button becomes nitro/turbo, and getting
 * in or out is the contextual button in VehiclePrompt.tsx. Positioned to
 * stay clear of TouchJoystick.tsx (bottom-left) and Hotbar.tsx — see
 * App.tsx for mount order. Every button sits above TouchLookArea.tsx's
 * drag-to-look overlay in z-index, so a tap on a button is captured by
 * the button, never treated as a look-drag.
 */
export function TouchActionButtons() {
  const isTouch = useIsTouchDevice();
  const compact = useCompactViewport();
  const flying = useHudStore((s) => s.debug.flying);
  const turbo = useHudStore((s) => s.debug.turbo);
  const inVehicle = useHudStore((s) => isMounted(s.mountHint));
  const mode = useHotbarStore((s) => s.mode);
  const cycleMode = useHotbarStore((s) => s.cycleMode);

  if (!isTouch) return null;

  const layout = compact ? LANDSCAPE : PORTRAIT;
  const at = (spot: Spot): React.CSSProperties => ({
    position: "fixed",
    bottom: safeBottom(EDGE_MARGIN + spot.bottom),
    right: safeRight(EDGE_MARGIN + spot.right),
  });

  return (
    <>
      {/* Primary action: whatever the current Build/Break mode does on left-click.
          Holding it down repeats the action (see GameLoop.ts's
          primaryActionHeld), same as holding the left mouse button. */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          getActiveGame()?.setPrimaryActionHeld(true);
          getActiveGame()?.triggerPrimaryAction();
        }}
        onPointerUp={() => getActiveGame()?.setPrimaryActionHeld(false)}
        onPointerCancel={() => getActiveGame()?.setPrimaryActionHeld(false)}
        onPointerLeave={() => getActiveGame()?.setPrimaryActionHeld(false)}
        style={{ ...BUTTON_STYLE_BASE, ...at(layout.primary), width: 64, height: 64, fontSize: 26 }}
        title={`${mode} (hold to repeat)`}
      >
        <ModeGlyph mode={mode} size={32} />
      </button>

      {/* Jump — held, matching Space's hold-to-jump behavior (climbs while riding the dragon). */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          getActiveGame()?.setTouchJump(true);
        }}
        onPointerUp={() => getActiveGame()?.setTouchJump(false)}
        onPointerCancel={() => getActiveGame()?.setTouchJump(false)}
        onPointerLeave={() => getActiveGame()?.setTouchJump(false)}
        style={{ ...BUTTON_STYLE_BASE, ...at(layout.jump), width: 56, height: 56, fontSize: 22 }}
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
        style={{ ...BUTTON_STYLE_BASE, ...at(layout.cycle), width: 48, height: 48, fontSize: 18 }}
        title="Cycle Build/Break mode (B)"
      >
        ⟳
      </button>

      {/* View toggle — first/third person, mirrors F5. */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          getActiveGame()?.toggleViewMode();
        }}
        style={{ ...BUTTON_STYLE_BASE, ...at(layout.view), width: 44, height: 44, fontSize: 18 }}
        title="Switch first/third-person view (F5)"
      >
        👁
      </button>

      {/* Fly / turbo — there are no separate up/down buttons: while flying the joystick climbs and dives along where you look, and the jump button climbs. A single tap, no need to replicate desktop's double-tap-Space gesture on touch: starts flying; while flying it toggles turbo (land by flying down, as on desktop). In a car or on the dragon it's nitro/turbo. */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          getActiveGame()?.toggleFlying();
        }}
        style={{
          ...BUTTON_STYLE_BASE,
          ...at(layout.fly),
          width: 48,
          height: 48,
          fontSize: 18,
          borderColor: turbo || (flying && !inVehicle) ? "#7dc4ff" : "rgba(255, 255, 255, 0.4)",
          background: turbo && !inVehicle ? "rgba(90, 160, 255, 0.55)" : "rgba(0, 0, 0, 0.45)",
        }}
        title={inVehicle ? "Nitro / turbo" : flying ? "Turbo flight (fly down to land)" : "Start flying"}
      >
        {inVehicle || flying ? "⚡" : "✈"}
      </button>
    </>
  );
}
