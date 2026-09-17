// Whole-world export/import for cloud sync (see sync/syncClient.ts) and
// for anything else that needs a portable snapshot of a *named* local
// world. Deliberately separate from SaveManager: SaveManager only ever
// operates on the single currently-active world, with an in-memory dirty
// diff cache tuned for live gameplay — it has no notion of reading or
// writing an arbitrary, possibly-not-loaded world by name, which is
// exactly what push/pull/export need. Both share the same on-disk
// `${worldId}:cx,cy,cz` chunk-key convention (see db.ts).
import { openSimCraftDB, type MapMarkerRecord, type TorchRecord, type WorldRecord } from "./db";

export interface WorldExportBlob {
  worldRecord: Omit<WorldRecord, "id">;
  playerState: {
    position: { x: number; y: number; z: number };
    yaw: number;
    pitch: number;
    flying: boolean;
    selectedHotbarIndex: number;
    schemaVersion: number;
  } | null;
  chunkDiffs: { coordKey: string; overrides: [number, number][]; schemaVersion: number }[];
  markers: MapMarkerRecord[];
  torches: TorchRecord[];
}

export async function exportWorld(worldId: string): Promise<WorldExportBlob> {
  const db = await openSimCraftDB();

  const worldRecord = await db.get("worlds", worldId);
  if (!worldRecord) throw new Error(`No local world named "${worldId}" to export.`);
  const worldRest: Omit<WorldRecord, "id"> = {
    name: worldRecord.name,
    seed: worldRecord.seed,
    worldType: worldRecord.worldType,
    createdAt: worldRecord.createdAt,
    lastPlayedAt: worldRecord.lastPlayedAt,
    schemaVersion: worldRecord.schemaVersion,
  };

  const playerRecord = await db.get("playerState", worldId);
  const chunkRecords = await db.getAllFromIndex("chunks", "worldId", worldId);

  return {
    worldRecord: worldRest,
    playerState: playerRecord
      ? {
          position: playerRecord.position,
          yaw: playerRecord.yaw,
          pitch: playerRecord.pitch,
          flying: playerRecord.flying,
          selectedHotbarIndex: playerRecord.selectedHotbarIndex,
          schemaVersion: playerRecord.schemaVersion,
        }
      : null,
    chunkDiffs: chunkRecords.map((rec) => ({
      coordKey: rec.key.slice(worldId.length + 1),
      overrides: rec.overrides,
      schemaVersion: rec.schemaVersion,
    })),
    markers: playerRecord?.markers ?? [],
    torches: playerRecord?.torches ?? [],
  };
}

/**
 * Overwrites everything IndexedDB has under `worldId` with `blob` — used
 * by "pull from cloud". Existing chunk rows for this world are fully
 * replaced (not merged) so a pull can't leave stale local-only edits
 * mixed in with the cloud copy. Runs as one transaction: a failure partway
 * through leaves the previous local data untouched rather than half-overwritten.
 */
export async function importWorld(worldId: string, blob: WorldExportBlob): Promise<void> {
  const db = await openSimCraftDB();
  const tx = db.transaction(["worlds", "playerState", "chunks"], "readwrite");
  const worldsStore = tx.objectStore("worlds");
  const playerStore = tx.objectStore("playerState");
  const chunksStore = tx.objectStore("chunks");

  await worldsStore.put({ ...blob.worldRecord, id: worldId, name: worldId });

  const existingKeys = await chunksStore.index("worldId").getAllKeys(IDBKeyRange.only(worldId));
  for (const key of existingKeys) await chunksStore.delete(key);
  for (const diff of blob.chunkDiffs) {
    await chunksStore.put({
      key: `${worldId}:${diff.coordKey}`,
      worldId,
      overrides: diff.overrides,
      schemaVersion: diff.schemaVersion,
    });
  }

  if (blob.playerState) {
    await playerStore.put({
      ...blob.playerState,
      worldId,
      markers: blob.markers,
      torches: blob.torches,
    });
  } else {
    await playerStore.delete(worldId);
  }

  await tx.done;
}
