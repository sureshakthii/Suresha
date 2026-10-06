// Thunai accuracy benchmark — compares the app engine (shared/astro.js, built on astronomy-engine) with the
// Swiss Ephemeris (sweph, native, using the JPL-derived SE data files sepl_18/semo_18 in ./ephe).
// The reference side never calls the app's code: positions, sunrise, panchangam boundaries, sankrantis and
// dasa dates are all recomputed from Swiss Ephemeris with independent root-finding below.
//
//   cd scripts/benchmark && npm install && node run.mjs [--samples 500] [--days 600] [--seed 7]
//
// Writes results.json and results.md next to this file.
import { createRequire } from 'node:module';
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  planetPositions, panchang, vimshottari, DASA_ORDER, DASA_YEARS, sunSidereal, findCrossing, vedicDay,
} from '../../shared/astro.js';
import { tamilDate } from '../../shared/tamilcal.js';
import { zoneOffsetMinutes } from '../../shared/datetime.js';

const require = createRequire(import.meta.url);
const swe = require('sweph');
const C = swe.constants;
const HERE = dirname(fileURLToPath(import.meta.url));

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? Number(process.argv[i + 1]) : def; };
const N_POS = arg('samples', 500);
const N_DAYS = arg('days', 600);
const N_BIRTH = arg('births', 300);
let seed = arg('seed', 7);
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

// ------------------------------------------------------------------ reference (Swiss Ephemeris)
const EPHE = join(HERE, 'ephe');
if (!existsSync(join(EPHE, 'sepl_18.se1'))) {
  console.error('Missing ephe/sepl_18.se1 and ephe/semo_18.se1 — download them from https://github.com/aloistr/swisseph/tree/master/ephe');
  process.exit(1);
}
swe.set_ephe_path(EPHE);
swe.set_sid_mode(C.SE_SIDM_LAHIRI, 0, 0);
const FLAGS = C.SEFLG_SWIEPH | C.SEFLG_SIDEREAL | C.SEFLG_SPEED;
const jdOf = (d) => d.getTime() / 86400000 + 2440587.5;
const dateOf = (jd) => new Date(Math.round((jd - 2440587.5) * 86400000));
const BODIES = { Sun: C.SE_SUN, Moon: C.SE_MOON, Mars: C.SE_MARS, Mercury: C.SE_MERCURY, Jupiter: C.SE_JUPITER, Venus: C.SE_VENUS, Saturn: C.SE_SATURN };
let usedMoshier = 0;
function refLon(body, d) {
  const id = body === 'Rahu' ? C.SE_MEAN_NODE : body === 'TrueRahu' ? C.SE_TRUE_NODE : BODIES[body];
  const r = swe.calc_ut(jdOf(d), id, FLAGS);
  if (r.error && !/not found/.test(r.error)) throw new Error(r.error);
  if (!(r.flag & C.SEFLG_SWIEPH)) usedMoshier++;
  return r.data[0];
}
const refAsc = (d, lat, lon) => swe.houses_ex(jdOf(d), C.SEFLG_SIDEREAL, lat, lon, 'W').data.points[0];
const refAyanamsa = (d) => swe.get_ayanamsa_ex_ut(jdOf(d), C.SEFLG_SWIEPH).data;
function refRiseSet(fromDate, lat, lon, rise) {
  const r = swe.rise_trans(jdOf(fromDate), C.SE_SUN, null, C.SEFLG_SWIEPH, rise ? C.SE_CALC_RISE : C.SE_CALC_SET, [lon, lat, 0], 1013.25, 15);
  return r.flag === 0 ? dateOf(r.data) : null;
}
const n360 = (x) => ((x % 360) + 360) % 360;
const NAK = 360 / 27;
const refSep = (d) => n360(refLon('Moon', d) - refLon('Sun', d));
const refYoga = (d) => n360(refLon('Moon', d) + refLon('Sun', d));
const refMoon = (d) => refLon('Moon', d);
/** Next instant after `from` at which floor(fn/span) changes (reference root-finder: 20-min scan + bisection to 0.5 s). */
function refNextBoundary(fn, span, from) {
  const idx = (d) => Math.floor(fn(d) / span);
  const i0 = idx(from);
  let a = from.getTime();
  for (let k = 0; k < 6 * 24 * 3; k++) {
    const b = a + 20 * 60000;
    if (idx(new Date(b)) !== i0) {
      let lo = a, hi = b;
      while (hi - lo > 500) { const m = (lo + hi) / 2; if (idx(new Date(m)) !== i0) hi = m; else lo = m; }
      return new Date(hi);
    }
    a = b;
  }
  return null;
}
function refCrossing(fn, target, from, hours) {
  const diff = (d) => n360(fn(d) - target + 180) - 180;
  let a = from.getTime();
  for (let k = 0; k < hours * 2; k++) {
    const b = a + 1800000;
    if (diff(new Date(a)) < 0 && diff(new Date(b)) >= 0) {
      let lo = a, hi = b;
      while (hi - lo > 500) { const m = (lo + hi) / 2; if (diff(new Date(m)) >= 0) hi = m; else lo = m; }
      return new Date(hi);
    }
    a = b;
  }
  return null;
}

