#include <Arduino.h>
#include <math.h>
#include <string.h>
#include <strings.h>

#include "config.h"
#include "effects.h"

static const char* kEffectNames[] = {
    "Rain",
    "Pink dream",
    "Candle",
    "Aurora",
    "Sunset",
    "Sleepy rain",
};
static const uint8_t kEffectCount = sizeof(kEffectNames) / sizeof(kEffectNames[0]);

uint8_t effectCount() {
    return kEffectCount;
}

const char* effectNameAt(uint8_t index) {
    if (index >= kEffectCount) {
        return "";
    }
    return kEffectNames[index];
}

const char* effectName(Effect effect) {
    if (effect == Effect::Static) {
        return nullptr;
    }
    uint8_t index = (uint8_t)effect - 1;
    if (index >= kEffectCount) {
        return nullptr;
    }
    return kEffectNames[index];
}

Effect effectFromName(const char* name) {
    if (name == nullptr || name[0] == '\0') {
        return Effect::Static;
    }
    if (strcasecmp(name, "None") == 0 || strcasecmp(name, "off") == 0) {
        return Effect::Static;
    }
    for (uint8_t i = 0; i < kEffectCount; i++) {
        if (strcasecmp(name, kEffectNames[i]) == 0) {
            return (Effect)(i + 1);
        }
    }
    return Effect::Static;
}

static inline float clampf(float value, float lo, float hi) {
    return value < lo ? lo : (value > hi ? hi : value);
}

static inline uint8_t to8(float value) {
    if (value < 0.0f) {
        value = 0.0f;
    } else if (value > 255.0f) {
        value = 255.0f;
    }
    return (uint8_t)(value + 0.5f);
}

static inline Rgb rgb(uint8_t r, uint8_t g, uint8_t b) {
    return Rgb{r, g, b};
}

static inline Rgb scaleRgb(Rgb color, float factor) {
    return Rgb{to8(color.r * factor), to8(color.g * factor), to8(color.b * factor)};
}

static inline Rgb lerpRgb(Rgb a, Rgb b, float t) {
    t = clampf(t, 0.0f, 1.0f);
    return Rgb{
        to8(a.r + (b.r - a.r) * t),
        to8(a.g + (b.g - a.g) * t),
        to8(a.b + (b.b - a.b) * t),
    };
}

static inline void addRgb(Rgb& dst, Rgb src, float factor) {
    int r = (int)dst.r + (int)(src.r * factor);
    int g = (int)dst.g + (int)(src.g * factor);
    int b = (int)dst.b + (int)(src.b * factor);
    dst.r = r > 255 ? 255 : (uint8_t)r;
    dst.g = g > 255 ? 255 : (uint8_t)g;
    dst.b = b > 255 ? 255 : (uint8_t)b;
}

void effectsRenderStatic(Rgb* out, uint16_t count, Rgb color) {
    for (uint16_t i = 0; i < count; i++) {
        out[i] = color;
    }
}

#define RIPPLE_COUNT 16
struct Ripple {
    bool active;
    float origin;
    uint32_t birth;
    float amp;
    float speed;
};
static Ripple s_ripples[RIPPLE_COUNT];
static uint32_t s_nextSpawn = 0;
static float s_rippleSpeed = 45.0f;
static float s_rippleWidth = 5.0f;
static float s_rippleDecayMs = 900.0f;
static float s_rippleAtten = 0.028f;
static uint32_t s_spawnMin = 250;
static uint32_t s_spawnMax = 550;

static void resetRipples(float speed, float width, float decayMs, float atten, uint32_t spawnMin, uint32_t spawnMax) {
    for (uint8_t i = 0; i < RIPPLE_COUNT; i++) {
        s_ripples[i].active = false;
    }
    s_rippleSpeed = speed;
    s_rippleWidth = width;
    s_rippleDecayMs = decayMs;
    s_rippleAtten = atten;
    s_spawnMin = spawnMin;
    s_spawnMax = spawnMax;
    s_nextSpawn = millis() + random(spawnMin, spawnMax);
}

static void spawnRipple(uint16_t count) {
    for (uint8_t i = 0; i < RIPPLE_COUNT; i++) {
        if (!s_ripples[i].active) {
            s_ripples[i].active = true;
            s_ripples[i].origin = (float)random(0, count);
            s_ripples[i].birth = millis();
            s_ripples[i].amp = 0.75f + 0.25f * (random(0, 1000) / 1000.0f);
            s_ripples[i].speed = s_rippleSpeed * (0.85f + 0.3f * (random(0, 1000) / 1000.0f));
            return;
        }
    }
}

static void renderRipples(Rgb* out, uint16_t count, Rgb color, Rgb crest, uint32_t now) {
    for (uint16_t i = 0; i < count; i++) {
        out[i] = rgb(0, 0, 0);
    }
    if (now >= s_nextSpawn) {
        spawnRipple(count);
        s_nextSpawn = now + random(s_spawnMin, s_spawnMax);
    }
    float maxRadius = (float)count + s_rippleWidth * 4.0f;
    for (uint8_t r = 0; r < RIPPLE_COUNT; r++) {
        if (!s_ripples[r].active) {
            continue;
        }
        float age = (now - s_ripples[r].birth) / 1000.0f;
        float radius = s_ripples[r].speed * age;
        if (radius > maxRadius) {
            s_ripples[r].active = false;
            continue;
        }
        float decay = expf(-age * (1000.0f / s_rippleDecayMs));
        float spread = expf(-radius * s_rippleAtten);
        float amp = s_ripples[r].amp * decay * spread;
        if (amp < 0.02f) {
            s_ripples[r].active = false;
            continue;
        }
        for (uint16_t i = 0; i < count; i++) {
            float d = (float)i - s_ripples[r].origin;
            if (d < 0) {
                d = -d;
            }
            float w = (d - radius) / s_rippleWidth;
            float packet = expf(-w * w);
            if (packet < 0.01f) {
                continue;
            }
            float v = amp * packet;
            addRgb(out[i], color, v);
            addRgb(out[i], crest, v * 0.5f);
        }
    }
}

