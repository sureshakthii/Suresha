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
  return { current, hourly, daily, utcOffsetSec: f.utc_offset_seconds ?? null };
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

// ---------------------------------------------------------------- Smart advice ("go early, come back before the heat")
const T = (en, ta) => ({ en, ta });
const hm = (d, tz) => { const x = new Date(d.getTime() + tz * 3600000); const h = x.getUTCHours(); const m = String(x.getUTCMinutes()).padStart(2, '0'); return { h, m, en: `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'AM' : 'PM'}`, ta: `${h >= 4 && h < 12 ? 'காலை' : h >= 12 && h < 16 ? 'மதியம்' : h >= 16 && h < 19 ? 'மாலை' : 'இரவு'} ${((h + 11) % 12) + 1}:${m}` }; };

/**
 * Practical advice for today from the hourly forecast, merged with the panchangam.
 * w: forecast (mapForecast / getWeather shape); tz: hours offset of the place;
 * opts.good: [{start,end}] auspicious windows (nalla neram); opts.avoid: [{start,end}] (rahu kalam, yamagandam).
 * Returns { tips: [{kind:'heat'|'rain'|'humid'|'wind'|'good', en, ta, at?}], bestOut: {start,end,en,ta}|null }.
 */
export function weatherAdvice(w, { tz = 5.5, good = [], avoid = [], now = new Date() } = {}) {
  const off = w.utcOffsetSec != null ? w.utcOffsetSec / 3600 : tz;
  const hours = (w.hourly || []).map((h) => {
    const [d, t] = String(h.time).split('T');
    const [y, mo, da] = d.split('-').map(Number); const [hh, mi] = (t || '0:0').split(':').map(Number);
    return { ...h, at: new Date(Date.UTC(y, mo - 1, da, hh, mi || 0) - off * 3600000) };
  }).filter((h) => h.at.getTime() >= now.getTime() - 3600000 && h.at.getTime() <= now.getTime() + 18 * 3600000);
  const tips = [];
  if (!hours.length) return { tips, bestOut: null };
  const feels = w.current?.feelsLikeC ?? w.current?.tempC;
  // Heat: first daylight hour that reaches 35°C (or already hot now).
  const hot = hours.find((h) => (h.tempC ?? 0) >= 35);
  const peak = hours.reduce((a, b) => ((b.tempC ?? -99) > (a.tempC ?? -99) ? b : a), hours[0]);
  if (hot) {
    const t = hm(hot.at, tz);
    tips.push({ kind: 'heat', at: hot.at, ...T(`Heat rises to ${Math.round(peak.tempC)}°C from ${t.en} — go out early and come back before then. Carry water.`,
      `${t.ta} முதல் வெயில் ${Math.round(peak.tempC)}° வரை உயரும் — முன்னதாகச் சென்று அதற்குள் திரும்புங்கள். தண்ணீர் எடுத்துச் செல்லுங்கள்.`) });
  } else if ((feels ?? 0) >= 38) {
    tips.push({ kind: 'heat', ...T(`It feels like ${Math.round(feels)}°C — stay in the shade, drink buttermilk or water often.`, `உணரும் வெப்பம் ${Math.round(feels)}° — நிழலில் இருங்கள், மோர் / தண்ணீர் அடிக்கடி குடியுங்கள்.`) });
  }
  // Rain: first hour with ≥ 50% chance.
  const wet = hours.find((h) => (h.rainChance ?? 0) >= 50);
  if (wet) {
    const t = hm(wet.at, tz);
    tips.push({ kind: 'rain', at: wet.at, ...T(`Rain likely around ${t.en} (${wet.rainChance}%) — finish outdoor work and temple visits before that; keep an umbrella.`,
      `${t.ta} அளவில் மழை வாய்ப்பு (${wet.rainChance}%) — வெளி வேலை, கோவில் தரிசனத்தை அதற்கு முன் முடியுங்கள்; குடை எடுத்துச் செல்லுங்கள்.`) });
  }
  if ((w.current?.humidity ?? 0) >= 80 && (w.current?.tempC ?? 0) >= 28) tips.push({ kind: 'humid', ...T('Very humid — light cotton clothes and extra water, especially for elders and children.', 'ஈரப்பதம் அதிகம் — மெல்லிய பருத்தி உடை, கூடுதல் தண்ணீர்; பெரியோர், குழந்தைகளுக்கு கவனம்.') });
  if ((w.current?.windKph ?? 0) >= 35) tips.push({ kind: 'wind', ...T('Strong wind — careful on two-wheelers and near the sea.', 'பலத்த காற்று — இருசக்கர வாகனம், கடற்கரையில் கவனம்.') });

  // Best time to go out: a daylight hour that is not too hot, not rainy, not in rahu kalam / yamagandam, preferring nalla neram.
  const inAny = (t, list) => list.some((r) => t >= new Date(r.start).getTime() && t < new Date(r.end).getTime());
  const cands = hours.filter((h) => h.at.getTime() >= now.getTime() - 30 * 60000).filter((h) => { const x = hm(h.at, tz).h; return x >= 5 && x <= 19; })
    .filter((h) => (h.tempC ?? 0) < 35 && (h.rainChance ?? 0) < 40 && !inAny(h.at.getTime() + 30 * 60000, avoid))
    .map((h) => ({ h, score: (inAny(h.at.getTime() + 30 * 60000, good) ? 3 : 0) - (h.rainChance ?? 0) / 25 - Math.max(0, (h.tempC ?? 0) - 30) / 2 }));
  const best = cands.sort((a, b) => b.score - a.score || a.h.at - b.h.at)[0];
  let bestOut = null;
  if (best) {
    const start = best.h.at, end = new Date(start.getTime() + 3600000);
    const s = hm(start, tz), e = hm(end, tz);
    const nalla = inAny(start.getTime() + 30 * 60000, good);
    bestOut = { start, end, nalla, ...T(`Best time to go out today: ${s.en} – ${e.en}${nalla ? ' (nalla neram)' : ''}`, `இன்று வெளியே செல்ல சிறந்த நேரம்: ${s.ta} – ${e.ta}${nalla ? ' (நல்ல நேரம்)' : ''}`) };
  }
  if (!tips.length) tips.push({ kind: 'good', ...T('Pleasant weather today — a good day for temple visits and travel.', 'இன்று இதமான வானிலை — கோவில் தரிசனம், பயணத்திற்கு நல்ல நாள்.') });
  return { tips, bestOut };
}
