import cors from 'cors'
import http from 'http'
import {Server} from 'socket.io'
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
const io = new Server(server, {
    transports: ['websocket'],
    cors: {
        origin: '*'
    }
})


io.on('connection', () => {
    console.log("Web Client Socket Connected")
})
server.listen(30008)


const fadeCandyConnection = new FadeCandyConnection(process.env.FADE_CANDY_URL || "ws://lamp.local:7890")
fadeCandyConnection.connect()

const screen = new CanvasScreen(8, 21, io, fadeCandyConnection, 20)
const factory = new CanvasStrategyFactory(screen)

let animation : AbstractStrategy | null = null

io.on('connection', (socket) => {
    socket.on('get-strategies', function () {
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
})


// Running the default animation
animation = new ColorStrategy(screen, {
    fillLinearGradientStartPoint: { x: screen.getCanvasSize().width, y: screen.getCanvasSize().height },
    fillLinearGradientEndPoint: { x: 0, y: 0 },
    fillLinearGradientColorStops: [0, 'red', 1, 'gold'],
})
animation.mount()

screen.start()