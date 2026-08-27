//REACT
import {Component} from "react"

// APP
import ScreenFetcher from '../components/screen/screen-fetcher'
import io from 'socket.io-client'
import './screen-page.scss'
import {Circle, Layer, Stage, Rect} from "react-konva"
import Konva from 'konva'
import {Box, Button, Heading, VStack} from "@chakra-ui/react"
import BACKEND_WS_URL from "../backend-url"


export default class ScreenPage extends Component {
    constructor (props, context) {
        super(props, context)

        this.playHandler = this.playHandler.bind(this)

        this.state = {
            strategies: [],
            data: null,
            refresh: false,
            dataUrl: ''
        }

        this.socket = null

    }

    componentDidMount(){
        this.socket = io(BACKEND_WS_URL,{
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

    componentWillUnmount() {
        if (this.socket) {
            this.socket.close()
        }
    }

    playHandler(strategy){
        console.log(strategy)
        this.socket.emit("select-strategy", (strategy))
    }

    moveTo = (e) => {
        e.target.to({
            duration: 1,
            easing: Konva.Easings.EaseInOut,
            x: Math.random() * 80 * this.factor,
            y: Math.random() * 210 * this.factor,
        })

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

    mouseUpHandler = () => {
        console.log("Mouse up")
        this.isPaint = false;
    }
    mouseMoveHandler = () => {
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
            <Box minH="100vh" bg="bg" px={4} textAlign="center">
                <Heading as="h1" size="2xl" fontFamily="heading" my={10}>LAMPE</Heading>
                <Box className={'screen-container'} width="fit-content" margin="25px auto">
                    <VStack gap={3} mb={3}>
                        <Button colorScheme={this.state.refresh ? 'red' : 'green'} onClick={this.toggleRefresh} w="100%">
                            {this.state.refresh ? 'OFF' : 'ON'}
                        </Button>

                        <Button colorScheme={'orange'} onClick={this.clean} w="100%">
                            Clear
                        </Button>
                    </VStack>
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

                    <Box as="img" src={this.state.dataUrl} alt={'Backend version of the screen'} mt={4}
                         border="1px solid" borderColor="edge"/>
                </Box>
            </Box>)
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