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
        const levelsMinus = [0.75, 0.5, 0.15, 0]
        for (let i = 0; i< levelsMinus.length; ++i){
            this.screen.setRow(this.safePos(this.circleLevel-(i+1)), [computedColor.r * levelsMinus[i], computedColor.g * levelsMinus[i], computedColor.b * levelsMinus[i]])
        }

        const levelsPlus = [0.2, 0.1]
        for (let i = 0; i< levelsPlus.length; ++i){
            this.screen.setRow(this.safePos(this.circleLevel+(i+1)), [computedColor.r * levelsPlus[i], computedColor.g * levelsPlus[i], computedColor.b * levelsMinus[i]])
        }

        this.evolvePos()

        this.screen.refresh()
    }

    evolvePos(){
        if(!this.reverseDirection){
            this.circleLevel++
        } else {
            this.circleLevel--
        }
        this.circleLevel = mod(this.circleLevel, this.screen.height)
    }

    safePos(pos){
        return mod(pos, this.screen.height)
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