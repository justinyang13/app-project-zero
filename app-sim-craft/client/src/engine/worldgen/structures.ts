// Fixed, deterministic landmark structures near spawn — a small,
// hard-coded slice of spec/02-world-generation.md §6 (the real spec
// wants chunk-hash-based probabilistic placement across the whole world;
// this is one bridge, one castle, and a handful of campfire camps at
// fixed world coordinates near origin, stamped the same way trees are:
// by checking, for each generated chunk, whether it overlaps the
// structure's world-space bounding box, so it stays correct across chunk
// load/unload and never needs to be treated as a "player edit" for
// persistence purposes).
import { CHUNK_SIZE, Chunk } from "../Chunk";
import { getBlockByKey } from "../../data/blocks";
import { sampleColumn, SEA_LEVEL } from "./terrain";
import { pointAtProgress, LOOP_PERIMETER, ROAD_WIDTH, FLAT_ROAD_Y } from "./roads";
import {
  CAVE_BOUNDS,
  CAVE_FLOOR_DIG,
  CAVE_MOUTH,
  CAVE_SPIKE_OFFSETS,
  GREEN_DRAGON_PERCH,
  CHAMBER_CENTER,
  MOUNTAIN_CENTER,
  SUMMIT_ROOST_RADIUS,
  isCaveVoxel,
} from "./mountain";

const WALL_ID = getBlockByKey("greystone").id;
const ROOF_ID = getBlockByKey("roof_tile").id;
const PLANK_ID = getBlockByKey("plank").id;
const LOG_ID = getBlockByKey("log").id;
const SANDSTONE_ID = getBlockByKey("sandstone").id;
const AIR_ID = 0;

export const BRIDGE_CENTER = { x: 14, z: 0 };
const BRIDGE_HALF_LENGTH = 8;
const BRIDGE_HALF_WIDTH = 1;

export const CASTLE_CENTER = { x: -34, z: -20 };
const CASTLE_HALF_SIZE = 8;
/** Just outside the castle's gate (the gap in its +z wall), where the minimap's "back to castle" button drops the player. */
export const CASTLE_GATE_SPAWN = { x: CASTLE_CENTER.x + 0.5, z: CASTLE_CENTER.z + CASTLE_HALF_SIZE + 4 };
const CASTLE_WALL_HEIGHT = 7;
const CASTLE_TOWER_EXTRA = 6;
const TOWER_HALF = 1;
const CASTLE_CORNERS: [number, number][] = [
  [CASTLE_CENTER.x - CASTLE_HALF_SIZE, CASTLE_CENTER.z - CASTLE_HALF_SIZE],
  [CASTLE_CENTER.x - CASTLE_HALF_SIZE, CASTLE_CENTER.z + CASTLE_HALF_SIZE],
  [CASTLE_CENTER.x + CASTLE_HALF_SIZE, CASTLE_CENTER.z - CASTLE_HALF_SIZE],
  [CASTLE_CENTER.x + CASTLE_HALF_SIZE, CASTLE_CENTER.z + CASTLE_HALF_SIZE],
];

// A central keep in the courtyard — taller than the curtain wall and its
// corner towers, so it reads as the castle's dominant structure instead
// of an empty walled yard.
const KEEP_HALF_SIZE = 3; // 7x7 footprint
const KEEP_HEIGHT = 14;
const CASTLE_MAX_EXTRA_ABOVE_BASE = Math.max(
  CASTLE_WALL_HEIGHT + CASTLE_TOWER_EXTRA + 4, // corner tower + its roof cap
  KEEP_HEIGHT + 6, // keep + its taller stepped roof and spire
);

// Several small camps scattered near spawn, each a fire pit ringed by
// seating (see stampCampfireSite) — deliberately kept off the road grid
// (worldgen/roads.ts bands are `mod(coord, 32) < 5`; every site below
// sits at a `32k + 16` coordinate on both axes, dead center of a road
// cell) so a camp never gets paved over.
export const CAMPFIRE_SITES: { x: number; z: number }[] = [
  { x: 4, z: 6 }, // original camp, right by spawn
  { x: 16, z: -48 },
  { x: -48, z: 16 },
  { x: 48, z: 48 },
  { x: -80, z: -16 },
];
export const CAMPFIRE_CENTER = CAMPFIRE_SITES[0];

// Street lamps: posts spaced around the loop road (worldgen/roads.ts),
// alternating shoulders, offset clear of the paved ROAD_WIDTH surface.
// The post itself is baked into terrain like every other structure here;
// the actual glow (bulb color + a night-only point light) is a runtime
// visual on top — see engine/StreetLamp.ts — the same split
// CampfireVisual uses for its flame/light, since a plain voxel block
// would just get Lambert-shaded dark at night like anything else.
export const LAMP_POST_HEIGHT = 4;
const LAMP_SPACING = 90; // road arc-length blocks between posts
const LAMP_OFFSET = ROAD_WIDTH / 2 + 2; // clears the shoulder

