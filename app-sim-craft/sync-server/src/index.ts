// Entrypoint for the standalone sync server — run only on the owner's own
// Mac (see README.md), never in CI or on any public-internet host.
import { createServer as createHttpsServer } from "node:https";
import { createServer as createHttpServer } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createApp } from "./app.js";
import { createDb } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const PORT = Number(process.env.PORT ?? 4177);
// Binding to the tailnet IP (rather than 0.0.0.0) means this server is
// simply unreachable from anywhere but the tailnet, independent of the
// Mac's normal LAN/Wi-Fi network — the whole point of this feature.
// Override with TAILSCALE_BIND_HOST if this Mac's tailnet IP differs.
const BIND_HOST = process.env.TAILSCALE_BIND_HOST ?? "100.127.234.114";
const DB_PATH = process.env.SIMCRAFT_DB_PATH ?? join(ROOT, "data", "simcraft.db");
const CERT_PATH = join(ROOT, "certs", "cert.pem");
const KEY_PATH = join(ROOT, "certs", "key.pem");

const logsDir = join(ROOT, "logs");
mkdirSync(logsDir, { recursive: true });

const db = createDb(DB_PATH);
// Comma-separated list of browser origins allowed to call this server; the built-in defaults apply when unset.
const allowedOrigins = process.env.SIMCRAFT_ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean);
const app = createApp(db, allowedOrigins?.length ? allowedOrigins : undefined);

const hasCerts = existsSync(CERT_PATH) && existsSync(KEY_PATH);

if (hasCerts) {
  const server = createHttpsServer(
    { cert: readFileSync(CERT_PATH), key: readFileSync(KEY_PATH) },
    app,
  );
  server.listen(PORT, BIND_HOST, () => {
    console.log(`[simcraft-sync-server] HTTPS listening on https://${BIND_HOST}:${PORT}`);
  });
} else {
  // No cert yet (first-time setup, before `tailscale cert` has been run —
  // see README.md) — fall back to plain HTTP on the same port so curl
  // still works for local debugging while getting the cert issued. The
  // client always defaults to an https:// URL; only switch it to http://
  // temporarily if you're testing against this fallback.
  console.warn(
    `[simcraft-sync-server] No cert/key found at ${CERT_PATH} / ${KEY_PATH} — ` +
      "serving plain HTTP instead. Run `tailscale cert` and restart for HTTPS (see README.md).",
  );
  const server = createHttpServer(app);
  server.listen(PORT, BIND_HOST, () => {
    console.log(`[simcraft-sync-server] HTTP (no TLS) listening on http://${BIND_HOST}:${PORT}`);
  });
}
