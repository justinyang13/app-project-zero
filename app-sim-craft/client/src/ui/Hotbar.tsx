import { HOTBAR_SLOTS, useHotbarStore } from "../state/hotbarStore";
import { ToolIcon } from "./ToolIcon";

export function Hotbar() {
  const selectedIndex = useHotbarStore((s) => s.selectedIndex);
  const select = useHotbarStore((s) => s.select);
  const mode = useHotbarStore((s) => s.mode);
  const toggleMode = useHotbarStore((s) => s.toggleMode);

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
      <button
        onClick={toggleMode}
        title="Toggle what left-click does (B)"
        style={{
          height: 48,
          padding: "0 14px",
          border: "2px solid rgba(255,255,255,0.5)",
          borderRadius: 6,
          background: mode === "place" ? "#3a7d3a" : "#7d3a3a",
          color: "#fff",
          fontFamily: "monospace",
          fontSize: 13,
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {mode === "place" ? <BuildGlyph /> : <ToolIcon tool="pickaxe" size={16} />}
          {mode === "place" ? "BUILD (B)" : "BREAK (B)"}
        </span>
      </button>

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
    <svg width={16} height={16} viewBox="0 0 16 16" style={{ display: "block" }}>
      <path d="M8 2 L13.5 5 L13.5 11 L8 14 L2.5 11 L2.5 5 Z" fill="#cfe8cf" stroke="#e8e8e8" strokeWidth="0.8" />
      <path d="M8 2 L13.5 5 L8 8 L2.5 5 Z" fill="#e6f5e6" stroke="#e8e8e8" strokeWidth="0.8" />
    </svg>
  );
}
