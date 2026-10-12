#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <ArduinoOTA.h>
#include <WiFiManager.h>
#include <LittleFS.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <NeoPixelBus.h>

#include "config.h"
#include "effects.h"

#if LED_METHOD_UART_GPIO2
using LedMethod = NeoEsp8266Uart1800KbpsMethod;
#else
using LedMethod = NeoEsp8266DmaWs2812xMethod;
#endif

NeoPixelBus<NeoGrbFeature, LedMethod> strip(LED_COUNT);

struct Settings {
    char deviceId[32];
    char discoveryPrefix[40];
    char baseTopic[48];
    char mqttHost[64];
    uint16_t mqttPort;
    char mqttUser[32];
    char mqttPass[32];
    char otaPass[32];
};

static Settings g_settings;

static WiFiClient g_wifiClient;
static PubSubClient g_mqtt(g_wifiClient);

static uint8_t g_gamma[256];

static bool g_power = DEFAULT_POWER_ON != 0;
static Rgb g_color = {DEFAULT_COLOR_R, DEFAULT_COLOR_G, DEFAULT_COLOR_B};
static uint8_t g_brightness = DEFAULT_BRIGHTNESS;
static float g_brightnessAnim = DEFAULT_BRIGHTNESS;
static bool g_brightnessFading = false;
static float g_brightAnimFrom = DEFAULT_BRIGHTNESS;
static float g_brightAnimTo = DEFAULT_BRIGHTNESS;
static uint32_t g_brightFadeStart = 0;
static uint8_t g_brightnessCeiling = 255;
static Effect g_effect = Effect::Static;
static bool g_dirty = true;

static bool g_fadeActive = false;
static uint32_t g_fadeStart = 0;
static Rgb g_fadeFrom = {0, 0, 0};
static Rgb g_fadeTo = {0, 0, 0};

static Rgb g_buffer[LED_COUNT];
static uint32_t g_lastFrame = 0;
static uint32_t g_lastReconnect = 0;
static uint32_t g_lastStatePublish = 0;
static uint32_t g_lastAttributes = 0;
static uint16_t g_estMilliAmps = 0;

static void copyStr(char* dst, size_t size, const char* src) {
    if (size == 0) {
        return;
    }
    if (src == nullptr) {
        dst[0] = '\0';
        return;
    }
    snprintf(dst, size, "%s", src);
}

static String baseTopic() { return String(g_settings.baseTopic); }
static String stateTopic() { return baseTopic() + "/state"; }
static String commandTopic() { return baseTopic() + "/set"; }
static String availabilityTopic() { return baseTopic() + "/availability"; }
static String attributesTopic() { return baseTopic() + "/attributes"; }
static String lightDiscoveryTopic() {
    return String(g_settings.discoveryPrefix) + "/light/" + g_settings.deviceId + "/config";
}

static void loadDefaults() {
    copyStr(g_settings.deviceId, sizeof(g_settings.deviceId), DEFAULT_DEVICE_ID);
    copyStr(g_settings.discoveryPrefix, sizeof(g_settings.discoveryPrefix), DEFAULT_DISCOVERY_PREFIX);
    copyStr(g_settings.baseTopic, sizeof(g_settings.baseTopic), DEFAULT_BASE_TOPIC);
    g_settings.mqttHost[0] = '\0';
    g_settings.mqttPort = 1883;
    g_settings.mqttUser[0] = '\0';
    g_settings.mqttPass[0] = '\0';
    g_settings.otaPass[0] = '\0';
}

static void loadSettings() {
    loadDefaults();
    File file = LittleFS.open("/config.json", "r");
    if (!file) {
        return;
    }
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();
    if (error) {
        return;
    }
    copyStr(g_settings.deviceId, sizeof(g_settings.deviceId), doc["device_id"] | DEFAULT_DEVICE_ID);
    copyStr(g_settings.discoveryPrefix, sizeof(g_settings.discoveryPrefix), doc["discovery_prefix"] | DEFAULT_DISCOVERY_PREFIX);
    copyStr(g_settings.baseTopic, sizeof(g_settings.baseTopic), doc["base_topic"] | DEFAULT_BASE_TOPIC);
    copyStr(g_settings.mqttHost, sizeof(g_settings.mqttHost), doc["mqtt_host"] | "");
    g_settings.mqttPort = doc["mqtt_port"] | 1883;
    copyStr(g_settings.mqttUser, sizeof(g_settings.mqttUser), doc["mqtt_user"] | "");
    copyStr(g_settings.mqttPass, sizeof(g_settings.mqttPass), doc["mqtt_pass"] | "");
    copyStr(g_settings.otaPass, sizeof(g_settings.otaPass), doc["ota_pass"] | "");
}