// ------------------------------------------------------------------ sample places
const CITIES = [
  ['Chennai', 13.0827, 80.2707, 'Asia/Kolkata'], ['Madurai', 9.9252, 78.1198, 'Asia/Kolkata'],
  ['Coimbatore', 11.0168, 76.9558, 'Asia/Kolkata'], ['Tiruchirappalli', 10.7905, 78.7047, 'Asia/Kolkata'],
  ['Tirunelveli', 8.7139, 77.7567, 'Asia/Kolkata'], ['Thanjavur', 10.787, 79.1378, 'Asia/Kolkata'],
  ['Bengaluru', 12.9716, 77.5946, 'Asia/Kolkata'], ['Mumbai', 19.076, 72.8777, 'Asia/Kolkata'],
  ['Delhi', 28.6139, 77.209, 'Asia/Kolkata'], ['Kolkata', 22.5726, 88.3639, 'Asia/Kolkata'],
  ['Hyderabad', 17.385, 78.4867, 'Asia/Kolkata'], ['Puducherry', 11.9416, 79.8083, 'Asia/Kolkata'],
  ['Colombo', 6.9271, 79.8612, 'Asia/Colombo'], ['Jaffna', 9.6615, 80.0255, 'Asia/Colombo'],
  ['Kuala Lumpur', 3.139, 101.6869, 'Asia/Kuala_Lumpur'], ['Singapore', 1.3521, 103.8198, 'Asia/Singapore'],
  ['Dubai', 25.2048, 55.2708, 'Asia/Dubai'], ['Doha', 25.2854, 51.531, 'Asia/Qatar'],
  ['Muscat', 23.588, 58.3829, 'Asia/Muscat'], ['London', 51.5074, -0.1278, 'Europe/London'],
  ['Paris', 48.8566, 2.3522, 'Europe/Paris'], ['Zurich', 47.3769, 8.5417, 'Europe/Zurich'],
  ['Toronto', 43.6532, -79.3832, 'America/Toronto'], ['New York', 40.7128, -74.006, 'America/New_York'],
  ['San Francisco', 37.7749, -122.4194, 'America/Los_Angeles'], ['Houston', 29.7604, -95.3698, 'America/Chicago'],
  ['Sydney', -33.8688, 151.2093, 'Australia/Sydney'], ['Melbourne', -37.8136, 144.9631, 'Australia/Melbourne'],
  ['Auckland', -36.8485, 174.7633, 'Pacific/Auckland'], ['Durban', -29.8587, 31.0218, 'Africa/Johannesburg'],
  ['Mauritius (Port Louis)', -20.1609, 57.5012, 'Indian/Mauritius'],
];
const T0 = Date.UTC(1940, 0, 1), T1 = Date.UTC(2060, 11, 31);
const randDate = () => new Date(T0 + rnd() * (T1 - T0));

