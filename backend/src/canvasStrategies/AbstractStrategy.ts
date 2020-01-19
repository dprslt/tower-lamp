import {CanvasScreen} from "../screen/CanvasScreen";

export default abstract class AbstractStrategy {


    protected canvasScreen : CanvasScreen;
    protected params: any;

    public constructor(canvasScreen: CanvasScreen, params: any) {
        this.canvasScreen = canvasScreen;
        this.params = params;
    }

    abstract mount() : void;

    abstract unmount() : void;
}
