import Canvas from "canvas";


export default class ImageStrategy {

    constructor(canvasScreen, params) {
        this.canvasScreen = canvasScreen
        this.params = params

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
