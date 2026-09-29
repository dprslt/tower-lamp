import {parseColor, RGB} from './screen/Rasterizer'
import {MqttLightState} from './MqttBridge'
import {PALETTE as FIREWORKS_PALETTE} from './canvasStrategies/FireworksStrategy'
import {PALETTE as RAIN_PALETTE} from './canvasStrategies/RainStrategy'
import {PALETTE as SLEEPY_RAIN_PALETTE} from './canvasStrategies/SleepyRainStrategy'


export function averageColor(colors: RGB[]): RGB {
    const total = colors.reduce(
        ([r, g, b], [cr, cg, cb]) => [r + cr, g + cg, b + cb],
        [0, 0, 0],
    )
    return [
        Math.round(total[0] / colors.length),
        Math.round(total[1] / colors.length),
        Math.round(total[2] / colors.length),
    ]
}

const FALLBACK_AMBIENT: RGB = [255, 255, 255]

// Representative "ambient" color of each strategy, used to drive the HA light
// entity when the strategy has no single color of its own. Animations use the
// average of their color palette; the `color` strategy uses its actual fill.
export const STRATEGY_AMBIENT_COLORS: Record<string, RGB> = {
    color: [255, 255, 255],
    off: [0, 0, 0],
    image: [255, 244, 224],
    fireworks: averageColor(FIREWORKS_PALETTE),
    rain: averageColor(RAIN_PALETTE),
    'sleepy-rain': averageColor(SLEEPY_RAIN_PALETTE),
    'moving-pixel': [255, 0, 0],
    'spinning-dot': [255, 0, 0],
}

export function colorFromFillParams(params: any): RGB {
    if (typeof params?.fill === 'string') {
        return parseColor(params.fill)
    }
    if (Array.isArray(params?.fill)) {
        return params.fill as RGB
    }
    const stops = params?.fillLinearGradientColorStops
    if (Array.isArray(stops)) {
        const colors: RGB[] = []
        for (let i = 1; i < stops.length; i += 2) {
            colors.push(parseColor(String(stops[i])))
        }
        if (colors.length > 0) {
            return averageColor(colors)
        }
    }
    return STRATEGY_AMBIENT_COLORS.color
}

export function strategyAmbientColor(name: string, params: any): RGB {
    if (name === 'color') {
        return colorFromFillParams(params)
    }
    if ((name === 'spinning-dot' || name === 'moving-pixel') && typeof params?.color === 'string') {
        return parseColor(params.color)
    }
    return STRATEGY_AMBIENT_COLORS[name] ?? FALLBACK_AMBIENT
}

export function strategyLightState(name: string, params: any): MqttLightState {
    if (name === 'off') {
        return {state: 'OFF', color: {r: 0, g: 0, b: 0}, brightness: 0, attributes: {mode: 'off'}}
    }
    const [r, g, b] = strategyAmbientColor(name, params)
    return {state: 'ON', color: {r, g, b}, brightness: 255, attributes: {mode: name}}
}
