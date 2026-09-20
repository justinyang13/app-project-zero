// Greedy meshing, per spec/10-lighting-rendering.md §3. Runs inside
// mesh.worker.ts (kept in its own pure module so it's unit-testable
// without a worker). No texture atlas or AO yet (§3's AO note, and
// [18-visual-art-direction.md]'s atlas are later-phase work) — faces are
// flat-colored per block, shaded by the merged cell's sky-light level.
// Foliage (leaves) is the one exception: it carries UVs so
// ChunkRenderer.ts can texture it with an alpha-cutout pattern instead.
import { AIR_ID, BLOCKS, WATER_ID, getBlockById, type BlockDef } from "../data/blocks";
import { textureFrames, textureLayer, textureVariants } from "../data/blockTextures";
import { CHUNK_SIZE, localIndex, localX, localY, localZ } from "../core/Chunk";

type Axis = 0 | 1 | 2; // 0 = X, 1 = Y, 2 = Z

// Chosen so cross(uAxis, vAxis) === +axis for every entry (X:Y×Z→X,
// Y:Z×X→Y, Z:X×Y→Z) — see the winding-order derivation this depends on.
const AXIS_CONFIG: { u: Axis; v: Axis }[] = [
  { u: 1, v: 2 },
  { u: 2, v: 0 },
  { u: 0, v: 1 },
];

export interface BoundaryLayers {
  px: Uint16Array | null; // neighbor chunk's x=0 layer, indexed [y*CHUNK_SIZE+z]
  nx: Uint16Array | null; // neighbor chunk's x=CHUNK_SIZE-1 layer, indexed [y*CHUNK_SIZE+z]
  py: Uint16Array | null; // indexed [x*CHUNK_SIZE+z]
  ny: Uint16Array | null;
  pz: Uint16Array | null; // indexed [x*CHUNK_SIZE+y]
  nz: Uint16Array | null;
}

export interface MeshedChunk {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  // Water faces land in their own buffers instead of the arrays above,
  // so ChunkManager.ts can give them a separate transparent-material
  // mesh (see its header comment) rather than baking transparency into
  // the single opaque terrain mesh/material.
  waterPositions: Float32Array;
  waterNormals: Float32Array;
  waterColors: Float32Array;
  waterIndices: Uint32Array;
  // Foliage (leaf) faces, same split as water — plus UVs (in block
  // units, not normalized 0..1) so ChunkManager's foliage material can
  // tile its alpha-cutout leaf texture once per block across a merged
  // quad instead of stretching one repeat across it.
  foliagePositions: Float32Array;
  foliageNormals: Float32Array;
  foliageColors: Float32Array;
  foliageUvs: Float32Array;
  foliageIndices: Uint32Array;
  // Textured blocks (the castle's palette — pixel-art textures, cut-outs,
  // emissive pixels, animation): UVs in block units like foliage, plus per
  // vertex the texture-array layer + frame count (`texTiles`, 2 floats)
  // and the baked block-light glow color (`texGlow`, 3 floats). See
  // rendering/texturedMaterial.ts for how they're consumed.
  texPositions: Float32Array;
  texNormals: Float32Array;
  texColors: Float32Array;
  texUvs: Float32Array;
  texTiles: Float32Array;
  texGlow: Float32Array;
  texIndices: Uint32Array;
}

/** Every typed array in a meshed chunk's buffers, for handing across a worker boundary without copying. */
export function meshTransferables(mesh: MeshedChunk): ArrayBuffer[] {
  return Object.values(mesh).map((array: Float32Array | Uint32Array) => array.buffer as ArrayBuffer);
}

/** Block-light level (0-15) at a chunk-local coordinate — may lie outside 0..31 (a neighboring chunk). Supplied by the caller (workers/mesh.worker.ts) so this module stays free of castle-specific knowledge. */
export type BlockLightSampler = (lx: number, ly: number, lz: number) => number;

// Per-block, per-face texture layer tables (face order: +x -x +y -y +z -z),
// built once so the hot meshing loop is a pair of array lookups.
const FACE_TILE = new Int16Array(BLOCKS.length * 6).fill(-1);
// Per face: > 1 = that many animation frames, < -1 = that many position-hashed variants, else a single tile.
const FACE_FRAMES = new Int8Array(BLOCKS.length * 6).fill(1);
for (const def of BLOCKS) {
  if (!def.tex) continue;
  const pick = (face: number): string | undefined => (face === 2 ? def.tex!.top : face === 3 ? def.tex!.bottom : def.tex!.side) ?? def.tex!.all;
  for (let face = 0; face < 6; face++) {
    const key = pick(face);
    if (!key) continue;
    FACE_TILE[def.id * 6 + face] = textureLayer(key);
    const variants = textureVariants(key);
    FACE_FRAMES[def.id * 6 + face] = variants > 1 ? -variants : textureFrames(key);
  }
}

