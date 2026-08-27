export function getRandomInt(max: number) : number {
    return Math.floor(Math.random() * Math.floor(max))
}

export interface FrameStats {
    avgBrightnessPct: number
    litPixels: number
    distinctColors: number
    allBlack: boolean
    allSameColor: boolean
}

export function frameStats(flat: number[]): FrameStats {
    const colors = new Set<string>()
    let lit = 0
    let sum = 0

    for (let i = 0; i < flat.length; i += 3) {
        colors.add(`${flat[i]},${flat[i + 1]},${flat[i + 2]}`)
        if (flat[i] + flat[i + 1] + flat[i + 2] > 0) {
            lit++
        }
        sum += flat[i] + flat[i + 1] + flat[i + 2]
    }

    const avgBrightnessPct = Math.round((sum / flat.length / 255) * 1000) / 10
    return {
        avgBrightnessPct,
        litPixels: lit,
        distinctColors: colors.size,
        allBlack: lit === 0,
        allSameColor: colors.size === 1,
    }
}