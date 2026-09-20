// Which named local world the app loads on startup — the "active world"
// pointer (a per-browser convenience in localStorage) — and the one-time
// migration of the pre-multi-world single "default" save into a chosen name.
// This is deliberately run *before* SaveManager.load()/GameLoop.create() ever
// starts an autosave timer for the target world, so there is no window where a
// periodic autosave could race the rename transaction.
import { randomSlug } from "./slug";
import { getWorld, renameWorld } from "./WorldRepository";

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

/**
 * Figures out which world to load without touching any game state.
 * - An already-chosen, still-existing world -> load it directly (no modal).
 * - A pre-migration save under LEGACY_WORLD_ID -> caller must show the
 *   naming modal and then call finalizeWorldChoice with legacyWorldId set.
 * - Neither -> true first run, same modal, legacyWorldId null.
 */
export async function resolveActiveWorldId(): Promise<WorldResolution> {
  const stored = readActiveWorldId();
  if (stored && (await getWorld(stored))) return { needsNaming: false, worldId: stored };
  // A stale pointer (e.g. IndexedDB cleared out from under localStorage) falls through and is re-resolved.

  const legacy = await getWorld(LEGACY_WORLD_ID);
  return {
    needsNaming: true,
    suggestedName: randomSlug(),
    legacyWorldId: legacy ? LEGACY_WORLD_ID : null,
  };
}

/**
 * Called once the naming modal is confirmed. For a first-run name, there
 * is nothing to migrate yet (SaveManager.load will create the world lazily);
 * for a legacy-save name, this performs the atomic rename first.
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
