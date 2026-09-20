// Owns the Three.js meshes for meshed chunks: turns a worker's MeshedChunk into
// one THREE.Mesh per non-empty layer (see meshLayers.ts), swaps them in when a
// chunk is re-meshed, and releases them when it goes away. Knows nothing about
// streaming, edits or persistence — ChunkManager decides *when*, this decides *how*.
import * as THREE from "three";
import { CHUNK_SIZE, type ChunkCoord } from "../core/Chunk";
import type { MeshedChunk } from "./greedyMesh";
import { MESH_LAYERS } from "./meshLayers";

export class ChunkRenderer {
  private readonly scene: THREE.Scene;
  private readonly meshesByChunk = new Map<string, THREE.Mesh[]>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Replaces whatever was drawn for `chunkKey` with the freshly meshed result. */
  update(chunkKey: string, coord: ChunkCoord, result: MeshedChunk): void {
    this.remove(chunkKey);
    const meshes: THREE.Mesh[] = [];
    for (const layer of MESH_LAYERS) {
      if (result[layer.indices].length === 0) continue;
      const geometry = new THREE.BufferGeometry();
      for (const attr of layer.attributes) {
        geometry.setAttribute(attr.name, new THREE.BufferAttribute(result[attr.field], attr.itemSize));
      }
      geometry.setIndex(new THREE.BufferAttribute(result[layer.indices], 1));
      const mesh = new THREE.Mesh(geometry, layer.material());
      mesh.position.set(coord.cx * CHUNK_SIZE, coord.cy * CHUNK_SIZE, coord.cz * CHUNK_SIZE);
      this.scene.add(mesh);
      meshes.push(mesh);
    }
    if (meshes.length > 0) this.meshesByChunk.set(chunkKey, meshes);
  }

  remove(chunkKey: string): void {
    const meshes = this.meshesByChunk.get(chunkKey);
    if (!meshes) return;
    for (const mesh of meshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.meshesByChunk.delete(chunkKey);
  }

  dispose(): void {
    for (const key of this.meshesByChunk.keys()) this.remove(key);
  }
}
