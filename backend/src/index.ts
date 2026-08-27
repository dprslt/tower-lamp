import cors from 'cors'
import http from 'http'
import {Server} from 'socket.io'
import express from 'express'

import {CanvasScreen} from "./screen/CanvasScreen";
import FadeCandyConnection from "./FadeCandyConnection";
import ColorStrategy from "./canvasStrategies/ColorStrategy";
import CanvasStrategyFactory from "./CanvasStrategyFactory";
import AbstractStrategy from "./canvasStrategies/AbstractStrategy";
import MqttBridge, {
    colorFillFromCommand,
    loadMqttConfig,
    MqttLightCommand,
} from "./MqttBridge";
import {parseColor, RGB} from "./screen/Rasterizer";


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

function solidFillFromParams(params: any): RGB | null {
    if (typeof params?.fill === 'string') {
        return parseColor(params.fill)
    }
    if (Array.isArray(params?.fill)) {
        return params.fill as RGB
    }
    return null
}

function mirrorStrategyToMqtt(name: string, params: any): void {
    if (!mqttBridge) {
        return
    }
    if (name === 'off') {
        mqttBridge.publishState({state: 'OFF', color: {r: 0, g: 0, b: 0}, brightness: 0})
        return
    }
    if (name === 'color') {
        const rgb = solidFillFromParams(params)
        if (rgb) {
            mqttBridge.publishState({state: 'ON', color: {r: rgb[0], g: rgb[1], b: rgb[2]}, brightness: 255})
        }
    }
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
    if (!mqttBridge) {
        return
    }
    if (command.state === 'OFF') {
        selectStrategy('off', {}, false)
        mqttBridge.publishState({state: 'OFF', color: {r: 0, g: 0, b: 0}, brightness: 0})
        return
    }
    const fill = colorFillFromCommand(command)
    if (!fill) {
        return
    }
    selectStrategy('color', {fill}, false)
    mqttBridge.publishState({
        state: 'ON',
        color: command.color ?? {r: 255, g: 255, b: 255},
        brightness: command.brightness ?? 255,
    })
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
const defaultParams = {
    fillLinearGradientStartPoint: { x: screen.getCanvasSize().width, y: screen.getCanvasSize().height },
    fillLinearGradientEndPoint: { x: 0, y: 0 },
    fillLinearGradientColorStops: [0, 'red', 1, 'gold'],
}
animation = new ColorStrategy(screen, defaultParams)
animation.mount()
currentStrategy = { name: 'color', params: defaultParams }

screen.start()