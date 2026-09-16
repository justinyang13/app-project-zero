// F3 debug overlay, per spec/12-ui-ux.md §10.
import { useHudStore } from "../state/hudStore";

export function DebugOverlay() {
  const debugVisible = useHudStore((s) => s.debugVisible);
  const debug = useHudStore((s) => s.debug);

  if (!debugVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        padding: "8px 12px",
        background: "rgba(0, 0, 0, 0.55)",
        color: "#fff",
        fontFamily: "monospace",
        fontSize: 12,
        lineHeight: 1.5,
        borderRadius: 4,
        pointerEvents: "none",
        userSelect: "none",
        whiteSpace: "pre",
      }}
    >
      {`SimCraft — dev build (F3 to toggle)
FPS: ${debug.fps}  frame: ${debug.frameTimeMs.toFixed(2)}ms
XYZ: ${debug.position.x.toFixed(2)} / ${debug.position.y.toFixed(2)} / ${debug.position.z.toFixed(2)}
Facing: ${debug.facingYawDeg.toFixed(1)}°  Biome: ${debug.biome}
Target: ${debug.targetBlock ?? "—"}
Chunks loaded: ${debug.chunkCount}  pending ops: ${debug.pendingChunkOps}
Sim tick: ${debug.simTick}  Seed: ${debug.worldSeed}
Mode: ${debug.flying ? "flying (double-tap Space to land)" : "walking (double-tap Space to fly)"}
View: ${debug.viewMode} person (F5 to switch)
Pointer lock: ${debug.pointerLocked ? "on" : "off (click to look)"}`}
    </div>
  );
}
