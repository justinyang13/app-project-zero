import { useHudStore } from "../state/hudStore";

export function VehiclePrompt() {
  const prompt = useHudStore((s) => s.vehiclePrompt);
  if (!prompt) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "18%",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "6px 14px",
        background: "rgba(0, 0, 0, 0.55)",
        color: "#fff",
        fontFamily: "sans-serif",
        fontSize: 14,
        borderRadius: 4,
        pointerEvents: "none",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      {prompt}
    </div>
  );
}