// ------------------------------------------------------------------ stats helpers
const angDiffSec = (a, b) => (n360(a - b + 180) - 180) * 3600;
function stats(arr) {
  const v = arr.map(Math.abs).sort((x, y) => x - y);
  if (!v.length) return { n: 0 };
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  return { n: v.length, median: q(0.5), p95: q(0.95), max: v[v.length - 1], mean: v.reduce((s, x) => s + x, 0) / v.length };
}
const r2 = (x) => Math.round(x * 100) / 100;
/** Distance (arcsec) of a longitude to the nearest boundary of segments of width `span`. */
const boundaryDistSec = (lon, span) => { const r = lon % span; return Math.min(r, span - r) * 3600; };

const report = { meta: {}, positions: {}, classification: {}, disagreements: [], panchang: {}, sunrise: {}, rahu: {}, dasa: {}, sankranti: {}, spot: [] };
report.meta = {
  reference: `Swiss Ephemeris ${swe.version()} (sweph npm, SE data files sepl_18/semo_18), SE_SIDM_LAHIRI`,
  engine: 'shared/astro.js on astronomy-engine 2.1.19',
  samples: { positions: N_POS, days: N_DAYS, births: N_BIRTH }, range: '1940-01-01 … 2060-12-31', cities: CITIES.length, seed: arg('seed', 7),
  ran: new Date().toISOString(),
};

// ------------------------------------------------------------------ 1. positions + classification
const BODY_LIST = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu', 'Lagna'];
const diffs = Object.fromEntries(BODY_LIST.map((b) => [b, []]));
const trueNode = [];
const moonPast = [], moonFuture = [];
const ayaDiff = [];
const agree = Object.fromEntries(BODY_LIST.map((b) => [b, { rasi: 0, nak: 0, pada: 0, n: 0 }]));
for (let i = 0; i < N_POS; i++) {
  const d = randDate();
  const [city, lat, lon] = CITIES[i % CITIES.length];
  const app = planetPositions(d, lat, lon).planets;
  ayaDiff.push((planetPositions(d, null, null).ayanamsa - refAyanamsa(d)) * 3600);
  for (const b of BODY_LIST) {
    let ref;
    if (b === 'Ketu') ref = n360(refLon('Rahu', d) + 180);
    else if (b === 'Lagna') ref = refAsc(d, lat, lon);
    else ref = refLon(b, d);
    const a = app[b].longitude;
    const dsec = angDiffSec(a, ref);
    diffs[b].push(dsec);
    const g = agree[b]; g.n++;
    const rasiOk = Math.floor(a / 30) === Math.floor(ref / 30);
    const nakOk = Math.floor(a / NAK) === Math.floor(ref / NAK);
    const padaOk = Math.floor(a / (NAK / 4)) === Math.floor(ref / (NAK / 4));
    g.rasi += rasiOk; g.nak += nakOk; g.pada += padaOk;
    if (!rasiOk || !nakOk || !padaOk) {
      report.disagreements.push({ kind: `${b} ${!rasiOk ? 'rasi' : !nakOk ? 'nakshatra' : 'pada'}`, at: d.toISOString(), place: b === 'Lagna' ? city : '', app: r2(a), ref: r2(ref), deltaArcsec: r2(dsec), refDistToBoundaryArcsec: r2(boundaryDistSec(ref, NAK / 4)) });
    }
  }
  trueNode.push(angDiffSec(app.Rahu.longitude, refLon('TrueRahu', d)));
  (d.getTime() <= Date.UTC(2026, 0, 1) ? moonPast : moonFuture).push(diffs.Moon[diffs.Moon.length - 1]);
}
for (const b of BODY_LIST) {
  const s = stats(diffs[b]);
  report.positions[b] = { medianArcsec: r2(s.median), p95Arcsec: r2(s.p95), maxArcsec: r2(s.max) };
  const g = agree[b];
  report.classification[b] = { rasi: r2(100 * g.rasi / g.n), nakshatra: r2(100 * g.nak / g.n), pada: r2(100 * g.pada / g.n), n: g.n };
}
const ay = stats(ayaDiff);
report.positions.ayanamsa = { medianArcsec: r2(ay.median), p95Arcsec: r2(ay.p95), maxArcsec: r2(ay.max) };
const tn = stats(trueNode);
{
  const a = stats(moonPast), b = stats(moonFuture);
  report.positions.moonByEra = { upTo2025: { n: a.n, medianArcsec: r2(a.median), maxArcsec: r2(a.max) }, from2026: { n: b.n, medianArcsec: r2(b.median), maxArcsec: r2(b.max) }, note: 'Future dates differ mainly through the two libraries\' Delta-T (Earth rotation) extrapolations' };
}
report.positions.meanNodeVsTrueNode = { medianArcsec: r2(tn.median), maxArcsec: r2(tn.max), note: 'Expected: the app uses the MEAN node by convention; mean − true oscillates up to about ±1.7°' };

