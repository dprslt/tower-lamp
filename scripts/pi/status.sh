#!/bin/bash
# Quick health snapshot of the lamp Pi. Usage: wsl -e bash scripts/pi/status.sh
source "$(dirname "$0")/lib.sh"

pi_ssh '
echo "=== services (enabled / active) ==="
systemctl is-enabled lamp-fc-server lamp-backend nginx unattended-upgrades ufw 2>/dev/null | paste -sd" " -
systemctl is-active lamp-fc-server lamp-backend nginx unattended-upgrades ufw 2>/dev/null | paste -sd" " -
echo "=== fcserver (last 2) ==="
journalctl -u lamp-fc-server -n 2 --no-pager | tail -2
echo "=== backend (last 2) ==="
journalctl -u lamp-backend -n 2 --no-pager | tail -2
echo "=== listening ports ==="
ss -tlnp | grep -E "7890|30008|:80 " 
echo "=== os / node ==="
grep PRETTY /etc/os-release
node --version 2>/dev/null || echo "node: MISSING"
echo "=== hostname / ip ==="
hostname -I
'