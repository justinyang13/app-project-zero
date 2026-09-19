// Minimap zoom level — the number of world blocks shown across the
// canvas (see engine/MiniMap.ts). Smaller range = more zoomed in.
import { create } from "zustand";

export const MINIMAP_ZOOM_LEVELS = [64, 96, 128, 192, 256];
const DEFAULT_ZOOM_INDEX = 2; // 128, MiniMap.ts's original fixed value

interface MinimapState {
  zoomIndex: number;
  worldRange: number;
  zoomIn: () => void;
  zoomOut: () => void;
  // The full-screen overview map (ui/FullMap.tsx), toggled with M.
  fullMapOpen: boolean;
  toggleFullMap: () => void;
  closeFullMap: () => void;
}

export const useMinimapStore = create<MinimapState>((set) => ({
  zoomIndex: DEFAULT_ZOOM_INDEX,
  worldRange: MINIMAP_ZOOM_LEVELS[DEFAULT_ZOOM_INDEX],
  fullMapOpen: false,
  toggleFullMap: () => set((s) => ({ fullMapOpen: !s.fullMapOpen })),
  closeFullMap: () => set({ fullMapOpen: false }),
  zoomIn: () =>
    set((s) => {
      const zoomIndex = Math.max(0, s.zoomIndex - 1);
      return { zoomIndex, worldRange: MINIMAP_ZOOM_LEVELS[zoomIndex] };
    }),
  zoomOut: () =>
    set((s) => {
      const zoomIndex = Math.min(MINIMAP_ZOOM_LEVELS.length - 1, s.zoomIndex + 1);
      return { zoomIndex, worldRange: MINIMAP_ZOOM_LEVELS[zoomIndex] };
    }),
}));
