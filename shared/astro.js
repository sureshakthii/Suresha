// Kaippesi Jothidar — Vedic (sidereal, Lahiri) astronomy core.
// Runs unchanged in Node (server + tests) and in the browser (live ticking).
import * as A from 'astronomy-engine';
import { zoneOffsetMinutes, birthInput } from './datetime.js';
import { vargaRasi, VARGAS } from './varga.js';

export const RASIS = [
  { en: 'Mesha', ta: 'மேஷம்', short: 'மே', lord: 'Mars' },
  { en: 'Rishaba', ta: 'ரிஷபம்', short: 'ரி', lord: 'Venus' },
  { en: 'Mithuna', ta: 'மிதுனம்', short: 'மி', lord: 'Mercury' },
  { en: 'Kataka', ta: 'கடகம்', short: 'க', lord: 'Moon' },
  { en: 'Simha', ta: 'சிம்மம்', short: 'சி', lord: 'Sun' },
  { en: 'Kanni', ta: 'கன்னி', short: 'கன்', lord: 'Mercury' },
  { en: 'Thula', ta: 'துலாம்', short: 'து', lord: 'Venus' },
  { en: 'Vrischika', ta: 'விருச்சிகம்', short: 'வி', lord: 'Mars' },
  { en: 'Dhanusu', ta: 'தனுசு', short: 'த', lord: 'Jupiter' },
  { en: 'Makara', ta: 'மகரம்', short: 'ம', lord: 'Saturn' },
  { en: 'Kumbha', ta: 'கும்பம்', short: 'கு', lord: 'Saturn' },
  { en: 'Meena', ta: 'மீனம்', short: 'மீ', lord: 'Jupiter' },
];

export const NAKSHATRAS = [
  ['Ashwini', 'அஸ்வினி', 'Ketu', 'kshipra'],
  ['Bharani', 'பரணி', 'Venus', 'ugra'],
  ['Krittika', 'கார்த்திகை', 'Sun', 'mishra'],
  ['Rohini', 'ரோகிணி', 'Moon', 'dhruva'],
  ['Mrigashira', 'மிருகசீரிஷம்', 'Mars', 'mridu'],
  ['Thiruvathirai', 'திருவாதிரை', 'Rahu', 'tikshna'],
  ['Punarpoosam', 'புனர்பூசம்', 'Jupiter', 'chara'],
  ['Poosam', 'பூசம்', 'Saturn', 'kshipra'],
  ['Ayilyam', 'ஆயில்யம்', 'Mercury', 'tikshna'],
  ['Magam', 'மகம்', 'Ketu', 'ugra'],
  ['Pooram', 'பூரம்', 'Venus', 'ugra'],
  ['Uthiram', 'உத்திரம்', 'Sun', 'dhruva'],
  ['Hastham', 'அஸ்தம்', 'Moon', 'kshipra'],
  ['Chithirai', 'சித்திரை', 'Mars', 'mridu'],
  ['Swathi', 'சுவாதி', 'Rahu', 'chara'],
  ['Visakam', 'விசாகம்', 'Jupiter', 'mishra'],
  ['Anusham', 'அனுஷம்', 'Saturn', 'mridu'],
  ['Kettai', 'கேட்டை', 'Mercury', 'tikshna'],
  ['Moolam', 'மூலம்', 'Ketu', 'tikshna'],
  ['Pooradam', 'பூராடம்', 'Venus', 'ugra'],
  ['Uthiradam', 'உத்திராடம்', 'Sun', 'dhruva'],
  ['Thiruvonam', 'திருவோணம்', 'Moon', 'chara'],
  ['Avittam', 'அவிட்டம்', 'Mars', 'chara'],
  ['Sathayam', 'சதயம்', 'Rahu', 'chara'],
  ['Poorattathi', 'பூரட்டாதி', 'Jupiter', 'ugra'],
  ['Uthirattathi', 'உத்திரட்டாதி', 'Saturn', 'dhruva'],
  ['Revathi', 'ரேவதி', 'Mercury', 'mridu'],
].map(([en, ta, lord, nature], i) => ({ index: i, en, ta, lord, nature }));

export const PLANETS = {
  Sun: { ta: 'சூரியன்', short: 'சூ', en: 'Su' },
  Moon: { ta: 'சந்திரன்', short: 'சந்', en: 'Mo' },
  Mars: { ta: 'செவ்வாய்', short: 'செவ்', en: 'Ma' },
  Mercury: { ta: 'புதன்', short: 'பு', en: 'Me' },
  Jupiter: { ta: 'குரு', short: 'கு', en: 'Ju' },
  Venus: { ta: 'சுக்கிரன்', short: 'சுக்', en: 'Ve' },
  Saturn: { ta: 'சனி', short: 'சனி', en: 'Sa' },
  Rahu: { ta: 'ராகு', short: 'ரா', en: 'Ra' },
  Ketu: { ta: 'கேது', short: 'கே', en: 'Ke' },
  Lagna: { ta: 'லக்னம்', short: 'ல', en: 'As' },
};

