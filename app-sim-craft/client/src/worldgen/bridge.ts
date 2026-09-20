// How the loop road is built where it meets the terrain: a causeway over
// land (cut through hills, filled across dips), a low plank bridge over a
// pond, and — across the deep lake — a tall arched viaduct in the spirit
// of San Diego's Coronado Bridge: one continuous steel-blue box girder
// that climbs from the shore in a long, gentle arch, deeper over each
// pier (the "haunch"), carried by pairs of slender concrete piers topped
// with a crossbeam, with a pale concrete sidewalk and parapet along both
// edges. Everything here is a pure function of a column's (x, z, ground
// height), so terrain.ts can build it column by column.
import { getBlockByKey } from "../data/blocks";
import { ROAD_WIDTH, sampleRoad } from "./roads";
import { SEA_LEVEL } from "./terrain";

const ASPHALT_ID = getBlockByKey("asphalt").id;
const STEEL_ID = getBlockByKey("bridge_steel").id;
const CONCRETE_ID = getBlockByKey("bridge_concrete").id;

const ROAD_HALF_WIDTH = ROAD_WIDTH / 2;
const PIER_SPACING = 28; // blocks along the bridge between piers
const PIER_HALF_LENGTH = 1.5; // piers are 3 blocks long along the road
const PIER_LEG_INNER = 1.6; // two legs per pier, each ~3.3 wide, either side of the centerline
const PIER_LEG_OUTER = 4.9;
const HAUNCH_HALF_LENGTH = 7; // the girder is one layer deeper this close to a pier
const PARAPET_FROM = 5.6; // |lateral| beyond this carries a parapet
/** The deck must sit at least this far above the ground (or water) for the grand viaduct — anything lower is just a causeway. */
const VIADUCT_MIN_CLEARANCE = 3;

export type RoadKind = "causeway" | "plank" | "grand";

export interface RoadColumn {
  kind: RoadKind;
  /** World Y of the road surface here. */
  deckY: number;
  /** Within the paved roadway's width (as opposed to the shoulders). */
  onRoad: boolean;
  /** |sideways offset| from the centerline. */
  lateral: number;
  /** Distance from the nearest pier's center along the road (grand only). */
  pierOffset: number;
}

/** How the road affects this column, given the natural ground height there — or null if it doesn't (off the road, or a shoulder over dry land). */
export function classifyRoadColumn(worldX: number, worldZ: number, height: number): RoadColumn | null {
  const road = sampleRoad(worldX, worldZ);
  if (!road) return null;
  const groundTop = Math.max(height, SEA_LEVEL);
  const onRoad = road.dist <= ROAD_HALF_WIDTH;
  if (road.onBridge && road.deckY - groundTop >= VIADUCT_MIN_CLEARANCE) {
    const phase = ((road.bridgeS % PIER_SPACING) + PIER_SPACING) % PIER_SPACING;
    return {
      kind: "grand",
      deckY: road.deckY,
      onRoad,
      lateral: Math.abs(road.lateral),
      pierOffset: Math.min(phase, PIER_SPACING - phase),
    };
  }
  if (height < SEA_LEVEL) return { kind: "plank", deckY: road.deckY, onRoad, lateral: Math.abs(road.lateral), pierOffset: 0 };
  if (onRoad) return { kind: "causeway", deckY: road.deckY, onRoad, lateral: Math.abs(road.lateral), pierOffset: 0 };
  return null;
}

/** The highest world Y this road column holds (parapet included) — used to size the chunk column. */
export function roadColumnTop(column: RoadColumn): number {
  return column.kind === "grand" ? column.deckY + 1 : column.deckY;
}

/**
 * The viaduct block at world Y in a grand column, or 0 where the bridge has
 * nothing there (open air above the deck, or the space under it — the
 * caller falls back to terrain, water or air).
 */
export function grandBridgeBlock(column: RoadColumn, worldY: number): number {
  const down = column.deckY - worldY; // 0 = the road surface
  const a = column.lateral;
  if (down < 0) return down === -1 && a > PARAPET_FROM ? CONCRETE_ID : 0;
  if (down === 0) return a <= ROAD_HALF_WIDTH ? ASPHALT_ID : CONCRETE_ID;
  if (down === 1) return STEEL_ID;
  if (down === 2) return a <= 5.6 ? STEEL_ID : 0;
  const atPier = column.pierOffset <= PIER_HALF_LENGTH;
  if (down === 3) {
    if (atPier) return a <= 5.1 ? CONCRETE_ID : 0; // the pier's crossbeam
    return column.pierOffset <= HAUNCH_HALF_LENGTH && a <= 4.4 ? STEEL_ID : 0;
  }
  return atPier && a >= PIER_LEG_INNER && a <= PIER_LEG_OUTER ? CONCRETE_ID : 0;
}
