import getPixels from 'get-pixels'
import AbstractStrategy from "./AbstractStrategy"
import {CanvasScreen, CanvasLayer} from "../screen/CanvasScreen"
import {DecodedImage} from "../screen/Rasterizer";


export function computeSlideOffset(elapsedSeconds: number, duration: number, slideDistance: number): number {
    if (duration <= 0 || slideDistance <= 0) {
        return 0
    }
    const halfPeriod = duration
    const phase = (elapsedSeconds % (2 * halfPeriod)) / halfPeriod
    const progress = phase < 1 ? phase : 2 - phase
    return -slideDistance * progress
}


export default class ImageStrategy extends AbstractStrategy {

    private layer: CanvasLayer | null = null
    private image: DecodedImage | null = null
    private readonly duration: number
    private mountTime: number = 0

    public constructor(canvasScreen: CanvasScreen, params: any) {
        super(canvasScreen, params)

        this.duration = typeof params.duration === 'number' ? params.duration : 10

        getPixels(params.data, (err: any, pixels: any) => {
            if (err) {
                console.error('Error while decoding the strategy image')
                return
            }
            this.image = {
                width: pixels.shape[0],
                height: pixels.shape[1],
                data: new Uint8ClampedArray(pixels.data),
            }
        })

        this.layer = {
            draw: (rasterizer) => {
                if (!this.image) {
                    return
                }
                const size = this.canvasScreen.getCanvasSize()
                const elapsedSeconds = (Date.now() - this.mountTime) / 1000
                const slideDistance = this.image.width - size.width
                const offset = computeSlideOffset(elapsedSeconds, this.duration, slideDistance)
                rasterizer.drawImage(this.image, offset, 0, this.image.width, size.height)
            }
        }
    }

    mount() {
        this.mountTime = Date.now()
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
}