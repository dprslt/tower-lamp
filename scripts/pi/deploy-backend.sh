#!/bin/bash
# Build the migrated backend on this machine, ship it to the Pi, install prod deps,
# restart the service. Usage: wsl -e bash scripts/pi/deploy-backend.sh [backend-dir]
set -e
source "$(dirname "$0")/lib.sh"

BE="${1:-backend}"
echo "== building backend in $BE"
(cd "$BE" && npm ci --silent && npm run build --silent)
echo "== shipping build + package.json"
pi_scp -r "$BE/build" /tmp/ >/dev/null
pi_scp "$BE/package.json" /tmp/ >/dev/null
echo "== installing on the Pi (root)"
pi_sudo "cp -r /tmp/build/* /srv/lamp-backend/ && cp /tmp/package.json /srv/lamp-backend/ && npm install --prefix /srv/lamp-backend --omit=dev --package-lock=false --no-audit --no-fund && systemctl restart lamp-backend"
sleep 2
pi_ssh "journalctl -u lamp-backend -n 5 --no-pager | tail -4"
echo "DONE — expect 'Connected to the fadeCandy'"