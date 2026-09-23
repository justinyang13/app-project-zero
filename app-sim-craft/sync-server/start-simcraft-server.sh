#!/bin/bash
# Run the SimCraft sync server in the foreground (manual start / testing).
# For the always-on background service see README.md "Install as a background service".
set -e

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 25 >/dev/null

cd "$(dirname "$0")"

# Override with TAILSCALE_BIND_HOST if this Mac's tailnet IP differs.
export TAILSCALE_BIND_HOST="${TAILSCALE_BIND_HOST:-100.127.234.114}"

npm run build
npm start