static void renderPinkDream(Rgb* out, uint16_t count, uint32_t nowMs) {
    Rgb hotPink = rgb(255, 90, 170);
    Rgb orchid = rgb(190, 95, 255);
    Rgb softRose = rgb(255, 150, 190);
    float phase = nowMs * 0.00035f;
    float breathe = 0.72f + 0.28f * sinf(nowMs * 0.0009f);
    for (uint16_t i = 0; i < count; i++) {
        float x = (float)i / (float)(count - 1);
        float mix = 0.5f + 0.5f * sinf(x * 6.28318f * 1.5f + phase);
        Rgb base = lerpRgb(hotPink, orchid, mix);
        float shimmer = 0.5f + 0.5f * sinf(x * 6.28318f * 0.75f - phase * 1.7f);
        base = lerpRgb(base, softRose, 0.35f * shimmer);
        out[i] = scaleRgb(base, breathe);
    }
}

static void renderCandle(Rgb* out, uint16_t count, uint32_t nowMs) {
    float t = nowMs * 0.001f;
    for (uint16_t i = 0; i < count; i++) {
        float flicker = 0.74f
            + 0.14f * sinf(t * 3.1f + i * 0.7f)
            + 0.08f * sinf(t * 7.7f + i * 1.9f)
            + 0.06f * sinf(t * 13.3f + i * 3.1f);
        float dip = (sinf(t * 0.6f + i * 0.31f) < -0.85f) ? 0.55f : 1.0f;
        flicker = clampf(flicker * dip, 0.35f, 1.05f);
        float warmth = clampf(0.85f + 0.15f * sinf(t * 1.7f + i * 0.5f), 0.8f, 1.0f);
        out[i] = rgb(to8(255 * flicker), to8(140 * flicker * warmth), to8(45 * flicker * warmth));
    }
}

static void renderAurora(Rgb* out, uint16_t count, uint32_t nowMs) {
    float t = nowMs * 0.001f;
    Rgb teal = rgb(30, 200, 170);
    Rgb green = rgb(90, 230, 120);
    Rgb violet = rgb(140, 80, 220);
    for (uint16_t i = 0; i < count; i++) {
        float x = (float)i / (float)(count - 1);
        float a = 0.5f + 0.5f * sinf(x * 6.28318f * 1.0f + t * 0.6f);
        float b = 0.5f + 0.5f * sinf(x * 6.28318f * 2.0f - t * 0.4f);
        float c = 0.5f + 0.5f * sinf(x * 6.28318f * 0.5f + t * 0.3f);
        Rgb mixed = lerpRgb(teal, green, a);
        mixed = lerpRgb(mixed, violet, 0.6f * b);
        float breathe = 0.55f + 0.45f * c;
        out[i] = scaleRgb(mixed, breathe);
    }
}

static void renderSunset(Rgb* out, uint16_t count, uint32_t nowMs) {
    Rgb low = rgb(255, 55, 15);
    Rgb mid = rgb(255, 120, 40);
    Rgb high = rgb(255, 195, 70);
    float t = nowMs * 0.0002f;
    for (uint16_t i = 0; i < count; i++) {
        float x = (float)i / (float)(count - 1);
        float shift = 0.06f * sinf(nowMs * 0.0004f + x * 3.14159f);
        float p = clampf(x + shift, 0.0f, 1.0f);
        Rgb color = (p < 0.5f) ? lerpRgb(low, mid, p * 2.0f) : lerpRgb(mid, high, (p - 0.5f) * 2.0f);
        float shimmer = 0.94f + 0.06f * sinf(t * 6.0f + i * 0.6f);
        out[i] = scaleRgb(color, shimmer);
    }
}

void effectsBegin(Effect effect) {
    switch (effect) {
        case Effect::Rain:
            resetRipples(48.0f, 5.0f, 900.0f, 0.028f, 250, 550);
            break;
        case Effect::SleepyRain:
            resetRipples(16.0f, 7.0f, 2200.0f, 0.012f, 900, 1700);
            break;
        default:
            break;
    }
}

void effectsRender(Effect effect, Rgb* out, uint16_t count, uint32_t nowMs) {
    switch (effect) {
        case Effect::Rain:
            renderRipples(out, count, rgb(60, 130, 255), rgb(180, 220, 255), nowMs);
            break;
        case Effect::SleepyRain:
            renderRipples(out, count, rgb(20, 45, 140), rgb(80, 120, 210), nowMs);
            break;
        case Effect::PinkDream:
            renderPinkDream(out, count, nowMs);
            break;
        case Effect::Candle:
            renderCandle(out, count, nowMs);
            break;
        case Effect::Aurora:
            renderAurora(out, count, nowMs);
            break;
        case Effect::Sunset:
            renderSunset(out, count, nowMs);
            break;
        case Effect::Static:
        default:
            break;
    }
}
