// The castle's baked block-light: a 0-15 light level per cell of the plan
// box, flooded outward from every glowing block (lava, window glass, lamps,
// flames, ember veins — BlockDef.glow) one step per block through anything
// that isn't opaque, exactly like the genre's block light. The mesher reads
// the level of the air cell in front of each textured face (see
// rendering/greedyMesh.ts) and shades the face with warm firelight — so a
// wall lights up where a flame can actually see it and stays dark behind a
// corner, at zero runtime cost and with no per-light GPU work (dozens of
// real point lights would make every material in the scene slower).
import { BLOCKS } from "../../data/blocks";
import { CHUNK_SIZE } from "../../core/Chunk";
import { cragHeight, rampHeight } from "./crag";
import { getCastlePlan } from "./blueprint";
import { UNSET } from "./plan";
import { CASTLE_CENTER, CASTLE_FLOOR_Y, PLAN_MAX_X, PLAN_MAX_Y, PLAN_MAX_Z, PLAN_MIN_X, PLAN_MIN_Y, PLAN_MIN_Z } from "./layout";

const OPAQUE = new Uint8Array(BLOCKS.length);
const GLOW_LEVEL = new Uint8Array(BLOCKS.length);
const GLOW_STRIDE = new Uint8Array(BLOCKS.length).fill(1);
for (const def of BLOCKS) {
  OPAQUE[def.id] = def.id !== 0 && def.solid && !def.transparentToRender ? 1 : 0;
  GLOW_LEVEL[def.id] = def.glow?.level ?? 0;
  GLOW_STRIDE[def.id] = def.glow?.stride ?? 1;
}

let cachedLight: Uint8Array | null = null;

const SX = PLAN_MAX_X - PLAN_MIN_X + 1;
const SY = PLAN_MAX_Y - PLAN_MIN_Y + 1;
const SZ = PLAN_MAX_Z - PLAN_MIN_Z + 1;

function cellIndex(lx: number, ly: number, lz: number): number {
  return (ly - PLAN_MIN_Y) * SZ * SX + (lz - PLAN_MIN_Z) * SX + (lx - PLAN_MIN_X);
}

function buildLightMap(): Uint8Array {
  const plan = getCastlePlan();
  const light = new Uint8Array(SX * SY * SZ);

  // Whether a cell the plan never touched is solid rock: below the crag's
  // surface, or (outside the crag's reach) below a rough ground level.
  const groundCache = new Map<number, number>();
  const groundAt = (lx: number, lz: number): number => {
    const key = lx * 1000 + lz;
    let g = groundCache.get(key);
    if (g === undefined) {
      const crag = cragHeight(CASTLE_CENTER.x + lx, CASTLE_CENTER.z + lz);
      const ramp = rampHeight(CASTLE_CENTER.x + lx, CASTLE_CENTER.z + lz);
      // The approach ramp is cut through the crag (worldgen/castle/crag.ts applyCrag), so on its columns the ramp, not the crag, is the ground.
      g = ramp ?? (crag === -Infinity ? 68 : crag);
      groundCache.set(key, g);
    }
    return g;
  };
  const isOpaque = (lx: number, ly: number, lz: number, idx: number): boolean => {
    const b = plan.blocks[idx];
    if (b === UNSET) return CASTLE_FLOOR_Y + ly <= groundAt(lx, lz);
    return OPAQUE[b] === 1;
  };

  const buckets: number[][] = Array.from({ length: 16 }, () => []);
  for (let ly = PLAN_MIN_Y; ly <= PLAN_MAX_Y; ly++) {
    for (let lz = PLAN_MIN_Z; lz <= PLAN_MAX_Z; lz++) {
      for (let lx = PLAN_MIN_X; lx <= PLAN_MAX_X; lx++) {
        const idx = cellIndex(lx, ly, lz);
        const b = plan.blocks[idx];
        if (b === UNSET) continue;
        const level = GLOW_LEVEL[b];
        if (level === 0) continue;
        const stride = GLOW_STRIDE[b];
        if (stride > 1 && (((lx + ly * 3 + lz * 5) % stride) + stride) % stride !== 0) continue;
        // A buried emitter (a lava cell with stone all around) lights nothing.
        if (
          OPAQUE[b] === 1 &&
          isOpaque(lx + 1, ly, lz, idx + 1) &&
          isOpaque(lx - 1, ly, lz, idx - 1) &&
          isOpaque(lx, ly + 1, lz, idx + SZ * SX) &&
          isOpaque(lx, ly - 1, lz, idx - SZ * SX) &&
          isOpaque(lx, ly, lz + 1, idx + SX) &&
          isOpaque(lx, ly, lz - 1, idx - SX)
        ) {
          continue;
        }
        light[idx] = Math.max(light[idx], level);
        buckets[level].push(idx);
      }
    }
  }

  const strideY = SZ * SX;
  for (let level = 15; level >= 2; level--) {
    const bucket = buckets[level];
    for (let i = 0; i < bucket.length; i++) {
      const idx = bucket[i];
      if (light[idx] !== level) continue;
      const lx = (idx % SX) + PLAN_MIN_X;
      const lz = (Math.floor(idx / SX) % SZ) + PLAN_MIN_Z;
      const ly = Math.floor(idx / strideY) + PLAN_MIN_Y;
      const next = level - 1;
      const spread = (nx: number, ny: number, nz: number, nIdx: number): void => {
        if (nx < PLAN_MIN_X || nx > PLAN_MAX_X || ny < PLAN_MIN_Y || ny > PLAN_MAX_Y || nz < PLAN_MIN_Z || nz > PLAN_MAX_Z) return;
        if (light[nIdx] >= next || isOpaque(nx, ny, nz, nIdx)) return;
        light[nIdx] = next;
        buckets[next].push(nIdx);
      };
      spread(lx + 1, ly, lz, idx + 1);
      spread(lx - 1, ly, lz, idx - 1);
      spread(lx, ly + 1, lz, idx + strideY);
      spread(lx, ly - 1, lz, idx - strideY);
      spread(lx, ly, lz + 1, idx + SX);
      spread(lx, ly, lz - 1, idx - SX);
    }
  }
  return light;
}

