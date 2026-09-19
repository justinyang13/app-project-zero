// Chunk streaming: requests generation/meshing for columns near the
// player, evicts far ones, per spec/01-tech-stack-architecture.md §5 and
// spec/15-performance.md §3. Owns the worker pools and the Three.js mesh
// per loaded chunk.
import * as THREE from "three";
import { CHUNK_SIZE, Chunk, chunkKey, type ChunkCoord } from "./Chunk";
import { World } from "./World";
import { relightAfterEdit } from "./Lighting";
import { WorkerPool, defaultPoolSize } from "./WorkerPool";
import type { TerrainGenApi, GeneratedChunkData } from "../workers/terrain-gen.worker";
import type { MeshApi } from "../workers/mesh.worker";
import type { BoundaryLayers } from "../rendering/greedyMesh";
import type { SaveManager } from "../persistence/SaveManager";
import { getLeafTexture } from "../rendering/leafTexture";
import { getTexturedMaterial } from "../rendering/texturedMaterial";

// Measured against spec/15-performance.md §1's budget (~10ms of the 16.6ms
// frame for render+sim) with the debug overlay's frame-time readout: at this
// radius, frame time stayed under 5ms even mid-stream while walking, well
// short of the budget — see spec/15-performance.md §3's "Medium" preset,
// which uses the same 10-chunk radius as its default target.
export const RENDER_DISTANCE_COLUMNS = 10; // chunk columns in each horizontal direction
// Mobile GPUs choke on the desktop radius — same streaming/meshing cost
// per column, but weaker fill-rate/bandwidth. A judgment-call starting
// point (5-6 columns), easy to retune once real-device frame times are
// measured; see engine/GameLoop.ts for where this is selected.
export const MOBILE_RENDER_DISTANCE_COLUMNS = 6;
const EVICT_MARGIN = 1;

const material = new THREE.MeshLambertMaterial({ vertexColors: true });
// Water gets its own mesh/material per chunk (see rendering/greedyMesh.ts's
// waterPositions/etc.) rather than baking transparency into the single
// opaque terrain material above — depthWrite off avoids z-fighting against
// the lakebed/walls it's blended over, and DoubleSide keeps the underside
// of the surface visible while swimming beneath it.
const waterMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.68,
  depthWrite: false,
  side: THREE.DoubleSide,
});
// Foliage (leaves) also gets its own mesh/material — an alpha-cutout
// texture (see rendering/leafTexture.ts) instead of a flat solid color,
// tinted per leaf variant by vertexColors same as everything else.
// alphaTest (not `transparent`) gives crisp cut-out edges with no
// transparency sort order to get wrong, and DoubleSide so a leaf face
// doesn't vanish when looked at from inside the canopy.
const foliageMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  map: getLeafTexture(),
  alphaTest: 0.5,
  side: THREE.DoubleSide,
});

function columnKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

function extractLayer(chunk: Chunk, axis: "x" | "y" | "z", value: number): Uint16Array {
  const out = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE);
  if (axis === "x") {
    for (let y = 0; y < CHUNK_SIZE; y++)
      for (let z = 0; z < CHUNK_SIZE; z++) out[y * CHUNK_SIZE + z] = chunk.blocks[value | (y << 5) | (z << 10)];
  } else if (axis === "y") {
    for (let x = 0; x < CHUNK_SIZE; x++)
      for (let z = 0; z < CHUNK_SIZE; z++) out[x * CHUNK_SIZE + z] = chunk.blocks[x | (value << 5) | (z << 10)];
  } else {
    for (let x = 0; x < CHUNK_SIZE; x++)
      for (let y = 0; y < CHUNK_SIZE; y++) out[x * CHUNK_SIZE + y] = chunk.blocks[x | (y << 5) | (value << 10)];
  }
  return out;
}

export class ChunkManager {
  private readonly world: World;
  private readonly scene: THREE.Scene;
  private readonly saveManager: SaveManager;
  private readonly terrainPool: WorkerPool<TerrainGenApi>;
  private readonly meshPool: WorkerPool<MeshApi>;
  private readonly meshes = new Map<string, THREE.Mesh>();
  private readonly waterMeshes = new Map<string, THREE.Mesh>();
  private readonly foliageMeshes = new Map<string, THREE.Mesh>();
  private readonly texturedMeshes = new Map<string, THREE.Mesh>();
  private readonly loadedColumns = new Set<string>();
  private readonly pendingColumns = new Set<string>();
  private readonly pendingMeshes = new Set<string>();
  private lastPlayerColumn: { cx: number; cz: number } | null = null;
  private readonly renderDistanceColumns: number;

