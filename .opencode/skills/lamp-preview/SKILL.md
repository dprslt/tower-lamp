---
name: lamp-preview
description: Use when rendering, previewing, or verifying what the tower lamp would display for a strategy or animation scenario, e.g. "preview the color strategy", "test this image slide animation", "check what the lamp shows". Covers the headless preview CLI (backend/src/preview.ts) that renders frames without the lamp and dumps LED arrays, PNGs, and per-frame stats for autonomous verification.
---

# Lamp headless preview

`backend/src/preview.ts` renders any strategy with the real pipeline
(`CanvasScreen` + `CanvasStrategyFactory`) and dumps exactly what the LEDs
would show — no sockets, no FadeCandy, no server, no real time. Animated
strategies (e.g. `image`) are driven with a mocked `Date.now`, so frames at
arbitrary simulated elapsed times are captured instantly.

## Run

From `backend/`:

```bash
node --import tsx src/preview.ts --strategy <name> [options]
```

| Option | Meaning | Default |
| --- | --- | --- |
| `--strategy <name>` | `color`, `off`, or `image` | `color` |
| `--params <json>` | inline strategy params | `{}` |
| `--params-file <path>` | strategy params from a JSON file — prefer on Windows, PS 5.1 mangles inline JSON quotes | — |
| `--frames <n>` | number of frames to capture | `1` |
| `--interval-ms <n>` | simulated elapsed time between frames | `0` |
| `--out <dir>` | output directory | `preview` |
| `--scale <n>` | pixel scale of the PNG output | `20` |

Examples:

```bash
# single static frame
node --import tsx src/preview.ts --strategy color --params '{"fill":"#ff8800"}'
# gradient sweep, 5 frames 1s apart (simulated)
node --import tsx src/preview.ts --strategy color --params-file params.json --frames 5 --interval-ms 1000 --out preview-out
# animated image slide: t=0..20s in 2s steps (10s slide + 10s reverse)
node --import tsx src/preview.ts --strategy image --params-file params.json --frames 11 --interval-ms 2000 --out preview-out
```

## Test the real backend against a fake FadeCandy

To exercise the full backend stack (Socket.IO, `select-strategy`, 40fps
refresh) without the tower, run the **fake FadeCandy server** and point the
backend at it:

```bash
# terminal 1: fake FadeCandy — records everything the backend sends
node --import tsx src/fakeFadeCandy.ts --port 7891 --out fake-fc-out

# terminal 2: the real backend, plugged into the fake instead of the lamp
FADE_CANDY_URL=ws://127.0.0.1:7891 npm run dev
```

The fake server records every packet the backend pushes (same 4-byte-prefix
protocol as the real FadeCandy): `frames/frame-NNNNN.json` (raw LED arrays),
`latest.json` (current frame) and `stats.json` (packet count + last frame
stats). Select strategies over the web UI / Socket.IO as usual and assert
against the recorded frames — the tower never lights up. Packets with an
unexpected size are logged and skipped.

Prefer the direct `node --import tsx` invocation over `npm run preview -- <args>`:
npm 12 does not forward `--`-prefixed args reliably (on npm 10 the script form
works). Image params need `data` (file path or data URL of a PNG/JPEG) and
optionally `duration` in seconds (default 10). The image strategy fails loudly
(exit 1) if the image cannot be decoded within 5s — e.g. a wrong path.

## Output

Per frame:
- `frame-NNN.json` — raw LED array: 504 values, column by column
  left-to-right, bottom-to-top; exactly what `flat()` sends to FadeCandy.
  Pixel at column `x`, row `y` (0 = bottom) is at index `(x * 21 + (20 - y)) * 3`.
- `frame-NNN.png` — 8x21 LEDs upscaled, top LED on the first row.

Plus `manifest.json` with per-frame stats for fast automated assertions:
`litPixels`, `avgBrightnessPct`, `distinctColors`, `allBlack`, `allSameColor`.

## Autonomous verification workflow

1. Write the scenario params to a JSON file.
2. Render: `node --import tsx src/preview.ts --strategy <name> --params-file params.json --frames N --interval-ms T --out out-dir`
3. Assert against `out-dir/manifest.json` — machine-readable, no image decoding needed:
   - not `allBlack` / expected `litPixels` and `avgBrightnessPct`
   - `distinctColors` to distinguish solid fills (1) from gradients (many)
   - animation sanity: frames at `t` and `t + period` must match; intermediate frames must differ
4. Only for human eyes: open `frame-NNN.png`. The raw `frame-NNN.json`
   arrays are the ground truth for exact pixel assertions.