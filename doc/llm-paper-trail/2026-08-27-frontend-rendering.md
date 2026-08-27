# 2026-08-27 — Frontend preview: inverted rendering, frozen/flickering canvas, white bar

### Canvas & banner render inverted (top at the bottom)

- **Date:** 2026-08-27
- **Component:** frontend
- **Status:** resolved

**Symptom**
After the canvas migration, the main screen and the banner showed images upside
down (180° rotation) compared to the tower / source image.

**Diagnosis trail**
- Built an 8x21 test image with one red pixel at (0,0) and one green at (7,20)
  (`make-test-images.mjs`, PNG via `zlib`). Verified the PNG decodes correctly
  with `get-pixels` (red top-left, green bottom-right).
- `preview.ts` dump of the image strategy: red at flat pos 20, green at flat
  pos 0 — the **raster and flat data are upright** (image top-left → LED (0,0)).
- Browser probe (puppeteer + Edge): green marker rendered at canvas top-right,
  i.e. 180° from the raster.
- Old frontend grid: `display: grid; grid-auto-flow: column; direction: rtl`
  renders cells in *array order*. `convertRawFadeCandyDataToScreen` does
  `a.reverse()`, so array order == identity with the LED data.
- New canvas `screen.jsx` computed `col = x-1-floor(cell.index/y)` using
  `cell.index` — but `reverse()` **preserves the original flat index**, so the
  index is the flat position, not the array position. Result: 180° rotation.

**Root cause**
The canvas migration copied the old grid's arithmetic but applied it to
`cell.index` (flat position, preserved by `reverse()`) instead of the array
position. The old grid ignored `index` and used DOM order.

**Fix applied**
`screen.jsx draw()` iterates with the array position `i`:
`col = x - 1 - Math.floor(i / y); row = i % y`.
Also fixed `src/test/app.test.jsx`, which had codified the buggy rotation as
expected behavior.

**Prevention / follow-up**
Unit test now asserts the correct mapping (first cell → top-right, last cell →
bottom-left). Note: `screen.jsx` had lost its `./screen.scss` import in the
migration (see third entry below).

---

### Frontend flickers with the image strategy

- **Date:** 2026-08-27
- **Component:** frontend
- **Status:** resolved (hardening; perceptual flicker was not reproducible in
  headless probes)

**Symptom**
"Screen and banner render flickering" when using the image strategy.

**Diagnosis trail**
- Backend stream: raw socket capture shows distinct frames at 40fps for all 4
  shipped images (Sunset/Fire/Mountains/colors) — no freezes, no black frames,
  no A/B alternation in LED values (only ±1-2/255 integer jitter).
- Browser (lightweight probe, 30Hz digest sampling): main + banner canvases
  update continuously (461-477 distinct states per 20s, zero consecutive
  identical samples, zero all-black samples, zero ABAB transitions).
- Earlier "frozen stream" results were **probe artifacts**: a 60fps rAF loop
  building ~2MB hash strings starved the page's main thread, so React/socket
  handlers never ran.

**Root cause**
No data-path bug found. Remaining suspect for *perceptible* flicker: each frame
did `clearRect` + 168 `fillRect` on the visible canvas — the compositor can
present a black/partial canvas state between the clear and the last fill
(worst on the banner: canvas stretched to 100% width with `blur(5px)`, forcing
a full GPU re-raster per frame).

**Fix applied**
Offscreen double buffer in `screen.jsx`: cells are composed into an offscreen
canvas (black background + 168 cells), then the visible canvas is updated with
a single `drawImage` blit. The visible canvas therefore always presents a
complete frame.

**Prevention / follow-up**
If flicker persists on the user's machine after this change, capture with a
*lightweight* probe (digest sampling, no heavy per-frame hashing).

---

### Small white bar at the bottom of the main screen

- **Date:** 2026-08-27
- **Component:** frontend
- **Status:** resolved

**Symptom**
A thin white bar under the pixel grid of the main (right-side) screen.

**Diagnosis trail**
Probe of `getBoundingClientRect`: `.screen-container` 531px tall, canvas
525px → 6px gap. Canvas computed style was `display: inline` (default for
canvas), which reserves descender space below the text baseline — the white
page background showed through. The banner was unaffected because
`.small-screen` has `background-color: black`.

**Root cause**
Two compounding issues: (1) the canvas is inline by default and sits on the
baseline; (2) `screen.scss` (`margin: 0 auto; width: max-content`) had become
**dead code** — its import was dropped from `screen.jsx` during the canvas
migration, so `.screen` had no styles at all.

**Fix applied**
Restored `import './screen.scss'` in `screen.jsx` and added
`display: block` to `.screen`.

**Prevention / follow-up**
Probe asserts canvas bottom == container bottom (delta 0).