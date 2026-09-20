import { useState } from "react";
import type { BuildMode } from "../state/hotbarStore";
import { HOTBAR_SLOTS, useHotbarStore } from "../state/hotbarStore";
import { ToolIcon } from "./ToolIcon";
import { ModeGlyph } from "./ModeGlyph";
import { useCompactViewport } from "../hooks/useCompactViewport";
import { useIsTouchDevice } from "../hooks/useIsTouchDevice";
import {
  COMPACT_LEFT_RESERVE,
  COMPACT_PICKER_ABOVE_TOGGLE,
  COMPACT_RIGHT_RESERVE,
  EDGE_MARGIN,
  PORTRAIT_PICKER_BOTTOM,
  safeBottom,
} from "./touchLayout";

const MODES: { mode: BuildMode; label: string; color: string; hotkey: string }[] = [
  { mode: "break", label: "Break", color: "#e0645a", hotkey: "Z" },
  { mode: "place", label: "Build", color: "#6fbf3f", hotkey: "X" },
  { mode: "torch", label: "Torch", color: "#ffb347", hotkey: "C" },
  { mode: "flag", label: "Flag", color: "#ff4fd8", hotkey: "V" },
];

/** Space the touch hotbar's frame takes besides its slots: side padding + panel padding + gaps. */
const TOUCH_HOTBAR_CHROME = 16 + 12 + (HOTBAR_SLOTS.length - 1) * 6;

function slotButtonStyle(selected: boolean, colorHex: string, size: number | string = 48): React.CSSProperties {
  return {
    width: size,
    height: size,
    border: selected ? "2px solid #fff" : "2px solid rgba(255,255,255,0.3)",
    borderRadius: 4,
    background: colorHex,
    position: "relative",
    cursor: "pointer",
    touchAction: "manipulation",
    flexShrink: 0,
  };
}

export function Hotbar() {
  const isTouch = useIsTouchDevice();
  const compact = useCompactViewport();
  const selectedIndex = useHotbarStore((s) => s.selectedIndex);
  const select = useHotbarStore((s) => s.select);
  const mode = useHotbarStore((s) => s.mode);
  const setMode = useHotbarStore((s) => s.setMode);
  // Touch only: the block row starts folded away to a single button so it does not cover the view.
  const [expanded, setExpanded] = useState(false);

  if (isTouch) {
    // Below the thumb controls' row the block picker is one small button, in the bottom row between the joystick and the action buttons; tapping it opens the tool + block choices above that row.
    const bottomRowInset = safeBottom(EDGE_MARGIN);
    const sideSpace = compact ? COMPACT_LEFT_RESERVE + COMPACT_RIGHT_RESERVE : 0;
    // Slots shrink (down from 48px) so the whole row fits the space beside the thumb controls — no scrolling to find a block.
    const slotSize = `min(48px, calc((100vw - ${sideSpace + TOUCH_HOTBAR_CHROME}px) / ${HOTBAR_SLOTS.length}))`;
    const selectedBlock = HOTBAR_SLOTS[selectedIndex];
    return (
      <>
        <button
          onClick={() => setExpanded((v) => !v)}
          title="Choose a tool or block"
          style={{
            ...slotButtonStyle(true, `#${selectedBlock.color.toString(16).padStart(6, "0")}`, 44),
            position: "fixed",
            bottom: bottomRowInset,
            left: compact ? COMPACT_LEFT_RESERVE : "max(140px, calc(50% - 56px))",
            zIndex: 5, // above the touch look-drag overlay, so it stays tappable
            boxShadow: "0 1px 6px rgba(0, 0, 0, 0.5)",
          }}
        >
          <span style={{ position: "absolute", top: 1, left: 4, fontSize: 10, color: "#fff", textShadow: "0 0 2px #000", fontFamily: "monospace" }}>
            {selectedIndex + 1}
          </span>
          <span style={{ position: "absolute", top: 1, right: 4, fontSize: 9, color: "#fff", textShadow: "0 0 2px #000" }}>{expanded ? "▾" : "▴"}</span>
          <span style={{ position: "absolute", bottom: 1, right: 1 }}>
            <ToolIcon tool={selectedBlock.toolType} />
          </span>
        </button>

        {expanded && (
          <div
            style={{
              position: "fixed",
              left: compact ? COMPACT_LEFT_RESERVE : 0,
              right: compact ? COMPACT_RIGHT_RESERVE : 0,
              // Portrait: above the thumb-control columns. Landscape: right above the toggle.
              bottom: compact ? `calc(${safeBottom(EDGE_MARGIN)} + ${COMPACT_PICKER_ABOVE_TOGGLE}px)` : safeBottom(PORTRAIT_PICKER_BOTTOM),
              display: "flex",
              justifyContent: "center",
              padding: "0 8px",
              zIndex: 5,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                background: "rgba(0, 0, 0, 0.5)",
                padding: 6,
                borderRadius: 6,
                pointerEvents: "auto",
              }}
            >
              <div style={{ display: "flex", gap: 6 }}>
                {MODES.map((m) => (
                  <button
                    key={m.mode}
                    onClick={() => setMode(m.mode)}
                    title={m.label}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      width: 56,
                      height: 44,
                      border: `2px solid ${mode === m.mode ? m.color : "rgba(255,255,255,0.3)"}`,
                      borderRadius: 6,
                      background: mode === m.mode ? "rgba(255,255,255,0.15)" : "rgba(0, 0, 0, 0.4)",
                      color: "#fff",
                      fontFamily: "monospace",
                      fontSize: 9,
                      touchAction: "manipulation",
                      padding: 0,
                    }}
                  >
                    <ModeGlyph mode={m.mode} size={20} />
                    {m.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {HOTBAR_SLOTS.map((block, i) => (
                  <button
                    key={block.key}
                    onClick={() => {
                      select(i);
                      setExpanded(false);
                    }}
                    style={slotButtonStyle(i === selectedIndex, `#${block.color.toString(16).padStart(6, "0")}`, slotSize)}
                    title={`${block.name} (breaks with: ${block.toolType === "none" ? "any tool" : block.toolType})`}
                  >
                    <span style={{ position: "absolute", top: 2, left: 4, fontSize: 10, color: "#fff", textShadow: "0 0 2px #000", fontFamily: "monospace" }}>
                      {i + 1}
                    </span>
                    <span style={{ position: "absolute", bottom: 1, right: 1 }}>
                      <ToolIcon tool={block.toolType} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

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
            title={`${m.label} — hold left-click to keep going (${m.hotkey}, or cycle with B)`}
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
              touchAction: "manipulation",
            }}
          >
            <ModeGlyph mode={m.mode} />
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
              touchAction: "manipulation",
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
