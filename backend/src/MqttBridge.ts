import fs from 'node:fs'
import mqtt, {IClientOptions, MqttClient, MqttProtocol} from 'mqtt'
import {RGB} from './screen/Rasterizer'


export interface MqttLightState {
    state: 'ON' | 'OFF'
    color: {r: number, g: number, b: number}
    brightness: number
}

export interface MqttLightCommand {
    state: 'ON' | 'OFF'
    color?: {r: number, g: number, b: number}
    brightness?: number
}

export interface MqttActionConfig {
    strategy: string
    params?: any
}

export interface MqttBridgeConfig {
    host: string
    port?: number
    username?: string
    password?: string
    baseTopic: string
    discoveryPrefix: string
    actions: Record<string, MqttActionConfig>
}

export interface MqttBridgeHandlers {
    onCommand(command: MqttLightCommand): void
    onAction(actionId: string): void
}


export function lightCommandTopic(baseTopic: string): string {
    return `${baseTopic}/set`
}

export function lightStateTopic(baseTopic: string): string {
    return `${baseTopic}/state`
}

export function lightAvailabilityTopic(baseTopic: string): string {
    return `${baseTopic}/availability`
}

export function lightDiscoveryTopic(discoveryPrefix: string): string {
    return `${discoveryPrefix}/light/tower_lamp/config`
}

export function actionDiscoveryTopic(discoveryPrefix: string, actionId: string): string {
    return `${discoveryPrefix}/button/tower_lamp/${actionId}/config`
}

export function actionCommandTopic(baseTopic: string, actionId: string): string {
    return `${baseTopic}/action/${actionId}/set`
}

export function buildLightDiscovery(config: MqttBridgeConfig): Record<string, any> {
    return {
        name: 'tower_lamp',
        unique_id: 'tower_lamp_light',
        schema: 'json',
        brightness: true,
        color_mode: true,
        supported_color_modes: ['rgb'],
        state_topic: lightStateTopic(config.baseTopic),
        command_topic: lightCommandTopic(config.baseTopic),
        availability_topic: lightAvailabilityTopic(config.baseTopic),
        payload_available: 'online',
        payload_not_available: 'offline',
        device: {
            identifiers: ['tower_lamp'],
            name: 'tower_lamp',
        },
    }
}

export function buildActionDiscovery(actionId: string, config: MqttBridgeConfig): Record<string, any> {
    return {
        name: actionId,
        unique_id: `tower_lamp_action_${actionId}`,
        command_topic: actionCommandTopic(config.baseTopic, actionId),
        payload_press: 'press',
        availability_topic: lightAvailabilityTopic(config.baseTopic),
        payload_available: 'online',
        payload_not_available: 'offline',
        device: {
            identifiers: ['tower_lamp'],
            name: 'tower_lamp',
        },
    }
}

export function resolveMqttOptions(config: MqttBridgeConfig): IClientOptions {
    let protocol: MqttProtocol = 'mqtt'
    let hostPort = config.host
    const schemeMatch = /^(mqtts?):\/\/(.+)$/i.exec(config.host)
    if (schemeMatch) {
        protocol = schemeMatch[1].toLowerCase() as MqttProtocol
        hostPort = schemeMatch[2]
    }
    let host = hostPort
    let port = config.port
    const hostPortMatch = /^([^:]+):(\d+)$/.exec(hostPort)
    if (hostPortMatch) {
        host = hostPortMatch[1]
        if (port === undefined) {
            port = Number(hostPortMatch[2])
        }
    }
    return {
        protocol,
        host,
        port: port ?? 1883,
        username: config.username,
        password: config.password,
        will: {
            topic: lightAvailabilityTopic(config.baseTopic),
            payload: 'offline',
            retain: true,
        },
        reconnectPeriod: 5000,
    }
}

