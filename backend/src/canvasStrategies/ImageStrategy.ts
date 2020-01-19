import Konva from 'konva-node'
import Canvas from "canvas"
import AbstractStrategy from "./AbstractStrategy"
import {CanvasScreen} from "../screen/CanvasScreen"
import {Layer} from "konva/types/Layer"
import {Rect} from "konva/types/shapes/Rect";
import {Image} from "konva/types/shapes/Image";
import {Tween} from "konva/types/Tween";


export default class ImageStrategy extends AbstractStrategy {

    private readonly layer: Layer
    private readonly fill: Image
    private animation: Tween;

    public constructor(canvasScreen: CanvasScreen, params: any) {
        super(canvasScreen, params)

        this.layer = new Konva.Layer()

        const imageObject = new Canvas.Image()
        imageObject.src = this.params.data

        this.fill = new Konva.Image({
            x: 0,
            y: 0,
            image: imageObject,
            height: 21 * 20
        })
        this.layer.add(this.fill)

        const {data, ...otherParams} = this.params

        this.animation = new Konva.Tween({
            node: this.fill,
            x: -(imageObject.width - this.canvasScreen.getCanvasSize().width),
            easing: Konva.Easings.Linear,
            duration: 10,
            onFinish: () => {
                this.startAnimationReverse()
            },
            // On reset is called when the Animation Reverse is over.
            onReset: () => {
                this.startAnimation()
            },
            ...otherParams
        })

    }

    mount() {
        this.canvasScreen.hidePixels()
        this.canvasScreen.registerLayer(this.layer)
        this.startAnimation()
    }

    unmount() {
        this.layer.remove()
        this.layer.destroy()
        this.animation.destroy()
    }

    /* Specific code */

    startAnimation() {
        this.animation.play()
    }


    startAnimationReverse() {
        this.animation.reverse()
    }
}