// ------------------------------------------------------------------ 2. sunrise / panchangam at sunrise / Rahu Kalam
const sun = { rise: [], set: [] };
const pc = { tithi: 0, nakshatra: 0, yoga: 0, karana: 0, weekday: 0, n: 0 };
const ends = { tithi: [], nakshatra: [], yoga: [], karana: [] };
const rahu = { start: [], end: [] };
const panDis = [];
for (let i = 0; i < N_DAYS; i++) {
  const [city, lat, lon, zone] = CITIES[i % CITIES.length];
  const d0 = randDate();
  // local noon of a random civil day
  const off = zoneOffsetMinutes(zone, d0) / 60;
  const l = new Date(d0.getTime() + off * 3600000);
  const noon = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate(), 12) - off * 3600000);
  const day = vedicDay(noon, lat, lon);
  if (day.polar) continue;
  const refRise = refRiseSet(new Date(noon.getTime() - 12 * 3600000), lat, lon, true);
  const refSet = refRiseSet(refRise, lat, lon, false);
  sun.rise.push((day.sunrise - refRise) / 1000);
  sun.set.push((day.sunset - refSet) / 1000);
  // Panchangam one minute after sunrise (the app's convention for the day's panchangam).
  const at = new Date(day.sunrise.getTime() + 60000);
  const refAt = new Date(refRise.getTime() + 60000);
  const p = panchang(at, lat, lon, zone);
  const sep = refSep(refAt), ys = refYoga(refAt), mo = refMoon(refAt);
  const ref = { tithi: Math.floor(sep / 12), karana: Math.floor(sep / 6), nakshatra: Math.floor(mo / NAK), yoga: Math.floor(ys / NAK) };
  const appIdx = { tithi: p.tithi.index, karana: p.karanaIndex, nakshatra: p.nakshatra.index, yoga: p.yoga.index };
  const refEnds = {
    tithi: refNextBoundary(refSep, 12, refAt), karana: refNextBoundary(refSep, 6, refAt),
    nakshatra: refNextBoundary(refMoon, NAK, refAt), yoga: refNextBoundary(refYoga, NAK, refAt),
  };
  const appEnds = { tithi: p.tithi.endsAt, karana: p.karanaEndsAt, nakshatra: p.nakshatra.endsAt, yoga: p.yoga.endsAt };
  pc.n++;
  for (const k of ['tithi', 'nakshatra', 'yoga', 'karana']) {
    if (appIdx[k] === ref[k]) {
      pc[k]++;
      ends[k].push((appEnds[k] - refEnds[k]) / 1000);
    } else {
      panDis.push({ kind: `${k} at sunrise`, place: city, sunriseUTC: refRise.toISOString(), app: appIdx[k], ref: ref[k], refBoundaryUTC: (refEnds[k] || '').toISOString?.() ?? '', boundaryMinutesFromSunrise: r2((Math.min(Math.abs(refEnds[k] - refAt), Infinity)) / 60000) });
    }
  }
  // Weekday at sunrise and Rahu Kalam from the reference sunrise/sunset.
  const RAHU_SEG = [8, 2, 7, 5, 6, 4, 3];
  const wd = new Date(refRise.getTime() + zoneOffsetMinutes(zone, refRise) * 60000).getUTCDay();
  pc.weekday += wd === p.weekday.index;
  const len = (refSet - refRise) / 8;
  const rs = refRise.getTime() + (RAHU_SEG[wd] - 1) * len;
  rahu.start.push((p.rahuKalam.start - rs) / 1000);
  rahu.end.push((p.rahuKalam.end - (rs + len)) / 1000);
}
const sec = (s) => ({ medianSec: r2(s.median), p95Sec: r2(s.p95), maxSec: r2(s.max) });
report.sunrise = { sunrise: sec(stats(sun.rise)), sunset: sec(stats(sun.set)), n: sun.rise.length, convention: 'Upper limb on the sea-level horizon with standard refraction (both sides)' };
report.panchang = {
  n: pc.n,
  agreementPercent: { tithi: r2(100 * pc.tithi / pc.n), nakshatra: r2(100 * pc.nakshatra / pc.n), yoga: r2(100 * pc.yoga / pc.n), karana: r2(100 * pc.karana / pc.n), weekday: r2(100 * pc.weekday / pc.n) },
  endTimeError: Object.fromEntries(Object.entries(ends).map(([k, v]) => [k, sec(stats(v))])),
  disagreements: panDis,
};
report.rahu = { start: sec(stats(rahu.start)), end: sec(stats(rahu.end)) };