function faceIndex(axis: Axis, dir: number): number {
  return axis * 2 + (dir > 0 ? 0 : 1);
}

/** Baked block light -> the warm glow color added to a face (firelight: dim reads deep red-orange, bright reads gold). */
function glowColor(level: number): [number, number, number] {
  if (level <= 0) return [0, 0, 0];
  const t = Math.pow(level / 15, 1.7); // a steeper curve keeps distant walls dark and pools the light around the flames
  return [Math.min(1, t * 1.15), 0.6 * Math.pow(t, 1.2), 0.16 * Math.pow(t, 2)];
}

function sampleBlock(x: number, y: number, z: number, blocks: Uint16Array, b: BoundaryLayers): number {
  if (x < 0) return b.nx ? b.nx[y * CHUNK_SIZE + z] : AIR_ID;
  if (x >= CHUNK_SIZE) return b.px ? b.px[y * CHUNK_SIZE + z] : AIR_ID;
  if (y < 0) return b.ny ? b.ny[x * CHUNK_SIZE + z] : AIR_ID;
  if (y >= CHUNK_SIZE) return b.py ? b.py[x * CHUNK_SIZE + z] : AIR_ID;
  if (z < 0) return b.nz ? b.nz[x * CHUNK_SIZE + y] : AIR_ID;
  if (z >= CHUNK_SIZE) return b.pz ? b.pz[x * CHUNK_SIZE + y] : AIR_ID;
  return blocks[localIndex(x, y, z)];
}

function setVoxel(out: [number, number, number], axis: Axis, a0: number, u: number, v: number): void {
  const cfg = AXIS_CONFIG[axis];
  out[axis] = a0;
  out[cfg.u] = u;
  out[cfg.v] = v;
}

const LIGHT_LEVELS = 16;
const AMBIENT_FLOOR = 0.4; // faces at light 0 still read as dim, not pure black

function lightToBrightness(level: number): number {
  return AMBIENT_FLOOR + (1 - AMBIENT_FLOOR) * (level / (LIGHT_LEVELS - 1));
}

