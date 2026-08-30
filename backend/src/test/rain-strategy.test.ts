import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Server} from 'socket.io'
import {CanvasScreen} from '../screen/CanvasScreen'
import RainStrategy from '../canvasStrategies/RainStrategy'
import FadeCandyConnection from '../FadeCandyConnection'

const WIDTH = 8
const HEIGHT = 21

function fakeFadeCandy(): FadeCandyConnection {
    const socket = {readyState: 0, send: () => {}}
    return {get socket() { return socket }} as unknown as FadeCandyConnection
}

function newScreen(): CanvasScreen {
    return new CanvasScreen(WIDTH, HEIGHT, {emit: () => {}} as unknown as Server, fakeFadeCandy(), 20)
}

// Replicates RainStrategy.render() with an all-zero grid (brightness 1, no flash).
function expectedEmptyFrame(): number[] {
    const flat: number[] = []
    for (let x = 0; x < WIDTH; x++) {
        for (let y = HEIGHT - 1; y >= 0; y--) {
            const ambient = 6 + Math.round(10 * (y / HEIGHT))
            flat.push(
                Math.round(ambient * 0.25),
                Math.round(ambient * 0.4),
                Math.round(ambient),
            )
        }
    }
    return flat
}

// Drives one tick per 25ms frame at a mocked clock. With dropIntervalMs huge,
// exactly one drop spawns (mount sets nextDropAt = 0) and no more; with
// lightningIntervalMs 8000 the bolt strikes at t = mount + 8000ms = frame 320.
function newRainStrategy(): {screen: CanvasScreen; strategy: RainStrategy; tick: (frames: number) => Promise<number[][]>} {
    const screen = newScreen()
    const strategy = new RainStrategy(screen, {dropIntervalMs: 1e9, lightningIntervalMs: 8000})
    const realNow = Date.now
    const mountMs = 1000
    Date.now = () => mountMs
    strategy.mount()

    const frames: number[][] = []
    const tick = async (count: number): Promise<number[][]> => {
        for (let i = 0; i < count; i++) {
            Date.now = () => mountMs + (frames.length + 1) * 25
            frames.push(await screen.flat())
        }
        return frames
    }

    return {
        screen,
        strategy,
        tick,
    }
}

test('rain returns to the empty baseline once drops and lightning have cleared', async () => {
    const {tick} = newRainStrategy()

    const frames = await tick(360)
    const empty = expectedEmptyFrame()

    const boltFrames = frames.slice(319, 325)
    assert.ok(boltFrames.some((f) => JSON.stringify(f) !== JSON.stringify(frames[318])), 'the bolt should visibly strike at frame 320')

    for (const [i, frame] of frames.slice(350).entries()) {
        assert.deepEqual(frame, empty, `frame ${350 + i} should be back to the ambient baseline`)
    }
})

test('bolt and flash decay monotonically after the strike (no per-frame random flicker)', async () => {
    const {tick} = newRainStrategy()

    const frames = await tick(340)

    for (let n = 321; n < 340; n++) {
        for (let i = 0; i < frames[n].length; i++) {
            assert.ok(
                frames[n][i] <= frames[n - 1][i],
                `frame ${n} pixel ${i} brightened (${frames[n - 1][i]} -> ${frames[n][i]}): bolt must not flicker`,
            )
        }
    }
})

test('a falling drop advances one row every two frames with a fractional ramp below the head', async () => {
    const {screen, strategy, tick} = newRainStrategy()

    await tick(1)
    const drop = (strategy as unknown as {drops: {vy: number; drift: number; x: number; color: [number, number, number]}[]}).drops[0]
    assert.ok(drop, 'the single drop should spawn on the first frame')
    drop.vy = 20
    drop.drift = 0
    drop.x = 3
    const colorB = drop.color[2]

    await tick(40)
    const frames = await tick(0)

    const cellAt = (frame: number[], x: number, y: number): number => {
        const index = (x * HEIGHT + (HEIGHT - 1 - y)) * 3
        return frame[index + 2]
    }
    const ambientAt = (y: number): number => 6 + Math.round(10 * (y / HEIGHT))

    let previousHeadRow = -1
    for (let n = 1; n <= 40; n++) {
        const y = -1 + 0.5 * n
        const headRow = Math.floor(y)
        const frac = y - headRow

        if (headRow === -1) {
            assert.equal(frac, 0.5, `frame ${n}: drop should be entering at half a row`)
            const ramp = cellAt(frames[n], 3, 0)
            const expected = Math.round(0.5 * colorB) + ambientAt(0)
            assert.ok(Math.abs(ramp - expected) <= 2, `frame ${n}: entering drop should show a half-intensity ramp at row 0, got ${ramp}, expected ~${expected}`)
            continue
        }

        const head = cellAt(frames[n], 3, headRow)
        const expectedHead = Math.min(255, Math.round(colorB) + ambientAt(headRow))
        assert.ok(Math.abs(head - expectedHead) <= 2, `frame ${n}: head cell at row ${headRow} should be at full intensity, got ${head}, expected ~${expectedHead}`)

        if (frac === 0.5) {
            const below = cellAt(frames[n], 3, headRow + 1)
            const expected = Math.round(0.5 * colorB) + ambientAt(headRow + 1)
            assert.ok(Math.abs(below - expected) <= 2, `frame ${n}: cell below the head should be ramped to half intensity, got ${below}, expected ~${expected}`)
        }

        const delta = headRow - previousHeadRow
        assert.ok(delta === 0 || delta === 1, `frame ${n}: head should never skip or move back a row, got ${delta}`)
        previousHeadRow = headRow
    }
    assert.equal(previousHeadRow, 19, 'the drop should have descended exactly 20 rows in 40 frames (constant velocity)')
})