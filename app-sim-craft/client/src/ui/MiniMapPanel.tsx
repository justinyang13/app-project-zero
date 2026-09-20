import type { RefObject } from "react";
import { useMinimapStore, MINIMAP_ZOOM_LEVELS } from "../state/minimapStore";
import { getActiveGame } from "../session/activeGame";
import { useIsTouchDevice } from "../hooks/useIsTouchDevice";

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
  // On a phone the map shrinks and the color legend and key-binding hint
  // (which need a keyboard anyway) are dropped, so it doesn't take over
  // the screen; the ring's buttons grow to stay finger-sized.
  const isTouch = useIsTouchDevice();
  const size = isTouch ? TOUCH_SIZE : DESKTOP_SIZE;
  const buttonSize = isTouch ? 26 : 22;

  return (
    <div
      style={{
        position: "fixed",
        top: isTouch ? 56 : 60,
        right: 8,
        zIndex: 5, // above the touch look-drag overlay, so the ring's buttons stay tappable
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <canvas
          ref={canvasRef}
          style={{
            width: size,
            height: size,
            boxSizing: "border-box",
            borderRadius: "50%",
            border: "2px solid rgba(255, 255, 255, 0.6)",
            boxShadow: "0 1px 6px rgba(0, 0, 0, 0.5)",
            background: "#5a8a4a",
          }}
        />
        <button
          onClick={() => getActiveGame()?.teleportToCastle()}
          title="Back to the castle (H)"
          style={{ ...zoomButtonStyle(false, isTouch ? 132 : HOME_ANGLE, size, buttonSize), fontSize: isTouch ? 13 : 12 }}
        >
          🏰
        </button>
        <button
          onClick={zoomIn}
          disabled={zoomIndex === 0}
          title="Zoom in (=)"
          style={zoomButtonStyle(zoomIndex === 0, isTouch ? 22 : ZOOM_IN_ANGLE, size, buttonSize)}
        >
          +
        </button>
        <button
          onClick={zoomOut}
          disabled={zoomIndex === MINIMAP_ZOOM_LEVELS.length - 1}
          title="Zoom out (-)"
          style={zoomButtonStyle(zoomIndex === MINIMAP_ZOOM_LEVELS.length - 1, isTouch ? 66 : ZOOM_OUT_ANGLE, size, buttonSize)}
        >
          −
        </button>
      </div>
      {!isTouch && (
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
      )}
      {!isTouch && (
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
      )}
      <button
        onClick={toggleFullMap}
        title="Open the full-screen world map (M)"
        style={{
          pointerEvents: "auto",
          marginTop: isTouch ? 6 : 0,
          padding: isTouch ? "4px 10px" : "2px 8px",
          background: "rgba(0, 0, 0, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.5)",
          borderRadius: isTouch ? 6 : 3,
          color: "#fff",
          fontFamily: "monospace",
          fontSize: isTouch ? 11 : 10,
          cursor: "pointer",
          touchAction: "manipulation",
        }}
      >
        Full map
      </button>
    </div>
  );
}

// The zoom/home buttons sit centred on the minimap's rim (angles in degrees
// clockwise from 3 o'clock): zoom in/out side by side along the lower right,
// the castle button at the lower left.
const DESKTOP_SIZE = 160;
const TOUCH_SIZE = 84;
const ZOOM_IN_ANGLE = 40;
const ZOOM_OUT_ANGLE = 66;
const HOME_ANGLE = 122;

function zoomButtonStyle(disabled: boolean, angleDeg: number, size: number, buttonSize: number): React.CSSProperties {
  const rad = (angleDeg * Math.PI) / 180;
  const radius = size / 2;
  return {
    position: "absolute",
    left: radius + Math.cos(rad) * radius - buttonSize / 2,
    top: radius + Math.sin(rad) * radius - buttonSize / 2,
    pointerEvents: "auto",
    width: buttonSize,
    height: buttonSize,
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
