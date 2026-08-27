import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
    actionCommandTopic,
    actionDiscoveryTopic,
    buildActionDiscovery,
    buildLightDiscovery,
    colorFillFromCommand,
    lightAvailabilityTopic,
    lightCommandTopic,
    lightDiscoveryTopic,
    lightStateTopic,
    loadMqttConfig,
    loadMqttSettings,
    mqttSetting,
    parseActions,
    parseLightCommand,
    resolveMqttOptions,
} from '../MqttBridge'
import CanvasStrategyFactory from '../CanvasStrategyFactory'

const baseConfig = {
    host: 'broker.local',
    baseTopic: 'tower_lamp/light',
    discoveryPrefix: 'homeassistant',
    actions: {},
}

test('topic helpers follow the issue layout', () => {
    assert.equal(lightCommandTopic('tower_lamp/light'), 'tower_lamp/light/set')
    assert.equal(lightStateTopic('tower_lamp/light'), 'tower_lamp/light/state')
    assert.equal(lightAvailabilityTopic('tower_lamp/light'), 'tower_lamp/light/availability')
    assert.equal(actionCommandTopic('tower_lamp/light', 'sunset'), 'tower_lamp/light/action/sunset/set')
    assert.equal(lightDiscoveryTopic('homeassistant'), 'homeassistant/light/tower_lamp/config')
    assert.equal(actionDiscoveryTopic('homeassistant', 'sunset'), 'homeassistant/button/tower_lamp/sunset/config')
})

test('light discovery payload exposes a json-schema rgb light', () => {
    const discovery = buildLightDiscovery(baseConfig)
    assert.equal(discovery.name, 'tower_lamp')
    assert.equal(discovery.unique_id, 'tower_lamp_light')
    assert.equal(discovery.schema, 'json')
    assert.equal(discovery.brightness, true)
    assert.equal(discovery.color_mode, true)
    assert.deepEqual(discovery.supported_color_modes, ['rgb'])
    assert.equal(discovery.state_topic, 'tower_lamp/light/state')
    assert.equal(discovery.command_topic, 'tower_lamp/light/set')
    assert.equal(discovery.availability_topic, 'tower_lamp/light/availability')
    assert.equal(discovery.payload_available, 'online')
    assert.equal(discovery.payload_not_available, 'offline')
    assert.deepEqual(discovery.device.identifiers, ['tower_lamp'])
})

test('action discovery payload exposes a button per action', () => {
    const discovery = buildActionDiscovery('sunset', baseConfig)
    assert.equal(discovery.unique_id, 'tower_lamp_action_sunset')
    assert.equal(discovery.command_topic, 'tower_lamp/light/action/sunset/set')
    assert.equal(discovery.payload_press, 'press')
    assert.equal(discovery.availability_topic, 'tower_lamp/light/availability')
    assert.deepEqual(discovery.device.identifiers, ['tower_lamp'])
})

test('parseLightCommand accepts ON with color and brightness', () => {
    assert.deepEqual(
        parseLightCommand('{"state":"ON","color":{"r":255,"g":128,"b":0},"brightness":100}'),
        {state: 'ON', color: {r: 255, g: 128, b: 0}, brightness: 100}
    )
})

test('parseLightCommand defaults brightness to 255 and ignores extra fields', () => {
    assert.deepEqual(
        parseLightCommand('{"state":"ON","color":{"r":1,"g":2,"b":3},"color_mode":"rgb","transition":5}'),
        {state: 'ON', color: {r: 1, g: 2, b: 3}, brightness: 255}
    )
})

test('parseLightCommand accepts OFF without color', () => {
    assert.deepEqual(parseLightCommand('{"state":"OFF"}'), {state: 'OFF'})
})

test('parseLightCommand rejects malformed payloads', () => {
    assert.equal(parseLightCommand('not json'), null)
    assert.equal(parseLightCommand('[]'), null)
    assert.equal(parseLightCommand('{"state":"DIM"}'), null)
    assert.equal(parseLightCommand('{"state":"ON"}'), null)
    assert.equal(parseLightCommand('{"state":"ON","color":{"r":1,"g":0}}'), null)
    assert.equal(parseLightCommand('{"state":"ON","color":{"r":300,"g":0,"b":0}}'), null)
    assert.equal(parseLightCommand('{"state":"ON","color":{"r":1,"g":2,"b":3.5}}'), null)
    assert.equal(parseLightCommand('{"state":"ON","color":{"r":1,"g":2,"b":3},"brightness":-1}'), null)
    assert.equal(parseLightCommand('{"state":"ON","color":{"r":1,"g":2,"b":3},"brightness":256}'), null)
})