export const LAMP_SITES: { x: number; z: number }[] = Array.from(
  { length: Math.floor(LOOP_PERIMETER / LAMP_SPACING) },
  (_, i) => {
    const { x, z, yaw } = pointAtProgress(i * LAMP_SPACING);
    const side = i % 2 === 0 ? 1 : -1;
    return {
      x: Math.round(x + Math.cos(yaw) * LAMP_OFFSET * side),
      z: Math.round(z - Math.sin(yaw) * LAMP_OFFSET * side),
    };
  },
);

// A residential neighborhood: a fixed grid of lots south of the loop
// road (clear of it — the loop's own bounding box only reaches
// |z| ≈ 90+TOWER_HALF, see worldgen/roads.ts), each with a differently
// shaped, sized, and walled house plus a fenced yard. Every lot's
// dimensions are
// derived from its index with moduli chosen (4, 5, 5, 3, 2 — pairwise
// coprime enough that their combination doesn't repeat inside 30 lots)
// so all 30 houses come out visually distinct without needing a random
// number generator — this file's structures are meant to regenerate
// identically every time a chunk reloads, so anything Math.random()-based
// would make the neighborhood look different on every visit.
const RESIDENTIAL_COLS = 6;
const RESIDENTIAL_ROWS = 5;
const LOT_SIZE = 14;
const RESIDENTIAL_ORIGIN = { x: -(RESIDENTIAL_COLS * LOT_SIZE) / 2, z: 130 };
const HOUSE_WALL_MATERIALS = [WALL_ID, PLANK_ID, LOG_ID, SANDSTONE_ID];
const YARD_MARGIN = 2;
const FENCE_ID = LOG_ID;
const PATH_ID = PLANK_ID;

interface HouseLot {
  x: number; // footprint's min-X corner
  z: number; // footprint's min-Z corner
  width: number;
  depth: number;
  height: number;
  wallBlock: number;
  pitched: boolean;
}

export const HOUSE_LOTS: HouseLot[] = Array.from({ length: RESIDENTIAL_COLS * RESIDENTIAL_ROWS }, (_, i) => {
  const col = i % RESIDENTIAL_COLS;
  const row = Math.floor(i / RESIDENTIAL_COLS);
  const centerX = RESIDENTIAL_ORIGIN.x + col * LOT_SIZE + LOT_SIZE / 2;
  const centerZ = RESIDENTIAL_ORIGIN.z + row * LOT_SIZE + LOT_SIZE / 2;
  const width = 5 + (i % 5); // 5..9
  const depth = 5 + ((i * 2 + 3) % 5); // 5..9, different phase so it isn't just width again
  return {
    x: Math.round(centerX - width / 2),
    z: Math.round(centerZ - depth / 2),
    width,
    depth,
    height: 3 + (i % 3), // 3..5
    wallBlock: HOUSE_WALL_MATERIALS[i % HOUSE_WALL_MATERIALS.length],
    pitched: i % 2 === 0,
  };
});

/** Extra vertical blocks a lot's roof needs above its wall top — gable roofs rise with the footprint's longer side, flat roofs just cap it. */
function houseRoofRise(lot: HouseLot): number {
  return lot.pitched ? Math.ceil((lot.depth + 2) / 2) + 1 : 1;
}

const SEAT_ID = getBlockByKey("plank").id;
const SEAT_RADIUS = 2.2;
const SEAT_COUNT = 6;

// sampleColumn is a pure function, so these anchor heights are cheap to
// recompute, but every chunk generation calls in here — memoize per seed
// (which only ever changes once per session) rather than resampling.
let cachedSeed: number | null = null;
let cachedBridgeDeckY = 0;
let cachedCastleBaseY = 0;
let cachedCampfireYs: number[] = [];
let cachedLampYs: number[] = [];
let cachedHouseYs: number[] = [];
let cachedPeakY = 0;
let cachedCaveFloorY = 0;

