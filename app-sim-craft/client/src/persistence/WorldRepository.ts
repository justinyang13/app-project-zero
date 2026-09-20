// Every read and write of a *named* world's rows in IndexedDB, by world id —
// worlds, their chunk diffs and player state. This is the only module that
// knows the on-disk layout: chunk rows live under a `${worldId}:${coordKey}`
// composite key (world-scoped, so two named worlds can never collide on the
// same chunk coordinate) and player state under the world id. SaveManager
// drives it during play; worldExport, worldSelection and worldNames build on it.
import type { PlayerSnapshot } from "../core/playerState";
import { hashSeedString } from "../worldgen/noise";
import { openSimCraftDB, type PlayerStateRecord, type WorldRecord } from "./db";

export const SCHEMA_VERSION = 1;

/** Sparse (localIndex, blockId) pairs — a chunk's edits on top of generated terrain. */
export type ChunkOverrides = [number, number][];

export interface StoredChunk {
  coordKey: string; // "cx,cy,cz"
  overrides: ChunkOverrides;
  schemaVersion: number;
}

/** Everything stored for one world. */
export interface WorldData {
  record: WorldRecord;
  playerState: PlayerStateRecord | null;
  chunks: StoredChunk[];
}

function chunkRowKey(worldId: string, coordKey: string): string {
  return `${worldId}:${coordKey}`;
}

function coordKeyOf(worldId: string, rowKey: string): string {
  return rowKey.slice(worldId.length + 1);
}

export async function listWorlds(): Promise<WorldRecord[]> {
  const db = await openSimCraftDB();
  return db.getAll("worlds");
}

export async function getWorld(worldId: string): Promise<WorldRecord | undefined> {
  const db = await openSimCraftDB();
  return db.get("worlds", worldId);
}

function newWorldSeed(): number {
  return hashSeedString(crypto.getRandomValues(new Uint32Array(2)).join("-"));
}

/** Loads a world's record, creating it (with a fresh random seed) if it doesn't exist, and stamps it as just played. */
export async function openWorld(worldId: string): Promise<{ record: WorldRecord; isNew: boolean }> {
  const db = await openSimCraftDB();
  let record = await db.get("worlds", worldId);
  const isNew = !record;
  if (!record) {
    record = {
      id: worldId,
      name: worldId,
      seed: newWorldSeed(),
      worldType: "standard",
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
      schemaVersion: SCHEMA_VERSION,
    };
  } else {
    record.lastPlayedAt = Date.now();
  }
  await db.put("worlds", record);
  return { record, isNew };
}

/** Every chunk's saved edits for a world, keyed by chunk coordinate ("cx,cy,cz"). */
export async function loadChunkOverrides(worldId: string): Promise<Map<string, ChunkOverrides>> {
  const db = await openSimCraftDB();
  const rows = await db.getAllFromIndex("chunks", "worldId", worldId);
  return new Map(rows.map((row) => [coordKeyOf(worldId, row.key), row.overrides]));
}

export async function saveChunkOverrides(worldId: string, coordKey: string, overrides: ChunkOverrides): Promise<void> {
  const db = await openSimCraftDB();
  await db.put("chunks", { key: chunkRowKey(worldId, coordKey), worldId, overrides, schemaVersion: SCHEMA_VERSION });
}

export async function loadPlayerSnapshot(worldId: string): Promise<PlayerSnapshot | null> {
  const db = await openSimCraftDB();
  const row = await db.get("playerState", worldId);
  if (!row) return null;
  // Rows saved before markers/torches existed simply lack them.
  return {
    position: row.position,
    yaw: row.yaw,
    pitch: row.pitch,
    flying: row.flying,
    selectedHotbarIndex: row.selectedHotbarIndex,
    markers: row.markers ? [...row.markers] : [],
    torches: row.torches ? [...row.torches] : [],
  };
}

