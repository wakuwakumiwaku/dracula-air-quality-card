/**
 * Dracula Air Quality Card for Home Assistant Lovelace
 * Zero-dependency ES module supporting:
 *   1. Whole-Home Air Quality Overview (Standard — grouped purifiers + AQ sensors, auto_discover, smart sorting, ventilation advisor)
 *   2. Single Purifier Mode (Optional — Levoit ESPHome/VeSync, Xiaomi MIoT, Philips CoAP, IKEA Starkvind, generic HA fans)
 *   3. Standalone Air Quality Sensor Mode (Optional — PM2.5/10/1, AQI, CO, CO2, VOC/tVOC, NOx/NO2, O3, HCHO, Radon, Temp, Humidity, Pressure)
 */

const CARD_VERSION = "1.8.0";
const HISTORY_TTL_MS = 300_000;
const HISTORY_CACHE = new Map();
const HISTORY_INFLIGHT = new Set();
const ROLLING_HISTORY = new Map();

const SENSOR_KEYS = [
  "pm25", "pm10", "pm1", "aqi", "co", "co2", "voc", "tvoc",
  "nox", "no2", "o3", "hcho", "radon", "temperature", "humidity", "pressure",
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
  pm25: "pm25", pm10: "pm10", pm1: "pm1", aqi: "aqi",
  carbon_monoxide: "co", carbon_dioxide: "co2",
  volatile_organic_compounds: "voc", volatile_organic_compounds_parts: "tvoc",
  nitrogen_dioxide: "no2", ozone: "o3",
  temperature: "temperature", humidity: "humidity",
  atmospheric_pressure: "pressure", pressure: "pressure",
};

const DISCOVERY_SUFFIXES = {
  pm25: ["sensor.{p}_pm25", "sensor.{p}_pm2_5", "sensor.{p}_pm_2_5", "sensor.{p}_pm25_density", "sensor.{p}_air_quality_pm25", "sensor.{p}_particulate_matter_2_5"],
  pm10: ["sensor.{p}_pm10", "sensor.{p}_pm_10", "sensor.{p}_pm10_density", "sensor.{p}_particulate_matter_10"],
  pm1: ["sensor.{p}_pm1", "sensor.{p}_pm_1", "sensor.{p}_pm1_0", "sensor.{p}_pm_1_0"],
  aqi: ["sensor.{p}_air_quality", "sensor.{p}_aqi", "sensor.{p}_air_quality_index", "sensor.{p}_iaq", "sensor.{p}_air_quality_level"],
  co: ["sensor.{p}_co", "sensor.{p}_carbon_monoxide", "sensor.{p}_co_level", "sensor.{p}_co_concentration"],
  co_alarm: ["binary_sensor.{p}_co_alarm", "binary_sensor.{p}_carbon_monoxide", "binary_sensor.{p}_co_detected", "binary_sensor.{p}_co"],
  gas_alarm: ["binary_sensor.{p}_gas_alarm", "binary_sensor.{p}_gas", "binary_sensor.{p}_gas_detected"],
  co2: ["sensor.{p}_co2", "sensor.{p}_carbon_dioxide"],
  voc: ["sensor.{p}_voc", "sensor.{p}_voc_index", "sensor.{p}_volatile_organic_compounds"],
  tvoc: ["sensor.{p}_tvoc", "sensor.{p}_total_voc", "sensor.{p}_volatile_organic_compounds_parts"],
  nox: ["sensor.{p}_nox", "sensor.{p}_nox_index"],
  no2: ["sensor.{p}_no2", "sensor.{p}_nitrogen_dioxide"],
  o3: ["sensor.{p}_o3", "sensor.{p}_ozone"],
  hcho: ["sensor.{p}_hcho", "sensor.{p}_formaldehyde"],
  radon: ["sensor.{p}_radon", "sensor.{p}_radon_long_term", "sensor.{p}_radon_short_term"],
  temperature: ["sensor.{p}_temperature", "sensor.{p}_temp"],
  humidity: ["sensor.{p}_humidity", "sensor.{p}_relative_humidity"],
  pressure: ["sensor.{p}_pressure", "sensor.{p}_atmospheric_pressure"],
  cadr: ["sensor.{p}_cadr", "sensor.{p}_clean_air_delivery_rate", "sensor.{p}_airflow", "sensor.{p}_motor_speed", "sensor.{p}_fan_rpm"],
  filter: ["sensor.{p}_filter_life", "sensor.{p}_filter_life_left", "sensor.{p}_filter_life_remaining", "sensor.{p}_filter_remaining", "sensor.{p}_filter_percentage", "sensor.{p}_hepa_filter", "sensor.{p}_filter"],
  filter_low: ["binary_sensor.{p}_filter_low", "binary_sensor.{p}_filter_replace", "binary_sensor.{p}_replace_filter", "binary_sensor.{p}_filter_warning"],
  filter_reset: ["button.{p}_filter_reset", "button.{p}_reset_filter", "button.{p}_hepa_reset"],
  display: ["switch.{p}_display", "switch.{p}_display_on", "switch.{p}_screen", "switch.{p}_led", "switch.{p}_panel_light", "light.{p}_display", "light.{p}_led"],
  child_lock: ["lock.{p}_child_lock", "switch.{p}_child_lock", "switch.{p}_display_lock", "switch.{p}_physical_control_locked", "switch.{p}_lock"],
  operating_mode: ["select.{p}_fan_mode", "select.{p}_operating_mode", "select.{p}_mode", "select.{p}_work_mode", "select.{p}_purifier_mode"],
  auto_mode: ["select.{p}_auto_mode", "select.{p}_auto_profile", "select.{p}_auto_fan_mode", "select.{p}_auto_mode_profile"],
  timer: ["number.{p}_timer", "number.{p}_off_timer", "number.{p}_sleep_timer", "select.{p}_timer", "input_number.{p}_timer"],
  timer_remaining: ["sensor.{p}_timer_remaining", "sensor.{p}_time_remaining", "sensor.{p}_remaining_time", "sensor.{p}_off_timer_remaining", "sensor.{p}_timer_left"],
  error: ["binary_sensor.{p}_error", "sensor.{p}_error", "binary_sensor.{p}_fault", "sensor.{p}_fault", "sensor.{p}_error_code"],
};

const I18N = {
  en: {
    good: "Good", moderate: "Moderate", sensitive: "Sensitive", unhealthy: "Unhealthy",
    hazardous: "Hazardous", poor: "Poor", very_poor: "Very Poor", elevated: "Elevated",
    dangerous: "Dangerous", critical: "Critical", no_data: "No Data", running: "Running",
    standby: "Standby", off: "Off", offline: "Offline", unavailable: "Unavailable",
    whole_home_title: "Whole-Home Air Quality", air_purifiers: "Air Purifiers",
    air_quality_sensors: "Air Quality Sensors", air_quality_monitor: "Air Quality Monitor",
    air_quality_status: "Air Quality Status", all: "All", purifiers: "Purifiers", sensors: "Sensors",
    all_auto: "All Auto", all_sleep: "All Sleep", all_off: "All Off",
    active: "Active", purifiers_on: "Purifiers on", avg_pm25: "Avg PM2.5",
    worst_pm25: "Worst PM2.5", max_co2: "Max CO₂", co_warning: "CO Warning",
    filter_life: "Filter Life", filter_low: "Filter Low", replace: "Replace",
    reset_filter: "Reset Filter", confirm_reset: "Confirm Reset?",
    mode: "Mode", auto_profile: "Auto Profile", fan_speed: "Fan Speed",
    display: "Display", lock: "Lock", timer: "Timer", trend_24h: "24h Trend",
    sort_default: "Order", sort_pm25: "Worst PM2.5", sort_filter: "Low Filter", sort_name: "Name",
    devices_word: "devices", device_word: "device", sensors_monitored: "sensors monitored",
    ventilate: "Ventilate", keep_closed: "Keep Closed", outdoor: "Outdoor", belongs_to: "belongs to", auto_rule: "Auto Rule",
  },
  de: {
    good: "Gut", moderate: "Mäßig", sensitive: "Sensibel", unhealthy: "Ungesund",
    hazardous: "Gefährlich", poor: "Schlecht", very_poor: "Sehr schlecht", elevated: "Erhöht",
    dangerous: "Gefährlich", critical: "Kritisch", no_data: "Keine Daten", running: "Aktiv",
    standby: "Bereitschaft", off: "Aus", offline: "Offline", unavailable: "Nicht verfügbar",
    whole_home_title: "Luftqualität Zuhause", air_purifiers: "Luftreiniger",
    air_quality_sensors: "Luftsensoren", air_quality_monitor: "Luftqualitätsmonitor",
    air_quality_status: "Luftqualität", all: "Alle", purifiers: "Reiniger", sensors: "Sensoren",
    all_auto: "Alle Auto", all_sleep: "Alle Schlaf", all_off: "Alle Aus",
    active: "Aktiv", purifiers_on: "Reiniger an", avg_pm25: "Ø PM2.5",
    worst_pm25: "Max PM2.5", max_co2: "Max CO₂", co_warning: "CO-Warnung",
    filter_life: "Filterstand", filter_low: "Filter niedrig", replace: "Wechseln",
    reset_filter: "Filter zurücksetzen", confirm_reset: "Wirklich zurücksetzen?",
    mode: "Modus", auto_profile: "Auto-Profil", fan_speed: "Lüfterstufe",
    display: "Display", lock: "Sperre", timer: "Timer", trend_24h: "24h Verlauf",
    sort_default: "Standard", sort_pm25: "PM2.5 hoch", sort_filter: "Filter niedrig", sort_name: "Name",
    devices_word: "Geräte", device_word: "Gerät", sensors_monitored: "Sensoren aktiv",
    ventilate: "Lüften", keep_closed: "Geschlossen halten", outdoor: "Außen", belongs_to: "gehört zu", auto_rule: "Auto-Regel",
  },
  fr: {
    good: "Bon", moderate: "Modéré", sensitive: "Sensible", unhealthy: "Malsain",
    hazardous: "Dangereux", poor: "Médiocre", very_poor: "Très mauvais", elevated: "Élevé",
    dangerous: "Dangereux", critical: "Critique", no_data: "Aucune donnée", running: "Actif",
    standby: "Veille", off: "Arrêt", offline: "Hors ligne", unavailable: "Indisponible",
    whole_home_title: "Qualité de l'Air", air_purifiers: "Purificateurs",
    air_quality_sensors: "Capteurs d'Air", air_quality_monitor: "Moniteur d'Air",
    air_quality_status: "Qualité de l'Air", all: "Tous", purifiers: "Purificateurs", sensors: "Capteurs",
    all_auto: "Tous Auto", all_sleep: "Tous Nuit", all_off: "Tous Arrêt",
    active: "Actifs", purifiers_on: "En marche", avg_pm25: "PM2.5 moy.",
    worst_pm25: "PM2.5 max", max_co2: "CO₂ max", co_warning: "Alerte CO",
    filter_life: "Filtre", filter_low: "Filtre bas", replace: "Remplacer",
    reset_filter: "Réinit. filtre", confirm_reset: "Confirmer réinit. ?",
    mode: "Mode", auto_profile: "Profil Auto", fan_speed: "Vitesse",
    display: "Écran", lock: "Verrou", timer: "Minuterie", trend_24h: "Tendance 24h",
    sort_default: "Ordre", sort_pm25: "PM2.5 max", sort_filter: "Filtre bas", sort_name: "Nom",
    devices_word: "appareils", device_word: "appareil", sensors_monitored: "capteurs suivis",
    ventilate: "Aérer", keep_closed: "Garder fermé", outdoor: "Extérieur", belongs_to: "appartient à", auto_rule: "Règle Auto",
  },
  es: {
    good: "Bueno", moderate: "Moderado", sensitive: "Sensible", unhealthy: "Insalubre",
    hazardous: "Peligroso", poor: "Deficiente", very_poor: "Muy malo", elevated: "Elevado",
    dangerous: "Peligroso", critical: "Crítico", no_data: "Sin datos", running: "Activo",
    standby: "En espera", off: "Apagado", offline: "Desconectado", unavailable: "No disponible",
    whole_home_title: "Calidad del Aire", air_purifiers: "Purificadores",
    air_quality_sensors: "Sensores de Aire", air_quality_monitor: "Monitor de Aire",
    air_quality_status: "Estado del Aire", all: "Todos", purifiers: "Purificadores", sensors: "Sensores",
    all_auto: "Todos Auto", all_sleep: "Todos Noche", all_off: "Apagar Todos",
    active: "Activos", purifiers_on: "Encendidos", avg_pm25: "PM2.5 prom.",
    worst_pm25: "PM2.5 máx.", max_co2: "CO₂ máx.", co_warning: "Alerta CO",
    filter_life: "Vida Filtro", filter_low: "Filtro bajo", replace: "Cambiar",
    reset_filter: "Reiniciar filtro", confirm_reset: "¿Confirmar reinicio?",
    mode: "Modo", auto_profile: "Perfil Auto", fan_speed: "Velocidad",
    display: "Pantalla", lock: "Bloqueo", timer: "Temporizador", trend_24h: "Tendencia 24h",
    sort_default: "Orden", sort_pm25: "Peor PM2.5", sort_filter: "Filtro bajo", sort_name: "Nombre",
    devices_word: "dispositivos", device_word: "dispositivo", sensors_monitored: "sensores activos",
    ventilate: "Ventilar", keep_closed: "Mantener cerrado", outdoor: "Exterior", belongs_to: "pertenece a", auto_rule: "Regla Auto",
  },
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
  reset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
};

/* ---------- Core Helpers ---------- */

const escapeHtml = (v) =>
  v === null || v === undefined
    ? ""
    : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const isUnavailable = (s) =>
  s === undefined || s === null || s === "" || s === "unavailable" || s === "unknown";