static void saveSettings() {
    JsonDocument doc;
    doc["device_id"] = g_settings.deviceId;
    doc["discovery_prefix"] = g_settings.discoveryPrefix;
    doc["base_topic"] = g_settings.baseTopic;
    doc["mqtt_host"] = g_settings.mqttHost;
    doc["mqtt_port"] = g_settings.mqttPort;
    doc["mqtt_user"] = g_settings.mqttUser;
    doc["mqtt_pass"] = g_settings.mqttPass;
    doc["ota_pass"] = g_settings.otaPass;
    File file = LittleFS.open("/config.json", "w");
    if (!file) {
        return;
    }
    serializeJson(doc, file);
    file.close();
}

static void buildGamma() {
    for (int i = 0; i < 256; i++) {
        float v = i / 255.0f;
        float out = powf(v, 2.2f) * 255.0f + 0.5f;
        g_gamma[i] = (uint8_t)(out > 255.0f ? 255.0f : out);
    }
}

static void computeBrightnessCeiling() {
    if (LED_CURRENT_LIMIT_MA <= 0) {
        g_brightnessCeiling = 255;
        return;
    }
    uint32_t worst = (uint32_t)LED_COUNT * LED_MILLIAMPS_PER_LED;
    uint32_t ceiling = (uint32_t)LED_CURRENT_LIMIT_MA * 255u / worst;
    g_brightnessCeiling = ceiling > 255 ? 255 : (uint8_t)ceiling;
}

static WiFiManagerParameter* g_pDevice;
static WiFiManagerParameter* g_pPrefix;
static WiFiManagerParameter* g_pBase;
static WiFiManagerParameter* g_pHost;
static WiFiManagerParameter* g_pPort;
static WiFiManagerParameter* g_pUser;
static WiFiManagerParameter* g_pPass;
static WiFiManagerParameter* g_pOta;

static void onSaveParams() {
    copyStr(g_settings.deviceId, sizeof(g_settings.deviceId), g_pDevice->getValue());
    copyStr(g_settings.discoveryPrefix, sizeof(g_settings.discoveryPrefix), g_pPrefix->getValue());
    copyStr(g_settings.baseTopic, sizeof(g_settings.baseTopic), g_pBase->getValue());
    copyStr(g_settings.mqttHost, sizeof(g_settings.mqttHost), g_pHost->getValue());
    g_settings.mqttPort = (uint16_t)atoi(g_pPort->getValue());
    if (g_settings.mqttPort == 0) {
        g_settings.mqttPort = 1883;
    }
    copyStr(g_settings.mqttUser, sizeof(g_settings.mqttUser), g_pUser->getValue());
    copyStr(g_settings.mqttPass, sizeof(g_settings.mqttPass), g_pPass->getValue());
    copyStr(g_settings.otaPass, sizeof(g_settings.otaPass), g_pOta->getValue());
    saveSettings();
}

static void runConfigPortal() {
    char port[8];
    snprintf(port, sizeof(port), "%u", g_settings.mqttPort);

    g_pDevice = new WiFiManagerParameter("device", "Device id", g_settings.deviceId, 31);
    g_pPrefix = new WiFiManagerParameter("prefix", "MQTT discovery prefix", g_settings.discoveryPrefix, 39);
    g_pBase = new WiFiManagerParameter("base", "MQTT base topic", g_settings.baseTopic, 47);
    g_pHost = new WiFiManagerParameter("host", "MQTT host", g_settings.mqttHost, 63);
    g_pPort = new WiFiManagerParameter("port", "MQTT port", port, 5);
    g_pUser = new WiFiManagerParameter("user", "MQTT user", g_settings.mqttUser, 31);
    g_pPass = new WiFiManagerParameter("pass", "MQTT password", g_settings.mqttPass, 31);
    g_pOta = new WiFiManagerParameter("ota", "OTA password", g_settings.otaPass, 31);

    WiFiManager wm;
    wm.setDarkMode(true);
    wm.setConfigPortalTimeout(CONFIG_PORTAL_TIMEOUT_S);
    wm.addParameter(g_pDevice);
    wm.addParameter(g_pPrefix);
    wm.addParameter(g_pBase);
    wm.addParameter(g_pHost);
    wm.addParameter(g_pPort);
    wm.addParameter(g_pUser);
    wm.addParameter(g_pPass);
    wm.addParameter(g_pOta);
    wm.setSaveParamsCallback(onSaveParams);

    char apName[48];
    snprintf(apName, sizeof(apName), "%s-setup", g_settings.deviceId);
    if (!wm.autoConnect(apName)) {
        Serial.println("Config portal timed out, restarting");
        ESP.restart();
    }
}