export const TITHIS = [
  'Prathamai', 'Dwitiyai', 'Tritiyai', 'Chaturthi', 'Panchami', 'Shashti', 'Saptami', 'Ashtami',
  'Navami', 'Dasami', 'Ekadasi', 'Dwadasi', 'Trayodasi', 'Chaturdasi',
];
export const TITHIS_TA = [
  'பிரதமை', 'துவிதியை', 'திருதியை', 'சதுர்த்தி', 'பஞ்சமி', 'சஷ்டி', 'சப்தமி', 'அஷ்டமி',
  'நவமி', 'தசமி', 'ஏகாதசி', 'துவாதசி', 'திரயோதசி', 'சதுர்த்தசி',
];
export const YOGAS = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shula',
  'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyana',
  'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
];
export const YOGAS_TA = [
  'விஷ்கம்பம்', 'ப்ரீதி', 'ஆயுஷ்மான்', 'சௌபாக்கியம்', 'சோபனம்', 'அதிகண்டம்', 'சுகர்மம்', 'திருதி', 'சூலம்',
  'கண்டம்', 'விருத்தி', 'துருவம்', 'வியாகாதம்', 'ஹர்ஷணம்', 'வஜ்ரம்', 'சித்தி', 'வியதீபாதம்', 'வரீயான்',
  'பரிகம்', 'சிவம்', 'சித்தம்', 'சாத்தியம்', 'சுபம்', 'சுப்பிரம்', 'பிராம்யம்', 'ஐந்திரம்', 'வைதிருதி',
];
const KARANAS_MOVABLE = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti'];
const KARANA_TA = { Bava: 'பவம்', Balava: 'பாலவம்', Kaulava: 'கௌலவம்', Taitila: 'தைதுலம்', Garaja: 'கரசை', Vanija: 'வணிசை', Vishti: 'பத்திரை', Kimstughna: 'கிம்ஸ்துக்னம்', Shakuni: 'சகுனி', Chatushpada: 'சதுஷ்பாதம்', Naga: 'நாகவம்' };
export const WEEKDAYS = [
  { en: 'Sunday', ta: 'ஞாயிறு', lord: 'Sun' },
  { en: 'Monday', ta: 'திங்கள்', lord: 'Moon' },
  { en: 'Tuesday', ta: 'செவ்வாய்', lord: 'Mars' },
  { en: 'Wednesday', ta: 'புதன்', lord: 'Mercury' },
  { en: 'Thursday', ta: 'வியாழன்', lord: 'Jupiter' },
  { en: 'Friday', ta: 'வெள்ளி', lord: 'Venus' },
  { en: 'Saturday', ta: 'சனி', lord: 'Saturn' },
];
// Chaldean order used for Horai succession.
const HORA_ORDER = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];
export const DASA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
export const DASA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };

const NAK_SPAN = 360 / 27;
const PADA_SPAN = NAK_SPAN / 4;
const DEG = Math.PI / 180;
// Vimshottari year = Julian year of 365.25 days (documented in docs/ENGINE-CONTRACT.md).
export const DASA_YEAR_DAYS = 365.25;
const YEAR_MS = DASA_YEAR_DAYS * 86400000;
const DAY_MS = 86400000;

export const norm360 = (x) => ((x % 360) + 360) % 360;

/** Signed shortest angular difference b − a in degrees, in (−180, 180]. Safe across 359°/0°. */
export function angleDiff(a, b) {
  const d = norm360(b - a);
  return d > 180 ? d - 360 : d;
}

/** Julian centuries of TT since J2000.0 (astronomy-engine applies ΔT for us). */
function centuriesTT(date) {
  return A.MakeTime(date).tt / 36525;
}

// ---------------------------------------------------------------- Ayanamsa
// Lahiri (Chitrapaksha) as defined by the Indian Calendar Reform Committee and used by
// Swiss Ephemeris SE_SIDM_LAHIRI: mean ayanamsa = 23°15'00.658" − 16.777" (nutation at the epoch)
// = 23.245522556° at JD 2435553.5 TT (1956-03-21 0h TT). It then advances with the general
// precession in longitude p_A of the IAU 2006 model (Capitaine, Wallace & Chapront 2003, A&A 412, 567):
//   p_A = 5028.796195 T + 1.1054348 T² + 0.00007964 T³ − 0.000023857 T⁴ − 0.0000000383 T⁵  (arcsec, T in TT centuries from J2000).
// Gives ≈ 22.4601° at J1900 and ≈ 23.857° at J2000 (mean), matching the Swiss Ephemeris table.
export const LAHIRI_EPOCH_JD_TT = 2435553.5;
export const LAHIRI_AT_EPOCH = 23.245522556;
const generalPrecessionArcsec = (T) => (((((-0.0000000383 * T) - 0.000023857) * T + 0.00007964) * T + 1.1054348) * T + 5028.796195) * T;
const LAHIRI_T0 = (LAHIRI_EPOCH_JD_TT - 2451545.0) / 36525;
const PA_T0 = generalPrecessionArcsec(LAHIRI_T0);

/** Mean Lahiri ayanamsa in degrees (no nutation). Time scale TT. */
export function lahiriAyanamsaMean(date) {
  return LAHIRI_AT_EPOCH + (generalPrecessionArcsec(centuriesTT(date)) - PA_T0) / 3600;
}

