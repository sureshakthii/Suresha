// Tamil family traditions: Natchathira birthday, Thivasam (annual tithi for ancestors),
// baby-name first letters from the birth star, and a family Muhurtham finder.
import { panchang, vedicDay, moonSidereal, sunSidereal, findCrossing, NAKSHATRAS, RASIS } from './astro.js';
import { scoreSnapshot, getCategory, BAD_YOGAS } from './prasna.js';
import { tamilDate, TAMIL_MONTHS } from './tamilcal.js';

const DAY = 86400000;
const NAK_SPAN = 360 / 27;

/** Local noon (as a UTC instant) for the local calendar day that contains `d`. */
function localNoon(d, tz) {
  const l = new Date(d.getTime() + tz * 3600000);
  return new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate(), 12) - tz * 3600000);
}
const isoLocal = (d, tz) => new Date(d.getTime() + tz * 3600000).toISOString().slice(0, 10);

/**
 * Natchathira Pirantha Naal: the day in the person's Tamil birth month when their birth star
 * rules at sunrise. Returns the next occurrences (up to `count`) from `from`.
 */
export function natchathiraBirthdays({ birthStar, birthTamilMonth, from = new Date(), loc, count = 2 }) {
  const out = [];
  let d = localNoon(from, loc.tz);
  for (let i = 0; i < 800 && out.length < count; i++, d = new Date(d.getTime() + DAY)) {
    const day = vedicDay(d, loc.lat, loc.lon);
    const sunriseStar = Math.floor(moonSidereal(new Date(day.sunrise.getTime() + 60000)) / NAK_SPAN);
    if (sunriseStar !== birthStar) continue;
    const month = Math.floor(sunSidereal(day.sunset) / 30);
    if (month !== birthTamilMonth) continue;
    const td = tamilDate(new Date(day.sunset.getTime() - 60000), loc.lat, loc.lon, loc.tz);
    out.push({ date: isoLocal(d, loc.tz), tamil: td, star: NAKSHATRAS[birthStar] });
    d = new Date(d.getTime() + 20 * DAY); // skip the rest of this month
  }
  return out;
}

/**
 * Thivasam / Sraddham: an ancestor's annual rite falls in the Tamil month of passing, on the day
 * the same tithi prevails in the afternoon (aparahna). `death` is the instant of passing.
 */
export function thivasamDates({ death, loc, from = new Date(), count = 2 }) {
  const dp = panchang(death, loc.lat, loc.lon, loc.tz, { withEnds: false });
  const tithi = dp.tithi.index;
  const month = tamilDate(death, loc.lat, loc.lon, loc.tz).month;
  const out = [];
  let d = localNoon(from, loc.tz);
  for (let i = 0; i < 800 && out.length < count; i++, d = new Date(d.getTime() + DAY)) {
    const day = vedicDay(d, loc.lat, loc.lon);
    const m = Math.floor(sunSidereal(day.sunset) / 30);
    if (m !== month) continue;
    // Aparahna: the 4th fifth of daytime.
    const aparahna = new Date(day.sunrise.getTime() + (day.sunset - day.sunrise) * 0.7);
    const p = panchang(aparahna, loc.lat, loc.lon, loc.tz, { withEnds: false });
    if (p.tithi.index !== tithi) continue;
    out.push({ date: isoLocal(d, loc.tz), tamil: tamilDate(new Date(day.sunset.getTime() - 60000), loc.lat, loc.lon, loc.tz), weekday: p.weekday });
    d = new Date(d.getTime() + 20 * DAY);
  }
  return {
    tithi: { index: tithi, name: dp.tithi.name, ta: dp.tithi.ta, paksha: dp.tithi.paksha },
    month: TAMIL_MONTHS[month],
    dates: out,
  };
}

