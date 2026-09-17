import { useState } from "react";
import { getTouchOverride, setTouchOverride, type TouchOverride } from "../hooks/useIsTouchDevice";

const CYCLE: TouchOverride[] = [null, "touch", "desktop"];

function labelFor(override: TouchOverride): string {
  if (override === "touch") return "Touch";
  if (override === "desktop") return "Desktop";
  return "Auto";
}

/**
 * The one bit of new UI that's intentionally NOT gated behind
 * useIsTouchDevice() — it has to be reachable in whichever state
 * detection got wrong in order to escape it (a real touch device
 * mis-detected as desktop needs this reachable via a plain tap before
 * touch controls ever activate). Deliberately tiny/low-contrast so it
 * doesn't compete with the actual gameplay UI on either platform.
 */
export function TouchOverrideToggle() {
  const [override, setOverride] = useState<TouchOverride>(getTouchOverride);

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(override) + 1) % CYCLE.length];
    setTouchOverride(next);
    setOverride(next);
  }

  return (
    <button
      onClick={cycle}
      title="Force touch or desktop controls, in case detection misfires — Auto uses this device's own detection"
      style={{
        position: "fixed",
        top: 8,
        left: "50%",
        transform: "translateX(-50%)",
        fontFamily: "monospace",
        fontSize: 10,
        color: "rgba(255, 255, 255, 0.55)",
        background: "rgba(0, 0, 0, 0.35)",
        border: "1px solid rgba(255, 255, 255, 0.25)",
        borderRadius: 10,
        padding: "2px 8px",
        cursor: "pointer",
        zIndex: 20,
      }}
    >
      Controls: {labelFor(override)}
    </button>
  );
}
