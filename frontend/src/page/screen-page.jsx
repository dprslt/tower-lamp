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
            data: null
        }

        this.socket = null
    }

    componentDidMount(){
        this.socket = io("localhost:3107",{
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
        let base64Image = await this.convertToBase64(lampPict);
        this.setState({picture: base64Image})

        // Load the blob in an image Object
        const imageObject = new Image()
        const loadingPromise = new Promise((resolve) => imageObject.onload = resolve)
        imageObject.src = base64Image
        await loadingPromise

        // Write the image onto a canvas
        const canvas = document.createElement('canvas')
        canvas.width = imageObject.width;
        canvas.height = imageObject.height;
        console.log([imageObject.width, imageObject.height])

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
                    <Strategies strategies={this.state.strategies} playHandler={this.playHandler}/>
                    <div>
                        <ImageUploader
                            withIcon={false}
                            withLabel={false}
                            buttonText='Ajouter une image'
                            onChange={this.onDrop}
                            imgExtension={['.jpg', '.gif', '.png', '.gif']}
                            maxFileSize={5242880}
                            withPreview={true}
                            singleImage={true}
                        />
                    </div>
                </div>
                <div className={'screen-container'}>
                    <ScreenFetcher socket={this.socket}/>
                    {/*<LocalScreenFetcher data={this.state.data}/>*/}
                </div>
            </div>
        </div>)
    }
}