// Namakshara: first sounds for a baby's name by birth star pada (Avakahada chakra).
const SYLLABLES = [
  [['Chu', 'சு'], ['Che', 'சே'], ['Cho', 'சோ'], ['La', 'ல']],
  [['Li', 'லி'], ['Lu', 'லு'], ['Le', 'லே'], ['Lo', 'லோ']],
  [['A', 'அ'], ['I', 'இ'], ['U', 'உ'], ['E', 'ஏ']],
  [['O', 'ஓ'], ['Va', 'வ'], ['Vi', 'வி'], ['Vu', 'வு']],
  [['Ve', 'வே'], ['Vo', 'வோ'], ['Ka', 'க'], ['Ki', 'கி']],
  [['Ku', 'கு'], ['Gha', 'க'], ['Nga', 'ங'], ['Chha', 'ச']],
  [['Ke', 'கே'], ['Ko', 'கோ'], ['Ha', 'ஹ'], ['Hi', 'ஹி']],
  [['Hu', 'ஹு'], ['He', 'ஹே'], ['Ho', 'ஹோ'], ['Da', 'ட']],
  [['Di', 'டி'], ['Du', 'டு'], ['De', 'டே'], ['Do', 'டோ']],
  [['Ma', 'ம'], ['Mi', 'மி'], ['Mu', 'மு'], ['Me', 'மே']],
  [['Mo', 'மோ'], ['Ta', 'ட'], ['Ti', 'டி'], ['Tu', 'டு']],
  [['Te', 'டே'], ['To', 'டோ'], ['Pa', 'ப'], ['Pi', 'பி']],
  [['Pu', 'பு'], ['Sha', 'ஷ'], ['Na', 'ண'], ['Tha', 'ட']],
  [['Pe', 'பே'], ['Po', 'போ'], ['Ra', 'ர'], ['Ri', 'ரி']],
  [['Ru', 'ரு'], ['Re', 'ரே'], ['Ro', 'ரோ'], ['Ta', 'த']],
  [['Ti', 'தி'], ['Tu', 'து'], ['Te', 'தே'], ['To', 'தோ']],
  [['Na', 'ந'], ['Ni', 'நி'], ['Nu', 'நு'], ['Ne', 'நே']],
  [['No', 'நோ'], ['Ya', 'ய'], ['Yi', 'யி'], ['Yu', 'யு']],
  [['Ye', 'யே'], ['Yo', 'யோ'], ['Bha', 'ப'], ['Bhi', 'பி']],
  [['Bhu', 'பு'], ['Dha', 'த'], ['Pha', 'ப'], ['Dha', 'ட']],
  [['Be', 'பே'], ['Bo', 'போ'], ['Ja', 'ஜ'], ['Ji', 'ஜி']],
  [['Khi', 'கி'], ['Khu', 'கு'], ['Khe', 'கே'], ['Kho', 'கோ']],
  [['Ga', 'க'], ['Gi', 'கி'], ['Gu', 'கு'], ['Ge', 'கே']],
  [['Go', 'கோ'], ['Sa', 'ஸ'], ['Si', 'ஸி'], ['Su', 'ஸு']],
  [['Se', 'ஸே'], ['So', 'ஸோ'], ['Da', 'த'], ['Di', 'தி']],
  [['Du', 'து'], ['Tha', 'த'], ['Jha', 'ஜ'], ['Na', 'ஞ']],
  [['De', 'தே'], ['Do', 'தோ'], ['Cha', 'ச'], ['Chi', 'சி']],
];

/** First letters for a name from birth star and pada (1-4). */
export function nameLetters(star, pada) {
  const all = SYLLABLES[star].map(([en, ta], i) => ({ pada: i + 1, en, ta }));
  return { star: NAKSHATRAS[star], pada, primary: all[pada - 1], all };
}

/** Hard rules for auspicious events: these slots are never offered, whatever the score. */
export function eventAllowed(snap, cat) {
  if (typeof cat === 'string') cat = getCategory(cat);
  if (snap.inRahuKalam || snap.inYamagandam) return false;
  if (cat.lenient) return true; // time-bound rites (e.g. the first bath after Ruthu) cannot wait for a perfect day
  if (cat.avoidGuligai && snap.inGuligai) return false;
  if (cat.badDays.includes(snap.weekday.index)) return false;
  if (cat.badNak.includes(NAKSHATRAS[snap.nakshatra.index].nature)) return false;
  if (cat.goodStars && !cat.goodStars.includes(snap.nakshatra.index)) return false;
  const t = snap.tithi.index, pt = t % 15;
  if (t === 29 || [3, 7, 8, 13].includes(pt)) return false; // Amavasai, Chathurthi, Ashtami, Navami, Chathurdasi
  if (cat.avoidKrishnaPrathamai && t === 15) return false; // Theipirai Prathamai
  if (cat.avoidBadYoga && BAD_YOGAS.has(snap.yoga.index)) return false; // Vyatipata, Vaidhriti, Vishkambha…
  if (cat.avoidMonths?.includes(snap.planets.Sun.rasi)) return false; // e.g. Aadi, Purattasi, Margazhi
  if (cat.badHora.includes(snap.currentHora.lord)) return false;
  return true;
}

