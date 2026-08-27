import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import {Server} from 'socket.io'
import {CanvasScreen} from './screen/CanvasScreen'
import CanvasStrategyFactory from './CanvasStrategyFactory'
import AbstractStrategy from './canvasStrategies/AbstractStrategy'
import FadeCandyConnection from './FadeCandyConnection'
import {FrameStats, frameStats} from './Utils'

const WIDTH = 8
const HEIGHT = 21

interface Options {
    strategy: string
    params: Record<string, unknown>
    frames: number
    intervalMs: number
    out: string
    scale: number
}

function parseArgs(argv: string[]): Options {
    const options: Options = {strategy: 'color', params: {}, frames: 1, intervalMs: 0, out: 'preview', scale: 20}

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i]
        const value = (): string => {
            const v = argv[i + 1]
            if (v === undefined || v.startsWith('--')) {
                throw new Error(`Missing value for ${arg}`)
            }
            i++
            return v
        }
        switch (arg) {
            case '--strategy':
                options.strategy = value()
                break
            case '--params':
                options.params = JSON.parse(value())
                break
            case '--params-file':
                options.params = JSON.parse(fs.readFileSync(value(), 'utf8'))
                break
            case '--frames':
                options.frames = Number(value())
                break
            case '--interval-ms':
                options.intervalMs = Number(value())
                break
            case '--out':
                options.out = value()
                break
            case '--scale':
                options.scale = Number(value())
                break
            case '--help':
                console.log(`Usage: node --import tsx src/preview.ts [options]

Render a strategy headlessly and dump what the lamp would display.

Options:
  --strategy <name>    color | off | image (default: color)
  --params <json>      strategy parameters (default: {})
  --params-file <path> read strategy parameters from a JSON file
  --frames <n>         number of frames to capture (default: 1)
  --interval-ms <n>    simulated elapsed time between frames (default: 0)
  --out <dir>          output directory (default: preview)
  --scale <n>          pixel scale of the PNG output (default: 20)

Outputs one frame-NNN.json (raw LED array, column by column, bottom-to-top)
and one frame-NNN.png (8x21 LEDs, top LED first row) per frame, plus a
manifest.json with per-frame stats for quick automated assertions.`)
                process.exit(0)
                break
            default:
                throw new Error(`Unknown argument: ${arg}`)
        }
    }

    return options
}

function fakeSocketFrontend(): Server {
    return {emit: () => {}} as unknown as Server
}

function fakeFadeCandy(): FadeCandyConnection {
    const socket = {readyState: 0, send: () => {}}
    return {get socket() { return socket }} as unknown as FadeCandyConnection
}

async function waitForImage(strategy: AbstractStrategy): Promise<void> {
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
        const image = (strategy as unknown as {image: unknown}).image
        if (image) {
            return
        }
        await new Promise((resolve) => setTimeout(resolve, 10))
    }
    throw new Error('Image strategy did not load its image within 5s')
}

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

function encodePng(width: number, height: number, rgb: Uint8ClampedArray): Buffer {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    const ihdr = Buffer.alloc(13)
    ihdr.writeUInt32BE(width, 0)
    ihdr.writeUInt32BE(height, 4)
    ihdr[8] = 8
    ihdr[9] = 2

    const scanlines: number[] = []
    for (let y = 0; y < height; y++) {
        scanlines.push(0)
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 3
            scanlines.push(rgb[i], rgb[i + 1], rgb[i + 2])
        }
    }

    const idat = zlib.deflateSync(Buffer.from(scanlines))
    return Buffer.concat([
        signature,
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', idat),
        pngChunk('IEND', Buffer.alloc(0)),
    ])
}

function renderPng(flat: number[], scale: number): Buffer {
    const pngWidth = WIDTH * scale
    const pngHeight = HEIGHT * scale
    const image = new Uint8ClampedArray(pngWidth * pngHeight * 3)

    for (let x = 0; x < WIDTH; x++) {
        for (let y = 0; y < HEIGHT; y++) {
            const flatIndex = (x * HEIGHT + (HEIGHT - 1 - y)) * 3
            const color = [flat[flatIndex], flat[flatIndex + 1], flat[flatIndex + 2]]
            for (let py = 0; py < scale; py++) {
                for (let px = 0; px < scale; px++) {
                    const i = (((HEIGHT - 1 - y) * scale + py) * pngWidth + (x * scale + px)) * 3
                    image[i] = color[0]
                    image[i + 1] = color[1]
                    image[i + 2] = color[2]
                }
            }
        }
    }

    return encodePng(pngWidth, pngHeight, image)
}

async function main(): Promise<void> {
    const options = parseArgs(process.argv.slice(2))

    const screen = new CanvasScreen(WIDTH, HEIGHT, fakeSocketFrontend(), fakeFadeCandy(), options.scale)
    const factory = new CanvasStrategyFactory(screen)
    const strategy = factory.getStrategyFromTemplate(options.strategy, options.params)

    if (!strategy) {
        console.error(`Unknown strategy: ${options.strategy}`)
        process.exit(1)
    }

    strategy.mount()
    if (options.strategy === 'image') {
        await waitForImage(strategy)
    }

    const mountTime = Date.now()
    const realNow = Date.now
    fs.mkdirSync(options.out, {recursive: true})

    const frames: ({index: number; file: string} & FrameStats)[] = []
    let done = false
    for (let frameIndex = 0; frameIndex < options.frames; frameIndex++) {
        const simulatedMs = frameIndex * options.intervalMs

        Date.now = () => mountTime + simulatedMs
        const flat = await screen.flat()
        done = strategy.isDone()
        Date.now = realNow

        const fileName = `frame-${String(frameIndex).padStart(3, '0')}`
        fs.writeFileSync(path.join(options.out, `${fileName}.json`), JSON.stringify(flat))
        fs.writeFileSync(path.join(options.out, `${fileName}.png`), renderPng(flat, options.scale))

        const stats = frameStats(flat)
        frames.push({index: frameIndex, file: fileName, ...stats})
        console.log(`${fileName}: ${stats.litPixels}/${WIDTH * HEIGHT} LEDs lit, avg ${stats.avgBrightnessPct}%, ${stats.distinctColors} colors`)
    }

    strategy.unmount()

    const manifest = {
        width: WIDTH,
        height: HEIGHT,
        strategy: options.strategy,
        params: options.params,
        done: done,
        frames,
    }
    fs.writeFileSync(path.join(options.out, 'manifest.json'), JSON.stringify(manifest, null, 2))
    console.log(`Wrote ${options.frames} frame(s) + manifest to ${options.out}/`)

    process.exit(0)
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})