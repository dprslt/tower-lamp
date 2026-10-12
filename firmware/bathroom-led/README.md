# bathroom-led firmware

Firmware **ESP8266** pour un ruban **WS2812B 5 V (90 LED)** : lumière RGB
contrôlable depuis **Home Assistant** via **MQTT auto-discovery**, avec un menu
d'effets (pluie, rose, bougie, aurore, sunset, pluie calme).

Projet **distinct de la tower-lamp** : ici tout tourne sur l'ESP, sans FadeCandy,
sans backend Node.

## Matériel

- ESP8266 (NodeMCU v3 / Wemos D1 mini)
- Ruban WS2812B 5 V (60 LED/m, ~90 LED)
- Alim 5 V (≥ 6 A ; 7 A conseillés — un chargeur USB ne suffit pas en blanc plein)
- Câblage et précautions : voir `../../../doc/esp8266-ruban-unique.html`
  (avec 74HCT245) ou `../../../doc/esp8266-ruban-unique-sans-shifter.html`
  (data directe sur D4, diode optionnelle).

**Broche data** : ce firmware utilise la méthode UART NeoPixelBus, **fixée sur
GPIO2 (D4)**. La résistance série 330 Ω et le condensateur 1000 µF restent
recommandés.

## Compiler / flasher (PlatformIO)

```bash
cd firmware/bathroom-led
pio run                 # build
pio run -t upload       # flash série (port auto)
pio device monitor      # logs série (115200)
```

Ou via VS Code + extension PlatformIO. La board est `nodemcuv2` (adapter
`platformio.ini` si ton module diffère).

### Mise à jour sans fil (OTA)

Après le premier flash série + config WiFi, les updates passent en OTA :

```bash
pio run -e ota -t upload            # utilise upload_port de l'env ota
# ou une autre adresse :
pio run -e ota -t upload --upload-port bathroom_led.local
```

- `upload_port` par défaut : `192.168.17.110` (adapter dans `platformio.ini`
  `[env:ota]`, ou surcharge via `--upload-port`). mDNS `bathroom_led.local` si le
  poste sait résoudre le `.local` (Bonjour).
- **Si tu as défini un mot de passe OTA** dans le portail, ajoute dans
  `[env:ota]` : `upload_flags = --port=8266` + une ligne `--auth=TON_MDP`.
- L'OTA **ne touche pas** la config (`/config.json` en LittleFS) : WiFi/MQTT
  conservés.
- Port OTA ESP8266 : **8266**.


## Premier démarrage — portail de config

Au premier boot (ou si le WiFi est vide), l'ESP crée un point d'accès :

- **SSID** : `bathroom_led-setup`
- Ouvre `http://192.168.4.1` et renseigne :

| Champ | Défaut | Rôle |
|---|---|---|
| Device id | `bathroom_led` | Identifiant HA + nom mDNS/OTA (`bathroom_led.local`) |
| MQTT discovery prefix | `homeassistant` | Préfixe de découverte HA |
| MQTT base topic | `bathroom_led/light` | Base des topics |
| MQTT host | *(vide)* | IP/nom du broker |
| MQTT port | `1883` | |
| MQTT user / password | *(vide)* | Optionnels |
| OTA password | *(vide)* | Mot de passe des mises à jour OTA |

Les réglages sont sauvegardés dans `/config.json` (LittleFS). Pour rouvrir le
portail plus tard : effacer `config.json` ou appeler `wm.resetSettings()`.

## Home Assistant

L'ESP publie la découverte MQTT : une entité **light** apparaît automatiquement
(nom `Bathroom LED`) avec :

- **couleur RGB** (base des effets « statique »/pluie)
- **luminosité**
- **menu d'effets** : Rain, Pink dream, Candle, Aurora, Sunset, Sleepy rain

### Topics

