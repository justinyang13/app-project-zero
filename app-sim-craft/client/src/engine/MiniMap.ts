// A lightweight top-down HUD map. Terrain is sampled straight from the
// same deterministic world-gen functions chunk generation uses (a pure
// function of seed/x/z, spec/01-tech-stack-architecture.md §9), so the
// map never needs chunks to be loaded — it can show water and roads far
// outside the streamed render distance. Landmarks and creatures are
// passed in as markers each frame. Drawn imperatively onto its own 2D
// canvas from GameLoop's frame loop, the same "GameLoop drives, React
// only mounts the element" split as the main WebGL canvas (see
// GameLoop.ts's header comment).
import { sampleColumn, SEA_LEVEL } from "./worldgen/terrain";
import { isRoadColumn } from "./worldgen/roads";

const CANVAS_SIZE = 160; // px, square
const WORLD_RANGE = 128; // world blocks shown across the canvas
const SAMPLE_STEP = 4; // blocks between terrain samples, for perf
const SCALE = CANVAS_SIZE / WORLD_RANGE;
const MAX_CACHE_ENTRIES = 6000; // bound memory for long sessions that roam far

type TerrainSample = "water" | "road" | "land";

export type MiniMapMarkerKind = "castle" | "campfire" | "creature" | "custom" | "torch";

export interface MiniMapMarker {
  x: number;
  z: number;
  kind: MiniMapMarkerKind;
}

const MARKER_STYLE: Record<MiniMapMarkerKind, { color: string; radius: number; shape: "square" | "circle" | "diamond" }> = {
  castle: { color: "#e2e2e2", radius: 4, shape: "square" },
  campfire: { color: "#ff8c2a", radius: 3, shape: "circle" },
  creature: { color: "#fff066", radius: 2, shape: "circle" },
  custom: { color: "#ff4fd8", radius: 4, shape: "diamond" },
  torch: { color: "#ffb347", radius: 2, shape: "circle" },
};

export class MiniMap {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly seed: number;
  // Terrain here is static/deterministic, so once a cell is sampled it's
  // correct forever — cache it rather than re-running the noise pipeline
  // for the same cell every frame the player lingers nearby.
  private readonly sampleCache = new Map<string, TerrainSample>();

  constructor(canvas: HTMLCanvasElement, seed: number) {
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    this.seed = seed;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("MiniMap: 2D canvas context unavailable");
    this.ctx = ctx;
  }

  private sampleAt(wx: number, wz: number): TerrainSample {
    const key = `${wx},${wz}`;
    const cached = this.sampleCache.get(key);
    if (cached) return cached;
    if (this.sampleCache.size > MAX_CACHE_ENTRIES) this.sampleCache.clear();

    const height = sampleColumn(this.seed, wx, wz).height;
    const sample: TerrainSample = height < SEA_LEVEL ? "water" : isRoadColumn(wx, wz) ? "road" : "land";
    this.sampleCache.set(key, sample);
    return sample;
  }

  update(playerX: number, playerZ: number, playerYaw: number, markers: MiniMapMarker[]): void {
    const ctx = this.ctx;
    const half = WORLD_RANGE / 2;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = "#5a8a4a"; // land base — only water/road cells get painted over it below
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const startX = Math.floor((playerX - half) / SAMPLE_STEP) * SAMPLE_STEP;
    const startZ = Math.floor((playerZ - half) / SAMPLE_STEP) * SAMPLE_STEP;
    const cellPx = SAMPLE_STEP * SCALE + 0.5; // slight overlap so cells tile without seams

    for (let wx = startX; wx <= playerX + half; wx += SAMPLE_STEP) {
      for (let wz = startZ; wz <= playerZ + half; wz += SAMPLE_STEP) {
        const sample = this.sampleAt(wx, wz);
        if (sample === "land") continue;
        ctx.fillStyle = sample === "water" ? "#3f7fd0" : "#8a8a8a";
        const sx = CANVAS_SIZE / 2 + (wx - playerX) * SCALE;
        const sy = CANVAS_SIZE / 2 + (wz - playerZ) * SCALE;
        ctx.fillRect(sx - cellPx / 2, sy - cellPx / 2, cellPx, cellPx);
      }
    }

    const markerMargin = 6;
    for (const marker of markers) {
      const sx = CANVAS_SIZE / 2 + (marker.x - playerX) * SCALE;
      const sy = CANVAS_SIZE / 2 + (marker.z - playerZ) * SCALE;
      if (sx < -markerMargin || sx > CANVAS_SIZE + markerMargin || sy < -markerMargin || sy > CANVAS_SIZE + markerMargin) {
        continue;
      }
      const style = MARKER_STYLE[marker.kind];
      ctx.fillStyle = style.color;
      if (style.shape === "square") {
        ctx.fillRect(sx - style.radius, sy - style.radius, style.radius * 2, style.radius * 2);
      } else if (style.shape === "diamond") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy - style.radius);
        ctx.lineTo(sx + style.radius, sy);
        ctx.lineTo(sx, sy + style.radius);
        ctx.lineTo(sx - style.radius, sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, style.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player arrow: always dead-center, rotates to face the camera's yaw.
    ctx.save();
    ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    ctx.rotate(-playerYaw);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  }
}
