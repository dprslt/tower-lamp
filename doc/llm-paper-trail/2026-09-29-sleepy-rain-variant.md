# Sleepy Rain: a softer second rain variant

- **Date:** 2026-09-29
- **Component:** backend (RainStrategy / SleepyRainStrategy), frontend (strategies-data)
- **Status:** resolved

**Symptom**
The original `rain` tile ("Rainy Day") was too violent and too violet for a
wind-down mood, and its lightning "sparked" often enough to be distracting. The
request was a **second animation next to it** — slower, bluer, drowsy, but still
readable as rain. On the real tower the first tuning pass then produced the
opposite problems: too many drops permanently on screen, then too many fully
black stretches with no drops at all, and some drops reading too bright.

**Diagnosis trail**
The old `RainStrategy` hard-coded every knob (speed, palette, density, flashes)
as module constants, so a second behaviour could not exist without editing the
class. It was refactored into a `RainConfig` with a `STORM_RAIN` preset that is
byte-identical to the previous behaviour (the existing `rain-strategy.test.ts`
was left untouched and stays green), plus a new `SLEEPY_RAIN` preset.

The soft preset was then tuned headlessly (`preview.ts`) and on the tower:

- **Speed** — 4–7 rows/s felt too slow to still read as rain; +20% (4.8–8.4)
  was still slow; settled on **75% of the original storm speed: 10.5–18 rows/s**
  (original = 14–24).
- **Density** — a steady spawn kept the screen populated non-stop. With a low
  drop cap the screen *never* emptied, because `nextDropAt` only advanced when a
  spawn actually happened, so a capped stream just refilled immediately. Real
  quiet gaps needed an explicit burst-then-pause schedule. First try
  (1–2 drops, 3.5–6.5 s pause) left too many **all-dark** frames once drops fell
  fast; shortened the pause to **1.1–2.2 s** (preview: drops in ~54/60 frames,
  with only brief breaths).
- **Light** — the lightest cyan stops (250–255) read too bright. Palette capped
  around 228 and global `brightness` lowered to **0.55**.

**Root cause / design**
Two things: (1) the class exposed no way to vary speed/density/colour, so a
second animation required parameterising it; (2) "more moments without drops"
cannot be expressed with a capped continuous spawner — it needs an explicit
burst/pause cadence, otherwise the moment a slot frees up it is refilled.

**Fix applied**
- `backend/src/canvasStrategies/RainStrategy.ts`
  - `RainConfig` (+ optional `ShowerConfig`: `burstMin/burstMax`, `spacingMs`,
    `pauseMinMs/pauseMaxMs`; + `brightness`). `PALETTE` exported.
  - `STORM_RAIN` = former constants (unchanged behaviour, `brightness: 1`).
  - Spawn: when `config.shower` is set, spawn 1–N drops spaced `spacingMs`,
    then wait `pauseMin..MaxMs`; otherwise the classic continuous stream.
  - `brightness` resolves from `params.brightness ?? config.brightness`.
- `backend/src/canvasStrategies/SleepyRainStrategy.ts` (new)
  - Blue `PALETTE`, 10.5–18 rows/s, max 3 drops, burst 1–2 every ~1.1–2.2 s,
    long fade (0.22 s), rare/soft flashes, `brightness: 0.55`.
- `backend/src/CanvasStrategyFactory.ts` — register `sleepy-rain`.
- `frontend/src/components/strategies/strategies-data.js` — new **"Sleepy
  Rain"** tile (inline SVG icon) next to "Rainy Day".
- `frontend/src/components/strategies/CircleStrategy.jsx` — render its icon
  (same `ImageStrategy` path as the other animations).
- `backend/src/StrategyLightState.ts` — `sleepy-rain` ambient colour (average of
  its palette), so the HA light reports a blue hue.

**Verification**
- `npm run check-types` clean; backend suite 63/63; frontend `eslint` + vitest
  green.
- Headless preview: confirmed pauses/bursts and the darker palette (no long
  all-dark windows, ~54/60 frames with drops); `distinctColors` oscillates
  between peaks (bursts) and low ambient values (breaths).
- Live tower (`FADE_CANDY_URL` pointed at the real FadeCandy):
  `select-strategy {name:'sleepy-rain'}` → logs `Launching new strategy :
  sleepy-rain`; verified on the LEDs.

**Prevention / follow-up**
- Any new rain flavour should be a `RainConfig` preset + a one-line subclass,
  not a fork of the class. Keep `STORM_RAIN` in sync with the original look.
- Quiet gaps are a *schedule* (burst/pause), not a side effect of the drop cap.
