import cors from 'cors'
import http from 'http'
import {Server} from 'socket.io'
import express from 'express'

import {CanvasScreen} from "./screen/CanvasScreen";
import FadeCandyConnection from "./FadeCandyConnection";
import CanvasStrategyFactory from "./CanvasStrategyFactory";
import AbstractStrategy from "./canvasStrategies/AbstractStrategy";
import MqttBridge, {
    colorFillFromCommand,
    loadMqttConfig,
    MqttLightCommand,
    sunsetGradientParams,
} from "./MqttBridge";
import {strategyLightState} from "./StrategyLightState";


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
server.listen(Number(process.env.PORT) || 30008)


const fadeCandyConnection = new FadeCandyConnection(process.env.FADE_CANDY_URL || "ws://lamp.local:7890")
fadeCandyConnection.connect()

const screen = new CanvasScreen(8, 21, io, fadeCandyConnection, 20)
const factory = new CanvasStrategyFactory(screen)

let animation : AbstractStrategy | null = null
let currentStrategy : { name: string, params: any } | null = null

function mirrorStrategyToMqtt(name: string, params: any): void {
    if (!mqttBridge) {
        return
    }
    mqttBridge.publishState(strategyLightState(name, params))
}

function selectStrategy(name: string, params: any, mirrorToMqtt: boolean = true): boolean {
    try {
        if (animation) {
            animation.unmount()
        }

        console.log("Launching new strategy : " + name)
        const next = factory.getStrategyFromTemplate(name, params)
        if (!next) {
            console.error("Not strategy found for name "+ name)
            return false
        }

        animation = next
        animation.mount()
        currentStrategy = { name, params }
        io.emit('strategy-selected', currentStrategy)
        if (mirrorToMqtt) {
            mirrorStrategyToMqtt(name, params)
        }
        return true
    } catch (e) {
        console.error("Error while applying the new strategy.")
        console.error(e)
        return false
    }
}

screen.setOnRefresh(() => {
    if (animation && animation.isDone()) {
        console.log("Strategy finished (" + (currentStrategy?.name ?? 'unknown') + ") — returning to stop")
        selectStrategy('off', {})
    }
})

function handleMqttCommand(command: MqttLightCommand): void {
    if (command.state === 'OFF') {
        selectStrategy('off', {})
        return
    }
    const fill = colorFillFromCommand(command)
    if (!fill) {
        return
    }
    selectStrategy('color', {fill})
}

const mqttConfig = loadMqttConfig()
const mqttBridge = mqttConfig ? new MqttBridge(mqttConfig, {
    onCommand: (command) => handleMqttCommand(command),
    onAction: (actionId) => {
        const action = mqttConfig.actions[actionId]
        if (action) {
            selectStrategy(action.strategy, action.params)
        }
    },
}) : null
if (mqttBridge) {
    mqttBridge.start()
}

process.on('SIGTERM', () => {
    if (mqttBridge) {
        mqttBridge.stop()
    }
    process.exit(0)
})
process.on('SIGINT', () => {
    if (mqttBridge) {
        mqttBridge.stop()
    }
    process.exit(0)
})

io.on('connection', (socket) => {
    if (currentStrategy) {
        socket.emit('strategy-selected', currentStrategy)
    }

    socket.on('get-strategies', function () {
        socket.emit('strategies', factory.getTemplates())
    })

    socket.on('select-strategy', function (data) {
        selectStrategy(data.name, data.params)
    })

    socket.on('matrix-frame', function (data) {
        try {
            if (animation) {
                animation.unmount()
            }

            currentStrategy = null
            io.emit('strategy-selected', currentStrategy)

            screen.erase()
            screen.injectFlatData(data)
            screen.refresh()
        } catch (e) {
            console.error("Error while applying the new matrix frame.")
            console.error(e)
        }
    })
})


// Running the default animation
selectStrategy('color', sunsetGradientParams())

screen.start()