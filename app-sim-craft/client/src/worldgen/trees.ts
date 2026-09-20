// Deterministic tree placement: forests and groves scattered over the
// meadows and snowfields. Candidate trees live on a jittered grid in world
// space (one slot per CELL x CELL cell), each with a hash-decided
// probability, species and size — so any chunk can work out exactly which
// trees reach into it, *including ones rooted in the neighboring column*,
// and draws just its own share (see treeShapes.ts for the trees). That is
// what lets crowns 20 blocks wide and trunks 20 blocks tall cross chunk
// edges seamlessly.
//
// The land is a patchwork: a slow "forest" noise decides open meadow vs.
// woodland, and a second slow noise picks each grove's signature species
// (cherry blossom, birch, oak, maple, willow), so you walk from a pink
// grove into an orange birch wood into a red maple stand, with a scatter
// of other species mixed through each. Cold ground grows snow-laden
// conifers instead.
import { CHUNK_SIZE, Chunk, localIndex } from "../core/Chunk";
import { fbm2D, seededNoise2D } from "./noise";
import { SEA_LEVEL, sampleColumn } from "./terrain";
import { isRoadCorridorColumn } from "./roads";
import { drawTree, THICK_TRUNK, TREE_HEIGHT, TREE_REACH, type Palette, type TreeKind, type TreeSpec } from "./treeShapes";

const CELL = 6;
const MAX_REACH = Math.max(...Object.values(TREE_REACH));
const SALT_FOREST = 0x7ee501;
const SALT_SPECIES = 0x7ee502;

function hash01(seed: number, x: number, z: number, salt: number): number {
  let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(salt, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Picks a warm-country species from the local grove noise and a roll. */
function meadowSpecies(grove: number, roll: number, lowGround: boolean): { kind: TreeKind; palette: Palette } {
  let dominant: TreeKind;
  let palette: Palette = "green";
  if (grove > 0.4) dominant = "cherry";
  else if (grove > 0.14) {
    dominant = "birch";
    palette = "autumn";
  } else if (grove > -0.14) dominant = roll < 0.35 ? "grandOak" : "oak";
  else if (grove > -0.4) dominant = "maple";
  else dominant = lowGround ? "willow" : "grandOak";
  if (dominant === "willow" && !lowGround) dominant = "grandOak";

  // Most of a grove is its signature tree; the rest is a mix so it never reads as a monoculture.
  const mix = (roll * 7.31) % 1;
  if (roll < 0.66) return { kind: dominant, palette };
  if (mix < 0.22) return { kind: "oak", palette: "green" };
  if (mix < 0.4) return { kind: "birch", palette: mix < 0.3 ? "autumn" : "gold" };
  if (mix < 0.52) return { kind: "grandOak", palette: "green" };
  if (mix < 0.66) return { kind: "shrub", palette: "green" };
  if (mix < 0.76) return { kind: "cherry", palette: "green" };
  if (mix < 0.88) return { kind: "maple", palette: "green" };
  return { kind: "pine", palette: "green" };
}

function snowSpecies(roll: number): TreeKind {
  if (roll < 0.58) return "pine";
  if (roll < 0.78) return "spruce";
  if (roll < 0.9) return "frostBirch";
  return "snowShrub";
}

/** Every tree that reaches into chunk column (cx, cz), in a stable order. */
export function planTrees(seed: number, cx: number, cz: number): TreeSpec[] {
  const forestNoise = seededNoise2D(seed, SALT_FOREST);
  const speciesNoise = seededNoise2D(seed, SALT_SPECIES);
  const x0 = cx * CHUNK_SIZE - MAX_REACH;
  const x1 = cx * CHUNK_SIZE + CHUNK_SIZE - 1 + MAX_REACH;
  const z0 = cz * CHUNK_SIZE - MAX_REACH;
  const z1 = cz * CHUNK_SIZE + CHUNK_SIZE - 1 + MAX_REACH;
  const trees: TreeSpec[] = [];

  for (let gx = Math.floor(x0 / CELL); gx <= Math.floor(x1 / CELL); gx++) {
    for (let gz = Math.floor(z0 / CELL); gz <= Math.floor(z1 / CELL); gz++) {
      const x = gx * CELL + Math.floor(hash01(seed, gx, gz, 1) * CELL);
      const z = gz * CELL + Math.floor(hash01(seed, gx, gz, 2) * CELL);

      // Woodland vs. open meadow, from slow noise.
      const forest = fbm2D(forestNoise, x, z, 2, 1 / 80);
      const density = 0.08 + 0.58 * smoothstep(-0.05, 0.4, forest);
      if (hash01(seed, gx, gz, 3) > density) continue;

      const sample = sampleColumn(seed, x, z);
      if (sample.height < SEA_LEVEL || sample.village > 0.02 || sample.crag !== 0) continue;
      if (sample.biome.key === "desert") continue;
      if (sample.blight > 0.6 || hash01(seed, gx, gz, 4) < sample.blight * 0.9) continue;
      if (isRoadCorridorColumn(x, z)) continue;

      const grove = fbm2D(speciesNoise, x, z, 2, 1 / 120);
      const roll = hash01(seed, gx, gz, 5);
      let kind: TreeKind;
      let palette: Palette = "green";
      if (sample.snowy) kind = snowSpecies(roll);
      else ({ kind, palette } = meadowSpecies(grove, roll, sample.height <= SEA_LEVEL + 4));
      // A birch that landed in an oak grove keeps a natural palette mix.
      if (kind === "birch" && palette === "green" && hash01(seed, gx, gz, 6) < 0.5) palette = "autumn";

      const tree: TreeSpec = { kind, x, z, y: sample.height, seed: Math.floor(hash01(seed, gx, gz, 7) * 0xffffffff), palette, snowy: sample.snowy };
      if (THICK_TRUNK.has(kind)) {
        // The trunk takes four columns; none of them may stand in water.
        let low = false;
        for (const [dx, dz] of [[1, 0], [0, 1], [1, 1]] as const) if (sampleColumn(seed, x + dx, z + dz).height < SEA_LEVEL) low = true;
        if (low) continue;
      }
      trees.push(tree);
    }
  }
  return trees;
}

/** The highest world Y any of these trees can reach — used to size the chunk column's vertical extent. */
export function treesMaxY(trees: TreeSpec[]): number {
  let top = 0;
  for (const t of trees) top = Math.max(top, t.y + TREE_HEIGHT[t.kind]);
  return top;
}

/** Draws the part of each tree that falls inside chunk column (cx, cz). Mutates `chunks` in place. */
export function placeTrees(seed: number, trees: TreeSpec[], cx: number, cz: number, chunks: Chunk[]): void {
  const minX = cx * CHUNK_SIZE;
  const minZ = cz * CHUNK_SIZE;
  const put = (x: number, y: number, z: number, block: number, onlyIfAir: boolean): void => {
    const lx = x - minX;
    const lz = z - minZ;
    if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE || y < 0) return;
    const cy = Math.floor(y / CHUNK_SIZE);
    const chunk = chunks[cy];
    if (!chunk) return;
    const idx = localIndex(lx, y - cy * CHUNK_SIZE, lz);
    if (onlyIfAir && chunk.blocks[idx] !== 0) return;
    chunk.blocks[idx] = block;
    chunk.skyLight[idx] = 0;
  };
  const ground = (x: number, z: number): number => sampleColumn(seed, x, z).height;
  for (const tree of trees) drawTree(tree, put, ground);
}
