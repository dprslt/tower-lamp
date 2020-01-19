//REACT
import React, {Component} from "react"
import PropTypes from 'prop-types'
// REDUX
import {connect} from 'react-redux'

// APP
import Strategies from "../components/strategies/strategies";
import ScreenFetcher from '../components/screen/screen-fetcher'
import { readAndCompressImage } from 'browser-image-resizer';
import ImageUploader from 'react-images-upload';
import io from 'socket.io-client'
import './screen-page.scss'
import LocalScreenFetcher from "../components/screen/local-screen-fetcher";
import {Circle, Layer, Stage, Rect} from "react-konva";
import Konva from 'konva';
import {Button} from "reactstrap";


function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max))
}

export default class ScreenPage extends Component {
    constructor (props, context) {
        super(props, context)

        this.playHandler = this.playHandler.bind(this)
        this.onDrop = this.onDrop.bind(this)

        this.state = {
            strategies: [],
            data: null,
            refresh: false,
            dataUrl: ''
        }

        this.socket = null

    }

    componentDidMount(){
        this.socket = io("localhost:30008",{
            "reconnectionAttempts": "Infinity",
            "transports": ['websocket']
        })

        this.socket.on('connect', function () {
            console.log("Sending event")
            this.socket.emit('get-strategies')
        }.bind(this))

        this.socket.on('strategies', function (data) {
            let newState = Object.assign({}, this.state)
            newState.strategies = data
            this.setState(newState)
        }.bind(this))

        this.socket.on('screen-image', (dataUrl) => {
            this.setState({...this.state, dataUrl})
        })
    }

    playHandler(strategy){
        console.log(strategy)
        this.socket.emit("select-strategy", (strategy))
    }

    config = {
        quality: 1,
        maxHeight: 22,
        autoRotate: true,
        debug: false
    };

    async onDrop(picture) {

        if(picture.length === 0) return

        // read image from file then resize it
        const lampPict = await readAndCompressImage(picture[picture.length-1], this.config);
        //console.log(lampPict)
        let base64Image = await this.convertToBase64(lampPict);

        //this.setState({picture: base64Image})

        // Load the blob in an image Object
        const imageObject = new Image()
        const loadingPromise = new Promise((resolve) => imageObject.onload = resolve)
        imageObject.src = base64Image
        await loadingPromise

        // Write the image onto a canvas
        const canvas = document.getElementById('canvas')
        canvas.width = imageObject.width;
        canvas.height = imageObject.height;
        //console.log([imageObject.width, imageObject.height])

        const context = canvas.getContext('2d');
        context.drawImage(imageObject, 0, 0 );

        // Read the full image from the canvas
        // The output is a flat array of RGBA data, pixel were read line by line right to left
        const myImgData = context.getImageData(0, 0, imageObject.width, imageObject.height).data;

        // Rotate the Image, the screen need data in a bottom to top order column by colums
        // We will also remove the alpha layer by applying the color over a black backend
        const RGBBackground = [0,0,0]
        const rotatedRGBdata = []
        for (let i = 0; i < imageObject.width; i++) {
            for (let j = 20; j >= 0 ; j--) {
                const firstByteOfPixel = (j * imageObject.width + i) * 4
                const alpha = myImgData[firstByteOfPixel + 3] / 255
                // R
                rotatedRGBdata.push((1 - alpha) * RGBBackground[0] + alpha * myImgData[firstByteOfPixel])
                // G
                rotatedRGBdata.push((1 - alpha) * RGBBackground[1] + alpha * myImgData[firstByteOfPixel + 1])
                // B
                rotatedRGBdata.push((1 - alpha) * RGBBackground[2] + alpha * myImgData[firstByteOfPixel + 2])
            }
        }

        if(this.socket){

            this.socket.emit("image-strategy", {
                image: rotatedRGBdata,
                params: {
                    size: {width: imageObject.width, height: imageObject.height},
                    reverseDirection: false,
                    period: 200
                }
            } )

        } else {
            console.log("No socket Connected")
        }
    }

