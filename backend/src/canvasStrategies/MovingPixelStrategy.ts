import AbstractStrategy from "./AbstractStrategy";
import {CanvasScreen, CanvasLayer} from "../screen/CanvasScreen";
import {parseColor, RGB, Rasterizer} from "../screen/Rasterizer";


export function columnAt(elapsedSeconds: number, speed: number, columns: number): number {
    const t = (elapsedSeconds * speed) % columns
    return columns - 1 - Math.floor(t)
}


export default class MovingPixelStrategy extends AbstractStrategy {

    private layer: CanvasLayer | null = null
    private readonly color: RGB
    private readonly row: number
    private readonly speed: number
    private readonly runs: number
    private readonly sweepDuration: number

    public constructor(canvasScreen: CanvasScreen, params: any) {
        super(canvasScreen, params)

        this.color = typeof params.color === 'string' ? parseColor(params.color) : [255, 0, 0]
        this.row = typeof params.row === 'number' ? Math.round(params.row) : Math.floor(this.canvasScreen.screenHeight / 2)
        this.speed = typeof params.speed === 'number' ? params.speed : 2
        this.runs = typeof params.runs === 'number' ? params.runs : 0
        this.sweepDuration = this.canvasScreen.screenWidth / this.speed

        this.layer = {
            draw: (rasterizer: Rasterizer) => {
                const elapsedSeconds = (Date.now() - this.mountTime) / 1000
                const col = columnAt(elapsedSeconds, this.speed, this.canvasScreen.screenWidth)
                const zoom = this.canvasScreen.zoomFactor
                rasterizer.fillRect(col * zoom, this.row * zoom, zoom, zoom, this.color)
            }
        }
    }

    mount() {
        this.markMounted()
        this.canvasScreen.hidePixels()
        if (this.layer) {
            this.canvasScreen.registerLayer(this.layer)
        }
    }

    unmount() {
        if (this.layer) {
            this.canvasScreen.unregisterLayer(this.layer)
            this.layer = null
        }
    }

    isDone(): boolean {
        if (this.runs > 0 && (Date.now() - this.mountTime) / 1000 >= this.runs * this.sweepDuration) {
            return true
        }
        return super.isDone()
    }
}