    import Konva from 'konva-node'
    import canvas from 'canvas'
    import nj from 'numjs'
    import {Screen} from "./Screen";
    import {createCanvas, loadImage} from 'canvas';
    import getPixels from 'get-pixels'
    import {arrayToRbgString} from "../Utils";


    export class CanvaScreen extends Screen {

        zoomFactor;

        konvaStage;
        pixelMatrix;
        pixelMatrixLayer;
        pixelHidden = true;


        constructor(width, height, socketFrontend, socketFadeCandy, zoomFactor) {
            super(width, height, socketFrontend, socketFadeCandy)

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
            this.pixelMatrix = {}
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
                    this.pixelMatrix[`${x}-${y}`] = pixel
                    this.pixelMatrixLayer.add(pixel)
                }
            }
        }


        setPixel(x, y, pixelValue, draw = false) {
            let pixel = this.pixelMatrix[`${x}-${y}`]
            if(pixel){
                pixel.fill(arrayToRbgString(pixelValue))
                if(draw){
                    pixel.draw()
                }
            } else {
                throw "Out of screen Exception"
            }
        }

        erase() {
            if (this.konvaStage) {
                this.konvaStage.clear()
                this.initializePixelMatrix()
                this.pixelHidden = true
            }
        }

        setRow(y, value) {
            super.setRow(y, value)
            this.pixelMatrixLayer.batchDraw()
        }

        setCol(x, value) {
            super.setCol(x, value)
            this.pixelMatrixLayer.batchDraw()
        }

        setPixels(value) {
            for (let i = 0; i < this.width; i++) {
                this.setCol(i, value)
            }
        }


        pickRandomPixel() {
            return super.pickRandomPixel();
        }

        async flat() {

            const dataUrl = this.konvaStage.toDataURL({pixelRatio: 1 / this.zoomFactor})
            const promise = new Promise((resolve, reject) => getPixels(dataUrl, (err, pixels) => {
                if (err) {
                    reject()
                } else {
                    resolve(pixels)
                }
            }))
            const imageObject = await promise
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

        registerLayer(layer){
            this.konvaStage.add(layer)
            this.konvaStage.batchDraw()
        }

        unregisterLayer(layer){
            layer.remove()
        }

        start(){
            this.interval = setInterval(() => {
                this.refresh()
            }, 1000 / 40)
        }

        stop(){
            clearInterval(this.interval)
        }
    }
