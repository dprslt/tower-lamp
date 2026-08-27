import {test} from 'node:test'
import assert from 'node:assert/strict'
import {parseColor, Rasterizer} from '../screen/Rasterizer'

test('parseColor handles hex and named colors', () => {
    assert.deepEqual(parseColor('#ff8800'), [255, 136, 0])
    assert.deepEqual(parseColor('#f80'), [255, 136, 0])
    assert.deepEqual(parseColor('red'), [255, 0, 0])
    assert.deepEqual(parseColor('gold'), [255, 215, 0])
    assert.deepEqual(parseColor('unknown'), [0, 0, 0])
})

test('fillRect paints solid colors and averageBlock reads them back', () => {
    const rasterizer = new Rasterizer(20, 20)
    rasterizer.fillRect(0, 0, 10, 10, '#ff0000')
    assert.deepEqual(rasterizer.averageBlock(0, 0, 10, 10), [255, 0, 0])
    assert.deepEqual(rasterizer.averageBlock(10, 0, 10, 10), [0, 0, 0])
})

test('fillRect clips out-of-bounds rects', () => {
    const rasterizer = new Rasterizer(8, 8)
    rasterizer.fillRect(-5, -5, 20, 20, '#00ff00')
    assert.deepEqual(rasterizer.averageBlock(0, 0, 8, 8), [0, 255, 0])
})

test('linear gradient matches its endpoints', () => {
    const rasterizer = new Rasterizer(100, 10)
    rasterizer.fillRect(0, 0, 100, 10, {
        startPoint: {x: 0, y: 0},
        endPoint: {x: 100, y: 0},
        colorStops: [0, '#000000', 1, '#ffffff'],
    })
    assert.deepEqual(rasterizer.averageBlock(0, 0, 1, 10), [0, 0, 0])
    const end = rasterizer.averageBlock(99, 0, 1, 10)
    assert.ok(end[0] >= 250 && end[1] >= 250 && end[2] >= 250, `end should be near-white, got ${end}`)
    const middle = rasterizer.averageBlock(50, 0, 1, 10)
    assert.ok(middle[0] > 100 && middle[0] < 155, `middle should be grey-ish, got ${middle}`)
})

test('drawImage composites alpha over the background', () => {
    const rasterizer = new Rasterizer(10, 10)
    rasterizer.fillRect(0, 0, 10, 10, '#ffffff')
    rasterizer.drawImage(
        {width: 1, height: 1, data: new Uint8ClampedArray([255, 0, 0, 128])},
        0, 0, 10, 10
    )
    const pixel = rasterizer.averageBlock(0, 0, 10, 10)
    assert.equal(pixel[0], 255)
    assert.equal(pixel[1], 127)
    assert.equal(pixel[2], 127)
})