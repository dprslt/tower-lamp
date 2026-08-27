#!/bin/bash
# One-time local cache of the pi sudo password.
# Usage: PI_PW='...' wsl -e bash scripts/pi/setup.sh   (or it prompts)
source "$(dirname "$0")/lib.sh"

if [ -z "$PI_PW" ]; then
  read -r -s -p "pi password: " PI_PW
  echo
fi
install -m 600 /dev/null "$PI_PW_FILE"
echo "$PI_PW" > "$PI_PW_FILE"
echo "cached at $PI_PW_FILE (chmod 600)"