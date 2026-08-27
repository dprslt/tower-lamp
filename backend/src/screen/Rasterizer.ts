export type RGB = [number, number, number]

export interface LinearGradient {
    startPoint: {x: number, y: number}
    endPoint: {x: number, y: number}
    colorStops: (number | string)[]
}

export type FillSpec = RGB | string | LinearGradient

export interface DecodedImage {
    width: number
    height: number
    data: Uint8ClampedArray
}

const NAMED_COLORS: { [name: string]: RGB } = {
    red: [255, 0, 0],
    gold: [255, 215, 0],
    black: [0, 0, 0],
    white: [255, 255, 255],
    green: [0, 128, 0],
    blue: [0, 0, 255],
}

export function parseColor(value: string): RGB {
    if (value[0] === '#') {
        const hex = value.slice(1)
        if (hex.length === 3) {
            return [
                parseInt(hex[0] + hex[0], 16),
                parseInt(hex[1] + hex[1], 16),
                parseInt(hex[2] + hex[2], 16),
            ]
        }
        if (hex.length === 6) {
            return [
                parseInt(hex.slice(0, 2), 16),
                parseInt(hex.slice(2, 4), 16),
                parseInt(hex.slice(4, 6), 16),
            ]
        }
    }
    return NAMED_COLORS[value.toLowerCase()] || [0, 0, 0]
}

interface GradientStop {
    offset: number
    color: RGB
}

function parseGradient(gradient: LinearGradient): {start: {x: number, y: number}, end: {x: number, y: number}, stops: GradientStop[]} {
    const stops: GradientStop[] = []
    for (let i = 0; i + 1 < gradient.colorStops.length; i += 2) {
        stops.push({
            offset: Number(gradient.colorStops[i]),
            color: parseColor(String(gradient.colorStops[i + 1])),
        })
    }
    if (stops.length === 0) {
        stops.push({offset: 0, color: [0, 0, 0]}, {offset: 1, color: [0, 0, 0]})
    }
    return {start: gradient.startPoint, end: gradient.endPoint, stops}
}