function ensureCache(seed: number): void {
  if (cachedSeed === seed) return;
  cachedSeed = seed;
  const bridgeStart = sampleColumn(seed, BRIDGE_CENTER.x - BRIDGE_HALF_LENGTH, BRIDGE_CENTER.z).height;
  const bridgeEnd = sampleColumn(seed, BRIDGE_CENTER.x + BRIDGE_HALF_LENGTH, BRIDGE_CENTER.z).height;
  cachedBridgeDeckY = Math.max(bridgeStart, bridgeEnd, SEA_LEVEL) + 1;
  cachedCastleBaseY = sampleColumn(seed, CASTLE_CENTER.x, CASTLE_CENTER.z).height + 1;
  cachedCampfireYs = CAMPFIRE_SITES.map((site) => sampleColumn(seed, site.x, site.z).height + 1);
  // Anchored to the loop road's own constant elevation, not the natural
  // terrain height at the post's shoulder offset — the road itself is
  // flattened to FLAT_ROAD_Y regardless of terrain (roads.ts), so a
  // terrain-height anchor would float the post above (or bury it below)
  // the road wherever a hill was cut down or a lake causewayed over for
  // it. This is what "sits at road-level" actually means.
  cachedLampYs = LAMP_SITES.map(() => FLAT_ROAD_Y + 1);
  cachedHouseYs = HOUSE_LOTS.map(
    (lot) => sampleColumn(seed, lot.x + Math.floor(lot.width / 2), lot.z + Math.floor(lot.depth / 2)).height + 1,
  );
  cachedPeakY = sampleColumn(seed, MOUNTAIN_CENTER.x, MOUNTAIN_CENTER.z).height;
  cachedCaveFloorY = sampleColumn(seed, CAVE_MOUTH.x, CAVE_MOUTH.z).height - CAVE_FLOOR_DIG;
}

/** World-space anchor heights for these structures — exported so GameLoop can place each campfire's flame/light (or lamp's bulb/light) without waiting on chunk load. peakY/caveFloorY are the dragon mountain's summit height and its cave's floor height, used to place the giant Dragon and its cave torches. */
export function getStructureAnchors(
  seed: number,
): {
  bridgeDeckY: number;
  castleBaseY: number;
  campfireYs: number[];
  lampYs: number[];
  houseYs: number[];
  peakY: number;
  caveFloorY: number;
} {
  ensureCache(seed);
  return {
    bridgeDeckY: cachedBridgeDeckY,
    castleBaseY: cachedCastleBaseY,
    campfireYs: cachedCampfireYs,
    lampYs: cachedLampYs,
    houseYs: cachedHouseYs,
    peakY: cachedPeakY,
    caveFloorY: cachedCaveFloorY,
  };
}

function chunkOverlapsBox(cx: number, cz: number, minX: number, maxX: number, minZ: number, maxZ: number): boolean {
  const chunkMinX = cx * CHUNK_SIZE;
  const chunkMinZ = cz * CHUNK_SIZE;
  return chunkMinX + CHUNK_SIZE - 1 >= minX && chunkMinX <= maxX && chunkMinZ + CHUNK_SIZE - 1 >= minZ && chunkMinZ <= maxZ;
}

function setWorldVoxel(chunks: Chunk[], cx: number, cz: number, wx: number, wy: number, wz: number, blockId: number): void {
  const lx = wx - cx * CHUNK_SIZE;
  const lz = wz - cz * CHUNK_SIZE;
  if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) return;
  const cy = Math.floor(wy / CHUNK_SIZE);
  const chunk = chunks[cy];
  if (!chunk) return;
  const ly = wy - cy * CHUNK_SIZE;
  const idx = lx | (ly << 5) | (lz << 10);
  chunk.blocks[idx] = blockId;
  chunk.skyLight[idx] = 0;
}

/** The highest world Y any structure overlapping this chunk needs — used to size the chunk's vertical extent before any blocks are placed. */
export function structureMaxYFor(seed: number, cx: number, cz: number): number {
  ensureCache(seed);
  let maxY = 0;
  if (
    chunkOverlapsBox(
      cx,
      cz,
      BRIDGE_CENTER.x - BRIDGE_HALF_LENGTH,
      BRIDGE_CENTER.x + BRIDGE_HALF_LENGTH,
      BRIDGE_CENTER.z - BRIDGE_HALF_WIDTH,
      BRIDGE_CENTER.z + BRIDGE_HALF_WIDTH,
    )
  ) {
    maxY = Math.max(maxY, cachedBridgeDeckY + 3);
  }
  if (
    chunkOverlapsBox(
      cx,
      cz,
      CASTLE_CENTER.x - CASTLE_HALF_SIZE - TOWER_HALF,
      CASTLE_CENTER.x + CASTLE_HALF_SIZE + TOWER_HALF,
      CASTLE_CENTER.z - CASTLE_HALF_SIZE - TOWER_HALF,
      CASTLE_CENTER.z + CASTLE_HALF_SIZE + TOWER_HALF,
    )
  ) {
    maxY = Math.max(maxY, cachedCastleBaseY + CASTLE_MAX_EXTRA_ABOVE_BASE);
  }
  for (let i = 0; i < HOUSE_LOTS.length; i++) {
    const lot = HOUSE_LOTS[i];
    const margin = YARD_MARGIN + 1;
    if (
      !chunkOverlapsBox(
        cx,
        cz,
        lot.x - margin,
        lot.x + lot.width - 1 + margin,
        lot.z - margin,
        lot.z + lot.depth - 1 + margin,
      )
    ) {
      continue;
    }
    maxY = Math.max(maxY, cachedHouseYs[i] + lot.height + houseRoofRise(lot) + 1);
  }
  return maxY;
}

