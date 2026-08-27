# Tower Lamp

A physical LED tower — 8 columns × 21 rows = **168 LEDs** — driven by a
[FadeCandy](https://github.com/scanlime/fadecandy) board, controlled from a web
browser. Strategies (animations) run on the backend and are rendered to the LEDs
in real time.

## Architecture

```
┌──────────────┐  socket.io   ┌──────────────┐   ws (pixels)   ┌────────────┐   USB    ┌──────────┐
│   Browser    │ ───────────► │   backend    │ ──────────────► │  fcserver  │ ────────► │ FadeCandy │
│ (React 18 +  │              │  (Node 22,   │                 │  (C++ WS   │          │   LEDs   │
│  Vite, :80)  │ ◄─────────── │  :30008)     │                 │   server)  │          │ 8 × 21   │
└──────────────┘  pixels +    └──────────────┘   ws://127.0.0.1 │  :7890     │          └──────────┘
                 strategies       ▲  ▲                             └──────────┘
                                  │  └─ CanvasScreen: renders the strategy, samples
                                  │     pixels, forwards them to fcserver + browsers
                                  └─ strategies: color / off / image (pure-TS rasterizer)
```

- **Frontend** (`frontend/`): React 18 + Vite SPA. Live pixel preview, pick and
  configure strategies. Served by nginx on port 80; talks to the backend on
  port 30008 (same host).
- **Backend** (`backend/`): Node + TypeScript + Express + Socket.IO. Mounts the
  current strategy, renders it offscreen (pure-TS rasterizer — no native canvas
  deps), samples the pixels and pushes them to the FadeCandy (via fcserver) and
  to browsers (for the live preview).
- **fcserver** (`fadecandy/`): the FadeCandy WS server. Exposes `:7890`, maps
  8 channels × 21 LEDs, applies gamma correction.

## Hardware

Raspberry Pi **Zero W (armv6l)** running Raspberry Pi OS **trixie**, hostname
`lamp`, `192.168.17.34`. The FadeCandy connects over USB; each of its 8 outputs
drives one 21-LED column.

## Deployment

**Native systemd — no Docker** (docker-ce dropped armv6 builds, which is why the
Docker stack was retired). Three services:

| Service | Runs | Port |
|---|---|---|
| `lamp-fc-server` | `fcserver-rpi`, user `lamp` | 7890 (LAN-exposed for local dev) |
| `lamp-backend` | `node build/index.js`, user `lamp` | 30008 |
| nginx | Vite build in `/var/www/lamp` | 80 |

All services run as non-root users with hardened systemd units; the firewall
(ufw) only allows 22/80/30008/7890 from the LAN, SSH is key-only, and
unattended-upgrades keep the OS patched.

Build the backend and frontend on a dev machine, then ship them with
`scripts/pi/deploy-backend.sh` and `scripts/pi/deploy-frontend.sh`. See
`.opencode/skills/deploy-tower/SKILL.md` for the full runbook.

## Integration MQTT (Home Assistant)

The lamp exposes itself on the Home Assistant MQTT network as a
**discoverable light** (rgb + brightness),
plus one **button entity per registered action** — no HA-side YAML required.

The MQTT client lives in the backend (`backend/src/MqttBridge.ts`). It reads
`/etc/lamp-backend/mqtt.conf` at startup and is **disabled unless a host is
configured**.

1. **Create a broker user** — if Mosquitto runs in Home Assistant: Settings →
   Mosquitto → Users, e.g. `lamp`. Otherwise:
   `sudo mosquitto_passwd -c /etc/mosquitto/passwd lamp`
2. **Create the config file** (the backend runs as user `lamp`, so the file
   must be readable by it — root-owned, group `lamp`):

   ```bash
   sudo mkdir -p /etc/lamp-backend
   sudo tee /etc/lamp-backend/mqtt.conf << EOM
   MQTT_HOST=192.168.17.150
   MQTT_PORT=1883
   MQTT_USER=lamp
   MQTT_PASS=mon_mot_de_passe
   EOM
   sudo chown root:lamp /etc/lamp-backend/mqtt.conf
   sudo chmod 640 /etc/lamp-backend/mqtt.conf
   ```
3. **Restart the daemon**: `sudo systemctl restart lamp-backend`

Optional keys in `mqtt.conf`: `MQTT_BASE_TOPIC` (default `tower_lamp/light`),
`MQTT_DISCOVERY_PREFIX` (default `homeassistant`), `MQTT_ACTIONS` (see below).
The `MQTT_*` environment variables are used as a fallback if the file is absent
(handy for local dev — export them before `npm run dev`). The file itself can be
overridden with `MQTT_CONFIG_FILE`.

Topics: `<base>/set` (commands), `<base>/state` (retained state),
`<base>/availability` (online/offline, plus LWT so a crash marks the entity
unavailable), discovery `<prefix>/light/tower_lamp/config`.

Commands on `<base>/set`:

```json
{"state": "ON", "color": {"r": 255, "g": 0, "b": 0}, "brightness": 128}
{"state": "OFF"}
```

Web UI strategy changes are mirrored back to `<base>/state`, so the HA entity
always tracks what the lamp is actually showing. The entity `light.tower_lamp`
appears automatically in Home Assistant (MQTT discovery).

### Actions (buttons)

Named strategies can be registered and exposed to HA as MQTT button entities,
one per action, via discovery. The registry is a JSON object mapping an action
id to a strategy + params. A default registry ships in
[`config/mqtt-actions.json`](config/mqtt-actions.json) (`sunset` gradient,
`fireworks` and a `stop` button); deploy it to the Pi and point `MQTT_ACTIONS`
at it:

```bash
sudo install -m 640 -o root -g lamp config/mqtt-actions.json /etc/lamp-backend/actions.json
# then add to /etc/lamp-backend/mqtt.conf:
#   MQTT_ACTIONS=/etc/lamp-backend/actions.json
sudo systemctl restart lamp-backend
```

Or override per-install with an inline JSON in `MQTT_ACTIONS`:

```json
{
  "sunset": {"strategy": "color", "params": {"fillLinearGradientColorStops": [0, "red", 1, "gold"]}},
  "logo":   {"strategy": "image", "params": {"data": "https://..."}}
}
```

Each action publishes discovery to `<prefix>/button/tower_lamp/<id>/config`
(command topic `<base>/action/<id>/set`, payload `press`) and shares the light's
availability topic. New animation strategies added later only need a new
registry entry.

### Known limitations

- The image strategy is not representable in a HA light entity: while an image
  animation runs, the last published light state is kept.
- Strategies have no brightness concept: brightness is implemented as RGB
  scaling of the solid fill.

## Tooling

- `scripts/pi/` — reusable helpers: `status.sh`, `logs.sh`, `exec.sh`,
  `root.sh`, `send.sh`, `scan.sh`, `verify.sh`, `deploy-*.sh`,
  `test-strategy.mjs` (send a color/animation straight to the lamp).
- `doc/llm-paper-trail/` — audit trail of problems/solutions for AI agents
  working on this repo (read before debugging).

## Notes

- The tower draws real power: avoid full-white tests (thermal dissipation is
  not optimal yet) — use **red** for bring-up checks.
- Frontend/backend modernization (Vite/React 18, TS5, socket.io v4) currently
  lives on the `dprslt/migrate-backend` branch in the repo worktrees and is
  what's deployed on the Pi; `main` still carries the legacy stack.