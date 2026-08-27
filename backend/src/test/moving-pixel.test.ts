import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Server} from 'socket.io'
import {CanvasScreen} from '../screen/CanvasScreen'
import MovingPixelStrategy, {columnAt} from '../canvasStrategies/MovingPixelStrategy'
import CanvasStrategyFactory from '../CanvasStrategyFactory'
import FadeCandyConnection from '../FadeCandyConnection'

function fakeFadeCandy(): FadeCandyConnection {
    const socket = {readyState: 0, send: () => {}}
    return {get socket() { return socket }} as unknown as FadeCandyConnection
}

function newScreen(): CanvasScreen {
    return new CanvasScreen(8, 21, {emit: () => {}} as unknown as Server, fakeFadeCandy(), 20)
}

test('columnAt sweeps right-to-left and wraps', () => {
    assert.equal(columnAt(0, 2, 8), 7)
    assert.equal(columnAt(0.25, 2, 8), 7)
    assert.equal(columnAt(0.5, 2, 8), 6)
    assert.equal(columnAt(3.5, 2, 8), 0)
    assert.equal(columnAt(3.99, 2, 8), 0)
    assert.equal(columnAt(4.0, 2, 8), 7)
    assert.equal(columnAt(7.5, 2, 8), 0)
})

test('moving-pixel strategy paints one red pixel per frame at the expected column', async () => {
    const screen = newScreen()
    const strategy = new MovingPixelStrategy(screen, {speed: 2, row: 10})
    const realNow = Date.now
    const fakeNow = (ms: number) => {
        Date.now = () => ms
    }
    fakeNow(1000)
    strategy.mount()

    const expectPixelInColumn = async (elapsedSeconds: number, expectedColumn: number) => {
        fakeNow(1000 + elapsedSeconds * 1000)
        const flat = await screen.flat()
        assert.equal(flat.length, 8 * 21 * 3)
        let lit = 0
        let litColumn = -1
        let litRow = -1
        for (let c = 0; c < 8; c++) {
            for (let r = 0; r < 21; r++) {
                const i = (c * 21 + (20 - r)) * 3
                if (flat[i] + flat[i + 1] + flat[i + 2] > 0) {
                    lit++
                    litColumn = c
                    litRow = r
                }
            }
        }
        assert.equal(lit, 1, `exactly one lit pixel at t=${elapsedSeconds}s`)
        assert.equal(litColumn, expectedColumn, `column at t=${elapsedSeconds}s`)
        assert.equal(litRow, 10, `row at t=${elapsedSeconds}s`)
        const i = (expectedColumn * 21 + (20 - 10)) * 3
        assert.deepEqual(flat.slice(i, i + 3), [255, 0, 0])
    }

    await expectPixelInColumn(0, 7)
    await expectPixelInColumn(0.5, 6)
    await expectPixelInColumn(3.5, 0)
    await expectPixelInColumn(4.0, 7)

    Date.now = realNow
})

test('moving-pixel is registered in the strategy factory', () => {
    const screen = newScreen()
    const factory = new CanvasStrategyFactory(screen)
    const strategy = factory.getStrategyFromTemplate('moving-pixel', {speed: 1})
    assert.ok(strategy instanceof MovingPixelStrategy)
    assert.equal(factory.getStrategyFromTemplate('nope', {}), null)
})