import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto"; // registers IDBKeyRange/IDBRequest/etc globals once
import { IDBFactory } from "fake-indexeddb";

beforeEach(() => {
  vi.resetModules();
  globalThis.indexedDB = new IDBFactory(); // fresh, empty backing store per test
});

describe("world export/import round trip", () => {
  it("round-trips world data through the export blob byte-for-byte where it matters", async () => {
    const { openSimCraftDB } = await import("./db");
    const { exportWorld, importWorld } = await import("./worldExport");

    const db = await openSimCraftDB();
    await db.put("worlds", {
      id: "test-world",
      name: "test-world",
      seed: 42,
      worldType: "standard",
      createdAt: 1000,
      lastPlayedAt: 2000,
      schemaVersion: 1,
    });
    await db.put("playerState", {
      worldId: "test-world",
      position: { x: 1, y: 2, z: 3 },
      yaw: 0.5,
      pitch: 0.1,
      flying: false,
      selectedHotbarIndex: 2,
      markers: [{ x: 5, z: 5, label: "Home" }],
      torches: [{ x: 1, y: 2, z: 3 }],
      schemaVersion: 1,
    });
    await db.put("chunks", { key: "test-world:0,0,0", worldId: "test-world", overrides: [[1, 5], [2, 6]], schemaVersion: 1 });
    await db.put("chunks", { key: "test-world:1,0,0", worldId: "test-world", overrides: [[3, 7]], schemaVersion: 1 });

    const blob = await exportWorld("test-world");
    expect(blob.worldRecord).toEqual({ name: "test-world", seed: 42, worldType: "standard", createdAt: 1000, lastPlayedAt: 2000, schemaVersion: 1 });
    expect(blob.markers).toEqual([{ x: 5, z: 5, label: "Home" }]);
    expect(blob.torches).toEqual([{ x: 1, y: 2, z: 3 }]);
    expect(blob.chunkDiffs.sort((a, b) => a.coordKey.localeCompare(b.coordKey))).toEqual([
      { coordKey: "0,0,0", overrides: [[1, 5], [2, 6]], schemaVersion: 1 },
      { coordKey: "1,0,0", overrides: [[3, 7]], schemaVersion: 1 },
    ]);

    // Round-trip through JSON, as it would travel over the wire to/from the sync server.
    const roundTripped = JSON.parse(JSON.stringify(blob));

    await importWorld("imported-world", roundTripped);

    const importedWorld = await db.get("worlds", "imported-world");
    const importedPlayer = await db.get("playerState", "imported-world");
    const importedChunks = await db.getAllFromIndex("chunks", "worldId", "imported-world");

    expect(importedWorld).toEqual({ id: "imported-world", name: "imported-world", seed: 42, worldType: "standard", createdAt: 1000, lastPlayedAt: 2000, schemaVersion: 1 });
    expect(importedPlayer?.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(importedPlayer?.markers).toEqual([{ x: 5, z: 5, label: "Home" }]);
    expect(importedPlayer?.torches).toEqual([{ x: 1, y: 2, z: 3 }]);
    expect(importedChunks).toHaveLength(2);
    expect(importedChunks.map((c) => c.key).sort()).toEqual(["imported-world:0,0,0", "imported-world:1,0,0"]);
  });

  it("a pull (import) replaces existing local chunk rows rather than merging with them", async () => {
    const { openSimCraftDB } = await import("./db");
    const { exportWorld, importWorld } = await import("./worldExport");

    const db = await openSimCraftDB();
    await db.put("worlds", { id: "w", name: "w", seed: 1, worldType: "standard", createdAt: 1, lastPlayedAt: 1, schemaVersion: 1 });
    // A chunk edit that only exists locally, not in the incoming blob.
    await db.put("chunks", { key: "w:9,9,9", worldId: "w", overrides: [[0, 1]], schemaVersion: 1 });

    const incoming = await exportWorld("w"); // has only the one chunk above
    incoming.chunkDiffs = [{ coordKey: "0,0,0", overrides: [[5, 5]], schemaVersion: 1 }];

    await importWorld("w", incoming);

    const chunks = await db.getAllFromIndex("chunks", "worldId", "w");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].key).toBe("w:0,0,0");
  });
});
