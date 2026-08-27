import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import WebSocket from 'ws'
import {createFakeFadeCandy, PACKET_BYTES, PIXEL_COUNT} from '../fakeFadeCandy'

async function waitForStats(out: string, expectedPackets: number, timeoutMs = 3000): Promise<Record<string, unknown>> {
    const deadline = Date.now() + timeoutMs
    const statsFile = path.join(out, 'stats.json')
    while (Date.now() < deadline) {
        if (fs.existsSync(statsFile)) {
            const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'))
            if (stats.packets >= expectedPackets) {
                return stats
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 10))
    }
    throw new Error(`Timed out waiting for ${expectedPackets} packets`)
}

function fadeCandyPacket(firstPixel: [number, number, number]): Buffer {
    const packet = Buffer.alloc(PACKET_BYTES)
    packet[4] = firstPixel[0]
    packet[5] = firstPixel[1]
    packet[6] = firstPixel[2]
    return packet
}

test('fake FadeCandy records packets as raw LED frames', async (t) => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-fc-'))
    const server = await createFakeFadeCandy({port: 0, out})
    t.after(async () => {
        await server.close()
        fs.rmSync(out, {recursive: true, force: true})
    })

    const socket = new WebSocket(server.url)
    t.after(() => socket.terminate())
    await new Promise<void>((resolve, reject) => {
        socket.on('open', () => resolve())
        socket.on('error', reject)
    })

    socket.send(fadeCandyPacket([255, 0, 0]))
    socket.send(fadeCandyPacket([0, 255, 0]))
    socket.send(Buffer.alloc(3))

    await waitForStats(out, 2)

    const latest = JSON.parse(fs.readFileSync(path.join(out, 'latest.json'), 'utf8'))
    assert.equal(latest.frame.length, PIXEL_COUNT * 3)
    assert.deepEqual(latest.frame.slice(0, 3), [0, 255, 0])
    assert.deepEqual(latest.frame.slice(3, 6), [0, 0, 0])

    const frameFiles = fs.readdirSync(path.join(out, 'frames'))
    assert.equal(frameFiles.length, 2)

    const firstFrame = JSON.parse(fs.readFileSync(path.join(out, 'frames', 'frame-00001.json'), 'utf8'))
    assert.deepEqual(firstFrame.slice(0, 3), [255, 0, 0])

    const stats = await waitForStats(out, 2)
    assert.deepEqual(stats.lastFrame, {avgBrightnessPct: 0.2, litPixels: 1, distinctColors: 2, allBlack: false, allSameColor: false})
})