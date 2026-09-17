import type { ReactElement } from "react";
import type { BuildMode } from "../state/hotbarStore";
import { HOTBAR_SLOTS, useHotbarStore } from "../state/hotbarStore";
import { ToolIcon } from "./ToolIcon";

const MODES: { mode: BuildMode; label: string; color: string; icon: () => ReactElement }[] = [
  { mode: "break", label: "Break", color: "#e0645a", icon: () => <ToolIcon tool="pickaxe" size={20} /> },
  { mode: "place", label: "Build", color: "#6fbf3f", icon: () => <BuildGlyph /> },
  { mode: "torch", label: "Torch", color: "#ffb347", icon: () => <TorchGlyph /> },
  { mode: "flag", label: "Flag", color: "#ff4fd8", icon: () => <FlagGlyph /> },
];

export function Hotbar() {
  const selectedIndex = useHotbarStore((s) => s.selectedIndex);
  const select = useHotbarStore((s) => s.select);
  const mode = useHotbarStore((s) => s.mode);
  const setMode = useHotbarStore((s) => s.setMode);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        {MODES.map((m) => (
          <button
            key={m.mode}
            onClick={() => setMode(m.mode)}
            title={`${m.label} — left-click to use (cycle with B)`}
            style={{
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              border: `2px solid ${mode === m.mode ? m.color : "rgba(255,255,255,0.3)"}`,
              borderRadius: 6,
              background: "rgba(0, 0, 0, 0.4)",
              cursor: "pointer",
            }}
          >
            {m.icon()}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          background: "rgba(0, 0, 0, 0.4)",
          padding: 6,
          borderRadius: 6,
        }}
      >
        {HOTBAR_SLOTS.map((block, i) => (
          <button
            key={block.key}
            onClick={() => select(i)}
            style={{
              width: 48,
              height: 48,
              border: i === selectedIndex ? "2px solid #fff" : "2px solid rgba(255,255,255,0.3)",
              borderRadius: 4,
              background: `#${block.color.toString(16).padStart(6, "0")}`,
              position: "relative",
              cursor: "pointer",
            }}
            title={`${block.name} (breaks with: ${block.toolType === "none" ? "any tool" : block.toolType})`}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: 4,
                fontSize: 10,
                color: "#fff",
                textShadow: "0 0 2px #000",
                fontFamily: "monospace",
              }}
            >
              {i + 1}
            </span>
            <span style={{ position: "absolute", bottom: 1, right: 1 }}>
              <ToolIcon tool={block.toolType} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** A small placed-cube glyph for Build mode — the counterpart to the pickaxe glyph used for Break. */
function BuildGlyph() {
  return (
    <svg width={20} height={20} viewBox="0 0 16 16" style={{ display: "block" }}>
      <path d="M8 2 L13.5 5 L13.5 11 L8 14 L2.5 11 L2.5 5 Z" fill="#cfe8cf" stroke="#e8e8e8" strokeWidth="0.8" />
      <path d="M8 2 L13.5 5 L8 8 L2.5 5 Z" fill="#e6f5e6" stroke="#e8e8e8" strokeWidth="0.8" />
    </svg>
  );
}

/** A small torch-and-flame glyph for Torch mode. */
function TorchGlyph() {
  return (
    <svg width={20} height={20} viewBox="0 0 16 16" style={{ display: "block" }}>
      <path d="M7.3 7 L7.3 14 L8.7 14 L8.7 7 Z" fill="#8a5a35" />
      <path
        d="M8 1 Q11 3.5 9.5 6 Q9.2 6.6 8 6.6 Q6.8 6.6 6.5 6 Q5 3.5 8 1 Z"
        fill="#ff8c2a"
      />
      <path d="M8 3 Q9.2 4.3 8.6 5.6 Q8.4 6 8 6 Q7.6 6 7.4 5.6 Q6.8 4.3 8 3 Z" fill="#ffe066" />
    </svg>
  );
}

/** A small flag-on-a-pole glyph for Flag mode. */
function FlagGlyph() {
  return (
    <svg width={20} height={20} viewBox="0 0 16 16" style={{ display: "block" }}>
      <path d="M4 1 L4 15" stroke="#e8e8e8" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4 2 L13 4.2 L4 6.4 Z" fill="#ff4fd8" />
    </svg>
  );
}
