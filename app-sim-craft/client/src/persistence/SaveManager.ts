// Autosave + explicit chunk/player persistence, per
// spec/14-persistence-saves.md §2-3. A single fixed-id "default" world
// for now (no World Select screen yet — see db.ts's header note).
import { hashSeedString } from "../engine/worldgen/noise";
import { openSimCraftDB, type PlayerStateRecord } from "./db";
import type { Chunk } from "../engine/Chunk";

const WORLD_ID = "default";
const SCHEMA_VERSION = 1;
const AUTOSAVE_INTERVAL_MS = 2 * 60 * 1000; // spec default: every 2 real-world minutes

export interface LoadedWorldInfo {
  seed: number;
  isNewWorld: boolean;
  playerState: PlayerStateRecord | null;
}

export class SaveManager {
  private db!: Awaited<ReturnType<typeof openSimCraftDB>>;
  private readonly chunkDiffs = new Map<string, Map<number, number>>();
  private readonly dirtyChunkKeys = new Set<string>();
  private autosaveHandle: ReturnType<typeof setInterval> | null = null;

  async load(): Promise<LoadedWorldInfo> {
    this.db = await openSimCraftDB();

    let record = await this.db.get("worlds", WORLD_ID);
    let isNewWorld = false;
    if (!record) {
      isNewWorld = true;
      const seedString = crypto.getRandomValues(new Uint32Array(2)).join("-");
      record = {
        id: WORLD_ID,
        name: "World",
        seed: hashSeedString(seedString),
        worldType: "standard",
        createdAt: Date.now(),
        lastPlayedAt: Date.now(),
        schemaVersion: SCHEMA_VERSION,
      };
      await this.db.put("worlds", record);
    } else {
      record.lastPlayedAt = Date.now();
      await this.db.put("worlds", record);
    }

    const allChunkRecords = await this.db.getAll("chunks");
    for (const rec of allChunkRecords) {
      if (!rec.key.startsWith(`${WORLD_ID}:`)) continue;
      const coordKey = rec.key.slice(WORLD_ID.length + 1);
      this.chunkDiffs.set(coordKey, new Map(rec.overrides));
    }

    const playerState = (await this.db.get("playerState", WORLD_ID)) ?? null;

    this.startAutosave();
    window.addEventListener("beforeunload", this.flushSync);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    return { seed: record.seed, isNewWorld, playerState };
  }

  getChunkDiff(coordKey: string): [number, number][] | null {
    const diff = this.chunkDiffs.get(coordKey);
    return diff ? [...diff.entries()] : null;
  }

  recordEdit(coordKey: string, localIndex: number, blockId: number): void {
    let diff = this.chunkDiffs.get(coordKey);
    if (!diff) {
      diff = new Map();
      this.chunkDiffs.set(coordKey, diff);
    }
    diff.set(localIndex, blockId);
    this.dirtyChunkKeys.add(coordKey);
  }

  /** Immediately flushes one chunk's diff (used on eviction, so unloading a chunk never loses an edit). */
  async saveChunkNow(chunk: Chunk): Promise<void> {
    const coordKey = `${chunk.coord.cx},${chunk.coord.cy},${chunk.coord.cz}`;
    this.dirtyChunkKeys.delete(coordKey);
    const diff = this.chunkDiffs.get(coordKey);
    if (!diff) return;
    await this.db.put("chunks", {
      key: `${WORLD_ID}:${coordKey}`,
      worldId: WORLD_ID,
      overrides: [...diff.entries()],
      schemaVersion: SCHEMA_VERSION,
    });
  }

  async savePlayerState(state: Omit<PlayerStateRecord, "worldId" | "schemaVersion">): Promise<void> {
    await this.db.put("playerState", { ...state, worldId: WORLD_ID, schemaVersion: SCHEMA_VERSION });
  }

  /** Flushes every dirty chunk diff — the autosave-timer and pause-menu "Save Now" path. */
  async flushDirtyChunks(): Promise<void> {
    const keys = [...this.dirtyChunkKeys];
    this.dirtyChunkKeys.clear();
    await Promise.all(
      keys.map((coordKey) => {
        const diff = this.chunkDiffs.get(coordKey);
        if (!diff) return Promise.resolve();
        return this.db.put("chunks", {
          key: `${WORLD_ID}:${coordKey}`,
          worldId: WORLD_ID,
          overrides: [...diff.entries()],
          schemaVersion: SCHEMA_VERSION,
        });
      }),
    );
  }

  private startAutosave(): void {
    this.autosaveHandle = setInterval(() => {
      void this.flushDirtyChunks();
    }, AUTOSAVE_INTERVAL_MS);
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") void this.flushDirtyChunks();
  };

  // Best-effort — IndexedDB writes are async and beforeunload can't
  // reliably await them, but queuing the write gives the browser a
  // chance to finish it before the page actually unloads.
  private flushSync = (): void => {
    void this.flushDirtyChunks();
  };

  dispose(): void {
    if (this.autosaveHandle) clearInterval(this.autosaveHandle);
    window.removeEventListener("beforeunload", this.flushSync);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
  }
}
