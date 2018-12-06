import {CircleStrategy} from "./strategies/CircleStrategy";

const templates = [{
        name: "Cercle",
        constr: CircleStrategy,
        params: [
            {name: "rStrategy", type: "color"},
            {name: "gStrategy", type: "color"},
            {name: "bStrategy", type: "color"},
            {name: "period", type: "number"},
            {name: "reverseDirection", type: "bool"},
        ]
    }
]

export default class StrategyFactory{

    screen


    constructor(screen) {
        this.screen = screen;
    }

    getTemplates(){
        return templates
    }

    getStrategyFromTemplate(string, ...arg){
        let strategy = templates.filter(e => e.name === string)
        if(strategy.length === 0){
            return null
        } else {
            return new strategy[0].constr(this.screen, ...args)
        }
    }


}