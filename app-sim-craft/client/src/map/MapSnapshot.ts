import type { MiniMapMarker } from "./MiniMap";

/** What the full-screen map (ui/FullMap.tsx) needs each frame it's open: the seed to sample terrain from, where the player is and which way they face, and the live landmark markers (not the swarm of creatures/fish). */
export interface MapSnapshot {
  seed: number;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  markers: MiniMapMarker[];
}
