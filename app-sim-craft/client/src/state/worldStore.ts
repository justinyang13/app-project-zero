// UI-facing projection of which named world is currently active — read by
// MapSwitcher/CloudSync for display. Not the source of truth (IndexedDB
// is), just what App.tsx sets once the active world id is resolved.
import { create } from "zustand";

interface WorldState {
  worldId: string | null;
  setWorldId: (worldId: string) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  worldId: null,
  setWorldId: (worldId) => set({ worldId }),
}));
