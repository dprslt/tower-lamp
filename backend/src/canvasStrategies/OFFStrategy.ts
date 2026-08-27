import AbstractStrategy from "./AbstractStrategy";
import { CanvasScreen } from "../screen/CanvasScreen";


export default class OFFStrategy extends AbstractStrategy {

    public constructor(canvasScreen: CanvasScreen, params: any) {
        super(canvasScreen, params)
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