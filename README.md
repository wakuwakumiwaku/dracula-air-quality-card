# Dracula Air Quality Card

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![Validate with HACS](https://img.shields.io/github/actions/workflow/status/wakuwakumiwaku/dracula-air-quality-card/validate.yml?branch=main&label=HACS%20Validate&style=for-the-badge)](https://github.com/wakuwakumiwaku/dracula-air-quality-card/actions/workflows/validate.yml)
[![MIT License](https://img.shields.io/github/license/wakuwakumiwaku/dracula-air-quality-card?style=for-the-badge&color=bd93f9)](./LICENSE)

A zero-dependency Home Assistant Lovelace custom card for air purifiers, standalone air quality & gas monitors, and whole-home air quality dashboards, styled with the [Dracula](https://draculatheme.com/) palette.

![Dracula Air Quality Card Preview](./preview.png)

## Features

- **Three display modes** in one card:
  - **Purifier Mode** — Hero PM2.5 gauge ring, health status pill, fan speed & operating mode controls, auto profile selector, CADR readout, filter life bar with low-filter warning, display & child lock toggles, and sleep timer.
  - **Standalone Air Quality Sensor Mode** — Hero PM2.5 / CO₂ / AQI gauge ring with responsive, clickable metric tiles for **PM2.5, PM10, PM1.0, AQI, CO, CO₂, VOC, tVOC, NOₓ, NO₂, O₃, HCHO (Formaldehyde), Radon, Temperature, Humidity, and Pressure**, plus red safety banners for elevated CO (`>= 35 ppm`) or active `co_alarm` / `gas_alarm` sensors.
  - **Whole-Home Overview Mode** — Summary strip (active purifiers, average PM2.5, worst PM2.5, max CO₂, and CO warning when triggered), master controls (**All Auto**, **All Sleep**, **All Off**), **`All | Purifiers | Sensors`** filter tabs, native **`group_by`** sections with collapsible headers, and compact expandable room rows that scale cleanly to 10+ devices.
- **Smart Auto-Discovery** — Point the card at a `fan.*` entity to discover sibling sensors and controls by entity naming conventions **and** Home Assistant `device_class` (`carbon_monoxide`, `carbon_dioxide`, `volatile_organic_compounds`, `volatile_organic_compounds_parts`, `nitrogen_dioxide`, `ozone`, etc.), with attribute fallbacks and explicit per-entity overrides.
- **Health & Safety Thresholds** — Color-coded severity bands for PM2.5 (WHO/EPA), CO (`<= 9`, `<= 35`, `<= 70`, `> 70` ppm), CO₂ (`<= 800`, `<= 1200`, `<= 1800`, `> 1800` ppm), unit-aware VOC/tVOC (VOC Index, `ppb`, `µg/m³`), HCHO, Radon (`Bq/m³` / `pCi/L`), NO₂, and O₃.
- **Fast & Responsive** — Lightweight state fingerprinting skips redundant Shadow DOM re-renders on unrelated Home Assistant ticks, while CSS `@container` queries keep layouts crisp from narrow 360px mobile screens to wide desktop dashboards.
- **Interactive History Graphs** — Click any gauge or metric tile to open Home Assistant's native `more-info` history dialog.
- **Dracula & Theme-Aware Styling** — Ships with the Dracula dark palette by default (`theme: "dracula"`), or set `theme: "auto"` to inherit your active Home Assistant light/dark theme variables.
- **Visual Editor Included** — Full Lovelace UI configuration editor (`dracula-air-quality-card-editor`) with zero external dependencies.

## Supported Purifiers & Air Quality Sensors

Works out of the box with:

- **Air Purifiers:**
  - **Levoit** — ESPHome (`tuct/levoit`) and VeSync integrations (Core 300S, Core 400S, Core 600S, Vital 100S/200S, etc.)
  - **Xiaomi MIoT** — Air Purifier 4, 4 Pro, 4 Compact, 3H, and compatible MIoT models
  - **Philips CoAP** — AirPurifier integration
  - **IKEA** — Starkvind air purifier
  - **Dyson** — Purifier Cool / Hot+Cool integrations
- **Air Quality & Gas Sensors:**
  - **Apollo Automation** — AIR-1 multi-sensor
  - **AirGradient** — ONE and Open Air monitors
  - **IKEA** — Vindstyrka air quality sensor
  - **Netatmo** — Smart Indoor Air Quality Monitor & Weather Station
  - **Awair** — Awair Element
  - **Qingping** — Air Monitor / Air Monitor Lite
  - **Aqara** — TVOC Air Quality Monitor
  - **Zigbee / Matter CO & Gas Detectors** — Any CO ppm sensor or `co_alarm` / `gas_alarm` binary sensor
  - **DIY ESPHome Sensors** — SCD40 / SCD41 (CO₂), SGP40 / SGP41 (VOC/NOₓ), MQ-7 (CO), PMS5003 / SEN55 (PM), and more
- **Generic Home Assistant Entities** — Any `fan.*`, `sensor.*`, `binary_sensor.*`, `select.*`, `switch.*`, `light.*`, `lock.*`, or `number.*` entity

## Installation

### HACS (Recommended)

1. Open **HACS** in Home Assistant.
2. Click the three-dots menu in the top right and select **Custom repositories**.
3. Add `https://github.com/wakuwakumiwaku/dracula-air-quality-card` with category **Dashboard** (or **Lovelace**).
4. Search for **Dracula Air Quality Card** and click **Download**.
5. Reload your browser cache (`Ctrl+Shift+R` / `Cmd+Shift+R`).

### Manual

1. Download `dracula-air-quality-card.js` from the latest release.
2. Copy it to `/config/www/dracula-air-quality-card.js`.
3. In Home Assistant, go to **Settings → Dashboards → Resources → Add Resource**:
   - **URL:** `/local/dracula-air-quality-card.js`
   - **Resource type:** `JavaScript Module`
4. Refresh your browser.

## Configuration Examples

### 1. Purifier Mode

Minimal configuration using automatic sibling entity discovery:

```yaml
type: custom:dracula-air-quality-card
entity: fan.bedroom_levoit_core_300s
name: Bedroom Purifier
```

With explicit entity overrides and display options:

```yaml
type: custom:dracula-air-quality-card
entity: fan.bedroom_levoit_core_300s
name: Bedroom Core 300S
theme: dracula
compact: false
show_cadr: true
show_filter: true
show_timer: true
pm25_entity: sensor.bedroom_levoit_core_300s_pm25
aqi_entity: sensor.bedroom_levoit_core_300s_air_quality_index
cadr_entity: sensor.bedroom_levoit_core_300s_cadr
filter_entity: sensor.bedroom_levoit_core_300s_filter_life_left
display_entity: switch.bedroom_levoit_core_300s_display
child_lock_entity: switch.bedroom_levoit_core_300s_display_lock
operating_mode_entity: select.bedroom_levoit_core_300s_fan_mode
auto_mode_entity: select.bedroom_levoit_core_300s_auto_mode
timer_entity: number.bedroom_levoit_core_300s_timer
timer_remaining_entity: sensor.bedroom_levoit_core_300s_timer_remaining
```

### 2. Standalone Air Quality Sensor Mode

Monitor CO, CO₂, VOC/tVOC, particulates, HCHO, Radon, or climate metrics without a purifier fan entity:

```yaml
type: custom:dracula-air-quality-card
mode: sensor
name: Office Air Monitor
sensors:
  pm25: sensor.office_air_pm25
  pm10: sensor.office_air_pm10
  co: sensor.office_air_co
  co2: sensor.office_air_co2
  voc: sensor.office_air_voc
  tvoc: sensor.office_air_tvoc
  temperature: sensor.office_air_temperature
  humidity: sensor.office_air_humidity
  co_alarm: binary_sensor.office_co_alarm
```

### 3. Whole-Home Overview Mode (with Grouping & Filter Tabs)

Group purifiers and air quality sensors cleanly using `group_by: type` (default), `group_by: room`, or `group_by: none`. When both purifiers and standalone sensors are present, `All | Purifiers | Sensors` filter tabs appear automatically and group headers can be clicked to collapse or expand each section:

```yaml
type: custom:dracula-air-quality-card
name: Whole-Home Air Quality
group_by: type
devices:
  - entity: fan.bedroom_levoit_core_300s
    name: Bedroom · Core 300S
    room: Upstairs
  - entity: fan.living_room_levoit_core_400s
    name: Living Room · Core 400S
    room: Main Floor
  - entity: fan.kitchen_levoit_vital_200s
    name: Kitchen · Vital 200S
    room: Main Floor
  - entity: fan.master_xiaomi_4_pro
    name: Master · Xiaomi 4 Pro
    room: Upstairs
  - entity: fan.nursery_ikea_starkvind
    name: Nursery · IKEA Starkvind
    room: Upstairs
  - name: Office Air Monitor
    room: Main Floor
    sensors:
      pm25: sensor.office_air_pm25
      pm10: sensor.office_air_pm10
      co: sensor.office_air_co
      co2: sensor.office_air_co2
      voc: sensor.office_air_voc
      tvoc: sensor.office_air_tvoc
      temperature: sensor.office_air_temperature
      humidity: sensor.office_air_humidity
  - name: Basement CO/CO₂/VOC
    room: Basement
    sensors:
      pm25: sensor.basement_air_pm25
      co: sensor.basement_air_co
      co2: sensor.basement_air_co2
      voc: sensor.basement_air_voc
      hcho: sensor.basement_air_hcho
      radon: sensor.basement_air_radon
      temperature: sensor.basement_air_temperature
      humidity: sensor.basement_air_humidity
  - name: Garage CO Detector
    room: Garage
    sensors:
      co: sensor.garage_co
      co_alarm: binary_sensor.garage_co_alarm
      temperature: sensor.garage_temperature
      humidity: sensor.garage_humidity
```

To group by floor or area instead, change `group_by: room` (each entry uses its `room` or `group` property, falling back to `"Other"`). Set `group_by: none` for a flat list.

## Options

### Main Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | `string` | **Required** | `custom:dracula-air-quality-card` |
| `entity` | `string` | — | Primary `fan.*` entity ID for Purifier Mode |
| `mode` | `string` | Auto | `"purifier"`, `"sensor"`, or `"overview"` (inferred automatically from `entity`, `sensors`, or `devices`) |
| `sensors` | `object` | — | Map of sensor entity IDs for Standalone AQ Sensor Mode (see Sensor Map below) |
| `devices` | `list` | — | List of entity IDs (`"fan.room"`) or device objects (`{ entity, name, room, group, sensors, ... }`) for Whole-Home Overview Mode (alias: `entities`) |
| `group_by` | `string` | `"type"` | Overview grouping mode: `"type"` (`Air Purifiers` / `Air Quality Sensors`), `"room"` (by each item's `room` / `group` label), or `"none"` (flat list) |
| `name` | `string` | Entity friendly name | Custom card header title |
| `theme` | `string` | `"dracula"` | `"dracula"` for built-in Dracula styling, or `"auto"` to inherit Home Assistant theme variables |
| `compact` | `boolean` | `false` | Reduces padding and vertical spacing for dense dashboards |
| `show_cadr` | `boolean` | `true` | Show CADR readout in Purifier Mode when available |
| `show_filter` | `boolean` | `true` | Show filter life progress bar in Purifier Mode when available |
| `show_timer` | `boolean` | `true` | Show timer controls and countdown in Purifier Mode when available |

### Purifier Entity Overrides

All optional — auto-discovered from the `entity` prefix and `device_class` when omitted:

| Option | Description |
| --- | --- |
| `pm25_entity` | PM2.5 sensor (`sensor.*`) |
| `pm10_entity` | PM10 sensor (`sensor.*`) |
| `pm1_entity` | PM1.0 sensor (`sensor.*`) |
| `aqi_entity` | Air Quality Index sensor (`sensor.*`) |
| `co_entity` | Carbon Monoxide sensor (`sensor.*`) |
| `co2_entity` | Carbon Dioxide sensor (`sensor.*`) |
| `voc_entity` | VOC Index / VOC sensor (`sensor.*`) |
| `tvoc_entity` | Total VOC (`ppb` / `µg/m³`) sensor (`sensor.*`) |
| `nox_entity` | NOₓ Index sensor (`sensor.*`) |
| `no2_entity` | Nitrogen Dioxide sensor (`sensor.*`) |
| `o3_entity` | Ozone sensor (`sensor.*`) |
| `hcho_entity` | Formaldehyde (HCHO) sensor (`sensor.*`) |
| `radon_entity` | Radon sensor (`sensor.*`) |
| `temperature_entity` | Temperature sensor (`sensor.*`) |
| `humidity_entity` | Humidity sensor (`sensor.*`) |
| `pressure_entity` | Barometric pressure sensor (`sensor.*`) |
| `co_alarm_entity` | Carbon Monoxide safety alarm (`binary_sensor.*`) |
| `gas_alarm_entity` | Combustible / gas leak alarm (`binary_sensor.*`) |
| `cadr_entity` | Clean Air Delivery Rate sensor (`sensor.*`) |
| `filter_entity` | Filter life percentage sensor (`sensor.*`) |
| `filter_low_entity` | Filter low warning (`binary_sensor.*`) |
| `display_entity` | Display/LED toggle (`switch.*` or `light.*`) |
| `child_lock_entity` | Child/display lock toggle (`switch.*` or `lock.*`) |
| `operating_mode_entity` | Operating mode selector (`select.*`) |
| `auto_mode_entity` | Auto-mode profile selector (`select.*`) |
| `timer_entity` | Sleep timer input (`number.*` or `select.*`) |
| `timer_remaining_entity` | Remaining timer readout (`sensor.*`) |
| `error_entity` | Device fault / error indicator (`binary_sensor.*` or `sensor.*`) |

### `sensors` Map Keys

Used in Standalone Air Quality Sensor Mode and sensor-only entries inside `devices`:

| Key | Measurement |
| --- | --- |
| `pm25` | PM2.5 (µg/m³) |
| `pm10` | PM10 (µg/m³) |
| `pm1` | PM1.0 (µg/m³) |
| `aqi` | Air Quality Index |
| `co` | Carbon Monoxide (ppm) |
| `co2` | Carbon Dioxide (ppm) |
| `voc` | VOC Index / µg/m³ |
| `tvoc` | Total VOC (ppb / µg/m³) |
| `nox` | NOₓ Index |
| `no2` | Nitrogen Dioxide (µg/m³ / ppb) |
| `o3` | Ozone (µg/m³ / ppb) |
| `hcho` | Formaldehyde (mg/m³ / µg/m³) |
| `radon` | Radon (Bq/m³ / pCi/L) |
| `temperature` | Temperature (°C / °F) |
| `humidity` | Relative Humidity (%) |
| `pressure` | Atmospheric Pressure (hPa) |
| `co_alarm` | Carbon Monoxide alarm (`binary_sensor.*`) |
| `gas_alarm` | Gas leak alarm (`binary_sensor.*`) |

## Local Demo

To preview all three modes locally without a Home Assistant instance:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/demo.html` in your browser. All controls (power, fan speed, operating mode, auto profile, display, child lock, timer, master buttons, filter tabs, collapsible group headers, and expandable room rows) are interactive.

## License

MIT — see [LICENSE](./LICENSE).
