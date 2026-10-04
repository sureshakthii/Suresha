// Thunai — Vedic (sidereal, Lahiri) astronomy core.
// Runs unchanged in Node (server + tests) and in the browser (live ticking).
import * as A from 'astronomy-engine';

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
const YEAR_MS = 365.25 * 86400000;

export const norm360 = (x) => ((x % 360) + 360) % 360;

function julianCenturies(date) {
  return (date.getTime() / 86400000 + 2440587.5 - 2451545.0) / 36525;
}

/** Lahiri (Chitrapaksha) ayanamsa in degrees. Accurate to well under 1 arc-minute for 1900–2100. */
export function lahiriAyanamsa(date) {
  const T = julianCenturies(date);
  return 23.853058 + 1.396971 * T + 0.0003086 * T * T;
}

/** Mean lunar node (Rahu), tropical. */
function meanNode(date) {
  const T = julianCenturies(date);
  return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441);
}

function tropicalLongitude(body, time) {
  if (body === 'Sun') return A.SunPosition(time).elon;
  if (body === 'Moon') return A.EclipticGeoMoon(time).lon;
  return A.Ecliptic(A.GeoVector(body, time, true)).elon;
}

function isRetrograde(body, date) {
  if (body === 'Sun' || body === 'Moon') return false;
  const a = tropicalLongitude(body, A.MakeTime(new Date(date.getTime() - 43200000)));
  const b = tropicalLongitude(body, A.MakeTime(new Date(date.getTime() + 43200000)));
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d < 0;
}

/** Tropical ascendant for a given instant and place. */
function tropicalAscendant(date, lat, lon) {
  const time = A.MakeTime(date);
  const T = julianCenturies(date);
  const eps = (23.4392911 - 0.0130042 * T) * DEG;
  const ramc = norm360(A.SiderealTime(time) * 15 + lon) * DEG;
  const y = Math.cos(ramc);
  const x = -(Math.sin(eps) * Math.tan(lat * DEG) + Math.cos(eps) * Math.sin(ramc));
  return norm360(Math.atan2(y, x) / DEG);
}

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

