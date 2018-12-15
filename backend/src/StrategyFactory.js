import {CircleStrategy} from "./strategies/CircleStrategy";
import {
    BlueRandomizeStrategy,
    GreenRandomizeStrategy,
    RandomizeStrategy,
    RedRandomizeStrategy
} from "./strategies/RandomizeStrategy";

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
    }, {
        name: "Danse Rouge",
        constr: RedRandomizeStrategy,
        params: [
            {name: "period", type: "number"},
            {name: "percentage", type: "number"},
            {name: "replaced", type: "number"},
        ]
    }, {
        name: "Danse Bleue",
        constr: BlueRandomizeStrategy,
        params: [
            {name: "period", type: "number"},
            {name: "percentage", type: "number"},
            {name: "replaced", type: "number"},
        ]
    }, {
        name: "Danse Verte",
        constr: GreenRandomizeStrategy,
        params: [
            {name: "period", type: "number"},
            {name: "percentage", type: "number"},
            {name: "replaced", type: "number"},
        ]
    }, {
        name: "Danse",
        constr: RandomizeStrategy,
        params: [
            {name: "rStrategy", type: "color"},
            {name: "gStrategy", type: "color"},
            {name: "bStrategy", type: "color"},
            {name: "period", type: "number"},
            {name: "percentage", type: "number"},
            {name: "replaced", type: "number"},
        ]
    },
]

export default class StrategyFactory{

    screen


    constructor(screen) {
        this.screen = screen;
    }

    getTemplates(){
        return templates
    }

    getStrategyFromTemplate(string, ...args){
        let strategy = templates.filter(e => e.name === string)
        if(strategy.length === 0){
            return null
        } else {
            return new strategy[0].constr(this.screen, ...args)
        }
    }


}