/**
 * True Lahiri ayanamsa in degrees = mean + nutation in longitude Δψ (IAU 2000B).
 * Planet longitudes from astronomy-engine are apparent (true equinox of date), so subtracting the TRUE
 * ayanamsa gives sidereal longitudes free of the ±17" nutation wobble (the Swiss Ephemeris convention).
 */
export function lahiriAyanamsa(date) {
  const t = A.MakeTime(date);
  return lahiriAyanamsaMean(date) + A.e_tilt(t).dpsi / 3600;
}

/** Mean lunar node (Rahu), tropical, Meeus (47.7). */
function meanNode(date) {
  const T = centuriesTT(date);
  return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441);
}

function tropicalLongitude(body, time) {
  if (body === 'Sun') return A.SunPosition(time).elon;
  if (body === 'Moon') return A.EclipticGeoMoon(time).lon;
  if (body === 'Rahu') return meanNode(time.date);
  return A.Ecliptic(A.GeoVector(body, time, true)).elon;
}

const siderealOf = (body, date) => norm360(tropicalLongitude(body, A.MakeTime(date)) - lahiriAyanamsa(date));

/**
 * Sidereal longitude speed in degrees/day, by central difference over ±12 h on UNWRAPPED longitudes
 * (angleDiff), so a planet moving 359.9° → 0.1° reads +0.2°, never −359.8°.
 */
export function longitudeSpeed(body, date, halfSpanMs = 43200000) {
  const a = siderealOf(body, new Date(date.getTime() - halfSpanMs));
  const b = siderealOf(body, new Date(date.getTime() + halfSpanMs));
  return angleDiff(a, b) / ((2 * halfSpanMs) / DAY_MS);
}

/**
 * A planet is flagged 'stationary' when |speed| is below this many degrees/day (about 10 % of its
 * mean daily motion). Engineering threshold — astrologer approval pending (see ENGINE-CONTRACT.md).
 */
export const STATIONARY_SPEED = Object.freeze({ Mercury: 0.1, Venus: 0.05, Mars: 0.05, Jupiter: 0.008, Saturn: 0.004 });

/** Speed, retrograde and stationary flags for a body at an instant. Sun and Moon are never retrograde. */
export function motion(body, date) {
  const speed = longitudeSpeed(body, date);
  if (body === 'Sun' || body === 'Moon') return { speed, retrograde: false, stationary: false };
  if (body === 'Rahu' || body === 'Ketu') return { speed, retrograde: true, stationary: false }; // mean node always retrograde
  return { speed, retrograde: speed < 0, stationary: Math.abs(speed) < (STATIONARY_SPEED[body] ?? 0) };
}

/**
 * Tropical ascendant (degrees, [0, 360)) — full formula with latitude φ, true obliquity ε and RAMC:
 *   ASC = atan2( cos RAMC, −(sin RAMC · cos ε + tan φ · sin ε) )
 * RAMC = Greenwich apparent sidereal time × 15 + east longitude. Inside the polar circles (|φ| > 90° − ε)
 * the ascendant is ill-defined at times; callers get `highLatitude: true` (see planetPositions).
 */
export function tropicalAscendant(date, lat, lon) {
  const time = A.MakeTime(date);
  const eps = A.e_tilt(time).tobl * DEG;
  const ramc = norm360(A.SiderealTime(time) * 15 + lon) * DEG;
  const y = Math.cos(ramc);
  const x = -(Math.sin(eps) * Math.tan(lat * DEG) + Math.cos(eps) * Math.sin(ramc));
  return norm360(Math.atan2(y, x) / DEG);
}

/** Sidereal (Lahiri) ascendant in degrees, [0, 360). */
export const siderealAscendant = (date, lat, lon) => norm360(tropicalAscendant(date, lat, lon) - lahiriAyanamsa(date));

export function describeLongitude(sid) {
  const rasi = Math.floor(sid / 30);
  const nak = Math.floor(sid / NAK_SPAN);
  const pada = Math.floor((sid % NAK_SPAN) / PADA_SPAN) + 1;
  const inSign = sid - rasi * 30;
  const d = Math.floor(inSign);
  const m = Math.floor((inSign - d) * 60);
  const s = Math.floor(((inSign - d) * 60 - m) * 60);
  return {
    longitude: sid,
    rasi,
    rasiName: RASIS[rasi].en,
    rasiTa: RASIS[rasi].ta,
    degreeInSign: inSign,
    dms: `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`,
    nakshatra: nak,
    nakshatraName: NAKSHATRAS[nak].en,
    nakshatraTa: NAKSHATRAS[nak].ta,
    nakshatraLord: NAKSHATRAS[nak].lord,
    pada,
    navamsaRasi: Math.floor(sid / (30 / 9)) % 12,
  };
}

/**
 * Sidereal positions of all grahas + lagna. Each planet carries `speed` (sidereal °/day),
 * `retrograde` (speed < 0) and `stationary` (|speed| below STATIONARY_SPEED).
 * Pass lat/lon = null to omit the Lagna (e.g. unknown birth time).
 */
