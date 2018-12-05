import 'babel-polyfill'
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
import {getRandomInt} from "./Utils"

const app = express()
app.use(cors())
const server = http.createServer(app)
const io = ioServer(server,{
    transports: ['websocket']
})


io.on('connection', () => { console.log("Socket Connected")})
server.listen(3107)

var screen = new Screen(21,8, io)
//var animation = new RandomizeStrategy(screen, 255, ()=> getRandomInt(255), 15, 50)
//var animation = BlueRandomizeStrategy(screen, 200, 0.8, 5)
var animation = GreenRandomizeStrategy(screen, 200, 0.8, 5)
animation.start()