/**
 * Family Muhurtham finder. Scans `days` ahead in `stepMin` steps during the chosen hours and ranks windows
 * for an event, requiring every listed person to have good Tara Bala and no Chandrashtamam.
 * persons: [{ name, janmaNakshatra, janmaRasi }]
 */
export function findMuhurtham({ category, loc, persons = [], from = new Date(), days = 30, stepMin = 30, dayOnly = true, top = 8 }) {
  const cat = typeof category === 'string' ? getCategory(category) : category;
  const results = [];
  const end = from.getTime() + days * DAY;
  for (let t = from.getTime(); t < end; t += stepMin * 60000) {
    const at = new Date(t);
    const snap = panchang(at, loc.lat, loc.lon, loc.tz, { withEnds: false });
    if (dayOnly && (at < snap.sunrise || at >= snap.sunset)) continue;
    if (cat.event && !eventAllowed(snap, cat)) continue;
    const base = scoreSnapshot(snap, cat, null);
    let score = base.score;
    const personNotes = [];
    let blocked = false;
    for (const p of persons) {
      const tara = ((snap.nakshatra.index - p.janmaNakshatra + 27) % 27) % 9;
      const pos = ((snap.moonRasi.index - p.janmaRasi + 12) % 12) + 1;
      if (pos === 8) { blocked = true; personNotes.push({ name: p.name, en: 'Chandrashtamam', ta: 'சந்திராஷ்டமம்' }); }
      if ([2, 4, 6].includes(tara) && cat.strictTara) { blocked = true; break; } // Vipat / Pratyak / Naidhana Tara
      if ([2, 4, 6].includes(tara)) { score -= 10; personNotes.push({ name: p.name, en: 'Weak Tara', ta: 'தாரை பலம் இல்லை' }); }
      else if (tara !== 0) score += 4;
      if ([1, 3, 6, 7, 10, 11].includes(pos)) score += 3;
    }
    if (blocked) continue;
    score = Math.max(0, Math.min(100, score));
    if (score < (cat.lenient ? 40 : 60)) continue;
    results.push({ at, score, snap, factors: base.factors, personNotes, limit: blockedFrom(snap, cat, at, dayOnly) });
  }
  // Merge consecutive slots into windows; keep the best window per day.
  const windows = [];
  for (const r of results) {
    const last = windows[windows.length - 1];
    if (last && r.at - last.end <= stepMin * 60000) { last.end = r.at; last.limit = r.limit; if (r.score > last.score) Object.assign(last, { score: r.score, peak: r }); }
    else windows.push({ start: r.at, end: r.at, score: r.score, peak: r, limit: r.limit });
  }
  const byDay = new Map();
  for (const w of windows) {
    // Stop the window before a Rahu Kalam / Yamagandam (/ Kuligai) or sunset that begins inside the last step.
    w.end = new Date(Math.min(w.end.getTime() + stepMin * 60000, w.limit ?? Infinity));
    const key = isoLocal(w.start, loc.tz);
    if (!byDay.has(key) || byDay.get(key).score < w.score) byDay.set(key, w);
  }
  return [...byDay.values()]
    .sort((a, b) => b.score - a.score || a.start - b.start)
    .slice(0, top)
    .map((w) => ({
      date: isoLocal(w.start, loc.tz), start: w.start, end: w.end, score: w.score,
      nakshatra: w.peak.snap.nakshatra, tithi: w.peak.snap.tithi, weekday: w.peak.snap.weekday,
      lagna: w.peak.snap.lagna && { rasi: w.peak.snap.lagna.rasi, name: RASIS[w.peak.snap.lagna.rasi] },
      hora: w.peak.snap.currentHora.lord, factors: w.peak.factors, personNotes: w.peak.personNotes,
      reasons: muhurthamReasons(w.peak, cat, persons.length),
    }));
}

