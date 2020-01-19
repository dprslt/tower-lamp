
import ColorStrategy from "./canvasStrategies/ColorStrategy";
import OFFStrategy from "./canvasStrategies/OFFStrategy";
import ImageStrategy from "./canvasStrategies/ImageStrategy";

const templates = {
    "color": {
        id: "color",
        constr: ColorStrategy
    },
    "off": {
        id: "off",
        constr: OFFStrategy
    },
    "image":  {
        id: "image",
        constr: ImageStrategy
    },
}

export default class CanvasStrategyFactory {

    screen

    constructor(screen) {
        this.screen = screen;
    }

    getTemplates() {
        return templates
    }

    getStrategyFromTemplate(strategyId, params) {
        let strategy = templates[strategyId]
        if (!strategy) {
            return null
        } else {
            return new strategy.constr(this.screen, params)
        }
    }
}
