    import Konva from 'konva-node'
    import {Screen} from "./Screen"
    import getPixels from 'get-pixels'
    import {Server, Socket} from "socket.io"
    import {Stage} from "konva/types/Stage"
    import {Layer} from "konva/types/Layer"
    import {Rect} from "konva/types/shapes/Rect";
    import {arrayToRbgString} from "../Utils";
    import {PixelsArray, RGBColor} from "../types";
    import WebSocket from "ws"


    export class CanvasScreen extends Screen {

        private readonly zoomFactor: number;

        private readonly konvaStage : Stage
        private pixelMatrixLayer!: Layer
        private pixelMatrix: Map<String, Rect> = new Map()
        private pixelHidden = true
        private refreshIntervalId : NodeJS.Timeout | undefined;



        constructor(width: number, height: number, serverSocketFrontend: Server, socketFadeCandy: WebSocket, zoomFactor: number) {
            super(width, height, serverSocketFrontend, socketFadeCandy)

            this.zoomFactor = zoomFactor

            this.konvaStage = new Konva.Stage({
                ...this.getCanvasSize()
            })

            this.initializePixelMatrix()
            this.showPixels()
        }

        getCanvasSize(){
            return {
                width: this.width * this.zoomFactor,
                height: this.height * this.zoomFactor
            }
        }

        initializePixelMatrix() {
            this.pixelMatrix = new Map<String, Rect>()
            if(this.pixelMatrixLayer){
                this.pixelMatrixLayer.destroy()
            }
            this.pixelMatrixLayer = new Konva.Layer()


            for (let x = 0; x < this.width; x++) {
                for (let y = 0; y < this.height; y++) {
                    let pixel = new Konva.Rect({
                        x: x * this.zoomFactor,
                        y: y * this.zoomFactor,
                        height: this.zoomFactor,
                        width: this.zoomFactor,
                        fill: 'black'
                    })
                    this.pixelMatrix.set(`${x}-${y}`, pixel)
                    this.pixelMatrixLayer.add(pixel)
                }
            }
        }

        erase() {
            if (this.konvaStage) {
                this.konvaStage.clear()
                this.initializePixelMatrix()
                this.pixelHidden = true
            }
        }


        setPixel(x: number, y: number, pixelValue: RGBColor, draw: boolean = false) {
            let pixel = this.pixelMatrix.get(`${x}-${y}`)
            if(pixel){
                pixel.fill(arrayToRbgString(pixelValue))
                if(draw){
                    pixel.draw()
                }
            } else {
                throw "Out of screen Exception"
            }
        }

        setRow(y: number, value: RGBColor) {
            super.setRow(y, value)
            this.pixelMatrixLayer.batchDraw()
        }

        setCol(x: number, value: RGBColor) {
            super.setCol(x, value)
            this.pixelMatrixLayer.batchDraw()
        }

        setPixels(value: RGBColor) {
            for (let i = 0; i < this.width; i++) {
                this.setCol(i, value)
            }
        }

        pickRandomPixel() {
            return super.pickRandomPixel();
        }

        async flat() {

            const dataUrl = this.konvaStage.toDataURL({pixelRatio: 1 / this.zoomFactor})
            const loadImagePromise = new Promise<PixelsArray>((resolve, reject) => getPixels(dataUrl, (err: any, pixels: PixelsArray) => {
                if (err) {
                    reject()
                } else {
                    resolve(pixels)
                }
            }))
            const imageObject = await loadImagePromise
            // The output is a flat array of RGBA data, pixel were read line by line right to left
            const myImgData = imageObject.data

            // Rotate the Image, the screen need data in a bottom to top order column by colums
            // We will also remove the alpha layer by applying the color over a black backend
            const RGBBackground = [0, 0, 0]
            const rotatedRGBdata = []
            for (let i = 0; i < imageObject.shape[0]; i++) {
                for (let j = 20; j >= 0; j--) {
                    const firstByteOfPixel = (j * imageObject.shape[0] + i) * 4
                    const alpha = myImgData[firstByteOfPixel + 3] / 255
                    // R
                    rotatedRGBdata.push((1 - alpha) * RGBBackground[0] + alpha * myImgData[firstByteOfPixel])
                    // G
                    rotatedRGBdata.push((1 - alpha) * RGBBackground[1] + alpha * myImgData[firstByteOfPixel + 1])
                    // B
                    rotatedRGBdata.push((1 - alpha) * RGBBackground[2] + alpha * myImgData[firstByteOfPixel + 2])
                }
            }

            //console.log(rotatedRGBdata)

            return rotatedRGBdata
        }


        async refresh() {
            super.refresh();
            // if (this.socketFrontend) {
            //     this.socketFrontend.emit("screen-image", this.konvaStage.toDataURL({pixelRatio: 0.1 / this.factor}))
            // }
        }


        hidePixels(){
            if(!this.pixelHidden){
                this.pixelMatrixLayer.remove()
                this.pixelHidden = true
            }
        }

        showPixels(){
            if(this.pixelHidden){
                this.konvaStage.add(this.pixelMatrixLayer)
                this.pixelHidden = false
            }
        }

        registerLayer(layer: Layer){
            this.konvaStage.add(layer)
            this.konvaStage.batchDraw()
        }

        unregisterLayer(layer: Layer){
            layer.remove()
        }

        start(){
            this.refreshIntervalId = setInterval(() => {
                this.refresh()
            }, 1000 / 40)
        }

        stop(){
            if(this.refreshIntervalId){
                clearInterval(this.refreshIntervalId)
            }
        }
    }
