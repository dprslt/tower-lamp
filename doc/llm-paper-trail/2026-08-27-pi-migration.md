# 2026-08-27 — Pi OS migration (stretch → trixie) and native systemd deploy

Session context: migrate the lamp Pi (discovered to be a **Pi Zero W, armv6l**) from
Raspbian 9 stretch (EOL) to a current, secured Raspberry Pi OS, and redeploy the whole
lamp stack without Docker. Work was driven from a Windows/WSL2 dev machine; the SD card
was read/flashed through a USB card reader attached to WSL via usbipd-win.

Deployed topology at the end of the session (all verified after reboot):

| Service | Detail |
|---|---|
| `lamp-fc-server.service` | `/srv/lamp-fc-server/fcserver-rpi config.json`, user `lamp`, hardened unit, bound `0.0.0.0:7890` (LAN-exposed on purpose for local dev) |
| `lamp-backend.service` | migrated TS5/socket.io v4 backend, `build/index.js`, `FADE_CANDY_URL=ws://127.0.0.1:7890`, Node 22.23.2 armv6l from unofficial-builds |
| nginx :80 | migrated Vite/React 18 frontend at `/var/www/lamp` (built on the dev machine) |
| ufw | default deny; allow 22/80/30008/7890 tcp from `192.168.17.0/24` only |
| sshd | key-only (`PasswordAuthentication no`), root login off, X11 off, `AllowUsers pi` |
| unattended-upgrades | enabled, auto-reboot 04:00 |

- Hostname `lamp`, OS: Raspberry Pi OS trixie armhf, kernel `6.18.34+rpt-rpi-v6`.
- Old system backup: `D:\pi-backup\pi-sd-stretch-20260826.img.gz` (dev machine, NOT in repo).
- The `pi` user password was rotated; stored only on the Pi at `/root/pi-password.txt`.

---

### Problem: SD card not visible in WSL

- **Date:** 2026-08-27
- **Component:** tooling
- **Status:** resolved

**Symptom**
`lsblk` in WSL showed no `/dev/sdf`; the card reader was plugged into the Windows host.

**Diagnosis trail**
`usbipd list` showed the reader (`058f:8468`, busid `10-4`) as `Shared` but not attached.
Attaching with `usbipd attach --wsl --busid 10-4` (no elevation needed for attach, only
for `bind`) made `/dev/sdf` appear. The attachment drops whenever the reader is unplugged
or WSL restarts — re-run the attach.

**Root cause**
USB/IP passthrough (usbipd-win) was set up by a previous agent; the device is only visible
in WSL while attached.

