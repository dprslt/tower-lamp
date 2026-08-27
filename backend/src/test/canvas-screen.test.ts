import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Server} from 'socket.io'
import zlib from 'node:zlib'
import {CanvasScreen} from '../screen/CanvasScreen'
import ColorStrategy from '../canvasStrategies/ColorStrategy'
import ImageStrategy, {computeSlideOffset} from '../canvasStrategies/ImageStrategy'
import FadeCandyConnection from '../FadeCandyConnection'

function crc32(buf: Buffer): number {
    let crc = 0xffffffff
    for (const byte of buf) {
        crc ^= byte
        for (let k = 0; k < 8; k++) {
            crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
        }
    }
    return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(typeAndData))
    return Buffer.concat([length, typeAndData, crc])
}

function makePng(width: number, height: number, rgba: number[]): string {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    const ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(width, 0)
    ihdr.writeUInt32BE(height, 4)
    ihdr[8] = 8
    ihdr[9] = 6
    const scanlines: number[] = []
    for (let y = 0; y < height; y++) {
        scanlines.push(0)
        for (let x = 0; x < width; x++) {
            scanlines.push(...rgba.slice((y * width + x) * 4, (y * width + x) * 4 + 4))
        }
    }
    const idat = zlib.deflateSync(Buffer.from(scanlines))
    const png = Buffer.concat([
        signature,
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', idat),
        pngChunk('IEND', Buffer.alloc(0)),
    ])
    return 'data:image/png;base64,' + png.toString('base64')
}

function fakeSocketFrontend(): {emit: (...args: any[]) => void} {
    return {
        emit: () => {},
    }
}

function fakeFadeCandy(): FadeCandyConnection {
    const socket = {readyState: 0, send: () => {}}
    return {get socket() { return socket }} as unknown as FadeCandyConnection
}

function newScreen(): CanvasScreen {
    return new CanvasScreen(8, 21, fakeSocketFrontend() as unknown as Server, fakeFadeCandy(), 20)
}

test('flat() reads columns bottom-to-top, left-to-right', async () => {
    const screen = newScreen()
    screen.erase()
    screen.setPixel(0, 20, [255, 0, 0])
    screen.setPixel(7, 0, [0, 0, 255])

    const flat = await screen.flat()

    assert.equal(flat.length, 8 * 21 * 3)
    assert.deepEqual(flat.slice(0, 3), [255, 0, 0])
    assert.deepEqual(flat.slice(3, 6), [0, 0, 0])
    assert.deepEqual(flat.slice(-3), [0, 0, 255])
})

test('injectFlatData then flat() preserves the frame as-is', async () => {
    const screen = newScreen()
    screen.erase()
    const frame = new Array(8 * 21 * 3).fill(0)
    for (let i = 0; i < frame.length; i++) {
        frame[i] = (i * 7) % 256
    }

    screen.injectFlatData(frame)
    const flat = await screen.flat()

    assert.deepEqual(flat, frame)
})

test('injectFlatData maps the frame bottom to the first packet row', async () => {
    const screen = newScreen()
    screen.erase()
    const frame = new Array(8 * 21 * 3).fill(0)
    frame[0] = 255
    frame[20 * 3] = 255

    screen.injectFlatData(frame)
    const flat = await screen.flat()

    assert.deepEqual(flat.slice(0, 3), [255, 0, 0])
    assert.deepEqual(flat.slice(20 * 3, 20 * 3 + 3), [255, 0, 0])
    assert.deepEqual(flat.slice(3, 6), [0, 0, 0])
})

test('injectFlatData rejects frames of the wrong length', () => {
    const screen = newScreen()
    screen.erase()
    assert.throws(() => screen.injectFlatData(new Array(10).fill(0)))
})

test('ColorStrategy solid fill covers the whole frame', async () => {
    const screen = newScreen()
    const strategy = new ColorStrategy(screen, {fill: '#ff8800'})
    strategy.mount()

    const flat = await screen.flat()

    assert.equal(flat.length, 8 * 21 * 3)
    assert.ok(flat.every((value, index) => value === (index % 3 === 0 ? 255 : index % 3 === 1 ? 136 : 0)))
})

test('ColorStrategy linear gradient varies across the screen', async () => {
    const screen = newScreen()
    const size = screen.getCanvasSize()
    const strategy = new ColorStrategy(screen, {
        fillLinearGradientStartPoint: {x: 0, y: 0},
        fillLinearGradientEndPoint: {x: size.width, y: 0},
        fillLinearGradientColorStops: [0, '#000000', 1, '#ffffff'],
    })
    strategy.mount()

    const flat = await screen.flat()

    const leftColumn = flat.slice(0, 3)
    const rightColumn = flat.slice(-3)
    assert.ok(Math.abs(leftColumn[0] - 15) <= 3, `left column averages the gradient start, got ${leftColumn}`)
    assert.ok(Math.abs(rightColumn[0] - 238) <= 3, `right column averages the gradient end, got ${rightColumn}`)
})