| Topic | Sens | Payload |
|---|---|---|
| `homeassistant/light/<id>/config` | ESP → HA | Découverte (retained) |
| `<base>/state` | ESP → HA | `{"state","color","brightness","color_mode","effect"}` |
| `<base>/set` | HA → ESP | `{"state","color":{r,g,b},"brightness","effect"}` |
| `<base>/availability` | ESP → HA | `online` / `offline` (LWT) |
| `<base>/attributes` | ESP → HA | `{"effect","ip"}` |

Exemple de commande :

```json
{"state":"ON","color":{"r":255,"g":160,"b":210},"brightness":180,"effect":"Candle"}
```

`"effect":"None"` (ou absent) repasse en couleur statique.

## Effets

| Effet | Description |
|---|---|
| **Rain** | Surface d'eau vue de côté : une goutte tombe n'importe où, ses **ondes partent dans les deux sens**. |
| **Pink dream** | Dégradé rose/orchidée lent et « respirant », ambiance bain. |
| **Candle** | Lueur ambrée chaude avec scintillement type bougie. |
| **Aurora** | Vagues lentes teal/vert/violet qui respirent. |
| **Sunset** | Dégradé rouge → or fixe avec léger chatouillement. |
| **Sleepy rain** | Comme Rain mais lent : gouttes rares, **ondes larges et longues**, bleu profond. |

Le menu d'effets inclut aussi **`None`** (retour à la couleur statique).
Changer la **couleur** en HA pendant un effet **coupe aussi l'effet** (retour statique).

## Consommation, chauffe & rendu

- **La conso (et donc la chauffe du ruban) dépend du contenu** — luminosité ×
  couleur × surface — **pas** du fps. Ralentir le rendu ne refroidit pas le
  ruban ; ça réduit seulement le travail CPU/bus.
- **Limiteur de courant** : `LED_CURRENT_LIMIT_MA` (défaut **5000 mA**) plafonne
  la luminosité pour que le **blanc-plein pire cas** (`LED_COUNT × 60 mA`) reste
  sous la limite : `brightness ≤ limite / (LED_COUNT × 60) × 255`. Mets `0` pour
  désactiver.
- **Gamma 2.2** appliqué à la sortie : à luminosité perçue égale, ça **baisse**
  la commande des tons moyens (moins de courant qu'en linéaire).
- **Rendu paresseux (idle)** : en **statique**, la trame n'est envoyée **qu'au
  changement** (couleur/luminosité/état) — plus de renvoi 50×/s inutile. Les
  effets animent à `FRAME_MS` (défaut 20 ms ≈ 50 fps).
- **Conso estimée** publiée dans les attributs MQTT : `<base>/attributes` →
  `"current_ma"` (mesure approximative recalculée à chaque rendu, utile pour
  surveiller la chauffe dans HA).

## Démarrage

- `DEFAULT_POWER_ON` (défaut **1**) : `0` pour démarrer **éteint** (le ruban
  reste noir jusqu'à une commande HA).
- Ensuite l'état n'est pas persisté : un reboot repart sur `DEFAULT_POWER_ON` +
  couleur par défaut.

## Changer la broche / la méthode

Le firmware utilise par défaut `NeoEsp8266Uart1800KbpsMethod` → **GPIO2 (D4)**.
Pour utiliser **GPIO3 (RX)** avec la méthode DMA :

- `include/config.h` : `#define LED_METHOD_UART_GPIO2 0`
- câbler la data sur **GPIO3**, et débrancher la data pendant le flash série.

## Dépannage

- **Ça scintille / 1ʳᵉ LED instable** : fil data trop long, mise à la masse
  commune manquante, ou niveau logique limite → ajouter le 74HCT245.
- **Pas de lumière** : vérifier l'ordre des couleurs (`NeoGrbFeature` = GRB,
  correct pour WS2812B), la masse commune, et les 5 V sur le ruban.
- **HA ne voit pas l'entité** : vérifier `MQTT host` dans le portail, et que le
  préfixe de découverte correspond à celui de l'intégration MQTT de HA.
