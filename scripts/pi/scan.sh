#!/bin/bash
# Find the lamp Pi on the LAN: sweep port 22, then key-test each host.
# Only the lamp Pi accepts the pi-lamp key. Usage: wsl -e bash scripts/pi/scan.sh
source "$(dirname "$0")/lib.sh"

SUBNET="${PI_SUBNET:-192.168.17}"
echo "sweeping $SUBNET.0/24 for SSH hosts..."
for i in $(seq 1 254); do
  ( timeout 1 bash -c "</dev/tcp/$SUBNET.$i/22" 2>/dev/null && echo "$SUBNET.$i" ) &
done | sort -t. -k4 -n > /tmp/pi-open-hosts.$$
wait
echo "SSH hosts: $(tr '\n' ' ' < /tmp/pi-open-hosts.$$)"
while read -r host; do
  if "${PI_SSH_BIN:-ssh}" -i "$PI_KEY" -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new -o LogLevel=ERROR "pi@$host" 'hostname' 2>/dev/null; then
    echo ">>> LAMP PI FOUND: $host"
    rm -f /tmp/pi-open-hosts.$$
    exit 0
  fi
done < /tmp/pi-open-hosts.$$
rm -f /tmp/pi-open-hosts.$$
echo "lamp Pi not found on $SUBNET.0/24 — check it is powered (good PSU!) and rfkill is clear."
exit 1