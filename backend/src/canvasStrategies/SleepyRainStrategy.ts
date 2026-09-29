import RainStrategy, {RainConfig} from "./RainStrategy";
import {CanvasScreen} from "../screen/CanvasScreen";
import {RGB} from "../screen/Rasterizer";

export const PALETTE: RGB[] = [
    [35, 75, 185],
    [45, 95, 200],
    [55, 115, 210],
    [65, 130, 220],
    [78, 150, 228],
    [40, 85, 195],
]

// A slow, blue, drowsy drizzle: short bursts of drops separated by long quiet
// pauses, long soft trails, dim output and rare gentle flashes — meant to feel
// like drifting off rather than a storm.
export const SLEEPY_RAIN: RainConfig = {
    palette: PALETTE,
    boltColor: [90, 140, 235],
    fadeHalfLifeS: 0.22,
    flashDurationS: 0.55,
    boltLifeS: 0.35,
    rippleLifeS: 0.7,
    dropIntervalMs: 1600,
    lightningIntervalMs: 24000,
    maxDrops: 3,
    dropSpeedMin: 10.5,
    dropSpeedRange: 7.5,
    driftSpread: 0.7,
    flashBoost: 0.12,
    boltIntensity: 0.35,
    boltForkIntensity: 0.15,
    rippleColor: [70, 140, 235],
    rippleIntensity: 0.35,
    rippleSpeed: 2,
    tailNear: 0.4,
    tailFar: 0.16,
    brightness: 0.55,
    shower: {
        burstMin: 1,
        burstMax: 2,
        spacingMs: 450,
        pauseMinMs: 1100,
        pauseMaxMs: 2200,
    },
}

export default class SleepyRainStrategy extends RainStrategy {
    public constructor(canvasScreen: CanvasScreen, params: any) {
        super(canvasScreen, params, SLEEPY_RAIN)
    }
}