export function planetPositions(date, lat, lon) {
  const time = A.MakeTime(date);
  const aya = lahiriAyanamsa(date);
  const out = {};
  for (const body of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']) {
    const sid = norm360(tropicalLongitude(body, time) - aya);
    out[body] = { ...describeLongitude(sid), ...motion(body, date) };
  }
  const rahu = norm360(meanNode(date) - aya);
  const node = motion('Rahu', date);
  out.Rahu = { ...describeLongitude(rahu), ...node };
  // Ketu is exactly opposite Rahu by definition (norm360 keeps it in [0, 360)).
  out.Ketu = { ...describeLongitude(norm360(rahu + 180)), ...node };
  if (lat != null && lon != null) {
    const asc = norm360(tropicalAscendant(date, lat, lon) - aya);
    out.Lagna = { ...describeLongitude(asc), retrograde: false, stationary: false, speed: null };
    if (Math.abs(lat) > 66) out.Lagna.highLatitude = true;
  }
  return { ayanamsa: aya, planets: out };
}

/** Build rasi (D1) and navamsa (D9) house maps: sign index -> [planet keys]. */
export function buildCharts(planets) {
  const rasi = Array.from({ length: 12 }, () => []);
  const navamsa = Array.from({ length: 12 }, () => []);
  for (const [k, p] of Object.entries(planets)) {
    rasi[p.rasi].push(k);
    navamsa[p.navamsaRasi].push(k);
  }
  return { rasi, navamsa };
}

/** Moon − Sun elongation, [0, 360): tithi = floor(/12), karana = floor(/6). */
export function sunMoonSeparation(date) {
  const t = A.MakeTime(date);
  return norm360(A.EclipticGeoMoon(t).lon - A.SunPosition(t).elon);
}

// Root-finding tolerance for every panchangam / sankranti event time.
export const CROSSING_TOLERANCE_MS = 1000;

/** Bisection on [lo, hi] (ms) where pred(lo) is false and pred(hi) is true; returns hi within `tol`. */
function bisect(pred, lo, hi, tol = CROSSING_TOLERANCE_MS) {
  while (hi - lo > tol) {
    const mid = Math.floor((lo + hi) / 2);
    if (pred(new Date(mid))) hi = mid; else lo = mid;
  }
  return new Date(hi);
}

/**
 * Find the first instant after `from` when fn(date) crosses `target` (fn increasing mod 360).
 * The hourly scan only BRACKETS the root (every panchangam angle moves < 1°/h, so one hour cannot
 * contain two crossings of the same target); the instant itself comes from bisection to ≤ 1 second.
 * Returned instant t satisfies: fn(t − 1 s) is before the target and fn(t) is at/after it.
 */
export function findCrossing(fn, target, from, maxHours, stepMs = 3600000) {
  const diff = (d) => norm360(fn(d) - target + 180) - 180;
  let a = from.getTime();
  let da = diff(from);
  const limit = a + maxHours * 3600000;
  while (a < limit) {
    const b = Math.min(a + stepMs, limit);
    const db = diff(new Date(b));
    if (da < 0 && db >= 0) return bisect((d) => diff(d) >= 0, a, b);
    a = b; da = db;
  }
  return null;
}

/**
 * Every boundary of a segmented angle (segment width `span` degrees) between `from` and `to`, in order.
 * Handles several transitions in one civil day (e.g. two tithis ending, or a skipped tithi).
 * Returns [{ at: Date, from: index, to: index }].
 */
export function findBoundaries(fn, span, from, to, stepMs = 3600000) {
  const count = Math.round(360 / span);
  const idx = (d) => Math.floor(fn(d) / span) % count;
  const out = [];
  let a = from.getTime();
  const end = to.getTime();
  let ia = idx(from);
  while (a < end) {
    const b = Math.min(a + stepMs, end);
    const ib = idx(new Date(b));
    if (ib !== ia) {
      const start = ia;
      const at = bisect((d) => idx(d) !== start, a, b);
      const next = idx(at);
      out.push({ at, from: start, to: next });
      a = at.getTime(); ia = next; // continue from the boundary: catches a second change inside the same step
      continue;
    }
    a = b; ia = ib;
  }
  return out;
}

export const sunSidereal = (d) => norm360(A.SunPosition(A.MakeTime(d)).elon - lahiriAyanamsa(d));
export const moonSidereal = (d) => norm360(A.EclipticGeoMoon(A.MakeTime(d)).lon - lahiriAyanamsa(d));
/** Sidereal Sun + Moon, [0, 360): yoga = floor(/(360/27)). */
export const yogaSum = (d) => {
  const t = A.MakeTime(d);
  return norm360(A.EclipticGeoMoon(t).lon + A.SunPosition(t).elon - 2 * lahiriAyanamsa(d));
};

/**
 * All tithi, nakshatra, yoga and karana changes between two instants, chronologically.
 * Returns [{ kind: 'tithi'|'nakshatra'|'yoga'|'karana', at, from, to }].
 */
export function panchangTransitions(from, to) {
  const all = [
    ...findBoundaries(sunMoonSeparation, 12, from, to).map((e) => ({ kind: 'tithi', ...e })),
    ...findBoundaries(moonSidereal, NAK_SPAN, from, to).map((e) => ({ kind: 'nakshatra', ...e })),
    ...findBoundaries(yogaSum, NAK_SPAN, from, to).map((e) => ({ kind: 'yoga', ...e })),
    ...findBoundaries(sunMoonSeparation, 6, from, to).map((e) => ({ kind: 'karana', ...e })),
  ];
  return all.sort((x, y) => x.at - y.at);
}

