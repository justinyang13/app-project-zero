import type { RefObject } from "react";
import { useMinimapStore, MINIMAP_ZOOM_LEVELS } from "../state/minimapStore";
import { getActiveGameLoop } from "../engine/activeGameLoop";

const LEGEND: { color: string; label: string }[] = [
  { color: "#8a8a8a", label: "Road" },
  { color: "#3f7fd0", label: "Water" },
  { color: "#e2e2e2", label: "Castle" },
  { color: "#ff8c2a", label: "Campfire" },
  { color: "#fff066", label: "Animal" },
  { color: "#ff4fd8", label: "Marker" },
  { color: "#ffb347", label: "Torch" },
  { color: "#f2f2f2", label: "C castle" },
  { color: "#ffd27a", label: "V village" },
  { color: "#ff7a5a", label: "M mountain" },
  { color: "#bfe3ff", label: "L lake" },
  { color: "#7cff5a", label: "D dragon" },
];

export function MiniMapPanel({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
  const zoomIndex = useMinimapStore((s) => s.zoomIndex);
  const zoomIn = useMinimapStore((s) => s.zoomIn);
  const zoomOut = useMinimapStore((s) => s.zoomOut);
  const toggleFullMap = useMinimapStore((s) => s.toggleFullMap);

  return (
    <div
      style={{
        position: "fixed",
        top: 60,
        right: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div style={{ position: "relative", width: 160, height: 160 }}>
        <canvas
          ref={canvasRef}
          style={{
            width: 160,
            height: 160,
            boxSizing: "border-box",
            borderRadius: "50%",
            border: "2px solid rgba(255, 255, 255, 0.6)",
            boxShadow: "0 1px 6px rgba(0, 0, 0, 0.5)",
            background: "#5a8a4a",
          }}
        />
        <button
          onClick={() => getActiveGameLoop()?.teleportToCastle()}
          title="Back to the castle (H)"
          style={{ ...zoomButtonStyle(false, HOME_ANGLE), fontSize: 12 }}
        >
          🏰
        </button>
        <button
          onClick={zoomIn}
          disabled={zoomIndex === 0}
          title="Zoom in (=)"
          style={zoomButtonStyle(zoomIndex === 0, ZOOM_IN_ANGLE)}
        >
          +
        </button>
        <button
          onClick={zoomOut}
          disabled={zoomIndex === MINIMAP_ZOOM_LEVELS.length - 1}
          title="Zoom out (-)"
          style={zoomButtonStyle(zoomIndex === MINIMAP_ZOOM_LEVELS.length - 1, ZOOM_OUT_ANGLE)}
        >
          −
        </button>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "2px 8px",
          maxWidth: 170,
          padding: "4px 8px",
          background: "rgba(0, 0, 0, 0.5)",
          borderRadius: 4,
          fontFamily: "monospace",
          fontSize: 10,
          color: "#fff",
        }}
      >
        {LEGEND.map((entry) => (
          <span key={entry.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: entry.color, display: "inline-block" }} />
            {entry.label}
          </span>
        ))}
      </div>
      <div
        style={{
          padding: "2px 6px",
          background: "rgba(0, 0, 0, 0.4)",
          borderRadius: 3,
          fontFamily: "monospace",
          fontSize: 9,
          color: "rgba(255, 255, 255, 0.8)",
        }}
      >
        M: full map · H: castle · K: mark spot · ZTXCV/B: mode · +/-: zoom
      </div>
      <button
        onClick={toggleFullMap}
        title="Open the full-screen world map (M)"
        style={{
          pointerEvents: "auto",
          padding: "2px 8px",
          background: "rgba(0, 0, 0, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.5)",
          borderRadius: 3,
          color: "#fff",
          fontFamily: "monospace",
          fontSize: 10,
          cursor: "pointer",
          touchAction: "manipulation",
        }}
      >
        Full map
      </button>
    </div>
  );
}

// The minimap is a 160px circle (border included) centred at (80, 80); the
// zoom buttons sit centred on its rim, side by side along the lower right
// (angles in degrees clockwise from 3 o'clock).
const RING_CENTER = 80;
const BUTTON_SIZE = 22;
const ZOOM_IN_ANGLE = 40;
const ZOOM_OUT_ANGLE = 66;
const HOME_ANGLE = 122; // lower left of the rim

function zoomButtonStyle(disabled: boolean, angleDeg: number): React.CSSProperties {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    position: "absolute",
    left: RING_CENTER + Math.cos(rad) * RING_CENTER - BUTTON_SIZE / 2,
    top: RING_CENTER + Math.sin(rad) * RING_CENTER - BUTTON_SIZE / 2,
    pointerEvents: "auto",
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    lineHeight: 1,
    border: "2px solid rgba(255, 255, 255, 0.85)",
    borderRadius: "50%",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.6)",
    background: disabled ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.6)",
    color: disabled ? "rgba(255, 255, 255, 0.4)" : "#fff",
    fontFamily: "monospace",
    fontSize: 13,
    cursor: disabled ? "default" : "pointer",
    touchAction: "manipulation",
    padding: 0,
  };
}
