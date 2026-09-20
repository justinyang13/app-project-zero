import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto"; // registers IDBKeyRange/IDBRequest/etc globals once
import { IDBFactory } from "fake-indexeddb";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

beforeEach(() => {
  vi.resetModules();
  globalThis.indexedDB = new IDBFactory();
  globalThis.localStorage = new MemoryStorage();
});

describe("legacy world migration", () => {
  it("renames the pre-multi-world default save and re-keys every associated record, losing and duplicating nothing", async () => {
    const { openSimCraftDB } = await import("./db");
    const { LEGACY_WORLD_ID, resolveActiveWorldId, finalizeWorldChoice } = await import("./worldSelection");

    const db = await openSimCraftDB();
    await db.put("worlds", {
      id: LEGACY_WORLD_ID,
      name: "World",
      seed: 777,
      worldType: "standard",
      createdAt: 111,
      lastPlayedAt: 222,
      schemaVersion: 1,
    });
    await db.put("playerState", {
      worldId: LEGACY_WORLD_ID,
      position: { x: 10, y: 20, z: 30 },
      yaw: 1,
      pitch: 2,
      flying: true,
      selectedHotbarIndex: 3,
      markers: [{ x: 1, z: 1, label: "Base" }],
      torches: [{ x: 2, y: 2, z: 2 }],
      schemaVersion: 1,
    });
    await db.put("chunks", { key: `${LEGACY_WORLD_ID}:0,0,0`, worldId: LEGACY_WORLD_ID, overrides: [[1, 9]], schemaVersion: 1 });
    await db.put("chunks", { key: `${LEGACY_WORLD_ID}:1,1,1`, worldId: LEGACY_WORLD_ID, overrides: [[2, 3], [4, 5]], schemaVersion: 1 });

    const resolution = await resolveActiveWorldId();
    if (!resolution.needsNaming) throw new Error("expected the legacy save to require naming");
    expect(resolution.legacyWorldId).toBe(LEGACY_WORLD_ID);

    await finalizeWorldChoice("brave-tiger-42", resolution.legacyWorldId);

    // Old id fully gone — no orphaned rows left under the pre-migration key format.
    expect(await db.get("worlds", LEGACY_WORLD_ID)).toBeUndefined();
    expect(await db.get("playerState", LEGACY_WORLD_ID)).toBeUndefined();
    expect(await db.getAllFromIndex("chunks", "worldId", LEGACY_WORLD_ID)).toHaveLength(0);

    // Everything survived intact under the new name.
    const world = await db.get("worlds", "brave-tiger-42");
    expect(world).toMatchObject({ id: "brave-tiger-42", name: "brave-tiger-42", seed: 777, createdAt: 111, lastPlayedAt: 222 });

    const player = await db.get("playerState", "brave-tiger-42");
    expect(player).toMatchObject({
      worldId: "brave-tiger-42",
      position: { x: 10, y: 20, z: 30 },
      flying: true,
      markers: [{ x: 1, z: 1, label: "Base" }],
      torches: [{ x: 2, y: 2, z: 2 }],
    });

    const chunks = await db.getAllFromIndex("chunks", "worldId", "brave-tiger-42");
    expect(chunks).toHaveLength(2);
    const byKey = new Map(chunks.map((c) => [c.key, c]));
    expect(byKey.get("brave-tiger-42:0,0,0")?.overrides).toEqual([[1, 9]]);
    expect(byKey.get("brave-tiger-42:1,1,1")?.overrides).toEqual([[2, 3], [4, 5]]);

    // Nothing duplicated anywhere in the store.
    expect(await db.getAll("chunks")).toHaveLength(2);
    expect(await db.getAll("worlds")).toHaveLength(1);

    // A later launch (same localStorage) goes straight to "ready", no modal.
    const secondResolution = await resolveActiveWorldId();
    expect(secondResolution).toEqual({ needsNaming: false, worldId: "brave-tiger-42" });
  });

  it("a true first run (no legacy save, nothing chosen yet) needs naming with legacyWorldId null", async () => {
    const { resolveActiveWorldId } = await import("./worldSelection");
    const resolution = await resolveActiveWorldId();
    if (!resolution.needsNaming) throw new Error("expected first run to require naming");
    expect(resolution.legacyWorldId).toBeNull();
    expect(resolution.suggestedName).toMatch(/^[a-z]+-[a-z]+-\d+$/);
  });

  it("an already-named world (post-migration normal case) skips the naming modal entirely", async () => {
    const { openSimCraftDB } = await import("./db");
    const { finalizeWorldChoice, resolveActiveWorldId } = await import("./worldSelection");

    const db = await openSimCraftDB();
    await db.put("worlds", { id: "my-castle", name: "my-castle", seed: 1, worldType: "standard", createdAt: 1, lastPlayedAt: 1, schemaVersion: 1 });
    await finalizeWorldChoice("my-castle", null);

    const resolution = await resolveActiveWorldId();
    expect(resolution).toEqual({ needsNaming: false, worldId: "my-castle" });
  });

  it("rejects a duplicate name and an empty/invalid name with a clear inline error", async () => {
    const { openSimCraftDB } = await import("./db");
    const { validateWorldName } = await import("./worldNames");

    const db = await openSimCraftDB();
    await db.put("worlds", { id: "taken", name: "taken", seed: 1, worldType: "standard", createdAt: 1, lastPlayedAt: 1, schemaVersion: 1 });

    const dup = await validateWorldName("Taken");
    expect(dup.error?.message).toMatch(/already exists/);

    const empty = await validateWorldName("   ");
    expect(empty.error).not.toBeNull();

    const ok = await validateWorldName("Brand New World!");
    expect(ok.slug).toBe("brand-new-world");
  });
});
