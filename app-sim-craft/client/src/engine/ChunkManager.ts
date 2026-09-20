// Chunk streaming: requests generation/meshing for columns near the
// player, evicts far ones, per spec/01-tech-stack-architecture.md §5 and
// spec/15-performance.md §3. Owns the worker pools; the Three.js meshes for
// each loaded chunk live in rendering/ChunkRenderer.ts.
import type * as THREE from "three";
import { CHUNK_SIZE, Chunk, chunkKey, localIndex, type ChunkCoord } from "./Chunk";
import { World } from "./World";
import { relightAfterEdit } from "./Lighting";
import { WorkerPool, defaultPoolSize } from "./WorkerPool";
import type { TerrainGenApi, GeneratedChunkData } from "../workers/terrain-gen.worker";
import type { MeshApi } from "../workers/mesh.worker";
import type { BoundaryLayers } from "../rendering/greedyMesh";
import type { SaveManager } from "../persistence/SaveManager";
import { ChunkRenderer } from "../rendering/ChunkRenderer";

// Measured against spec/15-performance.md §1's budget (~10ms of the 16.6ms
// frame for render+sim) with the debug overlay's frame-time readout: at this
// radius, frame time stayed under 5ms even mid-stream while walking, well
// short of the budget — see spec/15-performance.md §3's "Medium" preset,
// which uses the same 10-chunk radius as its default target.
export const RENDER_DISTANCE_COLUMNS = 10; // chunk columns in each horizontal direction
const EVICT_MARGIN = 1;

function columnKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

function extractLayer(chunk: Chunk, axis: "x" | "y" | "z", value: number): Uint16Array {
  const out = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE);
  for (let a = 0; a < CHUNK_SIZE; a++) {
    for (let b = 0; b < CHUNK_SIZE; b++) {
      const index = axis === "x" ? localIndex(value, a, b) : axis === "y" ? localIndex(a, value, b) : localIndex(a, b, value);
      out[a * CHUNK_SIZE + b] = chunk.blocks[index];
    }
  }
  return out;
}

/** One in-flight meshing request for a chunk. */
interface MeshJob {
  chunk: Chunk;
  /** Set once a worker has taken the chunk's data — from then on a change needs a second pass. */
  dispatched: boolean;
  /** The chunk changed after `dispatched`, so this job's result is already out of date. */
  remesh: boolean;
}

export class ChunkManager {
  private readonly world: World;
  private readonly saveManager: SaveManager;
  private readonly terrainPool: WorkerPool<TerrainGenApi>;
  private readonly meshPool: WorkerPool<MeshApi>;
  private readonly renderer: ChunkRenderer;
  private readonly loadedColumns = new Map<string, Chunk[]>();
  private readonly pendingColumns = new Set<string>();
  private readonly pendingMeshes = new Map<string, MeshJob>();
  private lastPlayerColumn: { cx: number; cz: number } | null = null;
  private renderDistanceColumns: number;

