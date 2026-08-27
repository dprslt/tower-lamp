import fs from 'node:fs'
import path from 'node:path'
import {WebSocketServer} from 'ws'
import {frameStats} from './Utils'

export const SCREEN_WIDTH = 8
export const SCREEN_HEIGHT = 21
export const PIXEL_COUNT = SCREEN_WIDTH * SCREEN_HEIGHT
export const FRAME_BYTES = PIXEL_COUNT * 3
export const PACKET_BYTES = 4 + FRAME_BYTES

export interface FakeFadeCandyOptions {
    port: number
    out: string
}

export interface FakeFadeCandyServer {
    url: string
    close(): Promise<void>
}

export function createFakeFadeCandy(options: FakeFadeCandyOptions): Promise<FakeFadeCandyServer> {
    const {port, out} = options

    fs.mkdirSync(path.join(out, 'frames'), {recursive: true})

    const server = new WebSocketServer({port})
    const startedAt = Date.now()
    let packetCount = 0
    const clients = new Set<import('ws').WebSocket>()

    server.on('connection', (socket) => {
        console.log('Fake FadeCandy: client connected')
        clients.add(socket)
        socket.on('close', () => clients.delete(socket))

        socket.on('message', (data) => {
            const buffer = Buffer.from(data as ArrayBuffer)
            packetCount++

            if (buffer.length !== PACKET_BYTES) {
                console.warn(`Fake FadeCandy: unexpected packet size ${buffer.length} (expected ${PACKET_BYTES}), skipping`)
                return
            }

            const frame = Array.from(buffer.slice(4))

            const stats = frameStats(frame)
            const fileName = `frame-${String(packetCount).padStart(5, '0')}`
            fs.writeFileSync(path.join(out, 'frames', `${fileName}.json`), JSON.stringify(frame))
            fs.writeFileSync(
                path.join(out, 'latest.json'),
                JSON.stringify({
                    receivedAt: new Date().toISOString(),
                    packet: packetCount,
                    frame,
                })
            )
            fs.writeFileSync(
                path.join(out, 'stats.json'),
                JSON.stringify({
                    startedAt: new Date(startedAt).toISOString(),
                    lastReceivedAt: new Date().toISOString(),
                    packets: packetCount,
                    lastFrame: stats,
                }, null, 2)
            )

            console.log(`Fake FadeCandy: packet ${packetCount}: ${stats.litPixels}/${PIXEL_COUNT} LEDs lit, avg ${stats.avgBrightnessPct}%, ${stats.distinctColors} colors`)
        })
    })

    return new Promise((resolve, reject) => {
        server.on('listening', () => {
            const address = server.address()
            const actualPort = typeof address === 'object' && address ? address.port : port
            resolve({
                url: `ws://127.0.0.1:${actualPort}`,
                close: () => new Promise<void>((resolveClose) => {
                    for (const client of clients) {
                        client.terminate()
                    }
                    clients.clear()
                    server.close(() => resolveClose())
                }),
            })
        })
        server.on('error', reject)
    })
}

function parseArgs(argv: string[]): FakeFadeCandyOptions {
    const options: FakeFadeCandyOptions = {port: 7891, out: 'fake-fc-out'}

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
            case '--port':
                options.port = Number(value())
                break
            case '--out':
                options.out = value()
                break
            case '--help':
                console.log(`Usage: node --import tsx src/fakeFadeCandy.ts [options]

A fake FadeCandy WebSocket server: plug the real backend into it with
FADE_CANDY_URL=ws://127.0.0.1:<port> and record what the lamp would receive,
without the tower.

Options:
  --port <n>    listen port (default: 7891)
  --out <dir>   output directory (default: fake-fc-out)

Records every packet: frames/frame-NNNNN.json (raw LED array), latest.json
(current frame) and stats.json (aggregate + last frame stats).
Exit with Ctrl+C.`)
                process.exit(0)
                break
            default:
                throw new Error(`Unknown argument: ${arg}`)
        }
    }

    return options
}

if (require.main === module) {
    const options = parseArgs(process.argv.slice(2))
    createFakeFadeCandy(options)
        .then((server) => {
            console.log(`Fake FadeCandy listening on ${server.url} (recording to ${options.out}/)`)
        })
        .catch((error) => {
            console.error(error)
            process.exit(1)
        })
}