function stampBridge(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  const minX = BRIDGE_CENTER.x - BRIDGE_HALF_LENGTH;
  const maxX = BRIDGE_CENTER.x + BRIDGE_HALF_LENGTH;
  const minZ = BRIDGE_CENTER.z - BRIDGE_HALF_WIDTH;
  const maxZ = BRIDGE_CENTER.z + BRIDGE_HALF_WIDTH;
  if (!chunkOverlapsBox(cx, cz, minX, maxX, minZ, maxZ)) return;
  const { bridgeDeckY } = getStructureAnchors(seed);

  for (let wx = minX; wx <= maxX; wx++) {
    for (let wz = minZ; wz <= maxZ; wz++) {
      setWorldVoxel(chunks, cx, cz, wx, bridgeDeckY, wz, PLANK_ID);
    }
    if ((wx - minX) % 4 === 0) {
      setWorldVoxel(chunks, cx, cz, wx, bridgeDeckY + 1, minZ, LOG_ID);
      setWorldVoxel(chunks, cx, cz, wx, bridgeDeckY + 1, maxZ, LOG_ID);
    }
  }
}

function stampCastle(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  const minX = CASTLE_CENTER.x - CASTLE_HALF_SIZE;
  const maxX = CASTLE_CENTER.x + CASTLE_HALF_SIZE;
  const minZ = CASTLE_CENTER.z - CASTLE_HALF_SIZE;
  const maxZ = CASTLE_CENTER.z + CASTLE_HALF_SIZE;
  if (!chunkOverlapsBox(cx, cz, minX - TOWER_HALF, maxX + TOWER_HALF, minZ - TOWER_HALF, maxZ + TOWER_HALF)) return;
  const { castleBaseY } = getStructureAnchors(seed);

  const gateMinX = CASTLE_CENTER.x - 1;
  const gateMaxX = CASTLE_CENTER.x + 1;
  const towerTop = castleBaseY + CASTLE_WALL_HEIGHT + CASTLE_TOWER_EXTRA;

  for (let wx = minX - TOWER_HALF; wx <= maxX + TOWER_HALF; wx++) {
    for (let wz = minZ - TOWER_HALF; wz <= maxZ + TOWER_HALF; wz++) {
      const inTower = CASTLE_CORNERS.some(([tx, tz]) => Math.abs(wx - tx) <= TOWER_HALF && Math.abs(wz - tz) <= TOWER_HALF);
      const insideFootprint = wx >= minX && wx <= maxX && wz >= minZ && wz <= maxZ;
      const onWallLine = insideFootprint && (wx === minX || wx === maxX || wz === minZ || wz === maxZ);
      const isGate = wz === maxZ && wx >= gateMinX && wx <= gateMaxX;

      if (inTower) {
        for (let wy = castleBaseY - 3; wy <= towerTop; wy++) setWorldVoxel(chunks, cx, cz, wx, wy, wz, WALL_ID);
      } else if (onWallLine && !isGate) {
        for (let wy = castleBaseY - 3; wy <= castleBaseY + CASTLE_WALL_HEIGHT; wy++) {
          setWorldVoxel(chunks, cx, cz, wx, wy, wz, WALL_ID);
        }
        // Crenellations: alternating merlons one block above the wall
        // top, so the curtain wall reads as a proper parapet instead of
        // a flat-topped box.
        if ((wx + wz) % 2 === 0) {
          setWorldVoxel(chunks, cx, cz, wx, castleBaseY + CASTLE_WALL_HEIGHT + 1, wz, WALL_ID);
        }
      } else if (onWallLine && isGate) {
        for (let wy = castleBaseY; wy <= castleBaseY + CASTLE_WALL_HEIGHT; wy++) {
          setWorldVoxel(chunks, cx, cz, wx, wy, wz, AIR_ID);
        }
      }
    }
  }

  for (const [tx, tz] of CASTLE_CORNERS) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) setWorldVoxel(chunks, cx, cz, tx + dx, towerTop + 1, tz + dz, ROOF_ID);
    }
    setWorldVoxel(chunks, cx, cz, tx, towerTop + 2, tz, ROOF_ID);
    setWorldVoxel(chunks, cx, cz, tx, towerTop + 3, tz, LOG_ID);
  }
}