function gradientColorAt(t: number, stops: GradientStop[]): RGB {
    if (t <= stops[0].offset) {
        return stops[0].color
    }
    for (let i = 1; i < stops.length; i++) {
        if (t <= stops[i].offset) {
            const a = stops[i - 1]
            const b = stops[i]
            const span = b.offset - a.offset || 1
            const ratio = (t - a.offset) / span
            return [
                Math.round(a.color[0] + (b.color[0] - a.color[0]) * ratio),
                Math.round(a.color[1] + (b.color[1] - a.color[1]) * ratio),
                Math.round(a.color[2] + (b.color[2] - a.color[2]) * ratio),
            ]
        }
    }
    return stops[stops.length - 1].color
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

export class Rasterizer {
    readonly width: number
    readonly height: number
    private readonly buffer: Uint8ClampedArray

    constructor(width: number, height: number) {
        this.width = width
        this.height = height
        this.buffer = new Uint8ClampedArray(width * height * 3)
    }

    clear(color: RGB = [0, 0, 0]): void {
        for (let i = 0; i < this.width * this.height; i++) {
            this.buffer[i * 3] = color[0]
            this.buffer[i * 3 + 1] = color[1]
            this.buffer[i * 3 + 2] = color[2]
        }
    }

    fillRect(x: number, y: number, w: number, h: number, fill: FillSpec): void {
        let solid: RGB
        let gradient: ReturnType<typeof parseGradient> | null = null

        if (typeof fill === 'string') {
            solid = parseColor(fill)
        } else if (Array.isArray(fill)) {
            solid = fill
        } else {
            gradient = parseGradient(fill)
            solid = [0, 0, 0]
        }

        const xStart = Math.max(0, Math.floor(x))
        const yStart = Math.max(0, Math.floor(y))
        const xEnd = Math.min(this.width, Math.ceil(x + w))
        const yEnd = Math.min(this.height, Math.ceil(y + h))

        for (let py = yStart; py < yEnd; py++) {
            for (let px = xStart; px < xEnd; px++) {
                let color = solid
                if (gradient) {
                    const dx = gradient.end.x - gradient.start.x
                    const dy = gradient.end.y - gradient.start.y
                    const denom = dx * dx + dy * dy || 1
                    const t = ((px - gradient.start.x) * dx + (py - gradient.start.y) * dy) / denom
                    color = gradientColorAt(clamp(t, 0, 1), gradient.stops)
                }
                const index = (py * this.width + px) * 3
                this.buffer[index] = color[0]
                this.buffer[index + 1] = color[1]
                this.buffer[index + 2] = color[2]
            }
        }
    }

    drawImage(image: DecodedImage, x: number, y: number, targetWidth: number, targetHeight: number): void {
        const xStart = Math.max(0, Math.floor(x))
        const yStart = Math.max(0, Math.floor(y))
        const xEnd = Math.min(this.width, Math.ceil(x + targetWidth))
        const yEnd = Math.min(this.height, Math.ceil(y + targetHeight))

        for (let py = yStart; py < yEnd; py++) {
            for (let px = xStart; px < xEnd; px++) {
                const sx = clamp(((px + 0.5 - x) / targetWidth) * image.width - 0.5, 0, image.width - 1)
                const sy = clamp(((py + 0.5 - y) / targetHeight) * image.height - 0.5, 0, image.height - 1)

                const x0 = Math.floor(sx)
                const y0 = Math.floor(sy)
                const x1 = Math.min(x0 + 1, image.width - 1)
                const y1 = Math.min(y0 + 1, image.height - 1)
                const fx = sx - x0
                const fy = sy - y0

                const s00 = (y0 * image.width + x0) * 4
                const s10 = (y0 * image.width + x1) * 4
                const s01 = (y1 * image.width + x0) * 4
                const s11 = (y1 * image.width + x1) * 4

                const r = (image.data[s00] * (1 - fx) + image.data[s10] * fx) * (1 - fy) + (image.data[s01] * (1 - fx) + image.data[s11] * fx) * fy
                const g = (image.data[s00 + 1] * (1 - fx) + image.data[s10 + 1] * fx) * (1 - fy) + (image.data[s01 + 1] * (1 - fx) + image.data[s11 + 1] * fx) * fy
                const b = (image.data[s00 + 2] * (1 - fx) + image.data[s10 + 2] * fx) * (1 - fy) + (image.data[s01 + 2] * (1 - fx) + image.data[s11 + 2] * fx) * fy
                const alpha = (image.data[s00 + 3] * (1 - fx) + image.data[s10 + 3] * fx) * (1 - fy) + (image.data[s01 + 3] * (1 - fx) + image.data[s11 + 3] * fx) * fy

                const index = (py * this.width + px) * 3
                const a = alpha / 255
                this.buffer[index] = Math.round(r * a + this.buffer[index] * (1 - a))
                this.buffer[index + 1] = Math.round(g * a + this.buffer[index + 1] * (1 - a))
                this.buffer[index + 2] = Math.round(b * a + this.buffer[index + 2] * (1 - a))
            }
        }
    }

    averageBlock(x: number, y: number, w: number, h: number): RGB {
        const xStart = Math.max(0, Math.floor(x))
        const yStart = Math.max(0, Math.floor(y))
        const xEnd = Math.min(this.width, Math.ceil(x + w))
        const yEnd = Math.min(this.height, Math.ceil(y + h))

        let r = 0
        let g = 0
        let b = 0
        let count = 0

        for (let py = yStart; py < yEnd; py++) {
            for (let px = xStart; px < xEnd; px++) {
                const index = (py * this.width + px) * 3
                r += this.buffer[index]
                g += this.buffer[index + 1]
                b += this.buffer[index + 2]
                count++
            }
        }

        if (count === 0) {
            return [0, 0, 0]
        }
        return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
    }
}