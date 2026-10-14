// A castle's baked block-light: a 0-15 light level per cell of its plan
// box, flooded outward from every glowing block (lava, window glass, lamps,
// flames, ember veins — BlockDef.glow) one step per block through anything
// that isn't opaque, exactly like the genre's block light. The mesher reads
// the level of the air cell in front of each textured face (see
// rendering/greedyMesh.ts) and shades the face with warm firelight — so a
// wall lights up where a flame can actually see it and stays dark behind a
// corner, at zero runtime cost and with no per-light GPU work (dozens of
// real point lights would make every material in the scene slower).
//
// Each castle (castle/sites.ts) has its own light map, built lazily the
// first time a chunk near it is meshed.
import { BLOCKS } from "../../data/blocks";
import { CHUNK_SIZE } from "../../core/Chunk";
import { UNSET } from "./plan";
import { CASTLE_SITES } from "./sites";
import type { CastleSite } from "./site";

const OPAQUE = new Uint8Array(BLOCKS.length);
const GLOW_LEVEL = new Uint8Array(BLOCKS.length);
const GLOW_STRIDE = new Uint8Array(BLOCKS.length).fill(1);
for (const def of BLOCKS) {
  OPAQUE[def.id] = def.id !== 0 && def.solid && !def.transparentToRender ? 1 : 0;
  GLOW_LEVEL[def.id] = def.glow?.level ?? 0;
  GLOW_STRIDE[def.id] = def.glow?.stride ?? 1;
}

function buildLightMap(site: CastleSite): Uint8Array {
  const { minX, maxX, minY, maxY, minZ, maxZ } = site.bounds;
  const SX = maxX - minX + 1;
  const SY = maxY - minY + 1;
  const SZ = maxZ - minZ + 1;
  const cellIndex = (lx: number, ly: number, lz: number): number => (ly - minY) * SZ * SX + (lz - minZ) * SX + (lx - minX);
  const plan = site.getPlan();
  const light = new Uint8Array(SX * SY * SZ);

  // Whether a cell the plan never touched is solid rock: below the crag's
  // surface, or (outside the crag's reach) below a rough ground level.
  const groundCache = new Map<number, number>();
  const groundAt = (lx: number, lz: number): number => {
    const key = lx * 1000 + lz;
    let g = groundCache.get(key);
    if (g === undefined) {
      g = site.groundAt(lx, lz);
      groundCache.set(key, g);
    }
    return g;
  };
  const isOpaque = (lx: number, ly: number, lz: number, idx: number): boolean => {
    const b = plan.blocks[idx];
    if (b === UNSET) return site.floorY + ly <= groundAt(lx, lz);
    return OPAQUE[b] === 1;
  };

  const buckets: number[][] = Array.from({ length: 16 }, () => []);
  for (let ly = minY; ly <= maxY; ly++) {
    for (let lz = minZ; lz <= maxZ; lz++) {
      for (let lx = minX; lx <= maxX; lx++) {
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
      const lx = (idx % SX) + minX;
      const lz = (Math.floor(idx / SX) % SZ) + minZ;
      const ly = Math.floor(idx / strideY) + minY;
      const next = level - 1;
      const spread = (nx: number, ny: number, nz: number, nIdx: number): void => {
        if (nx < minX || nx > maxX || ny < minY || ny > maxY || nz < minZ || nz > maxZ) return;
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

const cachedLight = new Map<string, Uint8Array>();

function getLightMap(site: CastleSite): Uint8Array {
  let light = cachedLight.get(site.id);
  if (!light) {
    light = buildLightMap(site);
    cachedLight.set(site.id, light);
  }
  return light;
}

function siteLightAt(site: CastleSite, wx: number, wy: number, wz: number): number {
  const b = site.bounds;
  const lx = wx - site.center.x;
  const ly = wy - site.floorY;
  const lz = wz - site.center.z;
  if (lx < b.minX || lx > b.maxX || ly < b.minY || ly > b.maxY || lz < b.minZ || lz > b.maxZ) return 0;
  const SX = b.maxX - b.minX + 1;
  const SZ = b.maxZ - b.minZ + 1;
  return getLightMap(site)[(ly - b.minY) * SZ * SX + (lz - b.minZ) * SX + (lx - b.minX)];
}

/** Block-light level (0-15) at a world cell — 0 anywhere outside every castle's plan box. */
export function castleBlockLightAt(wx: number, wy: number, wz: number): number {
  for (const site of CASTLE_SITES) {
    const level = siteLightAt(site, wx, wy, wz);
    if (level > 0) return level;
  }
  return 0;
}

/** Whether the chunk whose min corner is (ox, oy, oz) overlaps the castle's plan box at all. */
function chunkTouches(site: CastleSite, ox: number, oy: number, oz: number): boolean {
  const b = site.bounds;
  return (
    ox + CHUNK_SIZE > b.minX + site.center.x &&
    ox <= b.maxX + site.center.x &&
    oz + CHUNK_SIZE > b.minZ + site.center.z &&
    oz <= b.maxZ + site.center.z &&
    oy + CHUNK_SIZE > b.minY + site.floorY &&
    oy <= b.maxY + site.floorY
  );
}

/** A block-light sampler in chunk-local coordinates for the chunk whose min corner is (ox, oy, oz), or undefined if the chunk can't be lit by any castle. Off the plan boxes the sampler returns 0. A chunk never needs a castle's light map (or plan) built unless it touches that castle's box. */
export function castleBlockLightSampler(ox: number, oy: number, oz: number): ((lx: number, ly: number, lz: number) => number) | undefined {
  const sites = CASTLE_SITES.filter((site) => chunkTouches(site, ox, oy, oz));
  if (sites.length === 0) return undefined;
  // The sample is the level with the lighting castle's tint in the bits above (see rendering/greedyMesh.ts).
  return (lx, ly, lz) => {
    for (const site of sites) {
      const level = siteLightAt(site, ox + lx, oy + ly, oz + lz);
      if (level > 0) return level | (site.glowTint << 4);
    }
    return 0;
  };
}
