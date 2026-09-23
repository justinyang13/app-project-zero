# SimCraft sync server

A tiny, self-hosted cloud sync server for SimCraft world saves. Runs only
on your own Mac, reachable only over your Tailscale network — no login,
no public internet exposure, no background/automatic sync. The client's
"Push to cloud" / "Pull from cloud" buttons talk to this over HTTPS.

It stores one row per named map in a local SQLite file
(`data/simcraft.db`) and exposes three endpoints:

- `GET /health` — reachability check, no DB access.
- `GET /maps/:name` — fetch a map's saved blob.
- `POST /maps/:name` — upsert a map's blob (max 10MB).

This directory is a standalone Node package — it is not part of the Vite
client build and is never run by CI or GitHub Pages.

## 1. Install

```bash
cd app-sim-craft/sync-server
npm install
```

## 2. Run it manually (for testing)

```bash
npm run build
npm start
```

On first run, before you've set up a certificate (step 3), there's no
`certs/cert.pem` / `certs/key.pem` yet, so the server falls back to plain
HTTP on port 4177, bound to your Tailscale IP (`100.64.70.111` by
default — override with `TAILSCALE_BIND_HOST` if that's ever different).
That's enough to `curl` it locally while you finish setup:

```bash
curl http://100.64.70.111:4177/health
# {"ok":true}
```

## 3. Get an HTTPS certificate for your Tailscale hostname

The deployed client is served over HTTPS (GitHub Pages), and a browser
will refuse to call an HTTP API from an HTTPS page (mixed content) — so
the server needs a real TLS certificate. Certs are issued for hostnames,
not IPs, so you need your Mac's Tailscale **MagicDNS name**, not its
`100.x.x.x` address:

```bash
tailscale status
# find this machine's line — its MagicDNS name looks like
# <device-name>.<tailnet-name>.ts.net
```

Then request a cert for that hostname:

```bash
tailscale cert <device-name>.<tailnet-name>.ts.net
```

This writes `<hostname>.crt` and `<hostname>.key` into your current
directory. Move (and rename) them into this package's `certs/` folder,
which is gitignored:

```bash
mkdir -p certs
mv <hostname>.crt certs/cert.pem
mv <hostname>.key certs/key.pem
```

Restart the server (`npm start` again, or reload the launchd job below)
— it now serves HTTPS on port 4177:

```bash
curl https://<device-name>.<tailnet-name>.ts.net:4177/health
```

Tailscale certs expire periodically and `tailscale cert` renews them in
place when you re-run the same command — re-run it and copy the files
over again if the server ever starts rejecting TLS connections.

## 4. Point the client at your server

In the game, open the "Cloud sync" panel and set the server URL field to:

```
https://<device-name>.<tailnet-name>.ts.net:4177
```

This is saved in the browser's `localStorage`, so you only need to set it
once per device/browser profile.

## 5. Install as a background service (launchd)

This makes the server start automatically at login and restart itself if
it crashes. The plist in this folder (`com.simcraft.syncserver.plist`)
needs two things filled in before you install it:

1. The absolute path to `node` — run `which node` and use that.
2. The absolute path to this `sync-server` directory on your machine.

Edit the plist's `/REPLACE/WITH/ABSOLUTE/PATH/TO/...` placeholders
accordingly (four occurrences), then run these yourself — this changes
what auto-starts on your Mac, so it's intentionally not something this
setup runs for you:

```bash
npm run build   # make sure dist/index.js exists and is current
cp com.simcraft.syncserver.plist ~/Library/LaunchAgents/com.simcraft.syncserver.plist
launchctl load ~/Library/LaunchAgents/com.simcraft.syncserver.plist
```

To stop/uninstall it later:

```bash
launchctl unload ~/Library/LaunchAgents/com.simcraft.syncserver.plist
rm ~/Library/LaunchAgents/com.simcraft.syncserver.plist
```

## 6. Verify it's running

From this Mac:

```bash
curl https://<device-name>.<tailnet-name>.ts.net:4177/health
```

From any *other* device on your tailnet (e.g. your phone or laptop, with
the Tailscale app installed and signed into the same tailnet):

```bash
curl https://<device-name>.<tailnet-name>.ts.net:4177/health
# {"ok":true}
```

If that fails: check `tailscale status` shows this Mac as connected,
check the Mac hasn't gone to sleep, and check the logs at
`sync-server/logs/stdout.log` / `stderr.log` (or `~/Library/Logs/` if
you redirected them elsewhere in the plist).

## Hosting on the Maxi (Mac Studio)

The server runs on the Maxi, reachable only over Tailscale at
`http://100.127.234.114:4177` (plain HTTP until a cert is issued — see
section 3). The SQLite database lives at `data/simcraft.db` on the Maxi and
is gitignored, so it is **not** carried by `git pull`. To move it to another
machine, take a consistent single-file copy first (the DB runs in WAL mode,
so copying `simcraft.db` alone can lose recent writes):

```bash
sqlite3 data/simcraft.db ".backup /tmp/simcraft-move.db"
```

Copy that file to the new machine as `data/simcraft.db` (no `-wal`/`-shm`).

Background service: copy `com.simcraft.syncserver.plist` to
`~/Library/LaunchAgents/`, fix the path placeholders (node from
`which node` under `nvm use 25`, and this folder), then load it with
`launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.simcraft.syncserver.plist`.
Plist edits only take effect after `launchctl bootout gui/$(id -u)/com.simcraft.syncserver`
then `bootstrap` again — `kickstart` alone does not reload them. It is a
per-user agent, so it starts at login, not at boot.

`./start-simcraft-server.sh` runs the server in the foreground for testing.

## CORS

Only allow-listed origins can call this server from a browser; everything
else gets a 403. The built-in defaults are `http://localhost:5177` and the
deployed GitHub Pages origin (`https://justinyang13.github.io`) — see
`src/app.ts`'s `DEFAULT_ALLOWED_ORIGINS`. Set `SIMCRAFT_ALLOWED_ORIGINS`
(comma-separated) to replace them; the Maxi's plist does this to also allow
Vite's default dev port, `http://localhost:5173`.
This doesn't affect `curl` (CORS is a browser-only restriction), which is
why the health checks above work regardless.

## Development

```bash
npm run build   # tsc -b
npm run lint    # oxlint
npm test        # vitest — uses an in-memory SQLite db, never data/simcraft.db
```
