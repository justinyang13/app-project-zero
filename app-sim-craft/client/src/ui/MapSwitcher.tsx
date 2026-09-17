import { useEffect, useState } from "react";
import { useWorldStore } from "../state/worldStore";
import { getActiveGameLoop } from "../engine/activeGameLoop";
import { listWorlds, renameWorld, setActiveWorldId, validateWorldName } from "../persistence/migration";
import type { WorldRecord } from "../persistence/db";

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

export function MapSwitcher() {
  const worldId = useWorldStore((s) => s.worldId);
  const [open, setOpen] = useState(false);
  const [others, setOthers] = useState<WorldRecord[]>([]);
  const [renameInput, setRenameInput] = useState("");
  const [createInput, setCreateInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void listWorlds().then((worlds) => setOthers(worlds.filter((w) => w.id !== worldId)));
  }, [open, worldId]);

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
    const result = await validateWorldName(renameInput, worldId);
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

  return (
    <div
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        width: 220,
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
        <span>Map: {worldId ?? "..."}</span>
        <span>{open ? "▾" : "▸"}</span>
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
            <div style={{ fontSize: 10, opacity: 0.7 }}>Rename current map:</div>
            <div style={{ display: "flex", gap: 4 }}>
              <input
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                placeholder={worldId ?? ""}
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
                disabled={busy || !renameInput}
                onClick={() => void handleRename()}
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
                Rename
              </button>
            </div>
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
