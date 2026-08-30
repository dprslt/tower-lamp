# Rain strategy: stuck-pixel residue, lightning blinking, steppy drops

- **Date:** 2026-08-30
- **Component:** backend (RainStrategy)
- **Status:** resolved

**Symptom**
On the tower, the rain animation shows artifacts along the path of each
falling drop, and the lightning flash "blinks" randomly. Drops also advance in
jerky 2–3 frame steps instead of falling smoothly.

**Diagnosis trail**
Rendered the strategy headlessly at real frame cadence and inspected raw LED
arrays:

```bash
node --import tsx src/preview.ts --strategy rain --frames 600 --interval-ms 25 --out preview-rain-600
```

- Column traces showed every cell that was ever lit decaying to `2,2,2` and
  **staying there forever** (rows 5–15 of the sampled column were a permanent
  `2,2,2` band after ~4s of rain). At 40fps the fade is
  `Math.round(cell * 0.806)`, whose fixed points are 1 and 2 — cells can never
  reach 0.
- During the strike (frames 320+), branch cells on the bolt
  (`if (y > 0 && Math.random() < 0.35)`, evaluated **every frame**) popped
  bright/dim randomly frame-to-frame (e.g. col 1 y=3: `11,10,21 → 56,47,99 →
  ... → 52,43,91` — re-branched twice).
- The drop head was stamped at `Math.round(drop.y)` while moving only
  0.35–0.6 rows/frame, so it sat 2–3 frames per row then jumped.

**Root cause**
Three independent bugs in `RainStrategy.ts`:

1. `Math.round()` in the exponential fade creates a dead zone: values 1–2 are
   multiplicative fixed points, so every pixel leaves permanent residue.
2. `Math.random()` inside the per-frame bolt render makes the bolt branches
   blink unpredictably during the flash.
3. Quantized head stamping (`Math.round(drop.y)`) with sub-pixel velocities
   produces stuttery, non-physical motion.

**Fix applied** (`backend/src/canvasStrategies/RainStrategy.ts`)

1. Grid now holds floats; the fade is a plain `cell *= fade` (monotonic decay
   to true zero). `stamp()` no longer rounds.
2. Bolt is fully deterministic: jitter is fixed at strike time (as before), the
   per-frame `Math.random()` branch is gone; a persistent "fork" cell is
   stamped where the jitter steps sideways. The bolt has its own
   `BOLT_LIFE_S = 0.12` (fades out while the 0.45s sky flash continues).
3. Drop head uses fractional rendering: `row = floor(y)` at intensity 1 plus
   the cell below at intensity `frac = y - floor(y)`, so the next row ramps
   up before the head arrives — constant-velocity smooth fall, no stutter.

**Verification**
- `npm run check-types` clean; full suite `npm run test` 58/58 (5 consecutive
  runs).
- New `backend/src/test/rain-strategy.test.ts` (deterministic, mocked clock):
  - screen returns exactly to the ambient baseline after drops+lightning clear
    (catches any fade dead zone);
  - every pixel is monotone non-increasing after the strike (catches per-frame
    random bolt flicker);
  - a drop at vy=20 advances exactly one row every two frames with the
    below-head cell at `frac` intensity (catches stutter/skips).
- Headless preview: bolt decays cleanly frame-to-frame, no residue cells, and
  per-frame stats return to the ~12% rain baseline between strikes (peak 20.3%
  at the strike).

**Prevention / follow-up**
- Keep multiplicative fades on floats; never `Math.round()` inside a fade loop.
- Never call `Math.random()` inside a per-frame render path — randomize once
  at spawn/strike, not every frame.