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

// Drops arrive in short bursts separated by quiet pauses instead of a
// continuous shower. When omitted, spawning is the classic steady stream.
export interface ShowerConfig {
    burstMin: number
    burstMax: number
    spacingMs: number
    pauseMinMs: number
    pauseMaxMs: number
}

export interface RainConfig {
    palette: RGB[]
    boltColor: RGB
    fadeHalfLifeS: number
    flashDurationS: number
    boltLifeS: number
    rippleLifeS: number
    dropIntervalMs: number
    lightningIntervalMs: number
    maxDrops: number
    dropSpeedMin: number
    dropSpeedRange: number
    driftSpread: number
    flashBoost: number
    boltIntensity: number
    boltForkIntensity: number
    rippleColor: RGB
    rippleIntensity: number
    rippleSpeed: number
    tailNear: number
    tailFar: number
    brightness: number
    shower?: ShowerConfig
}

export const PALETTE: RGB[] = [
    [70, 120, 255],
    [90, 160, 255],
    [110, 90, 255],
    [150, 95, 255],
    [190, 120, 255],
    [60, 90, 220],
]

// The original energetic thunderstorm: fast violet drops, sharp frequent bolts.
export const STORM_RAIN: RainConfig = {
    palette: PALETTE,
    boltColor: [150, 120, 255],
    fadeHalfLifeS: 0.08,
    flashDurationS: 0.45,
    boltLifeS: 0.12,
    rippleLifeS: 0.55,
    dropIntervalMs: 110,
    lightningIntervalMs: 8000,
    maxDrops: 14,
    dropSpeedMin: 14,
    dropSpeedRange: 10,
    driftSpread: 1,
    flashBoost: 0.35,
    boltIntensity: 0.8,
    boltForkIntensity: 0.3,
    rippleColor: [130, 110, 255],
    rippleIntensity: 0.85,
    rippleSpeed: 3.5,
    tailNear: 0.6,
    tailFar: 0.3,
    brightness: 1,
}

export default class RainStrategy extends AbstractStrategy {

    protected readonly width: number
    protected readonly height: number
    protected readonly config: RainConfig

    private readonly zoom: number
    private readonly grid: RGB[]
    private readonly drops: Drop[] = []
    private readonly ripples: Ripple[] = []

    private readonly brightness: number

    private lastTick = 0
    private nextDropAt = 0
    private burstRemaining = 0
    private nextLightningAt = 0
    private flash = 0
    private boltX = -1
    private boltLife = 0
    private boltJitter: number[] = []
    private layer: CanvasLayer | null = null

    public constructor(canvasScreen: CanvasScreen, params: any, config: RainConfig = STORM_RAIN) {
        super(canvasScreen, params)

        const size = canvasScreen.getCanvasSize()
        this.width = 8
        this.height = 21
        this.zoom = size.width / this.width
        this.config = {
            ...config,
            dropIntervalMs: params.dropIntervalMs ?? config.dropIntervalMs,
            lightningIntervalMs: params.lightningIntervalMs ?? config.lightningIntervalMs,
        }
        this.brightness = params.brightness ?? config.brightness

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
        this.markMounted()
        this.lastTick = 0
        this.nextDropAt = 0
        this.burstRemaining = 0
        this.nextLightningAt = Date.now() + this.config.lightningIntervalMs
        this.flash = 0
        this.boltX = -1
        this.boltLife = 0
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
        const config = this.config
        const fade = Math.pow(0.5, dt / config.fadeHalfLifeS)
        for (const cell of this.grid) {
            cell[0] *= fade
            cell[1] *= fade
            cell[2] *= fade
        }

        if (this.flash > 0) {
            this.flash = Math.max(0, this.flash - dt / config.flashDurationS)
        }

        const now = Date.now()
        if (now >= this.nextDropAt && this.drops.length < config.maxDrops) {
            this.spawnDrop()
            const shower = config.shower
            if (shower) {
                if (this.burstRemaining <= 0) {
                    this.burstRemaining = shower.burstMin + Math.floor(Math.random() * (shower.burstMax - shower.burstMin + 1))
                }
                this.burstRemaining--
                this.nextDropAt = this.burstRemaining > 0
                    ? now + shower.spacingMs
                    : now + shower.pauseMinMs + Math.random() * (shower.pauseMaxMs - shower.pauseMinMs)
            } else {
                this.nextDropAt = now + config.dropIntervalMs * (0.5 + Math.random() * 1)
            }
        }

        if (now >= this.nextLightningAt) {
            this.strikeLightning()
            this.nextLightningAt = now + config.lightningIntervalMs * (0.6 + Math.random() * 0.8)
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
            const row = Math.floor(drop.y)
            const frac = drop.y - row
            const col = Math.round(drop.x)
            this.stamp(col, row, drop.color, 1)
            this.stamp(col, row + 1, drop.color, frac)
            this.stamp(col, row - 1, drop.color, config.tailNear)
            this.stamp(col, row - 2, drop.color, config.tailFar)
        }

        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const ripple = this.ripples[i]
            ripple.life -= dt
            if (ripple.life <= 0) {
                this.ripples.splice(i, 1)
                continue
            }
            ripple.halfWidth += config.rippleSpeed * dt
            const intensity = Math.max(0, ripple.life / ripple.maxLife) * config.rippleIntensity
            const x0 = Math.max(0, Math.round(ripple.x - ripple.halfWidth))
            const x1 = Math.min(this.width - 1, Math.round(ripple.x + ripple.halfWidth))
            for (let x = x0; x <= x1; x++) {
                this.stamp(x, this.height - 1, config.rippleColor, intensity)
            }
        }

        if (this.boltX >= 0) {
            this.boltLife -= dt
            if (this.boltLife <= 0) {
                this.boltX = -1
            } else {
                const boltFade = this.boltLife / config.boltLifeS
                for (let y = 0; y < this.height; y++) {
                    const x = Math.max(0, Math.min(this.width - 1, this.boltX + this.boltJitter[y]))
                    const decay = 1 - 0.5 * (y / this.height)
                    this.stamp(x, y, config.boltColor, config.boltIntensity * decay * boltFade)
                    if (y > 0 && this.boltJitter[y] !== this.boltJitter[y - 1]) {
                        const forkX = Math.max(0, Math.min(this.width - 1, this.boltX + this.boltJitter[y - 1]))
                        this.stamp(forkX, y, config.boltColor, config.boltForkIntensity * decay * boltFade)
                    }
                }
            }
        }
    }

    private spawnDrop(): void {
        const config = this.config
        const color = config.palette[Math.floor(Math.random() * config.palette.length)]
        this.drops.push({
            x: Math.random() * (this.width - 1),
            y: -1,
            vy: config.dropSpeedMin + Math.random() * config.dropSpeedRange,
            drift: (Math.random() - 0.5) * config.driftSpread,
            color,
        })
    }

    private spawnRipple(x: number): void {
        this.ripples.push({
            x,
            halfWidth: 0.5,
            life: this.config.rippleLifeS,
            maxLife: this.config.rippleLifeS,
        })
    }

    private strikeLightning(): void {
        this.flash = 1
        this.boltLife = this.config.boltLifeS
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
        cell[0] = Math.max(cell[0], color[0] * intensity)
        cell[1] = Math.max(cell[1], color[1] * intensity)
        cell[2] = Math.max(cell[2], color[2] * intensity)
    }

    private render(rasterizer: Rasterizer): void {
        const boost = 1 + this.flash * this.config.flashBoost
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
