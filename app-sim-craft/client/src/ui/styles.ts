// Shared inline styles for the small monospace HUD panels (Maps panel, debug
// overlay, ...) — the same button, input and panel look was being re-declared
// object by object in each component.
import type { CSSProperties } from "react";

const HUD_BORDER = "1px solid rgba(255,255,255,0.3)";

export const hudPanel: CSSProperties = {
  background: "rgba(0, 0, 0, 0.55)",
  borderRadius: 6,
  padding: "8px 10px",
  color: "#fff",
  fontFamily: "monospace",
  fontSize: 12,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

export const hudInput: CSSProperties = {
  fontFamily: "monospace",
  fontSize: 10,
  padding: "3px 5px",
  borderRadius: 3,
  border: HUD_BORDER,
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  minWidth: 0,
};

export const HUD_ACTION_BLUE = "rgba(90,160,255,0.35)";
export const HUD_NEUTRAL = "rgba(255,255,255,0.15)";

export interface HudButtonOptions {
  background: string;
  padding: string;
  busy?: boolean;
  /** Share the row equally with sibling buttons. */
  grow?: boolean;
  alignLeft?: boolean;
}

export function hudButton({ background, padding, busy = false, grow = false, alignLeft = false }: HudButtonOptions): CSSProperties {
  return {
    ...(grow ? { flex: 1 } : {}),
    ...(alignLeft ? { textAlign: "left" } : {}),
    fontSize: 10,
    fontFamily: "monospace",
    background,
    border: HUD_BORDER,
    borderRadius: 3,
    color: "#fff",
    padding,
    cursor: busy ? "default" : "pointer",
  };
}
