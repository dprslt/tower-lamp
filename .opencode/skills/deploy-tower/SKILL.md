---
name: deploy-tower
description: Deploy the lamp backend/frontend/fcserver to the tower Pi (192.168.17.34, hostname lamp, Pi Zero W armv6). Use when the user says "deploy to the tower", "push to the lamp", "update the Pi", mentions fcserver/lamp-backend/nginx on the Pi, or asks to rebuild and ship the frontend or backend. Covers native systemd deploy (NO docker), dev-machine builds, service restarts, and verification.
---

# Deploy to the tower

The lamp runs on a **Pi Zero W (armv6l)**, Raspberry Pi OS **trixie**, hostname
`lamp`, IP `192.168.17.34`. Deployment is **native systemd — there is no Docker**
on the Pi (docker-ce dropped armv6; the repo's docker-compose/Dockerfiles are
legacy and do NOT reflect reality).

## Services on the Pi

| Service | Binary | Dir | Port |
|---|---|---|---|
| `lamp-fc-server` | `fcserver-rpi config.json`, user `lamp`, hardened unit | `/srv/lamp-fc-server` | 7890 (LAN-exposed on purpose) |
| `lamp-backend` | `node build/index.js`, user `lamp`, `FADE_CANDY_URL=ws://127.0.0.1:7890` | `/srv/lamp-backend` | 30008 |
| nginx | serves the Vite build | `/var/www/lamp` | 80 |

Node on the Pi: **22.23.2 armv6l** from `unofficial-builds.nodejs.org` (official
builds stop at 10.x). Do not "upgrade" it.

## Access

- SSH: `ssh -i ~/.ssh/id_ed25519 pi@192.168.17.34` (key `pi-lamp`, no password auth).
- The `pi` password (needed for `sudo -S`) is **rotated** and lives on the Pi at
  `/root/pi-password.txt` — read it there, never hardcode or commit it. It may
  change; re-read each session.
- If the Pi is unreachable: check it's powered with a good PSU (a weak PSU made
  it fail to boot before), `rfkill list` (WiFi was soft-blocked once), and scan
  the LAN (`192.168.17.0/24`) — the DHCP IP may have changed.

## Backend deploy

Build on the dev machine (Node 20+), ship the build, install prod deps on the Pi:

```bash
# 1. build (from the migrated backend source, TS5/tsc, socket.io v4)
cd <repo>/backend && npm ci && npm run build
# 2. copy
scp -r build package.json pi@192.168.17.34:/tmp/
# 3. on the Pi — MUST use --prefix and --package-lock=false (known npm gotcha)
sudo npm install --prefix /srv/lamp-backend --omit=dev --package-lock=false --no-audit --no-fund
# 4. restart + verify
sudo systemctl restart lamp-backend
journalctl -u lamp-backend -n 20   # expect: "Server starting", "Connected to the fadeCandy"
```

The migrated backend is the one deployed (pure-TS rasterizer, **no node-canvas**).
If you build the legacy `main` backend instead it will NOT run (canvas is not
installable on armv6 Node 22).

## Frontend deploy

Build with Vite on the dev machine, ship `dist/`, fix perms (scp preserves 700
which breaks nginx — this already bit us once):

```bash
cd <repo>/frontend && npm ci && npm run build
scp -r dist pi@192.168.17.34:/tmp/
# on the Pi:
sudo rm -rf /var/www/lamp/* && sudo cp -r /tmp/dist/* /var/www/lamp/
sudo chmod -R a+rX /var/www/lamp          # REQUIRED — else MIME text/html errors
sudo systemctl reload nginx
# verify: curl -sI http://127.0.0.1/assets/index-*.js  -> application/javascript
```

No `VITE_BACKEND_WS_URL` needed: the app derives the backend from the page
hostname (`<host>:30008`).

## fcserver (FadeCandy)

Binary + config in `/srv/lamp-fc-server` (armv6-compatible). The systemd unit is
hardened — do not remove the sandbox:

- `DeviceAllow=char-usb_device rw` (the **type-based** spec is required; path
  globs like `/dev/bus/usb/*` silently fail with libusb EIO).
- udev rule `99-fadecandy.rules` grants `dialout` access; user `lamp` is in
  `dialout`.
- Verify attach: `journalctl -u lamp-fc-server | grep attached` →
  `USB device Fadecandy (Serial# XNZHZFTZDFIVGPQX, Version 1.07) attached.`

## Verification checklist

1. `systemctl is-active lamp-fc-server lamp-backend nginx ufw unattended-upgrades`
2. `journalctl -u lamp-fc-server -n 5` — FadeCandy attached
3. `journalctl -u lamp-backend -n 5` — "Connected to the fadeCandy"
4. `curl -sI http://192.168.17.34:80` → 200
5. Socket test (from dev machine, socket.io-client): emit
   `select-strategy {name:'color', params:{fill:'red'}}` and confirm LEDs.

## Debugging toolbox (scripts/pi/)

Reusable helpers in the repo — do NOT re-invent these in throwaway temp scripts.
Run from the repo root via `wsl -e bash scripts/pi/<tool>.sh` (or Git Bash).
First run `setup.sh` once to cache the pi sudo password locally (read it from the Pi:
`ssh pi@192.168.17.34 "sudo cat /root/pi-password.txt"` — it is NOT in the repo).

| Tool | Use |
|---|---|
| `setup.sh` | one-time: cache the pi sudo password (`PI_PW='...' bash scripts/pi/setup.sh`) |
| `status.sh` | health snapshot: services, fcserver attach, backend log, ports, OS/node |
| `logs.sh [fc\|backend\|nginx\|all] [lines]` | journalctl for the lamp services |
| `exec.sh '<cmd>'` | run any command on the Pi as `pi` |
| `root.sh '<cmd>'` | run any command on the Pi as root (needs cached password) |
| `send.sh <local> [remote-dir]` | copy a file/dir to the Pi (default /tmp) |
| `scan.sh` | find the lamp Pi on the LAN (SSH sweep + key test — only lamp accepts the pi-lamp key) |
| `deploy-backend.sh [dir]` | build (local) → ship → npm install `--prefix` → restart → log tail |
| `deploy-frontend.sh [dir]` | build (local) → ship → `chmod -R a+rX` → reload nginx → HTTP check |
| `verify.sh` | end-to-end: health + attach + backend + HTTP + **red** LED test |
| `test-strategy.mjs <color>` | socket.io strategy test (needs `npm i socket.io-client` in `scripts/pi/` once) |

Environment overrides: `PI_HOST`, `PI_USER`, `PI_KEY`, `PI_SUBNET`, `PI_PW_FILE`.
Note: from WSL, the scripts transparently use Windows `ssh.exe`/`scp.exe` because
NTFS-mounted keys look 0777 to WSL's ssh.

## Gotchas (learned the hard way — see doc/llm-paper-trail/2026-08-27-pi-migration.md)

- **Never test with full white**: 168 LEDs at full white draw too much power and
  the thermal dissipation is not optimal — use **red** for bring-up checks.
- PowerShell/Windows: write shell logic to script files and scp them; never
  inline heredocs in PowerShell (they get mangled). Use `curl.exe`, not `curl`.
  WSL is NAT'd — read the LAN via the Windows host `arp -a`.
- sudo over SSH needs `-S` with the password read from `/root/pi-password.txt`.
- If you solve a new problem, paper-trail it (template in `doc/llm-paper-trail/`).