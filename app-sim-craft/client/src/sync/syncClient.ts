// Thin fetch wrappers around the self-hosted sync server (see
// sync-server/). Every function returns a discriminated result instead of
// throwing, so callers (ui/MapSwitcher.tsx) can show a specific message
// for "server unreachable" vs. "no such map" vs. "map too large" instead
// of one generic failure.
import type { WorldExportBlob } from "../persistence/worldExport";

// Defaults to the owner's own Tailscale-only server — this app has no
// login/registration system, and the server is reachable only from this
// tailnet, so there's nothing meaningful for a player to configure. Not a
// secret (Tailscale itself is the access control), just not a player-facing
// setting. Override at build/dev time with VITE_SYNC_SERVER_URL (see
// .env.example) to point at a different server, e.g. a local one.
const DEFAULT_SYNC_SERVER_URL = "http://100.127.234.114:4177";

export const SYNC_SERVER_URL: string = import.meta.env.VITE_SYNC_SERVER_URL || DEFAULT_SYNC_SERVER_URL;

export type SyncErrorKind = "network" | "not-found" | "too-large" | "invalid-name" | "server";

export interface SyncError {
  kind: SyncErrorKind;
  message: string;
}

export type SyncResult<T> = { ok: true; data: T } | { ok: false; error: SyncError };

export interface RemoteMap {
  data: WorldExportBlob;
  updatedAt: number;
}

function networkError(err: unknown): SyncError {
  const detail = err instanceof Error ? err.message : String(err);
  return {
    kind: "network",
    message: `Could not reach the sync server (${detail}). Check that it's running and this device is on Tailscale.`,
  };
}

export async function checkHealth(baseUrl: string): Promise<SyncResult<{ ok: true }>> {
  try {
    const res = await fetch(`${baseUrl}/health`);
    if (!res.ok) return { ok: false, error: { kind: "server", message: `Health check failed (HTTP ${res.status}).` } };
    return { ok: true, data: (await res.json()) as { ok: true } };
  } catch (err) {
    return { ok: false, error: networkError(err) };
  }
}

export async function pullMap(baseUrl: string, name: string): Promise<SyncResult<RemoteMap>> {
  try {
    const res = await fetch(`${baseUrl}/maps/${encodeURIComponent(name)}`);
    if (res.status === 404) return { ok: false, error: { kind: "not-found", message: `No cloud save named "${name}".` } };
    if (res.status === 400) return { ok: false, error: { kind: "invalid-name", message: "That map name isn't valid." } };
    if (!res.ok) return { ok: false, error: { kind: "server", message: `Server error (HTTP ${res.status}).` } };
    return { ok: true, data: (await res.json()) as RemoteMap };
  } catch (err) {
    return { ok: false, error: networkError(err) };
  }
}

export async function pushMap(baseUrl: string, name: string, blob: WorldExportBlob): Promise<SyncResult<{ updatedAt: number }>> {
  try {
    const res = await fetch(`${baseUrl}/maps/${encodeURIComponent(name)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blob),
    });
    if (res.status === 413) return { ok: false, error: { kind: "too-large", message: "This world is too large to push (over 10MB)." } };
    if (res.status === 400) return { ok: false, error: { kind: "invalid-name", message: "That map name isn't valid." } };
    if (!res.ok) return { ok: false, error: { kind: "server", message: `Server error (HTTP ${res.status}).` } };
    return { ok: true, data: (await res.json()) as { updatedAt: number } };
  } catch (err) {
    return { ok: false, error: networkError(err) };
  }
}
