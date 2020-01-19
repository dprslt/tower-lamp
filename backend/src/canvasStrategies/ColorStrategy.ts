import AbstractStrategy from "./AbstractStrategy";
import Konva from 'konva-node'
import {CanvasScreen} from "../screen/CanvasScreen";
import {Layer} from "konva/types/Layer";
import {Rect} from "konva/types/shapes/Rect";


export default class ColorStrategy extends AbstractStrategy{

    private readonly layer: Layer
    private readonly fill: Rect

    public constructor(canvasScreen: CanvasScreen, params: any) {
        super(canvasScreen, params)

        this.layer = new Konva.Layer()
        this.fill = new Konva.Rect({
            x: 0,
            y:0,
            ...this.canvasScreen.getCanvasSize(),
            ...params
        })
        this.layer.add(this.fill)
    }

    mount(){
        this.canvasScreen.hidePixels()
        this.canvasScreen.registerLayer(this.layer)
    }

    unmount(){
        this.layer.remove()
        this.layer.destroy()
    }


}