  constructor(world: World, scene: THREE.Scene, saveManager: SaveManager, renderDistanceColumns: number = RENDER_DISTANCE_COLUMNS) {
    this.world = world;
    this.scene = scene;
    this.saveManager = saveManager;
    this.renderDistanceColumns = renderDistanceColumns;
    this.terrainPool = new WorkerPool<TerrainGenApi>(
      () => new Worker(new URL("../workers/terrain-gen.worker.ts", import.meta.url), { type: "module" }),
      defaultPoolSize(),
    );
    this.meshPool = new WorkerPool<MeshApi>(
      () => new Worker(new URL("../workers/mesh.worker.ts", import.meta.url), { type: "module" }),
      defaultPoolSize(),
    );
  }

  get loadedChunkCount(): number {
    return this.world.chunks.size;
  }

  get pendingCount(): number {
    return this.pendingColumns.size + this.pendingMeshes.size;
  }

  /** Called periodically (not every frame) with the player's world position. */
  update(playerX: number, playerZ: number): void {
    const cx = Math.floor(playerX / CHUNK_SIZE);
    const cz = Math.floor(playerZ / CHUNK_SIZE);
    if (this.lastPlayerColumn && this.lastPlayerColumn.cx === cx && this.lastPlayerColumn.cz === cz) return;
    this.lastPlayerColumn = { cx, cz };

    const needed: { cx: number; cz: number; dist: number }[] = [];
    for (let dx = -this.renderDistanceColumns; dx <= this.renderDistanceColumns; dx++) {
      for (let dz = -this.renderDistanceColumns; dz <= this.renderDistanceColumns; dz++) {
        needed.push({ cx: cx + dx, cz: cz + dz, dist: dx * dx + dz * dz });
      }
    }
    needed.sort((a, b) => a.dist - b.dist);

    for (const col of needed) {
      const key = columnKey(col.cx, col.cz);
      if (this.loadedColumns.has(key) || this.pendingColumns.has(key)) continue;
      this.pendingColumns.add(key);
      void this.loadColumn(col.cx, col.cz);
    }

    const evictDistance = this.renderDistanceColumns + EVICT_MARGIN;
    for (const key of this.loadedColumns) {
      const [lcx, lcz] = key.split(",").map(Number);
      if (Math.abs(lcx - cx) > evictDistance || Math.abs(lcz - cz) > evictDistance) {
        this.evictColumn(lcx, lcz);
      }
    }
  }

  private async loadColumn(cx: number, cz: number): Promise<void> {
    const key = columnKey(cx, cz);
    const results: GeneratedChunkData[] = await this.terrainPool.run((api) =>
      api.generateColumn(this.world.seed, cx, cz),
    );

    const chunks: Chunk[] = [];
    for (const r of results) {
      const chunk = new Chunk({ cx: r.cx, cy: r.cy, cz: r.cz }, r.blocks, r.skyLight);
      this.world.setChunk(chunk);
      chunks.push(chunk);
    }

    // Apply any persisted edits on top of the freshly generated terrain,
    // then re-light exactly those voxels (spec/14-persistence-saves.md §2).
    // All of this column's chunks are registered in `world.chunks` above
    // before this runs, so relighting can see across them correctly.
    for (const chunk of chunks) {
      const diff = this.saveManager.getChunkDiff(chunkKey(chunk.coord));
      if (!diff) continue;
      chunk.modifiedFromGenerated = true;
      for (const [localIndex, blockId] of diff) chunk.blocks[localIndex] = blockId;
      for (const [localIndex] of diff) {
        const x = localIndex & 31;
        const y = (localIndex >> 5) & 31;
        const z = (localIndex >> 10) & 31;
        relightAfterEdit(
          this.world,
          chunk.coord.cx * CHUNK_SIZE + x,
          chunk.coord.cy * CHUNK_SIZE + y,
          chunk.coord.cz * CHUNK_SIZE + z,
        );
      }
    }

    this.pendingColumns.delete(key);
    this.loadedColumns.add(key);

    for (const chunk of chunks) {
      this.scheduleMesh(chunk.coord);
      this.scheduleNeighborRemesh(chunk.coord);
    }
  }

