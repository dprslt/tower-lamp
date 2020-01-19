

export default class OFFStrategy {

    constructor(canvasScreen, params) {
        this.canvasScreen = canvasScreen
        this.params = params
    }

    mount(){
        this.canvasScreen.erase()
        this.canvasScreen.showPixels()
        setTimeout(() => {
            this.canvasScreen.stop()
        },500)
    }

    unmount(){
        this.canvasScreen.start()
    }


}