const toNumber = (v) => {
  if (isUnavailable(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const formatNum = (v, dec = 0) => {
  const n = toNumber(v);
  if (n === null) return "—";
  return dec === 0 ? String(Math.round(n)) : n.toFixed(dec);
};

const titleCase = (s) =>
  s ? String(s).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

const resolveLang = (cfgLang, hass) => {
  const raw = cfgLang && cfgLang !== "auto" ? cfgLang : hass?.locale?.language || hass?.language || "en";
  const code = String(raw || "en").slice(0, 2).toLowerCase();
  return I18N[code] ? code : "en";
};

const tr = (lang, key) => (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;

function getFanPrefixes(fanId) {
  if (!fanId || !fanId.includes(".")) return [];
  const slug = fanId.split(".")[1];
  const stripped = slug.replace(/_(air_purifier|air_cleaner|purifier|cleaner|fan)$/, "");
  return stripped && stripped !== slug ? [stripped, slug] : [slug];
}

function makeSheet(css) {
  try {
    if (typeof CSSStyleSheet !== "undefined" && "replaceSync" in CSSStyleSheet.prototype) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      return sheet;
    }
  } catch { /* fallback to <style> */ }
  return null;
}

function applyStyles(shadowRoot, sheet, css) {
  if (sheet && "adoptedStyleSheets" in shadowRoot) {
    shadowRoot.adoptedStyleSheets = [sheet];
  } else {
    const style = document.createElement("style");
    style.textContent = css;
    shadowRoot.appendChild(style);
  }
}

/* ---------- History & Sparkline Cache ---------- */

function recordRollingPoint(entityId, num) {
  if (!entityId || num === null || !Number.isFinite(num)) return;
  let arr = ROLLING_HISTORY.get(entityId);
  if (!arr) { arr = []; ROLLING_HISTORY.set(entityId, arr); }
  if (!arr.length || arr[arr.length - 1] !== num) {
    arr.push(num);
    if (arr.length > 48) arr.shift();
  }
}

function getEntityHistory(hass, entityId, onLoaded) {
  if (!entityId) return [];
  const cached = HISTORY_CACHE.get(entityId);
  const now = Date.now();
  if (cached && now - cached.ts < HISTORY_TTL_MS) return cached.points;

  if (typeof hass?.callApi === "function" && !HISTORY_INFLIGHT.has(entityId)) {
    HISTORY_INFLIGHT.add(entityId);
    const startIso = new Date(now - 86_400_000).toISOString();
    const path = `history/period/${startIso}?filter_entity_id=${encodeURIComponent(entityId)}&minimal_response&no_attributes`;
    Promise.resolve(hass.callApi("GET", path))
      .then((res) => {
        const raw = Array.isArray(res) && Array.isArray(res[0]) ? res[0] : Array.isArray(res) ? res : [];
        const pts = [];
        for (const item of raw) {
          const val = toNumber(typeof item === "object" ? item.state ?? item.v : item);
          if (val !== null) pts.push(val);
        }
        const maxLen = 36;
        const sampled = pts.length <= maxLen
          ? pts
          : Array.from({ length: maxLen }, (_, i) => pts[Math.round((i * (pts.length - 1)) / (maxLen - 1))]);
        HISTORY_CACHE.set(entityId, { ts: Date.now(), points: sampled });
        if (sampled.length >= 2 && typeof onLoaded === "function") onLoaded();
      })
      .catch(() => HISTORY_CACHE.set(entityId, { ts: Date.now(), points: [] }))
      .finally(() => HISTORY_INFLIGHT.delete(entityId));
  }
  return cached?.points?.length ? cached.points : ROLLING_HISTORY.get(entityId) || [];
}

/* ---------- Air Quality Evaluators ---------- */

function evalBand(n, cuts, labels, colors, pct) {
  for (let i = 0; i < cuts.length; i++) {
    if (n <= cuts[i]) return { label: labels[i], color: colors[i], pct };
  }
  return { label: labels[labels.length - 1], color: colors[colors.length - 1], pct: 100 };
}

const BAND_COLORS_4 = ["var(--daq-green)", "var(--daq-yellow)", "var(--daq-orange)", "var(--daq-red)"];
const BAND_COLORS_5 = [...BAND_COLORS_4, "var(--daq-pink)"];

function evaluatePM25(val, th = null, lang = "en") {
  const n = toNumber(val);
  if (n === null) return { label: tr(lang, "no_data"), color: "var(--daq-muted)", pct: 0 };
  const t = th?.pm25;
  const cuts = Array.isArray(t)
    ? [t[0] ?? 12, t[1] ?? 35, t[2] ?? 55, t[3] ?? 150]
    : [t?.good ?? 12, t?.moderate ?? 35, t?.sensitive ?? 55, t?.unhealthy ?? 150];
  const pct = Math.min(100, Math.max(4, (n / Math.max(cuts[2] * 1.35, 75)) * 100));
  return evalBand(n, cuts, [tr(lang, "good"), tr(lang, "moderate"), tr(lang, "sensitive"), tr(lang, "unhealthy"), tr(lang, "hazardous")], BAND_COLORS_5, pct);
}

function evaluateCO(val, th = null, lang = "en") {
  const n = toNumber(val);
  if (n === null) return { label: tr(lang, "no_data"), color: "var(--daq-muted)", pct: 0 };
  const t = th?.co;
  const cuts = Array.isArray(t)
    ? [t[0] ?? 9, t[1] ?? 35, t[2] ?? 70]
    : [t?.good ?? 9, t?.elevated ?? 35, t?.dangerous ?? 70];
  const pct = Math.min(100, Math.max(4, (n / Math.max(cuts[2] * 1.4, 100)) * 100));
  return evalBand(n, cuts, [tr(lang, "good"), tr(lang, "elevated"), tr(lang, "dangerous"), tr(lang, "critical")], BAND_COLORS_4, pct);
}

function evaluateCO2(val, th = null, lang = "en") {
  const n = toNumber(val);
  if (n === null) return { label: tr(lang, "no_data"), color: "var(--daq-muted)", pct: 0 };
  const t = th?.co2;
  const cuts = Array.isArray(t)
    ? [t[0] ?? 800, t[1] ?? 1200, t[2] ?? 1800]
    : [t?.good ?? 800, t?.moderate ?? 1200, t?.poor ?? 1800];
  const pct = Math.min(100, Math.max(6, ((n - 400) / Math.max(cuts[2] - 200, 1600)) * 100));
  return evalBand(n, cuts, [tr(lang, "good"), tr(lang, "moderate"), tr(lang, "poor"), tr(lang, "very_poor")], BAND_COLORS_4, pct);
}

function evaluateVOC(val, unit = "", lang = "en") {
  const n = toNumber(val);
  if (n === null) return { label: tr(lang, "no_data"), color: "var(--daq-muted)", pct: 0 };
  const u = String(unit || "").toLowerCase().trim();
  const labels = [tr(lang, "good"), tr(lang, "moderate"), tr(lang, "poor"), tr(lang, "very_poor")];
  if (u === "ppb") return evalBand(n, [220, 660, 1430], labels, BAND_COLORS_4, Math.min(100, Math.max(5, (n / 1500) * 100)));
  if (u.includes("g/m")) {
    const ug = u.startsWith("mg") ? n * 1000 : n;
    return evalBand(ug, [300, 500, 1000], labels, BAND_COLORS_4, Math.min(100, Math.max(5, (ug / 1200) * 100)));
  }
  return evalBand(n, [150, 250, 400], labels, BAND_COLORS_4, Math.min(100, Math.max(5, (n / 500) * 100)));
}

function evaluateAQI(val, lang = "en") {
  const n = toNumber(val);
  if (n === null) {
    if (isUnavailable(val)) return { label: tr(lang, "no_data"), color: "var(--daq-muted)", pct: 0 };
    const s = String(val).toLowerCase();
    if (s.includes("good") || s.includes("excellent")) return { label: titleCase(val), color: "var(--daq-green)", pct: 20 };
    if (s.includes("moderate") || s.includes("fair")) return { label: titleCase(val), color: "var(--daq-yellow)", pct: 45 };
    if (s.includes("poor") || s.includes("sensitive")) return { label: titleCase(val), color: "var(--daq-orange)", pct: 70 };
    return { label: titleCase(val), color: "var(--daq-red)", pct: 90 };
  }
  const labels = [tr(lang, "good"), tr(lang, "moderate"), tr(lang, "sensitive"), tr(lang, "unhealthy"), tr(lang, "hazardous")];
  if (n <= 5) return evalBand(n, [1, 2, 3, 4], labels, BAND_COLORS_5, Math.min(100, Math.max(20, n * 20)));
  return evalBand(n, [50, 100, 150, 200], labels, BAND_COLORS_5, Math.min(100, Math.max(5, (n / 200) * 100)));
}

function evaluateMetricColor(key, val, unit = "", th = null) {
  const n = toNumber(val);
  if (n === null) return "var(--daq-muted)";
  const u = String(unit || "").toLowerCase().trim();
  const color4 = (v, cuts) => evalBand(v, cuts, ["", "", "", ""], BAND_COLORS_4, 0).color;
  switch (key) {
    case "pm25": return evaluatePM25(n, th).color;
    case "pm10": return color4(n, [54, 154, 254]);
    case "pm1": return color4(n, [10, 25, 50]);
    case "aqi": return evaluateAQI(n).color;
    case "co": return evaluateCO(n, th).color;
    case "co2": return evaluateCO2(n, th).color;
    case "voc": case "tvoc": return evaluateVOC(n, unit).color;
    case "nox": return color4(n, [20, 150, 300]);
    case "no2": return color4(u === "ppb" ? n * 1.88 : n, [40, 100, 200]);
    case "o3": return color4(u === "ppb" ? n * 1.96 : n, [100, 160, 240]);
    case "hcho": return color4(u.startsWith("mg") ? n * 1000 : u === "ppb" ? n * 1.23 : n, [30, 80, 120]);
    case "radon": return color4(u.includes("pci") ? n * 37 : n, [100, 150, 300]);
    case "humidity": return n >= 30 && n <= 60 ? "var(--daq-cyan)" : n >= 20 && n <= 70 ? "var(--daq-yellow)" : "var(--daq-orange)";
    case "pressure": return "var(--daq-cyan)";
    default: return "var(--daq-purple)";
  }
}

function evaluateFilterColor(pct, isLow) {
  if (isLow) return "var(--daq-red)";
  const n = toNumber(pct);
  if (n === null) return "var(--daq-muted)";
  return n <= 10 ? "var(--daq-red)" : n <= 25 ? "var(--daq-orange)" : n <= 45 ? "var(--daq-yellow)" : "var(--daq-green)";
}

function formatTimerValue(val, unit) {
  const n = toNumber(val);
  if (n === null) {
    if (isUnavailable(val)) return null;
    const s = String(val).trim();
    return /^(0|00:00(:00)?|off|none)$/i.test(s) ? null : s;
  }
  if (n <= 0) return null;
  const u = (unit || "").toLowerCase();
  if (u.startsWith("h")) return `${n}h`;
  const mins = u.startsWith("s") ? Math.round(n / 60) : Math.round(n);
  if (mins >= 60) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

/* ---------- Whole-Home Auto-Discovery & Device State ---------- */

function inferAqSensorKeyFromSlug(slug) {
  if (/_(voc_index|voc)$/.test(slug)) return "voc";
  if (/_tvoc$/.test(slug)) return "tvoc";
  if (/_(nox_index|nox)$/.test(slug)) return "nox";
  if (/_no2$/.test(slug)) return "no2";
  if (/_o3$/.test(slug)) return "o3";
  if (/_hcho$/.test(slug)) return "hcho";
  if (/_radon$/.test(slug)) return "radon";
  return null;
}

function autoDiscoverWholeHomeDevices(states, excludeList = []) {
  const exclude = new Set(Array.isArray(excludeList) ? excludeList : []);
  const devices = [];
  const fans = Object.keys(states).filter((id) => id.startsWith("fan.") && !exclude.has(id));
  const fanPrefixes = fans.flatMap((id) => getFanPrefixes(id));
  for (const fanId of fans) devices.push(fanId);

  const aqClasses = new Set(["pm25", "carbon_dioxide", "carbon_monoxide", "volatile_organic_compounds", "volatile_organic_compounds_parts", "nitrogen_dioxide", "ozone"]);
  const sensorGroups = new Map();
  for (const [eid, st] of Object.entries(states)) {
    if (exclude.has(eid) || (!eid.startsWith("sensor.") && !eid.startsWith("binary_sensor."))) continue;
    const dc = st?.attributes?.device_class;
    const slug = eid.split(".")[1] || "";
    if (fanPrefixes.some((p) => slug === p || slug.startsWith(`${p}_`))) continue;
    const prefix = slug.replace(/_(pm25|pm2_5|pm_2_5|pm10|pm1|co2|carbon_dioxide|co_alarm|co|carbon_monoxide|voc_index|voc|tvoc|nox_index|nox|no2|o3|temperature|humidity|hcho|radon)$/, "");
    if (eid.startsWith("binary_sensor.") && (dc === "carbon_monoxide" || dc === "gas")) {
      if (!sensorGroups.has(prefix)) sensorGroups.set(prefix, { name: titleCase(prefix || "Air Monitor"), sensors: {} });
      sensorGroups.get(prefix).sensors[dc === "gas" ? "gas_alarm" : "co_alarm"] = eid;
    } else if (eid.startsWith("sensor.")) {
      const mapped = (dc && aqClasses.has(dc)) ? DEVICE_CLASS_TO_SENSOR[dc] : inferAqSensorKeyFromSlug(slug);
      if (!mapped) continue;
      if (!sensorGroups.has(prefix)) sensorGroups.set(prefix, { name: titleCase(prefix || "Air Monitor"), sensors: {} });
      sensorGroups.get(prefix).sensors[mapped] = eid;
    }
  }
  // Attach companion sensors (temp/humidity/pm10/voc_index/nox_index) sharing an already-discovered monitor prefix
  const diagTempRe = /(?:^|_)(esp32|chip|cpu|mcu|soc|internal)_temp(?:erature)?$/i;
  for (const [eid, st] of Object.entries(states)) {
    if (exclude.has(eid) || !eid.startsWith("sensor.")) continue;
    const slug = eid.split(".")[1] || "";
    const dc = st?.attributes?.device_class;
    const mapped = (dc && DEVICE_CLASS_TO_SENSOR[dc]) || inferAqSensorKeyFromSlug(slug);
    if (!mapped) continue;
    if (mapped === "temperature" && diagTempRe.test(slug)) continue;
    for (const [prefix, grp] of sensorGroups.entries()) {
      if (!prefix || !slug.startsWith(`${prefix}_`)) continue;
      const isExactTemp = mapped === "temperature" && slug === `${prefix}_temperature`;
      if (!grp.sensors[mapped] || isExactTemp) {
        grp.sensors[mapped] = eid;
      }
    }
  }
  for (const entry of sensorGroups.values()) devices.push(entry);
  return devices;
}

function resolveDeviceState(hass, itemConfig, discoveryCache = null, thresholds = null) {
  const states = hass?.states || {};
  const cfg = typeof itemConfig === "string" ? { entity: itemConfig } : itemConfig || {};
  const fanId = cfg.entity || null;
  const fanState = fanId ? states[fanId] : null;
  const isPurifier = Boolean(fanId);
  const prefixes = isPurifier ? getFanPrefixes(fanId) : [];

  let dcMatches = null;
  let cachedMap = null;
  if (isPurifier && discoveryCache) {
    const entry = discoveryCache.get(fanId);
    if (entry) { dcMatches = entry.dcMatches; cachedMap = entry.map; }
  }
  if (!dcMatches) {
    dcMatches = {};
    if (isPurifier && prefixes.length) {
      for (const [eid, st] of Object.entries(states)) {
        const dc = st?.attributes?.device_class;
        if (!dc) continue;
        const isSens = eid.startsWith("sensor."), isBin = eid.startsWith("binary_sensor.");
        if (!isSens && !isBin) continue;
        const slug = eid.split(".")[1] || "";
        if (!prefixes.some((p) => slug === p || slug.startsWith(`${p}_`))) continue;
        if (isBin && dc === "carbon_monoxide" && !dcMatches.co_alarm) dcMatches.co_alarm = eid;
        else if (isBin && dc === "gas" && !dcMatches.gas_alarm) dcMatches.gas_alarm = eid;
        else if (isSens && DEVICE_CLASS_TO_SENSOR[dc] && !dcMatches[DEVICE_CLASS_TO_SENSOR[dc]]) {
          dcMatches[DEVICE_CLASS_TO_SENSOR[dc]] = eid;
        }
      }
    }
    if (isPurifier && discoveryCache) {
      cachedMap = {};
      discoveryCache.set(fanId, { dcMatches, map: cachedMap });
    }
  }

  const watchedIds = new Set();
  if (fanId) watchedIds.add(fanId);

  const findEntity = (overrideId, key) => {
    if (overrideId) { watchedIds.add(overrideId); return overrideId; }
    if (!isPurifier) return null;
    if (cachedMap && key in cachedMap) {
      if (cachedMap[key]) watchedIds.add(cachedMap[key]);
      return cachedMap[key];
    }
    let found = null;
    for (const p of prefixes) {
      for (const tpl of DISCOVERY_SUFFIXES[key] || []) {
        const cand = tpl.replace("{p}", p);
        if (states[cand]) { found = cand; break; }
      }
      if (found) break;
    }
    if (!found && dcMatches[key]) found = dcMatches[key];
    if (cachedMap) cachedMap[key] = found;
    if (found) watchedIds.add(found);
    return found;
  };

  const sensors = {};
  for (const key of SENSOR_KEYS) {
    const explicitId = cfg[`${key}_entity`] || cfg.sensors?.[key] || null;
    const entityId = findEntity(explicitId, key);
    const st = entityId ? states[entityId] : null;
    if (st && !isUnavailable(st.state)) {
      const numVal = toNumber(st.state);
      if (numVal !== null) recordRollingPoint(entityId, numVal);
      sensors[key] = { entityId, raw: st.state, num: numVal, unit: st.attributes?.unit_of_measurement ?? SENSOR_META[key].defaultUnit };
    } else if (explicitId || st) {
      sensors[key] = { entityId: explicitId || entityId, raw: null, num: null, unit: st?.attributes?.unit_of_measurement ?? SENSOR_META[key].defaultUnit };
    }
  }

  const fanAttrs = fanState?.attributes || {};
  if (!sensors.pm25 && !isUnavailable(fanAttrs.pm25 ?? fanAttrs.pm2_5 ?? fanAttrs.pm_2_5)) {
    const v = fanAttrs.pm25 ?? fanAttrs.pm2_5 ?? fanAttrs.pm_2_5;
    sensors.pm25 = { entityId: fanId, raw: v, num: toNumber(v), unit: "µg/m³" };
  }
  if (!sensors.aqi && !isUnavailable(fanAttrs.aqi ?? fanAttrs.air_quality ?? fanAttrs.air_quality_index)) {
    const v = fanAttrs.aqi ?? fanAttrs.air_quality ?? fanAttrs.air_quality_index;
    sensors.aqi = { entityId: fanId, raw: v, num: toNumber(v), unit: "" };
  }

  const cadrId = findEntity(cfg.cadr_entity, "cadr");
  const cadrSt = cadrId ? states[cadrId] : null;
  const cadr = cadrSt && !isUnavailable(cadrSt.state)
    ? { entityId: cadrId, num: toNumber(cadrSt.state), unit: cadrSt.attributes?.unit_of_measurement || "m³/h" }
    : !isUnavailable(fanAttrs.cadr) ? { entityId: fanId, num: toNumber(fanAttrs.cadr), unit: "m³/h" } : null;

  const filterId = findEntity(cfg.filter_entity, "filter");
  const filterSt = filterId ? states[filterId] : null;
  const filterAttr = fanAttrs.filter_life ?? fanAttrs.filter_life_remaining ?? fanAttrs.filter_remaining;
  const filter = filterSt && !isUnavailable(filterSt.state)
    ? { entityId: filterId, num: toNumber(filterSt.state), unit: filterSt.attributes?.unit_of_measurement || "%" }
    : !isUnavailable(filterAttr) ? { entityId: fanId, num: toNumber(filterAttr), unit: "%" } : null;

  const filterLowId = findEntity(cfg.filter_low_entity, "filter_low");
  const filterLow = (filterLowId && states[filterLowId]?.state === "on") || (filter?.num !== null && filter?.num !== undefined && filter.num <= 10);
  const filterResetId = findEntity(cfg.filter_reset_entity, "filter_reset");

  const displayId = findEntity(cfg.display_entity, "display");
  const displaySt = displayId ? states[displayId] : null;
  const childLockId = findEntity(cfg.child_lock_entity, "child_lock");
  const childLockSt = childLockId ? states[childLockId] : null;
  const opModeId = findEntity(cfg.operating_mode_entity, "operating_mode");
  const opModeSt = opModeId ? states[opModeId] : null;
  const autoModeId = findEntity(cfg.auto_mode_entity, "auto_mode");
  const autoModeSt = autoModeId ? states[autoModeId] : null;
  const timerId = findEntity(cfg.timer_entity, "timer");
  const timerSt = timerId ? states[timerId] : null;
  const timerRemId = findEntity(cfg.timer_remaining_entity, "timer_remaining");
  const timerRemSt = timerRemId ? states[timerRemId] : null;
  const coAlarmId = findEntity(cfg.co_alarm_entity || cfg.sensors?.co_alarm, "co_alarm");
  const gasAlarmId = findEntity(cfg.gas_alarm_entity || cfg.sensors?.gas_alarm, "gas_alarm");
  const coAlarmOn = Boolean(coAlarmId && states[coAlarmId]?.state === "on");
  const gasAlarmOn = Boolean(gasAlarmId && states[gasAlarmId]?.state === "on");
  const coWarnCut = Array.isArray(thresholds?.co) ? thresholds.co[1] ?? 35 : thresholds?.co?.elevated ?? 35;
  const coDanger = coAlarmOn || gasAlarmOn || (sensors.co?.num !== null && sensors.co?.num !== undefined && sensors.co.num >= coWarnCut);

  const errorId = findEntity(cfg.error_entity, "error");
  const errorSt = errorId ? states[errorId] : null;
  const hasError = errorSt && !isUnavailable(errorSt.state) && !/^(off|none|0|ok)$/i.test(String(errorSt.state));

  let modes = [], currentMode = null, modeSource = null;
  if (opModeSt && Array.isArray(opModeSt.attributes?.options) && opModeSt.attributes.options.length) {
    modes = opModeSt.attributes.options; currentMode = opModeSt.state; modeSource = { type: "select", entityId: opModeId };
  } else if (Array.isArray(fanAttrs.preset_modes) && fanAttrs.preset_modes.length) {
    modes = fanAttrs.preset_modes; currentMode = fanAttrs.preset_mode || null; modeSource = { type: "fan", entityId: fanId };
  }

  const autoRuleId = cfg.automation_entity || null;
  if (autoRuleId) watchedIds.add(autoRuleId);
  const autoRuleSt = autoRuleId ? states[autoRuleId] : null;

  return {
    cfg, isPurifier,
    isUnavailable: isPurifier && (!fanState || isUnavailable(fanState.state)),
    name: cfg.name || fanAttrs.friendly_name || (fanId ? titleCase(fanId.split(".")[1]) : "Air Quality"),
    group: cfg.group || cfg.room || null,
    fanId, fanState, isOn: fanState?.state === "on",
    percentage: toNumber(fanAttrs.percentage),
    percentageStep: toNumber(fanAttrs.percentage_step) || 25,
    sensors, cadr, filter, filterLow,
    filterResetId: filterResetId && states[filterResetId] ? filterResetId : null,
    automation: autoRuleSt ? { entityId: autoRuleId, on: autoRuleSt.state === "on" } : null,
    coAlarm: coAlarmOn ? { entityId: coAlarmId, type: "CO Alarm" } : gasAlarmOn ? { entityId: gasAlarmId, type: "Gas Alarm" } : null,
    coDanger,
    display: displaySt ? { entityId: displayId, on: displaySt.state === "on", domain: displayId.split(".")[0] } : null,
    childLock: childLockSt ? { entityId: childLockId, on: childLockSt.state === "locked" || childLockSt.state === "on", domain: childLockId.split(".")[0] } : null,
    modes, currentMode, modeSource,
    autoMode: autoModeSt ? { entityId: autoModeId, options: autoModeSt.attributes?.options || [], current: autoModeSt.state } : null,
    timer: timerSt ? { entityId: timerId, state: timerSt.state, domain: timerId.split(".")[0], attrs: timerSt.attributes || {} } : null,
    timerRemaining: timerRemSt ? { entityId: timerRemId } : null,
    timerLabel: timerRemSt
      ? formatTimerValue(timerRemSt.state, timerRemSt.attributes?.unit_of_measurement)
      : timerSt ? formatTimerValue(timerSt.state, timerSt.attributes?.unit_of_measurement) : null,
    error: hasError ? { entityId: errorId, message: errorSt.state === "on" ? "Error" : String(errorSt.state) } : null,
    watchedIds: Array.from(watchedIds),
  };
}

/* ---------- Shared Stylesheets ---------- */

const CARD_CSS = `
  :host {
    display: block;
    container-type: inline-size;
    font-family: var(--paper-font-body1_-_font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    --daq-bg: #282a36; --daq-surface: #21222c; --daq-surface-2: #313444; --daq-current: #44475a;
    --daq-border: rgba(98, 114, 164, 0.28); --daq-fg: #f8f8f2; --daq-subtext: #b8c0e0; --daq-muted: #6272a4;
    --daq-purple: #bd93f9; --daq-pink: #ff79c6; --daq-cyan: #8be9fd;
    --daq-green: #50fa7b; --daq-yellow: #f1fa8c; --daq-orange: #ffb86c; --daq-red: #ff5555;
    --daq-radius: 16px; --daq-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  }
  :host([data-theme="dracula-soft"]) {
    --daq-bg: #2d303e; --daq-surface: #252734; --daq-surface-2: #36394b; --daq-current: #494d64;
    --daq-border: rgba(139, 150, 196, 0.24); --daq-fg: #eef0f7; --daq-subtext: #b7bfd9; --daq-muted: #7b86b0;
    --daq-purple: #b89bf2; --daq-pink: #f08cc8; --daq-cyan: #89dce8;
    --daq-green: #69e28c; --daq-yellow: #e8ee9a; --daq-orange: #f2b77a; --daq-red: #f06e6e;
    --daq-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
  }
  :host([data-theme="auto"]) {
    --daq-bg: var(--ha-card-background, var(--card-background-color, #282a36));
    --daq-surface: var(--secondary-background-color, rgba(127, 127, 127, 0.08));
    --daq-surface-2: var(--secondary-background-color, rgba(127, 127, 127, 0.14));
    --daq-current: var(--divider-color, rgba(127, 127, 127, 0.24));
    --daq-border: var(--divider-color, rgba(127, 127, 127, 0.22));
    --daq-fg: var(--primary-text-color, #f8f8f2); --daq-subtext: var(--secondary-text-color, #b8c0e0);
    --daq-muted: var(--secondary-text-color, #8892b0); --daq-purple: var(--primary-color, #bd93f9);
    --daq-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.12));
  }
  @media (prefers-color-scheme: light) {
    :host([data-theme="auto"]) {
      --daq-green: #16a34a; --daq-yellow: #ca8a04; --daq-orange: #ea580c;
      --daq-red: #dc2626; --daq-cyan: #0891b2; --daq-pink: #db2777;
    }
  }
  * { box-sizing: border-box; }
  button:focus-visible, [role="button"]:focus-visible, select:focus-visible { outline: 2px solid var(--daq-purple); outline-offset: 2px; }
  .card {
    background: var(--daq-bg); color: var(--daq-fg); border: 1px solid var(--daq-border);
    border-radius: var(--daq-radius); box-shadow: var(--daq-shadow), inset 0 1px 0 rgba(248, 248, 242, 0.05);
    padding: 18px; display: flex; flex-direction: column; gap: 14px; position: relative; overflow: hidden;
  }
  .card.ambient::before {
    content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--daq-ambient, linear-gradient(90deg, var(--daq-purple), var(--daq-green)));
    opacity: 0.85; pointer-events: none;
  }
  .card.ambient-good { --daq-ambient: linear-gradient(90deg, var(--daq-purple), var(--daq-green)); }
  .card.ambient-moderate { --daq-ambient: linear-gradient(90deg, var(--daq-purple), var(--daq-yellow)); }
  .card.ambient-warn { --daq-ambient: linear-gradient(90deg, var(--daq-orange), var(--daq-yellow)); }
  .card.ambient-alert { --daq-ambient: linear-gradient(90deg, var(--daq-red), var(--daq-pink)); border-color: rgba(255, 85, 85, 0.45); }
  .card.compact { padding: 13px 14px; gap: 10px; }
  .header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .title-wrap { min-width: 0; flex: 1; }
  .title { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; color: var(--daq-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .subtitle { font-size: 12px; color: var(--daq-subtext); margin-top: 2px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .error-badge, .filter-low-badge, .vent-pill {
    display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px;
    font-size: 11px; font-weight: 700; cursor: pointer; width: fit-content;
  }
  .error-badge { background: rgba(255, 85, 85, 0.16); border: 1px solid rgba(255, 85, 85, 0.45); color: var(--daq-red); }
  .filter-low-badge { background: rgba(255, 184, 108, 0.14); border: 1px solid rgba(255, 184, 108, 0.5); color: var(--daq-orange); }
  .vent-pill.good { background: rgba(139, 233, 253, 0.14); border: 1px solid rgba(139, 233, 253, 0.45); color: var(--daq-cyan); }
  .vent-pill.warn { background: rgba(255, 184, 108, 0.15); border: 1px solid rgba(255, 184, 108, 0.5); color: var(--daq-orange); }
  .error-badge svg, .filter-low-badge svg, .vent-pill svg { width: 13px; height: 13px; flex-shrink: 0; }
  .offline-badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 600; color: var(--daq-muted); border: 1px dashed var(--daq-muted); }
  .power-btn {
    width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--daq-border);
    background: var(--daq-surface); color: var(--daq-muted); display: inline-flex; align-items: center;
    justify-content: center; cursor: pointer; transition: all 0.18s ease; padding: 0;
  }
  .power-btn svg { width: 18px; height: 18px; }
  .power-btn:hover { border-color: var(--daq-purple); color: var(--daq-fg); }
  .power-btn.on { background: rgba(189, 147, 249, 0.18); border-color: var(--daq-purple); color: var(--daq-purple); box-shadow: 0 0 14px rgba(189, 147, 249, 0.25); }
  .power-btn.sm { width: 28px; height: 28px; }
  .power-btn.sm svg { width: 14px; height: 14px; }
  .hero { display: flex; align-items: center; gap: 16px; }
  .card.compact .hero { gap: 12px; }
  .gauge-wrap { position: relative; width: 112px; height: 112px; flex-shrink: 0; cursor: pointer; }
  .card.compact .gauge-wrap { width: 90px; height: 90px; }
  .gauge-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .gauge-track { fill: none; stroke: var(--daq-current); stroke-width: 8; opacity: 0.55; }
  .gauge-progress { fill: none; stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease; }
  .gauge-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; }
  .gauge-value { font-size: 26px; font-weight: 800; line-height: 1.05; font-variant-numeric: tabular-nums; color: var(--daq-fg); }
  .card.compact .gauge-value { font-size: 21px; }
  .gauge-unit { font-size: 10px; font-weight: 600; color: var(--daq-subtext); margin-top: 2px; }
  .gauge-metric { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--daq-muted); margin-bottom: 1px; }
  .hero-details { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  .health-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700; width: fit-content; background: var(--daq-surface); border: 1px solid var(--daq-border); }
  .health-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .stat-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-chip { background: var(--daq-surface); border: 1px solid var(--daq-border); border-radius: 10px; padding: 6px 10px; display: flex; align-items: center; gap: 7px; font-size: 12px; cursor: pointer; }
  .stat-chip:hover { border-color: var(--daq-purple); }
  .stat-chip svg { width: 14px; height: 14px; color: var(--daq-cyan); flex-shrink: 0; }
  .stat-chip .k { color: var(--daq-subtext); font-size: 11px; }
  .stat-chip .v { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--daq-fg); }
  .filter-block { background: var(--daq-surface); border: 1px solid var(--daq-border); border-radius: 10px; padding: 7px 10px; display: flex; flex-direction: column; gap: 5px; cursor: pointer; }
  .filter-top { display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; gap: 8px; }
  .filter-label { display: inline-flex; align-items: center; gap: 5px; color: var(--daq-subtext); }
  .filter-label svg { width: 13px; height: 13px; }
  .filter-pct { font-weight: 700; font-variant-numeric: tabular-nums; }
  .bar-track { height: 5px; border-radius: 999px; background: var(--daq-current); overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 999px; transition: width 0.35s ease; }
  .section-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--daq-muted); margin-bottom: 5px; }
  .pill-group, .master-bar, .utility-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .pill-btn {
    border: 1px solid var(--daq-border); background: var(--daq-surface); color: var(--daq-subtext);
    border-radius: 10px; padding: 6px 11px; font-size: 12px; font-weight: 600; cursor: pointer;
    transition: all 0.15s ease; font-family: inherit; display: inline-flex; align-items: center; gap: 5px;
  }
  .pill-btn:hover { border-color: var(--daq-purple); color: var(--daq-fg); }
  .pill-btn.active { background: rgba(189, 147, 249, 0.2); border-color: var(--daq-purple); color: var(--daq-fg); }
  .pill-btn.active-cyan { background: rgba(139, 233, 253, 0.16); border-color: var(--daq-cyan); color: var(--daq-cyan); }
  .pill-btn.active-green { background: rgba(80, 250, 123, 0.14); border-color: var(--daq-green); color: var(--daq-green); }
  .pill-btn.warn { background: rgba(255, 184, 108, 0.16); border-color: rgba(255, 184, 108, 0.55); color: var(--daq-orange); }
  .pill-btn.danger { background: rgba(255, 85, 85, 0.2); border-color: var(--daq-red); color: #ff7b7b; }
  .pill-btn svg { width: 14px; height: 14px; }
  .pill-btn.xs { padding: 4px 8px; font-size: 11px; border-radius: 8px; }
  .speed-wrap { display: flex; flex-direction: column; gap: 6px; }
  .speed-head { display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: var(--daq-subtext); }
  .speed-val { font-weight: 700; color: var(--daq-cyan); font-variant-numeric: tabular-nums; }
  .speed-steps { display: grid; gap: 6px; }
  .speed-step { height: 28px; border-radius: 8px; border: 1px solid var(--daq-border); background: var(--daq-surface); color: var(--daq-subtext); font-size: 11.5px; font-weight: 700; font-family: inherit; cursor: pointer; }
  .speed-step:hover { border-color: var(--daq-cyan); color: var(--daq-fg); }
  .speed-step.filled { background: rgba(139, 233, 253, 0.16); border-color: rgba(139, 233, 253, 0.45); color: var(--daq-cyan); }
  .speed-step.current { background: rgba(189, 147, 249, 0.24); border-color: var(--daq-purple); color: var(--daq-fg); }
  .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(104px, 1fr)); gap: 8px; }
  .card.compact .metrics-grid { grid-template-columns: repeat(auto-fit, minmax(88px, 1fr)); gap: 6px; }
  .metric-tile {
    background: var(--daq-surface); border: 1px solid var(--daq-border); border-radius: 12px;
    padding: 10px 11px; display: flex; flex-direction: column; gap: 4px; position: relative;
    cursor: pointer; transition: transform 0.14s ease, border-color 0.15s ease; overflow: hidden;
  }
  .metric-tile::before { content: ""; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--tile-accent, var(--daq-purple)); }
  .metric-tile:hover { border-color: var(--daq-purple); transform: translateY(-1px); }
  .metric-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--daq-subtext); padding-left: 4px; }
  .metric-val-row { display: flex; align-items: baseline; gap: 4px; padding-left: 4px; }
  .metric-val { font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--daq-fg); line-height: 1.1; }
  .metric-unit { font-size: 10.5px; color: var(--daq-muted); font-weight: 600; }
  .summary-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(95px, 1fr)); gap: 8px; }
  .summary-tile { background: var(--daq-surface); border: 1px solid var(--daq-border); border-radius: 12px; padding: 9px 11px; display: flex; flex-direction: column; gap: 2px; }
  .summary-tile.alert { border-color: rgba(255, 85, 85, 0.6); background: rgba(255, 85, 85, 0.12); }
  .summary-k { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--daq-muted); }
  .summary-v { font-size: 17px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--daq-fg); line-height: 1.2; }
  .summary-sub { font-size: 10.5px; color: var(--daq-subtext); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .room-list, .group-section { display: flex; flex-direction: column; gap: 6px; }
  .room-item { background: var(--daq-surface); border: 1px solid var(--daq-border); border-radius: 12px; overflow: hidden; transition: border-color 0.15s ease; }
  .room-item.expanded { border-color: rgba(189, 147, 249, 0.5); }
  .room-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; cursor: pointer; user-select: none; }
  .room-row:hover { background: rgba(68, 71, 90, 0.35); }
  .room-left { display: flex; align-items: center; gap: 9px; min-width: 0; flex: 1; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .room-meta { min-width: 0; display: flex; flex-direction: column; }
  .room-name { font-size: 13.5px; font-weight: 700; color: var(--daq-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .room-sub { font-size: 11px; color: var(--daq-subtext); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .room-right { display: flex; align-items: center; gap: 5px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
  .mini-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; background: var(--daq-bg); border: 1px solid var(--daq-border); color: var(--daq-fg); white-space: nowrap; }
  .mini-badge .k { color: var(--daq-subtext); font-weight: 600; font-size: 10px; }
  .mini-badge .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .mini-badge.cadr-active { border-color: rgba(139, 233, 253, 0.45); background: rgba(139, 233, 253, 0.12); color: var(--daq-cyan); }
  .mini-badge.cadr-idle { color: var(--daq-muted); border-color: var(--daq-border); }
  .mini-badge.alert { border-color: rgba(255, 85, 85, 0.65); background: rgba(255, 85, 85, 0.18); color: #ff6e6e; }
  .chevron { width: 16px; height: 16px; color: var(--daq-muted); transition: transform 0.2s ease; display: inline-flex; align-items: center; justify-content: center; }
  .room-item.expanded .chevron { transform: rotate(180deg); color: var(--daq-purple); }
  .room-drawer { padding: 10px 12px 12px; border-top: 1px solid var(--daq-border); background: var(--daq-surface-2); display: flex; flex-direction: column; gap: 10px; }
  .empty-state { padding: 20px; text-align: center; color: var(--daq-subtext); font-size: 13px; background: var(--daq-surface); border-radius: 12px; border: 1px dashed var(--daq-border); }
  .safety-banner { display: flex; align-items: center; gap: 10px; padding: 10px 13px; border-radius: 12px; background: rgba(255, 85, 85, 0.16); border: 1px solid rgba(255, 85, 85, 0.65); color: #ff6e6e; font-size: 12.5px; font-weight: 700; cursor: pointer; }
  .safety-banner svg { width: 18px; height: 18px; flex-shrink: 0; color: var(--daq-red); }
  .safety-banner .sub { font-weight: 500; color: var(--daq-fg); margin-left: 4px; }
  .overview-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .filter-tabs { display: inline-flex; align-items: center; gap: 3px; padding: 3px; border-radius: 10px; background: var(--daq-surface); border: 1px solid var(--daq-border); width: fit-content; }
  .filter-tab { border: none; background: transparent; color: var(--daq-subtext); padding: 4px 10px; border-radius: 7px; font-size: 11.5px; font-weight: 600; font-family: inherit; cursor: pointer; }
  .filter-tab:hover { color: var(--daq-fg); }
  .filter-tab.active { background: rgba(189, 147, 249, 0.22); color: var(--daq-fg); }
  .sort-select { background: var(--daq-surface); color: var(--daq-subtext); border: 1px solid var(--daq-border); border-radius: 9px; padding: 4px 9px; font-size: 11.5px; font-weight: 600; font-family: inherit; cursor: pointer; }
  .sort-select:hover { border-color: var(--daq-purple); color: var(--daq-fg); }
  .group-header { display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--daq-purple); padding: 5px 4px 2px; border: none; background: transparent; width: 100%; cursor: pointer; font-family: inherit; border-radius: 6px; }
  .group-header:hover { background: rgba(189, 147, 249, 0.08); }
  .group-header .g-chev { width: 14px; height: 14px; color: var(--daq-muted); transition: transform 0.2s ease; display: inline-flex; }
  .group-section.collapsed .group-header .g-chev { transform: rotate(-90deg); }
  .sparkline-box { background: var(--daq-surface); border: 1px solid var(--daq-border); border-radius: 12px; padding: 8px 11px 6px; display: flex; flex-direction: column; gap: 4px; cursor: pointer; }
  .sparkline-box:hover { border-color: var(--daq-purple); }
  .sparkline-head { display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; color: var(--daq-subtext); }
  .sparkline-title { font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--daq-muted); }
  .sparkline-range { font-variant-numeric: tabular-nums; font-weight: 600; }
  .sparkline-svg { width: 100%; height: 36px; display: block; overflow: visible; }
  @container (max-width: 390px) {
    .card { padding: 14px 12px; gap: 11px; }
    .header { flex-wrap: wrap; gap: 8px; }
    .master-bar { width: 100%; }
    .master-bar .pill-btn { flex: 1; justify-content: center; min-height: 36px; }
    .summary-strip, .metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
    .hero { gap: 12px; }
    .gauge-wrap { width: 92px; height: 92px; }
    .gauge-value { font-size: 21px; }
    .room-row { padding: 10px 9px; gap: 6px; min-height: 44px; flex-wrap: wrap; }
    .room-left { min-width: 120px; }
    .room-right { gap: 4px; max-width: 100%; }
    .mini-badge { padding: 3px 6px; font-size: 10.5px; }
    .power-btn.sm { width: 34px; height: 34px; }
    .pill-btn, .filter-tab, .speed-step { min-height: 36px; }
    .filter-tabs { width: 100%; }
    .filter-tab { flex: 1; text-align: center; padding: 6px; }
  }
  @media (max-width: 420px) {
    .card { padding: 14px 12px; gap: 11px; }
    .header { flex-wrap: wrap; gap: 8px; }
    .summary-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
    .room-row { padding: 10px 9px; min-height: 44px; }
    .power-btn.sm { width: 34px; height: 34px; }
    .pill-btn, .filter-tab, .speed-step { min-height: 36px; }
  }
  .room-row.modal-trigger .chevron { transform: rotate(-90deg); }
  @keyframes daqFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes daqPopIn { from { opacity: 0; transform: scale(0.97) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(15, 16, 22, 0.72);
    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    padding: 18px; animation: daqFadeIn 0.16s ease;
  }
  .modal-dialog {
    width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto;
    border-radius: var(--daq-radius); box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
    animation: daqPopIn 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  @media (prefers-reduced-motion: reduce) {
    .modal-backdrop, .modal-dialog { animation: none !important; transition: none !important; }
  }
  .modal-close {
    width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--daq-border);
    background: var(--daq-surface); color: var(--daq-subtext);
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 18px; line-height: 1; padding: 0; font-family: inherit;
    transition: all 0.15s ease;
  }
  .modal-close:hover { border-color: var(--daq-purple); color: var(--daq-fg); }
`;

const EDITOR_CSS = `
  :host { display: block; font-family: inherit; }
  .editor { display: flex; flex-direction: column; gap: 13px; padding: 6px 0; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .field { display: flex; flex-direction: column; gap: 4px; }
  label { font-size: 12px; font-weight: 600; color: var(--secondary-text-color, #b8c0e0); }
  input[type="text"], select {
    padding: 8px 10px; border-radius: 8px; border: 1px solid var(--divider-color, rgba(98, 114, 164, 0.4));
    background: var(--card-background-color, #21222c); color: var(--primary-text-color, #f8f8f2);
    font-size: 13px; font-family: inherit;
  }
  .checks { display: flex; flex-wrap: wrap; gap: 12px; }
  .check { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
  .section { border-top: 1px solid var(--divider-color, rgba(98, 114, 164, 0.28)); padding-top: 12px; display: flex; flex-direction: column; gap: 10px; }
  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.8; }
  .device-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; align-items: center; }
  button { padding: 6px 12px; border-radius: 8px; border: 1px solid var(--divider-color, rgba(98, 114, 164, 0.4)); background: transparent; color: var(--primary-text-color, #f8f8f2); cursor: pointer; font-size: 12px; font-weight: 600; }
  button:hover { border-color: #bd93f9; }
`;

const CARD_SHEET = makeSheet(CARD_CSS);
const EDITOR_SHEET = makeSheet(EDITOR_CSS);

/* ---------- Main Card Component ---------- */

class DraculaAirQualityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    applyStyles(this.shadowRoot, CARD_SHEET, CARD_CSS);
    this._root = document.createElement("div");
    this.shadowRoot.appendChild(this._root);

    this._config = null;
    this._hass = null;
    this._expanded = new Set();
    this._collapsedGroups = new Set();
    this._modalKey = null;
    this._filter = "all";
    this._sortBy = null;
    this._confirmReset = null;
    this._confirmTimer = null;
    this._discoveryCache = new Map();
    this._autoDiscoveredList = null;
    this._lastStateCount = -1;
    this._lastRenderSig = null;
    this._watchedIds = [];
    this._boundEsc = (e) => {
      if (e.key === "Escape" && this._modalKey) {
        this._modalKey = null;
        this._lastRenderSig = null;
        this._render();
      }
    };

    // Single delegated listeners attached once
    this.shadowRoot.addEventListener("click", (e) => this._onClick(e));
    this.shadowRoot.addEventListener("change", (e) => this._onChange(e));
    this.shadowRoot.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const target = e.target.closest("[data-action]");
      if (!target || target.tagName === "BUTTON" || target.tagName === "SELECT") return;
      e.preventDefault();
      target.click();
    });
  }

  static getConfigElement() { return document.createElement("dracula-air-quality-card-editor"); }

  static getStubConfig(hass) {
    const discovered = autoDiscoverWholeHomeDevices(hass?.states || {}).slice(0, 10);
    const devices = discovered.length
      ? discovered
      : [
          { entity: "fan.living_room_air_purifier", name: "Living Room" },
          { name: "Office Air Monitor", sensors: { pm25: "sensor.office_pm25", co2: "sensor.office_co2" } },
        ];
    return { name: "Whole-Home Air Quality", theme: "dracula", group_by: "type", devices };
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    const hasDevices = (Array.isArray(config.devices) && config.devices.length > 0) || (Array.isArray(config.entities) && config.entities.length > 0);
    const hasSensors = config.sensors && typeof config.sensors === "object" && Object.keys(config.sensors).length > 0;
    const hasEntity = Boolean(config.entity);
    if (!hasDevices && !hasSensors && !hasEntity && !config.auto_discover && config.mode !== "sensor" && config.mode !== "overview") {
      throw new Error("Specify `auto_discover: true`, `devices`, `entity`, or `sensors`.");
    }
    this._config = {
      theme: "dracula", language: "auto", compact: false,
      show_header: true, show_cadr: true, show_filter: true, show_timer: true, show_sparklines: true,
      include_purifier_sensors: true, detail_view: "modal",
      group_by: "type", sort_by: "default", default_filter: "all", auto_discover: false,
      ...config,
    };
    this._filter = ["all", "purifiers", "sensors"].includes(this._config.default_filter) ? this._config.default_filter : "all";
    this._modalKey = null;
    this._sortBy = null;
    this._confirmReset = null;
    if (this._confirmTimer) { clearTimeout(this._confirmTimer); this._confirmTimer = null; }
    this._discoveryCache.clear();
    this._autoDiscoveredList = null;
    this._lastStateCount = -1;
    this._lastRenderSig = null;
    this._watchedIds = [];
    this.setAttribute("data-theme", ["auto", "dracula-soft"].includes(this._config.theme) ? this._config.theme : "dracula");
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    const states = hass?.states || {};
    const stateCount = Object.keys(states).length;
    if (stateCount !== this._lastStateCount) {
      this._discoveryCache.clear();
      this._autoDiscoveredList = null;
      this._lastStateCount = stateCount;
      this._lastRenderSig = null;
    }
    if (this._lastRenderSig !== null && this._watchedIds.length > 0) {
      if (this._computeRenderSignature(states) === this._lastRenderSig) return;
    }
    this._render();
  }

  get _lang() { return resolveLang(this._config?.language, this._hass); }
  _t(key) { return tr(this._lang, key); }
  get _thresholds() { return this._config?.thresholds || null; }

  get _mode() {
    if (!this._config) return "overview";
    const list = this._config.devices || this._config.entities;
    if (this._config.mode === "overview" || this._config.auto_discover || (Array.isArray(list) && list.length > 0)) return "overview";
    if (this._config.mode === "sensor" || (!this._config.entity && this._config.sensors)) return "sensor";
    return "purifier";
  }

  _getOverviewList() {
    const explicit = this._config.devices || this._config.entities;
    if (Array.isArray(explicit) && explicit.length > 0) return explicit;
    if (this._config.auto_discover) {
      if (!this._autoDiscoveredList) {
        const excludes = [
          ...(Array.isArray(this._config.exclude_entities) ? this._config.exclude_entities : []),
          this._config.outdoor_pm25_entity,
          this._config.outdoor_aqi_entity,
        ].filter(Boolean);
        this._autoDiscoveredList = autoDiscoverWholeHomeDevices(this._hass?.states || {}, excludes);
      }
      return this._autoDiscoveredList;
    }
    return [];
  }

  _computeRenderSignature(states) {
    const activeSort = this._sortBy || this._config?.sort_by || "default";
    let sig = `${this._lang}|${this._filter}|${activeSort}|${this._modalKey || ""}|${this._confirmReset || ""}|${[...this._expanded].join(",")}|${[...this._collapsedGroups].join(",")}`;
    for (let i = 0; i < this._watchedIds.length; i++) {
      const id = this._watchedIds[i];
      const st = states[id];
      if (!st) { sig += `|${id}:-`; continue; }
      const a = st.attributes || {};
      sig += `|${id}:${st.state}:${a.percentage ?? ""}:${a.preset_mode ?? ""}:${a.unit_of_measurement ?? ""}:${a.device_class ?? ""}:${a.pm25 ?? ""}:${a.aqi ?? ""}:${a.filter_life ?? ""}:${a.cadr ?? ""}:${a.options ? a.options.length : ""}`;
    }
    return sig;
  }

  getCardSize() {
    if (!this._config) return 3;
    if (this._mode === "overview") return Math.max(3, 2 + Math.ceil(this._getOverviewList().length * 0.9));
    if (this._mode === "sensor") return this._config.compact ? 3 : 4;
    return this._config.compact ? 4 : 5;
  }

  getGridOptions() { return { columns: 12, min_columns: 6, rows: this.getCardSize(), min_rows: 3 }; }

  connectedCallback() {
    window.addEventListener("keydown", this._boundEsc);
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this._boundEsc);
    if (this._confirmTimer) { clearTimeout(this._confirmTimer); this._confirmTimer = null; }
  }

  /* ---------- Actions & Service Calls ---------- */

  _call(domain, service, data) { if (this._hass) this._hass.callService(domain, service, data); }

  _fireMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId } }));
  }

  _setMode(dev, mode) {
    if (!dev || !mode) return;
    if (dev.modeSource?.type === "select") this._call("select", "select_option", { entity_id: dev.modeSource.entityId, option: mode });
    else if (dev.fanId) this._call("fan", "set_preset_mode", { entity_id: dev.fanId, preset_mode: mode });
    if (!dev.isOn && dev.fanId) this._call("fan", "turn_on", { entity_id: dev.fanId });
  }

  _cycleTimer(dev) {
    if (!dev?.timer) return;
    const { domain, entityId, state, attrs } = dev.timer;
    if (domain === "select" && Array.isArray(attrs.options) && attrs.options.length) {
      const next = attrs.options[(attrs.options.indexOf(state) + 1) % attrs.options.length];
      return this._call("select", "select_option", { entity_id: entityId, option: next });
    }
    const unit = (attrs.unit_of_measurement || "min").toLowerCase();
    const presets = unit.startsWith("h") ? [0, 1, 2, 4, 8] : [0, 30, 60, 120, 240];
    const maxVal = toNumber(attrs.max);
    const valid = maxVal ? presets.filter((p) => p <= maxVal) : presets;
    const next = valid.find((p) => p > (toNumber(state) || 0)) ?? valid[0];
    this._call(domain, "set_value", { entity_id: entityId, value: next });
  }

  _handleFilterReset(entityId) {
    if (!entityId) return;
    if (this._confirmReset === entityId) {
      if (this._confirmTimer) { clearTimeout(this._confirmTimer); this._confirmTimer = null; }
      this._confirmReset = null;
      this._call("button", "press", { entity_id: entityId });
      this._lastRenderSig = null;
      this._render();
      return;
    }
    this._confirmReset = entityId;
    if (this._confirmTimer) clearTimeout(this._confirmTimer);
    this._confirmTimer = setTimeout(() => {
      this._confirmReset = null;
      this._confirmTimer = null;
      this._lastRenderSig = null;
      this._render();
    }, 5000);
    this._lastRenderSig = null;
    this._render();
  }

  _onChange(e) {
    const target = e.target.closest("[data-action]");
    if (target?.dataset.action === "sort") {
      this._sortBy = target.value || "default";
      this._lastRenderSig = null;
      this._render();
    }
  }

  _onClick(e) {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const idx = target.dataset.idx !== undefined ? Number(target.dataset.idx) : null;

    if (action === "more-info") { e.stopPropagation(); return this._fireMoreInfo(target.dataset.entity); }
    if (action === "filter-reset") { e.stopPropagation(); return this._handleFilterReset(target.dataset.entity); }
    if (action === "close-modal") {
      if (e.target === target) { this._modalKey = null; this._lastRenderSig = null; this._render(); }
      return;
    }
    if (action === "close-modal-btn") {
      e.stopPropagation(); this._modalKey = null; this._lastRenderSig = null; return this._render();
    }
    if (action === "toggle-drawer") {
      const rKey = target.dataset.rowKey ?? (idx !== null ? `d-${idx}` : null);
      if (rKey !== null) {
        if ((this._config.detail_view || "modal") === "modal") {
          this._modalKey = rKey;
        } else {
          this._expanded.has(rKey) ? this._expanded.delete(rKey) : this._expanded.add(rKey);
        }
        this._lastRenderSig = null; return this._render();
      }
    }
    if (action === "toggle-group") {
      const k = target.dataset.value || "";
      this._collapsedGroups.has(k) ? this._collapsedGroups.delete(k) : this._collapsedGroups.add(k);
      this._lastRenderSig = null; return this._render();
    }
    if (action === "filter") {
      this._filter = target.dataset.value || "all";
      this._lastRenderSig = null; return this._render();
    }
    if (action === "master") {
      const val = target.dataset.value;
      for (const item of this._getOverviewList()) {
        const dev = resolveDeviceState(this._hass, item, this._discoveryCache, this._thresholds);
        if (!dev.isPurifier) continue;
        if (val === "off") this._call("fan", "turn_off", { entity_id: dev.fanId });
        else {
          if (!dev.isOn) this._call("fan", "turn_on", { entity_id: dev.fanId });
          const match = dev.modes.find((m) => m.toLowerCase().includes(val));
          if (match) this._setMode(dev, match);
        }
      }
      return;
    }

    const item = this._mode === "overview" && idx !== null ? this._getOverviewList()[idx] : this._config;
    const dev = resolveDeviceState(this._hass, item, this._discoveryCache, this._thresholds);
    if (!dev) return;

    if (action === "power") { e.stopPropagation(); if (dev.fanId) this._call("fan", dev.isOn ? "turn_off" : "turn_on", { entity_id: dev.fanId }); }
    else if (action === "mode") this._setMode(dev, target.dataset.value);
    else if (action === "auto-mode" && dev.autoMode) this._call("select", "select_option", { entity_id: dev.autoMode.entityId, option: target.dataset.value });
    else if (action === "speed" && dev.fanId) this._call("fan", "set_percentage", { entity_id: dev.fanId, percentage: Math.max(0, Math.min(100, Number(target.dataset.value))) });
    else if (action === "display" && dev.display) this._call(dev.display.domain, dev.display.on ? "turn_off" : "turn_on", { entity_id: dev.display.entityId });
    else if (action === "child-lock" && dev.childLock) {
      const { domain, entityId, on } = dev.childLock;
      this._call(domain === "lock" ? "lock" : domain, domain === "lock" ? (on ? "unlock" : "lock") : (on ? "turn_off" : "turn_on"), { entity_id: entityId });
    } else if (action === "timer") this._cycleTimer(dev);
    else if (action === "automation" && dev.automation) {
      this._call("automation", dev.automation.on ? "turn_off" : "turn_on", { entity_id: dev.automation.entityId });
    }
  }

  /* ---------- Shared Render Blocks ---------- */

  _renderVentilationPill(indoorNeedsAir) {
    if (!indoorNeedsAir) return "";
    const states = this._hass?.states || {};
    const pmId = this._config.outdoor_pm25_entity;
    const aqiId = this._config.outdoor_aqi_entity;
    const pmSt = pmId ? states[pmId] : null;
    const aqiSt = aqiId ? states[aqiId] : null;
    const pmVal = pmSt ? toNumber(pmSt.state) : null;
    const aqiVal = aqiSt ? toNumber(aqiSt.state) : null;

    if (pmVal !== null) {
      const unit = pmSt.attributes?.unit_of_measurement || "µg/m³";
      if (pmVal <= 15) {
        return `<span class="vent-pill good" role="button" tabindex="0" data-action="more-info" data-entity="${escapeHtml(pmId)}">${ICONS.wind} ${escapeHtml(this._t("ventilate"))} · ${escapeHtml(this._t("outdoor"))} ${formatNum(pmVal, 0)} ${escapeHtml(unit)}</span>`;
      }
      if (pmVal > 35) {
        return `<span class="vent-pill warn" role="button" tabindex="0" data-action="more-info" data-entity="${escapeHtml(pmId)}">${ICONS.alert} ${escapeHtml(this._t("keep_closed"))} · ${escapeHtml(this._t("outdoor"))} ${formatNum(pmVal, 0)} ${escapeHtml(unit)}</span>`;
      }
    } else if (aqiVal !== null) {
      if (aqiVal <= 50) {
        return `<span class="vent-pill good" role="button" tabindex="0" data-action="more-info" data-entity="${escapeHtml(aqiId)}">${ICONS.wind} ${escapeHtml(this._t("ventilate"))} · ${escapeHtml(this._t("outdoor"))} AQI ${formatNum(aqiVal, 0)}</span>`;
      }
      if (aqiVal > 100) {
        return `<span class="vent-pill warn" role="button" tabindex="0" data-action="more-info" data-entity="${escapeHtml(aqiId)}">${ICONS.alert} ${escapeHtml(this._t("keep_closed"))} · ${escapeHtml(this._t("outdoor"))} AQI ${formatNum(aqiVal, 0)}</span>`;
      }
    }
    return "";
  }

  _renderSafetyBanner(dev) {
    if (!dev.coDanger) return "";
    const coNum = dev.sensors.co?.num ?? null;
    const entityId = dev.coAlarm?.entityId || dev.sensors.co?.entityId || "";
    const title = dev.coAlarm ? `${dev.coAlarm.type} Active` : "Elevated Carbon Monoxide";
    const detail = coNum !== null ? `${formatNum(coNum, 0)} ppm (${evaluateCO(coNum, this._thresholds, this._lang).label}) — Ventilate immediately` : "Check area & ventilate immediately";
    return `<div class="safety-banner" role="button" tabindex="0" data-action="more-info" data-entity="${escapeHtml(entityId)}">${ICONS.alert}<span>${escapeHtml(title)}<span class="sub">· ${escapeHtml(detail)}</span></span></div>`;
  }

  _renderFilterBlock(dev) {
    if (this._config.show_filter === false || !dev.filter || dev.filter.num === null) return "";
    const pct = Math.max(0, Math.min(100, dev.filter.num));
    const color = evaluateFilterColor(pct, dev.filterLow);
    const showReset = Boolean(dev.filterResetId && (dev.filterLow || pct <= 15));
    const confirming = showReset && this._confirmReset === dev.filterResetId;
    return `
      <div class="filter-block" data-action="more-info" data-entity="${escapeHtml(dev.filter.entityId)}">
        <div class="filter-top">
          <span class="filter-label">${ICONS.filter} ${escapeHtml(this._t("filter_life"))}${dev.filterLow ? ` (${escapeHtml(this._t("replace"))})` : ""}</span>
          <span class="filter-pct" style="color:${color}">${Math.round(pct)}%</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
        ${
          showReset
            ? `<div style="margin-top:3px"><button type="button" class="pill-btn xs ${confirming ? "danger" : "warn"}" data-action="filter-reset" data-entity="${escapeHtml(dev.filterResetId)}">${ICONS.reset} ${escapeHtml(this._t(confirming ? "confirm_reset" : "reset_filter"))}</button></div>`
            : ""
        }
      </div>
    `;
  }

  _renderGaugeSVG(valueText, unitText, metricLabel, pct, color, entityId) {
    const r = 46, c = 2 * Math.PI * r;
    const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
    return `
      <div class="gauge-wrap" ${entityId ? `role="button" tabindex="0" data-action="more-info" data-entity="${escapeHtml(entityId)}"` : ""} title="Click for details">
        <svg class="gauge-svg" viewBox="0 0 108 108">
          <circle class="gauge-track" cx="54" cy="54" r="${r}" />
          <circle class="gauge-progress" cx="54" cy="54" r="${r}" stroke="${color}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" />
        </svg>
        <div class="gauge-center">
          <span class="gauge-metric">${escapeHtml(metricLabel)}</span>
          <span class="gauge-value">${escapeHtml(valueText)}</span>
          ${unitText ? `<span class="gauge-unit">${escapeHtml(unitText)}</span>` : ""}
        </div>
      </div>
    `;
  }

  _renderSparkline(entityId, label, unit, color) {
    if (this._config?.show_sparklines === false || !entityId) return "";
    const pts = getEntityHistory(this._hass, entityId, () => { this._lastRenderSig = null; this._render(); });
    if (!pts || pts.length < 2) return "";
    const min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1;
    const w = 240, h = 36, padY = 4;
    const coords = pts.map((v, i) => [(i / (pts.length - 1)) * w, h - padY - ((v - min) / span) * (h - padY * 2)]);
    const linePts = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const [lastX, lastY] = coords[coords.length - 1];
    const gradId = `sp-${entityId.replace(/[^a-zA-Z0-9]/g, "_")}`;
    return `
      <div class="sparkline-box" role="button" tabindex="0" title="Click for history" data-action="more-info" data-entity="${escapeHtml(entityId)}">
        <div class="sparkline-head">
          <span class="sparkline-title">${escapeHtml(label)} · ${escapeHtml(this._t("trend_24h"))}</span>
          <span class="sparkline-range">${formatNum(min, 0)}–${formatNum(max, 0)} ${escapeHtml(unit)}</span>
        </div>
        <svg class="sparkline-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
          <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.32"/><stop offset="100%" stop-color="${color}" stop-opacity="0.02"/></linearGradient></defs>
          <polygon points="0,${h} ${linePts} ${w},${h}" fill="url(#${gradId})" />
          <polyline points="${linePts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3" fill="${color}" />
        </svg>
      </div>
    `;
  }

  _pickHeroMetric(dev) {
    const th = this._thresholds, lang = this._lang;
    if (dev.coDanger && dev.sensors.co?.num !== null && dev.sensors.co?.num !== undefined) {
      return { key: "co", metricLabel: "CO", valueText: formatNum(dev.sensors.co.num, 0), unitText: dev.sensors.co.unit || "ppm", entityId: dev.sensors.co.entityId, ...evaluateCO(dev.sensors.co.num, th, lang) };
    }
    if (dev.sensors.pm25?.num !== null && dev.sensors.pm25?.num !== undefined) {
      return { key: "pm25", metricLabel: "PM2.5", valueText: formatNum(dev.sensors.pm25.num, 0), unitText: dev.sensors.pm25.unit || "µg/m³", entityId: dev.sensors.pm25.entityId, ...evaluatePM25(dev.sensors.pm25.num, th, lang) };
    }
    if (dev.sensors.co2?.num !== null && dev.sensors.co2?.num !== undefined) {
      return { key: "co2", metricLabel: "CO₂", valueText: formatNum(dev.sensors.co2.num, 0), unitText: dev.sensors.co2.unit || "ppm", entityId: dev.sensors.co2.entityId, ...evaluateCO2(dev.sensors.co2.num, th, lang) };
    }
    if (dev.sensors.co?.num !== null && dev.sensors.co?.num !== undefined) {
      return { key: "co", metricLabel: "CO", valueText: formatNum(dev.sensors.co.num, 0), unitText: dev.sensors.co.unit || "ppm", entityId: dev.sensors.co.entityId, ...evaluateCO(dev.sensors.co.num, th, lang) };
    }
    if (dev.sensors.aqi && !isUnavailable(dev.sensors.aqi.raw)) {
      return { key: "aqi", metricLabel: "AQI", valueText: dev.sensors.aqi.num !== null ? formatNum(dev.sensors.aqi.num, 0) : titleCase(dev.sensors.aqi.raw), unitText: dev.sensors.aqi.unit || "", entityId: dev.sensors.aqi.entityId, ...evaluateAQI(dev.sensors.aqi.raw, lang) };
    }
    const vocS = dev.sensors.voc || dev.sensors.tvoc;
    if (vocS?.num !== null && vocS?.num !== undefined) {
      const k = dev.sensors.voc ? "voc" : "tvoc";
      return { key: k, metricLabel: SENSOR_META[k].label, valueText: formatNum(vocS.num, 0), unitText: vocS.unit || SENSOR_META[k].defaultUnit, entityId: vocS.entityId, ...evaluateVOC(vocS.num, vocS.unit, lang) };
    }
    if (dev.isPurifier) {
      const pct = dev.isOn ? dev.percentage ?? 100 : 0;
      return { key: "fan", metricLabel: "Fan", valueText: dev.isOn ? `${Math.round(pct)}%` : this._t("off"), unitText: dev.currentMode ? titleCase(dev.currentMode) : "", entityId: dev.fanId, label: this._t(dev.isOn ? "running" : "standby"), color: dev.isOn ? "var(--daq-purple)" : "var(--daq-muted)", pct: dev.isOn ? Math.max(10, pct) : 0 };
    }
    return { key: "none", metricLabel: "AQ", valueText: "—", unitText: "", entityId: null, label: this._t("no_data"), color: "var(--daq-muted)", pct: 0 };
  }

  _renderMetricTiles(sensors) {
    const entries = SENSOR_KEYS.filter((k) => sensors[k]);
    if (!entries.length) return "";
    return `<div class="metrics-grid">${entries.map((key) => {
      const s = sensors[key], meta = SENSOR_META[key];
      const color = evaluateMetricColor(key, s.num ?? s.raw, s.unit, this._thresholds);
      const valStr = s.num !== null ? formatNum(s.num, meta.decimals) : !isUnavailable(s.raw) ? titleCase(s.raw) : "—";
      return `<div class="metric-tile" style="--tile-accent:${color}" role="button" tabindex="0" title="Click for history" data-action="more-info" data-entity="${escapeHtml(s.entityId)}"><span class="metric-label">${escapeHtml(meta.label)}</span><div class="metric-val-row"><span class="metric-val">${escapeHtml(valStr)}</span>${s.unit ? `<span class="metric-unit">${escapeHtml(s.unit)}</span>` : ""}</div></div>`;
    }).join("")}</div>`;
  }

  _renderPurifierControls(dev, idxAttr = "") {
    const isAuto = dev.currentMode?.toLowerCase().includes("auto");
    const stepCount = Math.min(5, Math.max(3, Math.round(100 / (dev.percentageStep || 25))));
    const steps = Array.from({ length: stepCount }, (_, i) => (i === stepCount - 1 ? 100 : Math.floor(((i + 1) * 100) / stepCount)));
    const curPct = dev.isOn ? dev.percentage ?? 0 : 0;
    let html = "";

    if (dev.modes.length) {
      html += `<div><div class="section-label">${escapeHtml(this._t("mode"))}</div><div class="pill-group">${dev.modes.map((m) => `<button type="button" class="pill-btn ${dev.isOn && dev.currentMode === m ? "active" : ""}" data-action="mode" data-value="${escapeHtml(m)}" ${idxAttr}>${escapeHtml(titleCase(m))}</button>`).join("")}</div></div>`;
    }
    if (dev.autoMode?.options.length && (isAuto || !dev.modes.length)) {
      html += `<div><div class="section-label">${escapeHtml(this._t("auto_profile"))}</div><div class="pill-group">${dev.autoMode.options.map((opt) => `<button type="button" class="pill-btn xs ${dev.autoMode.current === opt ? "active-cyan" : ""}" data-action="auto-mode" data-value="${escapeHtml(opt)}" ${idxAttr}>${escapeHtml(titleCase(opt))}</button>`).join("")}</div></div>`;
    }
    if (dev.fanState && (dev.percentage !== null || dev.fanState.attributes?.percentage !== undefined)) {
      const tol = Math.ceil(50 / steps.length);
      html += `<div class="speed-wrap"><div class="speed-head"><span class="section-label" style="margin:0">${escapeHtml(this._t("fan_speed"))}</span><span class="speed-val">${dev.isOn ? `${Math.round(curPct)}%` : escapeHtml(this._t("off"))}</span></div><div class="speed-steps" style="grid-template-columns:repeat(${steps.length},1fr)">${steps.map((s, i) => `<button type="button" class="speed-step ${dev.isOn && Math.abs(curPct - s) <= tol ? "current" : dev.isOn && curPct >= s - 5 ? "filled" : ""}" data-action="speed" data-value="${s}" ${idxAttr}>L${i + 1} · ${s}%</button>`).join("")}</div></div>`;
    }
    const showTimer = this._config.show_timer !== false;
    if (dev.display || dev.childLock || dev.automation || (showTimer && (dev.timer || dev.timerLabel))) {
      html += `<div class="utility-bar">${dev.display ? `<button type="button" class="pill-btn xs ${dev.display.on ? "active-cyan" : ""}" data-action="display" ${idxAttr}>${ICONS.display} ${escapeHtml(this._t("display"))}</button>` : ""}${dev.childLock ? `<button type="button" class="pill-btn xs ${dev.childLock.on ? "active" : ""}" data-action="child-lock" ${idxAttr}>${dev.childLock.on ? ICONS.lock : ICONS.unlock} ${escapeHtml(this._t("lock"))}</button>` : ""}${showTimer && dev.timer ? `<button type="button" class="pill-btn xs ${dev.timerLabel ? "active-cyan" : ""}" data-action="timer" ${idxAttr}>${ICONS.timer} ${dev.timerLabel ? escapeHtml(dev.timerLabel) : escapeHtml(this._t("timer"))}</button>` : showTimer && dev.timerLabel ? `<span class="stat-chip" data-action="more-info" data-entity="${escapeHtml(dev.timerRemaining?.entityId || "")}">${ICONS.timer}<span class="v">${escapeHtml(dev.timerLabel)}</span></span>` : ""}${dev.automation ? `<button type="button" class="pill-btn xs ${dev.automation.on ? "active-green" : ""}" data-action="automation" ${idxAttr}>${ICONS.bolt} ${escapeHtml(this._t("auto_rule"))}</button>` : ""}</div>`;
    }
    return html;
  }

  /* ---------- Mode Renderers ---------- */

  _renderPurifierCardBody(dev, idxAttr = "", closeBtn = "") {
    const hero = this._pickHeroMetric(dev);
    const isSleepMode = dev.currentMode?.toLowerCase().includes("sleep");
    const statusParts = dev.isUnavailable
      ? [this._t("unavailable")]
      : !dev.isOn
      ? [this._t("standby")]
      : [
          dev.currentMode ? titleCase(dev.currentMode) : null,
          isSleepMode
            ? null
            : dev.currentMode?.toLowerCase().includes("auto") && dev.autoMode?.current
            ? titleCase(dev.autoMode.current)
            : dev.percentage !== null
            ? `${Math.round(dev.percentage)}%`
            : null,
        ].filter(Boolean);

    const extraSensors = {};
    for (const k of SENSOR_KEYS) if (dev.sensors[k] && dev.sensors[k].raw !== null && k !== hero.key) extraSensors[k] = dev.sensors[k];
    const showHeader = closeBtn ? true : this._config.show_header !== false;

    return `
      <div class="card ${this._config.compact && !closeBtn ? "compact" : ""}">
        ${
          showHeader
            ? `<div class="header">
                <div class="title-wrap"><div class="title">${escapeHtml(dev.name)}</div><div class="subtitle">${escapeHtml(statusParts.join(" · "))}</div></div>
                <div class="header-actions">
                  ${dev.isUnavailable ? `<span class="offline-badge">${escapeHtml(this._t("offline"))}</span>` : ""}
                  ${this._config.show_filter !== false && dev.filterLow ? `<span class="filter-low-badge" title="Filter replacement needed" data-action="more-info" data-entity="${escapeHtml(dev.filter?.entityId || "")}">${ICONS.filter} ${escapeHtml(this._t("filter_low"))}</span>` : ""}
                  ${dev.error ? `<span class="error-badge" data-action="more-info" data-entity="${escapeHtml(dev.error.entityId)}">${ICONS.alert} ${escapeHtml(dev.error.message)}</span>` : ""}
                  <button type="button" class="power-btn ${dev.isOn ? "on" : ""}" data-action="power" ${idxAttr} aria-label="Toggle power">${ICONS.power}</button>
                  ${closeBtn}
                </div>
              </div>`
            : ""
        }
        ${this._renderSafetyBanner(dev)}
        <div class="hero">
          ${this._renderGaugeSVG(hero.valueText, hero.unitText, hero.metricLabel, hero.pct, hero.color, hero.entityId)}
          <div class="hero-details">
            <div class="health-pill" style="color:${hero.color}"><span class="health-dot" style="background:${hero.color}"></span>${escapeHtml(hero.label)}</div>
            ${this._config.show_cadr !== false && dev.cadr?.num !== null && dev.cadr?.num !== undefined ? `<div class="stat-row"><div class="stat-chip" data-action="more-info" data-entity="${escapeHtml(dev.cadr.entityId)}">${ICONS.wind}<span class="k">CADR</span><span class="v">${escapeHtml(formatNum(dev.cadr.num, 0))} ${escapeHtml(dev.cadr.unit)}</span></div></div>` : ""}
            ${this._renderFilterBlock(dev)}
          </div>
        </div>
        ${dev.sensors.pm25?.entityId ? this._renderSparkline(dev.sensors.pm25.entityId, "PM2.5", dev.sensors.pm25.unit || "µg/m³", hero.color) : ""}
        ${Object.keys(extraSensors).length ? this._renderMetricTiles(extraSensors) : ""}
        ${this._renderPurifierControls(dev, idxAttr)}
      </div>
    `;
  }

  _renderSensorCardBody(dev, closeBtn = "") {
    const hero = this._pickHeroMetric(dev);
    const sensorCount = Object.keys(dev.sensors).length;
    const needsAir = (dev.sensors.co2?.num ?? 0) >= 1000 || (dev.sensors.pm25?.num ?? 0) > 25 || (dev.sensors.voc?.num ?? 0) > 250;
    const spark = dev.sensors.pm25?.entityId
      ? { id: dev.sensors.pm25.entityId, label: "PM2.5", unit: dev.sensors.pm25.unit || "µg/m³", color: evaluatePM25(dev.sensors.pm25.num, this._thresholds, this._lang).color }
      : dev.sensors.co2?.entityId
      ? { id: dev.sensors.co2.entityId, label: "CO₂", unit: dev.sensors.co2.unit || "ppm", color: evaluateCO2(dev.sensors.co2.num, this._thresholds, this._lang).color }
      : null;
    const showHeader = closeBtn ? true : this._config.show_header !== false;
    const subHtml = dev.isPurifierSensor
      ? `<em>${escapeHtml(this._t("belongs_to"))} ${escapeHtml(dev.belongsTo)}</em>`
      : `${sensorCount} ${escapeHtml(this._t("sensors_monitored"))}`;

    return `
      <div class="card ${this._config.compact && !closeBtn ? "compact" : ""}">
        ${
          showHeader
            ? `<div class="header">
                <div class="title-wrap"><div class="title">${escapeHtml(dev.name)}</div><div class="subtitle">${subHtml}</div></div>
                <div class="header-actions"><div class="health-pill" style="color:${hero.color}"><span class="health-dot" style="background:${hero.color}"></span>${escapeHtml(hero.label)}</div>${closeBtn}</div>
              </div>`
            : ""
        }
        ${!closeBtn ? this._renderVentilationPill(needsAir) : ""}
        ${this._renderSafetyBanner(dev)}
        <div class="hero">
          ${this._renderGaugeSVG(hero.valueText, hero.unitText, hero.metricLabel, hero.pct, hero.color, hero.entityId)}
          <div class="hero-details">
            <div class="section-label" style="margin:0">${escapeHtml(this._t("air_quality_status"))}</div>
            <div style="font-size:13px;color:var(--daq-subtext);line-height:1.4">${escapeHtml(hero.metricLabel)} · ${escapeHtml(hero.label)}</div>
          </div>
        </div>
        ${spark ? this._renderSparkline(spark.id, spark.label, spark.unit, spark.color) : ""}
        ${sensorCount ? this._renderMetricTiles(dev.sensors) : `<div class="empty-state">No air quality sensors configured or available.</div>`}
      </div>
    `;
  }

  _renderPurifierMode() {
    const dev = resolveDeviceState(this._hass, this._config, this._discoveryCache, this._thresholds);
    this._watchedIds = dev.watchedIds;
    return this._renderPurifierCardBody(dev);
  }

  _renderSensorMode() {
    const dev = resolveDeviceState(this._hass, this._config, this._discoveryCache, this._thresholds);
    const watched = new Set(dev.watchedIds);
    if (this._config.outdoor_pm25_entity) watched.add(this._config.outdoor_pm25_entity);
    if (this._config.outdoor_aqi_entity) watched.add(this._config.outdoor_aqi_entity);
    this._watchedIds = Array.from(watched);
    return this._renderSensorCardBody(dev);
  }

  _renderOverviewMode() {
    const rawList = this._getOverviewList();
    const watched = new Set();
    if (this._config.outdoor_pm25_entity) watched.add(this._config.outdoor_pm25_entity);
    if (this._config.outdoor_aqi_entity) watched.add(this._config.outdoor_aqi_entity);
    const devices = rawList.map((item, idx) => {
      const dev = resolveDeviceState(this._hass, item, this._discoveryCache, this._thresholds);
      for (const id of dev.watchedIds) watched.add(id);
      return { dev, idx, rowKey: `d-${idx}` };
    });
    this._watchedIds = Array.from(watched);

    const purifiers = devices.filter((e) => e.dev.isPurifier);
    const sensorOnly = devices.filter((e) => !e.dev.isPurifier);

    // Synthesize companion sensor rows for purifiers with built-in AQ sensors (deduplicated from summary strip)
    const purifierSensors = [];
    if (this._config.include_purifier_sensors !== false) {
      const titleOrder = ["pm25", "aqi", "co2", "co", "pm10", "voc", "tvoc", "nox", "no2", "o3", "hcho", "radon", "temperature", "humidity"];
      for (const entry of purifiers) {
        const sKeys = titleOrder.filter((k) => entry.dev.sensors[k]);
        if (!sKeys.length) continue;
        const primaryLabels = sKeys.slice(0, 2).map((k) => SENSOR_META[k].label);
        const sensorTitle = primaryLabels.length === 2
          ? `${primaryLabels[0]} & ${primaryLabels[1]} Sensor`
          : `${primaryLabels[0]} Sensor`;
        purifierSensors.push({
          idx: entry.idx,
          rowKey: `ps-${entry.idx}`,
          dev: {
            ...entry.dev,
            isPurifier: false,
            isPurifierSensor: true,
            belongsTo: entry.dev.name,
            name: sensorTitle,
            isUnavailable: false,
            parentOn: entry.dev.isOn,
          },
        });
      }
    }

    const allSensors = [...sensorOnly, ...purifierSensors];
    const displayEntries = [...purifiers, ...allSensors];
    const hasBoth = purifiers.length > 0 && allSensors.length > 0;
    const activePurifiers = purifiers.filter((e) => e.dev.isOn).length;

    const pmRooms = devices.filter((e) => e.dev.sensors.pm25?.num !== null && e.dev.sensors.pm25?.num !== undefined);
    const avgPm = pmRooms.length ? pmRooms.reduce((s, e) => s + e.dev.sensors.pm25.num, 0) / pmRooms.length : null;
    const worstPmRoom = pmRooms.length ? pmRooms.reduce((m, e) => (e.dev.sensors.pm25.num > m.dev.sensors.pm25.num ? e : m), pmRooms[0]).dev : null;

    const co2Rooms = devices.filter((e) => e.dev.sensors.co2?.num !== null && e.dev.sensors.co2?.num !== undefined);
    const maxCo2Room = co2Rooms.length ? co2Rooms.reduce((m, e) => (e.dev.sensors.co2.num > m.dev.sensors.co2.num ? e : m), co2Rooms[0]).dev : null;

    const coAlerts = devices.filter((e) => e.dev.coDanger);
    const worstCoRoom = coAlerts.length ? coAlerts.reduce((m, e) => ((e.dev.sensors.co?.num ?? 999) > (m.dev.sensors.co?.num ?? 999) ? e : m), coAlerts[0]).dev : null;

    const indoorNeedsAir = (maxCo2Room?.sensors.co2?.num ?? 0) >= 1000 || (worstPmRoom?.sensors.pm25?.num ?? 0) > 25;
    const avgPmEval = evaluatePM25(avgPm, this._thresholds, this._lang);
    const worstPmEval = evaluatePM25(worstPmRoom?.sensors.pm25.num ?? null, this._thresholds, this._lang);
    const maxCo2Eval = evaluateCO2(maxCo2Room?.sensors.co2.num ?? null, this._thresholds, this._lang);

    const activeFilter = hasBoth ? this._filter : "all";
    const activeSort = this._sortBy || this._config.sort_by || "default";
    const sortEntries = (list) => {
      if (activeSort === "default") return list;
      return [...list].sort((a, b) =>
        activeSort === "pm25" ? (b.dev.sensors.pm25?.num ?? -1) - (a.dev.sensors.pm25?.num ?? -1)
        : activeSort === "filter" ? (a.dev.filter?.num ?? 999) - (b.dev.filter?.num ?? 999)
        : a.dev.name.localeCompare(b.dev.name)
      );
    };

    const visible = displayEntries.filter((e) => (activeFilter === "purifiers" ? e.dev.isPurifier : activeFilter === "sensors" ? !e.dev.isPurifier : true));
    const renderGroup = (gKey, label, items) => {
      const collapsed = this._collapsedGroups.has(gKey);
      const sorted = sortEntries(items);
      return `<div class="group-section ${collapsed ? "collapsed" : ""}"><button type="button" class="group-header" data-action="toggle-group" data-value="${escapeHtml(gKey)}" aria-expanded="${!collapsed}"><span>${escapeHtml(label)} · ${sorted.length}</span><span class="g-chev">${ICONS.chevron}</span></button>${collapsed ? "" : `<div class="room-list">${sorted.map((e) => this._renderOverviewRow(e.dev, e.idx, e.rowKey)).join("")}</div>`}</div>`;
    };

    const groupBy = this._config.group_by || "type";
    let rowsHtml = "";
    if (!visible.length) {
      rowsHtml = `<div class="empty-state">Add purifiers/sensors to <code>devices</code> or set <code>auto_discover: true</code>.</div>`;
    } else if (groupBy === "none") {
      rowsHtml = `<div class="room-list">${sortEntries(visible).map((e) => this._renderOverviewRow(e.dev, e.idx, e.rowKey)).join("")}</div>`;
    } else if (groupBy === "room") {
      const groups = new Map();
      for (const e of visible) { const g = e.dev.group || "Other"; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(e); }
      rowsHtml = Array.from(groups.entries()).map(([l, items]) => renderGroup(`room:${l}`, l, items)).join("");
    } else {
      const pList = visible.filter((e) => e.dev.isPurifier), sList = visible.filter((e) => !e.dev.isPurifier);
      rowsHtml = (pList.length ? renderGroup("type:purifiers", this._t("air_purifiers"), pList) : "") + (sList.length ? renderGroup("type:sensors", this._t("air_quality_sensors"), sList) : "");
    }

    const ambientClass = worstCoRoom
      ? "ambient ambient-alert"
      : (worstPmRoom?.sensors.pm25?.num ?? 0) > 35 || (maxCo2Room?.sensors.co2?.num ?? 0) > 1200
      ? "ambient ambient-warn"
      : (worstPmRoom?.sensors.pm25?.num ?? 0) > 12 || (maxCo2Room?.sensors.co2?.num ?? 0) > 800
      ? "ambient ambient-moderate"
      : "ambient ambient-good";

    return `
      <div class="card ${ambientClass} ${this._config.compact ? "compact" : ""}">
        ${
          this._config.show_header !== false
            ? `<div class="header">
                <div class="title-wrap">
                  <div class="title">${escapeHtml(this._config.name || this._t("whole_home_title"))}</div>
                  <div class="subtitle">${devices.length} ${escapeHtml(this._t(devices.length === 1 ? "device_word" : "devices_word"))} · ${purifiers.length} ${escapeHtml(this._t("purifiers").toLowerCase())}${allSensors.length ? ` · ${allSensors.length} ${escapeHtml(this._t("sensors").toLowerCase())}` : ""}</div>
                </div>
                ${purifiers.length ? `<div class="master-bar"><button type="button" class="pill-btn xs" data-action="master" data-value="auto">${escapeHtml(this._t("all_auto"))}</button><button type="button" class="pill-btn xs" data-action="master" data-value="sleep">${escapeHtml(this._t("all_sleep"))}</button><button type="button" class="pill-btn xs" data-action="master" data-value="off">${escapeHtml(this._t("all_off"))}</button></div>` : ""}
              </div>`
            : ""
        }
        ${this._renderVentilationPill(indoorNeedsAir)}
        <div class="summary-strip">
          <div class="summary-tile"><span class="summary-k">${escapeHtml(this._t("active"))}</span><span class="summary-v" style="color:${activePurifiers > 0 ? "var(--daq-purple)" : "var(--daq-muted)"}">${activePurifiers}/${purifiers.length}</span><span class="summary-sub">${escapeHtml(this._t("purifiers_on"))}</span></div>
          <div class="summary-tile"><span class="summary-k">${escapeHtml(this._t("avg_pm25"))}</span><span class="summary-v" style="color:${avgPmEval.color}">${avgPm !== null ? formatNum(avgPm, 1) : "—"}</span><span class="summary-sub">${avgPm !== null ? `µg/m³ · ${escapeHtml(avgPmEval.label)}` : escapeHtml(this._t("no_data"))}</span></div>
          <div class="summary-tile"><span class="summary-k">${escapeHtml(this._t("worst_pm25"))}</span><span class="summary-v" style="color:${worstPmEval.color}">${worstPmRoom ? formatNum(worstPmRoom.sensors.pm25.num, 0) : "—"}</span><span class="summary-sub">${worstPmRoom ? escapeHtml(worstPmRoom.name) : escapeHtml(this._t("no_data"))}</span></div>
          ${maxCo2Room ? `<div class="summary-tile"><span class="summary-k">${escapeHtml(this._t("max_co2"))}</span><span class="summary-v" style="color:${maxCo2Eval.color}">${formatNum(maxCo2Room.sensors.co2.num, 0)}</span><span class="summary-sub">${escapeHtml(maxCo2Room.name)} · ppm</span></div>` : ""}
          ${worstCoRoom ? `<div class="summary-tile alert"><span class="summary-k" style="color:var(--daq-red)">${escapeHtml(this._t("co_warning"))}</span><span class="summary-v" style="color:var(--daq-red)">${worstCoRoom.sensors.co?.num !== null && worstCoRoom.sensors.co?.num !== undefined ? `${formatNum(worstCoRoom.sensors.co.num, 0)} ppm` : "ALARM"}</span><span class="summary-sub">${escapeHtml(worstCoRoom.name)}</span></div>` : ""}
        </div>
        <div class="overview-toolbar">
          ${hasBoth ? `<div class="filter-tabs" role="tablist"><button type="button" class="filter-tab ${activeFilter === "all" ? "active" : ""}" data-action="filter" data-value="all">${escapeHtml(this._t("all"))} (${displayEntries.length})</button><button type="button" class="filter-tab ${activeFilter === "purifiers" ? "active" : ""}" data-action="filter" data-value="purifiers">${escapeHtml(this._t("purifiers"))} (${purifiers.length})</button><button type="button" class="filter-tab ${activeFilter === "sensors" ? "active" : ""}" data-action="filter" data-value="sensors">${escapeHtml(this._t("sensors"))} (${allSensors.length})</button></div>` : `<span></span>`}
          ${displayEntries.length > 1 ? `<select class="sort-select" data-action="sort" aria-label="Sort devices"><option value="default" ${activeSort === "default" ? "selected" : ""}>↕ ${escapeHtml(this._t("sort_default"))}</option><option value="pm25" ${activeSort === "pm25" ? "selected" : ""}>↕ ${escapeHtml(this._t("sort_pm25"))}</option><option value="filter" ${activeSort === "filter" ? "selected" : ""}>↕ ${escapeHtml(this._t("sort_filter"))}</option><option value="name" ${activeSort === "name" ? "selected" : ""}>↕ ${escapeHtml(this._t("sort_name"))}</option></select>` : ""}
        </div>
        ${rowsHtml}
      </div>
      ${this._renderDetailModal(displayEntries)}
    `;
  }

  _renderDetailModal(displayEntries) {
    if ((this._config.detail_view || "modal") !== "modal" || !this._modalKey) return "";
    const entry = displayEntries.find((e) => e.rowKey === this._modalKey);
    if (!entry) return "";
    const closeBtn = `<button type="button" class="modal-close" data-action="close-modal-btn" aria-label="Close">×</button>`;
    const cardHtml = entry.dev.isPurifier
      ? this._renderPurifierCardBody(entry.dev, `data-idx="${entry.idx}"`, closeBtn)
      : this._renderSensorCardBody(entry.dev, closeBtn);
    return `
      <div class="modal-backdrop" data-action="close-modal" role="dialog" aria-modal="true">
        <div class="modal-dialog">${cardHtml}</div>
      </div>
    `;
  }

  _renderOverviewRow(dev, idx, rowKey = `d-${idx}`) {
    const isExpanded = this._expanded.has(rowKey);
    const pm = dev.sensors.pm25, co2 = dev.sensors.co2, co = dev.sensors.co, aqi = dev.sensors.aqi;
    const pmEval = pm?.num !== null && pm?.num !== undefined ? evaluatePM25(pm.num, this._thresholds, this._lang) : null;
    const co2Eval = co2?.num !== null && co2?.num !== undefined ? evaluateCO2(co2.num, this._thresholds, this._lang) : null;
    const coEval = co?.num !== null && co?.num !== undefined ? evaluateCO(co.num, this._thresholds, this._lang) : null;
    const aqiEval = aqi && !isUnavailable(aqi.raw) ? evaluateAQI(aqi.raw, this._lang) : null;

    const dotColor = dev.coDanger
      ? "var(--daq-red)"
      : dev.isPurifier
      ? (dev.isOn ? "var(--daq-green)" : "var(--daq-muted)")
      : pmEval?.color || co2Eval?.color || coEval?.color || aqiEval?.color || (dev.isPurifierSensor ? "var(--daq-muted)" : "var(--daq-cyan)");

    // Build purifier speed/mode subtitle (e.g. "Auto · Speed 2 (67%) · Filter 92%")
    let purifierSub = this._t("off");
    if (dev.isPurifier) {
      const filterStr = dev.filter?.num !== null && dev.filter?.num !== undefined ? `Filter ${Math.round(dev.filter.num)}%` : null;
      if (dev.isOn) {
        const isSleep = dev.currentMode?.toLowerCase().includes("sleep");
        let speedStr = null;
        if (!isSleep && dev.percentage !== null) {
          const step = dev.percentageStep || 25;
          const lvl = Math.max(1, Math.round(dev.percentage / step));
          speedStr = `Speed ${lvl} (${Math.round(dev.percentage)}%)`;
        }
        purifierSub = [dev.currentMode ? titleCase(dev.currentMode) : "On", speedStr, filterStr].filter(Boolean).join(" · ");
      } else {
        purifierSub = [this._t("off"), filterStr].filter(Boolean).join(" · ");
      }
    }

    const subHtml = dev.isPurifierSensor
      ? `<em>${escapeHtml(this._t("belongs_to"))} ${escapeHtml(dev.belongsTo)}</em>`
      : escapeHtml(
          dev.isUnavailable
            ? this._t("offline")
            : dev.isPurifier
            ? purifierSub
            : dev.coAlarm ? `${dev.coAlarm.type} Active` : this._t("air_quality_monitor")
        );

    // Build right-side badges cleanly separated by row type
    let badgesHtml = "";
    if (dev.isPurifier) {
      if (dev.isUnavailable) badgesHtml += `<span class="offline-badge">${escapeHtml(this._t("offline"))}</span>`;
      if (dev.filterLow) badgesHtml += `<span class="filter-low-badge" title="Filter replacement needed">${ICONS.filter} Low</span>`;
      if (this._config.show_cadr !== false && dev.cadr && dev.cadr.num !== null) {
        const cadrActive = dev.isOn && dev.cadr.num > 0;
        badgesHtml += `<span class="mini-badge ${cadrActive ? "cadr-active" : "cadr-idle"}" title="CADR"><span class="dot" style="background:${cadrActive ? "var(--daq-cyan)" : "var(--daq-muted)"}"></span>${formatNum(dev.cadr.num, 0)} ${escapeHtml(dev.cadr.unit)}</span>`;
      }
      // Only show PM2.5 pill on purifier rows when purifier sensors are NOT split out into the Air Quality Sensors group
      if (this._config.include_purifier_sensors === false && pmEval) {
        badgesHtml += `<span class="mini-badge" title="PM2.5"><span class="dot" style="background:${pmEval.color}"></span>${formatNum(pm.num, 0)} µg/m³</span>`;
      }
    } else {
      // Sensor row: show up to 3 compact live value pills with labels & units
      const sensorOrder = ["pm25", "aqi", "co2", "co", "voc", "tvoc", "nox", "pm10", "hcho", "radon", "no2", "o3", "temperature", "humidity"];
      const pills = [];
      if (dev.coAlarm && !coEval) {
        pills.push(`<span class="mini-badge alert" title="CO Alarm"><span class="dot" style="background:var(--daq-red)"></span>CO ALARM</span>`);
      }
      for (const key of sensorOrder) {
        if (pills.length >= 3) break;
        const s = dev.sensors[key];
        if (!s || isUnavailable(s.raw)) continue;
        const meta = SENSOR_META[key];
        const color = evaluateMetricColor(key, s.num ?? s.raw, s.unit, this._thresholds);
        const valText = s.num !== null ? formatNum(s.num, meta.decimals) : titleCase(s.raw);
        const isAlert = key === "co" && dev.coDanger;
        const showLabel = key !== "temperature" && key !== "humidity";
        pills.push(
          `<span class="mini-badge ${isAlert ? "alert" : ""}" title="${escapeHtml(meta.label)}"><span class="dot" style="background:${isAlert ? "var(--daq-red)" : color}"></span>${showLabel ? `<span class="k">${escapeHtml(meta.label)}</span> ` : ""}${escapeHtml(valText)}${s.unit ? ` ${escapeHtml(s.unit)}` : ""}</span>`
        );
      }
      badgesHtml = pills.length ? pills.join("") : `<span class="offline-badge">${escapeHtml(this._t("standby"))}</span>`;
    }

    const isModalMode = (this._config.detail_view || "modal") === "modal";
    const idxAttr = `data-idx="${idx}"`;
    return `
      <div class="room-item ${!isModalMode && isExpanded ? "expanded" : ""}">
        <div class="room-row ${isModalMode ? "modal-trigger" : ""}" role="button" tabindex="0" aria-expanded="${!isModalMode && isExpanded}" data-action="toggle-drawer" data-row-key="${escapeHtml(rowKey)}" ${idxAttr}>
          <div class="room-left">
            <span class="status-dot" style="background:${dotColor}"></span>
            <div class="room-meta"><span class="room-name">${escapeHtml(dev.name)}</span><span class="room-sub">${subHtml}</span></div>
          </div>
          <div class="room-right">
            ${badgesHtml}
            ${dev.isPurifier ? `<button type="button" class="power-btn sm ${dev.isOn ? "on" : ""}" data-action="power" ${idxAttr} aria-label="Toggle ${escapeHtml(dev.name)}">${ICONS.power}</button>` : ""}
            <span class="chevron">${ICONS.chevron}</span>
          </div>
        </div>
        ${
          !isModalMode && isExpanded
            ? `<div class="room-drawer">
                ${this._renderSafetyBanner(dev)}
                ${dev.isPurifier ? this._renderFilterBlock(dev) : ""}
                ${dev.sensors.pm25?.entityId ? this._renderSparkline(dev.sensors.pm25.entityId, "PM2.5", dev.sensors.pm25.unit || "µg/m³", pmEval?.color || "var(--daq-purple)") : dev.sensors.co2?.entityId ? this._renderSparkline(dev.sensors.co2.entityId, "CO₂", dev.sensors.co2.unit || "ppm", co2Eval?.color || "var(--daq-cyan)") : ""}
                ${Object.keys(dev.sensors).length ? this._renderMetricTiles(dev.sensors) : ""}
                ${dev.isPurifier ? this._renderPurifierControls(dev, idxAttr) : ""}
              </div>`
            : ""
        }
      </div>
    `;
  }

  _render() {
    if (!this._config || !this._root) return;
    this._root.innerHTML =
      this._mode === "overview" ? this._renderOverviewMode()
      : this._mode === "sensor" ? this._renderSensorMode()
      : this._renderPurifierMode();
    if (this._hass?.states) this._lastRenderSig = this._computeRenderSignature(this._hass.states);
  }
}

