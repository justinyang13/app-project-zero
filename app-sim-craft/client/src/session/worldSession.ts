// The flows that change or move a world — switch, create, rename, save to /
// load from the cloud. They live here, not in a component, because they are
// game-session logic: they have to flush and shut down the running game before
// touching its stored rows, and nearly all end by reloading the page.
//
// Every flow ends in a full page reload rather than hot-swapping the scene to
// a different world in place — a far larger change for no real benefit, since a
// reload already re-runs the exact same load path a normal launch uses.
// flushAll() + dispose() first guarantees nothing writes under the old id after
// rows for the new one start moving.
import { slugify } from "../core/slug";
import { listWorlds, openWorld, renameWorld } from "../persistence/WorldRepository";
import { setActiveWorldId } from "../persistence/worldSelection";
import { validateWorldName } from "../persistence/worldNames";
import { exportWorld, importWorld } from "../persistence/worldExport";
import { pullMap, pushMap, SYNC_SERVER_URL } from "../sync/syncClient";
import { getActiveGame } from "./activeGame";

/** The other local worlds one could switch to. */
export async function listOtherWorlds(currentWorldId: string | null): Promise<{ id: string }[]> {
  const worlds = await listWorlds();
  return worlds.filter((w) => w.id !== currentWorldId).map((w) => ({ id: w.id }));
}

/** How a flow ended: the page is reloading into another world, or it finished (with an error and/or a status line for the UI to show). */
export type FlowResult = { outcome: "reloading" } | { outcome: "finished"; error?: string; status?: string };

export const INVALID_MAP_NAME_ERROR = "Name must contain at least one letter or number.";

async function prepareForReload(): Promise<void> {
  const game = getActiveGame();
  if (game) {
    await game.flushAll();
    game.dispose();
  }
}

async function reloadInto(worldId: string): Promise<FlowResult> {
  setActiveWorldId(worldId);
  window.location.reload();
  return { outcome: "reloading" };
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString();
}

export async function switchToWorld(targetId: string): Promise<FlowResult> {
  await prepareForReload();
  return reloadInto(targetId);
}

export async function createWorld(rawName: string): Promise<FlowResult> {
  const result = await validateWorldName(rawName);
  if (result.error) return { outcome: "finished", error: result.error.message };
  await prepareForReload();
  // The world has to exist before it can be the active one: startup treats a pointer to a
  // world with no stored record as stale and asks for a name instead of loading it.
  await openWorld(result.slug);
  return reloadInto(result.slug);
}

export async function renameCurrentWorld(worldId: string, rawName: string): Promise<FlowResult> {
  const result = await validateWorldName(rawName, worldId);
  if (result.error) return { outcome: "finished", error: result.error.message };
  await prepareForReload();
  try {
    await renameWorld(worldId, result.slug);
  } catch (err) {
    return { outcome: "finished", error: err instanceof Error ? err.message : "Rename failed." };
  }
  return reloadInto(result.slug);
}

/** Resolves the shared name box to a cloud/local map name, defaulting to the current map when left blank — null means what's typed can't be turned into a valid name. */
export function resolveMapName(typed: string, currentWorldId: string): string | null {
  const trimmed = typed.trim();
  if (!trimmed) return currentWorldId;
  return slugify(trimmed) || null;
}

export interface CloudPrompts {
  /** Shown while a step is in flight ("Saving...", ...). */
  onStatus(message: string): void;
  /** Ask before overwriting; return false to cancel. */
  confirm(message: string): boolean;
}

/** Saves the *current, live* map (flushed first) to the cloud slot `targetName` — so it doubles as "save as" when that differs from the current map's own name. */
export async function saveWorldToCloud(worldId: string, targetName: string, prompts: CloudPrompts): Promise<FlowResult> {
  prompts.onStatus("Checking for an existing cloud save...");
  await getActiveGame()?.flushAll();
  const blob = await exportWorld(worldId);

  const existing = await pullMap(SYNC_SERVER_URL, targetName);
  if (existing.ok) {
    const identical = JSON.stringify(existing.data.data) === JSON.stringify(blob);
    if (!identical) {
      const proceed = prompts.confirm(
        `Overwrite existing cloud save for "${targetName}"? Last updated ${formatTimestamp(existing.data.updatedAt)}.`,
      );
      if (!proceed) return { outcome: "finished", status: "Save cancelled." };
    }
  } else if (existing.error.kind !== "not-found") {
    return { outcome: "finished", status: `Save failed: ${existing.error.message}` };
  }

  prompts.onStatus("Saving...");
  const result = await pushMap(SYNC_SERVER_URL, targetName, blob);
  if (!result.ok) return { outcome: "finished", status: `Save failed: ${result.error.message}` };
  return { outcome: "finished", status: `Saved "${targetName}" at ${formatTimestamp(result.data.updatedAt)}.` };
}

/** Pulls the named cloud map into a local map of the same name (created fresh if it doesn't exist yet) and switches to it — not necessarily the map that's currently active. */
export async function loadWorldFromCloud(targetName: string, prompts: CloudPrompts): Promise<FlowResult> {
  if (!prompts.confirm(`This replaces your local copy of "${targetName}" with the cloud version — continue?`)) {
    return { outcome: "finished" };
  }
  prompts.onStatus("Loading...");
  const result = await pullMap(SYNC_SERVER_URL, targetName);
  if (!result.ok) return { outcome: "finished", status: `Load failed: ${result.error.message}` };

  await prepareForReload();
  await importWorld(targetName, result.data.data);
  return reloadInto(targetName);
}
