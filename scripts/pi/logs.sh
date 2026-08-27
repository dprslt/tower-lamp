#!/bin/bash
# Tail logs of the lamp services.
# Usage: wsl -e bash scripts/pi/logs.sh [fc|backend|nginx|all] [lines]
source "$(dirname "$0")/lib.sh"

SVC="${1:-all}"
LINES="${2:-40}"
case "$SVC" in
  fc|fcserver)   SVC=lamp-fc-server ;;
  be|backend)    SVC=lamp-backend ;;
  nginx)         SVC=nginx ;;
  all)           SVC="lamp-fc-server lamp-backend" ;;
  *)             SVC=$1 ;;
esac
pi_sudo "journalctl -u $SVC --no-pager -n $LINES"