// Owns the full-screen map's terrain image. Terrain is a pure function of
// the seed, so it's painted once per world — by a couple of background
// workers, kicked off shortly after the game starts (preloadFullMap) so the
// map is normally ready by the time the player first presses M. Opening the
// map earlier just joins the render already in flight.
import { WorkerPool } from "../workers/WorkerPool";
import type { MapRenderApi } from "./mapRender.worker";
import { FULL_MAP_PIXELS } from "./FullMapRender";

const BAND_ROWS = 10;
const POOL_SIZE = 2; // leave the rest of the cores to chunk generation
const PRELOAD_DELAY_MS = 3000; // let the first chunks load before competing with them

export interface FullMapRender {
  seed: number;
  canvas: HTMLCanvasElement;
  /** 0..1, fraction of the map painted so far. */
  progress: number;
  cancel: () => void;
}

let current: FullMapRender | null = null;

/** The map image for this world, starting its render if it isn't already underway. */
export function ensureFullMapRender(seed: number): FullMapRender {
  if (current && current.seed === seed) return current;
  current?.cancel();

  const canvas = document.createElement("canvas");
  canvas.width = FULL_MAP_PIXELS;
  canvas.height = FULL_MAP_PIXELS;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("FullMap: 2D canvas context unavailable");
  ctx.fillStyle = "#1b2a3a";
  ctx.fillRect(0, 0, FULL_MAP_PIXELS, FULL_MAP_PIXELS);

  const pool = new WorkerPool<MapRenderApi>(
    () => new Worker(new URL("./mapRender.worker.ts", import.meta.url), { type: "module" }),
    POOL_SIZE,
  );
  let cancelled = false;
  const render: FullMapRender = {
    seed,
    canvas,
    progress: 0,
    cancel: () => {
      cancelled = true;
      pool.dispose();
      if (current === render) current = null;
    },
  };
  current = render;

  let paintedRows = 0;
  const bands: Promise<void>[] = [];
  for (let row = 0; row < FULL_MAP_PIXELS; row += BAND_ROWS) {
    const rows = Math.min(BAND_ROWS, FULL_MAP_PIXELS - row);
    bands.push(
      pool
        .run((api) => api.renderBand(seed, row, rows))
        .then((pixels) => {
          if (cancelled) return;
          ctx.putImageData(new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, FULL_MAP_PIXELS, rows), 0, row);
          paintedRows += rows;
          render.progress = paintedRows / FULL_MAP_PIXELS;
        }),
    );
  }
  void Promise.all(bands).then(() => {
    if (!cancelled) pool.dispose();
  });
  return render;
}

/** Warms the map cache in the background a few seconds from now. Returns a canceller for when the world unloads. */
export function preloadFullMap(seed: number): () => void {
  const timer = window.setTimeout(() => ensureFullMapRender(seed), PRELOAD_DELAY_MS);
  return () => window.clearTimeout(timer);
}
