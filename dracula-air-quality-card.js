/**
 * Dracula Air Quality Card for Home Assistant Lovelace
 * Zero-dependency ES module supporting:
 *   1. Purifier Mode (auto-discovers Levoit ESPHome/VeSync, Xiaomi MIoT, Philips CoAP, IKEA Starkvind, generic HA fans)
 *   2. Standalone Air Quality Sensor Mode (PM2.5, PM10, PM1, AQI, CO2, VOC, NOx, Temp, Humidity, Pressure)
 *   3. Whole-Home Overview Mode (mixed purifiers + standalone sensors, summary strip, master controls, expandable drawers)
 */

const CARD_VERSION = "1.0.0";

const SENSOR_KEYS = [
  "pm25",
  "pm10",
  "pm1",
  "aqi",
  "co",
  "co2",
  "voc",
  "tvoc",
  "nox",
  "no2",
  "o3",
  "hcho",
  "radon",
  "temperature",
  "humidity",
  "pressure",
];

const SENSOR_META = {
  pm25: { label: "PM2.5", defaultUnit: "µg/m³", decimals: 0 },
  pm10: { label: "PM10", defaultUnit: "µg/m³", decimals: 0 },
  pm1: { label: "PM1.0", defaultUnit: "µg/m³", decimals: 0 },
  aqi: { label: "AQI", defaultUnit: "", decimals: 0 },
  co: { label: "CO", defaultUnit: "ppm", decimals: 0 },
  co2: { label: "CO₂", defaultUnit: "ppm", decimals: 0 },
  voc: { label: "VOC", defaultUnit: "idx", decimals: 0 },
  tvoc: { label: "tVOC", defaultUnit: "ppb", decimals: 0 },
  nox: { label: "NOx", defaultUnit: "idx", decimals: 0 },
  no2: { label: "NO₂", defaultUnit: "µg/m³", decimals: 0 },
  o3: { label: "O₃", defaultUnit: "µg/m³", decimals: 0 },
  hcho: { label: "HCHO", defaultUnit: "mg/m³", decimals: 3 },
  radon: { label: "Radon", defaultUnit: "Bq/m³", decimals: 0 },
  temperature: { label: "Temp", defaultUnit: "°C", decimals: 1 },
  humidity: { label: "Humidity", defaultUnit: "%", decimals: 0 },
  pressure: { label: "Pressure", defaultUnit: "hPa", decimals: 0 },
};

const DEVICE_CLASS_TO_SENSOR = {
  pm25: "pm25",
  pm10: "pm10",
  pm1: "pm1",
  aqi: "aqi",
  carbon_monoxide: "co",
  carbon_dioxide: "co2",
  volatile_organic_compounds: "voc",
  volatile_organic_compounds_parts: "tvoc",
  nitrogen_dioxide: "no2",
  ozone: "o3",
  temperature: "temperature",
  humidity: "humidity",
  atmospheric_pressure: "pressure",
  pressure: "pressure",
};

const DISCOVERY_SUFFIXES = {
  pm25: [
    "sensor.{p}_pm25",
    "sensor.{p}_pm2_5",
    "sensor.{p}_pm_2_5",
    "sensor.{p}_pm25_density",
    "sensor.{p}_air_quality_pm25",
    "sensor.{p}_particulate_matter_2_5",
  ],
  pm10: [
    "sensor.{p}_pm10",
    "sensor.{p}_pm_10",
    "sensor.{p}_pm10_density",
    "sensor.{p}_particulate_matter_10",
  ],
  pm1: [
    "sensor.{p}_pm1",
    "sensor.{p}_pm_1",
    "sensor.{p}_pm1_0",
    "sensor.{p}_pm_1_0",
  ],
  aqi: [
    "sensor.{p}_air_quality",
    "sensor.{p}_aqi",
    "sensor.{p}_air_quality_index",
    "sensor.{p}_iaq",
    "sensor.{p}_air_quality_level",
  ],
  co: [
    "sensor.{p}_co",
    "sensor.{p}_carbon_monoxide",
    "sensor.{p}_co_level",
    "sensor.{p}_co_concentration",
  ],
  co_alarm: [
    "binary_sensor.{p}_co_alarm",
    "binary_sensor.{p}_carbon_monoxide",
    "binary_sensor.{p}_co_detected",
    "binary_sensor.{p}_co",
  ],
  gas_alarm: [
    "binary_sensor.{p}_gas_alarm",
    "binary_sensor.{p}_gas",
    "binary_sensor.{p}_gas_detected",
  ],
  co2: ["sensor.{p}_co2", "sensor.{p}_carbon_dioxide"],
  voc: [
    "sensor.{p}_voc",
    "sensor.{p}_voc_index",
    "sensor.{p}_volatile_organic_compounds",
  ],
  tvoc: [
    "sensor.{p}_tvoc",
    "sensor.{p}_total_voc",
    "sensor.{p}_volatile_organic_compounds_parts",
  ],
  nox: ["sensor.{p}_nox", "sensor.{p}_nox_index"],
  no2: ["sensor.{p}_no2", "sensor.{p}_nitrogen_dioxide"],
  o3: ["sensor.{p}_o3", "sensor.{p}_ozone"],
  hcho: ["sensor.{p}_hcho", "sensor.{p}_formaldehyde"],
  radon: ["sensor.{p}_radon", "sensor.{p}_radon_long_term", "sensor.{p}_radon_short_term"],
  temperature: ["sensor.{p}_temperature", "sensor.{p}_temp"],
  humidity: ["sensor.{p}_humidity", "sensor.{p}_relative_humidity"],
  pressure: ["sensor.{p}_pressure", "sensor.{p}_atmospheric_pressure"],
  cadr: [
    "sensor.{p}_cadr",
    "sensor.{p}_clean_air_delivery_rate",
    "sensor.{p}_airflow",
    "sensor.{p}_motor_speed",
    "sensor.{p}_fan_rpm",
  ],
  filter: [
    "sensor.{p}_filter_life",
    "sensor.{p}_filter_life_left",
    "sensor.{p}_filter_life_remaining",
    "sensor.{p}_filter_remaining",
    "sensor.{p}_filter_percentage",
    "sensor.{p}_hepa_filter",
    "sensor.{p}_filter",
  ],
  filter_low: [
    "binary_sensor.{p}_filter_low",
    "binary_sensor.{p}_filter_replace",
    "binary_sensor.{p}_replace_filter",
    "binary_sensor.{p}_filter_warning",
  ],
  display: [
    "switch.{p}_display",
    "switch.{p}_display_on",
    "switch.{p}_screen",
    "switch.{p}_led",
    "switch.{p}_panel_light",
    "light.{p}_display",
    "light.{p}_led",
  ],
  child_lock: [
    "lock.{p}_child_lock",
    "switch.{p}_child_lock",
    "switch.{p}_display_lock",
    "switch.{p}_physical_control_locked",
    "switch.{p}_lock",
  ],
  operating_mode: [
    "select.{p}_fan_mode",
    "select.{p}_operating_mode",
    "select.{p}_mode",
    "select.{p}_work_mode",
    "select.{p}_purifier_mode",
  ],
  auto_mode: [
    "select.{p}_auto_mode",
    "select.{p}_auto_profile",
    "select.{p}_auto_fan_mode",
    "select.{p}_auto_mode_profile",
  ],
  timer: [
    "number.{p}_timer",
    "number.{p}_off_timer",
    "number.{p}_sleep_timer",
    "select.{p}_timer",
    "input_number.{p}_timer",
  ],
  timer_remaining: [
    "sensor.{p}_timer_remaining",
    "sensor.{p}_time_remaining",
    "sensor.{p}_remaining_time",
    "sensor.{p}_off_timer_remaining",
    "sensor.{p}_timer_left",
  ],
  error: [
    "binary_sensor.{p}_error",
    "sensor.{p}_error",
    "binary_sensor.{p}_fault",
    "sensor.{p}_fault",
    "sensor.{p}_error_code",
  ],
};

