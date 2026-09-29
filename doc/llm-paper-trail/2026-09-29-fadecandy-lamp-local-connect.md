# FadeCandy unreachable via `lamp.local` from the long-running backend

- **Date:** 2026-09-29
- **Component:** backend (FadeCandyConnection) / tooling
- **Status:** workaround

**Symptom**
Running the backend against the real lamp with the default URL
(`FADE_CANDY_URL` unset → `ws://lamp.local:7890`) looped forever on:

```
Trying to connect to the FadeCandy
Unable to connect to the fadecandy
Connection to the fadecandy fail. Reconnecting
```

while `Test-NetConnection lamp.local -Port 7890` returned
`TcpTestSucceeded=True` and a one-shot `ws` client to the same URL opened fine.

**Diagnosis trail**
- `Resolve-DnsName lamp.local` returns **two** addresses: an IPv6 link-local
  (`fe80::ba27:ebff:fe58:dc47`) and IPv4 `192.168.17.34`.
- A one-shot `new WebSocket('ws://lamp.local:7890')` (the same `ws` package the
  backend uses, from `backend/node_modules`) opened; `ws://192.168.17.34:7890`
  also opened.
- A 5-attempt sequential loop against `ws://lamp.local:7890` opened on 4 attempts
  and **timed out once** — so resolving the hostname is at least flaky, while the
  IPv4 literal was consistently immediate.

**Root cause**
Not fully isolated. The FadeCandy side (`fcserver`) is reachable on TCP and via
WebSocket; the difference is the **hostname**, which resolves to a link-local
IPv6 address with no zone id alongside IPv4. The suspicion is the client
occasionally selecting/attempting the unreachable `fe80::` address instead of
falling back quickly to IPv4. The one-shot test happened to hit IPv4, so this is
not a clean A/B.

**Fix applied (workaround)**
Point the dev backend at the IPv4 literal instead of the hostname (the real
fadeCandy socket):
`select-strategy` / dev startup with
`$env:FADE_CANDY_URL=('ws://192.168.17.34:7890'); npm run dev`. Connected
immediately and stayed connected (the strategy was then driven over Socket.IO and
verified on the LEDs).

**Prevention / follow-up**
- For real-lamp bring-up, prefer the IPv4 literal (or an IPv4-only resolver) over
  `lamp.local` until the IPv6 fallback is understood. Note the IP is DHCP and can
  change; `scripts/pi/scan.sh` finds the Pi.
- Possible real fix to investigate: force IPv4 in `FadeCandyConnection`
  (`dns.setDefaultResultOrder('ipv4first')` before `new WebSocket(...)`) and/or a
  connect timeout that moves to the next address.