test('colorFillFromCommand scales RGB by brightness', () => {
    assert.deepEqual(colorFillFromCommand({state: 'ON', color: {r: 255, g: 128, b: 0}, brightness: 128}), [128, 64, 0])
    assert.deepEqual(colorFillFromCommand({state: 'ON', color: {r: 255, g: 0, b: 0}}), [255, 0, 0])
    assert.deepEqual(colorFillFromCommand({state: 'ON', color: {r: 255, g: 255, b: 255}, brightness: 0}), [0, 0, 0])
    assert.equal(colorFillFromCommand({state: 'OFF'}), null)
})

test('parseActions parses an inline JSON registry', () => {
    const actions = parseActions(
        '{"sunset":{"strategy":"color","params":{"fill":"red"}},"logo":{"strategy":"image","params":{"data":"https://example.com/logo.png"}}}'
    )
    assert.deepEqual(Object.keys(actions), ['sunset', 'logo'])
    assert.equal(actions.sunset.strategy, 'color')
    assert.equal(actions.logo.strategy, 'image')
})

test('parseActions reads a JSON config file path', () => {
    const file = path.join(os.tmpdir(), `mqtt-actions-${process.pid}-${Date.now()}.json`)
    fs.writeFileSync(file, '{"sunset":{"strategy":"color","params":{"fill":"red"}}}')
    try {
        const actions = parseActions(file)
        assert.equal(actions.sunset.strategy, 'color')
    } finally {
        fs.unlinkSync(file)
    }
})

test('parseActions returns an empty registry for garbage', () => {
    assert.deepEqual(parseActions(undefined), {})
    assert.deepEqual(parseActions(''), {})
    assert.deepEqual(parseActions('not json at all'), {})
    assert.deepEqual(parseActions(path.join(os.tmpdir(), 'definitely-missing-actions.json')), {})
})

test('the default actions registry only references registered strategies', () => {
    const file = path.join(__dirname, '..', '..', '..', 'config', 'mqtt-actions.json')
    const actions = parseActions(fs.readFileSync(file, 'utf8'))
    assert.ok(Object.keys(actions).length > 0, 'registry should not be empty')
    const templates = Object.keys(new CanvasStrategyFactory({} as never).getTemplates())
    for (const [actionId, action] of Object.entries(actions)) {
        assert.ok(actionId.length > 0)
        assert.ok(
            templates.includes(action.strategy),
            `action "${actionId}" references unregistered strategy "${action.strategy}"`
        )
    }
})

test('resolveMqttOptions builds a will with the availability topic', () => {
    const options = resolveMqttOptions(baseConfig)
    assert.equal(options.protocol, 'mqtt')
    assert.equal(options.host, 'broker.local')
    assert.equal(options.port, 1883)
    assert.deepEqual(options.will, {topic: 'tower_lamp/light/availability', payload: 'offline', retain: true})
})

test('resolveMqttOptions honors scheme, port and credentials', () => {
    const options = resolveMqttOptions({
        ...baseConfig,
        host: 'mqtts://broker.local:8883',
        port: 8883,
        username: 'lamp',
        password: 'secret',
    })
    assert.equal(options.protocol, 'mqtts')
    assert.equal(options.host, 'broker.local')
    assert.equal(options.port, 8883)
    assert.equal(options.username, 'lamp')
    assert.equal(options.password, 'secret')
})

test('mqttConfigFromEnv returns null without MQTT_HOST', () => {
    delete process.env.MQTT_HOST
    assert.equal(loadMqttConfig(), null)
})

test('mqttConfigFromEnv applies defaults', () => {
    process.env.MQTT_HOST = 'broker.local'
    delete process.env.MQTT_PORT
    delete process.env.MQTT_USER
    delete process.env.MQTT_PASS
    delete process.env.MQTT_BASE_TOPIC
    delete process.env.MQTT_DISCOVERY_PREFIX
    delete process.env.MQTT_ACTIONS
    try {
        const config = loadMqttConfig()
        assert.ok(config)
        assert.equal(config?.host, 'broker.local')
        assert.equal(config?.port, 1883)
        assert.equal(config?.baseTopic, 'tower_lamp/light')
        assert.equal(config?.discoveryPrefix, 'homeassistant')
        assert.deepEqual(config?.actions, {})
    } finally {
        delete process.env.MQTT_HOST
    }
})

