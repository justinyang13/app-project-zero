import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface MapRow {
  name: string;
  data: string;
  updated_at: number;
}

/** Opens (creating if needed) the sqlite file at `path` and ensures the schema exists. Pass ":memory:" or a temp file path in tests. */
export function createDb(path: string): Database.Database {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS maps (
      name TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  return db;
}

export function getMap(db: Database.Database, name: string): MapRow | undefined {
  return db.prepare("SELECT name, data, updated_at FROM maps WHERE name = ?").get(name) as MapRow | undefined;
}

export function upsertMap(db: Database.Database, name: string, data: string, updatedAt: number): void {
  db.prepare(
    `INSERT INTO maps (name, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).run(name, data, updatedAt);
}