function stampSquareRoofTier(
  chunks: Chunk[],
  cx: number,
  cz: number,
  centerX: number,
  centerZ: number,
  wy: number,
  half: number,
): void {
  for (let dx = -half; dx <= half; dx++) {
    for (let dz = -half; dz <= half; dz++) {
      setWorldVoxel(chunks, cx, cz, centerX + dx, wy, centerZ + dz, ROOF_ID);
    }
  }
}

/** A central keep in the courtyard: a hollow tower with a door, four windows, and a tall stepped-pyramid roof with a spire. */
function stampKeep(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  const { x: kx, z: kz } = CASTLE_CENTER;
  const minX = kx - KEEP_HALF_SIZE;
  const maxX = kx + KEEP_HALF_SIZE;
  const minZ = kz - KEEP_HALF_SIZE;
  const maxZ = kz + KEEP_HALF_SIZE;
  if (!chunkOverlapsBox(cx, cz, minX, maxX, minZ, maxZ)) return;
  const { castleBaseY } = getStructureAnchors(seed);
  const keepTop = castleBaseY + KEEP_HEIGHT;

  const doorMinX = kx - 1;
  const doorMaxX = kx + 1;

  for (let wx = minX; wx <= maxX; wx++) {
    for (let wz = minZ; wz <= maxZ; wz++) {
      const onWallLine = wx === minX || wx === maxX || wz === minZ || wz === maxZ;
      if (!onWallLine) {
        // Interior floor, with the space above it cleared to air —
        // without this, whatever the natural terrain under the keep
        // happens to be (this seed's spot dips just below sea level, per
        // SEA_LEVEL in terrain.ts) would still fill the interior right
        // up to sea level, showing as a pool of water inside a
        // supposedly-finished building.
        setWorldVoxel(chunks, cx, cz, wx, castleBaseY - 1, wz, PLANK_ID);
        for (let wy = castleBaseY; wy < keepTop; wy++) setWorldVoxel(chunks, cx, cz, wx, wy, wz, AIR_ID);
        continue;
      }
      const isDoor = wz === maxZ && wx >= doorMinX && wx <= doorMaxX;
      const isWindow =
        !isDoor && ((wx === kx && (wz === minZ || wz === maxZ)) || (wz === kz && (wx === minX || wx === maxX)));

      for (let wy = castleBaseY - 3; wy <= keepTop; wy++) {
        if (isDoor && wy <= castleBaseY + 2) setWorldVoxel(chunks, cx, cz, wx, wy, wz, AIR_ID);
        else if (isWindow && wy === castleBaseY + 4) setWorldVoxel(chunks, cx, cz, wx, wy, wz, AIR_ID);
        else setWorldVoxel(chunks, cx, cz, wx, wy, wz, WALL_ID);
      }
    }
  }

  // Stepped pyramid roof + spire — taller and more tiered than the
  // corner towers' cap, so the keep reads as the tallest, most important
  // part of the castle.
  stampSquareRoofTier(chunks, cx, cz, kx, kz, keepTop + 1, 2);
  stampSquareRoofTier(chunks, cx, cz, kx, kz, keepTop + 2, 1);
  setWorldVoxel(chunks, cx, cz, kx, keepTop + 3, kz, ROOF_ID);
  setWorldVoxel(chunks, cx, cz, kx, keepTop + 4, kz, LOG_ID);
  setWorldVoxel(chunks, cx, cz, kx, keepTop + 5, kz, LOG_ID);
}

/** Paves the courtyard between the curtain wall and the keep, instead of leaving bare terrain inside the walls. */
function stampCourtyardFloor(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  const minX = CASTLE_CENTER.x - CASTLE_HALF_SIZE + 1;
  const maxX = CASTLE_CENTER.x + CASTLE_HALF_SIZE - 1;
  const minZ = CASTLE_CENTER.z - CASTLE_HALF_SIZE + 1;
  const maxZ = CASTLE_CENTER.z + CASTLE_HALF_SIZE - 1;
  if (!chunkOverlapsBox(cx, cz, minX, maxX, minZ, maxZ)) return;
  const { castleBaseY } = getStructureAnchors(seed);
  const floorY = castleBaseY - 1;

  const keepMinX = CASTLE_CENTER.x - KEEP_HALF_SIZE;
  const keepMaxX = CASTLE_CENTER.x + KEEP_HALF_SIZE;
  const keepMinZ = CASTLE_CENTER.z - KEEP_HALF_SIZE;
  const keepMaxZ = CASTLE_CENTER.z + KEEP_HALF_SIZE;

  for (let wx = minX; wx <= maxX; wx++) {
    for (let wz = minZ; wz <= maxZ; wz++) {
      if (wx >= keepMinX && wx <= keepMaxX && wz >= keepMinZ && wz <= keepMaxZ) continue;
      setWorldVoxel(chunks, cx, cz, wx, floorY, wz, PLANK_ID);
    }
  }
}