export function meshChunkGreedy(
  blocks: Uint16Array,
  skyLight: Uint8Array,
  boundaries: BoundaryLayers,
  blockLightAt?: BlockLightSampler,
): MeshedChunk {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const waterPositions: number[] = [];
  const waterNormals: number[] = [];
  const waterColors: number[] = [];
  const waterIndices: number[] = [];
  const foliagePositions: number[] = [];
  const foliageNormals: number[] = [];
  const foliageColors: number[] = [];
  const foliageUvs: number[] = [];
  const foliageIndices: number[] = [];
  const tex = {
    positions: [] as number[],
    normals: [] as number[],
    colors: [] as number[],
    uvs: [] as number[],
    tiles: [] as number[],
    glow: [] as number[],
    indices: [] as number[],
  };

  const voxel: [number, number, number] = [0, 0, 0];
  const neighborVoxel: [number, number, number] = [0, 0, 0];
  const mask = new Int32Array(CHUNK_SIZE * CHUNK_SIZE); // packed key, 0 = no face
  const lightMask = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  const glowMask = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  const visited = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);

  for (const axis of [0, 1, 2] as const) {
    for (let dir = -1; dir <= 1; dir += 2) {
      for (let slice = 0; slice < CHUNK_SIZE; slice++) {
        mask.fill(0);
        lightMask.fill(0);
        glowMask.fill(0);
        visited.fill(0);

        for (let u = 0; u < CHUNK_SIZE; u++) {
          for (let v = 0; v < CHUNK_SIZE; v++) {
            setVoxel(voxel, axis, slice, u, v);
            const blockId = sampleBlock(voxel[0], voxel[1], voxel[2], blocks, boundaries);
            if (blockId === AIR_ID) continue;
            const def = getBlockById(blockId);
            if (!def.solid) continue;

            setVoxel(neighborVoxel, axis, slice + dir, u, v);
            const neighborId = sampleBlock(neighborVoxel[0], neighborVoxel[1], neighborVoxel[2], blocks, boundaries);
            const neighborDef = neighborId === AIR_ID ? null : getBlockById(neighborId);
            // A transparentToRender block touching another voxel of its
            // own exact type (two stacked water voxels, two adjacent
            // same-color leaf voxels) doesn't count as a visible face —
            // without this, every such internal seam throughout a lake or
            // a dense tree canopy would get meshed; harmless while both
            // rendered as flat opaque colors (buried inside solid-looking
            // geometry) but a visible stack of seams now that water is
            // translucent and leaves are alpha-cutout. A *different*
            // transparentToRender block (e.g. two different leaf colors
            // touching) still renders its boundary normally.
            const isSameTransparentSeam = blockId === neighborId && def.transparentToRender;
            const faceVisible = !isSameTransparentSeam && (neighborId === AIR_ID || (neighborDef?.transparentToRender ?? false));
            if (!faceVisible) continue;

            // Face brightness: prefer the exposing (air) neighbor's own
            // light when it's inside this chunk; otherwise fall back to
            // full-bright rather than reading unavailable neighbor-chunk
            // light data (self-corrects once that neighbor chunk meshes).
            let light = LIGHT_LEVELS - 1;
            if (
              neighborVoxel[0] >= 0 &&
              neighborVoxel[0] < CHUNK_SIZE &&
              neighborVoxel[1] >= 0 &&
              neighborVoxel[1] < CHUNK_SIZE &&
              neighborVoxel[2] >= 0 &&
              neighborVoxel[2] < CHUNK_SIZE
            ) {
              light = skyLight[localIndex(neighborVoxel[0], neighborVoxel[1], neighborVoxel[2])];
            }

            const idx = u * CHUNK_SIZE + v;
            mask[idx] = blockId;
            lightMask[idx] = light;
            if (def.tex && blockLightAt) {
              glowMask[idx] = blockLightAt(neighborVoxel[0], neighborVoxel[1], neighborVoxel[2]);
            }
          }
        }

        // Greedy rectangle merge over the (u, v) mask, requiring matching
        // block id AND light level (spec §3 point 5's lighting caveat).
        for (let u = 0; u < CHUNK_SIZE; u++) {
          for (let v = 0; v < CHUNK_SIZE; v++) {
            const idx = u * CHUNK_SIZE + v;
            if (visited[idx] || mask[idx] === 0) continue;
            const blockId = mask[idx];
            const light = lightMask[idx];
            const glow = glowMask[idx];

            let width = 1;
            while (
              v + width < CHUNK_SIZE &&
              !visited[u * CHUNK_SIZE + (v + width)] &&
              mask[u * CHUNK_SIZE + (v + width)] === blockId &&
              lightMask[u * CHUNK_SIZE + (v + width)] === light &&
              glowMask[u * CHUNK_SIZE + (v + width)] === glow
            ) {
              width++;
            }

            let height = 1;
            heightLoop: while (u + height < CHUNK_SIZE) {
              for (let k = 0; k < width; k++) {
                const rowIdx = (u + height) * CHUNK_SIZE + (v + k);
                if (visited[rowIdx] || mask[rowIdx] !== blockId || lightMask[rowIdx] !== light || glowMask[rowIdx] !== glow) break heightLoop;
              }
              height++;
            }

            for (let du = 0; du < height; du++) {
              for (let dv = 0; dv < width; dv++) {
                visited[(u + du) * CHUNK_SIZE + (v + dv)] = 1;
              }
            }

            const quadDef = getBlockById(blockId);
            if (quadDef.tex) {
              emitTexturedQuad(tex, quadDef, axis, slice, dir, u, u + height, v, v + width, light, glow);
              continue;
            }
            const isWater = blockId === WATER_ID;
            const isFoliage = quadDef.foliage ?? false;
            emitQuad(
              isWater ? waterPositions : isFoliage ? foliagePositions : positions,
              isWater ? waterNormals : isFoliage ? foliageNormals : normals,
              isWater ? waterColors : isFoliage ? foliageColors : colors,
              isWater ? waterIndices : isFoliage ? foliageIndices : indices,
              isFoliage ? foliageUvs : null,
              axis,
              slice,
              dir,
              u,
              u + height,
              v,
              v + width,
              quadDef.color,
              light,
            );
          }
        }
      }
    }
  }

  emitCrossShapes(tex, blocks, skyLight);

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
    waterPositions: new Float32Array(waterPositions),
    waterNormals: new Float32Array(waterNormals),
    waterColors: new Float32Array(waterColors),
    waterIndices: new Uint32Array(waterIndices),
    foliagePositions: new Float32Array(foliagePositions),
    foliageNormals: new Float32Array(foliageNormals),
    foliageColors: new Float32Array(foliageColors),
    foliageUvs: new Float32Array(foliageUvs),
    foliageIndices: new Uint32Array(foliageIndices),
    texPositions: new Float32Array(tex.positions),
    texNormals: new Float32Array(tex.normals),
    texColors: new Float32Array(tex.colors),
    texUvs: new Float32Array(tex.uvs),
    texTiles: new Float32Array(tex.tiles),
    texGlow: new Float32Array(tex.glow),
    texIndices: new Uint32Array(tex.indices),
  };
}

interface TexBuffers {
  positions: number[];
  normals: number[];
  colors: number[];
  uvs: number[];
  tiles: number[];
  glow: number[];
  indices: number[];
}

