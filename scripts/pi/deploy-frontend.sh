#!/bin/bash
# Build the Vite frontend on this machine, ship dist/, fix perms (scp keeps 700!),
# reload nginx. Usage: wsl -e bash scripts/pi/deploy-frontend.sh [frontend-dir]
set -e
source "$(dirname "$0")/lib.sh"

FE="${1:-frontend}"
echo "== building frontend in $FE"
(cd "$FE" && npm ci --silent && npm run build --silent)
echo "== shipping dist/"
pi_scp -r "$FE/dist" /tmp/ >/dev/null
echo "== installing on the Pi (root)"
pi_sudo "rm -rf /var/www/lamp/* && cp -r /tmp/dist/* /var/www/lamp/ && chmod -R a+rX /var/www/lamp && systemctl reload nginx"
sleep 1
pi_ssh "curl -s -o /dev/null -w 'frontend: %{http_code}\n' http://127.0.0.1/"
echo "DONE — asset must be application/javascript (check with curl -sI)"