/** One camp: a crossed-log fire pit plus a ring of plank seats around it, each seat resting at its own local ground height since terrain isn't flattened for these camps. */
function stampCampfireSite(
  seed: number,
  cx: number,
  cz: number,
  chunks: Chunk[],
  site: { x: number; z: number },
  fireY: number,
): void {
  const { x, z } = site;
  setWorldVoxel(chunks, cx, cz, x - 1, fireY, z, LOG_ID);
  setWorldVoxel(chunks, cx, cz, x + 1, fireY, z, LOG_ID);
  setWorldVoxel(chunks, cx, cz, x, fireY, z - 1, LOG_ID);
  setWorldVoxel(chunks, cx, cz, x, fireY, z + 1, LOG_ID);

  for (let i = 0; i < SEAT_COUNT; i++) {
    const angle = (i / SEAT_COUNT) * Math.PI * 2;
    const sx = Math.round(x + Math.cos(angle) * SEAT_RADIUS);
    const sz = Math.round(z + Math.sin(angle) * SEAT_RADIUS);
    const seatY = sampleColumn(seed, sx, sz).height + 1;
    setWorldVoxel(chunks, cx, cz, sx, seatY, sz, SEAT_ID);
  }
}

function stampCampfires(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  const { campfireYs } = getStructureAnchors(seed);
  const margin = Math.ceil(SEAT_RADIUS) + 1;
  for (let i = 0; i < CAMPFIRE_SITES.length; i++) {
    const site = CAMPFIRE_SITES[i];
    if (!chunkOverlapsBox(cx, cz, site.x - margin, site.x + margin, site.z - margin, site.z + margin)) continue;
    stampCampfireSite(seed, cx, cz, chunks, site, campfireYs[i]);
  }
}

function stampFlatRoof(cx: number, cz: number, chunks: Chunk[], minX: number, maxX: number, minZ: number, maxZ: number, wy: number): void {
  for (let wx = minX - 1; wx <= maxX + 1; wx++) {
    for (let wz = minZ - 1; wz <= maxZ + 1; wz++) setWorldVoxel(chunks, cx, cz, wx, wy, wz, ROOF_ID);
  }
}

/** A gable roof: two tiers stepping in from the north/south edges each level up until they meet at a ridge running along X. */
function stampGableRoof(cx: number, cz: number, chunks: Chunk[], minX: number, maxX: number, minZ: number, maxZ: number, wy: number): void {
  let curMinZ = minZ - 1;
  let curMaxZ = maxZ + 1;
  let y = wy;
  while (curMinZ < curMaxZ) {
    for (let wx = minX - 1; wx <= maxX + 1; wx++) {
      setWorldVoxel(chunks, cx, cz, wx, y, curMinZ, ROOF_ID);
      setWorldVoxel(chunks, cx, cz, wx, y, curMaxZ, ROOF_ID);
    }
    curMinZ++;
    curMaxZ--;
    y++;
  }
  if (curMinZ === curMaxZ) {
    for (let wx = minX - 1; wx <= maxX + 1; wx++) setWorldVoxel(chunks, cx, cz, wx, y, curMinZ, ROOF_ID);
  }
}

/** One house: a hollow box with a front door, three windows, a plank floor, and a flat or gable roof depending on the lot. */
function stampHouse(cx: number, cz: number, chunks: Chunk[], lot: HouseLot, baseY: number): void {
  const minX = lot.x;
  const maxX = lot.x + lot.width - 1;
  const minZ = lot.z;
  const maxZ = lot.z + lot.depth - 1;
  const topWallY = baseY + lot.height - 1;
  const midX = lot.x + Math.floor(lot.width / 2);
  const midZ = lot.z + Math.floor(lot.depth / 2);
  const windowY = baseY + 1;

  for (let wx = minX; wx <= maxX; wx++) {
    for (let wz = minZ; wz <= maxZ; wz++) {
      setWorldVoxel(chunks, cx, cz, wx, baseY - 1, wz, PLANK_ID);
      const onWall = wx === minX || wx === maxX || wz === minZ || wz === maxZ;
      if (!onWall) {
        for (let wy = baseY; wy <= topWallY; wy++) setWorldVoxel(chunks, cx, cz, wx, wy, wz, AIR_ID);
        continue;
      }
      const isDoor = wz === minZ && wx === midX;
      const isWindow =
        !isDoor &&
        windowY <= topWallY &&
        ((wz === maxZ && wx === midX) || (wx === minX && wz === midZ) || (wx === maxX && wz === midZ));
      for (let wy = baseY; wy <= topWallY; wy++) {
        if (isDoor && wy <= baseY + 1) setWorldVoxel(chunks, cx, cz, wx, wy, wz, AIR_ID);
        else if (isWindow && wy === windowY) setWorldVoxel(chunks, cx, cz, wx, wy, wz, AIR_ID);
        else setWorldVoxel(chunks, cx, cz, wx, wy, wz, lot.wallBlock);
      }
    }
  }

  if (lot.pitched) stampGableRoof(cx, cz, chunks, minX, maxX, minZ, maxZ, topWallY + 1);
  else stampFlatRoof(cx, cz, chunks, minX, maxX, minZ, maxZ, topWallY + 1);
}

