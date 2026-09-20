// The render layers a meshed chunk is split into (see greedyMesh.ts's
// MeshedChunk): each layer is its own THREE.Mesh with its own material, and
// this table is the single place that says which typed arrays feed which
// vertex attributes. Adding a layer is one entry here plus its arrays in the
// mesher — ChunkRenderer, the worker's transfer list and disposal all follow.
import * as THREE from "three";
import type { MeshedChunk } from "./greedyMesh";
import { getLeafTexture } from "./leafTexture";
import { getTexturedMaterial } from "./texturedMaterial";

type FieldOfType<T> = { [K in keyof MeshedChunk]: MeshedChunk[K] extends T ? K : never }[keyof MeshedChunk];

export interface MeshLayer {
  name: "solid" | "water" | "foliage" | "textured";
  /** The MeshedChunk index buffer; an empty one means the chunk has nothing in this layer. */
  indices: FieldOfType<Uint32Array>;
  attributes: { name: string; field: FieldOfType<Float32Array>; itemSize: number }[];
  material: () => THREE.Material;
}

const solidMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
// Water gets its own mesh/material per chunk rather than baking transparency
// into the opaque terrain material — depthWrite off avoids z-fighting against
// the lakebed/walls it's blended over, and DoubleSide keeps the underside of
// the surface visible while swimming beneath it.
const waterMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.68,
  depthWrite: false,
  side: THREE.DoubleSide,
});
// Foliage (leaves): an alpha-cutout texture (see leafTexture.ts) instead of a
// flat solid color, tinted per leaf variant by vertexColors. alphaTest (not
// `transparent`) gives crisp cut-out edges with no transparency sort order to
// get wrong, and DoubleSide so a leaf face doesn't vanish from inside a canopy.
const foliageMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  map: getLeafTexture(),
  alphaTest: 0.5,
  side: THREE.DoubleSide,
});

export const MESH_LAYERS: readonly MeshLayer[] = [
  {
    name: "solid",
    indices: "indices",
    attributes: [
      { name: "position", field: "positions", itemSize: 3 },
      { name: "normal", field: "normals", itemSize: 3 },
      { name: "color", field: "colors", itemSize: 3 },
    ],
    material: () => solidMaterial,
  },
  {
    name: "water",
    indices: "waterIndices",
    attributes: [
      { name: "position", field: "waterPositions", itemSize: 3 },
      { name: "normal", field: "waterNormals", itemSize: 3 },
      { name: "color", field: "waterColors", itemSize: 3 },
    ],
    material: () => waterMaterial,
  },
  {
    name: "foliage",
    indices: "foliageIndices",
    attributes: [
      { name: "position", field: "foliagePositions", itemSize: 3 },
      { name: "normal", field: "foliageNormals", itemSize: 3 },
      { name: "color", field: "foliageColors", itemSize: 3 },
      { name: "uv", field: "foliageUvs", itemSize: 2 },
    ],
    material: () => foliageMaterial,
  },
  {
    name: "textured",
    indices: "texIndices",
    attributes: [
      { name: "position", field: "texPositions", itemSize: 3 },
      { name: "normal", field: "texNormals", itemSize: 3 },
      { name: "color", field: "texColors", itemSize: 3 },
      { name: "tuv", field: "texUvs", itemSize: 2 },
      { name: "tile", field: "texTiles", itemSize: 2 },
      { name: "glow", field: "texGlow", itemSize: 3 },
    ],
    material: getTexturedMaterial,
  },
];
