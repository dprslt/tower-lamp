import {Screen} from "./Screen"
import {Rasterizer} from "./Rasterizer"
import {Server} from "socket.io"
import FadeCandyConnection from "../FadeCandyConnection"
import {Pos, RGBColor} from "../types"


export interface CanvasLayer {
    draw(rasterizer: Rasterizer): void
}

export class CanvasScreen extends Screen {

    private readonly zoomFactor: number;

    private readonly rasterizer: Rasterizer
    private cellMatrix: RGBColor[][]
    private pixelsVisible = true
    private layers: CanvasLayer[] = []
    private refreshIntervalId : NodeJS.Timeout | undefined;

    constructor(width: number, height: number, serverSocketFrontend: Server, fadeCandy: FadeCandyConnection, zoomFactor: number) {
        super(width, height, serverSocketFrontend, fadeCandy)

        this.zoomFactor = zoomFactor

        this.rasterizer = new Rasterizer(width * zoomFactor, height * zoomFactor)
        this.cellMatrix = []
        for (let x = 0; x < width; x++) {
            this.cellMatrix[x] = []
            for (let y = 0; y < height; y++) {
                this.cellMatrix[x][y] = [0, 0, 0]
            }
        }
    }

    getCanvasSize(){
        return {
            width: this.width * this.zoomFactor,
            height: this.height * this.zoomFactor
        }
    }

    erase() {
        this.rasterizer.clear()
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                this.cellMatrix[x][y] = [0, 0, 0]
            }
        }
        this.pixelsVisible = true
    }

    setPixel(x: number, y: number, pixelValue: RGBColor, _draw: boolean = false) {
        if (x >= this.width || y >= this.height || x < 0 || y < 0) {
            throw "Out of screen Exception"
        }
        this.cellMatrix[x][y] = pixelValue
    }

    setRow(y: number, value: RGBColor) {
        super.setRow(y, value)
    }

    setCol(x: number, value: RGBColor) {
        super.setCol(x, value)
    }

    setPixels(value: RGBColor) {
        for (let i = 0; i < this.width; i++) {
            this.setCol(i, value)
        }
    }

    pickRandomPixel() : Pos{
        return super.pickRandomPixel();
    }

    async flat() {
        this.compose()

        const rotatedRGBdata: number[] = []
        for (let i = 0; i < this.width; i++) {
            for (let j = this.height - 1; j >= 0; j--) {
                const color = this.rasterizer.averageBlock(i * this.zoomFactor, j * this.zoomFactor, this.zoomFactor, this.zoomFactor)
                rotatedRGBdata.push(color[0], color[1], color[2])
            }
        }

        return rotatedRGBdata
    }

    private compose(): void {
        this.rasterizer.clear()

        if (this.pixelsVisible) {
            for (let x = 0; x < this.width; x++) {
                for (let y = 0; y < this.height; y++) {
                    this.rasterizer.fillRect(
                        x * this.zoomFactor,
                        y * this.zoomFactor,
                        this.zoomFactor,
                        this.zoomFactor,
                        this.cellMatrix[x][y]
                    )
                }
            }
        }

        for (const layer of this.layers) {
            layer.draw(this.rasterizer)
        }
    }

    hidePixels(){
        this.pixelsVisible = false
    }

    showPixels(){
        this.pixelsVisible = true
    }

    registerLayer(layer: CanvasLayer){
        this.layers.push(layer)
    }

    unregisterLayer(layer: CanvasLayer){
        this.layers = this.layers.filter((l) => l !== layer)
    }

    start(){
        this.refreshIntervalId = setInterval(() => {
            this.refresh()
        }, 1000 / 40)
    }

    stop(){
        if(this.refreshIntervalId){
            clearInterval(this.refreshIntervalId)
        }
    }
}