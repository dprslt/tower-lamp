import {getRandomInt} from "../Utils"
import {Pos, RGBColor} from "../types";
import {Server} from "socket.io";
import WebSocket from "ws"
import FadeCandyConnection from "../FadeCandyConnection";


export abstract class Screen {
    protected readonly width : number;
    protected readonly height: number;

    private readonly fadeCandy: FadeCandyConnection;
    socketFrontend: Server;

    private onRefresh: (() => void) | null = null


    constructor(width: number, height: number, socketFrontend: Server, fadeCandy: FadeCandyConnection) {
        this.width = width
        this.height = height
        this.socketFrontend = socketFrontend
        this.fadeCandy = fadeCandy
    }

    get socketFadeCandy(): WebSocket {
        return this.fadeCandy.socket
    }

    abstract erase() : void;

    abstract setPixel(x:number,y: number, pixelValue: RGBColor): void

    setRow(y: number, value : RGBColor){
        for (let i = 0; i < this.width; i++){
            this.setPixel(i,y, value)
        }
    }

    setCol(x : number, value: RGBColor){
        for (let i = 0; i < this.height; i++){
            this.setPixel(x,i, value)
        }
    }

    pickRandomPixel() : Pos{
        return {
            x: getRandomInt(this.width),
            y: getRandomInt(this.height)
        }
    }

    /**
     * Convert the 3D local matrix to a linear array containing all the pixel info to send to the FadeCandy.
     * @return {Promise<number[]>}
     */
    abstract flat() : Promise<number[]>

    /**
     * Convert the local screen to the fadecandy format.
     * Basicaly Adding a prefix
     * @return {Array}
     */
    async toFadeCandy(){
        return [0,0,0,0].concat(await this.flat())
    }


    /**
     * Directly send a frame to the fade candy without touching the stored screen
     */
    displayRowFrame(flatennedFrame : number[]) : void{
        if(this.socketFadeCandy) {
            if(this.socketFadeCandy.readyState === 1){
                const packet = new Uint8Array(flatennedFrame)
                this.socketFadeCandy.send(packet.buffer)
            } else {
                //console.log("Socket is not ready, "+this.socketFadeCandy.readyState)
            }
        }
    }

    setOnRefresh(callback: (() => void) | null): void {
        this.onRefresh = callback
    }

    /**
     * Send the current screen to the Fadecandy.
     */
    async refresh(): Promise<void> {
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
        this.onRefresh?.()
    }



}
