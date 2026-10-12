#pragma once

#include <stdint.h>

struct Rgb {
    uint8_t r;
    uint8_t g;
    uint8_t b;
};

enum class Effect : uint8_t {
    Static = 0,
    Rain,
    PinkDream,
    Candle,
    Aurora,
    Sunset,
    SleepyRain,
};

uint8_t effectCount();

const char* effectNameAt(uint8_t index);

const char* effectName(Effect effect);

Effect effectFromName(const char* name);

void effectsBegin(Effect effect);

void effectsRender(Effect effect, Rgb* out, uint16_t count, uint32_t nowMs);

void effectsRenderStatic(Rgb* out, uint16_t count, Rgb color);