function riseSet(body, date, lat, lon, dir) {
  const obs = new A.Observer(lat, lon, 0);
  const r = A.SearchRiseSet(body, obs, dir, A.MakeTime(date), 2);
  return r ? r.date : null;
}

/**
 * Vedic day boundaries: sunrise today -> sunrise tomorrow, local to lat/lon.
 * `date` may be any instant; we locate the sunrise that precedes it.
 * Sunrise/sunset = upper limb of the Sun on the sea-level horizon with standard refraction
 * (astronomy-engine SearchRiseSet). Never throws: at high latitudes where the Sun does not rise or set
 * within the search window, missing events are replaced by a 06:00/18:00 local-mean-time approximation
 * and the result carries `polar: true`, `approximate: true` and `missing: [...]` so the UI can say so.
 */
const dayCache = [];
export function vedicDay(date, lat, lon) {
  const hit = dayCache.find((d) => d.lat === lat && d.lon === lon && date >= d.sunrise && date < d.nextSunrise);
  if (hit) return hit;
  const day = computeVedicDay(date, lat, lon);
  dayCache.push({ lat, lon, ...day });
  if (dayCache.length > 64) dayCache.shift();
  return day;
}

function computeVedicDay(date, lat, lon) {
  const missing = [];
  // Start 30 h back so the first sunrise found is never after `date` (sunrise drifts by minutes per day).
  let sunrise = riseSet('Sun', new Date(date.getTime() - 30 * 3600000), lat, lon, +1);
  let next = sunrise && riseSet('Sun', new Date(sunrise.getTime() + 60000), lat, lon, +1);
  while (next && next <= date) {
    sunrise = next;
    next = riseSet('Sun', new Date(sunrise.getTime() + 60000), lat, lon, +1);
  }
  if (!sunrise || sunrise > date) {
    // Polar fallback: 06:00 local mean time.
    missing.push('sunrise');
    const base = new Date(date);
    base.setUTCHours(6 - Math.round(lon / 15), 0, 0, 0);
    sunrise = base > date ? new Date(base.getTime() - DAY_MS) : base;
    next = new Date(sunrise.getTime() + DAY_MS);
  }
  if (!next) {
    missing.push('nextSunrise');
    next = new Date(sunrise.getTime() + DAY_MS);
  }
  let sunset = riseSet('Sun', sunrise, lat, lon, -1);
  if (!sunset || sunset >= next) {
    missing.push('sunset');
    sunset = new Date(sunrise.getTime() + (next - sunrise) / 2);
  }
  const polar = missing.length > 0;
  return { sunrise, sunset, nextSunrise: next, polar, approximate: polar, missing };
}

/** Local UTC offset in hours: a number (legacy fixed offset) or an IANA zone name evaluated at `instant`. */
export function offsetHoursAt(tz, instant) {
  if (typeof tz === 'string') return zoneOffsetMinutes(tz, instant) / 60;
  return Number(tz) || 0;
}

/**
 * Weekday of the Vedic day, using the local time zone at sunrise.
 * Because the Vedic day starts at sunrise, an instant before sunrise belongs to the previous weekday.
 */
export function weekdayOf(sunrise, tz) {
  return new Date(sunrise.getTime() + offsetHoursAt(tz, sunrise) * 3600000).getUTCDay();
}

/** Horai methods. The label is returned with every table so the UI never mixes methods silently. */
export const HORAI_METHODS = Object.freeze({
  'tamil-60': {
    id: 'tamil-60',
    en: 'Tamil Horai — fixed 60-minute periods from sunrise',
    ta: 'தமிழ் ஹோரை — சூரிய உதயம் முதல் 60 நிமிட ஹோரைகள்',
  },
  'planetary-unequal': {
    id: 'planetary-unequal',
    en: 'Planetary hours — 12 equal parts of daytime and 12 of night-time',
    ta: 'கிரக ஹோரை — பகல் 12 பங்கு, இரவு 12 பங்கு (சம மற்ற நேரம்)',
  },
});

/**
 * Horai table for one Vedic day, first period ruled by the weekday lord, then Chaldean order.
 *  'tamil-60' (default): fixed 60-minute periods from sunrise until the next sunrise (last one truncated).
 *  'planetary-unequal': sunrise→sunset split into 12, sunset→next sunrise split into 12 (24 periods).
 *    Needs a real sunset; on polar days it falls back to 'tamil-60' and rows say so (`fallback: true`).
 * Every row carries `method` (id).
 */
export function horaiTable(day, weekday, method = 'tamil-60') {
  const startLord = HORA_ORDER.indexOf(WEEKDAYS[weekday].lord);
  const rows = [];
  const push = (i, s, e, m, extra = {}) => {
    const lord = HORA_ORDER[(startLord + i) % 7];
    rows.push({ lord, lordTa: PLANETS[lord].ta, start: new Date(s), end: new Date(e), method: m, ...extra });
  };
  if (method === 'planetary-unequal' && !day.polar) {
    const rise = day.sunrise.getTime();
    const set = day.sunset.getTime();
    const next = day.nextSunrise.getTime();
    const dl = (set - rise) / 12;
    const nl = (next - set) / 12;
    for (let i = 0; i < 12; i++) push(i, rise + i * dl, i === 11 ? set : rise + (i + 1) * dl, method, { part: 'day' });
    for (let i = 0; i < 12; i++) push(12 + i, set + i * nl, i === 11 ? next : set + (i + 1) * nl, method, { part: 'night' });
    return rows;
  }
  const fallback = method !== 'tamil-60';
  let t = day.sunrise.getTime();
  const end = day.nextSunrise.getTime();
  for (let i = 0; t < end; i++) {
    push(i, t, Math.min(t + 3600000, end), 'tamil-60', fallback ? { fallback: true } : {});
    t += 3600000;
  }
  return rows;
}

