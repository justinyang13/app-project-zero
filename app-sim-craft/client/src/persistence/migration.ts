// Resolves which named local world the app should load on startup, and
// migrates the pre-multi-world single "default" save into a chosen name
// the first time this feature runs against an older save. See
// spec-equivalent design notes in the PR: this is deliberately run
// *before* SaveManager.load()/GameLoop.create() ever starts an autosave
// timer for the target worldId, so there is no window where a periodic
// autosave could race the rename transaction below.
import { openSimCraftDB, type WorldRecord } from "./db";
import { isValidSlug, randomSlug, slugify } from "./slug";

/** The fixed id every world was saved under before named multi-world support existed. */
export const LEGACY_WORLD_ID = "default";

const ACTIVE_WORLD_KEY = "simcraft:activeWorldId";

export type WorldResolution =
  | { needsNaming: false; worldId: string }
  | { needsNaming: true; suggestedName: string; legacyWorldId: string | null };

function readActiveWorldId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_WORLD_KEY);
  } catch {
    return null;
  }
}

function writeActiveWorldId(worldId: string): void {
  try {
    localStorage.setItem(ACTIVE_WORLD_KEY, worldId);
  } catch {
    // Private browsing / storage disabled — the naming modal will just
    // reappear next launch, which is a mild annoyance, not data loss.
  }
}

export async function listWorlds(): Promise<WorldRecord[]> {
  const db = await openSimCraftDB();
  return db.getAll("worlds");
}

/**
 * Figures out which world to load without touching any game state.
 * - An already-chosen, still-existing world -> load it directly (no modal).
 * - A pre-migration save under LEGACY_WORLD_ID -> caller must show the
 *   naming modal and then call finalizeWorldChoice with legacyWorldId set.
 * - Neither -> true first run, same modal, legacyWorldId null.
 */
export async function resolveActiveWorldId(): Promise<WorldResolution> {
  const db = await openSimCraftDB();

  const stored = readActiveWorldId();
  if (stored) {
    const record = await db.get("worlds", stored);
    if (record) return { needsNaming: false, worldId: stored };
    // Stale pointer (e.g. IndexedDB cleared out from under localStorage) — fall through and re-resolve.
  }

  const legacy = await db.get("worlds", LEGACY_WORLD_ID);
  return {
    needsNaming: true,
    suggestedName: randomSlug(),
    legacyWorldId: legacy ? LEGACY_WORLD_ID : null,
  };
}

export async function worldNameAvailable(name: string, excludingId: string | null = null): Promise<boolean> {
  const worlds = await listWorlds();
  return !worlds.some((w) => w.id === name && w.id !== excludingId);
}

export interface NameValidationError {
  message: string;
}

/** Validates a raw user-typed name against slug rules and local uniqueness, returning the normalized slug or an error — never both. */
export async function validateWorldName(
  raw: string,
  excludingId: string | null = null,
): Promise<{ slug: string; error: null } | { slug: null; error: NameValidationError }> {
  const slug = slugify(raw);
  if (!slug || !isValidSlug(slug)) {
    return { slug: null, error: { message: "Name must contain at least one letter or number." } };
  }
  const available = await worldNameAvailable(slug, excludingId);
  if (!available) {
    return { slug: null, error: { message: `A local world named "${slug}" already exists.` } };
  }
  return { slug, error: null };
}

/**
 * Atomically renames a world record and re-keys every chunk/player-state
 * row that belongs to it. All reads and writes happen inside one IndexedDB
 * transaction, so if anything throws partway through, IndexedDB aborts the
 * whole transaction and nothing is left half-migrated. Callers are
 * responsible for making sure no SaveManager is still actively writing
 * under `oldId` while this runs (flush + dispose it first).
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

  // Read the full set of this world's chunk rows up front (rather than
  // mutating while cursoring the same index range) so the rewrite below
  // can't observe its own writes mid-iteration.
  const chunkRecords = await chunksStore.index("worldId").getAll(IDBKeyRange.only(oldId));
  for (const rec of chunkRecords) {
    const coordKey = rec.key.slice(oldId.length + 1);
    await chunksStore.delete(rec.key);
    await chunksStore.put({ ...rec, key: `${newId}:${coordKey}`, worldId: newId });
  }

  await tx.done;
}

/**
 * Called once the naming modal is confirmed. For a first-run name, there
 * is nothing to migrate yet (SaveManager.load will create the WorldRecord
 * lazily); for a legacy-save name, this performs the atomic rename first.
 * Either way, records the choice as the active world for future launches.
 */
export async function finalizeWorldChoice(name: string, legacyWorldId: string | null): Promise<string> {
  if (legacyWorldId) {
    await renameWorld(legacyWorldId, name);
  }
  writeActiveWorldId(name);
  return name;
}

/** Used by "switch world" / "create new world" — no rename involved, just changes which world loads next. */
export function setActiveWorldId(worldId: string): void {
  writeActiveWorldId(worldId);
}

export function getActiveWorldIdSync(): string | null {
  return readActiveWorldId();
}