test('mqttConfigFromEnv honors explicit overrides', () => {
    process.env.MQTT_HOST = 'mqtts://broker.local'
    process.env.MQTT_PORT = '8883'
    process.env.MQTT_USER = 'lamp'
    process.env.MQTT_PASS = 'secret'
    process.env.MQTT_BASE_TOPIC = 'tower_lamp/light'
    process.env.MQTT_DISCOVERY_PREFIX = 'homeassistant'
    process.env.MQTT_ACTIONS = '{"sunset":{"strategy":"color","params":{"fill":"red"}}}'
    try {
        const config = loadMqttConfig()
        assert.equal(config?.port, 8883)
        assert.equal(config?.username, 'lamp')
        assert.equal(config?.password, 'secret')
        assert.equal(config?.baseTopic, 'tower_lamp/light')
        assert.equal(config?.discoveryPrefix, 'homeassistant')
        assert.ok(config?.actions.sunset)
    } finally {
        delete process.env.MQTT_HOST
        delete process.env.MQTT_PORT
        delete process.env.MQTT_USER
        delete process.env.MQTT_PASS
        delete process.env.MQTT_BASE_TOPIC
        delete process.env.MQTT_DISCOVERY_PREFIX
        delete process.env.MQTT_ACTIONS
    }
})

function tempMqttConf(content: string): string {
    const file = path.join(os.tmpdir(), `lamp-backend-mqtt-${process.pid}-${Date.now()}.conf`)
    fs.writeFileSync(file, content)
    return file
}

test('loadMqttSettings parses key=value lines, skipping comments and blanks', () => {
    const file = tempMqttConf(`
# lamp MQTT config
MQTT_HOST=broker.local

MQTT_PORT = 1884
MQTT_PASS=my secret
`)
    try {
        const settings = loadMqttSettings(file)
        assert.deepEqual(settings, {
            MQTT_HOST: 'broker.local',
            MQTT_PORT: '1884',
            MQTT_PASS: 'my secret',
        })
    } finally {
        fs.unlinkSync(file)
    }
})

test('loadMqttSettings returns an empty map for a missing file', () => {
    assert.deepEqual(loadMqttSettings(path.join(os.tmpdir(), 'no-such-mqtt.conf')), {})
})

test('mqttSetting prefers the config file over the environment, with or without prefix', () => {
    const file = tempMqttConf('HOST=file-host\nMQTT_PORT=1885\n')
    process.env.MQTT_HOST = 'env-host'
    process.env.MQTT_PORT = '1886'
    try {
        const settings = loadMqttSettings(file)
        assert.equal(mqttSetting(settings, 'HOST'), 'file-host')
        assert.equal(mqttSetting(settings, 'PORT'), '1885')
        assert.equal(mqttSetting(settings, 'USER'), undefined)
        assert.equal(mqttSetting(settings, 'USER', 'anon'), 'anon')
    } finally {
        delete process.env.MQTT_HOST
        delete process.env.MQTT_PORT
        fs.unlinkSync(file)
    }
})

test('mqttSetting falls back to the environment when the file is absent', () => {
    process.env.MQTT_HOST = 'env-host'
    try {
        assert.equal(mqttSetting({}, 'HOST'), 'env-host')
        assert.equal(mqttSetting({}, 'PORT', '1883'), '1883')
    } finally {
        delete process.env.MQTT_HOST
    }
})

test('loadMqttConfig reads the config file over the environment (aurora-style mqtt.conf)', () => {
    const file = tempMqttConf(`MQTT_HOST=mqtts://broker.local
MQTT_PORT=8883
MQTT_USER=lamp
MQTT_PASS=secret
MQTT_BASE_TOPIC=tower_lamp/light
MQTT_DISCOVERY_PREFIX=homeassistant
MQTT_ACTIONS={"sunset":{"strategy":"color","params":{"fill":"red"}}}
`)
    process.env.MQTT_HOST = 'env-host'
    process.env.MQTT_PORT = '1886'
    try {
        const config = loadMqttConfig(file)
        assert.ok(config)
        assert.equal(config?.host, 'mqtts://broker.local')
        assert.equal(config?.port, 8883)
        assert.equal(config?.username, 'lamp')
        assert.equal(config?.password, 'secret')
        assert.equal(config?.baseTopic, 'tower_lamp/light')
        assert.equal(config?.discoveryPrefix, 'homeassistant')
        assert.ok(config?.actions.sunset)
    } finally {
        delete process.env.MQTT_HOST
        delete process.env.MQTT_PORT
        fs.unlinkSync(file)
    }
})

test('loadMqttConfig returns null when neither the file nor the env has a host', () => {
    const file = tempMqttConf('# empty config\n')
    delete process.env.MQTT_HOST
    try {
        assert.equal(loadMqttConfig(file), null)
    } finally {
        fs.unlinkSync(file)
    }
})