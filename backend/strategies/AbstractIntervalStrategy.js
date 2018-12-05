import AbstractStrategy from "./AbstractStrategy";

export default class AbstractIntervalStrategy extends AbstractStrategy{

    interval
    period;

    constructor(screen, period) {
        super(screen)
        this.period = period;
        this.interval = null

    }


    start() {
        this.interval = setInterval(this.step.bind(this), this.period)
    }

    stop() {
        if (this.interval){
            clearInterval(this.interval)
            this.interval = null
        }
    }

    step() {
        throw new Error('Not yet Implemented')
    }
}