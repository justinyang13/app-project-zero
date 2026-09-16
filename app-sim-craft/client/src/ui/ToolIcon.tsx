import type { ToolType } from "../data/blocks";

// Simple inline-SVG glyphs — no texture/asset pipeline exists yet
// (18-visual-art-direction.md's atlas is later-phase work), so these are
// drawn shapes rather than sprites. Good enough to tell at a glance what
// tool a block needs.
export function ToolIcon({ tool, size = 14 }: { tool: ToolType; size?: number }) {
  if (tool === "none") return null;

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block" }}>
      {tool === "pickaxe" && (
        <g>
          <path d="M3 13 L8.5 7.5" stroke="#e8e8e8" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <path d="M6 3.5 Q9.5 1.5 13 4 Q13.5 6.5 11 8.5 Q8.5 6 6 3.5 Z" fill="#cfcfcf" />
        </g>
      )}
      {tool === "shovel" && (
        <g>
          <path d="M8 2 L8 9.5" stroke="#e8e8e8" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M4.8 9.5 L11.2 9.5 L9.7 14 L6.3 14 Z" fill="#cfcfcf" />
        </g>
      )}
      {tool === "axe" && (
        <g>
          <path d="M6 14 L11 4" stroke="#e8e8e8" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M9.2 2 Q13.5 2 13 6.2 Q10 7.3 7.8 5.2 Z" fill="#cfcfcf" />
        </g>
      )}
      {tool === "shears" && (
        <g stroke="#e8e8e8" strokeWidth="1.4" strokeLinecap="round" fill="none">
          <path d="M3 3 L13 13" />
          <path d="M13 3 L3 13" />
          <circle cx="3" cy="3" r="1.2" fill="#cfcfcf" stroke="none" />
          <circle cx="3" cy="13" r="1.2" fill="#cfcfcf" stroke="none" />
        </g>
      )}
    </svg>
  );
}
