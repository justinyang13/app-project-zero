// Shared constants for the ice castle (see iceCastle/blueprint.ts for the
// build itself, iceCastle/crag.ts for the glacier it stands on). Like the
// dark castle, everything here is a fixed world coordinate independent of
// the world seed, so worldgen, the meshing worker and the runtime visuals
// agree on positions without sharing any state.
//
// Authored in its own local frame, the same convention as the dark castle:
// +x east, +z SOUTH (the front, facing the approach), +y up, local y = 0
// being the courtyard's floor layer. It is deliberately the same size as the
// dark castle (same footprint, same plateau, a plan box of the same extent).
import type { PlanBounds } from "../castle/site";

export const ICE_CASTLE_CENTER = { x: -309, z: -363 };

/** World Y of the courtyard floor's top block layer (a player stands one above it). */
export const ICE_FLOOR_Y = 100;
export const ICE_BASE_Y = ICE_FLOOR_Y + 1;

// The castle's own footprint in local coordinates (walls included).
export const ICE_MIN_X = -40;
export const ICE_MAX_X = 40;
export const ICE_MIN_Z = -36;
export const ICE_MAX_Z = 30;

// The dense plan box: a margin beyond the footprint so lamplight can spread
// past the walls, deep enough for the whole approach stair, and tall enough
// for the great spire (the dark castle's box plus a little more sky).
export const ICE_BOUNDS: PlanBounds = { minX: -58, maxX: 58, minZ: -50, maxZ: 82, minY: -36, maxY: 84 };

// The approach: a carved causeway of steps from the snowfield up to the outer gate.
export const ICE_RAMP_START_Z = 30; // local z of the first ramp block, just outside the outer wall
export const ICE_RAMP_HALF_WIDTH = 3;
export const ICE_RAMP_DROP_PER_BLOCK = 0.75;

/** Just outside the outer gate, on the ramp: where the "ice castle" button drops the player. */
export const ICE_CASTLE_GATE_SPAWN = { x: ICE_CASTLE_CENTER.x + 0.5, z: ICE_CASTLE_CENTER.z + ICE_RAMP_START_Z + 6 };