static void publishAvailability(const char* payload) {
    if (g_mqtt.connected()) {
        g_mqtt.publish(availabilityTopic().c_str(), payload, true);
    }
}

static void publishDiscovery() {
    char buf[640];
    JsonDocument doc;
    doc["name"] = "Bathroom LED";
    doc["unique_id"] = String(g_settings.deviceId) + "_light";
    doc["schema"] = "json";
    doc["brightness"] = true;
    doc["color_mode"] = true;
    doc["supported_color_modes"].to<JsonArray>().add("rgb");
    doc["effect"] = true;
    JsonArray effects = doc["effect_list"].to<JsonArray>();
    effects.add("None");
    for (uint8_t i = 0; i < effectCount(); i++) {
        effects.add(effectNameAt(i));
    }
    doc["state_topic"] = stateTopic();
    doc["command_topic"] = commandTopic();
    doc["availability_topic"] = availabilityTopic();
    doc["json_attributes_topic"] = attributesTopic();
    doc["payload_available"] = "online";
    doc["payload_not_available"] = "offline";
    JsonObject device = doc["device"].to<JsonObject>();
    device["identifiers"].to<JsonArray>().add(g_settings.deviceId);
    device["name"] = "Bathroom LED";
    device["manufacturer"] = "DIY";
    device["model"] = "ESP8266 + WS2812B";
    device["sw_version"] = FW_VERSION;
    size_t length = serializeJson(doc, buf, sizeof(buf));
    g_mqtt.publish(lightDiscoveryTopic().c_str(), (const uint8_t*)buf, length, true);
}

static void publishAttributes() {
    char attrs[192];
    JsonDocument attrDoc;
    const char* name = effectName(g_effect);
    attrDoc["effect"] = name != nullptr ? name : "None";
    attrDoc["ip"] = WiFi.localIP().toString();
    attrDoc["current_ma"] = g_estMilliAmps;
    size_t attrLength = serializeJson(attrDoc, attrs, sizeof(attrs));
    g_mqtt.publish(attributesTopic().c_str(), (const uint8_t*)attrs, attrLength, true);
}

static void publishState() {
    char buf[256];
    JsonDocument doc;
    doc["state"] = g_power ? "ON" : "OFF";
    JsonObject color = doc["color"].to<JsonObject>();
    color["r"] = g_color.r;
    color["g"] = g_color.g;
    color["b"] = g_color.b;
    doc["brightness"] = g_brightness;
    if (g_power) {
        doc["color_mode"] = "rgb";
    }
    const char* name = effectName(g_effect);
    doc["effect"] = name != nullptr ? name : "None";
    size_t length = serializeJson(doc, buf, sizeof(buf));
    g_mqtt.publish(stateTopic().c_str(), (const uint8_t*)buf, length, true);
    publishAttributes();
}

static Rgb lerpColor(Rgb a, Rgb b, float t) {
    return Rgb{
        (uint8_t)(a.r + (b.r - a.r) * t + 0.5f),
        (uint8_t)(a.g + (b.g - a.g) * t + 0.5f),
        (uint8_t)(a.b + (b.b - a.b) * t + 0.5f),
    };
}

static void startFade(Rgb from, Rgb to) {
    g_fadeFrom = from;
    g_fadeTo = to;
    g_fadeStart = millis();
    g_fadeActive = true;
    g_dirty = true;
}

static void renderFade(Rgb* out, uint16_t count, uint32_t now) {
    float p = (float)(now - g_fadeStart) / (float)COLOR_FADE_MS;
    if (p > 1.0f) {
        p = 1.0f;
    }
    float soft = (float)COLOR_FADE_SOFTNESS;
    int mid = (count - 1) / 2;
    int far = (int)(count - 1) - mid;
    int maxDist = mid > far ? mid : far;
    float front = p * (float)(maxDist + (int)soft);
    for (uint16_t i = 0; i < count; i++) {
        int dist = (int)i - mid;
        if (dist < 0) {
            dist = -dist;
        }
        float t = (front - (float)dist) / soft;
        if (t < 0.0f) {
            t = 0.0f;
        } else if (t > 1.0f) {
            t = 1.0f;
        }
        out[i] = lerpColor(g_fadeFrom, g_fadeTo, t);
    }
    if (p >= 1.0f) {
        g_fadeActive = false;
        g_dirty = false;
    }
}