function getLightMap(): Uint8Array {
  if (!cachedLight) cachedLight = buildLightMap();
  return cachedLight;
}

/** Block-light level (0-15) at a world cell — 0 anywhere outside the castle's plan box. */
export function castleBlockLightAt(wx: number, wy: number, wz: number): number {
  const lx = wx - CASTLE_CENTER.x;
  const ly = wy - CASTLE_FLOOR_Y;
  const lz = wz - CASTLE_CENTER.z;
  if (lx < PLAN_MIN_X || lx > PLAN_MAX_X || ly < PLAN_MIN_Y || ly > PLAN_MAX_Y || lz < PLAN_MIN_Z || lz > PLAN_MAX_Z) return 0;
  return getLightMap()[cellIndex(lx, ly, lz)];
}

// A chunk whose box doesn't touch the castle's plan box never needs the
// light map (or the plan) built at all.
const CHUNK_MIN_LX = PLAN_MIN_X + CASTLE_CENTER.x;
const CHUNK_MAX_LX = PLAN_MAX_X + CASTLE_CENTER.x;
const CHUNK_MIN_LZ = PLAN_MIN_Z + CASTLE_CENTER.z;
const CHUNK_MAX_LZ = PLAN_MAX_Z + CASTLE_CENTER.z;
const CHUNK_MIN_LY = PLAN_MIN_Y + CASTLE_FLOOR_Y;
const CHUNK_MAX_LY = PLAN_MAX_Y + CASTLE_FLOOR_Y;

/** A block-light sampler in chunk-local coordinates for the chunk whose min corner is (ox, oy, oz), or undefined if the chunk can't be lit by the castle. Off the plan box the sampler returns 0. */
export function castleBlockLightSampler(ox: number, oy: number, oz: number): ((lx: number, ly: number, lz: number) => number) | undefined {
  const touches =
    ox + CHUNK_SIZE > CHUNK_MIN_LX && ox <= CHUNK_MAX_LX && oz + CHUNK_SIZE > CHUNK_MIN_LZ && oz <= CHUNK_MAX_LZ && oy + CHUNK_SIZE > CHUNK_MIN_LY && oy <= CHUNK_MAX_LY;
  if (!touches) return undefined;
  return (lx, ly, lz) => castleBlockLightAt(ox + lx, oy + ly, oz + lz);
}

