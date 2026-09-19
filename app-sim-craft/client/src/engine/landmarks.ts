// The world's fixed points of interest, shared by the full-screen map
// (ui/FullMap.tsx) and the minimap's edge arrows (engine/MiniMap.ts).
import { CASTLE_CENTER } from "./worldgen/structures";
import { VILLAGE_CENTER } from "./worldgen/village/layout";
import { MOUNTAIN_CENTER } from "./worldgen/mountain";
import { DEEP_LAKE_CENTER } from "./worldgen/deepLake";

export interface Landmark {
  x: number;
  z: number;
  label: string;
  /** One-letter badge for the minimap edge arrows. */
  letter: string;
  color: string;
}

export const LANDMARKS: Landmark[] = [
  { x: CASTLE_CENTER.x, z: CASTLE_CENTER.z, label: "Castle", letter: "C", color: "#f2f2f2" },
  { x: VILLAGE_CENTER.x, z: VILLAGE_CENTER.z, label: "Village", letter: "V", color: "#ffd27a" },
  { x: MOUNTAIN_CENTER.x, z: MOUNTAIN_CENTER.z, label: "Dragon Mountain", letter: "M", color: "#ff7a5a" },
  { x: DEEP_LAKE_CENTER.x, z: DEEP_LAKE_CENTER.z, label: "Deep Lake", letter: "L", color: "#bfe3ff" },
];

/** Badge style for the nearest live dragon's edge arrow. */
export const DRAGON_ARROW = { letter: "D", color: "#7cff5a" };
