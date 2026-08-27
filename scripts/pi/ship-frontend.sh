#!/bin/bash
# Ship a pre-built Vite frontend to the Pi: copy dist/, fix perms (scp keeps 700!),
# reload nginx. Build locally first (npm run build in frontend/).
# Usage: wsl -e bash scripts/pi/ship-frontend.sh [frontend-dir]
set -e
source "$(dirname "$0")/lib.sh"

FE="${1:-frontend}"
echo "== shipping dist/"
pi_scp -r "$FE/dist" /tmp/ >/dev/null
echo "== installing on the Pi (root)"
pi_sudo "rm -rf /var/www/lamp/* && cp -r /tmp/dist/* /var/www/lamp/ && chmod -R a+rX /var/www/lamp && systemctl reload nginx"
sleep 1
pi_ssh "curl -s -o /dev/null -w 'frontend: %{http_code}\n' http://127.0.0.1/"
echo "DONE — asset must be application/javascript (check with curl -sI)"