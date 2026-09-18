// UI-facing Zustand store. Per spec/01-tech-stack-architecture.md §3, this
// only ever receives a throttled, read-only projection of GameLoop/World
// state — it is never the primary store for simulation data.
import { create } from "zustand";

export interface DebugSnapshot {
  fps: number;
  frameTimeMs: number;
  position: { x: number; y: number; z: number };
  facingYawDeg: number;
  chunkCount: number;
  simTick: number;
  worldSeed: number;
  pointerLocked: boolean;
  biome: string;
  targetBlock: string | null;
  pendingChunkOps: number;
  carCount: number;
  flying: boolean;
  swimming: boolean;
  viewMode: "first" | "third";
  timeOfDay: number; // fraction of a day, [0, 1) — whatever Sky is actually rendering right now
}

// A ready-to-display message rather than an "enter"/"exit" enum — there
// are now two very different things to mount (a car, the dragon), each
// wanting its own wording, and a free-text prompt scales to that without
// the store needing to know what each vehicle is called.
export type VehiclePrompt = string | null;

interface HudState {
  debugVisible: boolean;
  toggleDebug: () => void;
  debug: DebugSnapshot;
  setDebug: (snapshot: DebugSnapshot) => void;
  vehiclePrompt: VehiclePrompt;
  setVehiclePrompt: (prompt: VehiclePrompt) => void;
}

export const useHudStore = create<HudState>((set) => ({
  debugVisible: false,
  toggleDebug: () => set((s) => ({ debugVisible: !s.debugVisible })),
  vehiclePrompt: null,
  setVehiclePrompt: (vehiclePrompt) => set({ vehiclePrompt }),
  debug: {
    fps: 0,
    frameTimeMs: 0,
    position: { x: 0, y: 0, z: 0 },
    facingYawDeg: 0,
    chunkCount: 0,
    simTick: 0,
    worldSeed: 0,
    pointerLocked: false,
    biome: "",
    targetBlock: null,
    pendingChunkOps: 0,
    carCount: 0,
    flying: false,
    swimming: false,
    viewMode: "first",
    timeOfDay: 0.5,
  },
  setDebug: (snapshot) => set({ debug: snapshot }),
}));