/** A picket-style fence (posts every other block) around the yard, with a gate gap facing the house's front door, plus a short path from the gate to the door. */
function stampYard(cx: number, cz: number, chunks: Chunk[], lot: HouseLot, baseY: number): void {
  const minX = lot.x - YARD_MARGIN;
  const maxX = lot.x + lot.width - 1 + YARD_MARGIN;
  const minZ = lot.z - YARD_MARGIN;
  const maxZ = lot.z + lot.depth - 1 + YARD_MARGIN;
  const gateX = lot.x + Math.floor(lot.width / 2);

  for (let wx = minX; wx <= maxX; wx++) {
    if ((wx - minX) % 2 !== 0) continue;
    if (Math.abs(wx - gateX) > 1) setWorldVoxel(chunks, cx, cz, wx, baseY, minZ, FENCE_ID);
    setWorldVoxel(chunks, cx, cz, wx, baseY, maxZ, FENCE_ID);
  }
  for (let wz = minZ; wz <= maxZ; wz++) {
    if ((wz - minZ) % 2 !== 0) continue;
    setWorldVoxel(chunks, cx, cz, minX, baseY, wz, FENCE_ID);
    setWorldVoxel(chunks, cx, cz, maxX, baseY, wz, FENCE_ID);
  }
  for (let wz = minZ; wz < lot.z; wz++) setWorldVoxel(chunks, cx, cz, gateX, baseY - 1, wz, PATH_ID);
}

function stampResidentialArea(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  const { houseYs } = getStructureAnchors(seed);
  const margin = YARD_MARGIN + 1;
  for (let i = 0; i < HOUSE_LOTS.length; i++) {
    const lot = HOUSE_LOTS[i];
    if (
      !chunkOverlapsBox(
        cx,
        cz,
        lot.x - margin,
        lot.x + lot.width - 1 + margin,
        lot.z - margin,
        lot.z + lot.depth - 1 + margin,
      )
    ) {
      continue;
    }
    stampYard(cx, cz, chunks, lot, houseYs[i]);
    stampHouse(cx, cz, chunks, lot, houseYs[i]);
  }
}

function stampStreetLamps(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  const { lampYs } = getStructureAnchors(seed);
  for (let i = 0; i < LAMP_SITES.length; i++) {
    const { x, z } = LAMP_SITES[i];
    if (!chunkOverlapsBox(cx, cz, x, x, z, z)) continue;
    const baseY = lampYs[i];
    for (let dy = 0; dy < LAMP_POST_HEIGHT; dy++) setWorldVoxel(chunks, cx, cz, x, baseY + dy, z, LOG_ID);
    setWorldVoxel(chunks, cx, cz, x, baseY + LAMP_POST_HEIGHT, z, WALL_ID);
  }
}

const CAVE_DAIS_RADIUS = 12;
const CAVE_DAIS_HEIGHT = 3;

/** The dragon's perch: a low, rounded sandstone mound at the chamber's center — raised just enough to read as a deliberate perch rather than bare cave floor. */
function stampCaveDais(
  cx: number,
  cz: number,
  chunks: Chunk[],
  floorY: number,
  center: { x: number; z: number } = CHAMBER_CENTER,
): void {
  for (let dx = -CAVE_DAIS_RADIUS; dx <= CAVE_DAIS_RADIUS; dx++) {
    for (let dz = -CAVE_DAIS_RADIUS; dz <= CAVE_DAIS_RADIUS; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > CAVE_DAIS_RADIUS) continue;
      const mound = Math.round((1 - d / CAVE_DAIS_RADIUS) * CAVE_DAIS_HEIGHT);
      for (let dy = 0; dy <= mound; dy++) {
        setWorldVoxel(chunks, cx, cz, center.x + dx, floorY + dy, center.z + dz, SANDSTONE_ID);
      }
    }
  }
}