    convertToBase64 = blob => {
        return new Promise(resolve => {
            var reader = new FileReader();
            reader.onload = function() {
                resolve(reader.result);
            };
            reader.readAsDataURL(blob);
        });
    };

    /*
    https://www.npmjs.com/package/browser-image-resizer
    https://www.npmjs.com/package/react-images-upload
    https://codesandbox.io/s/23rvk7531j
    https://www.npmjs.com/package/resize-image-data
    https://stackoverflow.com/questions/10754661/javascript-getting-imagedata-without-canvas
    http://marcodiiga.github.io/rgba-to-rgb-conversion
     */

    moveTo = (e) => {
        e.target.to({
            duration: 1,
            easing: Konva.Easings.EaseInOut,
            x: Math.random() * 80 * this.factor,
            y: Math.random() * 210 * this.factor,
        })

    }

    componentWillMount() {



    }

    sendFrame = async (imageObject) => {

        // Write the image onto a canvas
        const canvas = document.getElementById('canvas')
        canvas.width = imageObject.width;
        canvas.height = imageObject.height;
        //console.log([imageObject.width, imageObject.height])

        const context = canvas.getContext('2d');
        context.drawImage(imageObject, 0, 0 );

        // Read the full image from the canvas
        // The output is a flat array of RGBA data, pixel were read line by line right to left
        const myImgData = context.getImageData(0, 0, imageObject.width, imageObject.height).data;

        //console.log(myImgData)

        // Rotate the Image, the screen need data in a bottom to top order column by colums
        // We will also remove the alpha layer by applying the color over a black backend
        const RGBBackground = [0,0,0]
        const rotatedRGBdata = []
        for (let i = 0; i < imageObject.width; i++) {
            for (let j = 20; j >= 0 ; j--) {
                const firstByteOfPixel = (j * imageObject.width + i) * 4
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

        if(this.socket){
            this.socket.emit("matrix-frame", rotatedRGBdata)
        } else {
            console.log("No socket Connected")
        }
    }

    frame = async () => {
        if(this.stage){
            // const start = Date.now()

            const loadingPromise = new Promise((resolve) => this.stage.toImage({pixelRatio : 0.1 / this.factor, callback: resolve}))
            const image = await loadingPromise
            await this.sendFrame(image)

            // const end = Date.now()
            // this.points.push(end - start)
            // console.log(`${end - start} => ${this.getAvg(this.points)} ms. (${this.points.length})`)
        }
    }

    factor = 3

    points = []
    getAvg(grades) {
        const total = grades.reduce((acc, c) => acc + c, 0);
        return total / grades.length;
    }

    dataURItoBlob(dataURI) {
        var mime = dataURI.split(',')[0].split(':')[1].split(';')[0];
        var binary = atob(dataURI.split(',')[1]);
        var array = [];
        for (var i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        return new Blob([new Uint8Array(array)], {type: mime});
    }

    refreshInterval = null

    toggleRefresh = () => {
        const refresh = !this.state.refresh
        this.setState({refresh: !this.state.refresh})

        if(refresh){
            this.refreshInterval = setInterval(this.frame, (1000 / 60) * 1)
        } else {
            if(this.refreshInterval){
                clearInterval(this.refreshInterval)
                this.refreshInterval = null
                this.points = []
            }
        }

    }

    handleDragStart = e => {
        e.target.setAttrs({
            shadowOffset: {
                x: 15,
                y: 15
            },
            scaleX: 1,
            scaleY: 1
        });
    };
    handleDragEnd = e => {
        e.target.to({
            duration: 0.5,
            easing: Konva.Easings.ElasticEaseOut,
            scaleX: 1,
            scaleY: 1,
            shadowOffsetX: 5,
            shadowOffsetY: 5
        });
    };

    isPaint = false
    lastLine = null
    mode = "brush"

    mouseDownHandler = (e) => {
        console.log(e.target.constructor.name )
        if(e.target.constructor.name === 'Stage'){
            this.isPaint = true;
        } else
            return
        var pos = this.stage.getPointerPosition();
        this.lastLine = new Konva.Line({
            stroke: 'green',
            strokeWidth: 30,
            lineJoin: "round",
            lineCap: 'round',
            globalCompositeOperation:
                this.mode === 'brush' ? 'source-over' : 'destination-out',
            points: [pos.x, pos.y]
        });

        this.layer.add(this.lastLine);
        this.layer.batchDraw();
    }

    mouseUpHandler = (e) => {
        console.log("Mouse up")
        this.isPaint = false;
    }
    mouseMoveHandler = (e) => {
        if (!this.isPaint) {
            return;
        }

        console.log("Mouse move")

        const pos = this.stage.getPointerPosition();
        var newPoints = this.lastLine.points().concat([pos.x, pos.y]);
        this.lastLine.points(newPoints);
        this.layer.batchDraw();
    }

    clean = () => {
        this.layer.destroyChildren()
        this.layer.batchDraw();
    }

    render() {
        return (
            <div >
                <div className={"container-fluid"}>
                    <div className={"row"}>
                        <div className={'col heading text-center mt-5 mb-5'}>
                            <h1 className={"display-4"}>NOTRE LAMPE</h1>
                        </div>
                    </div>
                </div>
                <div className={'root-container'}>
                    <div className={"strategies-container"}>
                        {/*<Strategies strategies={this.state.strategies} playHandler={this.playHandler}/>*/}
                        {/*<div>*/}
                        {/*    <ImageUploader*/}
                        {/*        withIcon={false}*/}
                        {/*        withLabel={false}*/}
                        {/*        buttonText='Ajouter une image'*/}
                        {/*        onChange={this.onDrop}*/}
                        {/*        imgExtension={['.jpg', '.gif', '.png', '.gif']}*/}
                        {/*        maxFileSize={5242880}*/}
                        {/*        withPreview={true}*/}
                        {/*        singleImage={true}*/}
                        {/*    />*/}
                        {/*</div>*/}
                    </div>
                    <div className={'screen-container'}>
                        <Button color={this.state.refresh ? 'danger' : 'success'} onClick={this.toggleRefresh} className={'w-100 mb-3'}>
                            {this.state.refresh ? 'OFF' : 'ON'}
                        </Button>

                        <Button color={'warning'} onClick={this.clean} className={'w-100 mb-3'}>
                            Clear
                        </Button>
                        <div>
                            <Stage height={210 * this.factor} width={80 * this.factor} className={'konva'} ref={(ref)=> this.stage = ref}
                                   onMouseDown={this.mouseDownHandler}
                                   onMouseUp={this.mouseUpHandler}
                                   onMouseMove={this.mouseMoveHandler}

                            >
                                <Layer ref={(ref)=> this.layer = ref}>
                                    <Circle x={50} y={20} radius={20 * this.factor} fill="#8524c3" onClick={this.moveTo}
                                            draggable
                                    />
                                    {/*{this.renderLines()}*/}
                                </Layer>
                            </Stage>
                        </div>

                        <canvas id={'canvas'} />
                        {<ScreenFetcher socket={this.socket}/>}

                        <img src={this.state.dataUrl} alt={'Backend version of the screen'} className={'debug-screen-img'}/>


                        {/*<LocalScreenFetcher data={this.state.data}/>*/}
                    </div>
                </div>
            </div>)
    }

    renderLines(){
        const arr = []
        const colors = ['red', 'blue','green','magenta','yellow','pink','darkgrey', 'cyan']
        for(let i = 0; i < 8 ; i++ ) {
            arr.push(<Rect x={10 * i * this.factor} y={0} width={10 * this.factor} height={(210/8 + 210/8* i) * this.factor} draggable fill={colors[i]}/>)
        }
        return arr
    }
}
