
import ColorStrategy from "./canvasStrategies/ColorStrategy";
import OFFStrategy from "./canvasStrategies/OFFStrategy";
import ImageStrategy from "./canvasStrategies/ImageStrategy";
import {CanvasScreen} from "./screen/CanvasScreen";
import AbstractStrategy from "./canvasStrategies/AbstractStrategy";


type Constructor<T> = {
    new (...args: any[]): T;
}

const templates: { [id: string] :  Constructor<AbstractStrategy>}   = {
    'color': ColorStrategy,
    'off':  OFFStrategy,
    'image': ImageStrategy,
}

export default class CanvasStrategyFactory {

    private readonly screen: CanvasScreen

    constructor(screen: CanvasScreen) {
        this.screen = screen;
    }

    getTemplates() {
        return templates
    }

    getStrategyFromTemplate(strategyId: string, params: any) {
        const strategy = templates[strategyId]
        if (!strategy) {
            return null
        } else {
            return new strategy(this.screen, params)
        }
    }
}
