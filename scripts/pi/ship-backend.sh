#!/bin/bash
# Ship a pre-built backend to the Pi: copy build/ + package.json, install prod deps,
# restart the service. Build locally first (npm run build in backend/).
# Usage: wsl -e bash scripts/pi/ship-backend.sh [backend-dir]
set -e
source "$(dirname "$0")/lib.sh"

BE="${1:-backend}"
echo "== shipping build + package.json"
pi_scp -r "$BE/build" /tmp/ >/dev/null
pi_scp "$BE/package.json" /tmp/ >/dev/null
echo "== installing on the Pi (root)"
pi_sudo "rm -rf /srv/lamp-backend/build && cp -r /tmp/build /srv/lamp-backend/build && chown -R lamp:lamp /srv/lamp-backend/build && cp /tmp/package.json /srv/lamp-backend/ && npm install --prefix /srv/lamp-backend --omit=dev --package-lock=false --no-audit --no-fund && systemctl restart lamp-backend"
sleep 2
pi_ssh "journalctl -u lamp-backend -n 5 --no-pager | tail -4"
echo "DONE — expect 'Connected to the fadeCandy'"