static void handleCommand(const char* payload, unsigned int length) {
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, payload, length);
    if (error) {
        return;
    }

    bool changed = false;

    const char* state = doc["state"].as<const char*>();
    if (state != nullptr) {
        bool wasPower = g_power;
        g_power = strcmp(state, "ON") == 0;
        if (g_power && !wasPower && g_effect == Effect::Static) {
            startFade(Rgb{0, 0, 0}, g_color);
        }
        changed = true;
    }

    if (!doc["brightness"].isNull()) {
        uint8_t next = (uint8_t)constrain(doc["brightness"].as<int>(), 0, 255);
        if (next != g_brightness) {
            g_brightAnimFrom = g_brightnessAnim;
            g_brightAnimTo = (float)next;
            g_brightFadeStart = millis();
            g_brightnessFading = true;
            g_brightness = next;
            changed = true;
        }
    }

    if (!doc["color"].isNull()) {
        Rgb previous = g_color;
        g_color.r = (uint8_t)constrain(doc["color"]["r"] | g_color.r, 0, 255);
        g_color.g = (uint8_t)constrain(doc["color"]["g"] | g_color.g, 0, 255);
        g_color.b = (uint8_t)constrain(doc["color"]["b"] | g_color.b, 0, 255);
        startFade(previous, g_color);
        changed = true;
    }

    if (doc["effect"].is<const char*>()) {
        g_effect = effectFromName(doc["effect"].as<const char*>());
        g_fadeActive = false;
        effectsBegin(g_effect);
        changed = true;
    } else if (!doc["color"].isNull() && g_effect != Effect::Static) {
        g_effect = Effect::Static;
        effectsBegin(g_effect);
        changed = true;
    }

    if (changed) {
        g_dirty = true;
        publishState();
        g_lastStatePublish = millis();
    }
}

static void onMqttMessage(char* topic, uint8_t* payload, unsigned int length) {
    if (strcmp(topic, commandTopic().c_str()) == 0) {
        char dbg[256];
        unsigned int n = length < sizeof(dbg) - 1 ? length : sizeof(dbg) - 1;
        memcpy(dbg, payload, n);
        dbg[n] = '\0';
        Serial.printf("cmd: %s\n", dbg);
        handleCommand((const char*)payload, length);
    }
}

static void connectMqtt() {
    if (g_settings.mqttHost[0] == '\0') {
        return;
    }
    uint32_t now = millis();
    if (now - g_lastReconnect < MQTT_RECONNECT_MS) {
        return;
    }
    g_lastReconnect = now;

    Serial.println("Connecting to the MQTT broker");
    String clientId = String(g_settings.deviceId) + "-" + String(ESP.getChipId(), HEX);
    const char* user = g_settings.mqttUser[0] != '\0' ? g_settings.mqttUser : nullptr;
    const char* pass = g_settings.mqttPass[0] != '\0' ? g_settings.mqttPass : nullptr;
    String avail = availabilityTopic();

    if (g_mqtt.connect(clientId.c_str(), user, pass, avail.c_str(), 0, true, "offline")) {
        Serial.println("Connected to the MQTT broker");
        publishAvailability("online");
        publishDiscovery();
        g_mqtt.subscribe(commandTopic().c_str());
        publishState();
        g_lastStatePublish = millis();
        g_lastAttributes = millis();
    } else {
        Serial.printf("MQTT connect failed, rc=%d\n", g_mqtt.state());
    }
}

static void applyToStrip() {
    uint8_t brightness = (uint8_t)g_brightnessAnim;
    if (brightness > g_brightnessCeiling) {
        brightness = g_brightnessCeiling;
    }
    uint32_t channelSum = 0;
    for (uint16_t i = 0; i < LED_COUNT; i++) {
        uint16_t r = (uint16_t)g_buffer[i].r * brightness / 255;
        uint16_t g = (uint16_t)g_buffer[i].g * brightness / 255;
        uint16_t b = (uint16_t)g_buffer[i].b * brightness / 255;
        uint8_t gr = g_gamma[r];
        uint8_t gg = g_gamma[g];
        uint8_t gb = g_gamma[b];
        channelSum += (uint32_t)gr + gg + gb;
        strip.SetPixelColor(i, RgbColor(gr, gg, gb));
    }
    g_estMilliAmps = (uint16_t)(LED_COUNT + (channelSum * 20u) / 255u);
}