// 1-indexed eighth of the daytime per weekday (Sun..Sat).
const RAHU_SEG = [8, 2, 7, 5, 6, 4, 3];
const YAMA_SEG = [5, 4, 3, 2, 1, 7, 6];
const GULIGAI_SEG = [7, 6, 5, 4, 3, 2, 1];

/** idx-th (1..8) eighth of daytime; boundaries from proportions so the 8th ends exactly at sunset. */
function segment(day, idx) {
  const rise = day.sunrise.getTime();
  const len = (day.sunset.getTime() - rise) / 8;
  const start = new Date(rise + Math.round((idx - 1) * len));
  return { start, end: idx === 8 ? new Date(day.sunset.getTime()) : new Date(rise + Math.round(idx * len)) };
}

/**
 * Complete live Panchangam + Prasna snapshot for any instant and place.
 * `tzOffset`: hours (legacy) or an IANA zone name. Options: withEnds (event end times by root-finding),
 * horaiMethod ('tamil-60' default | 'planetary-unequal').
 */
export function panchang(date, lat, lon, tzOffset, { withEnds = true, horaiMethod = 'tamil-60' } = {}) {
  const { planets, ayanamsa } = planetPositions(date, lat, lon);
  const sep = sunMoonSeparation(date);
  const tithiIdx = Math.floor(sep / 12);
  const paksha = tithiIdx < 15 ? 'Shukla' : 'Krishna';
  const tn = tithiIdx % 15;
  const tithiName = tithiIdx === 14 ? 'Pournami' : tithiIdx === 29 ? 'Amavasai' : TITHIS[tn];
  const tithiTa = tithiIdx === 14 ? 'பௌர்ணமி' : tithiIdx === 29 ? 'அமாவாசை' : TITHIS_TA[tn];
  const karanaIdx = Math.floor(sep / 6);
  const karana = karanaIdx === 0 ? 'Kimstughna'
    : karanaIdx === 57 ? 'Shakuni' : karanaIdx === 58 ? 'Chatushpada' : karanaIdx === 59 ? 'Naga'
      : KARANAS_MOVABLE[(karanaIdx - 1) % 7];
  const ysum = yogaSum(date);
  const yogaIdx = Math.floor(ysum / NAK_SPAN);
  const moon = planets.Moon;

  const cross = (fn, target, hours) => (withEnds ? findCrossing(fn, target, date, hours) : null);
  const nakEnd = cross(moonSidereal, (moon.nakshatra + 1) * NAK_SPAN % 360, 36);
  const rasiEnd = cross(moonSidereal, (moon.rasi + 1) * 30 % 360, 72);
  const tithiEnd = cross(sunMoonSeparation, (tithiIdx + 1) * 12 % 360, 36);
  const yogaEnd = cross(yogaSum, (yogaIdx + 1) * NAK_SPAN % 360, 36);
  const karanaEnd = cross(sunMoonSeparation, (karanaIdx + 1) * 6 % 360, 24);

  const day = vedicDay(date, lat, lon);
  const weekday = weekdayOf(day.sunrise, tzOffset);
  const horai = horaiTable(day, weekday, horaiMethod);
  const usedHorai = horai[0]?.method ?? 'tamil-60';
  const currentHora = horai.find((h) => date >= h.start && date < h.end) || horai[horai.length - 1];
  const rahuKalam = segment(day, RAHU_SEG[weekday]);
  const yamagandam = segment(day, YAMA_SEG[weekday]);
  const guligai = segment(day, GULIGAI_SEG[weekday]);
  const inRange = (r) => date >= r.start && date < r.end;

  return {
    at: date,
    ayanamsa,
    planets,
    weekday: { index: weekday, ...WEEKDAYS[weekday] },
    tithi: { index: tithiIdx, name: tithiName, ta: tithiTa, paksha, endsAt: tithiEnd, progress: (sep % 12) / 12 },
    nakshatra: {
      index: moon.nakshatra, name: moon.nakshatraName, ta: moon.nakshatraTa, pada: moon.pada,
      lord: moon.nakshatraLord, endsAt: nakEnd, progress: (moon.longitude % NAK_SPAN) / NAK_SPAN,
    },
    moonRasi: { index: moon.rasi, name: moon.rasiName, ta: moon.rasiTa, endsAt: rasiEnd },
    yoga: { index: yogaIdx, name: YOGAS[yogaIdx], ta: YOGAS_TA[yogaIdx], endsAt: yogaEnd },
    karana,
    karanaTa: KARANA_TA[karana],
    karanaIndex: karanaIdx,
    karanaEndsAt: karanaEnd,
    lagna: planets.Lagna,
    sunrise: day.sunrise,
    sunset: day.sunset,
    nextSunrise: day.nextSunrise,
    dayFlags: { polar: !!day.polar, approximate: !!day.approximate, missing: day.missing ?? [] },
    horai,
    horaiMethod: HORAI_METHODS[usedHorai],
    currentHora,
    rahuKalam, yamagandam, guligai,
    inRahuKalam: inRange(rahuKalam),
    inYamagandam: inRange(yamagandam),
    inGuligai: inRange(guligai),
  };
}

