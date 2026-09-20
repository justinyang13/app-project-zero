// Whole-world export/import for cloud sync (see sync/syncClient.ts) and for
// anything else that needs a portable snapshot of a *named* local world. The
// blob is the stored WorldData reshaped for the wire; because it is derived by
// destructuring the record types rather than copying fields one by one, a
// field added to a record travels through automatically.
import type { MapMarker, PlacedTorch } from "../core/playerState";
import type { PlayerStateRecord, WorldRecord } from "./db";
import { readWorldData, replaceWorldData, type StoredChunk, type WorldData } from "./WorldRepository";

export interface WorldExportBlob {
  worldRecord: Omit<WorldRecord, "id">;
  playerState: Omit<PlayerStateRecord, "worldId" | "markers" | "torches"> | null;
  chunkDiffs: StoredChunk[];
  markers: MapMarker[];
  torches: PlacedTorch[];
}

export async function exportWorld(worldId: string): Promise<WorldExportBlob> {
  const { record, playerState, chunks } = await readWorldData(worldId);
  const { id: _id, ...worldRecord } = record;
  if (!playerState) return { worldRecord, playerState: null, chunkDiffs: chunks, markers: [], torches: [] };
  const { worldId: _worldId, markers, torches, ...player } = playerState;
  return { worldRecord, playerState: player, chunkDiffs: chunks, markers: markers ?? [], torches: torches ?? [] };
}

/** Overwrites everything stored under `worldId` with `blob` — used by "pull from cloud" (see WorldRepository.replaceWorldData). */
export async function importWorld(worldId: string, blob: WorldExportBlob): Promise<void> {
  const data: WorldData = {
    record: { ...blob.worldRecord, id: worldId },
    playerState: blob.playerState ? { ...blob.playerState, worldId, markers: blob.markers, torches: blob.torches } : null,
    chunks: blob.chunkDiffs,
  };
  await replaceWorldData(worldId, data);
}
