# frontend

Vite + React 18 SPA talking to the backend over Socket.IO v4 (both sides migrated in 2026).

## Local dev

```bash
npm install
npm run dev        # http://localhost:7085
npm run test       # vitest run (smoke tests in src/test/)
npm run lint       # eslint src
npm run build      # vite build -> dist/
```

The backend Socket.IO server address is `VITE_BACKEND_WS_URL` (optional). When unset it is derived from the page's own hostname at runtime (`<location.hostname>:30008`), so the same build works in dev and on the Pi. See `.env.example`; the Docker build can bake it via build arg.

## Project structure

- `src/main.jsx` — entry point (BrowserRouter + App)
- `src/app/` — main script + global stylesheet (bootstrap scss)
- `src/page/` — pages: `/` (new screen + strategy pickers), `/old` (legacy debug canvas page)
- `src/components/` — screen grid (Screen/Pixel/ScreenFetcher), strategies (CircleStrategy + embedded images), header
- `src/assets/` → `public/` — assets (favicon)
- `src/test/` — smoke tests (Vitest + Testing Library, socket mocked)

## Déploiement en prod

Dockerfile builds with Vite in node:20-alpine, serves the SPA with nginx (`nginx.conf` has the history fallback). Optional build arg: `VITE_BACKEND_WS_URL`; if unset the app talks to `<page-host>:30008`.