# Dracula Air Quality Card

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
[![Validate with HACS](https://img.shields.io/github/actions/workflow/status/wakuwakumiwaku/dracula-air-quality-card/validate.yml?branch=main&label=HACS%20Validate&style=for-the-badge)](https://github.com/wakuwakumiwaku/dracula-air-quality-card/actions/workflows/validate.yml)
[![MIT License](https://img.shields.io/github/license/wakuwakumiwaku/dracula-air-quality-card?style=for-the-badge&color=bd93f9)](./LICENSE)

A zero-dependency Home Assistant Lovelace custom card built around a **Whole-Home Air Quality Overview** for grouped air purifiers and CO/CO₂/VOC/PM sensors — with optional focused modes for a single purifier or standalone air quality monitor — styled with the [Dracula](https://draculatheme.com/) palette.

![Dracula Air Quality Card Preview](./preview.png)

## Features

- **Whole-Home Air Quality Overview (Standard Default)** — Monitor and control every purifier and air quality sensor in your home from one card:
  - Live summary strip showing **Active Purifiers**, **Average PM2.5**, **Worst PM2.5**, **Max CO₂**, and a red **CO Warning** tile if any sensor detects elevated CO (`>= 35 ppm`) or an active CO/gas alarm.
  - One-tap master controls (**All Auto**, **All Sleep**, **All Off**) across all purifiers.
  - Native **`group_by`** sections (`type`, `room`, or `none`) with collapsible group headers (`Air Purifiers · N`, `Air Quality Sensors · N`) and **`All | Purifiers | Sensors`** filter tabs.
  - Compact expandable room rows that scale cleanly to 10+ rooms with inline purifier controls and full sensor drawers.
- **Optional Single-Device Modes** — When you want a dedicated card for one device:
  - **Single Purifier Mode (Optional)** — Hero PM2.5 gauge ring, health status pill, fan speed & operating mode controls, auto profile selector, CADR readout, filter life bar with low-filter warning, display & child lock toggles, and sleep timer.
  - **Standalone Air Quality Sensor Mode (Optional)** — Hero PM2.5 / CO₂ / AQI gauge ring with clickable metric tiles for **PM2.5, PM10, PM1.0, AQI, CO, CO₂, VOC, tVOC, NOₓ, NO₂, O₃, HCHO (Formaldehyde), Radon, Temperature, Humidity, and Pressure**, plus prominent red safety banners for elevated CO or active `co_alarm` / `gas_alarm` sensors.
- **Smart Auto-Discovery** — Point any purifier entry at a `fan.*` entity to discover sibling sensors and controls automatically by entity naming conventions **and** Home Assistant `device_class` (`carbon_monoxide`, `carbon_dioxide`, `volatile_organic_compounds`, `volatile_organic_compounds_parts`, `nitrogen_dioxide`, `ozone`, etc.), with attribute fallbacks and per-entity overrides.
- **Health & Safety Thresholds** — Color-coded severity bands for PM2.5 (WHO/EPA), CO (`<= 9`, `<= 35`, `<= 70`, `> 70` ppm), CO₂ (`<= 800`, `<= 1200`, `<= 1800`, `> 1800` ppm), unit-aware VOC/tVOC (VOC Index, `ppb`, `µg/m³`), HCHO, Radon (`Bq/m³` / `pCi/L`), NO₂, and O₃.
- **Fast & Responsive** — Lightweight state fingerprinting skips redundant Shadow DOM re-renders on unrelated Home Assistant ticks, while CSS `@container` queries keep layouts crisp from narrow 360px mobile screens to wide desktop dashboards.
- **Interactive History Graphs** — Click any gauge or metric tile to open Home Assistant's native `more-info` history dialog.
- **Dracula & Theme-Aware Styling** — Ships with the Dracula dark palette by default (`theme: "dracula"`), or set `theme: "auto"` to inherit your active Home Assistant light/dark theme variables.
- **Visual Editor Included** — Full Lovelace UI configuration editor (`dracula-air-quality-card-editor`) defaulting to Whole-Home Overview, with zero external dependencies.

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

## Quick Start: Whole-Home Air Quality Overview (Standard)

Adding the card through the Home Assistant UI automatically opens in **Whole-Home Overview** mode and pre-populates your discovered purifiers and air quality sensors.

Here is a complete YAML example combining 5 air purifiers and 3 standalone air quality / CO monitors with `group_by: type` (default):

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

- **Group by type (`group_by: type`, default):** Separates devices into collapsible **Air Purifiers** and **Air Quality Sensors** sections and displays `All | Purifiers | Sensors` filter tabs.
- **Group by room (`group_by: room`):** Groups entries by each item's `room` (or `group`) label, falling back to `"Other"`.
- **Flat list (`group_by: none`):** Shows all devices in a single list without section headers.

## Optional Single-Device Modes

If you also want a focused room card for a single purifier or standalone sensor, the same card supports both optional modes.

### Single Purifier Mode (Optional)

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

### Standalone Air Quality Sensor Mode (Optional)

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

## Options

### Main Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | `string` | **Required** | `custom:dracula-air-quality-card` |
| `devices` | `list` | — | **Standard mode:** List of entity IDs (`"fan.room"`) or device objects (`{ entity, name, room, group, sensors, ... }`) for Whole-Home Overview (alias: `entities`) |
| `group_by` | `string` | `"type"` | Overview grouping mode: `"type"` (`Air Purifiers` / `Air Quality Sensors`), `"room"` (by each item's `room` / `group` label), or `"none"` (flat list) |
| `entity` | `string` | — | Optional: Primary `fan.*` entity ID for Single Purifier Mode |
| `sensors` | `object` | — | Optional: Map of sensor entity IDs for Standalone AQ Sensor Mode (see Sensor Map below) |
| `mode` | `string` | Auto | `"overview"` (standard), `"purifier"`, or `"sensor"` (inferred automatically from `devices`, `entity`, or `sensors`) |
| `name` | `string` | `"Whole-Home Air Quality"` | Custom card header title |
| `theme` | `string` | `"dracula"` | `"dracula"` for built-in Dracula styling, or `"auto"` to inherit Home Assistant theme variables |
| `compact` | `boolean` | `false` | Reduces padding and vertical spacing for dense dashboards |
| `show_cadr` | `boolean` | `true` | Show CADR readout in Purifier Mode when available |
| `show_filter` | `boolean` | `true` | Show filter life progress bar when available |
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

Used in sensor-only entries inside `devices` and in optional Standalone Air Quality Sensor Mode:

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

To preview the Whole-Home Overview alongside the optional single-device modes locally without a Home Assistant instance:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/demo.html` in your browser. All controls (master buttons, filter tabs, collapsible group headers, expandable room rows, power, fan speed, operating mode, auto profile, display, child lock, and timer) are interactive.

## License

MIT — see [LICENSE](./LICENSE).
