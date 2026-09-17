// Greedy meshing, per spec/10-lighting-rendering.md §3. Runs inside
// mesh.worker.ts (kept in its own pure module so it's unit-testable
// without a worker). No texture atlas or AO yet (§3's AO note, and
// [18-visual-art-direction.md]'s atlas are later-phase work) — faces are
// flat-colored per block, shaded by the merged cell's sky-light level.
import { AIR_ID, WATER_ID, getBlockById } from "../data/blocks";
import { CHUNK_SIZE } from "../engine/Chunk";

type Axis = 0 | 1 | 2; // 0 = X, 1 = Y, 2 = Z

// Chosen so cross(uAxis, vAxis) === +axis for every entry (X:Y×Z→X,
// Y:Z×X→Y, Z:X×Y→Z) — see the winding-order derivation this depends on.
const AXIS_CONFIG: { u: Axis; v: Axis }[] = [
  { u: 1, v: 2 },
  { u: 2, v: 0 },
  { u: 0, v: 1 },
];

export interface BoundaryLayers {
  px: Uint16Array | null; // neighbor chunk's x=0 layer, indexed [y*32+z]
  nx: Uint16Array | null; // neighbor chunk's x=31 layer, indexed [y*32+z]
  py: Uint16Array | null; // indexed [x*32+z]
  ny: Uint16Array | null;
  pz: Uint16Array | null; // indexed [x*32+y]
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
}

function sampleBlock(x: number, y: number, z: number, blocks: Uint16Array, b: BoundaryLayers): number {
  if (x < 0) return b.nx ? b.nx[y * CHUNK_SIZE + z] : AIR_ID;
  if (x >= CHUNK_SIZE) return b.px ? b.px[y * CHUNK_SIZE + z] : AIR_ID;
  if (y < 0) return b.ny ? b.ny[x * CHUNK_SIZE + z] : AIR_ID;
  if (y >= CHUNK_SIZE) return b.py ? b.py[x * CHUNK_SIZE + z] : AIR_ID;
  if (z < 0) return b.nz ? b.nz[x * CHUNK_SIZE + y] : AIR_ID;
  if (z >= CHUNK_SIZE) return b.pz ? b.pz[x * CHUNK_SIZE + y] : AIR_ID;
  return blocks[x | (y << 5) | (z << 10)];
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

export function meshChunkGreedy(blocks: Uint16Array, skyLight: Uint8Array, boundaries: BoundaryLayers): MeshedChunk {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const waterPositions: number[] = [];
  const waterNormals: number[] = [];
  const waterColors: number[] = [];
  const waterIndices: number[] = [];

  const voxel: [number, number, number] = [0, 0, 0];
  const neighborVoxel: [number, number, number] = [0, 0, 0];
  const mask = new Int32Array(CHUNK_SIZE * CHUNK_SIZE); // packed key, 0 = no face
  const lightMask = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  const visited = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);

  for (const axis of [0, 1, 2] as const) {
    for (let dir = -1; dir <= 1; dir += 2) {
      for (let slice = 0; slice < CHUNK_SIZE; slice++) {
        mask.fill(0);
        lightMask.fill(0);
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
            // Water-to-water is the one same-block transparent pairing that
            // needs to NOT count as visible — every other transparentToRender
            // block (e.g. leaves) keeps its existing behavior. Without this,
            // a lake's internal horizontal layers (any two vertically
            // stacked water voxels) would each emit a face; harmless while
            // water was opaque (invisible, buried inside solid water) but a
            // visible stack of seams now that water is rendered translucent.
            const isWaterSeam = blockId === WATER_ID && neighborId === WATER_ID;
            const faceVisible = !isWaterSeam && (neighborId === AIR_ID || (neighborDef?.transparentToRender ?? false));
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
              light = skyLight[neighborVoxel[0] | (neighborVoxel[1] << 5) | (neighborVoxel[2] << 10)];
            }

            const idx = u * CHUNK_SIZE + v;
            mask[idx] = blockId;
            lightMask[idx] = light;
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

            let width = 1;
            while (
              v + width < CHUNK_SIZE &&
              !visited[u * CHUNK_SIZE + (v + width)] &&
              mask[u * CHUNK_SIZE + (v + width)] === blockId &&
              lightMask[u * CHUNK_SIZE + (v + width)] === light
            ) {
              width++;
            }

            let height = 1;
            heightLoop: while (u + height < CHUNK_SIZE) {
              for (let k = 0; k < width; k++) {
                const rowIdx = (u + height) * CHUNK_SIZE + (v + k);
                if (visited[rowIdx] || mask[rowIdx] !== blockId || lightMask[rowIdx] !== light) break heightLoop;
              }
              height++;
            }

            for (let du = 0; du < height; du++) {
              for (let dv = 0; dv < width; dv++) {
                visited[(u + du) * CHUNK_SIZE + (v + dv)] = 1;
              }
            }

            const isWater = blockId === WATER_ID;
            emitQuad(
              isWater ? waterPositions : positions,
              isWater ? waterNormals : normals,
              isWater ? waterColors : colors,
              isWater ? waterIndices : indices,
              axis,
              slice,
              dir,
              u,
              u + height,
              v,
              v + width,
              getBlockById(blockId).color,
              light,
            );
          }
        }
      }
    }
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
    waterPositions: new Float32Array(waterPositions),
    waterNormals: new Float32Array(waterNormals),
    waterColors: new Float32Array(waterColors),
    waterIndices: new Uint32Array(waterIndices),
  };
}

function emitQuad(
  positions: number[],
  normals: number[],
  colors: number[],
  indices: number[],
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
  }

  indices.push(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex, baseIndex + 2, baseIndex + 3);
}