export async function savePlayerSnapshot(worldId: string, snapshot: PlayerSnapshot): Promise<void> {
  const db = await openSimCraftDB();
  await db.put("playerState", { ...snapshot, worldId, schemaVersion: SCHEMA_VERSION });
}

/** Reads everything stored for a world; throws if there is no such world. */
export async function readWorldData(worldId: string): Promise<WorldData> {
  const db = await openSimCraftDB();
  const record = await db.get("worlds", worldId);
  if (!record) throw new Error(`No local world named "${worldId}" to export.`);
  const playerState = (await db.get("playerState", worldId)) ?? null;
  const rows = await db.getAllFromIndex("chunks", "worldId", worldId);
  return {
    record,
    playerState,
    chunks: rows.map((row) => ({ coordKey: coordKeyOf(worldId, row.key), overrides: row.overrides, schemaVersion: row.schemaVersion })),
  };
}

/**
 * Overwrites everything stored under `worldId` with `data` — used by "pull
 * from cloud". Existing chunk rows are fully replaced (not merged) so a pull
 * can't leave stale local-only edits mixed in with the cloud copy. One
 * transaction: a failure partway through leaves the previous local data
 * untouched rather than half-overwritten.
 */
export async function replaceWorldData(worldId: string, data: WorldData): Promise<void> {
  const db = await openSimCraftDB();
  const tx = db.transaction(["worlds", "playerState", "chunks"], "readwrite");
  const chunksStore = tx.objectStore("chunks");

  await tx.objectStore("worlds").put({ ...data.record, id: worldId, name: worldId });

  const existingKeys = await chunksStore.index("worldId").getAllKeys(IDBKeyRange.only(worldId));
  for (const key of existingKeys) await chunksStore.delete(key);
  for (const chunk of data.chunks) {
    await chunksStore.put({
      key: chunkRowKey(worldId, chunk.coordKey),
      worldId,
      overrides: chunk.overrides,
      schemaVersion: chunk.schemaVersion,
    });
  }

  if (data.playerState) await tx.objectStore("playerState").put({ ...data.playerState, worldId });
  else await tx.objectStore("playerState").delete(worldId);

  await tx.done;
}

/**
 * Atomically renames a world record and re-keys every chunk/player-state row
 * that belongs to it. All reads and writes happen inside one IndexedDB
 * transaction, so if anything throws partway through, IndexedDB aborts the
 * whole transaction and nothing is left half-migrated. Callers are
 * responsible for making sure no SaveManager is still actively writing under
 * `oldId` while this runs (flush + dispose it first).
 */
export async function renameWorld(oldId: string, newId: string): Promise<void> {
  if (oldId === newId) return;
  const db = await openSimCraftDB();
  const tx = db.transaction(["worlds", "playerState", "chunks"], "readwrite");
  const worldsStore = tx.objectStore("worlds");
  const playerStore = tx.objectStore("playerState");
  const chunksStore = tx.objectStore("chunks");

  const worldRecord = await worldsStore.get(oldId);
  if (!worldRecord) throw new Error(`Cannot rename: no local world found with id "${oldId}".`);
  if (await worldsStore.get(newId)) throw new Error(`Cannot rename: a local world named "${newId}" already exists.`);

  await worldsStore.delete(oldId);
  await worldsStore.put({ ...worldRecord, id: newId, name: newId });

  const playerRecord = await playerStore.get(oldId);
  if (playerRecord) {
    await playerStore.delete(oldId);
    await playerStore.put({ ...playerRecord, worldId: newId });
  }

  // Read the full set of this world's chunk rows up front (rather than mutating while cursoring the
  // same index range) so the rewrite below can't observe its own writes mid-iteration.
  const chunkRecords = await chunksStore.index("worldId").getAll(IDBKeyRange.only(oldId));
  for (const rec of chunkRecords) {
    await chunksStore.delete(rec.key);
    await chunksStore.put({ ...rec, key: chunkRowKey(newId, coordKeyOf(oldId, rec.key)), worldId: newId });
  }

  await tx.done;
}
