import AbstractStrategy from "./AbstractStrategy";
import {CanvasLayer, CanvasScreen} from "../screen/CanvasScreen";
import {RGB, Rasterizer} from "../screen/Rasterizer";

interface Rocket {
    x: number
    y: number
    vy: number
    color: RGB
    targetY: number
}

interface Spark {
    x: number
    y: number
    vx: number
    vy: number
    life: number
    maxLife: number
    color: RGB
}

const PALETTE: RGB[] = [
    [255, 60, 60],
    [255, 170, 40],
    [255, 240, 80],
    [80, 255, 120],
    [70, 200, 255],
    [150, 110, 255],
    [255, 110, 220],
    [255, 255, 255],
]

const FADE_HALF_LIFE_S = 0.12
const GRAVITY = 22

export default class FireworksStrategy extends AbstractStrategy {

    private readonly width: number
    private readonly height: number
    private readonly zoom: number

    private readonly grid: RGB[]
    private readonly rockets: Rocket[] = []
    private readonly sparks: Spark[] = []

    private readonly launchIntervalMs: number
    private readonly brightness: number

    private lastTick = 0
    private nextLaunchAt = 0
    private layer: CanvasLayer | null = null

    public constructor(canvasScreen: CanvasScreen, params: any) {
        super(canvasScreen, params)

        const size = canvasScreen.getCanvasSize()
        this.width = 8
        this.height = 21
        this.zoom = size.width / this.width
        this.launchIntervalMs = params.launchIntervalMs ?? 700
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
        this.nextLaunchAt = 0
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

        const now = Date.now()
        if (now >= this.nextLaunchAt && this.rockets.length < 2) {
            this.launchRocket()
            this.nextLaunchAt = now + this.launchIntervalMs * (0.6 + Math.random() * 0.8)
        }

        for (let i = this.rockets.length - 1; i >= 0; i--) {
            const rocket = this.rockets[i]
            rocket.y += rocket.vy * dt
            this.stamp(Math.round(rocket.x), Math.round(rocket.y), rocket.color, 1)
            if (rocket.y <= rocket.targetY) {
                this.explode(rocket)
                this.rockets.splice(i, 1)
            }
        }

        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const spark = this.sparks[i]
            spark.vy += GRAVITY * dt
            spark.x += spark.vx * dt
            spark.y += spark.vy * dt
            spark.life -= dt
            if (spark.life <= 0 || spark.y < -1 || spark.y > this.height + 1) {
                this.sparks.splice(i, 1)
                continue
            }
            this.stamp(Math.round(spark.x), Math.round(spark.y), spark.color, Math.max(0, spark.life / spark.maxLife))
        }
    }

    private launchRocket(): void {
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
        this.rockets.push({
            x: 1.5 + Math.random() * (this.width - 3),
            y: 0,
            vy: -(14 + Math.random() * 7),
            color,
            targetY: 7 + Math.random() * 10,
        })
    }

    private explode(rocket: Rocket): void {
        const count = 18 + Math.floor(Math.random() * 12)
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const speed = 3 + Math.random() * 9
            const color = Math.random() < 0.4
                ? rocket.color
                : PALETTE[Math.floor(Math.random() * PALETTE.length)]
            this.sparks.push({
                x: rocket.x,
                y: rocket.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.7 + Math.random() * 0.9,
                maxLife: 1.6,
                color,
            })
        }

        if (Math.random() < 0.35) {
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2
                this.sparks.push({
                    x: rocket.x,
                    y: rocket.y,
                    vx: Math.cos(angle) * 3,
                    vy: Math.sin(angle) * 3,
                    life: 0.9,
                    maxLife: 0.9,
                    color: PALETTE[i % PALETTE.length],
                })
            }
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
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.grid[y * this.width + x]
                const r = Math.round(cell[0] * this.brightness)
                const g = Math.round(cell[1] * this.brightness)
                const b = Math.round(cell[2] * this.brightness)
                if (r === 0 && g === 0 && b === 0) {
                    continue
                }
                rasterizer.fillRect(x * this.zoom, y * this.zoom, this.zoom, this.zoom, [r, g, b])
            }
        }
    }
}