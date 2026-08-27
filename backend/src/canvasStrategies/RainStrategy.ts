import AbstractStrategy from "./AbstractStrategy";
import {CanvasLayer, CanvasScreen} from "../screen/CanvasScreen";
import {RGB, Rasterizer} from "../screen/Rasterizer";

interface Drop {
    x: number
    y: number
    vy: number
    drift: number
    color: RGB
}

interface Ripple {
    x: number
    halfWidth: number
    life: number
    maxLife: number
}

const PALETTE: RGB[] = [
    [70, 120, 255],
    [90, 160, 255],
    [110, 90, 255],
    [150, 95, 255],
    [190, 120, 255],
    [60, 90, 220],
]

const BOLT_COLOR: RGB = [150, 120, 255]

const FADE_HALF_LIFE_S = 0.08
const FLASH_DURATION_S = 0.45
const RIPPLE_LIFE_S = 0.55

export default class RainStrategy extends AbstractStrategy {

    private readonly width: number
    private readonly height: number
    private readonly zoom: number

    private readonly grid: RGB[]
    private readonly drops: Drop[] = []
    private readonly ripples: Ripple[] = []

    private readonly dropIntervalMs: number
    private readonly lightningIntervalMs: number
    private readonly brightness: number

    private lastTick = 0
    private nextDropAt = 0
    private nextLightningAt = 0
    private flash = 0
    private boltX = -1
    private boltJitter: number[] = []
    private layer: CanvasLayer | null = null

    public constructor(canvasScreen: CanvasScreen, params: any) {
        super(canvasScreen, params)

        const size = canvasScreen.getCanvasSize()
        this.width = 8
        this.height = 21
        this.zoom = size.width / this.width
        this.dropIntervalMs = params.dropIntervalMs ?? 110
        this.lightningIntervalMs = params.lightningIntervalMs ?? 8000
        this.brightness = params.brightness ?? 1

        this.grid = []
        for (let i = 0; i < this.width * this.height; i++) {
            this.grid.push([0, 0, 0])
        }

        this.layer = {
            draw: (rasterizer) => {
                const now = Date.now()
                const dt = this.lastTick > 0 ? Math.min((now - this.lastTick) / 1000, 0.5) : 0
                this.lastTick = now
                this.tick(dt)
                this.render(rasterizer)
            },
        }
    }

    mount(): void {
        this.lastTick = 0
        this.nextDropAt = 0
        this.nextLightningAt = Date.now() + this.lightningIntervalMs
        this.flash = 0
        this.boltX = -1
        this.drops.length = 0
        this.ripples.length = 0
        if (this.layer) {
            this.canvasScreen.registerLayer(this.layer)
        }
    }

    unmount(): void {
        if (this.layer) {
            this.canvasScreen.unregisterLayer(this.layer)
            this.layer = null
        }
    }

    private tick(dt: number): void {
        const fade = Math.pow(0.5, dt / FADE_HALF_LIFE_S)
        for (const cell of this.grid) {
            cell[0] = Math.round(cell[0] * fade)
            cell[1] = Math.round(cell[1] * fade)
            cell[2] = Math.round(cell[2] * fade)
        }

        if (this.flash > 0) {
            this.flash = Math.max(0, this.flash - dt / FLASH_DURATION_S)
            if (this.flash === 0) {
                this.boltX = -1
            }
        }

        const now = Date.now()
        if (now >= this.nextDropAt && this.drops.length < 14) {
            this.spawnDrop()
            this.nextDropAt = now + this.dropIntervalMs * (0.5 + Math.random() * 1)
        }

        if (now >= this.nextLightningAt) {
            this.strikeLightning()
            this.nextLightningAt = now + this.lightningIntervalMs * (0.6 + Math.random() * 0.8)
        }

        for (let i = this.drops.length - 1; i >= 0; i--) {
            const drop = this.drops[i]
            drop.x += drop.drift * dt
            drop.y += drop.vy * dt
            if (drop.y >= this.height - 1) {
                this.spawnRipple(drop.x)
                this.drops.splice(i, 1)
                continue
            }
            this.stamp(Math.round(drop.x), Math.round(drop.y), drop.color, 1)
            this.stamp(Math.round(drop.x), Math.round(drop.y) - 1, drop.color, 0.6)
            this.stamp(Math.round(drop.x), Math.round(drop.y) - 2, drop.color, 0.3)
        }

        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const ripple = this.ripples[i]
            ripple.life -= dt
            if (ripple.life <= 0) {
                this.ripples.splice(i, 1)
                continue
            }
            ripple.halfWidth += 3.5 * dt
            const intensity = Math.max(0, ripple.life / ripple.maxLife) * 0.85
            const x0 = Math.max(0, Math.round(ripple.x - ripple.halfWidth))
            const x1 = Math.min(this.width - 1, Math.round(ripple.x + ripple.halfWidth))
            for (let x = x0; x <= x1; x++) {
                this.stamp(x, this.height - 1, [130, 110, 255], intensity)
            }
        }

        if (this.boltX >= 0) {
            for (let y = 0; y < this.height; y++) {
                const x = Math.max(0, Math.min(this.width - 1, this.boltX + this.boltJitter[y]))
                const decay = 1 - 0.5 * (y / this.height)
                this.stamp(x, y, BOLT_COLOR, 0.8 * decay)
                if (y > 0 && Math.random() < 0.35) {
                    this.stamp(x, y - 1, BOLT_COLOR, 0.3 * decay)
                }
            }
        }
    }

    private spawnDrop(): void {
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
        this.drops.push({
            x: Math.random() * (this.width - 1),
            y: -1,
            vy: 14 + Math.random() * 10,
            drift: -0.5 + Math.random() * 1,
            color,
        })
    }

    private spawnRipple(x: number): void {
        this.ripples.push({
            x,
            halfWidth: 0.5,
            life: RIPPLE_LIFE_S,
            maxLife: RIPPLE_LIFE_S,
        })
    }

    private strikeLightning(): void {
        this.flash = 1
        this.boltX = 1 + Math.floor(Math.random() * (this.width - 2))
        this.boltJitter = []
        let offset = 0
        for (let y = 0; y < this.height; y++) {
            if (Math.random() < 0.45) {
                offset += Math.round(Math.random() * 2 - 1)
            }
            this.boltJitter.push(offset)
        }
    }

    private stamp(x: number, y: number, color: RGB, intensity: number): void {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return
        }
        const cell = this.grid[y * this.width + x]
        cell[0] = Math.max(cell[0], Math.round(color[0] * intensity))
        cell[1] = Math.max(cell[1], Math.round(color[1] * intensity))
        cell[2] = Math.max(cell[2], Math.round(color[2] * intensity))
    }

    private render(rasterizer: Rasterizer): void {
        const boost = 1 + this.flash * 0.35
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.grid[y * this.width + x]
                const ambient = 6 + Math.round(10 * (y / this.height))
                const r = Math.min(255, Math.round((cell[0] * boost + ambient * 0.25) * this.brightness))
                const g = Math.min(255, Math.round((cell[1] * boost + ambient * 0.4) * this.brightness))
                const b = Math.min(255, Math.round((cell[2] * boost + ambient) * this.brightness))
                if (r === 0 && g === 0 && b === 0) {
                    continue
                }
                rasterizer.fillRect(x * this.zoom, y * this.zoom, this.zoom, this.zoom, [r, g, b])
            }
        }
    }
}