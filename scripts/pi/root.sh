#!/bin/bash
# Run any command on the Pi as root. Usage: wsl -e bash scripts/pi/root.sh 'systemctl restart lamp-backend'
source "$(dirname "$0")/lib.sh"
pi_sudo "$1"