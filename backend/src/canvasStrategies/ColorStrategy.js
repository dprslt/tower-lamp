

export default class ColorStrategy {

    constructor(canvasScreen, params) {
        this.canvasScreen = canvasScreen
        this.params = params

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
