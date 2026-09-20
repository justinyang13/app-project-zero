// Autosave + explicit chunk/player persistence for the world being played, per
// spec/14-persistence-saves.md §2-3. Holds the live, in-memory chunk diffs and
// decides *when* things are written — an autosave timer, page hide/unload, and
// chunk eviction — while WorldRepository owns *how* (the on-disk layout).
// Operates on whichever named world id it's given at load(); see
// persistence/worldSelection.ts for how that id is resolved.
import { hashSeedString } from "../worldgen/noise";
import { chunkKey, type Chunk } from "../core/Chunk";
import type { PlayerSnapshot } from "../core/playerState";
import {
  loadChunkOverrides,
  loadPlayerSnapshot,
  openWorld,
  saveChunkOverrides,
  savePlayerSnapshot,
} from "./WorldRepository";

const AUTOSAVE_INTERVAL_MS = 2 * 60 * 1000; // spec default: every 2 real-world minutes

export interface LoadedWorldInfo {
  seed: number;
  isNewWorld: boolean;
  playerState: PlayerSnapshot | null;
}

function randomSeed(): number {
  return hashSeedString(crypto.getRandomValues(new Uint32Array(2)).join("-"));
}

export class SaveManager {
  private worldId!: string;
  private readonly chunkDiffs = new Map<string, Map<number, number>>();
  private readonly dirtyChunkKeys = new Set<string>();
  private playerStateProvider: (() => PlayerSnapshot) | null = null;
  private autosaveHandle: ReturnType<typeof setInterval> | null = null;

  async load(worldId: string): Promise<LoadedWorldInfo> {
    this.worldId = worldId;
    const { record, isNew } = await openWorld(worldId, randomSeed);

    for (const [coordKey, overrides] of await loadChunkOverrides(worldId)) {
      this.chunkDiffs.set(coordKey, new Map(overrides));
    }
    const playerState = await loadPlayerSnapshot(worldId);

    this.autosaveHandle = setInterval(() => void this.flushAll(), AUTOSAVE_INTERVAL_MS);
    // Best-effort — IndexedDB writes are async and beforeunload can't reliably await them, but
    // queuing the writes gives the browser a chance to finish them before the page actually unloads.
    window.addEventListener("beforeunload", this.handlePageLeaving);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    return { seed: record.seed, isNewWorld: isNew, playerState };
  }

  /** Registers where to read the live player state from whenever it needs saving. Set once by the game after load. */
  trackPlayerState(provider: () => PlayerSnapshot): void {
    this.playerStateProvider = provider;
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
    const coordKey = chunkKey(chunk.coord);
    this.dirtyChunkKeys.delete(coordKey);
    await this.writeChunk(coordKey);
  }

  /** Saves the live player state (position, look, hotbar, markers, torches). */
  async savePlayerState(): Promise<void> {
    if (!this.playerStateProvider) return;
    await savePlayerSnapshot(this.worldId, this.playerStateProvider());
  }

  /** Flushes every dirty chunk diff. */
  async flushDirtyChunks(): Promise<void> {
    const keys = [...this.dirtyChunkKeys];
    this.dirtyChunkKeys.clear();
    await Promise.all(keys.map((coordKey) => this.writeChunk(coordKey)));
  }

  /**
   * Awaits a full flush of player state + dirty chunk diffs. Unlike the
   * fire-and-forget saves on page-leave/dispose (the page may be gone before
   * those land), this is for operations that touch this world's rows right
   * afterward — switching/renaming/pushing a world — where a write racing in
   * after would be a real bug.
   */
  async flushAll(): Promise<void> {
    await this.savePlayerState();
    await this.flushDirtyChunks();
  }

  /** Final save, then stop listening. The writes are fire-and-forget: teardown can't wait for them. */
  dispose(): void {
    if (this.autosaveHandle) clearInterval(this.autosaveHandle);
    window.removeEventListener("beforeunload", this.handlePageLeaving);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    void this.flushAll();
  }

  private async writeChunk(coordKey: string): Promise<void> {
    const diff = this.chunkDiffs.get(coordKey);
    if (!diff) return;
    await saveChunkOverrides(this.worldId, coordKey, [...diff.entries()]);
  }

  private handlePageLeaving = (): void => {
    void this.flushAll();
  };

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") void this.flushAll();
  };
}
