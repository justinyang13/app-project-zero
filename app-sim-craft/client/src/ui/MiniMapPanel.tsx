import type { RefObject } from "react";
import { useMinimapStore, MINIMAP_ZOOM_LEVELS } from "../state/minimapStore";

const LEGEND: { color: string; label: string }[] = [
  { color: "#8a8a8a", label: "Road" },
  { color: "#3f7fd0", label: "Water" },
  { color: "#e2e2e2", label: "Castle" },
  { color: "#ff8c2a", label: "Campfire" },
  { color: "#fff066", label: "Animal" },
  { color: "#ff4fd8", label: "Marker" },
  { color: "#ffb347", label: "Torch" },
];

export function MiniMapPanel({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
  const zoomIndex = useMinimapStore((s) => s.zoomIndex);
  const zoomIn = useMinimapStore((s) => s.zoomIn);
  const zoomOut = useMinimapStore((s) => s.zoomOut);

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
            borderRadius: "50%",
            border: "2px solid rgba(255, 255, 255, 0.6)",
            boxShadow: "0 1px 6px rgba(0, 0, 0, 0.5)",
            background: "#5a8a4a",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -4,
            right: -4,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pointerEvents: "auto",
          }}
        >
          <button
            onClick={zoomIn}
            disabled={zoomIndex === 0}
            title="Zoom in (=)"
            style={zoomButtonStyle(zoomIndex === 0)}
          >
            +
          </button>
          <button
            onClick={zoomOut}
            disabled={zoomIndex === MINIMAP_ZOOM_LEVELS.length - 1}
            title="Zoom out (-)"
            style={zoomButtonStyle(zoomIndex === MINIMAP_ZOOM_LEVELS.length - 1)}
          >
            −
          </button>
        </div>
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
        M: mark spot · ZTXCV/B: mode · +/-: zoom
      </div>
    </div>
  );
}

function zoomButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    lineHeight: 1,
    border: "1px solid rgba(255, 255, 255, 0.6)",
    borderRadius: "50%",
    background: disabled ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.6)",
    color: disabled ? "rgba(255, 255, 255, 0.4)" : "#fff",
    fontFamily: "monospace",
    fontSize: 13,
    cursor: disabled ? "default" : "pointer",
    touchAction: "manipulation",
    padding: 0,
  };
}
