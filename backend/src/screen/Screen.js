import nj from 'numjs'
import {getRandomInt} from "../Utils"

export class Screen {
    width;
    height;

    socketFadeCandy;
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

    /**
     * Convert the 3D local matrix to a linear array containing all the pixel info to send to the FadeCandy.
     * @return {Promise<NdArray>}
     */
    async flat(){
        return this.data.reshape(1,this.width * this.height * 3).flatten()
    }

    /**
     * Convert the local screen to the fadecandy format.
     * Basicaly Adding a prefix
     * @return {Array}
     */
    async toFadeCandy(){
        return nj.concatenate([0,0,0,0], await this.flat()).tolist()
    }

    /**
     * Replace the current screen with the given data
     * @param fullFrame
     */
    injectFlatData(fullFrame) {
        this.data = nj.array(fullFrame).reshape([this.width, this.height, 3])
    }

    /**
     * Directly send a frame to the fade candy without touching the stored screen
     */
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

        /**
     * Send the current screen to the Fadecandy.
     */
    async refresh(){
        const pixelArray = await this.toFadeCandy()
        if(this.socketFrontend) {
            this.socketFrontend.emit("screen-update", pixelArray)
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



}
