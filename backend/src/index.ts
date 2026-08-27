import '@babel/polyfill'
import cors from 'cors'
import http from 'http'
import ioServer from 'socket.io'
import express from 'express'

import {CanvasScreen} from "./screen/CanvasScreen";
import FadeCandyConnection from "./FadeCandyConnection";
import ColorStrategy from "./canvasStrategies/ColorStrategy";
import CanvasStrategyFactory from "./CanvasStrategyFactory";
import AbstractStrategy from "./canvasStrategies/AbstractStrategy";


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


const fadeCandyConnection = new FadeCandyConnection(process.env.FADE_CANDY_URL || "ws://lamp.local:7890")
fadeCandyConnection.connect()
let fadeCandySocket = fadeCandyConnection.socket

const screen = new CanvasScreen(8, 21, io, fadeCandySocket, 20)
const factory = new CanvasStrategyFactory(screen)

let animation : AbstractStrategy | null = null

io.on('connection', (socket) => {
    socket.on('get-strategies', function (data) {
        socket.emit('strategies', factory.getTemplates())
    })

    socket.on('select-strategy', function (data) {
        try {
            if (animation) {
                animation.unmount()
            }

            console.log("Launching new strategy : " + data.name)
            animation = factory.getStrategyFromTemplate(data.name, data.params)
            if(animation){
                animation.mount()
            } else {
                console.error("Not strategy found for name "+ data.name)
            }
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


// Running the default animation
animation = new ColorStrategy(screen, {
    fillLinearGradientStartPoint: { x: screen.getCanvasSize().width, y: screen.getCanvasSize().height },
    fillLinearGradientEndPoint: { x: 0, y: 0 },
    fillLinearGradientColorStops: [0, 'red', 1, 'gold'],
})
animation.mount()

screen.start()


