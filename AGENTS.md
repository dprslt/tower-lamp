# AGENTS.md

## Project overview

Tower lamp: a physical LED tower (8 columns x 21 rows = 168 LEDs) driven by a
FadeCandy board, controlled through a web UI.

> When you hit a problem, paper-trail it in `doc/llm-paper-trail/` (template in its README).

> Avoid full-white (and other high-brightness) tests on the tower: 168 LEDs at full white
> draw a lot of power and the thermal dissipation is not optimal yet — prefer red for
> bring-up checks.

- **Hardware**: FadeCandy (fcserver) on a Raspberry Pi, LEDs wired to it.
- **Backend** (`backend/`): Node.js + TypeScript, Express + Socket.IO. Renders
  strategies (animations) on an offscreen canvas, samples pixels, sends them to
  the FadeCandy over WebSocket and to browsers over Socket.IO.
- **Frontend** (`frontend/`): React 16 + Redux + webpack. Displays a live
  pixel preview and lets you pick/configure strategies.
- **FadeCandy** (`fadecandy/`): fcserver config + install scripts for the Pi.
- **Deploy**: `docker-compose.yml` — backend on port 30008, frontend on port 80.

## Branching / remote

- Default branch is `main`. Remote: `https://github.com/dprslt/tower-lamp`.

## Commands

### Backend (`backend/`)

- `npm run start-dev` — run from TypeScript sources via Babel register (dev)
- `npm run build` — compile TS/TSX to `build/` via Babel + tsc declarations
- `npm run check-types` — typecheck only (`tsc`)

### Frontend (`frontend/`)

- `npm start` — webpack-dev-server (dev, port 3001)
- `npm run build` — production build to `dist/`
- `npm run lint` — `eslint src`

There is no test suite. Do not invent one without asking.

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
`CanvasStrategyFactory.ts`): `color`, `off`, `image`. All extend
`AbstractStrategy` and draw onto the canvas; `CanvasScreen` samples the canvas
and pushes pixels to both the FadeCandy and browser clients.

### Frontend structure

- `src/components/screen/` — live pixel grid; `local-screen-fetcher.jsx` reads
  the FadeCandy feed directly, `screen-fetcher.jsx` goes through the backend.
- `src/components/strategies/` — UI to pick a strategy and its params.
- `src/store/` — Redux store, actions, reducers.
- `src/page/` — `screen-page.jsx` (main view), `new-screen-page.jsx`.
- `src/StatePersister.js` — persists state (localStorage).

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
  npm run start-dev        # FADE_CANDY_URL defaults to ws://lamp.local:7890
  ```

  Override with `FADE_CANDY_URL` if needed. Expect the log line "Connected to
  the fadeCandy".
- The frontend dev server (`npm start`, port 3001) still hardcodes a stale
  backend URL (`192.168.1.35:30008` in `webpack.dev.config.js`); for a full
  local stack point `BACKEND_WS_URL` at the locally-run backend.
- Reminder: the tower is real hardware — prefer red over full-white test
  patterns, and be aware that mounting a strategy locally lights the actual
  LEDs.

## Gotchas / conventions

- **Old dependency stack**: React 16, webpack 4, node-sass 4, TypeScript 3.7,
  Babel 7. Do not upgrade these casually; the toolchain is fragile (e.g.
  `node-sass` needs a matching Node version).
- **LAN addressing**: use `lamp.local` (mDNS/avahi, see above) rather than
  hardcoding IPs. The backend defaults to `ws://lamp.local:7890` and is
  overridable via `FADE_CANDY_URL`. Stale IPs remain in the legacy
  `docker-compose.yml` (`192.168.1.71:7890`) and `frontend/webpack.dev.config.js`
  (`192.168.1.35:30008`).
- `backend/src/index.ts` contains large commented-out legacy socket handlers —
  keep them unless explicitly asked to remove.
- `.gitignore` lists `.gitignore` itself (harmless quirk). `node_modules/`,
  `build/`, `.idea/` are ignored.
- `backend/yarn-error.log` is committed junk (personal machine paths) — do not
  add new generated logs; prefer removing it if you touch the area.
- Backend license is MIT, frontend is ISC (as declared in their package.json).
- Logging uses `console` in the backend (there is a `log4js` dependency but it
  is not wired up).