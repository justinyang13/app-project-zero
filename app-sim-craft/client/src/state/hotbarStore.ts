// Hotbar UI state. Per spec/12-ui-ux.md §3-4's hotbar concept, but with
// unlimited "creative-style" supply and no gathered inventory yet —
// full Survival inventory/crafting (spec/04-items-inventory-crafting.md)
// is later-phase work; this is the minimum needed to make placing more
// than one block type possible today.
import { create } from "zustand";
import { BLOCKS } from "../data/blocks";

const HOTBAR_BLOCK_KEYS = ["turf", "loam", "greystone", "dune_sand", "frost_turf", "sandstone", "water"];

export const HOTBAR_SLOTS = HOTBAR_BLOCK_KEYS.map((key) => BLOCKS.find((b) => b.key === key)!);

// "break"/"place" edit voxel blocks; "torch" and "flag" place freestanding
// runtime props instead (a light source and a location marker — see
// engine/Torch.ts and engine/Flag.ts) since neither is a voxel block.
// Every mode repeats while the primary action is held down (see
// engine/GameLoop.ts's primaryActionHeld/holdCooldown), instead of one
// action per click.
export type BuildMode = "break" | "place" | "torch" | "flag";
const MODE_CYCLE: BuildMode[] = ["break", "place", "torch", "flag"];

interface HotbarState {
  selectedIndex: number;
  select: (index: number) => void;
  cycle: (delta: number) => void;
  // Left-click's action is gated by this mode — right-click-to-place is
  // unreliable across input devices (trackpads with secondary-click
  // disabled, single-button mice), so it can't be the only way to place
  // a block. Right-click still works as a break/place shortcut where
  // it's available; this mode is what makes building possible without
  // it. Selected directly via the on-screen buttons, or cycled with B
  // (see ui/Hotbar.tsx).
  mode: BuildMode;
  setMode: (mode: BuildMode) => void;
  cycleMode: () => void;
}

export const useHotbarStore = create<HotbarState>((set) => ({
  selectedIndex: 0,
  select: (index) => set({ selectedIndex: ((index % HOTBAR_SLOTS.length) + HOTBAR_SLOTS.length) % HOTBAR_SLOTS.length }),
  cycle: (delta) =>
    set((s) => ({
      selectedIndex: ((s.selectedIndex + delta) % HOTBAR_SLOTS.length + HOTBAR_SLOTS.length) % HOTBAR_SLOTS.length,
    })),
  mode: "break",
  setMode: (mode) => set({ mode }),
  cycleMode: () =>
    set((s) => ({ mode: MODE_CYCLE[(MODE_CYCLE.indexOf(s.mode) + 1) % MODE_CYCLE.length] })),
}));
