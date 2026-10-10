// Airport weather stations (METAR) — the MEASURED temperature, shared by the server and the phone app.
// Forecast models (Open-Meteo) can differ by several degrees from what is measured on the ground, so the app
// shows the nearest station's observation as "now" whenever one is available.
import { round } from './weather.js';

export const STATIONS = [{"icao": "VOMM", "name": "Chennai International", "lat": 12.99, "lon": 80.169}, {"icao": "VOMD", "name": "Madurai", "lat": 9.834, "lon": 78.093}, {"icao": "VOCB", "name": "Coimbatore", "lat": 11.03, "lon": 77.043}, {"icao": "VOTR", "name": "Tiruchirappalli", "lat": 10.765, "lon": 78.71}, {"icao": "VOTK", "name": "Thoothukudi (Tuticorin)", "lat": 8.724, "lon": 78.026}, {"icao": "VOSM", "name": "Salem", "lat": 11.783, "lon": 78.065}, {"icao": "VOPC", "name": "Puducherry", "lat": 11.968, "lon": 79.812}, {"icao": "VOBL", "name": "Bengaluru Kempegowda International", "lat": 13.198, "lon": 77.706}, {"icao": "VOBG", "name": "Bengaluru HAL", "lat": 12.95, "lon": 77.668}, {"icao": "VOML", "name": "Mangaluru", "lat": 12.961, "lon": 74.89}, {"icao": "VOMY", "name": "Mysuru", "lat": 12.231, "lon": 76.656}, {"icao": "VOHS", "name": "Hyderabad Rajiv Gandhi International", "lat": 17.231, "lon": 78.43}, {"icao": "VOHY", "name": "Hyderabad Begumpet", "lat": 17.453, "lon": 78.468}, {"icao": "VOTV", "name": "Thiruvananthapuram", "lat": 8.482, "lon": 76.92}, {"icao": "VOCI", "name": "Kochi", "lat": 10.152, "lon": 76.402}, {"icao": "VOCL", "name": "Kozhikode", "lat": 11.137, "lon": 75.955}, {"icao": "VOKN", "name": "Kannur", "lat": 11.919, "lon": 75.548}, {"icao": "VOTP", "name": "Tirupati", "lat": 13.632, "lon": 79.543}, {"icao": "VOBZ", "name": "Vijayawada", "lat": 16.53, "lon": 80.797}, {"icao": "VOVZ", "name": "Visakhapatnam", "lat": 17.721, "lon": 83.225}, {"icao": "VORY", "name": "Rajahmundry", "lat": 17.11, "lon": 81.818}, {"icao": "VOCP", "name": "Kadapa", "lat": 14.51, "lon": 78.773}, {"icao": "VOKU", "name": "Kurnool", "lat": 15.716, "lon": 78.163}, {"icao": "VOHB", "name": "Hubballi", "lat": 15.362, "lon": 75.085}, {"icao": "VOBM", "name": "Belagavi", "lat": 15.859, "lon": 74.618}, {"icao": "VOGO", "name": "Goa Dabolim", "lat": 15.381, "lon": 73.831}, {"icao": "VOGA", "name": "Goa Mopa", "lat": 15.744, "lon": 73.861}, {"icao": "VOPB", "name": "Port Blair", "lat": 11.641, "lon": 92.73}, {"icao": "VABB", "name": "Mumbai", "lat": 19.089, "lon": 72.868}, {"icao": "VAPO", "name": "Pune", "lat": 18.582, "lon": 73.92}, {"icao": "VANP", "name": "Nagpur", "lat": 21.092, "lon": 79.047}, {"icao": "VAAH", "name": "Ahmedabad", "lat": 23.077, "lon": 72.635}, {"icao": "VIDP", "name": "Delhi Indira Gandhi International", "lat": 28.566, "lon": 77.103}, {"icao": "VECC", "name": "Kolkata", "lat": 22.655, "lon": 88.447}, {"icao": "VEBS", "name": "Bhubaneswar", "lat": 20.244, "lon": 85.818}, {"icao": "VCBI", "name": "Colombo Bandaranaike International", "lat": 7.181, "lon": 79.884}, {"icao": "VCCJ", "name": "Jaffna", "lat": 9.792, "lon": 80.07}, {"icao": "WSSS", "name": "Singapore Changi", "lat": 1.359, "lon": 103.989}, {"icao": "OMDB", "name": "Dubai International", "lat": 25.253, "lon": 55.364}];
export const METAR_URL = 'https://aviationweather.gov/api/data/metar';
const STATION_RADIUS_KM = 150;
const KT_TO_KPH = 1.852;
const SM_TO_KM = 1.609344;

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


/** Nearest station's latest observation via getJson(url) → parsed JSON; null when none or on any error. */
export async function stationObservation(lat, lon, getJson) {
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
