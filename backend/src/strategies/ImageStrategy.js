import AbstractIntervalStrategy from "./AbstractIntervalStrategy";

function mod(n, m) {
    return ((n % m) + m) % m;
}

export class ImageStrategy extends AbstractIntervalStrategy{

    reverseDirection
    image
    size

    offset

    constructor(screen, image, {size, period, reverseDirection = false}) {
        super(screen, period)
        this.image = image
        this.size = size
        this.reverseDirection = reverseDirection;

        this.offset = 0
    }

    step(){
        const firstPart = this.image.slice(this.offset*21*3, 21*(this.offset+8)*3)
        let secondPart = []
        if(this.offset > this.size.width - 8){
            secondPart =  this.image.slice(0, 21*(8 - ( this.size.width - this.offset))*3)
        }

        const fullFrame = [...firstPart, ...secondPart]

        this.screen.injectFlatData(fullFrame)
        this.screen.refresh()

        this.offset = (this.offset + 1) % this.size.width
    }

}