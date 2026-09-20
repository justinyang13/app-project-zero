import { useState } from "react";
import { useTimeStore } from "../state/timeStore";
import { useHudStore } from "../state/hudStore";
import { useIsTouchDevice } from "../hooks/useIsTouchDevice";

const PRESETS: { label: string; t: number }[] = [
  { label: "Dawn", t: 6.2 / 24 },
  { label: "Noon", t: 12 / 24 },
  { label: "Dusk", t: 17.8 / 24 },
  { label: "Midnight", t: 0 },
];

function formatClock(t: number): string {
  const totalMinutes = Math.round(t * 24 * 60) % 1440;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** `embedded`: touch only — rendered inside the settings window (ui/GraphicsPanel.tsx) instead of floating at the top left. */
export function TimeControl({ embedded = false }: { embedded?: boolean }) {
  const isTouch = useIsTouchDevice();
  const [expanded, setExpanded] = useState(false);
  const mode = useTimeStore((s) => s.mode);
  const manualTimeOfDay = useTimeStore((s) => s.manualTimeOfDay);
  const setManualTimeOfDay = useTimeStore((s) => s.setManualTimeOfDay);
  const useSystemTime = useTimeStore((s) => s.useSystemTime);
  const displayedTimeOfDay = useHudStore((s) => s.debug.timeOfDay);

  const sliderValue = mode === "manual" ? manualTimeOfDay : displayedTimeOfDay;

  // Touch: collapsed behind a small header (same pattern as
  // ui/MapSwitcher.tsx) and moved into the left-side stack up top, out
  // of the bottom-right action-button cluster (ui/TouchActionButtons.tsx)
  // — screen space is much tighter here than on desktop, and this panel
  // doesn't need to be always-visible.
  if (isTouch) {
    if (!embedded) return null;
    return (
      <div
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
        style={{
          background: "rgba(0, 0, 0, 0.55)",
          borderRadius: 6,
          color: "#fff",
          fontFamily: "monospace",
          fontSize: 12,
        }}
      >
        <div
          onClick={() => setExpanded((v) => !v)}
          style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", cursor: "pointer", touchAction: "manipulation" }}
        >
          <span>Time: {formatClock(sliderValue)}</span>
          <span>{expanded ? "▾" : "▸"}</span>
        </div>
        {expanded && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 10px 10px" }}>
            <input
              type="range"
              min={0}
              max={1439}
              value={Math.round(sliderValue * 1440)}
              onChange={(e) => setManualTimeOfDay(Number(e.target.value) / 1440)}
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setManualTimeOfDay(p.t)}
                  style={{
                    flex: "1 0 auto",
                    fontSize: 10,
                    fontFamily: "monospace",
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 3,
                    color: "#fff",
                    padding: "6px 4px",
                    touchAction: "manipulation",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={useSystemTime}
              disabled={mode === "system"}
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                background: mode === "system" ? "rgba(255,255,255,0.08)" : "rgba(90,160,255,0.35)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 3,
                color: "#fff",
                padding: "6px",
                touchAction: "manipulation",
              }}
            >
              {mode === "system" ? "Following real clock" : "Use system time"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      // Game shortcuts (arrow-key look, WASD, etc.) listen on `window` and
      // would otherwise also fire while the player is dragging this
      // slider or focused on a button here — stop it from bubbling that far.
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        width: 190,
        background: "rgba(0, 0, 0, 0.55)",
        borderRadius: 6,
        padding: "8px 10px",
        color: "#fff",
        fontFamily: "monospace",
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{mode === "system" ? "System time" : "Manual time"}</span>
        <span>{formatClock(sliderValue)}</span>
      </div>

      <input
        type="range"
        min={0}
        max={1439}
        value={Math.round(sliderValue * 1440)}
        onChange={(e) => setManualTimeOfDay(Number(e.target.value) / 1440)}
        style={{ width: "100%" }}
      />

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setManualTimeOfDay(p.t)}
            style={{
              flex: "1 0 auto",
              fontSize: 10,
              fontFamily: "monospace",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 3,
              color: "#fff",
              padding: "3px 4px",
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button
        onClick={useSystemTime}
        disabled={mode === "system"}
        style={{
          fontSize: 10,
          fontFamily: "monospace",
          background: mode === "system" ? "rgba(255,255,255,0.08)" : "rgba(90,160,255,0.35)",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 3,
          color: "#fff",
          padding: "4px",
          cursor: mode === "system" ? "default" : "pointer",
        }}
      >
        {mode === "system" ? "Following real clock" : "Use system time"}
      </button>
    </div>
  );
}
