// Shared constants for the dark castle (see castle/blueprint.ts for the
// build itself, castle/crag.ts for the mountain it stands on). Everything
// here is a fixed world coordinate, independent of the world seed — the
// castle and its crag are identical in every world — so worldgen, the
// meshing worker and the runtime visuals can all agree on positions
// without sharing any state.
//
// The castle is authored in its own local frame: +x east, +z SOUTH (the
// front, facing the spawn meadow), +y up, with local y = 0 being the
// courtyard's floor layer. `toWorld*` maps that frame into the world.
export const CASTLE_CENTER = { x: -100, z: -30 };

/** World Y of the courtyard floor's top block layer (a player stands one above it). */
export const CASTLE_FLOOR_Y = 100;
export const CASTLE_BASE_Y = CASTLE_FLOOR_Y + 1;

// The castle's own footprint in local coordinates (walls included).
export const CASTLE_MIN_X = -40;
export const CASTLE_MAX_X = 40;
export const CASTLE_MIN_Z = -36;
export const CASTLE_MAX_Z = 30;

// The dense plan box (blocks + baked block-light) — a margin beyond the
// footprint so firelight has room to spread past the walls, and deep and long
// enough to hold the whole approach ramp (it runs from the outer gate down to
// the meadow at about y = 67) with its lamps.
export const PLAN_MIN_X = -58;
export const PLAN_MAX_X = 58;
export const PLAN_MIN_Z = -50;
export const PLAN_MAX_Z = 82;
export const PLAN_MIN_Y = -36;
export const PLAN_MAX_Y = 74;

// The approach: a carved causeway from the meadow up to the outer gate.
export const RAMP_START_Z = 30; // local z of the first ramp block, just outside the outer wall
export const RAMP_HALF_WIDTH = 3;
export const RAMP_DROP_PER_BLOCK = 0.75;

/** A world-space point for a castle-local one. */
export function toWorldX(lx: number): number {
  return CASTLE_CENTER.x + lx;
}
export function toWorldZ(lz: number): number {
  return CASTLE_CENTER.z + lz;
}
export function toWorldY(ly: number): number {
  return CASTLE_FLOOR_Y + ly;
}

/** Just outside the outer gate, on the ramp: where the "back to the castle" button drops the player. */
export const CASTLE_GATE_SPAWN = { x: CASTLE_CENTER.x + 0.5, z: CASTLE_CENTER.z + RAMP_START_Z + 6 };
