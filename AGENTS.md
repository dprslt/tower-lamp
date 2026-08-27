# AGENTS.md

Notes for agents working on this repo.

> When you hit a problem, paper-trail it in `doc/llm-paper-trail/` (template in its README).

> Avoid full-white (and other high-brightness) tests on the tower: 168 LEDs at full white
> draw a lot of power and the thermal dissipation is not optimal yet — prefer **red** for
> bring-up checks.

## Layout

- `backend/` — Node + TypeScript server (tsc build): Socket.IO v4 server on port 30008, renders the 8x21 lamp screen with a pure-TS rasterizer (no native deps) and pushes frames to FadeCandy over WebSocket.
- `frontend/` — Vite + React 18 SPA (migrated from webpack 4 / React 16 / node-sass in 2026).
- `fadecandy/` — FadeCandy controller binaries/config for the Raspberry Pi.
- `scripts/pi/` — deployment toolbox for the tower Pi (see the `deploy-tower` skill in `.opencode/skills/`).
- **Deploy**: native systemd on the Pi (`lamp-fc-server`, `lamp-backend`, nginx) — no Docker (docker-ce has no armv6 builds anymore and the Pi Zero W can't run modern Docker).

## Branching / remote

- Default branch is `main`. Remote: `https://github.com/dprslt/tower-lamp`.

## Gotchas

- **Socket.IO protocol is v4 on both sides** (migrated from v2 in 2026 together with the frontend). Events: `get-strategies` / `strategies` / `select-strategy` (client→server), `screen-update` (flat RGBA frame, 4-byte prefix + 8*21*3), `screen-image` (server→client, currently never emitted). The backend renders with a software rasterizer (`Rasterizer.ts`) — do NOT reintroduce node-canvas/konva-node (they don't build on modern Node/Windows, and node-canvas is not installable on the Pi's armv6 Node).
- **Frame pacing**: the backend refreshes at 40fps via a drift-free scheduler (wall-clock aligned setTimeout chain). Do not switch back to `setInterval` — coarse OS timer granularity (Windows) drops the cadence to ~32fps.
- **FadeCandy interpolation** is enabled (`fadecandy/config.json`, `"interpolate": true`) — it smooths transitions between backend frames and prevents flicker. Keep it on.
- **No hardcoded LAN IPs or hostnames.** The backend URL is `VITE_BACKEND_WS_URL` (optional; see `frontend/.env.example`). When unset the frontend derives it from the page's own hostname (`<location.hostname>:30008`), which works in dev and on the Pi alike. The backend's `FADE_CANDY_URL` is a runtime env var (systemd: `ws://127.0.0.1:7890` on the Pi; dev default `ws://lamp.local:7890` — mDNS).
- **No test suite historically; smoke tests live in `frontend/src/test/`** (Vitest + Testing Library, socket mocked) and `backend/src/test/` (node:test, pure-TS renderer). Run `npm run test`, `npm run lint`, `npm run build` from `frontend/` and `backend/`.
- **Frontend is plain JSX** (no TypeScript in `src/`) — esbuild/Vite handles JSX natively, no Babel presets needed. The backend is TypeScript built with plain `tsc` (no Babel).
- The tower Pi is a **Pi Zero W (armv6l)** running Node 22.23.2 from unofficial-builds — do not "upgrade" it, and never build native deps for it.
- Backend license is MIT, frontend is ISC (as declared in their package.json).

## Local development against the tower

You do NOT need to deploy to the Pi to test strategies: run the backend on the
dev machine and it drives the FadeCandy that lives on the lamp over the LAN
(fcserver on the Pi exposes `:7890` to the LAN on purpose for this).

- The lamp advertises itself over **mDNS** (avahi): `lamp.local` resolves to its
  current IP (`192.168.17.34` at last sighting, DHCP may change it). Prefer
  `lamp.local` over hardcoded IPs.
- Run the backend locally, pointing at the tower's FadeCandy (this is the
  default):

  ```bash
  cd backend
  npm run dev        # FADE_CANDY_URL defaults to ws://lamp.local:7890
  ```

  Override with `FADE_CANDY_URL` if needed. Expect the log line "Connected to
  the fadeCandy".
- The frontend dev server (`npm run dev`, port 7085) connects to
  `localhost:30008` by default (same machine); set `VITE_BACKEND_WS_URL` to
  point elsewhere (see `frontend/.env.example`).
- Reminder: the tower is real hardware — prefer red over full-white test
  patterns, and be aware that mounting a strategy locally lights the actual
  LEDs.

## Commands

```bash
# backend (port 30008)
cd backend
npm install
npm run dev         # tsx watch
npm run test        # node --test
npm run lint        # eslint src
npm run build       # tsc -> build/

# frontend (port 7085)
cd frontend
npm install
npm run dev         # http://localhost:7085
npm run test        # vitest run
npm run lint        # eslint src
npm run build       # vite build -> dist/
```