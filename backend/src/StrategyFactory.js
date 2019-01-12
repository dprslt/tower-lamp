import {CircleStrategy} from "./strategies/CircleStrategy";
import {
    BlueRandomizeStrategy,
    GreenRandomizeStrategy,
    RandomizeStrategy,
    RedRandomizeStrategy
} from "./strategies/RandomizeStrategy";
import NullStrategy from "./strategies/NullStrategy";

const templates = [{
        name: "Cercle",
        constr: CircleStrategy,
        params: [
            {name: "rStrategy", type: "color", defaultValue: 200 },
            {name: "gStrategy", type: "color", defaultValue: 45},
            {name: "bStrategy", type: "color", defaultValue: 45},
            {name: "period", type: "number", defaultValue: 200},
            {name: "reverseDirection", type: "bool", defaultValue: false},
        ]
    }, {
        name: "Danse Rouge",
        constr: RedRandomizeStrategy,
        params: [
            {name: "period", type: "number", defaultValue: 50},
            {name: "percentage", type: "number", defaultValue: 0.8},
            {name: "replaced", type: "number"},
        ]
    }, {
        name: "Danse Bleue",
        constr: BlueRandomizeStrategy,
        params: [
            {name: "period", type: "number", defaultValue: 50},
            {name: "percentage", type: "number", defaultValue: 0.8},
            {name: "replaced", type: "number", defaultValue: 5},
        ]
    }, {
        name: "Danse Verte",
        constr: GreenRandomizeStrategy,
        params: [
            {name: "period", type: "number", defaultValue: 50},
            {name: "percentage", type: "number", defaultValue: 0.8},
            {name: "replaced", type: "number", defaultValue: 5},
        ]
    }, {
        name: "Danse",
        constr: RandomizeStrategy,
        params: [
            {name: "rStrategy", type: "color", defaultValue: { type: "random", max: 250}},
            {name: "gStrategy", type: "color", defaultValue: { type: "random", max: 200}},
            {name: "bStrategy", type: "color", defaultValue: 90},
            {name: "period", type: "number", defaultValue: 50},
            {name: "percentage", type: "number", defaultValue: 0.8},
            {name: "replaced", type: "number", defaultValue: 5},
        ]
    }, {
        name: "Stop",
        constr: NullStrategy,
        params: [ ],
        colorClass: "btn-danger"
    },
]

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max))
}


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

    buildParametersArray(parameters){
        return parameters.map((p => {
            if(p.value){
                return this.computeParameterValue(p.value)
            }else {
                return this.computeParameterValue(p.defaultValue)
            }
        }))
    }

    computeParameterValue(value){
        if(typeof value === "object"){
            if(value.type === "random"){
                return () => { return getRandomInt(value.max) }
            } else {
                return undefined
            }
        } else {
            return value
        }
    }



}