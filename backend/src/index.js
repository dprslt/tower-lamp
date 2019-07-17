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
import {ImageStrategy} from "./strategies/ImageStrategy";

const app = express()
app.use(cors())
const server = http.createServer(app)
const io = ioServer(server,{
    transports: ['websocket']
})


io.on('connection', () => { console.log("Web Client Socket Connected")})
server.listen(3107)

let fadeCandySocket = new WebSocket("ws://192.168.1.34:7890")
fadeCandySocket.onerror=function(event){
    console.error("Unable to connect with the Fadecandy")
}

const screen = new Screen(8,21, io, fadeCandySocket)

const factory = new StrategyFactory(screen)

var animation = null

io.on('connection', (socket) => {
    socket.on('get-strategies', function (data) {
        socket.emit('strategies', factory.getTemplates())
    })

    socket.on('select-strategy', function (data) {
        try{
            screen.erase()
            if(animation){
                animation.stop()
            }

            let parameters = []
            if(data.params && Array.isArray(data.params)){
                parameters = factory.buildParametersArray(data.params)
            }
            console.log("Launching new strategy : "+data.name+", parameters : "+(parameters))
            animation = factory.getStrategyFromTemplate(data.name, ...parameters)
            animation.start()
        } catch (e) {
            console.error("Error while applying the new strategy.")
            console.error(e)
        }
    })

    socket.on('image-strategy', function (data)  {
        try{
            screen.erase()
            if(animation){
                animation.stop()
            }

            console.log("Launching new Image strategy : "+data.name+", parameters : "+(data.params))
            animation = new ImageStrategy(screen, data.image, data.params)
            animation.start()
        } catch (e) {
            console.error("Error while applying the new strategy.")
            console.error(e)
        }
    })

    socket.on('frame', function (data) {
        screen.erase()
        if(animation){
            animation.stop()
        }

        screen.displayRowFrame(data)
    })
})




//animation = new RandomizeStrategy(screen, ()=> getRandomInt(255),()=> getRandomInt(255),()=> getRandomInt(255), 500, 0.8, 20)
animation = new CircleStrategy(screen, 255,75,10,70 )
//animation = RedRandomizeStrategy(screen, 500, 0.8, 20)
//animation = BlueRandomizeStrategy(screen, 200, 0.8, 20)
//animation = GreenRandomizeStrategy(screen, 200, 0.8, 10)
animation.start()

