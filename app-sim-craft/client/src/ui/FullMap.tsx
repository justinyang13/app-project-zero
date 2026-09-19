import { useEffect, useRef, useState } from "react";
import { useMinimapStore } from "../state/minimapStore";
import { getActiveGameLoop } from "../engine/activeGameLoop";
import { FULL_MAP_HALF_RANGE, startTerrainRender, type TerrainRender } from "../engine/FullMapRender";
import { CASTLE_CENTER, HOUSE_LOTS } from "../engine/worldgen/structures";
import { MOUNTAIN_CENTER } from "../engine/worldgen/mountain";
import { DEEP_LAKE_CENTER } from "../engine/worldgen/deepLake";
import type { MiniMapMarkerKind } from "../engine/MiniMap";

// Terrain is a pure function of the seed, so once painted for a world it
// stays valid — reopening the map is instant instead of re-sampling.
let cachedRender: { seed: number; render: TerrainRender; progress: number } | null = null;

const VILLAGE_CENTER = (() => {
  const xs = HOUSE_LOTS.flatMap((l) => [l.x, l.x + l.width]);
  const zs = HOUSE_LOTS.flatMap((l) => [l.z, l.z + l.depth]);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
})();

const LANDMARKS: { x: number; z: number; label: string; color: string }[] = [
  { x: CASTLE_CENTER.x, z: CASTLE_CENTER.z, label: "Castle", color: "#f2f2f2" },
  { x: VILLAGE_CENTER.x, z: VILLAGE_CENTER.z, label: "Village", color: "#ffd27a" },
  { x: MOUNTAIN_CENTER.x, z: MOUNTAIN_CENTER.z, label: "Dragon Mountain", color: "#ff7a5a" },
  { x: DEEP_LAKE_CENTER.x, z: DEEP_LAKE_CENTER.z, label: "Deep Lake", color: "#bfe3ff" },
];

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
  const open = useMinimapStore((s) => s.fullMapOpen);
  const close = useMinimapStore((s) => s.closeFullMap);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cursor, setCursor] = useState<{ x: number; z: number } | null>(null);
  const [size, setSize] = useState(() => Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.9));

  useEffect(() => {
    const onResize = (): void => setSize(Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.9));
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
        if (!cachedRender || cachedRender.seed !== snapshot.seed) {
          cachedRender?.render.cancel();
          const entry = { seed: snapshot.seed, render: null as unknown as TerrainRender, progress: 0 };
          entry.render = startTerrainRender(snapshot.seed, (f) => {
            entry.progress = f;
          });
          cachedRender = entry;
        }
        const scale = size / (FULL_MAP_HALF_RANGE * 2);
        const toX = (wx: number): number => (wx + FULL_MAP_HALF_RANGE) * scale;
        const toY = (wz: number): number => (wz + FULL_MAP_HALF_RANGE) * scale;

        ctx.clearRect(0, 0, size, size);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(cachedRender.render.canvas, 0, 0, size, size);

        // 100-block grid with coordinate labels along the top and left edges.
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = 1;
        ctx.font = "10px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.textAlign = "left";
        for (let g = -400; g <= 400; g += 100) {
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

        // Player: an arrow at their spot, or pinned to the edge (pointing
        // toward them) when they've flown beyond the mapped region.
        const half = FULL_MAP_HALF_RANGE;
        const clampedX = Math.max(-half, Math.min(half, snapshot.playerX));
        const clampedZ = Math.max(-half, Math.min(half, snapshot.playerZ));
        const inside = clampedX === snapshot.playerX && clampedZ === snapshot.playerZ;
        const px = toX(clampedX);
        const py = toY(clampedZ);
        ctx.save();
        ctx.translate(px, py);
        // Arrow points up at rotation 0; on the map that's -z, matching the
        // camera's yaw convention, so -yaw turns it to face the player's
        // heading (same as the minimap). Off the map it points toward them.
        ctx.rotate(inside ? -snapshot.playerYaw : Math.atan2(snapshot.playerX - clampedX, -(snapshot.playerZ - clampedZ)));
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(8, 9);
        ctx.lineTo(0, 5);
        ctx.lineTo(-8, 9);
        ctx.closePath();
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#101010";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        drawLabel(ctx, inside ? "You" : `You (${Math.round(snapshot.playerX)}, ${Math.round(snapshot.playerZ)})`, px, py + 24, "#ffffff");

        if (cachedRender.progress < 1) {
          drawLabel(ctx, `Charting terrain… ${Math.round(cachedRender.progress * 100)}%`, size / 2, size / 2, "#ffffff");
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [open, size]);

  if (!open) return null;

  return (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(6, 10, 16, 0.92)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontFamily: "monospace",
        color: "#fff",
        userSelect: "none",
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.85 }}>
        World Map — M or Esc to close{cursor ? ` · x ${cursor.x}, z ${cursor.z}` : ""}
      </div>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const f = (v: number): number => Math.round((v / size) * FULL_MAP_HALF_RANGE * 2 - FULL_MAP_HALF_RANGE);
          setCursor({ x: f(e.clientX - rect.left), z: f(e.clientY - rect.top) });
        }}
        onMouseLeave={() => setCursor(null)}
        style={{ width: size, height: size, border: "2px solid rgba(255,255,255,0.5)", borderRadius: 4, boxShadow: "0 4px 24px rgba(0,0,0,0.6)" }}
      />
    </div>
  );
}