const ICONS = {
  power: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>`,
  display: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  unlock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
  timer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5"/><path d="M9 2h6"/></svg>`,
  filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M6 12h12M9 18h6"/></svg>`,
  wind: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  sensor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>`,
};

/* ---------- Utility helpers ---------- */

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isUnavailable(state) {
  return (
    state === undefined ||
    state === null ||
    state === "" ||
    state === "unavailable" ||
    state === "unknown"
  );
}

function toNumber(val) {
  if (isUnavailable(val)) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function formatNum(val, decimals = 0) {
  const n = toNumber(val);
  if (n === null) return "—";
  if (decimals === 0) return String(Math.round(n));
  return n.toFixed(decimals);
}

function titleCase(str) {
  if (!str) return "";
  return String(str)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getFanPrefixes(fanEntityId) {
  if (!fanEntityId || !fanEntityId.includes(".")) return [];
  const slug = fanEntityId.split(".")[1];
  const stripped = slug.replace(
    /_(air_purifier|air_cleaner|purifier|cleaner|fan)$/,
    ""
  );
  return stripped && stripped !== slug ? [stripped, slug] : [slug];
}

function evaluatePM25(val) {
  const n = toNumber(val);
  if (n === null) return { label: "No Data", level: "muted", color: "var(--daq-muted)", pct: 0 };
  const pct = Math.min(100, Math.max(4, (n / 75) * 100));
  if (n <= 12) return { label: "Good", level: "good", color: "var(--daq-green)", pct };
  if (n <= 35) return { label: "Moderate", level: "moderate", color: "var(--daq-yellow)", pct };
  if (n <= 55) return { label: "Sensitive", level: "sensitive", color: "var(--daq-orange)", pct };
  if (n <= 150) return { label: "Unhealthy", level: "unhealthy", color: "var(--daq-red)", pct: Math.min(100, (n / 150) * 100) };
  return { label: "Hazardous", level: "hazardous", color: "var(--daq-pink)", pct: 100 };
}

function evaluateCO(val) {
  const n = toNumber(val);
  if (n === null) return { label: "No Data", level: "muted", color: "var(--daq-muted)", pct: 0 };
  const pct = Math.min(100, Math.max(4, (n / 100) * 100));
  if (n <= 9) return { label: "Good", level: "good", color: "var(--daq-green)", pct };
  if (n <= 35) return { label: "Elevated", level: "moderate", color: "var(--daq-yellow)", pct };
  if (n <= 70) return { label: "Dangerous", level: "sensitive", color: "var(--daq-orange)", pct };
  return { label: "Critical", level: "unhealthy", color: "var(--daq-red)", pct: 100 };
}

function evaluateCO2(val) {
  const n = toNumber(val);
  if (n === null) return { label: "No Data", level: "muted", color: "var(--daq-muted)", pct: 0 };
  const pct = Math.min(100, Math.max(6, ((n - 400) / 1600) * 100));
  if (n <= 800) return { label: "Good", level: "good", color: "var(--daq-green)", pct };
  if (n <= 1200) return { label: "Moderate", level: "moderate", color: "var(--daq-yellow)", pct };
  if (n <= 1800) return { label: "Poor", level: "sensitive", color: "var(--daq-orange)", pct };
  return { label: "Very Poor", level: "unhealthy", color: "var(--daq-red)", pct: 100 };
}

function evaluateVOC(val, unit = "") {
  const n = toNumber(val);
  if (n === null) return { label: "No Data", level: "muted", color: "var(--daq-muted)", pct: 0 };
  const u = String(unit || "").toLowerCase().trim();
  if (u === "ppb") {
    const pct = Math.min(100, Math.max(5, (n / 1500) * 100));
    if (n <= 220) return { label: "Good", level: "good", color: "var(--daq-green)", pct };
    if (n <= 660) return { label: "Moderate", level: "moderate", color: "var(--daq-yellow)", pct };
    if (n <= 1430) return { label: "Poor", level: "sensitive", color: "var(--daq-orange)", pct };
    return { label: "Very Poor", level: "unhealthy", color: "var(--daq-red)", pct: 100 };
  }
  if (u.includes("g/m")) {
    const ug = u.startsWith("mg") ? n * 1000 : n;
    const pct = Math.min(100, Math.max(5, (ug / 1200) * 100));
    if (ug <= 300) return { label: "Good", level: "good", color: "var(--daq-green)", pct };
    if (ug <= 500) return { label: "Moderate", level: "moderate", color: "var(--daq-yellow)", pct };
    if (ug <= 1000) return { label: "Poor", level: "sensitive", color: "var(--daq-orange)", pct };
    return { label: "Very Poor", level: "unhealthy", color: "var(--daq-red)", pct: 100 };
  }
  const pct = Math.min(100, Math.max(5, (n / 500) * 100));
  if (n <= 150) return { label: "Good", level: "good", color: "var(--daq-green)", pct };
  if (n <= 250) return { label: "Moderate", level: "moderate", color: "var(--daq-yellow)", pct };
  if (n <= 400) return { label: "Poor", level: "sensitive", color: "var(--daq-orange)", pct };
  return { label: "Very Poor", level: "unhealthy", color: "var(--daq-red)", pct: 100 };
}

function evaluateAQI(val) {
  const n = toNumber(val);
  if (n === null) {
    if (!isUnavailable(val)) {
      const s = String(val).toLowerCase();
      if (s.includes("good") || s.includes("very good") || s.includes("excellent"))
        return { label: titleCase(val), level: "good", color: "var(--daq-green)", pct: 20 };
      if (s.includes("moderate") || s.includes("fair"))
        return { label: titleCase(val), level: "moderate", color: "var(--daq-yellow)", pct: 45 };
      if (s.includes("poor") || s.includes("sensitive"))
        return { label: titleCase(val), level: "sensitive", color: "var(--daq-orange)", pct: 70 };
      return { label: titleCase(val), level: "unhealthy", color: "var(--daq-red)", pct: 90 };
    }
    return { label: "No Data", level: "muted", color: "var(--daq-muted)", pct: 0 };
  }
  if (n <= 5) {
    const map = [
      { label: "Good", level: "good", color: "var(--daq-green)", pct: 20 },
      { label: "Good", level: "good", color: "var(--daq-green)", pct: 25 },
      { label: "Moderate", level: "moderate", color: "var(--daq-yellow)", pct: 50 },
      { label: "Sensitive", level: "sensitive", color: "var(--daq-orange)", pct: 75 },
      { label: "Unhealthy", level: "unhealthy", color: "var(--daq-red)", pct: 92 },
      { label: "Hazardous", level: "hazardous", color: "var(--daq-pink)", pct: 100 },
    ];
    return map[Math.max(0, Math.min(5, Math.round(n)))];
  }
  const pct = Math.min(100, Math.max(5, (n / 200) * 100));
  if (n <= 50) return { label: "Good", level: "good", color: "var(--daq-green)", pct };
  if (n <= 100) return { label: "Moderate", level: "moderate", color: "var(--daq-yellow)", pct };
  if (n <= 150) return { label: "Sensitive", level: "sensitive", color: "var(--daq-orange)", pct };
  if (n <= 200) return { label: "Unhealthy", level: "unhealthy", color: "var(--daq-red)", pct };
  return { label: "Hazardous", level: "hazardous", color: "var(--daq-pink)", pct: 100 };
}

function evaluateMetricColor(key, val, unit = "") {
  const n = toNumber(val);
  if (n === null) return "var(--daq-muted)";
  const u = String(unit || "").toLowerCase().trim();
  switch (key) {
    case "pm25":
      return evaluatePM25(n).color;
    case "pm10":
      if (n <= 54) return "var(--daq-green)";
      if (n <= 154) return "var(--daq-yellow)";
      if (n <= 254) return "var(--daq-orange)";
      return "var(--daq-red)";
    case "pm1":
      if (n <= 10) return "var(--daq-green)";
      if (n <= 25) return "var(--daq-yellow)";
      if (n <= 50) return "var(--daq-orange)";
      return "var(--daq-red)";
    case "aqi":
      return evaluateAQI(n).color;
    case "co":
      return evaluateCO(n).color;
    case "co2":
      return evaluateCO2(n).color;
    case "voc":
    case "tvoc":
      return evaluateVOC(n, unit).color;
    case "nox":
      if (n <= 20) return "var(--daq-green)";
      if (n <= 150) return "var(--daq-yellow)";
      if (n <= 300) return "var(--daq-orange)";
      return "var(--daq-red)";
    case "no2": {
      const ug = u === "ppb" ? n * 1.88 : n;
      if (ug <= 40) return "var(--daq-green)";
      if (ug <= 100) return "var(--daq-yellow)";
      if (ug <= 200) return "var(--daq-orange)";
      return "var(--daq-red)";
    }
    case "o3": {
      const ug = u === "ppb" ? n * 1.96 : n;
      if (ug <= 100) return "var(--daq-green)";
      if (ug <= 160) return "var(--daq-yellow)";
      if (ug <= 240) return "var(--daq-orange)";
      return "var(--daq-red)";
    }
    case "hcho": {
      const ug = u.startsWith("mg") ? n * 1000 : u === "ppb" ? n * 1.23 : n;
      if (ug <= 30) return "var(--daq-green)";
      if (ug <= 80) return "var(--daq-yellow)";
      if (ug <= 120) return "var(--daq-orange)";
      return "var(--daq-red)";
    }
    case "radon": {
      const bq = u.includes("pci") ? n * 37 : n;
      if (bq <= 100) return "var(--daq-green)";
      if (bq <= 150) return "var(--daq-yellow)";
      if (bq <= 300) return "var(--daq-orange)";
      return "var(--daq-red)";
    }
    case "humidity":
      if (n >= 30 && n <= 60) return "var(--daq-cyan)";
      if (n >= 20 && n <= 70) return "var(--daq-yellow)";
      return "var(--daq-orange)";
    case "temperature":
      return "var(--daq-purple)";
    case "pressure":
      return "var(--daq-cyan)";
    default:
      return "var(--daq-purple)";
  }
}

function evaluateFilterColor(pct, isLow) {
  if (isLow) return "var(--daq-red)";
  const n = toNumber(pct);
  if (n === null) return "var(--daq-muted)";
  if (n <= 10) return "var(--daq-red)";
  if (n <= 25) return "var(--daq-orange)";
  if (n <= 45) return "var(--daq-yellow)";
  return "var(--daq-green)";
}

function formatTimerValue(val, unit) {
  const n = toNumber(val);
  if (n === null) {
    if (isUnavailable(val)) return null;
    const s = String(val).trim();
    if (/^(0|00:00(:00)?|off|none)$/i.test(s)) return null;
    return s;
  }
  if (n <= 0) return null;
  const u = (unit || "").toLowerCase();
  if (u.startsWith("h")) return `${n}h`;
  if (u.startsWith("s")) {
    const mins = Math.round(n / 60);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  }
  const mins = Math.round(n);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

/* ---------- Entity Discovery & State Resolution ---------- */

function resolveDeviceState(hass, itemConfig, discoveryCache = null) {
  const states = hass?.states || {};
  const cfg = typeof itemConfig === "string" ? { entity: itemConfig } : itemConfig || {};
  const fanId = cfg.entity || null;
  const fanState = fanId ? states[fanId] : null;
  const isPurifier = Boolean(fanId);
  const prefixes = isPurifier ? getFanPrefixes(fanId) : [];

  // Cache entity auto-discovery per device config when state keys haven't changed
  const cacheKey = isPurifier ? fanId : null;
  let dcMatches = null;
  let cachedMap = null;
  if (cacheKey && discoveryCache) {
    const entry = discoveryCache.get(cacheKey);
    if (entry) {
      dcMatches = entry.dcMatches;
      cachedMap = entry.map;
    }
  }

  if (!dcMatches) {
    dcMatches = {};
    if (isPurifier && prefixes.length) {
      for (const [eid, st] of Object.entries(states)) {
        const dc = st?.attributes?.device_class;
        if (!dc) continue;
        const isSens = eid.startsWith("sensor.");
        const isBin = eid.startsWith("binary_sensor.");
        if (!isSens && !isBin) continue;
        const slug = eid.split(".")[1] || "";
        if (!prefixes.some((p) => slug === p || slug.startsWith(`${p}_`))) continue;
        if (isBin && dc === "carbon_monoxide" && !dcMatches.co_alarm) dcMatches.co_alarm = eid;
        else if (isBin && dc === "gas" && !dcMatches.gas_alarm) dcMatches.gas_alarm = eid;
        else if (isSens && DEVICE_CLASS_TO_SENSOR[dc]) {
          const mapped = DEVICE_CLASS_TO_SENSOR[dc];
          if (!dcMatches[mapped]) dcMatches[mapped] = eid;
        }
      }
    }
    if (cacheKey && discoveryCache) {
      cachedMap = {};
      discoveryCache.set(cacheKey, { dcMatches, map: cachedMap });
    }
  }

  const watchedIds = new Set();
  if (fanId) watchedIds.add(fanId);

  const findEntity = (overrideId, key) => {
    if (overrideId) {
      watchedIds.add(overrideId);
      return overrideId;
    }
    if (!isPurifier) return null;
    if (cachedMap && key in cachedMap) {
      if (cachedMap[key]) watchedIds.add(cachedMap[key]);
      return cachedMap[key];
    }
    let found = null;
    const templates = DISCOVERY_SUFFIXES[key] || [];
    for (const p of prefixes) {
      for (const tpl of templates) {
        const candidate = tpl.replace("{p}", p);
        if (states[candidate]) {
          found = candidate;
          break;
        }
      }
      if (found) break;
    }
    if (!found && dcMatches[key]) found = dcMatches[key];
    if (cachedMap) cachedMap[key] = found;
    if (found) watchedIds.add(found);
    return found;
  };

  // Resolve sensors (supports both `<key>_entity` overrides and `sensors: { <key>: ... }`)
  const sensors = {};
  for (const key of SENSOR_KEYS) {
    const explicitId = cfg[`${key}_entity`] || (cfg.sensors && cfg.sensors[key]) || null;
    const entityId = findEntity(explicitId, key);
    const st = entityId ? states[entityId] : null;
    if (st && !isUnavailable(st.state)) {
      sensors[key] = {
        entityId,
        raw: st.state,
        num: toNumber(st.state),
        unit: st.attributes?.unit_of_measurement ?? SENSOR_META[key].defaultUnit,
      };
    } else if (explicitId) {
      sensors[key] = {
        entityId: explicitId,
        raw: null,
        num: null,
        unit: SENSOR_META[key].defaultUnit,
      };
    }
  }

  // Fallback to fan attributes for PM2.5 / AQI / Filter / CADR
  const fanAttrs = fanState?.attributes || {};
  if (!sensors.pm25) {
    const attrPm = fanAttrs.pm25 ?? fanAttrs.pm2_5 ?? fanAttrs.pm_2_5;
    if (!isUnavailable(attrPm)) {
      sensors.pm25 = { entityId: fanId, raw: attrPm, num: toNumber(attrPm), unit: "µg/m³" };
    }
  }
  if (!sensors.aqi) {
    const attrAqi = fanAttrs.aqi ?? fanAttrs.air_quality ?? fanAttrs.air_quality_index;
    if (!isUnavailable(attrAqi)) {
      sensors.aqi = { entityId: fanId, raw: attrAqi, num: toNumber(attrAqi), unit: "" };
    }
  }

  // Purifier-specific controls & diagnostics
  const cadrId = findEntity(cfg.cadr_entity, "cadr");
  const cadrSt = cadrId ? states[cadrId] : null;
  const cadrVal =
    cadrSt && !isUnavailable(cadrSt.state)
      ? {
          entityId: cadrId,
          num: toNumber(cadrSt.state),
          raw: cadrSt.state,
          unit: cadrSt.attributes?.unit_of_measurement || "m³/h",
        }
      : !isUnavailable(fanAttrs.cadr)
      ? { entityId: fanId, num: toNumber(fanAttrs.cadr), raw: fanAttrs.cadr, unit: "m³/h" }
      : null;

  const filterId = findEntity(cfg.filter_entity, "filter");
  const filterSt = filterId ? states[filterId] : null;
  const filterAttr =
    fanAttrs.filter_life ?? fanAttrs.filter_life_remaining ?? fanAttrs.filter_remaining;
  const filterVal =
    filterSt && !isUnavailable(filterSt.state)
      ? {
          entityId: filterId,
          num: toNumber(filterSt.state),
          unit: filterSt.attributes?.unit_of_measurement || "%",
        }
      : !isUnavailable(filterAttr)
      ? { entityId: fanId, num: toNumber(filterAttr), unit: "%" }
      : null;

  const filterLowId = findEntity(cfg.filter_low_entity, "filter_low");
  const filterLowSt = filterLowId ? states[filterLowId] : null;
  const filterLow = filterLowSt?.state === "on";

  const displayId = findEntity(cfg.display_entity, "display");
  const displaySt = displayId ? states[displayId] : null;

  const childLockId = findEntity(cfg.child_lock_entity, "child_lock");
  const childLockSt = childLockId ? states[childLockId] : null;
  const childLockOn = childLockSt
    ? childLockSt.state === "locked" || childLockSt.state === "on"
    : false;

  const opModeId = findEntity(cfg.operating_mode_entity, "operating_mode");
  const opModeSt = opModeId ? states[opModeId] : null;

  const autoModeId = findEntity(cfg.auto_mode_entity, "auto_mode");
  const autoModeSt = autoModeId ? states[autoModeId] : null;

  const timerId = findEntity(cfg.timer_entity, "timer");
  const timerSt = timerId ? states[timerId] : null;

  const timerRemId = findEntity(cfg.timer_remaining_entity, "timer_remaining");
  const timerRemSt = timerRemId ? states[timerRemId] : null;

  const coAlarmId = findEntity(cfg.co_alarm_entity || cfg.sensors?.co_alarm, "co_alarm");
  const coAlarmSt = coAlarmId ? states[coAlarmId] : null;
  const gasAlarmId = findEntity(cfg.gas_alarm_entity || cfg.sensors?.gas_alarm, "gas_alarm");
  const gasAlarmSt = gasAlarmId ? states[gasAlarmId] : null;
  const coAlarmOn = coAlarmSt?.state === "on";
  const gasAlarmOn = gasAlarmSt?.state === "on";
  const coNum = sensors.co?.num ?? null;
  const coDanger = coAlarmOn || gasAlarmOn || (coNum !== null && coNum >= 35);

  const errorId = findEntity(cfg.error_entity, "error");
  const errorSt = errorId ? states[errorId] : null;
  const hasError =
    errorSt &&
    !isUnavailable(errorSt.state) &&
    errorSt.state !== "off" &&
    errorSt.state !== "none" &&
    errorSt.state !== "0" &&
    errorSt.state !== "ok";

  // Modes & speed
  let modes = [];
  let currentMode = null;
  let modeSource = null;
  if (opModeSt && Array.isArray(opModeSt.attributes?.options) && opModeSt.attributes.options.length) {
    modes = opModeSt.attributes.options;
    currentMode = opModeSt.state;
    modeSource = { type: "select", entityId: opModeId };
  } else if (Array.isArray(fanAttrs.preset_modes) && fanAttrs.preset_modes.length) {
    modes = fanAttrs.preset_modes;
    currentMode = fanAttrs.preset_mode || null;
    modeSource = { type: "fan", entityId: fanId };
  }

  const autoModes =
    autoModeSt && Array.isArray(autoModeSt.attributes?.options)
      ? autoModeSt.attributes.options
      : [];
  const currentAutoMode = autoModeSt ? autoModeSt.state : null;

  const isOn = fanState ? fanState.state === "on" : false;
  const percentage = toNumber(fanAttrs.percentage);
  const percentageStep = toNumber(fanAttrs.percentage_step) || 25;

  // Determine display name
  const friendlyName =
    cfg.name ||
    fanAttrs.friendly_name ||
    (fanId ? titleCase(fanId.split(".")[1]) : "Air Quality");

  // Format timer label
  const timerLabel = timerRemSt
    ? formatTimerValue(timerRemSt.state, timerRemSt.attributes?.unit_of_measurement)
    : timerSt
    ? formatTimerValue(timerSt.state, timerSt.attributes?.unit_of_measurement)
    : null;

  const isUnavailableDevice = isPurifier && (!fanState || isUnavailable(fanState.state));
  const isFilterLowAlert = filterLow || (filterVal?.num !== null && filterVal?.num !== undefined && filterVal.num <= 10);

  return {
    cfg,
    isPurifier,
    isUnavailable: isUnavailableDevice,
    name: friendlyName,
    group: cfg.group || cfg.room || null,
    fanId,
    fanState,
    isOn,
    percentage,
    percentageStep,
    sensors,
    coAlarm: coAlarmOn ? { entityId: coAlarmId, type: "CO Alarm" } : gasAlarmOn ? { entityId: gasAlarmId, type: "Gas Alarm" } : null,
    coDanger,
    cadr: cadrVal,
    filter: filterVal,
    filterLow: isFilterLowAlert,
    watchedIds: Array.from(watchedIds),
    display: displaySt ? { entityId: displayId, on: displaySt.state === "on", domain: displayId.split(".")[0] } : null,
    childLock: childLockSt ? { entityId: childLockId, on: childLockOn, domain: childLockId.split(".")[0] } : null,
    modes,
    currentMode,
    modeSource,
    autoMode: autoModeSt ? { entityId: autoModeId, options: autoModes, current: currentAutoMode } : null,
    timer: timerSt ? { entityId: timerId, state: timerSt.state, domain: timerId.split(".")[0], attrs: timerSt.attributes || {} } : null,
    timerRemaining: timerRemSt ? { entityId: timerRemId, state: timerRemSt.state, unit: timerRemSt.attributes?.unit_of_measurement } : null,
    timerLabel,
    error: hasError ? { entityId: errorId, message: errorSt.state === "on" ? "Error" : String(errorSt.state) } : null,
  };
}

/* ---------- Styles ---------- */

const CARD_STYLES = `
  :host {
    display: block;
    container-type: inline-size;
    font-family: var(--paper-font-body1_-_font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    --daq-bg: #282a36;
    --daq-surface: #21222c;
    --daq-surface-2: #313444;
    --daq-current: #44475a;
    --daq-border: rgba(98, 114, 164, 0.28);
    --daq-fg: #f8f8f2;
    --daq-subtext: #b8c0e0;
    --daq-muted: #6272a4;
    --daq-purple: #bd93f9;
    --daq-pink: #ff79c6;
    --daq-cyan: #8be9fd;
    --daq-green: #50fa7b;
    --daq-yellow: #f1fa8c;
    --daq-orange: #ffb86c;
    --daq-red: #ff5555;
    --daq-radius: 16px;
    --daq-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  }

  :host([data-theme="auto"]) {
    --daq-bg: var(--ha-card-background, var(--card-background-color, #282a36));
    --daq-surface: var(--secondary-background-color, rgba(127, 127, 127, 0.08));
    --daq-surface-2: var(--secondary-background-color, rgba(127, 127, 127, 0.14));
    --daq-current: var(--divider-color, rgba(127, 127, 127, 0.24));
    --daq-border: var(--divider-color, rgba(127, 127, 127, 0.22));
    --daq-fg: var(--primary-text-color, #f8f8f2);
    --daq-subtext: var(--secondary-text-color, #b8c0e0);
    --daq-muted: var(--secondary-text-color, #8892b0);
    --daq-purple: var(--primary-color, #bd93f9);
    --daq-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.12));
  }

  @media (prefers-color-scheme: light) {
    :host([data-theme="auto"]) {
      --daq-green: #16a34a;
      --daq-yellow: #ca8a04;
      --daq-orange: #ea580c;
      --daq-red: #dc2626;
      --daq-cyan: #0891b2;
      --daq-pink: #db2777;
    }
  }

  * { box-sizing: border-box; }

  button:focus-visible,
  [role="button"]:focus-visible {
    outline: 2px solid var(--daq-purple);
    outline-offset: 2px;
  }

  .card {
    background: var(--daq-bg);
    color: var(--daq-fg);
    border: 1px solid var(--daq-border);
    border-radius: var(--daq-radius);
    box-shadow: var(--daq-shadow), inset 0 1px 0 rgba(248, 248, 242, 0.05);
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    position: relative;
    overflow: hidden;
  }

  .card.compact {
    padding: 13px 14px;
    gap: 10px;
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .title-wrap {
    min-width: 0;
    flex: 1;
  }

  .title {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--daq-fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .subtitle {
    font-size: 12px;
    color: var(--daq-subtext);
    margin-top: 2px;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .error-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(255, 85, 85, 0.16);
    border: 1px solid rgba(255, 85, 85, 0.45);
    color: var(--daq-red);
    font-size: 11px;
    font-weight: 600;
  }
  .error-badge svg { width: 13px; height: 13px; }

  .power-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1px solid var(--daq-border);
    background: var(--daq-surface);
    color: var(--daq-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.18s ease;
    padding: 0;
  }
  .power-btn svg { width: 18px; height: 18px; }
  .power-btn:hover { border-color: var(--daq-purple); color: var(--daq-fg); }
  .power-btn.on {
    background: rgba(189, 147, 249, 0.18);
    border-color: var(--daq-purple);
    color: var(--daq-purple);
    box-shadow: 0 0 14px rgba(189, 147, 249, 0.25);
  }
  .power-btn.sm {
    width: 28px;
    height: 28px;
  }
  .power-btn.sm svg { width: 14px; height: 14px; }

  /* Hero Gauge */
  .hero {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .card.compact .hero { gap: 12px; }

  .gauge-wrap {
    position: relative;
    width: 112px;
    height: 112px;
    flex-shrink: 0;
    cursor: pointer;
  }
  .card.compact .gauge-wrap {
    width: 90px;
    height: 90px;
  }
  .gauge-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  .gauge-track {
    fill: none;
    stroke: var(--daq-current);
    stroke-width: 8;
    opacity: 0.55;
  }
  .gauge-progress {
    fill: none;
    stroke-width: 8;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease;
  }
  .gauge-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    pointer-events: none;
  }
  .gauge-value {
    font-size: 26px;
    font-weight: 800;
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
    color: var(--daq-fg);
  }
  .card.compact .gauge-value { font-size: 21px; }
  .gauge-unit {
    font-size: 10px;
    font-weight: 600;
    color: var(--daq-subtext);
    margin-top: 2px;
    letter-spacing: 0.02em;
  }
  .gauge-metric {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--daq-muted);
    margin-bottom: 1px;
  }

  .hero-details {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .health-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.02em;
    width: fit-content;
    background: var(--daq-surface);
    border: 1px solid var(--daq-border);
  }
  .health-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* Stat Bars & Chips */
  .stat-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .stat-chip {
    background: var(--daq-surface);
    border: 1px solid var(--daq-border);
    border-radius: 10px;
    padding: 6px 10px;
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    cursor: pointer;
    transition: border-color 0.15s ease;
  }
  .stat-chip:hover { border-color: var(--daq-purple); }
  .stat-chip svg { width: 14px; height: 14px; color: var(--daq-cyan); flex-shrink: 0; }
  .stat-chip .k { color: var(--daq-subtext); font-size: 11px; }
  .stat-chip .v { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--daq-fg); }

  .filter-block {
    background: var(--daq-surface);
    border: 1px solid var(--daq-border);
    border-radius: 10px;
    padding: 7px 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    cursor: pointer;
  }
  .filter-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11.5px;
  }
  .filter-label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--daq-subtext);
  }
  .filter-label svg { width: 13px; height: 13px; }
  .filter-pct { font-weight: 700; font-variant-numeric: tabular-nums; }
  .bar-track {
    height: 5px;
    border-radius: 999px;
    background: var(--daq-current);
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.35s ease;
  }

  /* Controls */
  .section-label {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--daq-muted);
    margin-bottom: 5px;
  }

  .pill-group {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .pill-btn {
    border: 1px solid var(--daq-border);
    background: var(--daq-surface);
    color: var(--daq-subtext);
    border-radius: 10px;
    padding: 6px 11px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .pill-btn:hover {
    border-color: var(--daq-purple);
    color: var(--daq-fg);
  }
  .pill-btn.active {
    background: rgba(189, 147, 249, 0.2);
    border-color: var(--daq-purple);
    color: var(--daq-fg);
  }
  .pill-btn.active-cyan {
    background: rgba(139, 233, 253, 0.16);
    border-color: var(--daq-cyan);
    color: var(--daq-cyan);
  }
  .pill-btn svg { width: 14px; height: 14px; }
  .pill-btn.xs { padding: 4px 8px; font-size: 11px; border-radius: 8px; }

  /* Speed Slider / Steps */
  .speed-wrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .speed-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11.5px;
    color: var(--daq-subtext);
  }
  .speed-val {
    font-weight: 700;
    color: var(--daq-cyan);
    font-variant-numeric: tabular-nums;
  }
  .speed-steps {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .speed-step {
    height: 28px;
    border-radius: 8px;
    border: 1px solid var(--daq-border);
    background: var(--daq-surface);
    color: var(--daq-subtext);
    font-size: 11.5px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .speed-step:hover { border-color: var(--daq-cyan); color: var(--daq-fg); }
  .speed-step.filled {
    background: rgba(139, 233, 253, 0.16);
    border-color: rgba(139, 233, 253, 0.45);
    color: var(--daq-cyan);
  }
  .speed-step.current {
    background: rgba(189, 147, 249, 0.24);
    border-color: var(--daq-purple);
    color: var(--daq-fg);
  }

  /* Utility row */
  .utility-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 7px;
    padding-top: 2px;
  }

  /* Sensor Tiles Grid */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
    gap: 8px;
  }
  .card.compact .metrics-grid {
    grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
    gap: 6px;
  }

  .metric-tile {
    background: var(--daq-surface);
    border: 1px solid var(--daq-border);
    border-radius: 12px;
    padding: 10px 11px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    position: relative;
    cursor: pointer;
    transition: transform 0.14s ease, border-color 0.15s ease;
    overflow: hidden;
  }
  .metric-tile::before {
    content: "";
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: var(--tile-accent, var(--daq-purple));
  }
  .metric-tile:hover {
    border-color: var(--daq-purple);
    transform: translateY(-1px);
  }
  .metric-label {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--daq-subtext);
    padding-left: 4px;
  }
  .metric-val-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
    padding-left: 4px;
  }
  .metric-val {
    font-size: 18px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--daq-fg);
    line-height: 1.1;
  }
  .metric-unit {
    font-size: 10.5px;
    color: var(--daq-muted);
    font-weight: 600;
  }

  /* Overview Mode */
  .summary-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(95px, 1fr));
    gap: 8px;
  }
  .summary-tile {
    background: var(--daq-surface);
    border: 1px solid var(--daq-border);
    border-radius: 12px;
    padding: 9px 11px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .summary-k {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--daq-muted);
  }
  .summary-v {
    font-size: 17px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--daq-fg);
    line-height: 1.2;
  }
  .summary-sub {
    font-size: 10.5px;
    color: var(--daq-subtext);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .master-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .room-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .room-item {
    background: var(--daq-surface);
    border: 1px solid var(--daq-border);
    border-radius: 12px;
    overflow: hidden;
    transition: border-color 0.15s ease;
  }
  .room-item.expanded {
    border-color: rgba(189, 147, 249, 0.5);
  }

  .room-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 12px;
    cursor: pointer;
    user-select: none;
    transition: background 0.14s ease;
  }
  .room-row:hover {
    background: rgba(68, 71, 90, 0.35);
  }

  .room-left {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
    flex: 1;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .room-meta {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .room-name {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--daq-fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .room-sub {
    font-size: 11px;
    color: var(--daq-subtext);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .room-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .mini-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    background: var(--daq-bg);
    border: 1px solid var(--daq-border);
    color: var(--daq-fg);
  }
  .mini-badge .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .chevron {
    width: 16px;
    height: 16px;
    color: var(--daq-muted);
    transition: transform 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .room-item.expanded .chevron {
    transform: rotate(180deg);
    color: var(--daq-purple);
  }

  .room-drawer {
    padding: 10px 12px 12px;
    border-top: 1px solid var(--daq-border);
    background: rgba(40, 42, 54, 0.55);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .empty-state {
    padding: 20px;
    text-align: center;
    color: var(--daq-subtext);
    font-size: 13px;
    background: var(--daq-surface);
    border-radius: 12px;
    border: 1px dashed var(--daq-border);
  }

  .safety-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 13px;
    border-radius: 12px;
    background: rgba(255, 85, 85, 0.16);
    border: 1px solid rgba(255, 85, 85, 0.65);
    color: #ff6e6e;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
  }
  .safety-banner svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: var(--daq-red);
  }
  .safety-banner .sub {
    font-weight: 500;
    color: var(--daq-fg);
    margin-left: 4px;
  }

  .filter-tabs {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px;
    border-radius: 10px;
    background: var(--daq-surface);
    border: 1px solid var(--daq-border);
    width: fit-content;
  }
  .filter-tab {
    border: none;
    background: transparent;
    color: var(--daq-subtext);
    padding: 4px 10px;
    border-radius: 7px;
    font-size: 11.5px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .filter-tab:hover { color: var(--daq-fg); }
  .filter-tab.active {
    background: rgba(189, 147, 249, 0.22);
    color: var(--daq-fg);
  }

  .group-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--daq-purple);
    padding: 5px 4px 2px;
    border: none;
    background: transparent;
    width: 100%;
    cursor: pointer;
    font-family: inherit;
    border-radius: 6px;
    transition: background 0.15s ease;
  }
  .group-header:hover { background: rgba(189, 147, 249, 0.08); }
  .group-header .g-chev {
    width: 14px;
    height: 14px;
    color: var(--daq-muted);
    transition: transform 0.2s ease;
    display: inline-flex;
  }
  .group-section.collapsed .group-header .g-chev { transform: rotate(-90deg); }
  .group-count {
    color: var(--daq-muted);
    font-weight: 600;
  }

  .offline-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 600;
    color: var(--daq-muted);
    border: 1px dashed var(--daq-muted);
    background: transparent;
  }

  .filter-low-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    color: var(--daq-orange);
    border: 1px solid rgba(255, 184, 108, 0.5);
    background: rgba(255, 184, 108, 0.14);
  }
  .filter-low-badge svg { width: 12px; height: 12px; }

  .summary-tile.alert {
    border-color: rgba(255, 85, 85, 0.6);
    background: rgba(255, 85, 85, 0.12);
  }
  .mini-badge.alert {
    border-color: rgba(255, 85, 85, 0.65);
    background: rgba(255, 85, 85, 0.18);
    color: #ff6e6e;
  }

  /* Responsive: narrow cards & mobile viewports */
  @container (max-width: 390px) {
    .card { padding: 14px 12px; gap: 11px; }
    .header { flex-wrap: wrap; gap: 8px; }
    .master-bar { width: 100%; }
    .master-bar .pill-btn { flex: 1; justify-content: center; min-height: 36px; }
    .summary-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
    .hero { gap: 12px; }
    .gauge-wrap { width: 92px; height: 92px; }
    .gauge-value { font-size: 21px; }
    .metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
    .room-row { padding: 10px 9px; gap: 6px; min-height: 44px; }
    .room-right { gap: 4px; flex-wrap: nowrap; }
    .mini-badge { padding: 3px 6px; font-size: 10.5px; }
    .power-btn.sm { width: 34px; height: 34px; }
    .pill-btn, .filter-tab, .speed-step { min-height: 36px; }
    .filter-tabs { width: 100%; }
    .filter-tab { flex: 1; text-align: center; padding: 6px 6px; }
  }

  @media (max-width: 420px) {
    .card { padding: 14px 12px; gap: 11px; }
    .header { flex-wrap: wrap; gap: 8px; }
    .summary-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
    .room-row { padding: 10px 9px; min-height: 44px; }
    .power-btn.sm { width: 34px; height: 34px; }
    .pill-btn, .filter-tab, .speed-step { min-height: 36px; }
  }
