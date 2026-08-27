import AbstractStrategy from "./AbstractStrategy";
import {CanvasLayer, CanvasScreen} from "../screen/CanvasScreen";
import {parseColor, RGB, Rasterizer} from "../screen/Rasterizer";

interface Spark {
    x: number
    y: number
    vx: number
    vy: number
    life: number
    maxLife: number
    color: RGB
}

const FADE_HALF_LIFE_S = 0.12
const GRAVITY = 22

export default class SpinningDotStrategy extends AbstractStrategy {

    private readonly width: number
    private readonly height: number
    private readonly zoom: number

    private readonly grid: RGB[]
    private readonly sparks: Spark[] = []

    private readonly color: RGB
    private readonly spinSpeed: number
    private readonly spinAccel: number
    private readonly riseSpeed: number
    private readonly brightness: number
    private readonly runs: number

    private lastTick = 0
    private explosionCount = 0
    private layer: CanvasLayer | null = null

    public constructor(canvasScreen: CanvasScreen, params: any) {
        super(canvasScreen, params)

        const size = canvasScreen.getCanvasSize()
        this.width = 8
        this.height = 21
        this.zoom = size.width / this.width
        this.color = typeof params.color === 'string' ? parseColor(params.color) : [255, 0, 0]
        this.spinSpeed = typeof params.spinSpeed === 'number' ? params.spinSpeed : 1.2
        this.spinAccel = typeof params.spinAccel === 'number' ? params.spinAccel : 1.2
        this.riseSpeed = typeof params.riseSpeed === 'number' ? params.riseSpeed : 20 / 1
        this.brightness = params.brightness ?? 1
        this.runs = typeof params.runs === 'number' ? params.runs : 0

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
        this.explosionCount = 0
        this.markMounted()
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

    isDone(): boolean {
        if (this.runs > 0 && this.explosionCount >= this.runs && this.sparks.length === 0) {
            return true
        }
        return super.isDone()
    }

    private tick(dt: number): void {
        const fade = Math.pow(0.5, dt / FADE_HALF_LIFE_S)
        for (const cell of this.grid) {
            cell[0] = Math.round(cell[0] * fade)
            cell[1] = Math.round(cell[1] * fade)
            cell[2] = Math.round(cell[2] * fade)
        }

        const elapsed = (Date.now() - this.mountTime) / 1000
        const x = (elapsed * this.spinSpeed + 0.5 * this.spinAccel * elapsed * elapsed) * this.width % this.width
        const y = this.height - 1 - elapsed * this.riseSpeed

        if (y <= 0 && (this.runs === 0 || this.explosionCount < this.runs)) {
            this.explosionCount++
            this.explode(x, 0)
            if (this.runs === 0 || this.explosionCount < this.runs) {
                this.mountTime = Date.now()
            }
        } else if (y > 0) {
            this.stampDot(x, y, this.color, 1)
        }

        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const spark = this.sparks[i]
            spark.vy += GRAVITY * dt
            spark.x += spark.vx * dt
            spark.y += spark.vy * dt
            spark.life -= dt
            if (spark.life <= 0 || spark.y < -1 || spark.y > this.height + 1 || spark.x < -1 || spark.x > this.width) {
                this.sparks.splice(i, 1)
                continue
            }
            this.stampCell(Math.round(spark.x), Math.round(spark.y), spark.color, Math.max(0, spark.life / spark.maxLife))
        }
    }

    private stampDot(x: number, y: number, color: RGB, intensity: number): void {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const falloff = dx === 0 && dy === 0 ? 1 : 0.4
                this.stampCell(Math.round(x + dx), Math.round(y + dy), color, intensity * falloff)
            }
        }
    }

    private explode(x: number, y: number): void {
        const count = 22 + Math.floor(Math.random() * 14)
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const speed = 2 + Math.random() * 5
            this.sparks.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.7 + Math.random() * 0.9,
                maxLife: 1.6,
                color: this.color,
            })
        }

        this.stampDot(x, y, this.color, 1)
    }

    private stampCell(x: number, y: number, color: RGB, intensity: number): void {
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