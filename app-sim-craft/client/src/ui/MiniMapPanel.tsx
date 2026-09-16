import type { RefObject } from "react";

const LEGEND: { color: string; label: string }[] = [
  { color: "#8a8a8a", label: "Road" },
  { color: "#3f7fd0", label: "Water" },
  { color: "#e2e2e2", label: "Castle" },
  { color: "#ff8c2a", label: "Campfire" },
  { color: "#fff066", label: "Animal" },
];

export function MiniMapPanel({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
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
    </div>
  );
}