/** A handful of stubby rock stalagmites scattered around the chamber floor for atmosphere. */
function stampCaveSpikes(cx: number, cz: number, chunks: Chunk[], floorY: number): void {
  for (const spike of CAVE_SPIKE_OFFSETS) {
    const bx = CHAMBER_CENTER.x + spike.x;
    const bz = CHAMBER_CENTER.z + spike.z;
    for (let dy = 0; dy < spike.height; dy++) {
      setWorldVoxel(chunks, cx, cz, bx, floorY + dy, bz, WALL_ID);
    }
  }
}

/** Carves the dragon's cave (a tunnel from the mountain's south flank into a large domed chamber — see worldgen/mountain.ts) out of the solid mountain, then furnishes the chamber with a perch dais and a few stalagmites. Digging only ever removes blocks, so unlike every other stamp here it needs no structureMaxYFor entry — the mountain's own height (folded into terrain.ts's sampleColumn) already reserves enough vertical chunks to contain it. */
function stampDragonCave(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  if (!chunkOverlapsBox(cx, cz, CAVE_BOUNDS.minX, CAVE_BOUNDS.maxX, CAVE_BOUNDS.minZ, CAVE_BOUNDS.maxZ)) return;
  const { caveFloorY } = getStructureAnchors(seed);

  const minX = Math.max(CAVE_BOUNDS.minX, cx * CHUNK_SIZE);
  const maxX = Math.min(CAVE_BOUNDS.maxX, cx * CHUNK_SIZE + CHUNK_SIZE - 1);
  const minZ = Math.max(CAVE_BOUNDS.minZ, cz * CHUNK_SIZE);
  const maxZ = Math.min(CAVE_BOUNDS.maxZ, cz * CHUNK_SIZE + CHUNK_SIZE - 1);
  const maxY = caveFloorY + 40;

  for (let wx = minX; wx <= maxX; wx++) {
    for (let wz = minZ; wz <= maxZ; wz++) {
      for (let wy = caveFloorY + 1; wy <= maxY; wy++) {
        if (isCaveVoxel(wx, wy, wz, caveFloorY)) setWorldVoxel(chunks, cx, cz, wx, wy, wz, AIR_ID);
      }
    }
  }

  stampCaveDais(cx, cz, chunks, caveFloorY);
  stampCaveDais(cx, cz, chunks, caveFloorY, GREEN_DRAGON_PERCH);
  stampCaveSpikes(cx, cz, chunks, caveFloorY);
}

const SUMMIT_CLEARANCE_RADIUS = SUMMIT_ROOST_RADIUS + 6;
const SUMMIT_CLEARANCE_HEIGHT = 46; // room for a folded-winged, long-necked dragon plus its fire

/** Flattens the mountain's very top into a round stone roost for the crimson dragon and clears the air above it, so the jagged ridge noise can't poke through the perched dragon. Only ever fills below/at the summit height and removes above it, so like the cave it needs no structureMaxYFor entry. */
function stampSummitRoost(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  const r = SUMMIT_CLEARANCE_RADIUS;
  if (!chunkOverlapsBox(cx, cz, MOUNTAIN_CENTER.x - r, MOUNTAIN_CENTER.x + r, MOUNTAIN_CENTER.z - r, MOUNTAIN_CENTER.z + r)) return;
  const { peakY } = getStructureAnchors(seed);
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > r) continue;
      const wx = MOUNTAIN_CENTER.x + dx;
      const wz = MOUNTAIN_CENTER.z + dz;
      if (d <= SUMMIT_ROOST_RADIUS) {
        for (let wy = peakY - 8; wy < peakY; wy++) setWorldVoxel(chunks, cx, cz, wx, wy, wz, WALL_ID);
        setWorldVoxel(chunks, cx, cz, wx, peakY, wz, SANDSTONE_ID);
      }
      for (let wy = peakY + 1; wy <= peakY + SUMMIT_CLEARANCE_HEIGHT; wy++) setWorldVoxel(chunks, cx, cz, wx, wy, wz, AIR_ID);
    }
  }
}

/** Stamps every fixed structure that overlaps this chunk column. Mutates `chunks` in place. */
export function stampStructures(seed: number, cx: number, cz: number, chunks: Chunk[]): void {
  stampBridge(seed, cx, cz, chunks);
  stampCastle(seed, cx, cz, chunks);
  stampKeep(seed, cx, cz, chunks);
  stampCourtyardFloor(seed, cx, cz, chunks);
  stampCampfires(seed, cx, cz, chunks);
  stampStreetLamps(seed, cx, cz, chunks);
  stampResidentialArea(seed, cx, cz, chunks);
  stampDragonCave(seed, cx, cz, chunks);
  stampSummitRoost(seed, cx, cz, chunks);
}
