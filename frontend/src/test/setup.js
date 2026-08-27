import '@testing-library/jest-dom/vitest'

const contextStubs = []
window.__screenCanvasStubs = contextStubs

HTMLCanvasElement.prototype.getContext = function () {
    const stub = {
        fillStyle: '',
        calls: [],
        clearRect: () => {},
        fillRect: (x, y, w, h) => {
            stub.calls.push({x, y, w, h, fillStyle: stub.fillStyle})
        },
    }
    contextStubs.push(stub)
    return stub
}