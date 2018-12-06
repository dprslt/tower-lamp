import '@babel/polyfill'
import cors from 'cors'
import http from 'http'
import ioServer from 'socket.io'
import express from 'express'
import {Screen} from "./screen/Screen"
import {
    RandomizeStrategy,
    BlueRandomizeStrategy,
    RedRandomizeStrategy,
    GreenRandomizeStrategy
} from "./strategies/RandomizeStrategy"
import WebSocket from "ws"
import {getRandomInt} from "./Utils";
import {CircleStrategy} from "./strategies/CircleStrategy";
import StrategyFactory from "./StrategyFactory";

const app = express()
app.use(cors())
const server = http.createServer(app)
const io = ioServer(server,{
    transports: ['websocket']
})


io.on('connection', () => { console.log("Socket Connected")})
server.listen(3107)

const fadeCandySocket = new WebSocket("ws://localhost:7890")

const screen = new Screen(8,21, io, fadeCandySocket)

const factory = new StrategyFactory(screen)

io.on('connection', (socket) => {
    socket.on('get-strategies', function (data) {
        socket.emit('strategies', factory.getTemplates())
    })

    socket.on('select-strategy', function (data) {

    })
})


var animation = null

//animation = new RandomizeStrategy(screen, ()=> getRandomInt(255),()=> getRandomInt(255),()=> getRandomInt(255), 500, 0.8, 20)
animation = new CircleStrategy(screen, 255,16,45,800 )
//animation = RedRandomizeStrategy(screen, 500, 0.8, 20)
//animation = BlueRandomizeStrategy(screen, 200, 0.8, 20)
//animation = GreenRandomizeStrategy(screen, 200, 0.8, 10)
animation.start()