  private evictColumn(cx: number, cz: number): void {
    const key = columnKey(cx, cz);
    this.loadedColumns.delete(key);

    for (const [chunkKeyStr, chunk] of this.world.chunks) {
      if (chunk.coord.cx !== cx || chunk.coord.cz !== cz) continue;
      const mesh = this.meshes.get(chunkKeyStr);
      if (mesh) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        this.meshes.delete(chunkKeyStr);
      }
      const waterMesh = this.waterMeshes.get(chunkKeyStr);
      if (waterMesh) {
        this.scene.remove(waterMesh);
        waterMesh.geometry.dispose();
        this.waterMeshes.delete(chunkKeyStr);
      }
      const foliageMesh = this.foliageMeshes.get(chunkKeyStr);
      if (foliageMesh) {
        this.scene.remove(foliageMesh);
        foliageMesh.geometry.dispose();
        this.foliageMeshes.delete(chunkKeyStr);
      }
      const texturedMesh = this.texturedMeshes.get(chunkKeyStr);
      if (texturedMesh) {
        this.scene.remove(texturedMesh);
        texturedMesh.geometry.dispose();
        this.texturedMeshes.delete(chunkKeyStr);
      }
      if (chunk.modifiedFromGenerated) void this.saveManager.saveChunkNow(chunk);
      this.world.chunks.delete(chunkKeyStr);
    }
  }

  scheduleNeighborRemesh(coord: ChunkCoord): void {
    const neighbors: ChunkCoord[] = [
      { cx: coord.cx + 1, cy: coord.cy, cz: coord.cz },
      { cx: coord.cx - 1, cy: coord.cy, cz: coord.cz },
      { cx: coord.cx, cy: coord.cy + 1, cz: coord.cz },
      { cx: coord.cx, cy: coord.cy - 1, cz: coord.cz },
      { cx: coord.cx, cy: coord.cy, cz: coord.cz + 1 },
      { cx: coord.cx, cy: coord.cy, cz: coord.cz - 1 },
    ];
    for (const n of neighbors) {
      if (this.world.getChunk(n)) this.scheduleMesh(n);
    }
  }

  /** Places/breaks one block: writes it, persists the diff, re-lights, and re-meshes every affected chunk. */
  applyEdit(wx: number, wy: number, wz: number, blockId: number): boolean {
    const chunk = this.world.setBlock(wx, wy, wz, blockId);
    if (!chunk) return false;

    const lx = wx - chunk.coord.cx * CHUNK_SIZE;
    const ly = wy - chunk.coord.cy * CHUNK_SIZE;
    const lz = wz - chunk.coord.cz * CHUNK_SIZE;
    this.saveManager.recordEdit(chunkKey(chunk.coord), lx | (ly << 5) | (lz << 10), blockId);

    const touched = relightAfterEdit(this.world, wx, wy, wz);
    this.scheduleMesh(chunk.coord);
    this.scheduleNeighborRemesh(chunk.coord);
    for (const coord of touched) this.scheduleMesh(coord);
    return true;
  }

  /** Re-meshes one chunk (used both for initial load and after an edit). */
  scheduleMesh(coord: ChunkCoord): void {
    const key = chunkKey(coord);
    const chunk = this.world.getChunk(coord);
    if (!chunk) return;
    if (this.pendingMeshes.has(key)) return;
    this.pendingMeshes.add(key);
    void this.meshOne(chunk);
  }

  private async meshOne(chunk: Chunk): Promise<void> {
    const key = chunkKey(chunk.coord);
    const { cx, cy, cz } = chunk.coord;

    const px = this.world.getChunk({ cx: cx + 1, cy, cz });
    const nx = this.world.getChunk({ cx: cx - 1, cy, cz });
    const py = this.world.getChunk({ cx, cy: cy + 1, cz });
    const ny = this.world.getChunk({ cx, cy: cy - 1, cz });
    const pz = this.world.getChunk({ cx, cy, cz: cz + 1 });
    const nz = this.world.getChunk({ cx, cy, cz: cz - 1 });

    const boundaries: BoundaryLayers = {
      px: px ? extractLayer(px, "x", 0) : null,
      nx: nx ? extractLayer(nx, "x", CHUNK_SIZE - 1) : null,
      py: py ? extractLayer(py, "y", 0) : null,
      ny: ny ? extractLayer(ny, "y", CHUNK_SIZE - 1) : null,
      pz: pz ? extractLayer(pz, "z", 0) : null,
      nz: nz ? extractLayer(nz, "z", CHUNK_SIZE - 1) : null,
    };

    const result = await this.meshPool.run((api) => api.meshChunk(chunk.blocks, chunk.skyLight, boundaries, cx, cy, cz));
    this.pendingMeshes.delete(key);
    chunk.dirty = false;

    const existing = this.meshes.get(key);
    if (existing) {
      this.scene.remove(existing);
      existing.geometry.dispose();
      this.meshes.delete(key);
    }
    const existingWater = this.waterMeshes.get(key);
    if (existingWater) {
      this.scene.remove(existingWater);
      existingWater.geometry.dispose();
      this.waterMeshes.delete(key);
    }
    const existingFoliage = this.foliageMeshes.get(key);
    if (existingFoliage) {
      this.scene.remove(existingFoliage);
      existingFoliage.geometry.dispose();
      this.foliageMeshes.delete(key);
    }
    const existingTextured = this.texturedMeshes.get(key);
    if (existingTextured) {
      this.scene.remove(existingTextured);
      existingTextured.geometry.dispose();
      this.texturedMeshes.delete(key);
    }

    if (result.indices.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(result.positions, 3));
      geometry.setAttribute("normal", new THREE.BufferAttribute(result.normals, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(result.colors, 3));
      geometry.setIndex(new THREE.BufferAttribute(result.indices, 1));

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(cx * CHUNK_SIZE, cy * CHUNK_SIZE, cz * CHUNK_SIZE);
      this.scene.add(mesh);
      this.meshes.set(key, mesh);
    }

    if (result.waterIndices.length > 0) {
      const waterGeometry = new THREE.BufferGeometry();
      waterGeometry.setAttribute("position", new THREE.BufferAttribute(result.waterPositions, 3));
      waterGeometry.setAttribute("normal", new THREE.BufferAttribute(result.waterNormals, 3));
      waterGeometry.setAttribute("color", new THREE.BufferAttribute(result.waterColors, 3));
      waterGeometry.setIndex(new THREE.BufferAttribute(result.waterIndices, 1));

      const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
      waterMesh.position.set(cx * CHUNK_SIZE, cy * CHUNK_SIZE, cz * CHUNK_SIZE);
      this.scene.add(waterMesh);
      this.waterMeshes.set(key, waterMesh);
    }

    if (result.foliageIndices.length > 0) {
      const foliageGeometry = new THREE.BufferGeometry();
      foliageGeometry.setAttribute("position", new THREE.BufferAttribute(result.foliagePositions, 3));
      foliageGeometry.setAttribute("normal", new THREE.BufferAttribute(result.foliageNormals, 3));
      foliageGeometry.setAttribute("color", new THREE.BufferAttribute(result.foliageColors, 3));
      foliageGeometry.setAttribute("uv", new THREE.BufferAttribute(result.foliageUvs, 2));
      foliageGeometry.setIndex(new THREE.BufferAttribute(result.foliageIndices, 1));

      const foliageMesh = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliageMesh.position.set(cx * CHUNK_SIZE, cy * CHUNK_SIZE, cz * CHUNK_SIZE);
      this.scene.add(foliageMesh);
      this.foliageMeshes.set(key, foliageMesh);
    }

    if (result.texIndices.length > 0) {
      const texGeometry = new THREE.BufferGeometry();
      texGeometry.setAttribute("position", new THREE.BufferAttribute(result.texPositions, 3));
      texGeometry.setAttribute("normal", new THREE.BufferAttribute(result.texNormals, 3));
      texGeometry.setAttribute("color", new THREE.BufferAttribute(result.texColors, 3));
      texGeometry.setAttribute("tuv", new THREE.BufferAttribute(result.texUvs, 2));
      texGeometry.setAttribute("tile", new THREE.BufferAttribute(result.texTiles, 2));
      texGeometry.setAttribute("glow", new THREE.BufferAttribute(result.texGlow, 3));
      texGeometry.setIndex(new THREE.BufferAttribute(result.texIndices, 1));

      const texMesh = new THREE.Mesh(texGeometry, getTexturedMaterial());
      texMesh.position.set(cx * CHUNK_SIZE, cy * CHUNK_SIZE, cz * CHUNK_SIZE);
      this.scene.add(texMesh);
      this.texturedMeshes.set(key, texMesh);
    }
  }

  dispose(): void {
    this.terrainPool.dispose();
    this.meshPool.dispose();
    for (const mesh of this.meshes.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    for (const mesh of this.waterMeshes.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    for (const mesh of this.foliageMeshes.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    for (const mesh of this.texturedMeshes.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
  }
}