/** Earliest start (ms) of a period the event must not overlap, after `at`: Rahu Kalam, Yamagandam, Kuligai, sunset. */
function blockedFrom(snap, cat, at, dayOnly) {
  const starts = [snap.rahuKalam?.start, snap.yamagandam?.start, cat.avoidGuligai ? snap.guligai?.start : null, dayOnly ? snap.sunset : null]
    .filter((d) => d && d > at).map((d) => d.getTime());
  return starts.length ? Math.min(...starts) : Infinity;
}

/** Short bilingual "why" list for a chosen window: the favourable factors plus personal checks. */
function muhurthamReasons(peak, cat, nPersons) {
  const out = peak.factors.filter((f) => f.points > 0).sort((a, b) => b.points - a.points).slice(0, 4).map((f) => ({ en: f.label, ta: f.labelTa }));
  if (cat.event) out.push({ en: 'Free of Rahu Kalam and Yamagandam', ta: 'ராகு காலம், எமகண்டம் இல்லை' });
  if (cat.avoidGuligai) out.push({ en: 'Free of Kuligai', ta: 'குளிகை இல்லை' });
  if (cat.id === 'vehicle' && peak.snap.currentHora.lord === 'Venus') out.push({ en: 'Venus is the karaka of vehicles', ta: 'சுக்கிரன் வாகனக் காரகர்' });
  if (nPersons) {
    const weak = peak.personNotes.length;
    out.push(weak
      ? { en: 'Some members have a weak Tara — pray before starting', ta: 'சிலருக்கு தாரை பலம் குறைவு — வழிபட்டுத் தொடங்கவும்' }
      : { en: 'No Chandrashtamam and good Tara for everyone selected', ta: 'தேர்ந்தெடுத்த அனைவருக்கும் சந்திராஷ்டமம் இல்லை, தாரை பலம் உண்டு' });
  }
  return out;
}

/**
 * Milestone celebrations: Shashtiabdapoorthi (60 years complete), Bheemaratha Shanti (70) and
 * Sathabhishekam (after 1000 full moons, about 80 years 8 months). Each is held on the birth star
 * day of the Tamil birth month — we return that date plus the exact 1000th full moon for Sathabhishekam.
 */
export function milestones(chart, loc, from = new Date()) {
  const birth = chart.utc;
  const star = chart.janmaNakshatra.index;
  const month = chart.planets.Sun.rasi;
  const sep = (d) => (moonSidereal(d) - sunSidereal(d) + 360) % 360;
  const yearsAfter = (y) => new Date(birth.getTime() + y * 365.2425 * DAY);
  const starDay = (after) => natchathiraBirthdays({ birthStar: star, birthTamilMonth: month, loc, from: new Date(after.getTime() - 20 * DAY), count: 1 })[0] || null;
  const out = [];
  const add = (id, en, ta, years, anchor, extra = {}) => {
    const day = starDay(anchor);
    out.push({ id, name: { en, ta }, years, anchor, day, past: day ? Date.parse(day.date) < from.getTime() - DAY : anchor < from, ...extra });
  };
  add('shashti', 'Shashtiabdapoorthi (60th)', 'சஷ்டியப்தபூர்த்தி (60-ம் ஆண்டு)', 60, yearsAfter(60));
  add('bheemaratha', 'Bheemaratha Shanti (70th)', 'பீமரத சாந்தி (70-ம் ஆண்டு)', 70, yearsAfter(70));
  // 1000th full moon after birth.
  const approx = new Date(birth.getTime() + 999.5 * 29.530588 * DAY);
  const fullMoon = findCrossing(sep, 180, new Date(approx.getTime() - 20 * DAY), 40 * 24);
  add('sathabhishekam', 'Sathabhishekam (1000 full moons)', 'சதாபிஷேகம் (1000 பௌர்ணமி)', 80, fullMoon || yearsAfter(80.7), { thousandthFullMoon: fullMoon });
  return out;
}
