// UI-facing time-of-day control. Defaults to following the real system
// clock (see engine/Sky.ts's original "default to system time" design);
// setting a manual time overrides that until the player switches back.
import { create } from "zustand";

export type TimeMode = "system" | "manual";

interface TimeState {
  mode: TimeMode;
  manualTimeOfDay: number; // fraction of a day, [0, 1)
  setManualTimeOfDay: (t: number) => void;
  useSystemTime: () => void;
}

export const useTimeStore = create<TimeState>((set) => ({
  mode: "system",
  manualTimeOfDay: 0.5,
  setManualTimeOfDay: (t) => set({ mode: "manual", manualTimeOfDay: ((t % 1) + 1) % 1 }),
  useSystemTime: () => set({ mode: "system" }),
}));
