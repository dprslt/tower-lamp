#!/bin/bash
# Common helpers for tower-lamp Pi operations. Source me, do not execute.
# Usage from the repo root (Windows dev machine): wsl -e bash scripts/pi/<tool>.sh

PI_USER=${PI_USER:-pi}
PI_HOST=${PI_HOST:-192.168.17.34}
PI_KEY=${PI_KEY:-}
if [ -z "$PI_KEY" ]; then
  for c in "$HOME/.ssh/id_ed25519" "/mnt/c/Users/${USER:-theod}/.ssh/id_ed25519" "$USERPROFILE/.ssh/id_ed25519"; do
    [ -f "$c" ] && PI_KEY="$c" && break
  done
fi
PI_KEY=${PI_KEY:-/mnt/c/Users/${USER:-theod}/.ssh/id_ed25519}
PI_PW_FILE=${PI_PW_FILE:-"$(dirname "$PI_KEY")/tower-lamp-pi-pw"}

# Keys under /mnt/c are 0777 to WSL's ssh (NTFS) — use Windows OpenSSH instead,
# which is fine with its native filesystem.
if [[ "$PI_KEY" == /mnt/c/* ]]; then
  PI_SSH_BIN=${PI_SSH_BIN:-ssh.exe}
  PI_SCP_BIN=${PI_SCP_BIN:-scp.exe}
  PI_KEY=${PI_KEY/\/mnt\/c\//C:/}   # C:/Users/... (forward slashes OK)
fi
PI_SSH_OPTS=(-i "$PI_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -o BatchMode=yes)

# ssh to the Pi as the pi user
pi_ssh() { "${PI_SSH_BIN:-ssh}" "${PI_SSH_OPTS[@]}" "$PI_USER@$PI_HOST" "$@"; }

# copy local file/dir to the Pi (default /tmp). Flags (-r, ...) are passed through.
pi_scp() {
  local flags=()
  while [[ "$1" == -* ]]; do flags+=("$1"); shift; done
  local src="$1"; shift
  local dest="${1:-/tmp}"
  "${PI_SCP_BIN:-scp}" "${PI_SSH_OPTS[@]}" "${flags[@]}" "$src" "$PI_USER@$PI_HOST:$dest"
}

# the pi sudo password, cached locally (see setup.sh) — never hardcoded
pi_password() {
  if [ ! -f "$PI_PW_FILE" ]; then
    echo "No cached pi password at $PI_PW_FILE — run: wsl -e bash scripts/pi/setup.sh" >&2
    return 1
  fi
  cat "$PI_PW_FILE"
}

# run a command (or && chain) as root on the Pi. The whole script is piped to a
# root bash, so quoting inside $1 is irrelevant — only sudo sees the password line.
pi_sudo() {
  local pw
  pw=$(pi_password) || return 1
  { echo "$pw"; printf '%s\n' "$1"; } | "${PI_SSH_BIN:-ssh}" "${PI_SSH_OPTS[@]}" "$PI_USER@$PI_HOST" "sudo -S -k -p '' bash -s"
}