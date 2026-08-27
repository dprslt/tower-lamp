#!/bin/bash
# End-to-end verification of the lamp. Usage: wsl -e bash scripts/pi/verify.sh
source "$(dirname "$0")/lib.sh"

echo "== health =="
pi_ssh 'systemctl is-active lamp-fc-server lamp-backend nginx ufw | paste -sd" " -'
echo "== fcserver attach =="
pi_ssh 'journalctl -u lamp-fc-server -n 2 --no-pager | tail -1'
echo "== backend connection =="
pi_ssh 'journalctl -u lamp-backend -n 2 --no-pager | tail -1'
echo "== frontend =="
pi_ssh 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1/'
echo "== LED test (red) =="
NODE_BIN=$(command -v node.exe 2>/dev/null || command -v node 2>/dev/null || echo node)
"$NODE_BIN" "$(dirname "$0")/test-strategy.mjs" red
echo "DONE — tower should show red"