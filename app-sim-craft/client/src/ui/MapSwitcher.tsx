import { useEffect, useState } from "react";
import { useWorldStore } from "../state/worldStore";
import { getActiveGameLoop } from "../engine/activeGameLoop";
import { listWorlds, renameWorld } from "../persistence/WorldRepository";
import { setActiveWorldId } from "../persistence/worldSelection";
import { validateWorldName } from "../persistence/worldNames";
import { slugify } from "../persistence/slug";
import { exportWorld, importWorld } from "../persistence/worldExport";
import { pullMap, pushMap, SYNC_SERVER_URL } from "../sync/syncClient";
import type { WorldRecord } from "../persistence/db";
import { useIsTouchDevice } from "../hooks/useIsTouchDevice";

// Every flow below ends in a full page reload rather than trying to hot-
// swap GameLoop's THREE scene/world to a different id in place — that's a
// far larger change for no real benefit here, since a reload already
// re-runs the exact same load path a normal launch uses. flushAll() +
// dispose() first guarantees nothing writes under the old id after we've
// started moving/creating rows for the new one.
async function prepareForReload(): Promise<void> {
  const loop = getActiveGameLoop();
  if (loop) {
    await loop.flushAll();
    loop.dispose();
  }
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString();
}

/** `embedded`: touch only — rendered inside the settings window (ui/GraphicsPanel.tsx) instead of floating at the top left. */
export function MapSwitcher({ embedded = false }: { embedded?: boolean }) {
  const isTouch = useIsTouchDevice();
  const worldId = useWorldStore((s) => s.worldId);
  const [open, setOpen] = useState(false);
  const [others, setOthers] = useState<WorldRecord[]>([]);
  // Shared by Rename/Save/Load — Rename applies it to the current map's
  // own name; Save/Load use it as the cloud (and, for Load, local) map
  // name, defaulting to the current map when left blank.
  const [nameInput, setNameInput] = useState("");
  const [createInput, setCreateInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void listWorlds().then((worlds) => setOthers(worlds.filter((w) => w.id !== worldId)));
  }, [open, worldId]);

  /** Resolves the shared name box to a slug, defaulting to the current map when left blank — null means what's typed can't be turned into a valid name. */
  function resolveTargetName(): string | null {
    const trimmed = nameInput.trim();
    if (!trimmed) return worldId;
    return slugify(trimmed) || null;
  }

  async function handleSwitch(targetId: string) {
    setBusy(true);
    await prepareForReload();
    setActiveWorldId(targetId);
    window.location.reload();
  }

  async function handleCreate() {
    setError(null);
    const result = await validateWorldName(createInput);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setBusy(true);
    await prepareForReload();
    setActiveWorldId(result.slug);
    window.location.reload();
  }

  async function handleRename() {
    if (!worldId) return;
    setError(null);
    const result = await validateWorldName(nameInput, worldId);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setBusy(true);
    await prepareForReload();
    try {
      await renameWorld(worldId, result.slug);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Rename failed.");
      return;
    }
    setActiveWorldId(result.slug);
    window.location.reload();
  }

  // Always saves the *current, live* map (flushed first) — the name box
  // only picks which cloud slot it's saved under, so this doubles as
  // "save as" when it's changed from the current map's own name.
  async function handleSave() {
    if (!worldId) return;
    setError(null);
    const targetName = resolveTargetName();
    if (!targetName) {
      setError("Name must contain at least one letter or number.");
      return;
    }

    setBusy(true);
    setCloudStatus("Checking for an existing cloud save...");
    try {
      const loop = getActiveGameLoop();
      if (loop) await loop.flushAll();

      const blob = await exportWorld(worldId);

      const existing = await pullMap(SYNC_SERVER_URL, targetName);
      if (existing.ok) {
        const identical = JSON.stringify(existing.data.data) === JSON.stringify(blob);
        if (!identical) {
          const proceed = window.confirm(
            `Overwrite existing cloud save for "${targetName}"? Last updated ${formatTimestamp(existing.data.updatedAt)}.`,
          );
          if (!proceed) {
            setCloudStatus("Save cancelled.");
            return;
          }
        }
      } else if (existing.error.kind !== "not-found") {
        setCloudStatus(`Save failed: ${existing.error.message}`);
        return;
      }

      setCloudStatus("Saving...");
      const result = await pushMap(SYNC_SERVER_URL, targetName, blob);
      if (!result.ok) {
        setCloudStatus(`Save failed: ${result.error.message}`);
        return;
      }
      setCloudStatus(`Saved "${targetName}" at ${formatTimestamp(result.data.updatedAt)}.`);
    } finally {
      setBusy(false);
    }
  }

  // Pulls the named cloud map into a local map of the same name (created
  // fresh if it doesn't exist yet) and switches to it — not necessarily
  // the map that's currently active, unlike the old always-overwrite-
  // current-map behavior this replaced.
  async function handleLoad() {
    if (!worldId) return;
    setError(null);
    const targetName = resolveTargetName();
    if (!targetName) {
      setError("Name must contain at least one letter or number.");
      return;
    }

    const proceed = window.confirm(`This replaces your local copy of "${targetName}" with the cloud version — continue?`);
    if (!proceed) return;

    setBusy(true);
    setCloudStatus("Loading...");
    const result = await pullMap(SYNC_SERVER_URL, targetName);
    if (!result.ok) {
      setCloudStatus(`Load failed: ${result.error.message}`);
      setBusy(false);
      return;
    }

    await prepareForReload();
    await importWorld(targetName, result.data.data);
    setActiveWorldId(targetName);
    window.location.reload();
  }

  if (isTouch && !embedded) return null;

  return (
    <div
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      style={{
        // Touch: a collapsible section of the settings window (ui/GraphicsPanel.tsx); desktop keeps its corner spot.
        ...(isTouch ? { position: "static", boxSizing: "border-box", width: "100%" } : { position: "fixed", bottom: 16, left: 16, width: 220 }),
        background: "rgba(0, 0, 0, 0.55)",
        borderRadius: 6,
        padding: "8px 10px",
        color: "#fff",
        fontFamily: "monospace",
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }}
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>Map: {worldId ?? "..."}</span>
        <span style={{ flexShrink: 0, paddingLeft: 6 }}>{open ? "▾" : "▸"}</span>
      </div>

      {open && (
        <>
          {busy && <div style={{ fontSize: 10, opacity: 0.7 }}>Working...</div>}
          {error && <div style={{ fontSize: 10, color: "#ff8080" }}>{error}</div>}

          {others.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 10, opacity: 0.7 }}>Other local maps:</div>
              {others.map((w) => (
                <button
                  key={w.id}
                  disabled={busy}
                  onClick={() => void handleSwitch(w.id)}
                  style={{
                    fontSize: 10,
                    fontFamily: "monospace",
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 3,
                    color: "#fff",
                    padding: "4px 6px",
                    textAlign: "left",
                    cursor: busy ? "default" : "pointer",
                  }}
                >
                  {w.id}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 10, opacity: 0.7 }}>Map name:</div>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={worldId ?? ""}
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                padding: "3px 5px",
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                minWidth: 0,
              }}
            />
            <div style={{ display: "flex", gap: 4 }}>
              <button
                disabled={busy || !nameInput}
                onClick={() => void handleRename()}
                style={{
                  flex: 1,
                  fontSize: 10,
                  fontFamily: "monospace",
                  background: "rgba(90,160,255,0.35)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 3,
                  color: "#fff",
                  padding: "5px 4px",
                  cursor: busy ? "default" : "pointer",
                }}
              >
                Rename
              </button>
              <button
                disabled={busy || !worldId}
                onClick={() => void handleSave()}
                style={{
                  flex: 1,
                  fontSize: 10,
                  fontFamily: "monospace",
                  background: "rgba(90,160,255,0.35)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 3,
                  color: "#fff",
                  padding: "5px 4px",
                  cursor: busy ? "default" : "pointer",
                }}
              >
                Save
              </button>
              <button
                disabled={busy || !worldId}
                onClick={() => void handleLoad()}
                style={{
                  flex: 1,
                  fontSize: 10,
                  fontFamily: "monospace",
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 3,
                  color: "#fff",
                  padding: "5px 4px",
                  cursor: busy ? "default" : "pointer",
                }}
              >
                Load Map
              </button>
            </div>
            {cloudStatus && <div style={{ fontSize: 10, opacity: 0.8, wordBreak: "break-word" }}>{cloudStatus}</div>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 10, opacity: 0.7 }}>Create new map:</div>
            <div style={{ display: "flex", gap: 4 }}>
              <input
                value={createInput}
                onChange={(e) => setCreateInput(e.target.value)}
                placeholder="new-world-name"
                style={{
                  flex: 1,
                  fontFamily: "monospace",
                  fontSize: 10,
                  padding: "3px 5px",
                  borderRadius: 3,
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  minWidth: 0,
                }}
              />
              <button
                disabled={busy || !createInput}
                onClick={() => void handleCreate()}
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  background: "rgba(90,160,255,0.35)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 3,
                  color: "#fff",
                  padding: "3px 8px",
                  cursor: busy ? "default" : "pointer",
                }}
              >
                Create
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