const DASA_LEVELS = ['maha', 'bhukti', 'pratyantara', 'sookshma'];

/**
 * Children of a dasa period (Maha → Bhukti → Pratyantara → Sookshma). The child sequence starts with the
 * parent's own lord and follows DASA_ORDER; each child's share is DASA_YEARS[child] / 120 of the parent.
 * Exact partition: boundaries are computed from cumulative proportions of the parent span (no running
 * sum of lengths), the first child starts at the parent start and the last child ends exactly at the
 * parent end — no rounding drift at any depth.
 */
export function subPeriods(period) {
  const start = period.start.getTime();
  const end = period.end.getTime();
  const span = end - start;
  const level = DASA_LEVELS[DASA_LEVELS.indexOf(period.level ?? 'maha') + 1] ?? 'sub';
  const first = DASA_ORDER.indexOf(period.lord);
  const out = [];
  let cum = 0;
  for (let j = 0; j < 9; j++) {
    const lord = DASA_ORDER[(first + j) % 9];
    const s = j === 0 ? start : start + Math.round(span * cum / 120);
    cum += DASA_YEARS[lord];
    const e = j === 8 ? end : start + Math.round(span * cum / 120);
    out.push({ lord, lordTa: PLANETS[lord].ta, level, start: new Date(s), end: new Date(e) });
  }
  return out;
}

/**
 * Vimshottari Maha Dasa + Bhukti schedule from the birth Moon (sidereal longitude).
 * Conventions (ENGINE-CONTRACT.md): nakshatra lord sequence DASA_ORDER from Ashwini = Ketu; the balance
 * of the first dasa is the unelapsed fraction of the Moon's nakshatra; 1 dasa year = 365.25 days
 * (Julian year) of elapsed UTC time; maha periods are contiguous (each starts at the previous end).
 * Pratyantaras: `subPeriods(bhukti)`; the current one is returned as `currentPratyantara`.
 */
export function vimshottari(birthDate, moonLongitude, now = new Date()) {
  const nak = Math.floor(moonLongitude / NAK_SPAN);
  const fractionLeft = 1 - (moonLongitude % NAK_SPAN) / NAK_SPAN;
  const startIdx = DASA_ORDER.indexOf(NAKSHATRAS[nak].lord);
  const firstLord = DASA_ORDER[startIdx];
  // Dasa start moved back so the first period is the partial remainder.
  const t0 = Math.round(birthDate.getTime() - (1 - fractionLeft) * DASA_YEARS[firstLord] * YEAR_MS);
  const periods = [];
  let cumYears = 0;
  for (let i = 0; i < 9; i++) {
    const lord = DASA_ORDER[(startIdx + i) % 9];
    const s = t0 + Math.round(cumYears * YEAR_MS);
    cumYears += DASA_YEARS[lord];
    const e = t0 + Math.round(cumYears * YEAR_MS);
    const p = { lord, lordTa: PLANETS[lord].ta, level: 'maha', years: DASA_YEARS[lord], start: new Date(s), end: new Date(e) };
    p.bhuktis = subPeriods(p);
    periods.push(p);
  }
  const within = (x) => now >= x.start && now < x.end;
  const current = periods.find(within) || null;
  const currentBhukti = current ? current.bhuktis.find(within) || null : null;
  const currentPratyantara = currentBhukti ? subPeriods(currentBhukti).find(within) || null : null;
  return {
    balance: { lord: firstLord, years: fractionLeft * DASA_YEARS[firstLord] },
    yearDays: DASA_YEAR_DAYS,
    periods,
    current: current && { lord: current.lord, lordTa: current.lordTa, start: current.start, end: current.end },
    currentBhukti,
    currentPratyantara,
  };
}

/** Convert local birth date/time (YYYY-MM-DD, HH:MM[:SS]) + tz offset (hours) into a UTC Date. */
export function localToUtc(dateStr, timeStr, tzOffset) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi, s = 0] = timeStr.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s) - tzOffset * 3600000);
}

/**
 * Full birth chart (Jathagam).
 * Optional: `zone` (IANA, e.g. 'Asia/Kolkata') — when given it replaces the numeric `tz` and handles
 * historical offsets/DST; `timePrecision` 'exact' | 'approximate' | 'unknown'.
 * Unknown time: positions are computed at local noon and the Lagna/houses are NOT invented —
 * `lagna` is null, `planets.Lagna` is absent and `availability.lagna/houses` are false.
 */
