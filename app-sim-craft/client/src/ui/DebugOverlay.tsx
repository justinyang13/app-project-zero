// F3 debug overlay, per spec/12-ui-ux.md §10.
import { useHudStore } from "../state/hudStore";
import { useIsTouchDevice } from "../hooks/useIsTouchDevice";

const PANEL_STYLE: React.CSSProperties = {
  padding: "8px 12px",
  background: "rgba(0, 0, 0, 0.55)",
  color: "#fff",
  fontFamily: "monospace",
  fontSize: 12,
  lineHeight: 1.5,
  borderRadius: 4,
  userSelect: "none",
  whiteSpace: "pre",
};

function debugText(debug: ReturnType<typeof useHudStore.getState>["debug"]): string {
  return `SimCraft — dev build (F3 to toggle)
FPS: ${debug.fps}  frame: ${debug.frameTimeMs.toFixed(2)}ms
XYZ: ${debug.position.x.toFixed(2)} / ${debug.position.y.toFixed(2)} / ${debug.position.z.toFixed(2)}
Facing: ${debug.facingYawDeg.toFixed(1)}°  Biome: ${debug.biome}
Target: ${debug.targetBlock ?? "—"}
Chunks loaded: ${debug.chunkCount}  pending ops: ${debug.pendingChunkOps}
Cars: ${debug.carCount}
Sim tick: ${debug.simTick}  Seed: ${debug.worldSeed}
Mode: ${debug.flying ? "flying (double-tap Space to land)" : "walking (double-tap Space to fly)"}
View: ${debug.viewMode} person (F5 to switch)
Pointer lock: ${debug.pointerLocked ? "on" : "off (click to look)"}`;
}

export function DebugOverlay() {
  const isTouch = useIsTouchDevice();
  const debugVisible = useHudStore((s) => s.debugVisible);
  const toggleDebug = useHudStore((s) => s.toggleDebug);
  const debug = useHudStore((s) => s.debug);

  if (isTouch) {
    // No F3 key on touch — a small always-visible header is the toggle
    // instead (same collapse pattern as ui/MapSwitcher.tsx), so the
    // debug panel doesn't permanently eat screen space that's much
    // tighter here than on desktop.
    return (
      <div
        style={{
          position: "fixed",
          top: 8,
          left: 8,
          fontFamily: "monospace",
          fontSize: 12,
          color: "#fff",
          userSelect: "none",
        }}
      >
        <div
          onClick={toggleDebug}
          style={{
            padding: "6px 10px",
            background: "rgba(0, 0, 0, 0.55)",
            borderRadius: 4,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          Debug {debugVisible ? "▾" : "▸"}
        </div>
        {debugVisible && <div style={{ ...PANEL_STYLE, marginTop: 4, borderRadius: 4 }}>{debugText(debug)}</div>}
      </div>
    );
  }

  // Desktop: unchanged from before touch support existed — pixel-for-pixel identical, still purely F3-driven.
  if (!debugVisible) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        ...PANEL_STYLE,
        pointerEvents: "none",
      }}
    >
      {debugText(debug)}
    </div>
  );
}
