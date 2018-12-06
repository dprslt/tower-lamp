export class Pixel{
    r;
    g;
    b;


    constructor(r, g, b) {
        this.r = r
        this.g = g
        this.b = b
    }

    set(rOrArray,g,b){
        if(Array.isArray(rOrArray)) {
            this.r = rOrArray[0]
            this.g = rOrArray[1]
            this.b = rOrArray[2]
        } else {
            this.r = rOrArray
            this.g = g
            this.b = b
        }
    }


    toArray() {
        return [ this.r, this.g, this.b ]
    }
}