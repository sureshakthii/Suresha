// Weather forecast (Open-Meteo) — shared by the server and the offline phone app.
// Pure helpers: forecast URL, mapping to the app's shape, WMO descriptions (bilingual) and travel advice.
export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const round = (n, d = 1) => (n === null || n === undefined || !Number.isFinite(Number(n)) ? null : Math.round(Number(n) * 10 ** d) / 10 ** d);

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

// ---- Forecast ----

export function forecastUrl(lat, lon) {
  const q = new URLSearchParams({
    latitude: String(lat), longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset',
    timezone: 'auto', forecast_days: '7',
  });
  return `${FORECAST_URL}?${q}`;
}

export function mapForecast(f) {
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


/** Fetch and map the forecast directly (used by the phone app when there is no server). */
export async function fetchForecast(lat, lon, fetchFn = fetch) {
  const r = await fetchFn(forecastUrl(lat, lon));
  if (!r.ok) throw new Error(`forecast ${r.status}`);
  const f = mapForecast(await r.json());
  return { ...f, station: null, travel: travelAdvice(f.current, f.daily[0]), source: { station: 'Open-Meteo', forecast: 'open-meteo.com' } };
}