`;

/* ---------- Main Card Component ---------- */

class DraculaAirQualityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._expanded = new Set();
    this._collapsedGroups = new Set();
    this._filter = "all";
    this._discoveryCache = new Map();
    this._lastStateCount = -1;
    this._lastRenderSig = null;
    this._watchedIds = [];
    this._boundClick = this._onClick.bind(this);
    this._boundKeydown = this._onKeydown.bind(this);
  }

  static getConfigElement() {
    return document.createElement("dracula-air-quality-card-editor");
  }

  static getStubConfig(hass) {
    const states = hass?.states || {};
    const firstFan = Object.keys(states).find((id) => id.startsWith("fan."));
    if (firstFan) {
      return { entity: firstFan, theme: "dracula" };
    }
    return { entity: "fan.air_purifier", theme: "dracula" };
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    const hasDevices =
      (Array.isArray(config.devices) && config.devices.length > 0) ||
      (Array.isArray(config.entities) && config.entities.length > 0);
    const hasSensors = config.sensors && typeof config.sensors === "object" && Object.keys(config.sensors).length > 0;
    const hasEntity = Boolean(config.entity);

    if (!hasDevices && !hasSensors && !hasEntity && config.mode !== "sensor" && config.mode !== "overview") {
      throw new Error("Please specify an `entity`, `sensors`, or `devices` list.");
    }

    this._config = {
      theme: "dracula",
      compact: false,
      show_cadr: true,
      show_filter: true,
      show_timer: true,
      group_by: "type",
      ...config,
    };

    this._discoveryCache.clear();
    this._lastStateCount = -1;
    this._lastRenderSig = null;
    this._watchedIds = [];
    this.setAttribute("data-theme", this._config.theme === "auto" ? "auto" : "dracula");
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    const states = hass?.states || {};
    const stateCount = Object.keys(states).length;
    if (stateCount !== this._lastStateCount) {
      this._discoveryCache.clear();
      this._lastStateCount = stateCount;
      this._lastRenderSig = null;
    }
    if (this._lastRenderSig !== null && this._watchedIds.length > 0) {
      const sig = this._computeRenderSignature(states);
      if (sig === this._lastRenderSig) return;
    }
    this._render();
  }

  _computeRenderSignature(states) {
    let sig = `${this._filter}|${[...this._expanded].join(",")}|${[...this._collapsedGroups].join(",")}`;
    for (let i = 0; i < this._watchedIds.length; i++) {
      const id = this._watchedIds[i];
      const st = states[id];
      if (!st) {
        sig += `|${id}:-`;
        continue;
      }
      const a = st.attributes || {};
      sig += `|${id}:${st.state}:${a.percentage ?? ""}:${a.preset_mode ?? ""}:${a.unit_of_measurement ?? ""}:${a.device_class ?? ""}:${a.pm25 ?? ""}:${a.aqi ?? ""}:${a.filter_life ?? ""}:${a.cadr ?? ""}:${a.options ? a.options.length : ""}`;
    }
    return sig;
  }

  get _mode() {
    if (!this._config) return "purifier";
    const list = this._config.devices || this._config.entities;
    if (this._config.mode === "overview" || (Array.isArray(list) && list.length > 0)) {
      return "overview";
    }
    if (this._config.mode === "sensor" || (!this._config.entity && this._config.sensors)) {
      return "sensor";
    }
    return "purifier";
  }

  getCardSize() {
    if (!this._config) return 3;
    if (this._mode === "overview") {
      const list = this._config.devices || this._config.entities || [];
      return Math.max(3, 2 + Math.ceil(list.length * 0.9));
    }
    if (this._mode === "sensor") {
      return this._config.compact ? 3 : 4;
    }
    return this._config.compact ? 4 : 5;
  }

  getGridOptions() {
    const rows = this.getCardSize();
    return {
      columns: 12,
      min_columns: 6,
      rows,
      min_rows: 3,
    };
  }

  connectedCallback() {
    this.shadowRoot.addEventListener("click", this._boundClick);
    this.shadowRoot.addEventListener("keydown", this._boundKeydown);
    this._lastRenderSig = null;
    this._render();
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener("click", this._boundClick);
    this.shadowRoot.removeEventListener("keydown", this._boundKeydown);
  }

  _onKeydown(e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    const target = e.target.closest("[data-action]");
    if (!target || target.tagName === "BUTTON") return;
    e.preventDefault();
    target.click();
  }

  /* ---------- Service Calls & Actions ---------- */

  _callService(domain, service, data) {
    if (!this._hass) return;
    this._hass.callService(domain, service, data);
  }

  _fireMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId },
      })
    );
  }

  _togglePower(dev) {
    if (!dev?.fanId) return;
    this._callService("fan", dev.isOn ? "turn_off" : "turn_on", {
      entity_id: dev.fanId,
    });
  }

  _setMode(dev, mode) {
    if (!dev || !mode) return;
    if (dev.modeSource?.type === "select") {
      this._callService("select", "select_option", {
        entity_id: dev.modeSource.entityId,
        option: mode,
      });
    } else if (dev.fanId) {
      this._callService("fan", "set_preset_mode", {
        entity_id: dev.fanId,
        preset_mode: mode,
      });
    }
    if (!dev.isOn && dev.fanId) {
      this._callService("fan", "turn_on", { entity_id: dev.fanId });
    }
  }

  _setAutoMode(dev, option) {
    if (!dev?.autoMode?.entityId || !option) return;
    this._callService("select", "select_option", {
      entity_id: dev.autoMode.entityId,
      option,
    });
  }

  _setSpeed(dev, pct) {
    if (!dev?.fanId) return;
    const val = Math.max(0, Math.min(100, Number(pct)));
    this._callService("fan", "set_percentage", {
      entity_id: dev.fanId,
      percentage: val,
    });
  }

  _toggleDisplay(dev) {
    if (!dev?.display) return;
    this._callService(
      dev.display.domain,
      dev.display.on ? "turn_off" : "turn_on",
      { entity_id: dev.display.entityId }
    );
  }

  _toggleChildLock(dev) {
    if (!dev?.childLock) return;
    const { domain, entityId, on } = dev.childLock;
    if (domain === "lock") {
      this._callService("lock", on ? "unlock" : "lock", { entity_id: entityId });
    } else {
      this._callService(domain, on ? "turn_off" : "turn_on", { entity_id: entityId });
    }
  }

  _cycleTimer(dev) {
    if (!dev?.timer) return;
    const { domain, entityId, state, attrs } = dev.timer;
    if (domain === "select" && Array.isArray(attrs.options) && attrs.options.length) {
      const idx = attrs.options.indexOf(state);
      const next = attrs.options[(idx + 1) % attrs.options.length];
      this._callService("select", "select_option", { entity_id: entityId, option: next });
      return;
    }
    const unit = (attrs.unit_of_measurement || "min").toLowerCase();
    const presets = unit.startsWith("h") ? [0, 1, 2, 4, 8] : [0, 30, 60, 120, 240];
    const maxVal = toNumber(attrs.max);
    const valid = maxVal ? presets.filter((p) => p <= maxVal) : presets;
    const cur = toNumber(state) || 0;
    const next = valid.find((p) => p > cur) ?? valid[0];
    this._callService(domain, "set_value", { entity_id: entityId, value: next });
  }

  _applyMasterAction(action, devices) {
    for (const dev of devices) {
      if (!dev.isPurifier) continue;
      if (action === "off") {
        this._callService("fan", "turn_off", { entity_id: dev.fanId });
      } else if (action === "auto" || action === "sleep") {
        if (!dev.isOn) {
          this._callService("fan", "turn_on", { entity_id: dev.fanId });
        }
        const match = dev.modes.find((m) => m.toLowerCase().includes(action));
        if (match) {
          this._setMode(dev, match);
        }
      }
    }
  }

  /* ---------- Event Delegation ---------- */

  _onClick(e) {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const idx = target.dataset.idx !== undefined ? Number(target.dataset.idx) : null;

    if (action === "more-info") {
      e.stopPropagation();
      this._fireMoreInfo(target.dataset.entity);
      return;
    }

    if (action === "toggle-drawer" && idx !== null) {
      if (this._expanded.has(idx)) this._expanded.delete(idx);
      else this._expanded.add(idx);
      this._lastRenderSig = null;
      this._render();
      return;
    }

    if (action === "toggle-group") {
      const gKey = target.dataset.value || "";
      if (this._collapsedGroups.has(gKey)) this._collapsedGroups.delete(gKey);
      else this._collapsedGroups.add(gKey);
      this._lastRenderSig = null;
      this._render();
      return;
    }

    if (action === "filter") {
      this._filter = target.dataset.value || "all";
      this._lastRenderSig = null;
      this._render();
      return;
    }

    if (action === "master") {
      const list = (this._config.devices || this._config.entities || []).map((item) =>
        resolveDeviceState(this._hass, item)
      );
      this._applyMasterAction(target.dataset.value, list);
      return;
    }

    // Resolve target device (single purifier or overview row)
    let dev = null;
    if (this._mode === "overview" && idx !== null) {
      const list = this._config.devices || this._config.entities || [];
      dev = resolveDeviceState(this._hass, list[idx]);
    } else {
      dev = resolveDeviceState(this._hass, this._config);
    }
    if (!dev) return;

    if (action === "power") {
      e.stopPropagation();
      this._togglePower(dev);
    } else if (action === "mode") {
      this._setMode(dev, target.dataset.value);
    } else if (action === "auto-mode") {
      this._setAutoMode(dev, target.dataset.value);
    } else if (action === "speed") {
      this._setSpeed(dev, target.dataset.value);
    } else if (action === "display") {
      this._toggleDisplay(dev);
    } else if (action === "child-lock") {
      this._toggleChildLock(dev);
    } else if (action === "timer") {
      this._cycleTimer(dev);
    }
  }

  /* ---------- Rendering Helpers ---------- */

  _renderGaugeSVG(valueText, unitText, metricLabel, pct, color, entityId) {
    const r = 46;
    const c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(100, pct));
    const offset = c - (clamped / 100) * c;
    const moreInfoAttr = entityId
      ? `data-action="more-info" data-entity="${escapeHtml(entityId)}"`
      : "";

    return `
      <div class="gauge-wrap" ${moreInfoAttr} title="Click for details">
        <svg class="gauge-svg" viewBox="0 0 108 108">
          <circle class="gauge-track" cx="54" cy="54" r="${r}" />
          <circle class="gauge-progress" cx="54" cy="54" r="${r}"
            stroke="${color}"
            stroke-dasharray="${c.toFixed(2)}"
            stroke-dashoffset="${offset.toFixed(2)}" />
        </svg>
        <div class="gauge-center">
          <span class="gauge-metric">${escapeHtml(metricLabel)}</span>
          <span class="gauge-value">${escapeHtml(valueText)}</span>
          ${unitText ? `<span class="gauge-unit">${escapeHtml(unitText)}</span>` : ""}
        </div>
      </div>
    `;
  }

  _renderSafetyBanner(dev) {
    if (!dev.coDanger) return "";
    const coNum = dev.sensors.co?.num ?? null;
    const entityId = dev.coAlarm?.entityId || dev.sensors.co?.entityId || "";
    const title = dev.coAlarm ? `${dev.coAlarm.type} Active` : "Elevated Carbon Monoxide";
    const detail = coNum !== null ? `${formatNum(coNum, 0)} ppm (${evaluateCO(coNum).label}) — Ventilate immediately` : "Check area & ventilate immediately";
    return `
      <div class="safety-banner" data-action="more-info" data-entity="${escapeHtml(entityId)}">
        ${ICONS.alert}
        <span>${escapeHtml(title)}<span class="sub">· ${escapeHtml(detail)}</span></span>
      </div>
    `;
  }

  _pickHeroMetric(dev) {
    if (dev.coDanger && dev.sensors.co && dev.sensors.co.num !== null) {
      const ev = evaluateCO(dev.sensors.co.num);
      return {
        key: "co",
        metricLabel: "CO",
        valueText: formatNum(dev.sensors.co.num, 0),
        unitText: dev.sensors.co.unit || "ppm",
        entityId: dev.sensors.co.entityId,
        ...ev,
      };
    }
    if (dev.sensors.pm25 && dev.sensors.pm25.num !== null) {
      const ev = evaluatePM25(dev.sensors.pm25.num);
      return {
        key: "pm25",
        metricLabel: "PM2.5",
        valueText: formatNum(dev.sensors.pm25.num, 0),
        unitText: dev.sensors.pm25.unit || "µg/m³",
        entityId: dev.sensors.pm25.entityId,
        ...ev,
      };
    }
    if (dev.sensors.co2 && dev.sensors.co2.num !== null) {
      const ev = evaluateCO2(dev.sensors.co2.num);
      return {
        key: "co2",
        metricLabel: "CO₂",
        valueText: formatNum(dev.sensors.co2.num, 0),
        unitText: dev.sensors.co2.unit || "ppm",
        entityId: dev.sensors.co2.entityId,
        ...ev,
      };
    }
    if (dev.sensors.co && dev.sensors.co.num !== null) {
      const ev = evaluateCO(dev.sensors.co.num);
      return {
        key: "co",
        metricLabel: "CO",
        valueText: formatNum(dev.sensors.co.num, 0),
        unitText: dev.sensors.co.unit || "ppm",
        entityId: dev.sensors.co.entityId,
        ...ev,
      };
    }
    if (dev.sensors.aqi && !isUnavailable(dev.sensors.aqi.raw)) {
      const ev = evaluateAQI(dev.sensors.aqi.raw);
      return {
        key: "aqi",
        metricLabel: "AQI",
        valueText: dev.sensors.aqi.num !== null ? formatNum(dev.sensors.aqi.num, 0) : titleCase(dev.sensors.aqi.raw),
        unitText: dev.sensors.aqi.unit || "",
        entityId: dev.sensors.aqi.entityId,
        ...ev,
      };
    }
    const vocSensor = dev.sensors.voc || dev.sensors.tvoc;
    if (vocSensor && vocSensor.num !== null) {
      const key = dev.sensors.voc ? "voc" : "tvoc";
      const ev = evaluateVOC(vocSensor.num, vocSensor.unit);
      return {
        key,
        metricLabel: SENSOR_META[key].label,
        valueText: formatNum(vocSensor.num, 0),
        unitText: vocSensor.unit || SENSOR_META[key].defaultUnit,
        entityId: vocSensor.entityId,
        ...ev,
      };
    }
    if (dev.isPurifier) {
      const pct = dev.isOn ? dev.percentage ?? 100 : 0;
      return {
        key: "fan",
        metricLabel: "Fan",
        valueText: dev.isOn ? `${Math.round(pct)}%` : "Off",
        unitText: dev.currentMode ? titleCase(dev.currentMode) : "",
        entityId: dev.fanId,
        label: dev.isOn ? "Running" : "Standby",
        color: dev.isOn ? "var(--daq-purple)" : "var(--daq-muted)",
        pct: dev.isOn ? Math.max(10, pct) : 0,
      };
    }
    return {
      key: "none",
      metricLabel: "AQ",
      valueText: "—",
      unitText: "",
      entityId: null,
      label: "No Data",
      color: "var(--daq-muted)",
      pct: 0,
    };
  }

  _renderMetricTiles(sensors) {
    const entries = SENSOR_KEYS.filter((k) => sensors[k]);
    if (!entries.length) return "";
    return `
      <div class="metrics-grid">
        ${entries
          .map((key) => {
            const s = sensors[key];
            const meta = SENSOR_META[key];
            const color = evaluateMetricColor(key, s.num ?? s.raw, s.unit);
            const valStr =
              s.num !== null
                ? formatNum(s.num, meta.decimals)
                : !isUnavailable(s.raw)
                ? titleCase(s.raw)
                : "—";
            return `
              <div class="metric-tile" style="--tile-accent: ${color}"
                role="button" tabindex="0" title="Click for history"
                data-action="more-info" data-entity="${escapeHtml(s.entityId)}">
                <span class="metric-label">${escapeHtml(meta.label)}</span>
                <div class="metric-val-row">
                  <span class="metric-val">${escapeHtml(valStr)}</span>
                  ${s.unit ? `<span class="metric-unit">${escapeHtml(s.unit)}</span>` : ""}
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  _renderPurifierControls(dev, idxAttr = "") {
    const showTimer = this._config.show_timer !== false;
    const isAutoActive =
      dev.currentMode && dev.currentMode.toLowerCase().includes("auto");
    const stepCount = Math.min(5, Math.max(3, Math.round(100 / (dev.percentageStep || 25))));
    const steps = Array.from({ length: stepCount }, (_, i) =>
      i === stepCount - 1 ? 100 : Math.round(((i + 1) * 100) / stepCount)
    );
    const currentPct = dev.isOn ? dev.percentage ?? 0 : 0;

    let html = "";

    // Operating / Preset Modes
    if (dev.modes.length) {
      html += `
        <div>
          <div class="section-label">Mode</div>
          <div class="pill-group">
            ${dev.modes
              .map((m) => {
                const active = dev.isOn && dev.currentMode === m;
                return `<button class="pill-btn ${active ? "active" : ""}" data-action="mode" data-value="${escapeHtml(m)}" ${idxAttr}>${escapeHtml(titleCase(m))}</button>`;
              })
              .join("")}
          </div>
        </div>
      `;
    }

    // Auto Mode Profile
    if (dev.autoMode && dev.autoMode.options.length && (isAutoActive || !dev.modes.length)) {
      html += `
        <div>
          <div class="section-label">Auto Profile</div>
          <div class="pill-group">
            ${dev.autoMode.options
              .map((opt) => {
                const active = dev.autoMode.current === opt;
                return `<button class="pill-btn xs ${active ? "active-cyan" : ""}" data-action="auto-mode" data-value="${escapeHtml(opt)}" ${idxAttr}>${escapeHtml(titleCase(opt))}</button>`;
              })
              .join("")}
          </div>
        </div>
      `;
    }

    // Fan Speed
    if (dev.fanState && (dev.percentage !== null || dev.fanState.attributes?.percentage !== undefined)) {
      html += `
        <div class="speed-wrap">
          <div class="speed-head">
            <span class="section-label" style="margin:0">Fan Speed</span>
            <span class="speed-val">${dev.isOn ? `${Math.round(currentPct)}%` : "Off"}</span>
          </div>
          <div class="speed-steps" style="grid-template-columns: repeat(${steps.length}, 1fr)">
            ${steps
              .map((step, i) => {
                const tol = Math.ceil(50 / steps.length);
                const isCurrent = dev.isOn && Math.abs(currentPct - step) <= tol;
                const isFilled = dev.isOn && currentPct >= step - 5;
                const cls = isCurrent ? "current" : isFilled ? "filled" : "";
                return `<button class="speed-step ${cls}" data-action="speed" data-value="${step}" ${idxAttr}>L${i + 1} · ${step}%</button>`;
              })
              .join("")}
          </div>
        </div>
      `;
    }

    // Utility Bar (Display, Child Lock, Timer)
    const hasUtility =
      dev.display || dev.childLock || (showTimer && (dev.timer || dev.timerLabel));
    if (hasUtility) {
      html += `
        <div class="utility-bar">
          ${
            dev.display
              ? `<button class="pill-btn xs ${dev.display.on ? "active-cyan" : ""}" data-action="display" ${idxAttr}>${ICONS.display} Display</button>`
              : ""
          }
          ${
            dev.childLock
              ? `<button class="pill-btn xs ${dev.childLock.on ? "active" : ""}" data-action="child-lock" ${idxAttr}>${dev.childLock.on ? ICONS.lock : ICONS.unlock} Lock</button>`
              : ""
          }
          ${
            showTimer && dev.timer
              ? `<button class="pill-btn xs ${dev.timerLabel ? "active-cyan" : ""}" data-action="timer" ${idxAttr}>${ICONS.timer} ${dev.timerLabel ? escapeHtml(dev.timerLabel) : "Timer"}</button>`
              : showTimer && dev.timerLabel
              ? `<span class="stat-chip" data-action="more-info" data-entity="${escapeHtml(dev.timerRemaining?.entityId || "")}">${ICONS.timer} <span class="v">${escapeHtml(dev.timerLabel)}</span></span>`
              : ""
          }
        </div>
      `;
    }

    return html;
  }

  /* ---------- Mode 1: Purifier Card ---------- */

  _renderPurifierMode() {
    const dev = resolveDeviceState(this._hass, this._config, this._discoveryCache);
    this._watchedIds = dev.watchedIds;
    const hero = this._pickHeroMetric(dev);
    const showCadr = this._config.show_cadr !== false;
    const showFilter = this._config.show_filter !== false;

    const statusParts = [];
    if (dev.isUnavailable) {
      statusParts.push("Unavailable");
    } else if (!dev.isOn) {
      statusParts.push("Standby");
    } else {
      if (dev.currentMode) statusParts.push(titleCase(dev.currentMode));
      if (dev.currentMode?.toLowerCase().includes("auto") && dev.autoMode?.current) {
        statusParts.push(titleCase(dev.autoMode.current));
      } else if (dev.percentage !== null) {
        statusParts.push(`${Math.round(dev.percentage)}%`);
      }
    }

    // Extra sensors beyond the hero metric
    const extraSensors = {};
    for (const k of SENSOR_KEYS) {
      if (dev.sensors[k] && k !== hero.key) {
        extraSensors[k] = dev.sensors[k];
      }
    }

    const filterColor = dev.filter ? evaluateFilterColor(dev.filter.num, dev.filterLow) : "";
    const filterPct = dev.filter?.num !== null && dev.filter?.num !== undefined ? Math.max(0, Math.min(100, dev.filter.num)) : 0;

    return `
      <div class="card ${this._config.compact ? "compact" : ""}">
        <div class="header">
          <div class="title-wrap">
            <div class="title">${escapeHtml(dev.name)}</div>
            <div class="subtitle">${escapeHtml(statusParts.join(" · "))}</div>
          </div>
          <div class="header-actions">
            ${
              dev.isUnavailable
                ? `<span class="offline-badge">Offline</span>`
                : ""
            }
            ${
              showFilter && dev.filterLow
                ? `<span class="filter-low-badge" title="Filter replacement needed" data-action="more-info" data-entity="${escapeHtml(dev.filter?.entityId || "")}">${ICONS.filter} Filter Low</span>`
                : ""
            }
            ${
              dev.error
                ? `<span class="error-badge" data-action="more-info" data-entity="${escapeHtml(dev.error.entityId)}">${ICONS.alert} ${escapeHtml(dev.error.message)}</span>`
                : ""
            }
            <button class="power-btn ${dev.isOn ? "on" : ""}" data-action="power" aria-label="Toggle power">
              ${ICONS.power}
            </button>
          </div>
        </div>

        ${this._renderSafetyBanner(dev)}

        <div class="hero">
          ${this._renderGaugeSVG(hero.valueText, hero.unitText, hero.metricLabel, hero.pct, hero.color, hero.entityId)}
          <div class="hero-details">
            <div class="health-pill" style="color: ${hero.color}">
              <span class="health-dot" style="background: ${hero.color}"></span>
              ${escapeHtml(hero.label)}
            </div>

            ${
              showCadr && dev.cadr && dev.cadr.num !== null
                ? `<div class="stat-row">
                    <div class="stat-chip" data-action="more-info" data-entity="${escapeHtml(dev.cadr.entityId)}">
                      ${ICONS.wind}
                      <span class="k">CADR</span>
                      <span class="v">${escapeHtml(formatNum(dev.cadr.num, 0))} ${escapeHtml(dev.cadr.unit)}</span>
                    </div>
                  </div>`
                : ""
            }

            ${
              showFilter && dev.filter && dev.filter.num !== null
                ? `<div class="filter-block" data-action="more-info" data-entity="${escapeHtml(dev.filter.entityId)}">
                    <div class="filter-top">
                      <span class="filter-label">${ICONS.filter} Filter Life${dev.filterLow ? " (Replace)" : ""}</span>
                      <span class="filter-pct" style="color: ${filterColor}">${Math.round(filterPct)}%</span>
                    </div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${filterPct}%; background: ${filterColor}"></div>
                    </div>
                  </div>`
                : ""
            }
          </div>
        </div>

        ${Object.keys(extraSensors).length ? this._renderMetricTiles(extraSensors) : ""}
        ${this._renderPurifierControls(dev)}
      </div>
    `;
  }

  /* ---------- Mode 2: Standalone Air Quality Sensor Card ---------- */

  _renderSensorMode() {
    const dev = resolveDeviceState(this._hass, this._config, this._discoveryCache);
    this._watchedIds = dev.watchedIds;
    const hero = this._pickHeroMetric(dev);
    const sensorCount = Object.keys(dev.sensors).length;

    return `
      <div class="card ${this._config.compact ? "compact" : ""}">
        <div class="header">
          <div class="title-wrap">
            <div class="title">${escapeHtml(dev.name)}</div>
            <div class="subtitle">${sensorCount} ${sensorCount === 1 ? "sensor" : "sensors"} monitored</div>
          </div>
          <div class="header-actions">
            <div class="health-pill" style="color: ${hero.color}">
              <span class="health-dot" style="background: ${hero.color}"></span>
              ${escapeHtml(hero.label)}
            </div>
          </div>
        </div>

        ${this._renderSafetyBanner(dev)}

        <div class="hero">
          ${this._renderGaugeSVG(hero.valueText, hero.unitText, hero.metricLabel, hero.pct, hero.color, hero.entityId)}
          <div class="hero-details">
            <div class="section-label" style="margin:0">Air Quality Status</div>
            <div style="font-size:13px;color:var(--daq-subtext);line-height:1.4">
              ${
                hero.key === "co"
                  ? `Primary reading based on Carbon Monoxide (${escapeHtml(hero.label)}).`
                  : hero.key === "pm25"
                  ? `Primary reading based on PM2.5 particulate matter (${escapeHtml(hero.label)}).`
                  : hero.key === "co2"
                  ? `Primary reading based on CO₂ concentration (${escapeHtml(hero.label)}).`
                  : `Live environmental air quality readings.`
              }
            </div>
          </div>
        </div>

        ${
          sensorCount
            ? this._renderMetricTiles(dev.sensors)
            : `<div class="empty-state">No air quality sensors configured or available.</div>`
        }
      </div>
    `;
  }

  /* ---------- Mode 3: Whole-Home Overview Card ---------- */

  _renderOverviewMode() {
    const rawList = this._config.devices || this._config.entities || [];
    const watched = new Set();
    const devices = rawList.map((item, idx) => {
      const dev = resolveDeviceState(this._hass, item, this._discoveryCache);
      for (const id of dev.watchedIds) watched.add(id);
      return { dev, idx };
    });
    this._watchedIds = Array.from(watched);

    const purifiers = devices.filter((e) => e.dev.isPurifier);
    const sensorOnly = devices.filter((e) => !e.dev.isPurifier);
    const hasBothTypes = purifiers.length > 0 && sensorOnly.length > 0;
    const activePurifiers = purifiers.filter((e) => e.dev.isOn).length;

    const pmRooms = devices.filter((e) => e.dev.sensors.pm25 && e.dev.sensors.pm25.num !== null);
    const avgPm = pmRooms.length
      ? pmRooms.reduce((sum, e) => sum + e.dev.sensors.pm25.num, 0) / pmRooms.length
      : null;
    const worstPmRoom = pmRooms.length
      ? pmRooms.reduce((max, e) => (e.dev.sensors.pm25.num > max.dev.sensors.pm25.num ? e : max), pmRooms[0]).dev
      : null;

    const co2Rooms = devices.filter((e) => e.dev.sensors.co2 && e.dev.sensors.co2.num !== null);
    const maxCo2Room = co2Rooms.length
      ? co2Rooms.reduce((max, e) => (e.dev.sensors.co2.num > max.dev.sensors.co2.num ? e : max), co2Rooms[0]).dev
      : null;

    const coAlertRooms = devices.filter((e) => e.dev.coDanger);
    const worstCoRoom = coAlertRooms.length
      ? coAlertRooms.reduce((max, e) => ((e.dev.sensors.co?.num ?? 999) > (max.dev.sensors.co?.num ?? 999) ? e : max), coAlertRooms[0]).dev
      : null;

    const avgPmEval = evaluatePM25(avgPm);
    const worstPmEval = evaluatePM25(worstPmRoom?.sensors.pm25.num ?? null);
    const maxCo2Eval = evaluateCO2(maxCo2Room?.sensors.co2.num ?? null);

    const activeFilter = hasBothTypes ? this._filter : "all";
    const visible = devices.filter((e) => {
      if (activeFilter === "purifiers") return e.dev.isPurifier;
      if (activeFilter === "sensors") return !e.dev.isPurifier;
      return true;
    });

    const renderGroup = (gKey, label, items) => {
      const collapsed = this._collapsedGroups.has(gKey);
      return `
        <div class="group-section ${collapsed ? "collapsed" : ""}">
          <button type="button" class="group-header" data-action="toggle-group" data-value="${escapeHtml(gKey)}" aria-expanded="${!collapsed}">
            <span>${escapeHtml(label)} · ${items.length}</span>
            <span class="g-chev">${ICONS.chevron}</span>
          </button>
          ${
            collapsed
              ? ""
              : `<div class="room-list">${items.map((e) => this._renderOverviewRow(e.dev, e.idx)).join("")}</div>`
          }
        </div>
      `;
    };

    const groupBy = this._config.group_by || "type";
    const renderRows = () => {
      if (!visible.length) {
        return `<div class="empty-state">Add purifiers or air quality sensors to <code>devices</code>.</div>`;
      }
      if (groupBy === "none") {
        return `<div class="room-list">${visible.map((e) => this._renderOverviewRow(e.dev, e.idx)).join("")}</div>`;
      }
      if (groupBy === "room") {
        const groups = new Map();
        for (const e of visible) {
          const g = e.dev.group || "Other";
          if (!groups.has(g)) groups.set(g, []);
          groups.get(g).push(e);
        }
        return Array.from(groups.entries())
          .map(([label, items]) => renderGroup(`room:${label}`, label, items))
          .join("");
      }
      // Default: group_by === "type"
      const pList = visible.filter((e) => e.dev.isPurifier);
      const sList = visible.filter((e) => !e.dev.isPurifier);
      const sections = [];
      if (pList.length) sections.push(renderGroup("type:purifiers", "Air Purifiers", pList));
      if (sList.length) sections.push(renderGroup("type:sensors", "Air Quality Sensors", sList));
      return sections.join("");
    };

    const cardTitle = this._config.name || "Whole-Home Air Quality";

    return `
      <div class="card ${this._config.compact ? "compact" : ""}">
        <div class="header">
          <div class="title-wrap">
            <div class="title">${escapeHtml(cardTitle)}</div>
            <div class="subtitle">${devices.length} ${devices.length === 1 ? "device" : "devices"} · ${purifiers.length} purifiers${sensorOnly.length ? ` · ${sensorOnly.length} sensors` : ""}</div>
          </div>
          ${
            purifiers.length
              ? `<div class="master-bar">
                  <button class="pill-btn xs" data-action="master" data-value="auto">All Auto</button>
                  <button class="pill-btn xs" data-action="master" data-value="sleep">All Sleep</button>
                  <button class="pill-btn xs" data-action="master" data-value="off">All Off</button>
                </div>`
              : ""
          }
        </div>

        <div class="summary-strip">
          <div class="summary-tile">
            <span class="summary-k">Active</span>
            <span class="summary-v" style="color: ${activePurifiers > 0 ? "var(--daq-purple)" : "var(--daq-muted)"}">${activePurifiers}/${purifiers.length}</span>
            <span class="summary-sub">Purifiers on</span>
          </div>
          <div class="summary-tile">
            <span class="summary-k">Avg PM2.5</span>
            <span class="summary-v" style="color: ${avgPmEval.color}">${avgPm !== null ? `${formatNum(avgPm, 1)}` : "—"}</span>
            <span class="summary-sub">${avgPm !== null ? `µg/m³ · ${avgPmEval.label}` : "No data"}</span>
          </div>
          <div class="summary-tile">
            <span class="summary-k">Worst PM2.5</span>
            <span class="summary-v" style="color: ${worstPmEval.color}">${worstPmRoom ? formatNum(worstPmRoom.sensors.pm25.num, 0) : "—"}</span>
            <span class="summary-sub">${worstPmRoom ? escapeHtml(worstPmRoom.name) : "No data"}</span>
          </div>
          ${
            maxCo2Room
              ? `<div class="summary-tile">
                  <span class="summary-k">Max CO₂</span>
                  <span class="summary-v" style="color: ${maxCo2Eval.color}">${formatNum(maxCo2Room.sensors.co2.num, 0)}</span>
                  <span class="summary-sub">${escapeHtml(maxCo2Room.name)} · ppm</span>
                </div>`
              : ""
          }
          ${
            worstCoRoom
              ? `<div class="summary-tile alert">
                  <span class="summary-k" style="color:var(--daq-red)">CO Warning</span>
                  <span class="summary-v" style="color:var(--daq-red)">${worstCoRoom.sensors.co?.num !== null && worstCoRoom.sensors.co?.num !== undefined ? `${formatNum(worstCoRoom.sensors.co.num, 0)} ppm` : "ALARM"}</span>
                  <span class="summary-sub">${escapeHtml(worstCoRoom.name)}</span>
                </div>`
              : ""
          }
        </div>

        ${
          hasBothTypes
            ? `<div class="filter-tabs" role="tablist">
                <button class="filter-tab ${activeFilter === "all" ? "active" : ""}" data-action="filter" data-value="all">All (${devices.length})</button>
                <button class="filter-tab ${activeFilter === "purifiers" ? "active" : ""}" data-action="filter" data-value="purifiers">Purifiers (${purifiers.length})</button>
                <button class="filter-tab ${activeFilter === "sensors" ? "active" : ""}" data-action="filter" data-value="sensors">Sensors (${sensorOnly.length})</button>
              </div>`
            : ""
        }

        ${renderRows()}
      </div>
    `;
  }

  _renderOverviewRow(dev, idx) {
    const isExpanded = this._expanded.has(idx);
    const pm = dev.sensors.pm25;
    const co2 = dev.sensors.co2;
    const co = dev.sensors.co;
    const pmEval = pm && pm.num !== null ? evaluatePM25(pm.num) : null;
    const co2Eval = co2 && co2.num !== null ? evaluateCO2(co2.num) : null;
    const coEval = co && co.num !== null ? evaluateCO(co.num) : null;

    const dotColor = dev.coDanger
      ? "var(--daq-red)"
      : dev.isPurifier
      ? dev.isOn
        ? "var(--daq-green)"
        : "var(--daq-muted)"
      : pmEval?.color || co2Eval?.color || coEval?.color || "var(--daq-cyan)";

    const subText = dev.isPurifier
      ? dev.isOn
        ? [
            dev.currentMode ? titleCase(dev.currentMode) : "On",
            dev.percentage !== null ? `${Math.round(dev.percentage)}%` : null,
            dev.filter && dev.filter.num !== null ? `Filter ${Math.round(dev.filter.num)}%` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : "Off"
      : dev.coAlarm
      ? `${dev.coAlarm.type} Active`
      : "Air Quality Monitor";

    const idxAttr = `data-idx="${idx}"`;
    const filterColor = dev.filter ? evaluateFilterColor(dev.filter.num, dev.filterLow) : "";
    const filterPct = dev.filter?.num !== null && dev.filter?.num !== undefined ? Math.max(0, Math.min(100, dev.filter.num)) : 0;

    return `
      <div class="room-item ${isExpanded ? "expanded" : ""}">
        <div class="room-row" role="button" tabindex="0" aria-expanded="${isExpanded}" data-action="toggle-drawer" ${idxAttr}>
          <div class="room-left">
            <span class="status-dot" style="background: ${dotColor}"></span>
            <div class="room-meta">
              <span class="room-name">${escapeHtml(dev.name)}</span>
              <span class="room-sub">${escapeHtml(dev.isUnavailable ? "Offline" : subText)}</span>
            </div>
          </div>
          <div class="room-right">
            ${
              dev.isUnavailable
                ? `<span class="offline-badge">Offline</span>`
                : ""
            }
            ${
              dev.isPurifier && dev.filterLow
                ? `<span class="filter-low-badge" title="Filter replacement needed">${ICONS.filter} Low</span>`
                : ""
            }
            ${
              pmEval
                ? `<span class="mini-badge" title="PM2.5"><span class="dot" style="background:${pmEval.color}"></span>${formatNum(pm.num, 0)} µg/m³</span>`
                : ""
            }
            ${
              co2Eval
                ? `<span class="mini-badge" title="CO₂"><span class="dot" style="background:${co2Eval.color}"></span>${formatNum(co2.num, 0)} ppm</span>`
                : ""
            }
            ${
              coEval || dev.coAlarm
                ? `<span class="mini-badge ${dev.coDanger ? "alert" : ""}" title="CO"><span class="dot" style="background:${dev.coDanger ? "var(--daq-red)" : coEval.color}"></span>${coEval ? `${formatNum(co.num, 0)} ppm CO` : "CO ALARM"}</span>`
                : ""
            }
            ${
              dev.isPurifier
                ? `<button class="power-btn sm ${dev.isOn ? "on" : ""}" data-action="power" ${idxAttr} aria-label="Toggle ${escapeHtml(dev.name)}">${ICONS.power}</button>`
                : ""
            }
            <span class="chevron">${ICONS.chevron}</span>
          </div>
        </div>
        ${
          isExpanded
            ? `<div class="room-drawer">
                ${this._renderSafetyBanner(dev)}
                ${
                  dev.isPurifier && this._config.show_filter !== false && dev.filter && dev.filter.num !== null
                    ? `<div class="filter-block" data-action="more-info" data-entity="${escapeHtml(dev.filter.entityId)}">
                        <div class="filter-top">
                          <span class="filter-label">${ICONS.filter} Filter Life${dev.filterLow ? " (Replace)" : ""}</span>
                          <span class="filter-pct" style="color: ${filterColor}">${Math.round(filterPct)}%</span>
                        </div>
                        <div class="bar-track">
                          <div class="bar-fill" style="width: ${filterPct}%; background: ${filterColor}"></div>
                        </div>
                      </div>`
                    : ""
                }
                ${Object.keys(dev.sensors).length ? this._renderMetricTiles(dev.sensors) : ""}
                ${dev.isPurifier ? this._renderPurifierControls(dev, idxAttr) : ""}
              </div>`
            : ""
        }
      </div>
    `;
  }

  _render() {
    if (!this._config || !this.shadowRoot) return;
    let body = "";
    if (this._mode === "overview") {
      body = this._renderOverviewMode();
    } else if (this._mode === "sensor") {
      body = this._renderSensorMode();
    } else {
      body = this._renderPurifierMode();
    }
    this.shadowRoot.innerHTML = `<style>${CARD_STYLES}</style>${body}`;
    if (this._hass?.states) {
      this._lastRenderSig = this._computeRenderSignature(this._hass.states);
    }
  }
}

/* ---------- Visual Config Editor ---------- */

const EDITOR_STYLES = `
  :host { display: block; font-family: inherit; }
  .editor { display: flex; flex-direction: column; gap: 14px; padding: 6px 0; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .field { display: flex; flex-direction: column; gap: 4px; }
  label { font-size: 12px; font-weight: 600; color: var(--secondary-text-color, #b8c0e0); }
  input[type="text"], select {
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--divider-color, rgba(98, 114, 164, 0.4));
    background: var(--card-background-color, #21222c);
    color: var(--primary-text-color, #f8f8f2);
    font-size: 13px;
    font-family: inherit;
  }
  .checks { display: flex; flex-wrap: wrap; gap: 14px; }
  .check { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
  .section {
    border-top: 1px solid var(--divider-color, rgba(98, 114, 164, 0.28));
    padding-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.8; }
  .device-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; align-items: center; }
  button {
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid var(--divider-color, rgba(98, 114, 164, 0.4));
    background: transparent;
    color: var(--primary-text-color, #f8f8f2);
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
  }
  button:hover { border-color: #bd93f9; }
`;

class DraculaAirQualityCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot.innerHTML) this._render();
  }

  _emit(newConfig) {
    this._config = newConfig;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        bubbles: true,
        composed: true,
        detail: { config: newConfig },
      })
    );
  }

  _getMode() {
    if (this._config.mode === "overview" || Array.isArray(this._config.devices) || Array.isArray(this._config.entities)) {
      return "overview";
    }
    if (this._config.mode === "sensor" || (!this._config.entity && this._config.sensors)) {
      return "sensor";
    }
    return "purifier";
  }

  _render() {
    const mode = this._getMode();
    const fanEntities = Object.keys(this._hass?.states || {}).filter((id) => id.startsWith("fan."));
    const sensorEntities = Object.keys(this._hass?.states || {}).filter((id) => id.startsWith("sensor."));

    const devices = this._config.devices || this._config.entities || [];
    const sensors = this._config.sensors || {};

    this.shadowRoot.innerHTML = `
      <style>${EDITOR_STYLES}</style>
      <div class="editor">
        <div class="row">
          <div class="field">
            <label>Card Mode</label>
            <select id="mode">
              <option value="purifier" ${mode === "purifier" ? "selected" : ""}>Purifier</option>
              <option value="sensor" ${mode === "sensor" ? "selected" : ""}>Air Quality Sensor</option>
              <option value="overview" ${mode === "overview" ? "selected" : ""}>Whole-Home Overview</option>
            </select>
          </div>
          <div class="field">
            <label>Theme</label>
            <select id="theme">
              <option value="dracula" ${(this._config.theme || "dracula") === "dracula" ? "selected" : ""}>Dracula</option>
              <option value="auto" ${this._config.theme === "auto" ? "selected" : ""}>Auto (HA Theme)</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label>Name (optional)</label>
          <input type="text" id="name" value="${escapeHtml(this._config.name || "")}" placeholder="Auto from entity" />
        </div>

        <div class="checks">
          <label class="check"><input type="checkbox" id="compact" ${this._config.compact ? "checked" : ""} /> Compact</label>
          ${
            mode === "purifier"
              ? `
            <label class="check"><input type="checkbox" id="show_cadr" ${this._config.show_cadr !== false ? "checked" : ""} /> Show CADR</label>
            <label class="check"><input type="checkbox" id="show_filter" ${this._config.show_filter !== false ? "checked" : ""} /> Show Filter</label>
            <label class="check"><input type="checkbox" id="show_timer" ${this._config.show_timer !== false ? "checked" : ""} /> Show Timer</label>
          `
              : ""
          }
        </div>

        ${
          mode === "purifier"
            ? `
          <div class="section">
            <div class="section-title">Purifier Entity</div>
            <div class="field">
              <label>Fan Entity</label>
              <input type="text" id="entity" list="fan-list" value="${escapeHtml(this._config.entity || "")}" placeholder="fan.bedroom_air_purifier" />
              <datalist id="fan-list">${fanEntities.map((id) => `<option value="${escapeHtml(id)}">`).join("")}</datalist>
            </div>
          </div>
        `
            : ""
        }

        ${
          mode === "sensor"
            ? `
          <div class="section">
            <div class="section-title">Air Quality Sensors</div>
            <datalist id="sensor-list">${sensorEntities.map((id) => `<option value="${escapeHtml(id)}">`).join("")}</datalist>
            <div class="row">
              ${SENSOR_KEYS.map(
                (k) => `
                <div class="field">
                  <label>${escapeHtml(SENSOR_META[k].label)}</label>
                  <input type="text" data-sensor="${k}" list="sensor-list" value="${escapeHtml(sensors[k] || "")}" placeholder="sensor.room_${k}" />
                </div>
              `
              ).join("")}
            </div>
          </div>
        `
            : ""
        }

        ${
          mode === "overview"
            ? `
          <div class="section">
            <div class="field">
              <label>Group Devices By</label>
              <select id="group_by">
                <option value="type" ${(this._config.group_by || "type") === "type" ? "selected" : ""}>Type (Air Purifiers / Air Quality Sensors)</option>
                <option value="room" ${this._config.group_by === "room" ? "selected" : ""}>Room / Group</option>
                <option value="none" ${this._config.group_by === "none" ? "selected" : ""}>None (Flat list)</option>
              </select>
            </div>
            <div class="section-title">Rooms / Devices</div>
            <datalist id="fan-list">${fanEntities.map((id) => `<option value="${escapeHtml(id)}">`).join("")}</datalist>
            ${devices
              .map((d, i) => {
                const ent = typeof d === "string" ? d : d.entity || "";
                const nm = typeof d === "string" ? "" : d.name || "";
                return `
                  <div class="device-row">
                    <input type="text" data-dev-entity="${i}" list="fan-list" value="${escapeHtml(ent)}" placeholder="fan.room_purifier" />
                    <input type="text" data-dev-name="${i}" value="${escapeHtml(nm)}" placeholder="Room name" />
                    <button type="button" data-dev-del="${i}">Remove</button>
                  </div>
                `;
              })
              .join("")}
            <div><button type="button" id="add-device">+ Add Device</button></div>
          </div>
        `
            : ""
        }
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const root = this.shadowRoot;
    const on = (id, ev, fn) => {
      const el = root.getElementById(id);
      if (el) el.addEventListener(ev, fn);
    };

    on("mode", "change", (e) => {
      const next = { ...this._config };
      const val = e.target.value;
      delete next.mode;
      if (val === "purifier") {
        delete next.devices;
        delete next.entities;
        delete next.sensors;
        next.entity = next.entity || "fan.air_purifier";
      } else if (val === "sensor") {
        delete next.entity;
        delete next.devices;
        delete next.entities;
        next.mode = "sensor";
        next.sensors = next.sensors || {};
      } else if (val === "overview") {
        delete next.entity;
        delete next.sensors;
        next.mode = "overview";
        next.devices = next.devices || [];
      }
      this._emit(next);
      this._render();
    });

    on("theme", "change", (e) => this._emit({ ...this._config, theme: e.target.value }));
    on("group_by", "change", (e) => this._emit({ ...this._config, group_by: e.target.value }));
    on("name", "change", (e) => {
      const next = { ...this._config };
      if (e.target.value) next.name = e.target.value;
      else delete next.name;
      this._emit(next);
    });
    on("entity", "change", (e) => this._emit({ ...this._config, entity: e.target.value }));
    on("compact", "change", (e) => this._emit({ ...this._config, compact: e.target.checked }));
    on("show_cadr", "change", (e) => this._emit({ ...this._config, show_cadr: e.target.checked }));
    on("show_filter", "change", (e) => this._emit({ ...this._config, show_filter: e.target.checked }));
    on("show_timer", "change", (e) => this._emit({ ...this._config, show_timer: e.target.checked }));

    root.querySelectorAll("[data-sensor]").forEach((input) => {
      input.addEventListener("change", (e) => {
        const key = e.target.dataset.sensor;
        const sensors = { ...(this._config.sensors || {}) };
        if (e.target.value) sensors[key] = e.target.value;
        else delete sensors[key];
        this._emit({ ...this._config, sensors });
      });
    });

    const updateDevice = (idx, patch) => {
      const list = [...(this._config.devices || this._config.entities || [])];
      const cur = typeof list[idx] === "string" ? { entity: list[idx] } : { ...(list[idx] || {}) };
      list[idx] = { ...cur, ...patch };
      const next = { ...this._config, devices: list };
      delete next.entities;
      this._emit(next);
    };

    root.querySelectorAll("[data-dev-entity]").forEach((input) => {
      input.addEventListener("change", (e) =>
        updateDevice(Number(e.target.dataset.devEntity), { entity: e.target.value })
      );
    });
    root.querySelectorAll("[data-dev-name]").forEach((input) => {
      input.addEventListener("change", (e) =>
        updateDevice(Number(e.target.dataset.devName), { name: e.target.value })
      );
    });
    root.querySelectorAll("[data-dev-del]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.target.dataset.devDel);
        const list = [...(this._config.devices || this._config.entities || [])];
        list.splice(idx, 1);
        const next = { ...this._config, devices: list };
        delete next.entities;
        this._emit(next);
        this._render();
      });
    });
    on("add-device", "click", () => {
      const list = [...(this._config.devices || this._config.entities || []), { entity: "", name: "" }];
      const next = { ...this._config, devices: list };
      delete next.entities;
      this._emit(next);
      this._render();
    });
  }
}

/* ---------- Registration ---------- */

if (!customElements.get("dracula-air-quality-card")) {
  customElements.define("dracula-air-quality-card", DraculaAirQualityCard);
}
if (!customElements.get("dracula-air-quality-card-editor")) {
  customElements.define("dracula-air-quality-card-editor", DraculaAirQualityCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "dracula-air-quality-card")) {
  window.customCards.push({
    type: "dracula-air-quality-card",
    name: "Dracula Air Quality Card",
    description:
      "Dracula-themed Lovelace card for air purifiers, standalone air quality monitors, and whole-home air quality overviews.",
    preview: true,
  });
}

console.info(
  `%c DRACULA-AIR-QUALITY-CARD %c v${CARD_VERSION} `,
  "color:#282a36;background:#bd93f9;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px;",
  "color:#f8f8f2;background:#44475a;font-weight:600;padding:2px 6px;border-radius:0 4px 4px 0;"
);
