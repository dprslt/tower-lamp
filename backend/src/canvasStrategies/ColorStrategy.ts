import AbstractStrategy from "./AbstractStrategy";
import {CanvasScreen, CanvasLayer} from "../screen/CanvasScreen";
import {FillSpec, LinearGradient, RGB} from "../screen/Rasterizer";


function fillSpecFromParams(params: any): FillSpec {
    if (typeof params.fill === 'string') {
        return params.fill
    }
    if (params.fillLinearGradientStartPoint && params.fillLinearGradientEndPoint) {
        const gradient: LinearGradient = {
            startPoint: params.fillLinearGradientStartPoint,
            endPoint: params.fillLinearGradientEndPoint,
            colorStops: params.fillLinearGradientColorStops || [0, '#000000', 1, '#000000'],
        }
        return gradient
    }
    if (typeof params.fill === 'undefined') {
        return [0, 0, 0]
    }
    return params.fill as RGB
}


export default class ColorStrategy extends AbstractStrategy{

    private layer: CanvasLayer | null = null

    public constructor(canvasScreen: CanvasScreen, params: any) {
        super(canvasScreen, params)

        const fill = fillSpecFromParams(params)

        this.layer = {
            draw: (rasterizer) => {
                const size = this.canvasScreen.getCanvasSize()
                rasterizer.fillRect(0, 0, size.width, size.height, fill)
            }
        }
    }

    mount(){
        this.canvasScreen.hidePixels()
        if (this.layer) {
            this.canvasScreen.registerLayer(this.layer)
        }
    }

    unmount(){
        if (this.layer) {
            this.canvasScreen.unregisterLayer(this.layer)
            this.layer = null
        }
    }


}