/** One merged rectangle of a textured block face. Same corner/winding convention as emitQuad, plus the per-vertex texture layer, frame count and baked glow. */
function emitTexturedQuad(
  out: TexBuffers,
  def: BlockDef,
  axis: Axis,
  slice: number,
  dir: number,
  u0: number,
  u1: number,
  v0: number,
  v1: number,
  light: number,
  glowLevel: number,
): void {
  const faceVal = dir > 0 ? slice + 1 : slice;
  const corners: [number, number][] = dir > 0 ? [[u0, v0], [u1, v0], [u1, v1], [u0, v1]] : [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];
  const face = def.id * 6 + faceIndex(axis, dir);
  const layer = FACE_TILE[face];
  const frames = FACE_FRAMES[face];
  const brightness = lightToBrightness(light);
  const [gr, gg, gb] = glowColor(glowLevel);

  const baseIndex = out.positions.length / 3;
  const p: [number, number, number] = [0, 0, 0];
  for (const [u, v] of corners) {
    setVoxel(p, axis, faceVal, u, v);
    out.positions.push(p[0], p[1], p[2]);
    const normal: [number, number, number] = [0, 0, 0];
    normal[axis] = dir;
    out.normals.push(normal[0], normal[1], normal[2]);
    out.colors.push(brightness, brightness, brightness);
    // Texture coordinates follow the world, not the greedy-mesh axes: on
    // side faces "up" is always the texture's vertical (so brick courses
    // stay level on every wall), and a merged quad tiles once per block.
    if (axis === 0) out.uvs.push(p[2], p[1]);
    else if (axis === 1) out.uvs.push(p[0], p[2]);
    else out.uvs.push(p[0], p[1]);
    out.tiles.push(layer, frames);
    out.glow.push(gr, gg, gb);
  }
  out.indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
}

/** Non-cube "cross" blocks (a flame): two diagonal quads through the voxel, each emitted with both windings so the layer can stay single-sided. Self-lit, so no baked glow. */
function emitCrossShapes(out: TexBuffers, blocks: Uint16Array, skyLight: Uint8Array): void {
  for (let i = 0; i < blocks.length; i++) {
    const id = blocks[i];
    if (id === AIR_ID) continue;
    const def = getBlockById(id);
    if (def.shape !== "cross" || !def.tex) continue;
    const x = localX(i);
    const y = localY(i);
    const z = localZ(i);
    const layer = FACE_TILE[id * 6];
    const frames = FACE_FRAMES[id * 6];
    const brightness = lightToBrightness(skyLight[i]);
    const diagonals: [number, number, number, number][] = [
      [x, z, x + 1, z + 1],
      [x + 1, z, x, z + 1],
    ];
    for (const [ax, az, bx, bz] of diagonals) {
      const base = out.positions.length / 3;
      const verts: [number, number, number, number, number][] = [
        [ax, y, az, 0, 0],
        [bx, y, bz, 1, 0],
        [bx, y + 1, bz, 1, 1],
        [ax, y + 1, az, 0, 1],
      ];
      for (const [vx, vy, vz, uu, vv] of verts) {
        out.positions.push(vx, vy, vz);
        out.normals.push(0, 1, 0);
        out.colors.push(brightness, brightness, brightness);
        out.uvs.push(uu, vv);
        out.tiles.push(layer, frames);
        out.glow.push(0, 0, 0);
      }
      out.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      out.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
  }
}

function emitQuad(
  positions: number[],
  normals: number[],
  colors: number[],
  indices: number[],
  uvs: number[] | null,
  axis: Axis,
  slice: number,
  dir: number,
  u0: number,
  u1: number,
  v0: number,
  v1: number,
  colorHex: number,
  light: number,
): void {
  const faceVal = dir > 0 ? slice + 1 : slice;
  const corners: [number, number][] = dir > 0 ? [[u0, v0], [u1, v0], [u1, v1], [u0, v1]] : [[u0, v0], [u0, v1], [u1, v1], [u1, v0]];

  const baseIndex = positions.length / 3;
  const p: [number, number, number] = [0, 0, 0];
  for (const [u, v] of corners) {
    setVoxel(p, axis, faceVal, u, v);
    positions.push(p[0], p[1], p[2]);

    const normal: [number, number, number] = [0, 0, 0];
    normal[axis] = dir;
    normals.push(normal[0], normal[1], normal[2]);

    const brightness = lightToBrightness(light);
    const r = ((colorHex >> 16) & 0xff) / 255;
    const g = ((colorHex >> 8) & 0xff) / 255;
    const bl = (colorHex & 0xff) / 255;
    colors.push(r * brightness, g * brightness, bl * brightness);

    // Block-unit (not normalized) UVs — RepeatWrapping on the foliage
    // texture then tiles it once per block across the merged quad
    // instead of stretching a single repeat across the whole thing.
    if (uvs) uvs.push(u, v);
  }

  indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
}
