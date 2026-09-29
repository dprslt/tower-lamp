# ESP32 + ruban WS2812B unique (notes)

Notes de référence pour un projet **distinct de la tower-lamp** : piloter un ruban
adressable 5 V avec un seul ESP32, **sans FadeCandy**.

## Config retenue

- Ruban : **WS2812B 5 V, 60 LED/m**
- Longueur : **~1,50 m** → **~90 LED**
- Une **seule ligne de données** (un seul GPIO)

## Chiffres clés (90 LED)

| Grandeur | Valeur |
|---|---|
| Nb LED | 90 |
| Courant max (blanc plein, ~60 mA/LED) | ~5,4 A |
| Puissance max | ~27 W |
| RAM côté ESP32 (3 o/LED) | 270 o |
| Alim conseillée | **5 V / 10 A** (marge ~1,5x) |

## Ce que l'ESP32 peut piloter

- Protocole WS2812 : 24 bits x ~1,25 µs ≈ **30 µs par LED**.
- À 30–40 fps, une ligne RMT tient **~800–1000 LED** avant de ramer.
- ESP32 classique = **8 canaux RMT** (8 lignes max) ; FastLED/I2S jusqu'à 16.
- Donc 90 LED = ~10 % d'une seule ligne : data, RAM et refresh non limitants.

## Câblage / précautions

1. **Niveau logique** : ESP32 = 3,3 V, WS2812B en 5 V veut ~3,5 V de niveau haut
   → **level shifter 74HCT245** (sinon scintillements).
2. **Résistance série 300–500 Ω** sur la ligne data, au plus près de la 1re LED.
3. **Condensateur 1000 µF** aux bornes de l'alim au niveau du ruban.
4. **Chute de tension** : à ~5,4 A sur 1,5 m de pistes cuivre fines on peut perdre
   0,5–1 V → le bout vire au rouge/faible. **Injecter l'alim aux deux extrémités**
   (et au milieu si ≥144 LED/m), avec du fil plus gros (18 AWG) entre alim et ruban.
5. La data est **régénérée à chaque LED** dans le ruban : la longueur du ruban
   n'est pas un souci, seul le fil ESP32 → 1re LED compte.

## Schéma de câblage

Voir **`esp32-ruban-unique-schema.svg`** (ouvrable dans un navigateur / en aperçu
markdown). Il montre : alim 5 V, rails +5 V / GND communs, ESP32 (data + GND),
level shifter 74HCT245 (A1/B1, VCC, DIR→5 V, OE→GND), résistance **330 Ω** en
série sur la data, condensateur **1000 µF** +/- aux bornes de l'alim, et
l'**injection 2e bout** du ruban.

## Distance ESP32 → 1re LED

Le signal est rapide (bit ~1,25 µs) et l'ESP32 sort en 3,3 V : sans précaution la
liaison capte du bruit / fait des réflexions.

- **3,3 V direct (pas de shifter)** : garder **≤ 10–15 cm**, idéalement **≤ 5 cm**.
- **Avec 74HCT245 + résistance 300–500 Ω** : confortable jusqu'à **~30–50 cm**.
- **Jusqu'à ~1 m** possible avec **paire torsadée (data + masse)** ou câble blindé,
  masse ramenée avec le signal.
- **Au-delà de ~1 m** : prévoir un répéteur de data (un pixel qui sert de relais,
  buffer dédié, ou liaison différentielle type RS485 + récepteur).

**Décision projet : liaison data ≤ ~20 cm** → largement dans la zone confortable
avec 74HCT245 + 330 Ω.

## Fréquence de rafraîchissement (fluidité)

Le plafond n'est pas 40 fps : c'est le **temps de transmission**.
`fps_max ≈ 1 / (N_led × ~30 µs)`.

| Nb LED sur 1 ligne | fps max théorique |
|---|---|
| 90 | ~370 fps |
| 168 | ~200 fps |
| 300 | ~110 fps |

En pratique sur ESP32 : **FastLED/RMT ~100–200 fps** (90 LED) ; **RMT + DMA** approche
du théorique. Au-delà des 40 fps actuels, viser **60–120 fps** suffit (l'œil sature
vers ~120). La vraie douceur vient surtout du **gamma + temporal dithering** et d'un
**timing régulier** (double-buffer, DMA), pas du fps brut. Le fps n'augmente pas la
conso (même luminosité).

## Langage / framework (frames générées sur l'ESP)

Critère n°1 : la **régularité du timing** (un jitter d'interpréteur/GC se voit plus
qu'un framerate un peu plus bas).

| Stack | Perf & timing | Écosystème | Verdict |
|---|---|---|---|
| **C++ + PlatformIO + FastLED** | excellent (natif, RMT/DMA) | énorme, exemples partout | **Recommandé par défaut** |
| **C++ + ESP-IDF** | max contrôle (driver RMT DMA) | officiel Espressif | pour pousser l'optim |
| **Rust (esp-hal / esp-idf-hal)** | très bon, sûr, natif | en croissance, + corsé | bon choix moderne |
| **MicroPython / CircuitPython** | correct mais jitter GC | très rapide à écrire | prototypage, pas la fluidité max |
| Espruino (JS) | faible | niche | à éviter ici |

**Base conseillée** : ESP32-S3 + PlatformIO + C++/FastLED (gamma + dithering
intégrés, `RMT` avec DMA/double-buffer ; I2S/parallèle si plusieurs lignes).
Prototyper d'abord les effets côté PC (rasterizer TS + web UI du projet), puis
**porter** les stratégies retenues — plus rapide que d'itérer sur la carte.
MicroPython : OK pour 90 LED (~50–100 fps) si la vélocité de dev prime.
Bonus : **WiFi OTA** pour flasher sans débrancher.
