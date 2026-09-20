// What the game remembers about the player between sessions, in the game's own
// terms — independent of how (or whether) it is stored. persistence/ maps this
// to and from database rows.

/** A place the player marked on the map — a flag in the world plus a marker on the minimaps. */
export interface MapMarker {
  x: number;
  z: number;
  // Optional so markers saved before this field existed still load — the
  // in-world flag falls back to ground height at that (x, z) when it's missing.
  y?: number;
  label: string;
}

/** A torch the player placed. */
export interface PlacedTorch {
  x: number;
  y: number;
  z: number;
}

export interface PlayerSnapshot {
  position: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  flying: boolean;
  selectedHotbarIndex: number;
  markers: MapMarker[];
  torches: PlacedTorch[];
}
