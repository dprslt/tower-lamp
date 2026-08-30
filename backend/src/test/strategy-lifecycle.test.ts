import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Server} from 'socket.io'
import {CanvasScreen} from '../screen/CanvasScreen'
import ColorStrategy from '../canvasStrategies/ColorStrategy'
import FireworksStrategy from '../canvasStrategies/FireworksStrategy'
import MovingPixelStrategy from '../canvasStrategies/MovingPixelStrategy'
import OFFStrategy from '../canvasStrategies/OFFStrategy'
import CanvasStrategyFactory from '../CanvasStrategyFactory'
import FadeCandyConnection from '../FadeCandyConnection'

function fakeFadeCandy(): FadeCandyConnection {
    const socket = {readyState: 0, send: () => {}}
    return {get socket() { return socket }} as unknown as FadeCandyConnection
}

function newScreen(): CanvasScreen {
    return new CanvasScreen(8, 21, {emit: () => {}} as unknown as Server, fakeFadeCandy(), 20)
}

test('setOnRefresh callback runs after each refresh', async () => {
    const screen = newScreen()
    let calls = 0
    screen.setOnRefresh(() => {
        calls++
    })
    await screen.refresh()
    await screen.refresh()
    assert.equal(calls, 2)
})

test('stopAfterSeconds finishes any strategy after the timeout', async () => {
    const screen = newScreen()
    const strategy = new ColorStrategy(screen, {fill: '#ff0000', stopAfterSeconds: 5})
    const realNow = Date.now
    const fakeNow = (ms: number) => {
        Date.now = () => ms
    }
    fakeNow(1000)
    strategy.mount()

    fakeNow(1000 + 4.9 * 1000)
    assert.equal(strategy.isDone(), false)
    fakeNow(1000 + 5.0 * 1000)
    assert.equal(strategy.isDone(), true)

    Date.now = realNow
})

test('fireworks with bursts=1 finishes once the burst fades', async () => {
    const screen = newScreen()
    const strategy = new FireworksStrategy(screen, {bursts: 1})
    const realNow = Date.now
    const fakeNow = (ms: number) => {
        Date.now = () => ms
    }
    fakeNow(1000)
    strategy.mount()

    for (let step = 0; step < 20; step++) {
        fakeNow(1000 + step * 500)
        await screen.flat()
        if (strategy.isDone()) {
            break
        }
    }
    assert.equal(strategy.isDone(), true, 'a single burst should finish within 10s')

    Date.now = realNow
})

test('fireworks without bursts never finishes', async () => {
    const screen = newScreen()
    const strategy = new FireworksStrategy(screen, {launchIntervalMs: 100000})
    const realNow = Date.now
    const fakeNow = (ms: number) => {
        Date.now = () => ms
    }
    fakeNow(1000)
    strategy.mount()

    for (let step = 0; step < 20; step++) {
        fakeNow(1000 + step * 500)
        await screen.flat()
    }
    assert.equal(strategy.isDone(), false)

    Date.now = realNow
})

test('a finished strategy switches to off on refresh', async () => {
    const screen = newScreen()
    const factory = new CanvasStrategyFactory(screen)
    let animation = factory.getStrategyFromTemplate('moving-pixel', {speed: 2, row: 10, runs: 1})
    assert.ok(animation)

    const realNow = Date.now
    const fakeNow = (ms: number) => {
        Date.now = () => ms
    }
    fakeNow(1000)
    animation.mount()

    screen.setOnRefresh(() => {
        if (animation && animation.isDone()) {
            animation.unmount()
            animation = factory.getStrategyFromTemplate('off', {})
            if (animation) {
                animation.mount()
            }
        }
    })

    await screen.refresh()
    assert.ok(animation instanceof MovingPixelStrategy)

    fakeNow(1000 + 4.1 * 1000)
    await screen.refresh()
    assert.ok(animation instanceof OFFStrategy, 'finished strategy should have switched to off')

    Date.now = realNow
    screen.stop()
})