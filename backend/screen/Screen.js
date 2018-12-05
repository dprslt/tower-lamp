import nj from 'numjs'
import {getRandomInt} from "../Utils"

export class Screen {
    width;
    height;

    socket;

    data

    constructor(width, height, socket) {
        this.width = width
        this.height = height
        this.socket = socket

        this.data = nj.zeros([width, height, 3])
    }

    setPixel(x,y, pixelValue){
        this.data.set(x, y, 0, pixelValue[0])
        this.data.set(x, y, 1, pixelValue[1])
        this.data.set(x, y, 2, pixelValue[2])
    }

    pickRandomPixel(){
        return {
            x: getRandomInt(this.width),
            y: getRandomInt(this.height)
        }
    }

    refresh(){
        if(this.socket) {
            this.socket.emit("screen-update", this.toFadeCandy())
        }
    }

    flat(){
        return this.data.reshape(1,this.width * this.height * 3).flatten()
    }

    toFadeCandy(){
        return nj.concatenate([0,0,0], this.flat()).tolist()
    }



}