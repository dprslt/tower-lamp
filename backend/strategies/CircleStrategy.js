import AbstractIntervalStrategy from "./AbstractIntervalStrategy";

function mod(n, m) {
    return ((n % m) + m) % m;
}

export class CircleStrategy extends AbstractIntervalStrategy{

    reverseDirection
    rStrategy
    gStrategy
    bStrategy

    circleLevel

    constructor(screen, rStrategy, gStrategy, bStrategy, period, reverseDirection = false) {
        super(screen, period)
        this.rStrategy = rStrategy
        this.gStrategy = gStrategy
        this.bStrategy = bStrategy
        this.reverseDirection = reverseDirection;

        this.circleLevel = 0
    }

    step(){
        let computedColor = this._playColorStrategy()
        this.screen.setRow(this.circleLevel, [computedColor.r, computedColor.g, computedColor.b])
        this.screen.setRow(mod(this.circleLevel - 1, this.screen.height), [0,0,0])

        if(!this.reverseDirection){
            this.circleLevel++
        } else {
            this.circleLevel--
        }
        this.circleLevel = mod(this.circleLevel, this.screen.height)
        this.screen.refresh()

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