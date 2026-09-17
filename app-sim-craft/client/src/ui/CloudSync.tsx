import { useEffect, useState } from "react";
import { useWorldStore } from "../state/worldStore";
import { getActiveGameLoop } from "../engine/activeGameLoop";
import { exportWorld, importWorld } from "../persistence/worldExport";
import { pullMap, pushMap } from "../sync/syncClient";

const SERVER_URL_KEY = "simcraft:syncServerUrl";
// Replace <device>.<tailnet>.ts.net with this Mac's MagicDNS name from
// `tailscale status` once sync-server/README.md's setup is done — this
// can't be known ahead of time since it's generated per-tailnet.
const DEFAULT_SERVER_URL = "https://your-mac.your-tailnet.ts.net:4177";

function loadServerUrl(): string {
  try {
    return localStorage.getItem(SERVER_URL_KEY) || DEFAULT_SERVER_URL;
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString();
}

export function CloudSync() {
  const worldId = useWorldStore((s) => s.worldId);
  const [open, setOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState(loadServerUrl);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(SERVER_URL_KEY, serverUrl);
    } catch {
      // Per-viewer convenience only — non-fatal if storage is unavailable (private browsing, etc).
    }
  }, [serverUrl]);

  async function handlePush() {
    if (!worldId) return;
    setBusy(true);
    setStatus("Checking for an existing cloud save...");
    try {
      const loop = getActiveGameLoop();
      if (loop) await loop.flushAll();

      const blob = await exportWorld(worldId);

      const existing = await pullMap(serverUrl, worldId);
      if (existing.ok) {
        const identical = JSON.stringify(existing.data.data) === JSON.stringify(blob);
        if (!identical) {
          const proceed = window.confirm(
            `Overwrite existing cloud save for "${worldId}"? Last updated ${formatTimestamp(existing.data.updatedAt)}.`,
          );
          if (!proceed) {
            setStatus("Push cancelled.");
            setBusy(false);
            return;
          }
        }
      } else if (existing.error.kind !== "not-found") {
        setStatus(`Push failed: ${existing.error.message}`);
        setBusy(false);
        return;
      }

      setStatus("Pushing...");
      const result = await pushMap(serverUrl, worldId, blob);
      if (!result.ok) {
        setStatus(`Push failed: ${result.error.message}`);
        setBusy(false);
        return;
      }
      setStatus(`Pushed "${worldId}" at ${formatTimestamp(result.data.updatedAt)}.`);
    } finally {
      setBusy(false);
    }
  }

  async function handlePull() {
    if (!worldId) return;
    const proceed = window.confirm(`This replaces your local copy of "${worldId}" with the cloud version — continue?`);
    if (!proceed) return;

    setBusy(true);
    setStatus("Pulling...");
    const result = await pullMap(serverUrl, worldId);
    if (!result.ok) {
      setStatus(`Pull failed: ${result.error.message}`);
      setBusy(false);
      return;
    }

    // Stop the live GameLoop (and its autosave timer) before overwriting
    // this world's IndexedDB rows out from under it, then reload so the
    // app reinitializes from the freshly-imported data through the exact
    // same load path a normal launch uses.
    const loop = getActiveGameLoop();
    loop?.dispose();
    await importWorld(worldId, result.data.data);
    window.location.reload();
  }

  return (
    <div
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        bottom: 170,
        right: 16,
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
      <div style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setOpen((v) => !v)}>
        <span>Cloud sync</span>
        <span>{open ? "▾" : "▸"}</span>
      </div>

      {open && (
        <>
          <input
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              padding: "3px 5px",
              borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
            }}
          />

          <div style={{ display: "flex", gap: 4 }}>
            <button
              disabled={busy || !worldId}
              onClick={() => void handlePush()}
              style={{
                flex: 1,
                fontSize: 10,
                fontFamily: "monospace",
                background: "rgba(90,160,255,0.35)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 3,
                color: "#fff",
                padding: "4px 6px",
                cursor: busy ? "default" : "pointer",
              }}
            >
              Push to cloud
            </button>
            <button
              disabled={busy || !worldId}
              onClick={() => void handlePull()}
              style={{
                flex: 1,
                fontSize: 10,
                fontFamily: "monospace",
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 3,
                color: "#fff",
                padding: "4px 6px",
                cursor: busy ? "default" : "pointer",
              }}
            >
              Pull from cloud
            </button>
          </div>

          {status && <div style={{ fontSize: 10, opacity: 0.8, wordBreak: "break-word" }}>{status}</div>}
        </>
      )}
    </div>
  );
}