export function birthChart({ name, date, time, lat, lon, tz, place, zone, timePrecision }) {
  const input = birthInput({ date, time, zone, tz, lat, lon, place, timePrecision });
  const utc = input.utc;
  const tzArg = zone || input.tz;
  const unknown = input.timePrecision === 'unknown';
  const snap = panchang(utc, lat, lon, tzArg);
  const planets = { ...snap.planets };
  if (unknown) delete planets.Lagna;
  const charts = buildCharts(planets);
  const chart = {
    name, place, lat, lon, tz: zone ? input.tz : tz, zone: zone || null, date, time,
    utc,
    input,
    timePrecision: input.timePrecision,
    availability: {
      lagna: !unknown,
      houses: !unknown,
      reason: unknown ? { en: 'Birth time unknown — Lagna and houses are not calculated.', ta: 'பிறந்த நேரம் தெரியவில்லை — லக்னமும் பாவங்களும் கணிக்கப்படவில்லை.' } : null,
    },
    ayanamsa: snap.ayanamsa,
    planets,
    charts,
    lagna: unknown ? null : snap.lagna,
    janmaNakshatra: snap.nakshatra,
    janmaRasi: snap.moonRasi,
    birthPanchang: {
      weekday: snap.weekday, tithi: snap.tithi, yoga: snap.yoga, karana: snap.karana, karanaTa: snap.karanaTa,
      sunrise: snap.sunrise, sunset: snap.sunset, horaAtBirth: unknown ? null : snap.currentHora.lord,
    },
    dasa: vimshottari(utc, snap.planets.Moon.longitude),
  };
  if (input.timePrecision !== 'exact') {
    // Which items could differ within the uncertainty (unknown: the whole civil day, ±12 h around noon).
    chart.stability = chartStability(chart, unknown ? 720 : 30);
    if (unknown) chart.dasa.approximate = true;
  }
  return chart;
}

/** Sidereal Lagna longitudes sampled every `stepMs` across [t − w, t + w] (cheap: no planets). */
function lagnaSamples(utcMs, lat, lon, windowMs, stepMs = 30000) {
  const n = Math.min(2000, Math.max(2, Math.ceil((2 * windowMs) / stepMs)));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const d = new Date(utcMs - windowMs + (2 * windowMs * i) / n);
    out.push(siderealAscendant(d, lat, lon));
  }
  return out;
}

const uniq = (arr) => [...new Set(arr)];

/**
 * Birth-time sensitivity (Brief §7). Recomputes the chart across ±windowMinutes and reports which items
 * change, so the UI can mark them unstable instead of showing them as precise.
 * `birth`: the birthChart() input object or a chart returned by birthChart().
 * Items: lagna rasi, navamsa lagna, every D-chart lagna, each planet's house (whole-sign from Lagna),
 * Moon nakshatra and pada. With timePrecision 'unknown', Lagna-based items are 'unavailable'.
 * Returns { windowMinutes, timePrecision, items: [{ key, label, status, values }], unstable: [keys] }.
 */
export function chartStability(birth, windowMinutes = 15) {
  const input = birth.input ?? birthInput(birth);
  const { lat, lon } = input;
  const unknown = input.timePrecision === 'unknown';
  const w = (unknown ? Math.max(windowMinutes, 720) : windowMinutes) * 60000;
  const t = input.utc.getTime();
  const at = [t - w, t, t + w].map((ms) => planetPositions(new Date(ms), null, null).planets);
  const items = [];
  const add = (key, label, values, available = true) => {
    const v = uniq(values);
    items.push({ key, label, status: !available ? 'unavailable' : v.length === 1 ? 'stable' : 'unstable', values: available ? v : [] });
  };
  const lagnas = unknown ? [] : lagnaSamples(t, lat, lon, w);
  const lagnaRasis = uniq(lagnas.map((l) => Math.floor(l / 30)));
  add('lagna', { en: 'Lagna (rasi)', ta: 'லக்ன ராசி' }, lagnaRasis, !unknown);
  add('navamsaLagna', { en: 'Navamsa Lagna (D9)', ta: 'நவாம்ச லக்னம்' }, lagnas.map((l) => vargaRasi(l, 9)), !unknown);
  for (const v of VARGAS) {
    if (v.n === 1 || v.n === 9) continue;
    add(`D${v.n}Lagna`, { en: `D${v.n} ${v.en} Lagna`, ta: `${v.ta} லக்னம்` }, lagnas.map((l) => vargaRasi(l, v.n)), !unknown);
  }
  for (const k of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']) {
    const signs = uniq(at.map((p) => p[k].rasi));
    const houses = [];
    for (const s of signs) for (const l of lagnaRasis) houses.push(((s - l + 12) % 12) + 1);
    add(`house:${k}`, { en: `${k} house`, ta: `${PLANETS[k].ta} பாவம்` }, houses, !unknown);
  }
  add('moonNakshatra', { en: 'Moon nakshatra', ta: 'ஜன்ம நட்சத்திரம்' }, at.map((p) => p.Moon.nakshatra));
  add('moonPada', { en: 'Moon nakshatra pada', ta: 'நட்சத்திர பாதம்' }, at.map((p) => `${p.Moon.nakshatra}-${p.Moon.pada}`));
  add('moonRasi', { en: 'Moon rasi', ta: 'ஜன்ம ராசி' }, at.map((p) => p.Moon.rasi));
  return {
    windowMinutes: w / 60000,
    timePrecision: input.timePrecision,
    items,
    unstable: items.filter((i) => i.status === 'unstable').map((i) => i.key),
    unavailable: items.filter((i) => i.status === 'unavailable').map((i) => i.key),
  };
}
