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

**Native systemd — no Docker** (docker-ce dropped armv6, and the repo's old
`docker-compose.yml` is legacy). Three services:

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