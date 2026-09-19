// Renders the big overview map: the whole area SimCraft's landmarks live
// in (the loop road, castle, village, dragon mountain, deep lake), sampled
// straight from the same deterministic terrain function chunk generation
// uses — so like the minimap it needs no loaded chunks and shows terrain
// the player has never visited. The world itself is unbounded, so "the
// entire map" here means this whole landmark region rather than infinity.
// Sampling is spread across animation frames (see startTerrainRender) so
// opening the map never freezes the game.
import { sampleColumn, SEA_LEVEL } from "./worldgen/terrain";
import { isRoadColumn } from "./worldgen/roads";

export const FULL_MAP_HALF_RANGE = 420; // blocks either side of the origin
export const FULL_MAP_STEP = 2; // blocks per map pixel
export const FULL_MAP_PIXELS = (FULL_MAP_HALF_RANGE * 2) / FULL_MAP_STEP;

const ROWS_PER_SLICE = 14;

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function shade(rgb: [number, number, number], k: number): [number, number, number] {
  return [Math.min(255, rgb[0] * k), Math.min(255, rgb[1] * k), Math.min(255, rgb[2] * k)];
}

const BIOME_LAND: Record<string, [number, number, number]> = {
  meadow: [92, 148, 70],
  desert: [226, 200, 130],
  tundra: [214, 232, 232],
};

/** One map pixel's color for a world column. */
export function terrainColor(seed: number, wx: number, wz: number): [number, number, number] {
  const { height, biome } = sampleColumn(seed, wx, wz);
  if (height < SEA_LEVEL) {
    const depth = Math.min(1, (SEA_LEVEL - height) / 26); // the deep lake reaches 26 below sea level
    return [mix(84, 22, depth), mix(158, 58, depth), mix(228, 140, depth)];
  }
  if (isRoadColumn(wx, wz)) return [120, 120, 124];
  const base = BIOME_LAND[biome.key] ?? BIOME_LAND.meadow;
  // Relief shading: higher ground is lighter, and the mountain's upper slopes blend to bare rock and snow.
  const rise = Math.max(0, height - SEA_LEVEL);
  let color = shade(base, 0.82 + Math.min(1, rise / 60) * 0.3);
  if (rise > 45) {
    const rock = Math.min(1, (rise - 45) / 50);
    color = [mix(color[0], 150, rock), mix(color[1], 148, rock), mix(color[2], 146, rock)];
  }
  if (rise > 110) {
    const snow = Math.min(1, (rise - 110) / 40);
    color = [mix(color[0], 246, snow), mix(color[1], 248, snow), mix(color[2], 252, snow)];
  }
  return color;
}

export interface TerrainRender {
  canvas: HTMLCanvasElement;
  cancel: () => void;
}

/** Paints the terrain into an offscreen canvas a slice of rows at a time; `onProgress` fires after each slice (0..1) so the UI can repaint. */
export function startTerrainRender(seed: number, onProgress: (fraction: number) => void): TerrainRender {
  const canvas = document.createElement("canvas");
  canvas.width = FULL_MAP_PIXELS;
  canvas.height = FULL_MAP_PIXELS;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("FullMap: 2D canvas context unavailable");
  ctx.fillStyle = "#1b2a3a";
  ctx.fillRect(0, 0, FULL_MAP_PIXELS, FULL_MAP_PIXELS);

  let row = 0;
  let cancelled = false;
  const slice = (): void => {
    if (cancelled) return;
    const rows = Math.min(ROWS_PER_SLICE, FULL_MAP_PIXELS - row);
    const img = ctx.createImageData(FULL_MAP_PIXELS, rows);
    for (let r = 0; r < rows; r++) {
      const wz = -FULL_MAP_HALF_RANGE + (row + r) * FULL_MAP_STEP;
      for (let c = 0; c < FULL_MAP_PIXELS; c++) {
        const wx = -FULL_MAP_HALF_RANGE + c * FULL_MAP_STEP;
        const [red, green, blue] = terrainColor(seed, wx, wz);
        const i = (r * FULL_MAP_PIXELS + c) * 4;
        img.data[i] = red;
        img.data[i + 1] = green;
        img.data[i + 2] = blue;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, row);
    row += rows;
    onProgress(row / FULL_MAP_PIXELS);
    if (row < FULL_MAP_PIXELS) requestAnimationFrame(slice);
  };
  requestAnimationFrame(slice);

  return {
    canvas,
    cancel: () => {
      cancelled = true;
    },
  };
}
