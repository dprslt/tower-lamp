import React from 'react'
import {act, fireEvent, render, screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe, expect, it, vi, beforeEach} from 'vitest'

import App from '../app/app.jsx'

const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
    close: vi.fn(),
}

const ioMock = vi.fn(() => mockSocket)

vi.mock('socket.io-client', () => ({
    default: (...args) => ioMock(...args),
}))

vi.mock('konva', () => ({
    default: {
        Easings: {EaseInOut: 'ease-in-out', ElasticEaseOut: 'elastic-ease-out'},
        Line: class KonvaLine {},
    },
}))

vi.mock('react-konva', () => {
    const createMock = (name) => {
        function MockComponent(props) {
            return React.createElement('div', {'data-testid': name}, props.children)
        }
        MockComponent.displayName = name
        return MockComponent
    }
    return {
        Stage: createMock('konva-stage'),
        Layer: createMock('konva-layer'),
        Rect: createMock('konva-rect'),
        Circle: createMock('konva-circle'),
        Image: createMock('konva-image'),
    }
})

function registerHandlers() {
    const handlers = {}
    mockSocket.on.mockImplementation((event, handler) => {
        if (!handlers[event]) {
            handlers[event] = []
        }
        handlers[event].push(handler)
    })
    return handlers
}

function fireHandlers(handlers, event, payload) {
    for (const handler of handlers[event] || []) {
        act(() => {
            handler(payload)
        })
    }
}

function buildScreenFrame(width = 8, height = 21) {
    const frame = [0, 0, 0, 0]
    for (let i = 0; i < width * height; i++) {
        frame.push(120, 200, 60)
    }
    return frame
}

describe('app smoke test', () => {
    beforeEach(() => {
        ioMock.mockClear()
        mockSocket.on.mockClear()
        mockSocket.emit.mockClear()
    })

    it('renders the pixel grid and connects to the backend', () => {
        const handlers = registerHandlers()

        render(
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        )

        expect(ioMock).toHaveBeenCalledTimes(1)
        expect(ioMock).toHaveBeenCalledWith(
            'localhost:30008',
            expect.objectContaining({transports: ['websocket']})
        )
        expect(screen.getAllByText('Lampe').length).toBeGreaterThan(0)

        const canvases = document.querySelectorAll('canvas.screen')
        expect(canvases.length).toBe(2)
        expect(canvases[0].width).toBe(8 * 25)
        expect(canvases[0].height).toBe(21 * 25)

        const stubs = window.__screenCanvasStubs.slice(-2)
        expect(stubs[1].calls.length).toBe(1 + 8 * 21)
        expect(stubs[1].calls[0]).toMatchObject({x: 0, y: 0, w: 8 * 25, h: 21 * 25, fillStyle: 'black'})

        fireHandlers(handlers, 'connect')
        expect(document.querySelector('.header-bar').className).toContain('good')

        fireHandlers(handlers, 'screen-update', buildScreenFrame())
        const redraws = window.__screenCanvasStubs.slice(-2)
        const visible = redraws[0]
        const offscreen = redraws[1]
        expect(offscreen.calls.length).toBe(1 + 8 * 21)
        expect(offscreen.calls[0]).toMatchObject({x: 0, y: 0, w: 8 * 25, h: 21 * 25, fillStyle: 'black'})
        const lit = offscreen.calls.slice(1).filter((call) => call.fillStyle === 'rgb(120,200,60)')
        expect(lit.length).toBe(8 * 21)
        expect(offscreen.calls[1].x).toBe(7 * 25)
        expect(offscreen.calls[1].y).toBe(0)
        expect(offscreen.calls.some((c) => c.x === 0 && c.y === 20 * 25 && c.fillStyle === 'rgb(120,200,60)')).toBe(true)
        expect(visible.calls.length).toBe(0)
    })

    it('emits select-strategy when a strategy is clicked', () => {
        registerHandlers()

        render(
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        )

        const firstStrategy = document.querySelector('.circle-strategy')
        fireEvent.click(firstStrategy)

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'select-strategy',
            expect.objectContaining({name: 'color'})
        )
    })

    it('highlights the currently selected strategy', () => {
        const handlers = registerHandlers()

        render(
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        )

        fireHandlers(handlers, 'strategy-selected', {name: 'color', params: {fill: '#ffb88f'}})
        const selected = document.querySelectorAll('.circle-strategy.selected')
        expect(selected.length).toBe(1)
        expect(selected[0].textContent).toBeDefined()

        fireHandlers(handlers, 'strategy-selected', {name: 'off', params: {}})
        expect(document.querySelectorAll('.circle-strategy.selected').length).toBe(0)
    })

    it('renders the legacy /old debug page', () => {
        registerHandlers()

        render(
            <MemoryRouter initialEntries={['/old']}>
                <App />
            </MemoryRouter>
        )

        expect(screen.getByText('LAMPE')).toBeInTheDocument()
        expect(screen.getByText('ON')).toBeInTheDocument()
        expect(document.querySelectorAll('canvas.screen').length).toBe(1)
    })
})