// ------------------------------------------------------------------ 3. Vimshottari dasa start dates
const dasaErr = [];
const dasaErrPast = [];
const dasaLordAgree = { n: 0, ok: 0 };
for (let i = 0; i < N_BIRTH; i++) {
  const b = randDate();
  const app = vimshottari(b, planetPositions(b, null, null).planets.Moon.longitude);
  const mo = refMoon(b);
  const nak = Math.floor(mo / NAK);
  const lords = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const first = lords[nak % 9];
  const elapsed = (mo % NAK) / NAK;
  const Y = 365.25 * 86400000;
  let t = b.getTime() - elapsed * DASA_YEARS[first] * Y;
  dasaLordAgree.n++; dasaLordAgree.ok += app.periods[0].lord === first;
  for (let k = 0; k < 9; k++) {
    const lord = lords[(nak % 9 + k) % 9];
    if (app.periods[k].lord === lord) { dasaErr.push((app.periods[k].start - t) / 3600000); if (b.getTime() <= Date.UTC(2026, 0, 1)) dasaErrPast.push((app.periods[k].start - t) / 3600000); }
    t += DASA_YEARS[lord] * Y;
  }
}
const ds = stats(dasaErr);
const dsp = stats(dasaErrPast);
report.dasa = { births: N_BIRTH, firstLordAgreementPercent: r2(100 * dasaLordAgree.ok / dasaLordAgree.n), startErrorHours: { median: r2(ds.median), p95: r2(ds.p95), max: r2(ds.max) }, startErrorHoursBirthsTo2025: { median: r2(dsp.median), p95: r2(dsp.p95), max: r2(dsp.max) }, convention: '1 dasa year = 365.25 days on both sides; differences come only from the Moon position at birth' };
void DASA_ORDER;