  constructor(world: World, scene: THREE.Scene, saveManager: SaveManager, renderDistanceColumns: number = RENDER_DISTANCE_COLUMNS) {
    this.world = world;
    this.renderer = new ChunkRenderer(scene);
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

  /** Changes how many chunk columns are kept loaded around the player (takes effect on the next update, which this forces). */
  setRenderDistance(columns: number, playerX: number, playerZ: number): void {
    if (columns === this.renderDistanceColumns) return;
    this.renderDistanceColumns = columns;
    this.lastPlayerColumn = null;
    this.update(playerX, playerZ);
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
    for (const key of this.loadedColumns.keys()) {
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
      for (const [index, blockId] of diff) chunk.blocks[index] = blockId;
      for (const [index] of diff) {
        const x = index & 31;
        const y = (index >> 5) & 31;
        const z = (index >> 10) & 31;
        relightAfterEdit(
          this.world,
          chunk.coord.cx * CHUNK_SIZE + x,
          chunk.coord.cy * CHUNK_SIZE + y,
          chunk.coord.cz * CHUNK_SIZE + z,
        );
      }
    }

    this.pendingColumns.delete(key);
    this.loadedColumns.set(key, chunks);

    for (const chunk of chunks) {
      this.scheduleMesh(chunk.coord);
      this.scheduleNeighborRemesh(chunk.coord);
    }
  }

  private evictColumn(cx: number, cz: number): void {
    const key = columnKey(cx, cz);
    const chunks = this.loadedColumns.get(key);
    this.loadedColumns.delete(key);
    if (!chunks) return;

    for (const chunk of chunks) {
      const ck = chunkKey(chunk.coord);
      // Dropping the job also makes any in-flight mesh for this chunk discard its result when it lands.
      this.pendingMeshes.delete(ck);
      this.renderer.remove(ck);
      if (chunk.modifiedFromGenerated) void this.saveManager.saveChunkNow(chunk);
      this.world.chunks.delete(ck);
    }
  }

  /** Re-meshes all six face-adjacent neighbours — needed when a chunk first appears, since their border faces were culled against nothing. */
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

  /** Only the neighbours an edit at chunk-local (lx, ly, lz) can affect: those across a border the edited voxel touches. */
  private scheduleBorderNeighborRemesh(coord: ChunkCoord, lx: number, ly: number, lz: number): void {
    const last = CHUNK_SIZE - 1;
    const touching: ChunkCoord[] = [];
    if (lx === 0) touching.push({ ...coord, cx: coord.cx - 1 });
    if (lx === last) touching.push({ ...coord, cx: coord.cx + 1 });
    if (ly === 0) touching.push({ ...coord, cy: coord.cy - 1 });
    if (ly === last) touching.push({ ...coord, cy: coord.cy + 1 });
    if (lz === 0) touching.push({ ...coord, cz: coord.cz - 1 });
    if (lz === last) touching.push({ ...coord, cz: coord.cz + 1 });
    for (const n of touching) this.scheduleMesh(n);
  }

  /** Places/breaks one block: writes it, persists the diff, re-lights, and re-meshes every affected chunk. */
  applyEdit(wx: number, wy: number, wz: number, blockId: number): boolean {
    const chunk = this.world.setBlock(wx, wy, wz, blockId);
    if (!chunk) return false;

    const lx = wx - chunk.coord.cx * CHUNK_SIZE;
    const ly = wy - chunk.coord.cy * CHUNK_SIZE;
    const lz = wz - chunk.coord.cz * CHUNK_SIZE;
    this.saveManager.recordEdit(chunkKey(chunk.coord), localIndex(lx, ly, lz), blockId);

    const touched = relightAfterEdit(this.world, wx, wy, wz);
    this.scheduleMesh(chunk.coord);
    this.scheduleBorderNeighborRemesh(chunk.coord, lx, ly, lz);
    for (const coord of touched) this.scheduleMesh(coord);
    return true;
  }

  /**
   * Re-meshes one chunk (used both for initial load and after an edit). A
   * request for a chunk whose job hasn't reached a worker yet is a no-op —
   * the worker will read the chunk's latest data when it starts. One that
   * arrives after that is remembered and re-run when the current pass lands,
   * so an edit made mid-mesh is never lost.
   */
  scheduleMesh(coord: ChunkCoord): void {
    const key = chunkKey(coord);
    const chunk = this.world.getChunk(coord);
    if (!chunk) return;
    const existing = this.pendingMeshes.get(key);
    if (existing && existing.chunk === chunk) {
      if (existing.dispatched) existing.remesh = true;
      return;
    }
    const job: MeshJob = { chunk, dispatched: false, remesh: false };
    this.pendingMeshes.set(key, job);
    void this.runMeshJob(key, job);
  }

  private boundaryLayers({ cx, cy, cz }: ChunkCoord): BoundaryLayers {
    const px = this.world.getChunk({ cx: cx + 1, cy, cz });
    const nx = this.world.getChunk({ cx: cx - 1, cy, cz });
    const py = this.world.getChunk({ cx, cy: cy + 1, cz });
    const ny = this.world.getChunk({ cx, cy: cy - 1, cz });
    const pz = this.world.getChunk({ cx, cy, cz: cz + 1 });
    const nz = this.world.getChunk({ cx, cy, cz: cz - 1 });
    return {
      px: px ? extractLayer(px, "x", 0) : null,
      nx: nx ? extractLayer(nx, "x", CHUNK_SIZE - 1) : null,
      py: py ? extractLayer(py, "y", 0) : null,
      ny: ny ? extractLayer(ny, "y", CHUNK_SIZE - 1) : null,
      pz: pz ? extractLayer(pz, "z", 0) : null,
      nz: nz ? extractLayer(nz, "z", CHUNK_SIZE - 1) : null,
    };
  }

  private async runMeshJob(key: string, job: MeshJob): Promise<void> {
    const { chunk } = job;
    const { cx, cy, cz } = chunk.coord;

    let result;
    try {
      result = await this.meshPool.run((api) => {
        // Read at dispatch, not when the job was queued, so a long queue never meshes stale data.
        job.dispatched = true;
        return api.meshChunk(chunk.blocks, chunk.skyLight, this.boundaryLayers(chunk.coord), cx, cy, cz);
      });
    } catch (err) {
      if (this.pendingMeshes.get(key) === job) this.pendingMeshes.delete(key);
      console.error(`Meshing chunk ${key} failed`, err);
      return;
    }

    // Evicted (or evicted and reloaded as a new Chunk) while the worker was busy: nothing to show.
    if (this.pendingMeshes.get(key) !== job) return;
    this.pendingMeshes.delete(key);

    chunk.dirty = false;
    this.renderer.update(key, chunk.coord, result);
    if (job.remesh) this.scheduleMesh(chunk.coord);
  }

  dispose(): void {
    this.terrainPool.dispose();
    this.meshPool.dispose();
    this.renderer.dispose();
  }
}
