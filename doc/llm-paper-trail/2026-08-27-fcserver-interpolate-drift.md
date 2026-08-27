# Flicker regression: fcserver config drift (interpolate)

- **Date:** 2026-08-27
- **Component:** fadecandy/fcserver
- **Status:** resolved

**Symptom**
Tower flickered during animations. Repo `fadecandy/config.json` had
`"interpolate": true`, but the deployed `/srv/lamp-fc-server/config.json` on the
Pi still had `"interpolate": false`.

**Root cause**
Commit `8604c79` ("Enable FadeCandy interpolation to smooth frames and prevent
flicker") changed the repo config, but nothing redeployed it: `scripts/pi/` only
ships backend/frontend, and `fadecandy/install.sh` (the fcserver deploy path) was
not re-run.

**Fix applied**
Shipped the repo config and restarted fcserver (binary/unit untouched):

```bash
wsl -e bash scripts/pi/send.sh fadecandy/config.json /tmp/fc-config.json
wsl -e bash scripts/pi/root.sh "install -m 644 -o lamp -g lamp /tmp/fc-config.json /srv/lamp-fc-server/config.json && systemctl restart lamp-fc-server"
```

Verified: `grep interpolate /srv/lamp-fc-server/config.json` → `true`, fcserver
active, FadeCandy re-attached, backend auto-reconnected.

**Prevention / follow-up**
The fcserver config is the one runtime artifact not covered by
`deploy-backend.sh`/`deploy-frontend.sh`. Consider adding a `deploy-fcserver.sh`
(or a diff check in `status.sh`) so future config changes can't drift again.