static void updateBrightness(uint32_t now) {
    if (!g_brightnessFading) {
        return;
    }
    float t = (float)(now - g_brightFadeStart) / (float)BRIGHTNESS_FADE_MS;
    if (t >= 1.0f) {
        g_brightnessAnim = g_brightAnimTo;
        g_brightnessFading = false;
    } else {
        g_brightnessAnim = g_brightAnimFrom + (g_brightAnimTo - g_brightAnimFrom) * t;
    }
}

static void render() {
    uint32_t now = millis();

    if (!g_power) {
        if (g_dirty) {
            strip.ClearTo(RgbColor(0, 0, 0));
            strip.Show();
            g_estMilliAmps = 0;
            g_dirty = false;
        }
        return;
    }

    bool animated = (g_effect != Effect::Static) || g_fadeActive || g_brightnessFading;
    if (!animated && !g_dirty) {
        return;
    }
    if (now - g_lastFrame < FRAME_MS) {
        return;
    }
    g_lastFrame = now;

    if (g_effect != Effect::Static) {
        g_fadeActive = false;
        effectsRender(g_effect, g_buffer, LED_COUNT, now);
    } else if (g_fadeActive) {
        renderFade(g_buffer, LED_COUNT, now);
    } else {
        effectsRenderStatic(g_buffer, LED_COUNT, g_color);
    }

    updateBrightness(now);
    applyToStrip();
    strip.Show();
    if (!animated) {
        g_dirty = false;
    }
}

static void setupOta() {
    ArduinoOTA.setHostname(g_settings.deviceId);
    if (g_settings.otaPass[0] != '\0') {
        ArduinoOTA.setPassword(g_settings.otaPass);
    }
    ArduinoOTA.begin();
}

static void bootSweep() {
    const Rgb warm = {255, 190, 120};
    const int tail = 7;
    const uint8_t brightness = 200;
    for (int head = -tail; head <= LED_COUNT + tail; head++) {
        for (uint16_t i = 0; i < LED_COUNT; i++) {
            int behind = head - i;
            uint8_t gr = 0;
            uint8_t gg = 0;
            uint8_t gb = 0;
            if (behind >= 0 && behind <= tail) {
                float factor = 1.0f - (float)behind / (float)tail;
                uint16_t r = (uint16_t)(warm.r * factor) * brightness / 255;
                uint16_t g = (uint16_t)(warm.g * factor) * brightness / 255;
                uint16_t b = (uint16_t)(warm.b * factor) * brightness / 255;
                gr = g_gamma[r];
                gg = g_gamma[g];
                gb = g_gamma[b];
            }
            strip.SetPixelColor(i, RgbColor(gr, gg, gb));
        }
        strip.Show();
        delay(18);
    }
    strip.ClearTo(RgbColor(0, 0, 0));
    strip.Show();
}

void setup() {
    Serial.begin(115200);
    Serial.printf("\n%s %s\n", FW_NAME, FW_VERSION);

    buildGamma();
    computeBrightnessCeiling();

    strip.Begin();
#if BOOT_SWEEP
    bootSweep();
#else
    strip.ClearTo(RgbColor(0, 0, 0));
    strip.Show();
#endif

    if (!LittleFS.begin()) {
        LittleFS.format();
        LittleFS.begin();
    }
    loadSettings();
    Serial.printf("MQTT %s:%u base=%s\n", g_settings.mqttHost, g_settings.mqttPort, g_settings.baseTopic);

    runConfigPortal();

    system_update_cpu_freq(CPU_FREQ_MHZ);
    WiFi.setSleepMode(WIFI_MODEM_SLEEP);
    WiFi.setOutputPower(WIFI_TX_POWER_DBM);
    WiFi.setAutoReconnect(true);
    Serial.print("WiFi connected, IP: ");
    Serial.println(WiFi.localIP());

    MDNS.begin(g_settings.deviceId);
    setupOta();

    g_mqtt.setServer(g_settings.mqttHost, g_settings.mqttPort);
    g_mqtt.setCallback(onMqttMessage);

    effectsBegin(g_effect);
    strip.ClearTo(RgbColor(0, 0, 0));
    strip.Show();
}

void loop() {
    ArduinoOTA.handle();
    MDNS.update();

    if (WiFi.status() == WL_CONNECTED) {
        if (!g_mqtt.connected()) {
            connectMqtt();
        }
        g_mqtt.loop();

        if (g_mqtt.connected() && millis() - g_lastStatePublish > STATE_REPUBLISH_MS) {
            publishState();
            g_lastStatePublish = millis();
        }

        if (g_mqtt.connected() && millis() - g_lastAttributes > ATTRIBUTES_MS) {
            publishAttributes();
            g_lastAttributes = millis();
        }
    }

    render();
}
