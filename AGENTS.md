# AGENTS.md

## Project overview

Tower lamp: a physical LED tower (8 columns x 21 rows = 168 LEDs) driven by a
FadeCandy board, controlled through a web UI.

> When you hit a problem, paper-trail it in `doc/llm-paper-trail/` (template in its README).

> Avoid full-white (and other high-brightness) tests on the tower: 168 LEDs at full white
> draw a lot of power and the thermal dissipation is not optimal yet — prefer red for
> bring-up checks.

- **Hardware**: FadeCandy (fcserver) on a Raspberry Pi, LEDs wired to it.
- **Backend** (`backend/`): Node.js + TypeScript (tsx/tsc), Express + Socket.IO v4.
  Renders strategies (animations) on an offscreen raster, samples pixels, sends
  them to the FadeCandy over WebSocket and to browsers over Socket.IO.
- **Frontend** (`frontend/`): Vite + React 18 SPA (migrated from webpack 4 /
  React 16 / node-sass in 2026). Displays a live pixel preview and lets you
  pick/configure strategies.
- **FadeCandy** (`fadecandy/`): fcserver config + install scripts for the Pi.
- **Deploy**: native systemd on the Pi — see `.opencode/skills/deploy-tower/`
  (plus `scripts/` Pi toolbox). Legacy `docker-compose.yml` (backend 30008,
  frontend 80) is kept for reference.

## Branching / remote

- Default branch is `main`. Remote: `https://github.com/dprslt/tower-lamp`.

## Commands

### Backend (`backend/`)

- `npm run dev` — run from TypeScript sources via tsx watch (dev)
- `npm run dev:log` — same as `dev`, but stdout+stderr are appended to
  `logs/backend.log` (read this file instead of terminal output; see Gotchas)
- `npm run preview` — headless strategy preview CLI (`src/preview.ts`), renders
  frames without the lamp (see `.opencode/skills/lamp-preview/`)
- `npm run build` — compile TS to `build/` via tsc
- `npm run check-types` — typecheck only (`tsc --noEmit`)
- `npm run test` — node:test suite in `src/test/`

### Frontend (`frontend/`)

- `npm run dev` — Vite dev server (port 7085)
- `npm run dev:log` — same as `dev`, but stdout+stderr are appended to
  `logs/frontend.log` (read this file instead of terminal output; see Gotchas)
- `npm run test` — vitest (smoke tests in `src/test/`)
- `npm run lint` — `eslint src`
- `npm run build` — production build to `dist/`

## Headless preview (backend)

Render a strategy headlessly and dump what the LEDs would display (PNGs +
raw LED arrays + per-frame stats) for autonomous animation testing. Load
the `lamp-preview` skill for the full workflow.

## Architecture

### Backend flow

`backend/src/index.ts` is the entry point:

1. Creates an Express + Socket.IO server on port 30008.
2. Connects to the FadeCandy via `FadeCandyConnection` (WebSocket, auto-reconnect
   with 1s retry). URL comes from `FADE_CANDY_URL` env var.
3. Builds a `CanvasScreen` (8x21) and a `CanvasStrategyFactory`.
4. Socket.IO events: `get-strategies` (list), `select-strategy` (name + params).
   The current strategy is unmounted before mounting the new one.

Strategies (`backend/src/canvasStrategies/`, registered in
`CanvasStrategyFactory.ts`): `color`, `off`, `image`, `fireworks`, `rain`. All extend
`AbstractStrategy` and draw onto the canvas via `CanvasScreen` layers; the
screen samples the raster and pushes pixels to both the FadeCandy and browser
clients.

### Frontend structure

- `src/main.jsx` / `src/app/app.jsx` — entry + app shell.
- `src/components/screen/` — live pixel grid fed over Socket.IO
  (`screen-fetcher.jsx` reads `screen-update` frames).
