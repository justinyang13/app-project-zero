import { useEffect, useRef, useState } from "react";
import { useMinimapStore } from "../state/minimapStore";
import { getActiveGameLoop } from "../engine/activeGameLoop";
import { FULL_MAP_HALF_RANGE } from "../engine/FullMapRender";
import { ensureFullMapRender } from "../engine/fullMapCache";
import { LANDMARKS } from "../engine/landmarks";
import type { MiniMapMarkerKind } from "../engine/MiniMap";
import { useIsTouchDevice } from "../hooks/useIsTouchDevice";

const MARKER_STYLE: Partial<Record<MiniMapMarkerKind, { color: string; radius: number; shape: "circle" | "diamond" }>> = {
  campfire: { color: "#ff8c2a", radius: 4, shape: "circle" },
  custom: { color: "#ff4fd8", radius: 6, shape: "diamond" },
  dragon: { color: "#7cff5a", radius: 7, shape: "diamond" },
};

function drawMarker(ctx: CanvasRenderingContext2D, x: number, y: number, style: { color: string; radius: number; shape: "circle" | "diamond" }): void {
  ctx.fillStyle = style.color;
  ctx.strokeStyle = "#101010";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (style.shape === "diamond") {
    ctx.moveTo(x, y - style.radius);
    ctx.lineTo(x + style.radius, y);
    ctx.lineTo(x, y + style.radius);
    ctx.lineTo(x - style.radius, y);
    ctx.closePath();
  } else {
    ctx.arc(x, y, style.radius, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function FullMap() {
  const isTouch = useIsTouchDevice();
  const open = useMinimapStore((s) => s.fullMapOpen);
  const close = useMinimapStore((s) => s.closeFullMap);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [you, setYou] = useState<{ x: number; z: number } | null>(null);
  const [size, setSize] = useState(() => Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.8));

  useEffect(() => {
    const onResize = (): void => setSize(Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.8));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const draw = (): void => {
      const snapshot = getActiveGameLoop()?.getMapSnapshot();
      if (snapshot) {
        const render = ensureFullMapRender(snapshot.seed);
        const scale = size / (FULL_MAP_HALF_RANGE * 2);
        const toX = (wx: number): number => (wx + FULL_MAP_HALF_RANGE) * scale;
        const toY = (wz: number): number => (wz + FULL_MAP_HALF_RANGE) * scale;

        ctx.clearRect(0, 0, size, size);
        ctx.imageSmoothingEnabled = false;
        // Terrain is drawn translucent so the live game stays visible
        // underneath — the map is a HUD overlay you can keep moving under.
        ctx.globalAlpha = 0.78;
        ctx.drawImage(render.canvas, 0, 0, size, size);
        ctx.globalAlpha = 1;

        // 100-block grid with coordinate labels along the top and left edges.
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = 1;
        ctx.font = "10px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.textAlign = "left";
        const gridEdge = Math.floor(FULL_MAP_HALF_RANGE / 100) * 100;
        for (let g = -gridEdge; g <= gridEdge; g += 100) {
          ctx.beginPath();
          ctx.moveTo(toX(g), 0);
          ctx.lineTo(toX(g), size);
          ctx.moveTo(0, toY(g));
          ctx.lineTo(size, toY(g));
          ctx.stroke();
          ctx.fillText(String(g), toX(g) + 3, 11);
          ctx.fillText(String(g), 3, toY(g) - 3);
        }

        for (const m of snapshot.markers) {
          const style = MARKER_STYLE[m.kind];
          if (style) drawMarker(ctx, toX(m.x), toY(m.z), style);
        }
        for (const lm of LANDMARKS) {
          drawMarker(ctx, toX(lm.x), toY(lm.z), { color: lm.color, radius: 5, shape: "circle" });
          drawLabel(ctx, lm.label, toX(lm.x), toY(lm.z) - 10, lm.color);
        }

        // Player: a pulsing halo + arrow at their spot, or pinned to the edge
        // (pointing toward them) when they've flown beyond the mapped region.
        const half = FULL_MAP_HALF_RANGE;
        const clampedX = Math.max(-half, Math.min(half, snapshot.playerX));
        const clampedZ = Math.max(-half, Math.min(half, snapshot.playerZ));
        const inside = clampedX === snapshot.playerX && clampedZ === snapshot.playerZ;
        const px = toX(clampedX);
        const py = toY(clampedZ);
        const pulse = (performance.now() % 1400) / 1400;
        ctx.beginPath();
        ctx.arc(px, py, 10 + pulse * 18, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(55, 230, 255, ${1 - pulse})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, 11, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(16, 16, 16, 0.55)";
        ctx.fill();
        ctx.save();
        ctx.translate(px, py);
        // Arrow points up at rotation 0; on the map that's -z, matching the
        // camera's yaw convention, so -yaw turns it to face the player's
        // heading (same as the minimap). Off the map it points toward them.
        ctx.rotate(inside ? -snapshot.playerYaw : Math.atan2(snapshot.playerX - clampedX, -(snapshot.playerZ - clampedZ)));
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(10, 11);
        ctx.lineTo(0, 6);
        ctx.lineTo(-10, 11);
        ctx.closePath();
        ctx.fillStyle = "#ffe14a";
        ctx.strokeStyle = "#101010";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        drawLabel(ctx, `You (${Math.round(snapshot.playerX)}, ${Math.round(snapshot.playerZ)})`, px, py + 30, "#ffe14a");
        setYou((prev) => {
          const x = Math.round(snapshot.playerX);
          const z = Math.round(snapshot.playerZ);
          return prev && prev.x === x && prev.z === z ? prev : { x, z };
        });

        if (render.progress < 1) {
          drawLabel(ctx, `Charting terrain… ${Math.round(render.progress * 100)}%`, size / 2, size / 2, "#ffffff");
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [open, size]);

  if (!open) return null;

  // The overlay never intercepts input (pointer-events: none) — the game
  // underneath keeps receiving movement keys, mouse-look and clicks. Only
  // the close button is clickable.
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontFamily: "monospace",
        color: "#fff",
        userSelect: "none",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "3px 8px",
          fontSize: 13,
          background: "rgba(0, 0, 0, 0.55)",
          borderRadius: 4,
        }}
      >
        <span>
          {isTouch
            ? `World Map${you ? ` · x ${you.x}, z ${you.z}` : ""}`
            : `World Map — M or Esc to close · keep moving${you ? ` · you: x ${you.x}, z ${you.z}` : ""}`}
        </span>
        <button
          onClick={close}
          title="Close map (M)"
          style={{
            pointerEvents: "auto",
            padding: isTouch ? "6px 14px" : "0 7px",
            background: "rgba(0, 0, 0, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.5)",
            borderRadius: 3,
            color: "#fff",
            fontFamily: "monospace",
            fontSize: isTouch ? 18 : 13,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          ×
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          background: "rgba(6, 10, 16, 0.35)",
          border: "2px solid rgba(255,255,255,0.5)",
          borderRadius: 4,
          boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}
      />
    </div>
  );
}
