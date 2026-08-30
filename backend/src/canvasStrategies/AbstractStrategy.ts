import {CanvasScreen} from "../screen/CanvasScreen";

export default abstract class AbstractStrategy {


    protected canvasScreen : CanvasScreen;
    protected params: any;
    protected mountTime = 0;
    private readonly stopAfterSeconds: number;

    public constructor(canvasScreen: CanvasScreen, params: any) {
        this.canvasScreen = canvasScreen;
        this.params = params;
        this.stopAfterSeconds = typeof params?.stopAfterSeconds === 'number' ? params.stopAfterSeconds : 0
    }

    protected markMounted(): void {
        this.mountTime = Date.now()
    }

    isDone(): boolean {
        return this.stopAfterSeconds > 0
            && this.mountTime > 0
            && (Date.now() - this.mountTime) / 1000 >= this.stopAfterSeconds
    }

    abstract mount() : void;

    abstract unmount() : void;
}
