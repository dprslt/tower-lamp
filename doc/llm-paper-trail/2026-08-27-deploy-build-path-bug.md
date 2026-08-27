# Deploy scripts copied the backend build to the wrong path (stale build ran)

- **Date:** 2026-08-27
- **Component:** tooling / scripts/pi
- **Status:** resolved

**Symptom**
After deploying latest main, the tower stayed black for the `fireworks`
strategy: the backend log kept saying `Not strategy found for name fireworks`,
even though the strategy worked locally and the fresh build was shipped.

**Diagnosis trail**
- `/tmp/build` on the Pi (what scp delivered) was fresh and correct.
- `/srv/lamp-backend/` root had loose build outputs (`index.js`,
  `canvasStrategies/`, ...) — the new files landed **outside** `build/`.
- `/srv/lamp-backend/build/` still held the **old** build (3 strategies, no
  FireworksStrategy) — and that is what the unit runs:
  `ExecStart=/usr/local/bin/node build/index.js`, `WorkingDirectory=/srv/lamp-backend`.
- The deploy scripts' copy line was `cp -r /tmp/build/* /srv/lamp-backend/`,
  which dumps the build **contents** into the app root, not into `build/`.
  npm install + service restart then completed against the old files, so the
  deploy "succeeded" while the service kept running the previous build.

**Root cause**
`deploy-backend.sh` (and my new `ship-backend.sh`, copied from it) used the
wrong destination for the build directory. The `systemd` unit expects
`/srv/lamp-backend/build/`, so the layout must be preserved — contents go
**into** `build/`, not the app root.

**Fix applied**
- Deployed correctly by hand:
  `rm -rf /srv/lamp-backend/build && cp -r /tmp/build /srv/lamp-backend/build && chown -R lamp:lamp ...` then restart.
- Verified `FireworksStrategy.js` present, backend restarted, and
  `select-strategy fireworks` now launches (no `Not strategy found`).
- Fixed both `scripts/pi/deploy-backend.sh` and `scripts/pi/ship-backend.sh`
  to replace `/srv/lamp-backend/build` (rm -rf + cp) and `chown -R lamp:lamp`.

**Prevention / follow-up**
- Deploy scripts should always verify the *running* artifact, not just
  "restart ok": after a backend deploy, check the log for a newly-added
  strategy or at least `Connected to the fadeCandy` from the *new* process.
- Note: `scripts/pi/test-strategy.mjs --json '<json>'` loses the JSON quotes
  when called through the PowerShell/bash tool layer on Windows — pass the
  JSON via a temp file + a tiny wrapper (see `fw-send.mjs` pattern), or use
  `wsl -e bash` with proper quoting where node exists.