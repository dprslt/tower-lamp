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

const app = express()
app.use(cors())
const server = http.createServer(app)
const io = ioServer(server,{
    transports: ['websocket']
})


io.on('connection', () => { console.log("Socket Connected")})
server.listen(3107)

const fadeCandySocket = new WebSocket("ws://192.168.1.12:7890")

var screen = new Screen(8,21, io, fadeCandySocket)
var animation = null

//animation = new RandomizeStrategy(screen, ()=> getRandomInt(255),()=> getRandomInt(255),()=> getRandomInt(255), 500, 0.8, 20)
animation = new CircleStrategy(screen, 255,16,45,500 )
//animation = RedRandomizeStrategy(screen, 500, 0.8, 20)
//animation = BlueRandomizeStrategy(screen, 200, 0.8, 20)
//animation = GreenRandomizeStrategy(screen, 200, 0.8, 10)
animation.start()

