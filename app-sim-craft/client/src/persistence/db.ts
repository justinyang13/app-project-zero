// IndexedDB schema per spec/14-persistence-saves.md §4 and
// spec/23-data-schema-reference.md §8. Supports multiple named local
// worlds (see persistence/worldSelection.ts for how the previous single
// always-on "default" world upgrades into this) — chunk diffs stored as
// sparse (localIndex, blockId) pairs only (no automatic full-array
// fallback past the spec's ~40%-modified threshold — a documented
// simplification, fine at this scale since heavily-sculpted single
// chunks are rare early on).
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { MapMarker, PlacedTorch } from "../core/playerState";

export interface WorldRecord {
  id: string;
  name: string;
  seed: number;
  worldType: string;
  createdAt: number;
  lastPlayedAt: number;
  schemaVersion: number;
}

export interface PlayerStateRecord {
  worldId: string;
  position: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  flying: boolean;
  selectedHotbarIndex: number;
  // Optional so records saved before this field existed still load —
  // the repository defaults them to [] when reading.
  markers?: MapMarker[];
  torches?: PlacedTorch[];
  schemaVersion: number;
}

export interface ChunkDiffRecord {
  key: string; // `${worldId}:cx,cy,cz` — world-scoped so two named worlds can never collide on the same chunk coordinate.
  worldId: string;
  overrides: [number, number][]; // (localIndex, blockId)
  schemaVersion: number;
}

interface SimCraftDB extends DBSchema {
  worlds: { key: string; value: WorldRecord };
  playerState: { key: string; value: PlayerStateRecord };
  chunks: { key: string; value: ChunkDiffRecord; indexes: { worldId: string } };
}

let dbPromise: Promise<IDBPDatabase<SimCraftDB>> | null = null;

export function openSimCraftDB(): Promise<IDBPDatabase<SimCraftDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SimCraftDB>("simcraft", 2, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          db.createObjectStore("worlds", { keyPath: "id" });
          db.createObjectStore("playerState", { keyPath: "worldId" });
          db.createObjectStore("chunks", { keyPath: "key" });
        }
        if (oldVersion < 2) {
          // Chunk rows were already stored under a `${worldId}:cx,cy,cz`
          // composite key (see the old SaveManager's fixed WORLD_ID
          // prefix), just without an index to query by worldId — added
          // here so per-world loads/exports/renames don't need to
          // getAll() and filter every chunk row in the database.
          transaction.objectStore("chunks").createIndex("worldId", "worldId");
        }
      },
    });
  }
  return dbPromise;
}