// ------------------------------------------------------------------ 4. Sankranti (Tamil month start) times and day-1 dates in Chennai
const sank = [];
const day1Dis = [];
const CHN = { lat: 13.0827, lon: 80.2707, tz: 5.5 };
const ymd = (d, tz) => new Date(d.getTime() + tz * 3600000).toISOString().slice(0, 10);
for (let y = 1940; y <= 2060; y += 4) {
  for (let r = 0; r < 12; r++) {
    // Search from about two weeks before the approximate ingress (sidereal Mesha ≈ 14 Apr).
    const approx = new Date(Date.UTC(y, 3, 14) + r * 30.44 * 86400000 - 15 * 86400000);
    const appT = findCrossing(sunSidereal, r * 30, approx, 40 * 24);
    const refT = refCrossing((d) => refLon('Sun', d), r * 30, approx, 40 * 24);
    if (!appT || !refT) continue;
    sank.push((appT - refT) / 1000);
    // Reference day 1: the civil day of the sankranti if it is before that day's sunset, else the next day.
    const l = new Date(refT.getTime() + CHN.tz * 3600000);
    const noon = new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate(), 12) - CHN.tz * 3600000);
    const setRef = refRiseSet(new Date(noon.getTime() - 6 * 3600000), CHN.lat, CHN.lon, false);
    let refDay1 = ymd(refT, CHN.tz);
    if (refT > setRef) refDay1 = ymd(new Date(noon.getTime() + 86400000), CHN.tz);
    // App: first civil day whose Tamil date is day 1 of month r.
    let appDay1 = null;
    for (let k = -2; k <= 2; k++) {
      const n2 = new Date(noon.getTime() + k * 86400000);
      const dd = vedicDay(n2, CHN.lat, CHN.lon);
      const td = tamilDate(new Date(dd.sunset.getTime() - 60000), CHN.lat, CHN.lon, CHN.tz);
      if (td.month === r && td.day === 1) { appDay1 = ymd(n2, CHN.tz); break; }
    }
    if (appDay1 !== refDay1) day1Dis.push({ rasi: r, sankrantiUTC: refT.toISOString(), refSunsetUTC: setRef.toISOString(), app: appDay1, ref: refDay1, minutesFromSunset: r2((refT - setRef) / 60000) });
  }
}
const ss = stats(sank);
report.sankranti = { n: sank.length, timeErrorSec: sec(ss), tamilDay1Agreement: r2(100 * (sank.length - day1Dis.length) / sank.length), day1Disagreements: day1Dis };

