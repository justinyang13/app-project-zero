import { useHudStore } from "../state/hudStore";
import { useIsTouchDevice } from "../hooks/useIsTouchDevice";
import { useCompactViewport } from "../hooks/useCompactViewport";
import { getActiveGameLoop } from "../engine/activeGameLoop";

export function VehiclePrompt() {
  const prompt = useHudStore((s) => s.vehiclePrompt);
  const isTouch = useIsTouchDevice();
  const compact = useCompactViewport();
  if (!prompt) return null;

  if (isTouch) {
    // There's no E key on a phone: the prompt itself becomes the button that does what E does (hop in/out of a car, mount/dismount).
    return (
      <div
        style={{
          position: "fixed",
          left: compact ? 152 : 0,
          right: compact ? 220 : 0,
          bottom: compact ? 74 : "max(310px, calc(env(safe-area-inset-bottom) + 310px))",
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 6,
        }}
      >
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            getActiveGameLoop()?.interact();
          }}
          style={{
            pointerEvents: "auto",
            padding: "12px 20px",
            minHeight: 44,
            background: "rgba(40, 110, 200, 0.85)",
            border: "2px solid rgba(255, 255, 255, 0.7)",
            borderRadius: 24,
            color: "#fff",
            fontFamily: "sans-serif",
            fontSize: 15,
            fontWeight: 600,
            userSelect: "none",
            touchAction: "manipulation",
          }}
        >
          {prompt.replace(/^Press E to /, "Tap to ")}
        </button>
      </div>
    );
  }

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
