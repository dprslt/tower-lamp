#!/bin/bash
# Copy a local file/dir to the Pi. Usage: wsl -e bash scripts/pi/send.sh <local-path> [remote-dir]
source "$(dirname "$0")/lib.sh"
pi_scp "$1" "${2:-/tmp}"