// ------------------------------------------------------------------ 5. Spot checks against published almanac facts
const ist = (s) => new Date(`${s}+05:30`);
function spot(name, expected, actual, ok) { report.spot.push({ name, expected, actual, ok }); }
// Published sankranti times (e.g. Drik Panchang) use a slightly different Lahiri variant: Swiss SE_SIDM_LAHIRI_VP285
// reproduces them to ~1 minute, while the ICRC Lahiri used by the app (and by Swiss SE_SIDM_LAHIRI) is ~10 minutes
// earlier. We therefore check the DATE outcome exactly and the time to within 15 minutes, and report the variant time.
function vp285Sankranti(target, from) {
  swe.set_sid_mode(C.SE_SIDM_LAHIRI_VP285, 0, 0);
  const t = refCrossing((d) => refLon('Sun', d), target, from, 30 * 24);
  swe.set_sid_mode(C.SE_SIDM_LAHIRI, 0, 0);
  return `${new Date(t.getTime() + 5.5 * 3600000).toISOString().slice(11, 16)} IST`;
}
{
  const t = findCrossing(sunSidereal, 0, new Date('2024-04-01T00:00:00Z'), 30 * 24);
  const td = tamilDate(new Date(vedicDay(new Date('2024-04-14T06:30:00Z'), CHN.lat, CHN.lon).sunset.getTime() - 60000), CHN.lat, CHN.lon, 5.5);
  spot('Mesha Sankranti 2024 at about 21:15 IST on 13 Apr (after sunset) → Tamil New Year (Chithirai 1, Krodhi) on 14 Apr 2024',
    '13 Apr 2024 ~21:15 IST; 14 Apr = Chithirai 1', `${new Date(t.getTime() + 5.5 * 3600000).toISOString().slice(0, 16)} IST (Lahiri-VP285 variant: ${vp285Sankranti(0, new Date('2024-04-01T00:00:00Z'))}); 14 Apr = ${td.monthEn} ${td.day}, ${td.year.en}`,
    Math.abs(t - ist('2024-04-13T21:15:00')) < 15 * 60000 && td.month === 0 && td.day === 1 && td.year.en === 'Krodhi');
}
{
  const t = findCrossing(sunSidereal, 270, new Date('2024-01-01T00:00:00Z'), 30 * 24);
  const td = tamilDate(new Date(vedicDay(new Date('2024-01-15T06:30:00Z'), CHN.lat, CHN.lon).sunset.getTime() - 60000), CHN.lat, CHN.lon, 5.5);
  spot('Makara Sankranti 2024 at about 02:54 IST on 15 Jan → Thai Pongal (Thai 1) on 15 Jan 2024',
    '15 Jan 2024 ~02:54 IST; Thai 1', `${new Date(t.getTime() + 5.5 * 3600000).toISOString().slice(0, 16)} IST (Lahiri-VP285 variant: ${vp285Sankranti(270, new Date('2024-01-01T00:00:00Z'))}); ${td.monthEn} ${td.day}`,
    Math.abs(t - ist('2024-01-15T02:54:00')) < 15 * 60000 && td.month === 9 && td.day === 1);
}
{
  const p = panchang(new Date('2024-04-08T17:00:00Z'), 13.0827, 80.2707, 5.5);
  spot('New moon of the total solar eclipse, 8 Apr 2024 18:21 UTC (NASA) = end of Amavasai',
    '2024-04-08 18:21 UTC', p.tithi.endsAt.toISOString().slice(0, 16), p.tithi.index === 29 && Math.abs(p.tithi.endsAt - new Date('2024-04-08T18:21:00Z')) < 5 * 60000);
}
{
  const p = panchang(new Date('2024-10-31T06:00:00Z'), 13.0827, 80.2707, 5.5);
  spot('Deepavali 2024: Chathurdasi ends / Amavasai begins 31 Oct 2024 ≈ 15:52 IST',
    '31 Oct 2024 15:52 IST', `${new Date(p.tithi.endsAt.getTime() + 5.5 * 3600000).toISOString().slice(0, 16)} IST`,
    p.tithi.index === 28 && Math.abs(p.tithi.endsAt - ist('2024-10-31T15:52:00')) < 5 * 60000);
}
{
  const t = findCrossing(sunSidereal, 270, new Date('2025-01-01T00:00:00Z'), 30 * 24);
  spot('Makara Sankranti 2025 ≈ 09:03 IST on 14 Jan → Thai Pongal 14 Jan 2025',
    '14 Jan 2025 ~09:03 IST', `${new Date(t.getTime() + 5.5 * 3600000).toISOString().slice(0, 16)} IST (Lahiri-VP285 variant: ${vp285Sankranti(270, new Date('2025-01-01T00:00:00Z'))})`, Math.abs(t - ist('2025-01-14T09:03:00')) < 15 * 60000);
}
{
  const p = panchang(new Date('2000-01-01T12:00:00Z'), 13.0827, 80.2707, 5.5);
  spot('Lahiri ayanamsa at J2000.0 = 23°51′11″ (Indian Astronomical Ephemeris, mean)', '23.8531°', `${p.ayanamsa.toFixed(4)}° (true, incl. nutation)`, Math.abs(p.ayanamsa - 23.8531) < 0.01);
}
report.meta.moshierFallbacks = usedMoshier;

writeFileSync(join(HERE, 'results.json'), JSON.stringify(report, null, 2));

