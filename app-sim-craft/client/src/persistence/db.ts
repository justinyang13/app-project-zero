// IndexedDB schema per spec/14-persistence-saves.md §4 and
// spec/23-data-schema-reference.md §8. Scoped down: a single always-on
// default world (no World Select screen yet — that's Phase 3, see
// spec/22-roadmap-milestones.md), and chunk diffs stored as sparse
// (localIndex, blockId) pairs only (no automatic full-array fallback
// past the spec's ~40%-modified threshold — a documented simplification,
// fine at this scale since heavily-sculpted single chunks are rare early
// on).
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

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
  schemaVersion: number;
}

export interface ChunkDiffRecord {
  key: string; // "cx,cy,cz"
  worldId: string;
  overrides: [number, number][]; // (localIndex, blockId)
  schemaVersion: number;
}

interface SimCraftDB extends DBSchema {
  worlds: { key: string; value: WorldRecord };
  playerState: { key: string; value: PlayerStateRecord };
  chunks: { key: string; value: ChunkDiffRecord };
}

let dbPromise: Promise<IDBPDatabase<SimCraftDB>> | null = null;

export function openSimCraftDB(): Promise<IDBPDatabase<SimCraftDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SimCraftDB>("simcraft", 1, {
      upgrade(db) {
        db.createObjectStore("worlds", { keyPath: "id" });
        db.createObjectStore("playerState", { keyPath: "worldId" });
        db.createObjectStore("chunks", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}
