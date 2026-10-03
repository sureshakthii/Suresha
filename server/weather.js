import fs from 'node:fs';
import express from 'express';

// Live weather: Open-Meteo forecast + the nearest airport METAR observation (NOAA Aviation Weather).
const STATIONS = JSON.parse(fs.readFileSync(new URL('./data/stations.json', import.meta.url), 'utf8'));
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const METAR_URL = 'https://aviationweather.gov/api/data/metar';
const TIMEOUT = 8000;
const CACHE_TTL = 10 * 60000;
const STATION_RADIUS_KM = 150;
const KT_TO_KPH = 1.852;
const SM_TO_KM = 1.609344;

let fetchImpl = (...args) => fetch(...args);
const cache = new Map(); // "lat,lon" (0.05° grid) -> { at, promise }

/** Tests inject a mock fetch here; pass nothing to restore the global one. */
export function setWeatherFetch(fn) {
  fetchImpl = fn || ((...args) => fetch(...args));
  cache.clear();
}
export const clearWeatherCache = () => cache.clear();

const round = (n, d = 1) => (n === null || n === undefined || !Number.isFinite(Number(n)) ? null : Math.round(Number(n) * 10 ** d) / 10 ** d);

async function getJson(url) {
  const r = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { Accept: 'application/json', 'User-Agent': 'KaippesiJothidar/1.0' } });
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}`);
  return r.json();
}

// ---- WMO weather codes ----

export const WMO = {
  0: ['Clear sky', 'தெளிவான வானம்'],
  1: ['Mainly clear', 'பெரும்பாலும் தெளிவு'],
  2: ['Partly cloudy', 'ஓரளவு மேகமூட்டம்'],
  3: ['Overcast', 'முழு மேகமூட்டம்'],
  45: ['Fog', 'மூடுபனி'],
  48: ['Depositing rime fog', 'உறைபனி மூடுபனி'],
  51: ['Light drizzle', 'லேசான தூறல்'],
  53: ['Moderate drizzle', 'மிதமான தூறல்'],
  55: ['Dense drizzle', 'அடர்த்தியான தூறல்'],
  56: ['Light freezing drizzle', 'லேசான உறைபனித் தூறல்'],
  57: ['Dense freezing drizzle', 'அடர்த்தியான உறைபனித் தூறல்'],
  61: ['Slight rain', 'லேசான மழை'],
  63: ['Moderate rain', 'மிதமான மழை'],
  65: ['Heavy rain', 'கனமழை'],
  66: ['Light freezing rain', 'லேசான உறைபனி மழை'],
  67: ['Heavy freezing rain', 'கன உறைபனி மழை'],
  71: ['Slight snowfall', 'லேசான பனிப்பொழிவு'],
  73: ['Moderate snowfall', 'மிதமான பனிப்பொழிவு'],
  75: ['Heavy snowfall', 'கடும் பனிப்பொழிவு'],
  77: ['Snow grains', 'பனித் துகள்கள்'],
  80: ['Slight rain showers', 'லேசான மழைச் சாரல்'],
  81: ['Moderate rain showers', 'மிதமான மழைச் சாரல்'],
  82: ['Violent rain showers', 'மிகக் கனமான மழைச் சாரல்'],
  85: ['Slight snow showers', 'லேசான பனிச் சாரல்'],
  86: ['Heavy snow showers', 'கனமான பனிச் சாரல்'],
  95: ['Thunderstorm', 'இடியுடன் கூடிய மழை'],
  96: ['Thunderstorm with slight hail', 'இடி மழையுடன் லேசான ஆலங்கட்டி'],
  99: ['Thunderstorm with heavy hail', 'இடி மழையுடன் கனமான ஆலங்கட்டி'],
};

export function wmoDescription(code) {
  const d = WMO[code];
  return d ? { en: d[0], ta: d[1] } : { en: 'Unknown', ta: 'தெரியவில்லை' };
}

// ---- Stations & METAR ----

export function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/** Nearest METAR station within maxKm, or null. */
export function nearestStation(lat, lon, maxKm = STATION_RADIUS_KM) {
  let best = null;
  for (const s of STATIONS) {
    const d = distanceKm(lat, lon, s.lat, s.lon);
    if (d <= maxKm && (!best || d < best.distanceKm)) best = { ...s, distanceKm: d };
  }
  return best;
}

const WX_INTENSITY = { '-': 'Light', '+': 'Heavy' };
const WX_DESC = { MI: 'Shallow', BC: 'Patches of', PR: 'Partial', DR: 'Drifting', BL: 'Blowing', FZ: 'Freezing' };
const WX_PHEN = {
  DZ: 'drizzle', RA: 'rain', SN: 'snow', SG: 'snow grains', IC: 'ice crystals', PL: 'ice pellets', GR: 'hail', GS: 'small hail',
  UP: 'precipitation', BR: 'mist', FG: 'fog', FU: 'smoke', VA: 'volcanic ash', DU: 'dust', SA: 'sand', HZ: 'haze', PY: 'spray',
  PO: 'dust whirls', SQ: 'squalls', FC: 'funnel cloud', SS: 'sandstorm', DS: 'duststorm',
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function decodeWxToken(tok) {
  let t = tok;
  let intensity = '';
  let vicinity = false;
  if (t[0] === '-' || t[0] === '+') { intensity = WX_INTENSITY[t[0]]; t = t.slice(1); }
  if (t.startsWith('VC')) { vicinity = true; t = t.slice(2); }
  let ts = false, sh = false, desc = '';
  if (t.startsWith('TS')) { ts = true; t = t.slice(2); }
  if (t.startsWith('SH')) { sh = true; t = t.slice(2); }
  if (WX_DESC[t.slice(0, 2)]) { desc = WX_DESC[t.slice(0, 2)]; t = t.slice(2); }
  const phen = [];
  for (let i = 0; i < t.length; i += 2) {
    const p = WX_PHEN[t.slice(i, i + 2)];
    if (!p) return null; // unknown token — skip it
    phen.push(p);
  }
  let text = phen.join(' and ');
  if (desc) text = `${desc.toLowerCase()} ${text || ''}`.trim();
  if (sh) text = text ? `${text} showers` : 'showers';
  if (ts) text = text ? `thunderstorm with ${text}` : 'thunderstorm';
  if (!text) return null;
  if (intensity) text = `${intensity.toLowerCase()} ${text}`;
  if (vicinity) text = `${text} nearby`;
  return cap(text);
}

/** Decode a METAR present-weather string, e.g. '-RA BR' → 'Light rain, Mist'. */
export function decodeWx(wx) {
  if (!wx || typeof wx !== 'string') return null;
  const parts = wx.trim().split(/\s+/).map(decodeWxToken).filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

const COVER = { SKC: 'Clear', CLR: 'Clear', NSC: 'Clear', NCD: 'Clear', CAVOK: 'Clear', FEW: 'Few clouds', SCT: 'Scattered clouds', BKN: 'Mostly cloudy', OVC: 'Overcast', OVX: 'Sky obscured' };

function visibilityKm(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v)); // '10+' / '6+' statute miles → the number
  return Number.isFinite(n) ? round(n * SM_TO_KM) : null;
}

/** Map one aviationweather.gov METAR JSON record to our observation shape. */
export function mapMetar(m) {
  const clouds = Array.isArray(m.clouds) ? m.clouds.map((c) => ({ cover: c.cover, baseFt: c.base ?? null })) : [];
  const top = clouds.reduce((acc, c) => (Object.keys(COVER).indexOf(c.cover) > Object.keys(COVER).indexOf(acc) ? c.cover : acc), 'CLR');
  const time = m.obsTime ? new Date(m.obsTime * 1000).toISOString()
    : m.reportTime ? new Date(String(m.reportTime).replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(m.reportTime) ? '' : 'Z')).toISOString() : null;
  return {
    time,
    tempC: round(m.temp),
    dewpointC: round(m.dewp),
    windKph: m.wspd === null || m.wspd === undefined ? null : round(m.wspd * KT_TO_KPH),
    windDir: m.wdir ?? null, // degrees or 'VRB'
    visibilityKm: visibilityKm(m.visib),
    pressureHpa: round(m.altim),
    conditions: decodeWx(m.wxString) || (clouds.length ? COVER[top] || null : (m.cover && COVER[m.cover]) || null),
    clouds,
    raw: m.rawOb || null,
  };
}

async function stationObservation(lat, lon) {
  const s = nearestStation(lat, lon);
  if (!s) return null;
  try {
    const data = await getJson(`${METAR_URL}?ids=${s.icao}&format=json`);
    const m = Array.isArray(data) ? data[0] : null;
    if (!m) return null;
    return { icao: s.icao, name: s.name, distanceKm: round(s.distanceKm), observed: mapMetar(m) };
  } catch {
    return null;
  }
}

// ---- Forecast ----

function forecastUrl(lat, lon) {
  const q = new URLSearchParams({
    latitude: String(lat), longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset',
    timezone: 'auto', forecast_days: '7',
  });
  return `${FORECAST_URL}?${q}`;
}

function mapForecast(f) {
  const c = f.current || {};
  const current = {
    time: c.time ?? null,
    tempC: round(c.temperature_2m),
    feelsLikeC: round(c.apparent_temperature),
    humidity: c.relative_humidity_2m ?? null,
    windKph: round(c.wind_speed_10m),
    precipitationMm: round(c.precipitation),
    weatherCode: c.weather_code ?? null,
    description: wmoDescription(c.weather_code),
  };
  const h = f.hourly || {};
  const times = h.time || [];
  const hourStart = c.time ? `${c.time.slice(0, 13)}:00` : '';
  let from = times.findIndex((t) => t >= hourStart);
  if (from < 0) from = 0;
  const hourly = times.slice(from, from + 24).map((time, k) => ({
    time,
    tempC: round(h.temperature_2m?.[from + k]),
    rainChance: h.precipitation_probability?.[from + k] ?? null,
    weatherCode: h.weather_code?.[from + k] ?? null,
  }));
  const d = f.daily || {};
  const daily = (d.time || []).slice(0, 7).map((date, i) => ({
    date,
    minC: round(d.temperature_2m_min?.[i]),
    maxC: round(d.temperature_2m_max?.[i]),
    rainChance: d.precipitation_probability_max?.[i] ?? null,
    rainMm: round(d.precipitation_sum?.[i]),
    weatherCode: d.weather_code?.[i] ?? null,
    description: wmoDescription(d.weather_code?.[i]),
    sunrise: d.sunrise?.[i] ?? null,
    sunset: d.sunset?.[i] ?? null,
  }));
  return { current, hourly, daily };
}

// ---- Travel advice ----

const HEAVY_CODES = new Set([65, 82, 95, 96, 99]);
const LEVELS = {
  good: { en: 'Good weather for travel', ta: 'பயணத்திற்கு ஏற்ற வானிலை' },
  caution: { en: 'Travel with caution', ta: 'கவனத்துடன் பயணிக்கவும்' },
  avoid: { en: 'Avoid travel if possible', ta: 'முடிந்தால் பயணத்தைத் தவிர்க்கவும்' },
};

/** Travel advice for today from the current conditions and today's forecast. */
export function travelAdvice(current, today) {
  const reasons = [];
  let level = 'good';
  const rainMm = today?.rainMm ?? 0;
  const codes = [current?.weatherCode, today?.weatherCode].filter((x) => x !== null && x !== undefined);
  const heavyCode = codes.find((x) => HEAVY_CODES.has(x));
  if (rainMm >= 20) reasons.push({ en: `Heavy rain expected (${rainMm} mm)`, ta: `கனமழை எதிர்பார்க்கப்படுகிறது (${rainMm} மி.மீ)` });
  if (heavyCode !== undefined) {
    const d = wmoDescription(heavyCode);
    reasons.push({ en: `${d.en} forecast`, ta: `${d.ta} வாய்ப்பு` });
  }
  if (reasons.length) level = 'avoid';
  const chance = today?.rainChance ?? 0;
  if (chance >= 60) reasons.push({ en: `High chance of rain (${chance}%)`, ta: `மழை வாய்ப்பு அதிகம் (${chance}%)` });
  const wind = current?.windKph ?? 0;
  if (wind > 40) reasons.push({ en: `Strong winds (${wind} km/h)`, ta: `பலத்த காற்று (${wind} கி.மீ/மணி)` });
  if (level === 'good' && reasons.length) level = 'caution';
  return { level, ...LEVELS[level], reasons };
}

// ---- Public API ----

const gridKey = (lat, lon) => `${Math.round(lat * 20)},${Math.round(lon * 20)}`;

/** Weather for a point, cached per 0.05° cell for 10 minutes. Throws if the forecast is unavailable. */
export function getWeather(lat, lon) {
  const key = gridKey(lat, lon);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_TTL) return hit.promise;
  if (cache.size > 1000) for (const [k, v] of cache) if (now - v.at >= CACHE_TTL) cache.delete(k);
  const glat = Math.round(lat * 20) / 20, glon = Math.round(lon * 20) / 20;
  const promise = (async () => {
    const [forecast, station] = await Promise.all([getJson(forecastUrl(glat, glon)), stationObservation(lat, lon)]);
    const { current, hourly, daily } = mapForecast(forecast);
    return {
      station, current, hourly, daily,
      travel: travelAdvice(current, daily[0]),
      source: { forecast: 'Open-Meteo', station: 'NOAA Aviation Weather (METAR)' },
      fetchedAt: new Date().toISOString(),
    };
  })();
  cache.set(key, { at: now, promise });
  promise.catch(() => { if (cache.get(key)?.promise === promise) cache.delete(key); });
  return promise;
}

export function weatherRouter() {
  const r = express.Router();
  r.get('/weather', async (req, res) => {
    const lat = Number(req.query.lat), lon = Number(req.query.lon);
    if (req.query.lat === undefined || req.query.lat === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) return res.status(400).json({ error: 'Invalid lat' });
    if (req.query.lon === undefined || req.query.lon === '' || !Number.isFinite(lon) || lon < -180 || lon > 180) return res.status(400).json({ error: 'Invalid lon' });
    try {
      res.json(await getWeather(lat, lon));
    } catch (e) {
      console.warn('weather:', e.message);
      res.status(502).json({ error: 'Weather service unavailable — please try again shortly' });
    }
  });
  return r;
}
