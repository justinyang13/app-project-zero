import { useEffect, useState } from "react";
import { useWorldStore } from "../state/worldStore";
import {
  INVALID_MAP_NAME_ERROR,
  createWorld,
  listOtherWorlds,
  loadWorldFromCloud,
  renameCurrentWorld,
  resolveMapName,
  saveWorldToCloud,
  switchToWorld,
  type CloudPrompts,
  type FlowResult,
} from "../session/worldSession";
import { useIsTouchDevice } from "../hooks/useIsTouchDevice";
import { HUD_ACTION_BLUE, HUD_NEUTRAL, hudButton, hudInput, hudPanel } from "./styles";

const browserPrompts = (onStatus: (message: string) => void): CloudPrompts => ({
  onStatus,
  confirm: (message) => window.confirm(message),
});

/** `embedded`: touch only — rendered inside the settings window (ui/GraphicsPanel.tsx) instead of floating at the top left. */
export function MapSwitcher({ embedded = false }: { embedded?: boolean }) {
  const isTouch = useIsTouchDevice();
  const worldId = useWorldStore((s) => s.worldId);
  const [open, setOpen] = useState(false);
  const [others, setOthers] = useState<{ id: string }[]>([]);
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
    void listOtherWorlds(worldId).then(setOthers);
  }, [open, worldId]);

  /** Runs one flow from the service: shows it as busy, then surfaces how it ended. A flow that reloads the page stays busy — the page is going away. */
  async function run(flow: () => Promise<FlowResult>) {
    setBusy(true);
    setError(null);
    try {
      const result = await flow();
      if (result.outcome === "reloading") return;
      if (result.error) setError(result.error);
      if (result.status !== undefined) setCloudStatus(result.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
    setBusy(false);
  }

  /** The cloud flows need a valid target name; explains and stops otherwise. */
  function withCloudTarget(flow: (targetName: string) => Promise<FlowResult>) {
    if (!worldId) return;
    const targetName = resolveMapName(nameInput, worldId);
    if (!targetName) {
      setError(INVALID_MAP_NAME_ERROR);
      return;
    }
    void run(() => flow(targetName));
  }

  if (isTouch && !embedded) return null;

  return (
    <div
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      style={{
        ...hudPanel,
        // Touch: a collapsible section of the settings window (ui/GraphicsPanel.tsx); desktop keeps its corner spot.
        ...(isTouch ? { position: "static", boxSizing: "border-box", width: "100%" } : { position: "fixed", bottom: 16, left: 16, width: 220 }),
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
                  onClick={() => void run(() => switchToWorld(w.id))}
                  style={hudButton({ background: "rgba(255,255,255,0.12)", padding: "4px 6px", busy, alignLeft: true })}
                >
                  {w.id}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 10, opacity: 0.7 }}>Map name:</div>
            <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder={worldId ?? ""} style={hudInput} />
            <div style={{ display: "flex", gap: 4 }}>
              <button
                disabled={busy || !nameInput}
                onClick={() => worldId && void run(() => renameCurrentWorld(worldId, nameInput))}
                style={hudButton({ background: HUD_ACTION_BLUE, padding: "5px 4px", busy, grow: true })}
              >
                Rename
              </button>
              <button
                disabled={busy || !worldId}
                onClick={() =>
                  withCloudTarget((targetName) => saveWorldToCloud(worldId!, targetName, browserPrompts(setCloudStatus)))
                }
                style={hudButton({ background: HUD_ACTION_BLUE, padding: "5px 4px", busy, grow: true })}
              >
                Save
              </button>
              <button
                disabled={busy || !worldId}
                onClick={() => withCloudTarget((targetName) => loadWorldFromCloud(targetName, browserPrompts(setCloudStatus)))}
                style={hudButton({ background: HUD_NEUTRAL, padding: "5px 4px", busy, grow: true })}
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
                style={{ ...hudInput, flex: 1 }}
              />
              <button
                disabled={busy || !createInput}
                onClick={() => void run(() => createWorld(createInput))}
                style={hudButton({ background: HUD_ACTION_BLUE, padding: "3px 8px", busy })}
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
