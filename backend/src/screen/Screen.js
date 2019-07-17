import nj from 'numjs'
import {getRandomInt} from "../Utils"

export class Screen {
    width;
    height;

    socketFrontend;

    data

    constructor(width, height, socketFrontend, socketFadeCandy) {
        this.width = width
        this.height = height
        this.socketFrontend = socketFrontend
        this.socketFadeCandy = socketFadeCandy

        this.erase()
    }

    erase(){
        this.data = nj.zeros([this.width, this.height, 3])
    }

    setPixel(x,y, pixelValue){
        this.data.set(x, y, 0, pixelValue[0])
        this.data.set(x, y, 1, pixelValue[1])
        this.data.set(x, y, 2, pixelValue[2])
    }

    setRow(y, value){
        for (let i = 0; i < this.width; i++){
            this.setPixel(i,y, value)
        }
    }

    setCol(x, value){
        for (let i = 0; i < this.height; i++){
            this.setPixel(x,i, value)
        }
    }

    pickRandomPixel(){
        return {
            x: getRandomInt(this.width),
            y: getRandomInt(this.height)
        }
    }

    refresh(){
        const pixelArray = this.toFadeCandy()
        if(this.socketFrontend) {
            this.socketFrontend.emit("screen-update", this.toFadeCandy())
        }
        if(this.socketFadeCandy) {
            if(this.socketFadeCandy.readyState === 1){
                const packet = new Uint8Array(pixelArray)
                this.socketFadeCandy.send(packet.buffer)
            } else {
                //console.log("Socket is not ready, "+this.socketFadeCandy.readyState)
            }
        }
    }

    flat(){
        return this.data.reshape(1,this.width * this.height * 3).flatten()
    }

    toFadeCandy(){
        return nj.concatenate([0,0,0,0], this.flat()).tolist()
    }


    injectFlatData(fullFrame) {
        this.data = nj.array(fullFrame).reshape([this.width, this.height, 3])
    }

    displayRowFrame(flatennedFrame){
        if(this.socketFadeCandy) {
            if(this.socketFadeCandy.readyState === 1){
                const packet = new Uint8Array(flatennedFrame)
                this.socketFadeCandy.send(packet.buffer)
            } else {
                //console.log("Socket is not ready, "+this.socketFadeCandy.readyState)
            }
        }
    }



}