**Fix applied**
`usbipd attach --wsl --busid 10-4` (documented in temp scripts at
`C:\Users\theod\AppData\Local\Temp\opencode\`).

**Prevention / follow-up**
Keep the reader attached during whole flash/read cycles; verify with `lsblk` before mounting.

---

### Problem: Pi would not boot the freshly flashed image (no boot activity at all)

- **Date:** 2026-08-27
- **Component:** OS
- **Status:** resolved

**Symptom**
After flashing trixie and powering the Pi, the ACT LED was solid green but the Pi never
appeared on the network (SSH/ARP scan). The card, inspected later, showed **zero** boot
activity.

**Diagnosis trail**
1. SSH scans found only unrelated hosts (see Pi-identification entry).
2. Card forensics (mounted rootfs read-only): `/var/log` mtimes all at image-build time,
   no systemd journal files, baked SSH host keys untouched, no first-boot markers →
   the kernel never ran from this card.
3. Verified the image was bootable for this hardware: trixie armhf ships `kernel.img`
   (armv6 `rpt-rpi-v6` modules `6.18.34+rpt-rpi-v6`) + `bcm2708-rpi-zero-w.dtb`;
   `cmdline.txt` PARTUUID matched the partition table.
4. User swapped the PSU (old one was weak) → Pi booted immediately.

**Root cause**
Undervoltage / weak power supply: the Zero W would not start the new OS (the old stretch
image presumably drew less at boot). Not a card or image problem.

**Fix applied**
Replaced the power supply; Pi boots and survives reboots.

**Prevention / follow-up**
Before suspecting the image/card on a Zero-class board, test with a known-good 5V/2.5A PSU.

---

### Problem: WiFi soft-blocked via rfkill (Pi boots but never joins the network)

- **Date:** 2026-08-27
- **Component:** OS
- **Status:** resolved

**Symptom**
Pi boots (display shows hostname `lamp`), but never appears on WiFi despite a correct
NetworkManager connection file.

**Diagnosis trail**
With a display attached, `rfkill list` showed the WLAN soft-blocked. The block origin was
not chased further (likely a leftover state or manual toggle); it did **not** re-block
after subsequent reboots.

**Fix applied**
On the Pi console: `sudo rfkill unblock all; nmcli radio wifi on`, then
`nmcli device wifi connect la_bouingerie_bis_2G password <psk>`.

**Prevention / follow-up**
If the Pi vanishes from the network after a reboot, check `rfkill list` again before
re-flashing anything.

---

### Problem: wrong Pi identified on the LAN (aurora's Pi)

- **Date:** 2026-08-27
- **Component:** tooling
- **Status:** resolved

**Symptom**
The scan found one Pi MAC (`b8:27:eb`, at `.33`) which rejected the `pi-lamp` key; the
user warned several Pis run on the LAN.

**Diagnosis trail**
1. The only Pi-OUI MAC on the subnet was `.33` — assumed ours, but both the `pi-lamp`
   ed25519 key AND the unique bootstrap password (from `userconf.txt`) were rejected.
2. The bootstrap password can only be known to our freshly flashed card → `.33` was
   conclusively NOT our Pi (it was aurora's).
3. Our Pi only appeared after the PSU fix + rfkill unblock, at `.34` (fresh SSH host key,
   key auth worked).

**Root cause**
Multiple Pis on the same LAN; don't trust MAC/OUI or ARP alone.

**Fix applied**
Identity check = SSH key acceptance, then unique-bootstrap-password test. `.34` confirmed.

**Prevention / follow-up**
Bake a unique host key fingerprint or password test into the bootstrap procedure; record
the expected MAC from the DHCP lease when available.

---

### Problem: Docker impossible on armv6 — deploy natively instead

- **Date:** 2026-08-27
- **Component:** deploy
- **Status:** resolved (decision record)

**Symptom**
The repo's `docker-compose.yml` + Dockerfiles were the historical deploy method; the
docker-ce apt repo no longer builds armv6.

**Diagnosis trail**
- Docker CE dropped `linux/arm/v6` images after 20.10; Debian's `docker.io` is armv7+.
- Old deployment images (`balenalib/...-node:10-run`, `arm32v6/nginx:alpine`) are EOL.
- The Pi Zero W cannot run any modern Docker.

**Root cause**
armv6 hardware is past Docker's support horizon.

**Fix applied**
Native systemd deploy: fcserver + Node backend + nginx, all as non-root service user
`lamp` with hardened units (`NoNewPrivileges`, `ProtectSystem`, `PrivateTmp`,
`RestrictAddressFamilies`, `DevicePolicy=closed` + explicit device allow).

**Prevention / follow-up**
Repo deploy artifacts (`docker-compose.yml`, Dockerfiles, `fadecandy/install.sh`) are now
out of sync with reality — rewrite them for the native systemd layout.

---

### Problem: no official Node.js for armv6 — use unofficial-builds

- **Date:** 2026-08-27
- **Component:** backend
- **Status:** resolved

**Symptom**
`node --version` failed on the Pi; `nodejs.org` 404'd on `node-v16.20.2-linux-armv6l.tar.xz`.

**Diagnosis trail**
`dist/index.json` from nodejs.org: the last official armv6l builds are v10.24.1 (2021).
`unofficial-builds.nodejs.org/download/release/index.json` lists armv6l up to v22.23.2
(2026-07-29).

**Root cause**
Official Node dropped armv6l after Node 10; the unofficial-builds channel (same infra,
community-compiled) keeps armv6l alive through Node 22.

**Fix applied**
Installed `node-v22.23.2-linux-armv6l.tar.xz` from unofficial-builds to `/usr/local`.
This is a third-party channel: pinned version, checksums verified at install time.

**Prevention / follow-up**
Do not attempt to install a newer official Node on this Pi. If the unofficial channel
disappears, the backend must run on whatever armv6l build remains (or be re-architected).

---

### Problem: npm install failed with ERR_INVALID_ARG_TYPE ("path ... Received null")

- **Date:** 2026-08-27
- **Component:** backend
- **Status:** resolved

**Symptom**
`sudo -u lamp env HOME=/srv/lamp-backend npm install --omit=dev` failed with
`ERR_INVALID_ARG_TYPE ... Received null` at `Shrinkwrap.save`; `node_modules` stayed empty.

**Diagnosis trail**
npm debug log showed `verbose cwd /home/pi` — npm ran with the SSH session's cwd, not the
target directory; the service user's HOME handling confused the shrinkwrap write target.

**Fix applied**
`sudo npm install --prefix /srv/lamp-backend --omit=dev --package-lock=false --no-audit --no-fund`
(no package-lock.json is shipped to the Pi).

**Prevention / follow-up**
Always pass `--prefix` (or `cd` inside the script) for service-user installs; keep
`--package-lock=false` when no lock file is deployed.

---

### Problem: frontend assets served as text/html (MIME type error in browser)

- **Date:** 2026-08-27
- **Component:** frontend
- **Status:** resolved

**Symptom**
Page loaded, then: "Failed to load module script ... server responded with a MIME type of
`text/html`" for `/assets/index-*.js`.

**Diagnosis trail**
nginx `try_files $uri $uri/ /index.html` falls back to index.html when the file is not
readable → MIME `text/html`. `ls -la /var/www/lamp/assets` showed mode `700` (files copied
via `scp` then `cp` preserved restrictive permissions), so nginx (www-data) got 404s.

**Root cause**
`scp -r` created the dist tree with private perms on the source; the copy to the webroot
kept them.

**Fix applied**
`sudo chmod -R a+rX /var/www/lamp` (dirs 755, files 644). Verified:
`200 application/javascript` for the JS asset.

**Prevention / follow-up**
After any webroot copy, run the chmod (or tar/rsync with `-p` from a sane source). A
future CI deploy should normalize perms in the build step.

---

### Problem: fcserver cannot open the FadeCandy — "Access denied (insufficient permissions)"

- **Date:** 2026-08-27
- **Component:** fcserver
- **Status:** resolved

**Symptom**
`lamp-fc-server` started, logged `Server listening`, then
`Error opening Fadecandy: Access denied (insufficient permissions)`. No `/dev/ttyACM*`.

**Diagnosis trail**
- `lsusb`: FadeCandy enumerated (`1d50:607a`, serial `XNZHZFTZDFIVGPQX`) — hardware fine.
- Interface descriptor: `bInterfaceClass 255` (Vendor Specific) — fcserver talks to the
  device via **libusb** (`/dev/bus/usb/...`), not a tty node (the `Fadecandy Bootloader`
  second interface is normal firmware behavior).
- The hardened systemd unit had `DevicePolicy=closed` with only `/dev/ttyACM0` allowed →
  libusb open blocked; additionally the `lamp` user was in no USB group.

**Fix applied**
1. `/etc/udev/rules.d/99-fadecandy.rules`:
   `SUBSYSTEM=="usb", ATTRS{idVendor}=="1d50", ATTRS{idProduct}=="607a", GROUP="dialout", MODE="0660"`
2. `usermod -aG dialout lamp`
3. Unit: `DeviceAllow=/dev/bus/usb/* rw` + `/dev/ttyACM* rw`, `udevadm trigger`, restart.

**Prevention / follow-up**
When hardening USB services, allow the `char-usb` path or `/dev/bus/usb/*` — tty rules
alone don't cover libusb access.

---

### Problem: fcserver FadeCandy open fails with "Input/Output Error" (open)

- **Date:** 2026-08-27
- **Component:** fcserver
- **Status:** open

**Symptom**
After the permissions fix the error changed to `Error opening Fadecandy: Input/Output Error`
— the libusb control handshake to the device fails.

**Diagnosis trail**
- Soft replug (`/sys/bus/usb/devices/1-1/authorized` 0→1) did not help.
- `strace` shows fcserver enumerates the device correctly (reads
  `/sys/bus/usb/devices/1-1/descriptors`), then the open ioctl fails — the trace cut off
  before the failing call was captured.
- Old stretch `cmdline.txt` contained `dwc_otg.lpm_enable=0`; trixie's did not. Added
  `dwc_otg.lpm_enable=0 usbcore.autosuspend=-1` to `/boot/firmware/cmdline.txt` and
  rebooted — **no change** (same EIO).
- Device works on the same Pi under stretch (old system) → kernel 6.18 USB stack +
  FadeCandy quirk or PSU-current issue when the FadeCandy is powered from the Pi's USB.

**Root cause**
Not yet isolated. Prime suspects (in order): kernel/dwc_otg behavior change vs the 2019
fcserver binary's libusb usage; marginal 5V current with Pi + WiFi + FadeCandy on one PSU;
a device-side state (firmware) issue.

**Fix applied**
None yet.

**Prevention / follow-up**
Next steps to try: capture the exact failing ioctl with `strace -f -e trace=ioctl` on a
non-systemd foreground run (stop the service first); try `usbreset`/`libusb_reset` before
open; test the FadeCandy on the other Pi (aurora, `.33`) with the same binary to split
device-vs-Pi; try powering the FadeCandy from a separate 5V supply; re-flash the OLD
stretch backup as a control (does the device work there?).

---

### Problem: bootstrap password stopped working mid-session

- **Date:** 2026-08-27
- **Component:** tooling
- **Status:** resolved

**Symptom**
`sudo -S` with the bootstrap password suddenly reported "no password was provided" /
"incorrect password attempt" — after the hardening step.

**Diagnosis trail**
The hardening script rotated the `pi` password (`chpasswd`); the old bootstrap value no
longer valid for sudo.

**Root cause**
Session state assumption: a one-time bootstrap password is not stable once the user
password is rotated.

**Fix applied**
Use the rotated password (read from `/root/pi-password.txt` on the Pi; not recorded here).

**Prevention / follow-up**
Treat passwords as mutable; always re-read from the Pi's password file before scripting
sudo in later sessions.

---

### Problem: Windows PowerShell mangles inline shell scripts (heredocs, aliases, WSL NAT)

- **Date:** 2026-08-27
- **Component:** tooling
- **Status:** resolved (workaround)

**Symptom**
Several commands failed or corrupted when passed inline through `wsl -e bash -c` or over
ssh: heredocs (`<< 'EOF'`) parsed by PowerShell, `$(...)` expanded locally, `curl`
aliased to `Invoke-WebRequest`, `head`/`seq` missing, `arp` absent in WSL (NAT).

**Diagnosis trail**
Every failing command had the same shape: multi-line shell logic embedded in a PowerShell
string. Single-line commands were fine.

**Root cause**
PowerShell 5.1 parses `$`, backticks, `<`/`>` and word-aliases before bash ever sees them;
WSL2's NAT also hides the LAN ARP table (only the WSL gateway `172.21.x.x` appears).

**Fix applied**
Workflow rule adopted mid-session: write any non-trivial shell logic to a script file
(`write` tool → `C:\Users\theod\AppData\Local\Temp\opencode\*.sh`), `scp` it to the Pi
(or run via `wsl bash <path>`), and execute there. Use `curl.exe` (not `curl`) on Windows;
read ARP from the Windows host (`arp -a`), not from WSL.

**Prevention / follow-up**
For this repo's Pi work, keep reusing the temp script pattern; never inline heredocs in
PowerShell. A future agent could add a `scripts/pi/` helper folder to the repo with the
deploy scripts (currently scattered in the temp dir).