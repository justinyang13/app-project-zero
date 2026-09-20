// Paints bands of the full-screen overview map (engine/FullMapRender.ts)
// off the main thread, so charting the terrain never stutters the game.
import * as Comlink from "comlink";
import { FULL_MAP_HALF_RANGE, FULL_MAP_PIXELS, FULL_MAP_STEP, terrainColor } from "../map/FullMapRender";

const api = {
  /** RGBA pixels for `rows` map rows starting at `startRow`, FULL_MAP_PIXELS wide. */
  renderBand(seed: number, startRow: number, rows: number): Uint8ClampedArray {
    const data = new Uint8ClampedArray(FULL_MAP_PIXELS * rows * 4);
    for (let r = 0; r < rows; r++) {
      const wz = -FULL_MAP_HALF_RANGE + (startRow + r) * FULL_MAP_STEP;
      for (let c = 0; c < FULL_MAP_PIXELS; c++) {
        const wx = -FULL_MAP_HALF_RANGE + c * FULL_MAP_STEP;
        const [red, green, blue] = terrainColor(seed, wx, wz);
        const i = (r * FULL_MAP_PIXELS + c) * 4;
        data[i] = red;
        data[i + 1] = green;
        data[i + 2] = blue;
        data[i + 3] = 255;
      }
    }
    return Comlink.transfer(data, [data.buffer]);
  },
};

export type MapRenderApi = typeof api;

Comlink.expose(api);
