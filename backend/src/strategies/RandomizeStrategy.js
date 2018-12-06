import {getRandomInt} from "../Utils"
import AbstractIntervalStrategy from "./AbstractIntervalStrategy";

export const BlueRandomizeStrategy = (screen, ...more) => {
    return new RandomizeStrategy(screen,15,()=> getRandomInt(255), 255, ...more)
}

export const RedRandomizeStrategy = (screen, ...more) => {
    return new RandomizeStrategy(screen,255,()=> getRandomInt(255), 15, ...more)
}

export const GreenRandomizeStrategy = (screen, ...more) => {
    return new RandomizeStrategy(screen,()=> getRandomInt(100), 255, ()=> getRandomInt(200) , ...more)
}

export class RandomizeStrategy extends AbstractIntervalStrategy{
    rStrategy
    gStrategy
    bStrategy

    turnedOffPercentage
    replacedPerStep

    constructor(screen, rStrategy, gStrategy, bStrategy, period, turnedOffPercentage = 0.8, replacedPerStep = 1) {
        super(screen, period)
        this.rStrategy = rStrategy
        this.gStrategy = gStrategy
        this.bStrategy = bStrategy
        this.turnedOffPercentage = turnedOffPercentage
        this.replacedPerStep = replacedPerStep
    }

    step() {
        for (let i = 0; i < this.replacedPerStep; i++) {
            this._replacePixel()
        }
        this.updateScreen()
    }

    _replacePixel(){
        let victimPixel = this.screen.pickRandomPixel()
        if(this.turnedOffPercentage && getRandomInt(100) >= this.turnedOffPercentage*100){
            this.screen.setPixel(victimPixel.x, victimPixel.y, [0,0,0])
        } else {
            let computedColor = this._playColorStrategy()
            this.screen.setPixel(victimPixel.x, victimPixel.y, [computedColor.r, computedColor.g, computedColor.b])
        }
    }

    _playColorStrategy() {
        return {
            r: this._unfoldColor(this.rStrategy),
            g: this._unfoldColor(this.gStrategy),
            b: this._unfoldColor(this.bStrategy),
        }
    }

    _unfoldColor(rStrategy) {
        if( typeof rStrategy === "function"){
            return rStrategy()
        } else {
            return rStrategy
        }
    }
}