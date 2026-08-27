#!/bin/bash
# Run any command on the Pi as the pi user. Usage: wsl -e bash scripts/pi/exec.sh 'uname -a'
source "$(dirname "$0")/lib.sh"
pi_ssh "$@"