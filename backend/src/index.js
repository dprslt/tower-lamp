import '@babel/polyfill'
import cors from 'cors'
import http from 'http'
import ioServer from 'socket.io'
import express from 'express'
import Konva from 'konva-node'

import {CanvaScreen} from "./screen/CanvaScreen";
import Canvas from "canvas";
import FadeCandyConnection from "./FadeCandyConnection";
import ColorStrategy from "./canvasStrategies/ColorStrategy";
import CanvasStrategyFactory from "./CanvasStrategyFactory";


console.log("Server starting")

const app = express()
app.use(cors())
const server = http.createServer(app)
const io = ioServer(server, {
    transports: ['websocket']
})


io.on('connection', () => {
    console.log("Web Client Socket Connected")
})
server.listen(30008)

const fadeCandyConnection = new FadeCandyConnection("ws://192.168.1.71:7890")

fadeCandyConnection.connect()
let fadeCandySocket = fadeCandyConnection.socket

const screen = new CanvaScreen(8, 21, io, fadeCandySocket, 20)

const factory = new CanvasStrategyFactory(screen)

var animation = null

io.on('connection', (socket) => {
    socket.on('get-strategies', function (data) {
        socket.emit('strategies', factory.getTemplates())
    })

    socket.on('select-strategy', function (data) {
        try {
            if (animation) {
                animation.unmount()
            }

            console.log("Launching new strategy : " + data.name + ", parameters : " + (data.params))
            animation = factory.getStrategyFromTemplate(data.name, data.params)
            animation.mount()
        } catch (e) {
            console.error("Error while applying the new strategy.")
            console.error(e)
        }
    })

    //region legacy

    // socket.on('image-strategy', function (data) {
    //     try {
    //         screen.erase()
    //         if (animation) {
    //             animation.stop()
    //         }
    //
    //         console.log("Launching new Image strategy : " + data.name + ", parameters : " + (data.params))
    //         animation = new ImageStrategy(screen, data.image, data.params)
    //         animation.start()
    //     } catch (e) {
    //         console.error("Error while applying the new strategy.")
    //         console.error(e)
    //     }
    // })
    //
    // socket.on('frame', function (data) {
    //     screen.erase()
    //     if (animation) {
    //         animation.stop()
    //     }
    //
    //     screen.displayRowFrame(data)
    // })
    //
    // socket.on('matrix-frame', function (data) {
    //     screen.erase()
    //     if (animation) {
    //         animation.stop()
    //     }
    //
    //     screen.injectFlatData(data)
    //     screen.refresh()
    // })

    //endregion legacy
})


//animation = new ColorStrategy(screen, {fill: 'blue'})
animation = new ColorStrategy(screen, {
    fillLinearGradientStartPoint: { x: screen.getCanvasSize().width, y: screen.getCanvasSize().height },
    fillLinearGradientEndPoint: { x: 0, y: 0 },
    fillLinearGradientColorStops: [0, 'red', 1, 'gold'],
})
animation.mount()

screen.start()

//animation = new RandomizeStrategy(screen, ()=> getRandomInt(255),()=> getRandomInt(255),()=> getRandomInt(255), 500, 0.8, 20)
//animation = new CircleStrategy(screen, 255,75,10, 40 )
//animation = RedRandomizeStrategy(screen, 500, 0.8, 20)
//animation = BlueRandomizeStrategy(screen, 200, 0.8, 20)
//animation = GreenRandomizeStrategy(screen, 200, 0.8, 10)
//animation.start()


