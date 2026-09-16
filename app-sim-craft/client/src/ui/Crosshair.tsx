import { useHotbarStore } from "../state/hotbarStore";

export function Crosshair() {
  const mode = useHotbarStore((s) => s.mode);
  const color = mode === "place" ? "#7dff7d" : "#ffffff";

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        width: 8,
        height: 8,
        marginLeft: -4,
        marginTop: -4,
        pointerEvents: "none",
      }}
    >
      <div style={{ position: "absolute", top: 3, left: 0, width: 8, height: 2, background: color, opacity: 0.9 }} />
      <div style={{ position: "absolute", top: 0, left: 3, width: 2, height: 8, background: color, opacity: 0.9 }} />
    </div>
  );
}