- `src/components/strategies/` — UI to pick a strategy and its params
  (`strategies-data.js` declares each strategy's param controls).
- `src/page/` — `screen-page.jsx` (main view), `new-screen-page.jsx`.
- `src/backend-url.js` — backend WS URL: `VITE_BACKEND_WS_URL` or
  `<location.hostname>:30008` (works in dev and on the Pi alike).

## Default backend workflow (fake FadeCandy)

Unless the user explicitly asks for the real tower, run the backend against
the **fake FadeCandy server** — it exercises the full stack (Socket.IO,
`select-strategy`, 40fps refresh) and records what the lamp would receive,
Without touching the shared hardware. This is the default: if several
backends stream to the single real FadeCandy at once, their 40fps frame
streams interleave on the LEDs (blinking/flickering) — it is not a clean
last-writer-wins, so the fake keeps agents from corrupting each other's
bring-up work.

```bash
# terminal 1 — fake FadeCandy (default port 7891, records frames to fake-fc-out/)
node --import tsx src/fakeFadeCandy.ts --out fake-fc-out

# terminal 2 — real backend, plugged into the fake instead of the lamp
FADE_CANDY_URL=ws://127.0.0.1:7891 npm run dev
```

Assert against `fake-fc-out/latest.json` / `stats.json` (or the web UI) as
you would against the tower. Full workflow in the `lamp-preview` skill.

## Local development against the tower

You do NOT need to deploy to the Pi to test strategies: run the backend on the
dev machine and it drives the FadeCandy that lives on the lamp over the LAN
(fcserver on the Pi exposes `:7890` to the LAN on purpose for this).

- The lamp advertises itself over **mDNS** (avahi): `lamp.local` resolves to its
  current IP (`192.168.17.34` at last sighting, DHCP may change it). Prefer
  `lamp.local` over hardcoded IPs.
- To drive the **real tower** (only when the user explicitly asks, e.g.
  bring-up checks), run the backend pointing at the lamp's FadeCandy:

  ```bash
  cd backend
  npm run dev        # FADE_CANDY_URL defaults to ws://lamp.local:7890
  ```

  Override with `FADE_CANDY_URL` if needed. Expect the log line "Connected to
  the fadeCandy".
- The frontend dev server (`npm run dev`, port 7085) derives the backend URL
  from the page's hostname, so open it via the machine that runs the backend —
  or point `VITE_BACKEND_WS_URL=ws://localhost:30008` at the local backend.
- Reminder: the tower is real hardware — prefer red over full-white test
  patterns, and be aware that mounting a strategy locally lights the actual
  LEDs.

## Gotchas / conventions

- **Socket.IO is v4 on both sides** (`socket.io@^4.8` server, `socket.io-client@^4.8`
  in the frontend). Events: `get-strategies` / `strategies` / `select-strategy`
  (client→server), `screen-update` (flat RGBA frame, 4-byte prefix + 8*21*3),
  `screen-image` (server→client).
- **Software rasterizer**: the backend renders with `Rasterizer.ts` (pure TS,
  no native deps) — do NOT reintroduce node-canvas/konva-node, they do not
  build on modern Node/Windows.
- **LAN addressing**: use `lamp.local` (mDNS/avahi, see above) rather than
  hardcoding IPs. Stale IPs remain in the legacy `docker-compose.yml`
  (`192.168.1.71:7890`).
- `backend/src/index.ts` contains large commented-out legacy socket handlers —
  keep them unless explicitly asked to remove.
- `.gitignore` lists `.gitignore` itself (harmless quirk). `node_modules/`,
  `build/`, `.idea/` are ignored.
- Backend license is MIT, frontend is ISC (as declared in their package.json).
- **Local dev logs**: `npm run dev:log` in `backend/` and `frontend/` runs the
  dev server with stdout+stderr appended to `backend/logs/backend.log` and
  `frontend/logs/frontend.log` (the `logs/` dir is created on start and
  git-ignored). Agents should read those files instead of terminal output — a
  server started by someone else (or by another agent) only writes there.
- Logging uses `console` in the backend (there is a `log4js` dependency but it
  is not wired up).

## Running dev servers (Orca terminal preference)

Long-lived processes (backend `npm run dev`, frontend `npm run dev`) should live
in an Orca terminal when Orca is available, so the user can see/stop them in the
Orca UI — do not default to the raw OS or WSL shell for them.

- Resolve the Orca CLI per the `orca-cli` skill (`ORCA_CLI_COMMAND` → `orca-dev` →
  `orca-ide` → `orca`), then confirm the app is up once per session:
  `orca status --json`.
- If Orca is running, start each dev server in its own terminal:
  `orca terminal create --worktree active --title "backend" --command "npm run dev" --json`
  (repeat for the frontend), then use `orca terminal list` / `read` / `send` /
  `stop` to interact with and shut them down.
- If Orca is not available, run dev servers in the current shell as background
  jobs (never blocking), and stop them when done.

## Parallel worktrees (dev ports, deps, shared hardware)

Several agents can work **in parallel**, each in its own linked git worktree,
without colliding:

- **Deterministic per-worktree ports**: `npm run dev` in `backend/` and
  `frontend/` run through `scripts/with-port.mjs`, which derives a
  deterministic port from the current git branch when run inside a linked
  worktree (backend: 30009-31007, frontend: 7086-8084). The main checkout
  keeps the defaults (:30008 / :7085), and an explicit `PORT` env var always
  wins. The `[with-port]` log line prints the resolved port; in a linked
  worktree the frontend also auto-points `VITE_BACKEND_WS_URL` at the
  worktree's own backend (override with a `VITE_BACKEND_WS_URL` env var).
- **Deps are auto-installed on worktree creation**: `orca.yaml` runs
  `scripts/setup-worktree.mjs` (links gitignored config — `.opencode/` — and
  pre-seeds `node_modules` from the primary worktree) then `npm ci` in
  `backend/` and `frontend/`, so a fresh worktree is immediately ready.
- **The only shared resource is the real tower**: the FadeCandy is a single
  physical device (one `:7890` WebSocket endpoint on the lamp). Parallel
  agents can each run their own backend + frontend stack, but if several
  backends point `FADE_CANDY_URL` at the lamp at once, their frame streams
  interleave on the LEDs (blinking/flickering, not a clean last-writer-wins).
  The default fake-FadeCandy workflow (see above) sidesteps this entirely —
  only point a backend at the lamp when the user explicitly asks for a
  bring-up check, and remember mounting a strategy locally lights the actual
  LEDs (prefer **red** over full-white).