/* ---------- Visual Config Editor (Single Delegated Listener) ---------- */

class DraculaAirQualityCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    applyStyles(this.shadowRoot, EDITOR_SHEET, EDITOR_CSS);
    this._root = document.createElement("div");
    this.shadowRoot.appendChild(this._root);
    this._config = {};
    this._hass = null;

    this.shadowRoot.addEventListener("change", (e) => this._onChange(e));
    this.shadowRoot.addEventListener("click", (e) => this._onClick(e));
  }

  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(hass) { this._hass = hass; if (!this._root.innerHTML) this._render(); }

  _emit(newConfig) {
    this._config = newConfig;
    this.dispatchEvent(new CustomEvent("config-changed", { bubbles: true, composed: true, detail: { config: newConfig } }));
  }

  _getMode() {
    if (this._config.mode === "overview" || this._config.auto_discover || Array.isArray(this._config.devices) || Array.isArray(this._config.entities)) return "overview";
    if (this._config.mode === "sensor" || (!this._config.entity && this._config.sensors)) return "sensor";
    if (this._config.mode === "purifier" || this._config.entity) return "purifier";
    return "overview";
  }

  _onClick(e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.devDel !== undefined) {
      const list = [...(this._config.devices || this._config.entities || [])];
      list.splice(Number(btn.dataset.devDel), 1);
      const next = { ...this._config, devices: list }; delete next.entities;
      this._emit(next); this._render();
    } else if (btn.id === "add-device") {
      const list = [...(this._config.devices || this._config.entities || []), { entity: "", name: "" }];
      const next = { ...this._config, devices: list }; delete next.entities;
      this._emit(next); this._render();
    }
  }

  _onChange(e) {
    const el = e.target;
    if (el.id === "mode") {
      const next = { ...this._config }, val = el.value;
      delete next.mode;
      if (val === "purifier") { delete next.devices; delete next.entities; delete next.sensors; delete next.auto_discover; next.entity = next.entity || "fan.air_purifier"; }
      else if (val === "sensor") { delete next.entity; delete next.devices; delete next.entities; delete next.auto_discover; next.mode = "sensor"; next.sensors = next.sensors || {}; }
      else { delete next.entity; delete next.sensors; next.mode = "overview"; next.devices = next.devices || []; }
      this._emit(next); return this._render();
    }
    if (el.dataset.sensor) {
      const sensors = { ...(this._config.sensors || {}) };
      if (el.value) sensors[el.dataset.sensor] = el.value; else delete sensors[el.dataset.sensor];
      return this._emit({ ...this._config, sensors });
    }
    if (el.dataset.devEntity !== undefined || el.dataset.devName !== undefined) {
      const idx = Number(el.dataset.devEntity ?? el.dataset.devName);
      const list = [...(this._config.devices || this._config.entities || [])];
      const cur = typeof list[idx] === "string" ? { entity: list[idx] } : { ...(list[idx] || {}) };
      list[idx] = { ...cur, ...(el.dataset.devEntity !== undefined ? { entity: el.value } : { name: el.value }) };
      const next = { ...this._config, devices: list }; delete next.entities;
      return this._emit(next);
    }
    const boolKeys = ["compact", "show_header", "show_sparklines", "show_cadr", "show_filter", "show_timer", "auto_discover", "include_purifier_sensors"];
    if (boolKeys.includes(el.id)) {
      this._emit({ ...this._config, [el.id]: el.checked });
      if (el.id === "auto_discover") this._render();
      return;
    }
    const strKeys = ["theme", "language", "group_by", "sort_by", "default_filter", "detail_view", "entity", "automation_entity", "outdoor_pm25_entity"];
    if (strKeys.includes(el.id) || el.id === "name") {
      const next = { ...this._config };
      if (el.value) next[el.id] = el.value; else delete next[el.id];
      this._emit(next);
    }
  }

  _render() {
    const mode = this._getMode();
    const states = Object.keys(this._hass?.states || {});
    const fans = states.filter((id) => id.startsWith("fan."));
    const sens = states.filter((id) => id.startsWith("sensor."));
    const autos = states.filter((id) => id.startsWith("automation."));
    const devices = this._config.devices || this._config.entities || [];
    const sensors = this._config.sensors || {};

    this._root.innerHTML = `
      <div class="editor">
        <div class="row">
          <div class="field"><label>Layout Mode</label>
            <select id="mode">
              <option value="overview" ${mode === "overview" ? "selected" : ""}>Whole-Home Overview (Standard)</option>
              <option value="purifier" ${mode === "purifier" ? "selected" : ""}>Single Purifier (Optional)</option>
              <option value="sensor" ${mode === "sensor" ? "selected" : ""}>Standalone AQ Sensor (Optional)</option>
            </select>
          </div>
          <div class="field"><label>Theme</label>
            <select id="theme">
              <option value="dracula" ${(this._config.theme || "dracula") === "dracula" ? "selected" : ""}>Dracula</option>
              <option value="dracula-soft" ${this._config.theme === "dracula-soft" ? "selected" : ""}>Dracula Soft</option>
              <option value="auto" ${this._config.theme === "auto" ? "selected" : ""}>Auto (HA Theme)</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div class="field"><label>Name (optional)</label><input type="text" id="name" value="${escapeHtml(this._config.name || "")}" placeholder="Auto from entity" /></div>
          <div class="field"><label>Language</label>
            <select id="language">
              <option value="auto" ${(this._config.language || "auto") === "auto" ? "selected" : ""}>Auto (HA Locale)</option>
              <option value="en" ${this._config.language === "en" ? "selected" : ""}>English</option>
              <option value="de" ${this._config.language === "de" ? "selected" : ""}>Deutsch</option>
              <option value="fr" ${this._config.language === "fr" ? "selected" : ""}>Français</option>
              <option value="es" ${this._config.language === "es" ? "selected" : ""}>Español</option>
            </select>
          </div>
        </div>
        <div class="checks">
          <label class="check"><input type="checkbox" id="show_header" ${this._config.show_header !== false ? "checked" : ""} /> Show Header</label>
          <label class="check"><input type="checkbox" id="compact" ${this._config.compact ? "checked" : ""} /> Compact</label>
          <label class="check"><input type="checkbox" id="show_sparklines" ${this._config.show_sparklines !== false ? "checked" : ""} /> 24h Sparklines</label>
          ${mode === "overview" ? `<label class="check"><input type="checkbox" id="auto_discover" ${this._config.auto_discover ? "checked" : ""} /> Auto-Discover</label><label class="check"><input type="checkbox" id="include_purifier_sensors" ${this._config.include_purifier_sensors !== false ? "checked" : ""} /> Purifier Sensors</label>` : ""}
          ${mode === "purifier" ? `<label class="check"><input type="checkbox" id="show_cadr" ${this._config.show_cadr !== false ? "checked" : ""} /> CADR</label><label class="check"><input type="checkbox" id="show_filter" ${this._config.show_filter !== false ? "checked" : ""} /> Filter</label><label class="check"><input type="checkbox" id="show_timer" ${this._config.show_timer !== false ? "checked" : ""} /> Timer</label>` : ""}
        </div>
        ${mode === "purifier" ? `<div class="section"><div class="section-title">Purifier Entity</div><div class="row"><div class="field"><label>Fan Entity</label><input type="text" id="entity" list="fan-list" value="${escapeHtml(this._config.entity || "")}" placeholder="fan.bedroom_air_purifier" /><datalist id="fan-list">${fans.map((id) => `<option value="${escapeHtml(id)}">`).join("")}</datalist></div><div class="field"><label>Automation Rule (optional)</label><input type="text" id="automation_entity" list="auto-list" value="${escapeHtml(this._config.automation_entity || "")}" placeholder="automation.bedroom_air_quality" /><datalist id="auto-list">${autos.map((id) => `<option value="${escapeHtml(id)}">`).join("")}</datalist></div></div></div>` : ""}
        ${mode === "sensor" ? `<div class="section"><div class="section-title">Air Quality Sensors</div><datalist id="sensor-list">${sens.map((id) => `<option value="${escapeHtml(id)}">`).join("")}</datalist><div class="row">${SENSOR_KEYS.map((k) => `<div class="field"><label>${escapeHtml(SENSOR_META[k].label)}</label><input type="text" data-sensor="${k}" list="sensor-list" value="${escapeHtml(sensors[k] || "")}" placeholder="sensor.room_${k}" /></div>`).join("")}</div></div>` : ""}
        ${mode === "overview" ? `
          <div class="section">
            <div class="row">
              <div class="field"><label>Group Devices By</label><select id="group_by"><option value="type" ${(this._config.group_by || "type") === "type" ? "selected" : ""}>Type (Purifiers / Sensors)</option><option value="room" ${this._config.group_by === "room" ? "selected" : ""}>Room / Group</option><option value="none" ${this._config.group_by === "none" ? "selected" : ""}>None (Flat list)</option></select></div>
              <div class="field"><label>Sort Devices By</label><select id="sort_by"><option value="default" ${(this._config.sort_by || "default") === "default" ? "selected" : ""}>Default Order</option><option value="pm25" ${this._config.sort_by === "pm25" ? "selected" : ""}>Worst PM2.5</option><option value="filter" ${this._config.sort_by === "filter" ? "selected" : ""}>Lowest Filter</option><option value="name" ${this._config.sort_by === "name" ? "selected" : ""}>Name (A–Z)</option></select></div>
            </div>
            <div class="row">
              <div class="field"><label>Detail View on Click</label><select id="detail_view"><option value="modal" ${(this._config.detail_view || "modal") === "modal" ? "selected" : ""}>Modal Overlay (Default)</option><option value="inline" ${this._config.detail_view === "inline" ? "selected" : ""}>Inline Drawer</option></select></div>
              <div class="field"><label>Default Filter Tab</label><select id="default_filter"><option value="all" ${(this._config.default_filter || "all") === "all" ? "selected" : ""}>All</option><option value="purifiers" ${this._config.default_filter === "purifiers" ? "selected" : ""}>Purifiers</option><option value="sensors" ${this._config.default_filter === "sensors" ? "selected" : ""}>Sensors</option></select></div>
            </div>
            <div class="field"><label>Outdoor PM2.5 Sensor (optional)</label><input type="text" id="outdoor_pm25_entity" list="sensor-list-ov" value="${escapeHtml(this._config.outdoor_pm25_entity || "")}" placeholder="sensor.outdoor_pm25" /><datalist id="sensor-list-ov">${sens.map((id) => `<option value="${escapeHtml(id)}">`).join("")}</datalist></div>
            ${
              this._config.auto_discover
                ? `<div style="font-size:12px;opacity:.8">Auto-discovery enabled — all Home Assistant purifiers & AQ sensors are included automatically.</div>`
                : `<div class="section-title">Rooms / Devices</div><datalist id="fan-list">${fans.map((id) => `<option value="${escapeHtml(id)}">`).join("")}</datalist>${devices.map((d, i) => `<div class="device-row"><input type="text" data-dev-entity="${i}" list="fan-list" value="${escapeHtml(typeof d === "string" ? d : d.entity || "")}" placeholder="fan.room_purifier" /><input type="text" data-dev-name="${i}" value="${escapeHtml(typeof d === "string" ? "" : d.name || "")}" placeholder="Room name" /><button type="button" data-dev-del="${i}">Remove</button></div>`).join("")}<div><button type="button" id="add-device">+ Add Device</button></div>`
            }
          </div>
        ` : ""}
      </div>
    `;
  }
}

/* ---------- Registration ---------- */

if (!customElements.get("dracula-air-quality-card")) customElements.define("dracula-air-quality-card", DraculaAirQualityCard);
if (!customElements.get("dracula-air-quality-card-editor")) customElements.define("dracula-air-quality-card-editor", DraculaAirQualityCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "dracula-air-quality-card")) {
  window.customCards.push({
    type: "dracula-air-quality-card",
    name: "Dracula Air Quality Card",
    description: "Whole-Home Air Quality Overview card for Home Assistant (auto-discover, grouped purifiers & CO/CO₂/VOC/PM sensors, 24h sparklines, ventilation advisor) with optional single-device modes.",
    preview: true,
  });
}

console.info(
  `%c DRACULA-AIR-QUALITY-CARD %c v${CARD_VERSION} `,
  "color:#282a36;background:#bd93f9;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px;",
  "color:#f8f8f2;background:#44475a;font-weight:600;padding:2px 6px;border-radius:0 4px 4px 0;"
);