// ------------------------------------------------------------------ markdown summary
const md = [];
md.push(`# Benchmark results\n\n${report.meta.reference} vs ${report.meta.engine}. Samples: ${N_POS} instants, ${pc.n} sunrise-days, ${N_BIRTH} births, ${sank.length} sankrantis, ${CITIES.length} cities, ${report.meta.range}.\n`);
md.push('## Sidereal longitudes (arc-seconds)\n\n| Body | Median | 95th pct | Max | Rasi agree % | Nakshatra agree % | Pada agree % |\n|---|---|---|---|---|---|---|');
for (const b of BODY_LIST) md.push(`| ${b} | ${report.positions[b].medianArcsec} | ${report.positions[b].p95Arcsec} | ${report.positions[b].maxArcsec} | ${report.classification[b].rasi} | ${report.classification[b].nakshatra} | ${report.classification[b].pada} |`);
md.push(`| Ayanamsa | ${report.positions.ayanamsa.medianArcsec} | ${report.positions.ayanamsa.p95Arcsec} | ${report.positions.ayanamsa.maxArcsec} | | | |`);
md.push(`\nMoon by era: births/instants up to 2025 median ${report.positions.moonByEra.upTo2025.medianArcsec}″, max ${report.positions.moonByEra.upTo2025.maxArcsec}″; 2026–2060 median ${report.positions.moonByEra.from2026.medianArcsec}″, max ${report.positions.moonByEra.from2026.maxArcsec}″ (Delta-T extrapolation).\n`);
md.push(`\nMean node vs Swiss TRUE node (convention difference, not an error): median ${r2(tn.median / 3600)}°, max ${r2(tn.max / 3600)}°.\n`);
md.push('## Sunrise, sunset, Rahu Kalam (seconds)\n\n| Item | Median | 95th pct | Max |\n|---|---|---|---|');
for (const [k, v] of [['Sunrise', report.sunrise.sunrise], ['Sunset', report.sunrise.sunset], ['Rahu Kalam start', report.rahu.start], ['Rahu Kalam end', report.rahu.end]]) md.push(`| ${k} | ${v.medianSec} | ${v.p95Sec} | ${v.maxSec} |`);
md.push('\n## Panchangam at sunrise\n\n| Element | Agreement % | End-time median (s) | 95th pct (s) | Max (s) |\n|---|---|---|---|---|');
for (const k of ['tithi', 'nakshatra', 'yoga', 'karana']) md.push(`| ${k} | ${report.panchang.agreementPercent[k]} | ${report.panchang.endTimeError[k].medianSec} | ${report.panchang.endTimeError[k].p95Sec} | ${report.panchang.endTimeError[k].maxSec} |`);
md.push(`| weekday | ${report.panchang.agreementPercent.weekday} | | | |`);
md.push(`\n## Vimshottari dasa\n\nFirst dasa lord agreement ${report.dasa.firstLordAgreementPercent} %; maha-dasa start dates: median ${report.dasa.startErrorHours.median} h, 95th pct ${report.dasa.startErrorHours.p95} h, max ${report.dasa.startErrorHours.max} h (births up to 2025 only: median ${report.dasa.startErrorHoursBirthsTo2025.median} h, max ${report.dasa.startErrorHoursBirthsTo2025.max} h).\n`);
md.push(`## Sankranti (Tamil month start)\n\nTime error: median ${report.sankranti.timeErrorSec.medianSec} s, max ${report.sankranti.timeErrorSec.maxSec} s over ${sank.length} ingresses. Tamil day-1 date (Chennai, sunset rule) agreement: ${report.sankranti.tamilDay1Agreement} %.\n`);
md.push('## Boundary disagreements (every one)\n');
const allDis = [...report.disagreements.map((x) => `- ${x.kind} at ${x.at}${x.place ? ` (${x.place})` : ''}: app ${x.app}°, ref ${x.ref}°, Δ ${x.deltaArcsec}″; reference is ${x.refDistToBoundaryArcsec}″ from the pada boundary`),
  ...panDis.map((x) => `- ${x.kind}, ${x.place}, sunrise ${x.sunriseUTC}: app ${x.app}, ref ${x.ref}; the reference boundary is ${x.boundaryMinutesFromSunrise} min after sunrise+1 min`),
  ...day1Dis.map((x) => `- Tamil month ${x.rasi} day 1: app ${x.app}, ref ${x.ref}; sankranti ${x.minutesFromSunset} min from sunset`)];
md.push(allDis.length ? allDis.join('\n') : '- none');
md.push('\n## Spot checks\n\n| Check | Expected | Engine | OK |\n|---|---|---|---|');
for (const s of report.spot) md.push(`| ${s.name} | ${s.expected} | ${s.actual} | ${s.ok ? 'yes' : '**NO**'} |`);
md.push(`\nMoshier fallbacks (should be 0): ${usedMoshier}\n`);
writeFileSync(join(HERE, 'results.md'), md.join('\n'));
console.log(md.join('\n'));