test('computeSlideOffset follows a smooth ping-pong', () => {
    assert.equal(Math.abs(computeSlideOffset(0, 10, 100)), 0)
    assert.ok(Math.abs(computeSlideOffset(5, 10, 100) + 50) < 1e-6)
    assert.ok(Math.abs(computeSlideOffset(10, 10, 100) + 100) < 1e-6)
    assert.ok(Math.abs(computeSlideOffset(15, 10, 100) + 50) < 1e-6)
    assert.equal(Math.abs(computeSlideOffset(20, 10, 100)), 0)
    assert.equal(Math.abs(computeSlideOffset(0, 10, 0)), 0)
    assert.equal(Math.abs(computeSlideOffset(0, 10, -20)), 0)

    const beforeTurn = computeSlideOffset(9.9, 10, 100)
    const afterTurn = computeSlideOffset(10.1, 10, 100)
    assert.ok(Math.abs(beforeTurn - afterTurn) < 0.1, 'velocity approaches zero at the reversal')

    let previous = computeSlideOffset(0, 10, 100)
    for (let t = 0.2; t <= 10; t += 0.2) {
        const current = computeSlideOffset(t, 10, 100)
        assert.ok(current <= previous + 1e-9, `moves forward between 0 and 10s (t=${t})`)
        previous = current
    }
    previous = computeSlideOffset(10, 10, 100)
    for (let t = 10.2; t <= 20; t += 0.2) {
        const current = computeSlideOffset(t, 10, 100)
        assert.ok(current >= previous - 1e-9, `moves backward between 10 and 20s (t=${t})`)
        previous = current
    }
})

test('ImageStrategy renders the decoded image then black', async () => {
    const screen = newScreen()
    const dataUrl = makePng(2, 1, [255, 0, 0, 255, 0, 255, 0, 255])
    const strategy = new ImageStrategy(screen, {data: dataUrl, duration: 10})
    strategy.mount()

    await new Promise((resolve) => setTimeout(resolve, 50))
    const flat = await screen.flat()

    const column0 = flat.slice(0, 3)
    const column1 = flat.slice(21 * 3, 21 * 3 + 3)
    assert.ok(Math.abs(column0[0] - 13) <= 2, `left column red diluted over 20 stage pixels, got ${column0}`)
    assert.ok(Math.abs(column0[1] - 13) <= 2, `left column green diluted over 20 stage pixels, got ${column0}`)
    assert.deepEqual(column1, [0, 0, 0])
})

test('refresh() emits screen-update with the fadecandy frame', async () => {
    let emitted: any[] | null = null
    const frontend = {emit: (event: string, data: any[]) => { emitted = data }}
    const screen = new CanvasScreen(8, 21, frontend as unknown as Server, fakeFadeCandy(), 20)
    const strategy = new ColorStrategy(screen, {fill: '#00ff00'})
    strategy.mount()

    await screen.refresh()

    if (!emitted) {
        throw new Error('screen-update should have been emitted')
    }
    const frame: any[] = emitted
    assert.equal(frame.length, 4 + 8 * 21 * 3)
    assert.deepEqual(frame.slice(0, 4), [0, 0, 0, 0])
    assert.ok(frame.slice(4).every((value, index) => value === (index % 3 === 1 ? 255 : 0)))
})

test('refresh() writes to the current fadecandy socket after reconnects', async () => {
    let firstSends = 0
    let secondSends = 0
    const sockets = [
        {readyState: 1, send: () => { firstSends++ }},
        {readyState: 1, send: () => { secondSends++ }},
    ]
    let socketIndex = 0
    const fadeCandy = {get socket() { return sockets[socketIndex] }} as unknown as FadeCandyConnection
    const frontend = {emit: () => {}}
    const screen = new CanvasScreen(8, 21, frontend as unknown as Server, fadeCandy, 20)
    const strategy = new ColorStrategy(screen, {fill: '#ff0000'})
    strategy.mount()

    await screen.refresh()
    socketIndex = 1
    await screen.refresh()

    assert.equal(firstSends, 1)
    assert.equal(secondSends, 1)
})

test('start() paces refreshes on a frame grid and stop() halts them', async () => {
    const screen = newScreen()
    let refreshes = 0
    screen.refresh = () => { refreshes++; return Promise.resolve() }

    screen.start()
    await new Promise((resolve) => setTimeout(resolve, 130))
    screen.stop()
    const refreshesWhileRunning = refreshes

    await new Promise((resolve) => setTimeout(resolve, 70))
    const refreshesAfterStop = refreshes

    assert.ok(refreshesWhileRunning >= 3, `expected ~5 refreshes in 130ms, got ${refreshesWhileRunning}`)
    assert.ok(refreshesWhileRunning <= 8, `expected ~5 refreshes in 130ms, got ${refreshesWhileRunning}`)
    assert.equal(refreshesAfterStop, refreshesWhileRunning, 'no refreshes after stop()')
})