export function parseLightCommand(raw: string): MqttLightCommand | null {
    let payload: any
    try {
        payload = JSON.parse(raw)
    } catch {
        return null
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return null
    }
    if (payload.state === 'OFF') {
        return {state: 'OFF'}
    }
    if (payload.state !== 'ON') {
        return null
    }
    const {r, g, b} = payload.color ?? {}
    if (![r, g, b].every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) {
        return null
    }
    const brightness = payload.brightness
    if (brightness !== undefined && !(Number.isInteger(brightness) && brightness >= 0 && brightness <= 255)) {
        return null
    }
    return {state: 'ON', color: {r, g, b}, brightness: brightness ?? 255}
}

export function colorFillFromCommand(command: MqttLightCommand): RGB | null {
    if (command.state !== 'ON' || !command.color) {
        return null
    }
    const scale = (command.brightness ?? 255) / 255
    return [
        Math.round(command.color.r * scale),
        Math.round(command.color.g * scale),
        Math.round(command.color.b * scale),
    ]
}

export function parseActions(raw: string | undefined): Record<string, MqttActionConfig> {
    if (!raw) {
        return {}
    }
    const tryParse = (content: string): Record<string, MqttActionConfig> | null => {
        try {
            const value = JSON.parse(content)
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                return value as Record<string, MqttActionConfig>
            }
        } catch {
            // not inline JSON — maybe a file path
        }
        return null
    }
    const inline = tryParse(raw)
    if (inline) {
        return inline
    }
    try {
        const fromFile = tryParse(fs.readFileSync(raw, 'utf8'))
        if (fromFile) {
            return fromFile
        }
    } catch (error) {
        console.error(`Failed to load MQTT actions from "${raw}"`)
        console.error(error)
    }
    return {}
}

export function sunsetGradientParams(): Record<string, any> {
    return {
        fillLinearGradientStartPoint: {x: 8, y: 21},
        fillLinearGradientEndPoint: {x: 0, y: 0},
        fillLinearGradientColorStops: [0, 'red', 1, 'gold'],
    }
}

export const defaultMqttActions: Record<string, MqttActionConfig> = {
    sunset: {strategy: 'color', params: sunsetGradientParams()},
    fireworks: {strategy: 'fireworks', params: {}},
    rain: {strategy: 'rain', params: {}},
    'spinning-dot': {strategy: 'spinning-dot', params: {}},
    stop: {strategy: 'off', params: {}},
}

const DEFAULT_CONFIG_FILE = '/etc/lamp-backend/mqtt.conf'

export function loadMqttSettings(file: string): Record<string, string> {
    try {
        const settings: Record<string, string> = {}
        for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('#')) {
                continue
            }
            const separator = trimmed.indexOf('=')
            if (separator > 0) {
                settings[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim()
            }
        }
        return settings
    } catch {
        return {}
    }
}

export function mqttSetting(
    settings: Record<string, string>,
    name: string,
    defaultValue?: string
): string | undefined {
    for (const key of [name, `MQTT_${name}`]) {
        if (key in settings) {
            return settings[key]
        }
    }
    const envValue = process.env[`MQTT_${name}`]
    return envValue !== undefined ? envValue : defaultValue
}

export function loadMqttConfig(configFile?: string): MqttBridgeConfig | null {
    const file = configFile ?? process.env.MQTT_CONFIG_FILE ?? DEFAULT_CONFIG_FILE
    const settings = loadMqttSettings(file)
    const host = mqttSetting(settings, 'HOST')
    if (!host) {
        return null
    }
    const port = Number(mqttSetting(settings, 'PORT', '1883'))
    const actionsRaw = mqttSetting(settings, 'ACTIONS')
    return {
        host,
        ...(Number.isInteger(port) && port > 0 ? {port} : {}),
        username: mqttSetting(settings, 'USER') || undefined,
        password: mqttSetting(settings, 'PASS') || undefined,
        baseTopic: mqttSetting(settings, 'BASE_TOPIC', 'tower_lamp/light') || 'tower_lamp/light',
        discoveryPrefix: mqttSetting(settings, 'DISCOVERY_PREFIX', 'homeassistant') || 'homeassistant',
        actions: actionsRaw !== undefined ? parseActions(actionsRaw) : defaultMqttActions,
    }
}


