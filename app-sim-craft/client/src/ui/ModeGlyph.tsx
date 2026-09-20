import type { BuildMode } from "../state/hotbarStore";
import { ToolIcon } from "./ToolIcon";

/** The icon for a build mode — a pickaxe for Break, a placed cube for Build, a torch, a flag. Drawn as SVG (not emoji) so it stays legible on the dark buttons. */
export function ModeGlyph({ mode, size = 20 }: { mode: BuildMode; size?: number }) {
  switch (mode) {
    case "break":
      return <ToolIcon tool="pickaxe" size={size} />;
    case "place":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block" }}>
          <path d="M8 2 L13.5 5 L13.5 11 L8 14 L2.5 11 L2.5 5 Z" fill="#cfe8cf" stroke="#e8e8e8" strokeWidth="0.8" />
          <path d="M8 2 L13.5 5 L8 8 L2.5 5 Z" fill="#e6f5e6" stroke="#e8e8e8" strokeWidth="0.8" />
        </svg>
      );
    case "torch":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block" }}>
          <path d="M7.3 7 L7.3 14 L8.7 14 L8.7 7 Z" fill="#8a5a35" />
          <path d="M8 1 Q11 3.5 9.5 6 Q9.2 6.6 8 6.6 Q6.8 6.6 6.5 6 Q5 3.5 8 1 Z" fill="#ff8c2a" />
          <path d="M8 3 Q9.2 4.3 8.6 5.6 Q8.4 6 8 6 Q7.6 6 7.4 5.6 Q6.8 4.3 8 3 Z" fill="#ffe066" />
        </svg>
      );
    case "flag":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block" }}>
          <path d="M4 1 L4 15" stroke="#e8e8e8" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M4 2 L13 4.2 L4 6.4 Z" fill="#ff4fd8" />
        </svg>
      );
  }
}