/** Sidereal positions of all grahas + lagna. */
export function planetPositions(date, lat, lon) {
  const time = A.MakeTime(date);
  const aya = lahiriAyanamsa(date);
  const out = {};
  for (const body of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']) {
    const sid = norm360(tropicalLongitude(body, time) - aya);
    out[body] = { ...describeLongitude(sid), retrograde: isRetrograde(body, date) };
  }
  const rahu = norm360(meanNode(date) - aya);
  out.Rahu = { ...describeLongitude(rahu), retrograde: true };
  out.Ketu = { ...describeLongitude(norm360(rahu + 180)), retrograde: true };
  if (lat != null && lon != null) {
    out.Lagna = { ...describeLongitude(norm360(tropicalAscendant(date, lat, lon) - aya)), retrograde: false };
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

function sunMoonSeparation(date) {
  const t = A.MakeTime(date);
  return norm360(A.EclipticGeoMoon(t).lon - A.SunPosition(t).elon);
}

/** Find the instant (after `from`) when fn(date) crosses `target` (fn is increasing mod 360). */
export function findCrossing(fn, target, from, maxHours) {
  const step = 3600000;
  let a = from;
  const diff = (d) => norm360(fn(d) - target + 180) - 180;
  let da = diff(a);
  for (let h = 0; h < maxHours; h++) {
    const b = new Date(a.getTime() + step);
    const db = diff(b);
    if (da < 0 && db >= 0) {
      let lo = a, hi = b;
      for (let i = 0; i < 40; i++) {
        const mid = new Date((lo.getTime() + hi.getTime()) / 2);
        if (diff(mid) < 0) lo = mid; else hi = mid;
      }
      return hi;
    }
    a = b; da = db;
  }
  return null;
}

export const sunSidereal = (d) => norm360(A.SunPosition(A.MakeTime(d)).elon - lahiriAyanamsa(d));
export const moonSidereal = (d) => norm360(A.EclipticGeoMoon(A.MakeTime(d)).lon - lahiriAyanamsa(d));
const yogaSum = (d) => {
  const t = A.MakeTime(d);
  return norm360(A.EclipticGeoMoon(t).lon + A.SunPosition(t).elon - 2 * lahiriAyanamsa(d));
};

function riseSet(body, date, lat, lon, dir) {
  const obs = new A.Observer(lat, lon, 0);
  const r = A.SearchRiseSet(body, obs, dir, A.MakeTime(date), 2);
  return r ? r.date : null;
}

/**
 * Vedic day boundaries: sunrise today -> sunrise tomorrow, local to lat/lon.
 * `date` may be any instant; we locate the sunrise that precedes it.
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
  let sunrise = riseSet('Sun', new Date(date.getTime() - 86400000), lat, lon, +1);
  let next = sunrise && riseSet('Sun', new Date(sunrise.getTime() + 60000), lat, lon, +1);
  while (next && next <= date) {
    sunrise = next;
    next = riseSet('Sun', new Date(sunrise.getTime() + 60000), lat, lon, +1);
  }
  if (!sunrise) {
    // Polar fallback: pretend 06:00 local mean time.
    const base = new Date(date);
    base.setUTCHours(6 - Math.round(lon / 15), 0, 0, 0);
    sunrise = base > date ? new Date(base.getTime() - 86400000) : base;
    next = new Date(sunrise.getTime() + 86400000);
  }
  const sunset = riseSet('Sun', sunrise, lat, lon, -1);
  return { sunrise, sunset, nextSunrise: next };
}

/** Weekday of the Vedic day, using the local time zone offset (hours) at sunrise. */
function weekdayOf(sunrise, tzOffset) {
  return new Date(sunrise.getTime() + tzOffset * 3600000).getUTCDay();
}

/** Tamil-style Horai: 60-minute periods from sunrise, first ruled by the weekday lord. */
export function horaiTable(day, weekday) {
  const startLord = HORA_ORDER.indexOf(WEEKDAYS[weekday].lord);
  const rows = [];
  let t = day.sunrise.getTime();
  const end = day.nextSunrise.getTime();
  for (let i = 0; t < end; i++) {
    const lord = HORA_ORDER[(startLord + i) % 7];
    rows.push({ lord, lordTa: PLANETS[lord].ta, start: new Date(t), end: new Date(Math.min(t + 3600000, end)) });
    t += 3600000;
  }
  return rows;
}

// 1-indexed eighth of the daytime per weekday (Sun..Sat).
const RAHU_SEG = [8, 2, 7, 5, 6, 4, 3];
const YAMA_SEG = [5, 4, 3, 2, 1, 7, 6];
const GULIGAI_SEG = [7, 6, 5, 4, 3, 2, 1];

function segment(day, idx) {
  const len = (day.sunset - day.sunrise) / 8;
  const start = new Date(day.sunrise.getTime() + (idx - 1) * len);
  return { start, end: new Date(start.getTime() + len) };
}

/** Complete live Panchangam + Prasna snapshot for any instant and place. */
export function panchang(date, lat, lon, tzOffset, { withEnds = true } = {}) {
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

  const day = vedicDay(date, lat, lon);
  const weekday = weekdayOf(day.sunrise, tzOffset);
  const horai = horaiTable(day, weekday);
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
    lagna: planets.Lagna,
    sunrise: day.sunrise,
    sunset: day.sunset,
    nextSunrise: day.nextSunrise,
    horai,
    currentHora,
    rahuKalam, yamagandam, guligai,
    inRahuKalam: inRange(rahuKalam),
    inYamagandam: inRange(yamagandam),
    inGuligai: inRange(guligai),
  };
}

/** Vimshottari Maha Dasa + Bhukti schedule from birth Moon. */
export function vimshottari(birthDate, moonLongitude, now = new Date()) {
  const nak = Math.floor(moonLongitude / NAK_SPAN);
  const fractionLeft = 1 - (moonLongitude % NAK_SPAN) / NAK_SPAN;
  const startIdx = DASA_ORDER.indexOf(NAKSHATRAS[nak].lord);
  const firstLord = DASA_ORDER[startIdx];
  // Dasa start moved back so the first period is the partial remainder.
  let t = birthDate.getTime() - (1 - fractionLeft) * DASA_YEARS[firstLord] * YEAR_MS;
  const periods = [];
  for (let i = 0; i < 9; i++) {
    const lord = DASA_ORDER[(startIdx + i) % 9];
    const len = DASA_YEARS[lord] * YEAR_MS;
    const bhuktis = [];
    let bt = t;
    for (let j = 0; j < 9; j++) {
      const bl = DASA_ORDER[(startIdx + i + j) % 9];
      const blen = (DASA_YEARS[lord] * DASA_YEARS[bl] / 120) * YEAR_MS;
      bhuktis.push({ lord: bl, lordTa: PLANETS[bl].ta, start: new Date(bt), end: new Date(bt + blen) });
      bt += blen;
    }
    periods.push({ lord, lordTa: PLANETS[lord].ta, years: DASA_YEARS[lord], start: new Date(t), end: new Date(t + len), bhuktis });
    t += len;
  }
  const current = periods.find((p) => now >= p.start && now < p.end) || null;
  const currentBhukti = current ? current.bhuktis.find((b) => now >= b.start && now < b.end) : null;
  return {
    balance: { lord: firstLord, years: fractionLeft * DASA_YEARS[firstLord] },
    periods,
    current: current && { lord: current.lord, lordTa: current.lordTa, start: current.start, end: current.end },
    currentBhukti,
  };
}

/** Convert local birth date/time (YYYY-MM-DD, HH:MM[:SS]) + tz offset (hours) into a UTC Date. */
export function localToUtc(dateStr, timeStr, tzOffset) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi, s = 0] = timeStr.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s) - tzOffset * 3600000);
}

/** Full birth chart (Jathagam). */
export function birthChart({ name, date, time, lat, lon, tz, place }) {
  const utc = localToUtc(date, time, tz);
  const snap = panchang(utc, lat, lon, tz);
  const charts = buildCharts(snap.planets);
  return {
    name, place, lat, lon, tz, date, time,
    utc,
    ayanamsa: snap.ayanamsa,
    planets: snap.planets,
    charts,
    lagna: snap.lagna,
    janmaNakshatra: snap.nakshatra,
    janmaRasi: snap.moonRasi,
    birthPanchang: {
      weekday: snap.weekday, tithi: snap.tithi, yoga: snap.yoga, karana: snap.karana, karanaTa: snap.karanaTa,
      sunrise: snap.sunrise, sunset: snap.sunset, horaAtBirth: snap.currentHora.lord,
    },
    dasa: vimshottari(utc, snap.planets.Moon.longitude),
  };
}