export default class MqttBridge {

    private readonly config: MqttBridgeConfig
    private readonly handlers: MqttBridgeHandlers
    private client: MqttClient | null = null
    private lastPublishedState: MqttLightState | null = null

    constructor(config: MqttBridgeConfig, handlers: MqttBridgeHandlers) {
        this.config = config
        this.handlers = handlers
    }

    start(): void {
        if (this.client) {
            return
        }
        const client = mqtt.connect(resolveMqttOptions(this.config))
        this.client = client
        client.on('connect', () => this.handleConnect())
        client.on('message', (topic, payload) => this.handleMessage(topic, payload))
        client.on('close', () => this.handleDisconnect())
        client.on('offline', () => this.handleDisconnect())
        client.on('error', (error) => {
            console.error('MQTT error: ' + error.message)
        })
    }

    stop(): void {
        if (!this.client) {
            return
        }
        this.publishAvailability('offline')
        this.client.end(true)
        this.client = null
    }

    publishState(state: MqttLightState): void {
        this.lastPublishedState = state
        if (!this.client || !this.client.connected) {
            return
        }
        const payload: Record<string, any> = {
            state: state.state,
            color: {r: state.color.r, g: state.color.g, b: state.color.b},
            brightness: state.brightness,
        }
        if (state.state === 'ON') {
            payload.color_mode = 'rgb'
        }
        this.client.publish(lightStateTopic(this.config.baseTopic), JSON.stringify(payload), {retain: true})
    }

    private handleConnect(): void {
        console.log('Connected to the MQTT broker')
        const client = this.client
        if (!client) {
            return
        }
        const topics = [lightCommandTopic(this.config.baseTopic)]
        for (const actionId of Object.keys(this.config.actions)) {
            topics.push(actionCommandTopic(this.config.baseTopic, actionId))
        }
        client.subscribe(topics, (error) => {
            if (error) {
                console.error('MQTT subscribe error: ' + error.message)
            }
        })
        this.publishAvailability('online')
        this.publishDiscovery()
        if (this.lastPublishedState) {
            this.publishState(this.lastPublishedState)
        }
    }

    private publishDiscovery(): void {
        const client = this.client
        if (!client) {
            return
        }
        client.publish(
            lightDiscoveryTopic(this.config.discoveryPrefix),
            JSON.stringify(buildLightDiscovery(this.config)),
            {retain: true}
        )
        for (const actionId of Object.keys(this.config.actions)) {
            client.publish(
                actionDiscoveryTopic(this.config.discoveryPrefix, actionId),
                JSON.stringify(buildActionDiscovery(actionId, this.config)),
                {retain: true}
            )
        }
    }

    private publishAvailability(availability: 'online' | 'offline'): void {
        if (!this.client || !this.client.connected) {
            return
        }
        this.client.publish(lightAvailabilityTopic(this.config.baseTopic), availability, {retain: true})
    }

    private handleDisconnect(): void {
        this.publishAvailability('offline')
    }

    private handleMessage(topic: string, payload: Buffer): void {
        if (topic === lightCommandTopic(this.config.baseTopic)) {
            const command = parseLightCommand(payload.toString())
            if (command) {
                this.handlers.onCommand(command)
            } else {
                console.error('Ignoring invalid MQTT light command: ' + payload.toString())
            }
            return
        }
        for (const actionId of Object.keys(this.config.actions)) {
            if (topic === actionCommandTopic(this.config.baseTopic, actionId)) {
                if (payload.toString() === 'press') {
                    this.handlers.onAction(actionId)
                }
                return
            }
        }
    }
}