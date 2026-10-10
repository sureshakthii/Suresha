// Tamil family traditions: Natchathira birthday, Thivasam (annual tithi for ancestors),
// baby-name first letters from the birth star, and a family Muhurtham finder.
import { panchang, vedicDay, moonSidereal, sunSidereal, sunMoonSeparation, findCrossing, findBoundaries, offsetHoursAt, weekdayOf, NAKSHATRAS, RASIS, WEEKDAYS } from './astro.js';
import { scoreSnapshot, getCategory, BAD_YOGAS, DEADLINE_FIRST_NOTE } from './prasna.js';
import { tamilDate, TAMIL_MONTHS } from './tamilcal.js';

const DAY = 86400000;
const NAK_SPAN = 360 / 27;

/** Local noon (as a UTC instant) for the local calendar day that contains `d`. */
function localNoon(d, tz) {
  const l = new Date(d.getTime() + tz * 3600000);
  return new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate(), 12) - tz * 3600000);
}
const isoLocal = (d, tz) => new Date(d.getTime() + tz * 3600000).toISOString().slice(0, 10);

// ---------------------------------------------------------------- Natchathira Pirantha Naal (star birthday)
// Rule (documented in docs/ACCURACY-REPORT.md §5, tested in test/starbday.test.js):
//  1. Month: the person's Tamil (solar) birth month, i.e. the Tamil calendar month of the birth date. A Tamil month
//     begins on the civil day of the Sun's sidereal (Lahiri) ingress if the ingress is before that day's sunset,
//     otherwise on the next day (same rule as shared/tamilcal.js tamilDate).
//  2. Day: the civil day at whose SUNRISE (residence place) the Moon is in the janma nakshatra ("udaya
//     nakshatram", as printed in Tamil panchangams). If one passage of the star covers two sunrises, the first
//     day (the star rules that whole day). If a passage touches no sunrise at all (a short nakshatra that starts
//     after one sunrise and ends before the next), the day on whose daytime it prevails longest.
//  3. If the star falls twice in the birth month, the SECOND occurrence is taken by default (option
//     `twice: 'first'` for families that follow the first).
//  4. When the star is present at sunrise for less than one nazhigai (24 minutes), the date still follows rule 2,
//     but a note names the previous day as the alternative some families use.
export const NAZHIGAI_MS = 24 * 60000;
export const STAR_BIRTHDAY_RULE = Object.freeze({
  twiceDefault: 'second',
  en: 'Your birth star at sunrise, in your Tamil birth month, at the place you live. If the star comes twice in that month, the second day.',
  ta: 'நீங்கள் வசிக்கும் ஊரில், பிறந்த தமிழ் மாதத்தில், சூரிய உதயத்தில் ஜென்ம நட்சத்திரம் உள்ள நாள். அந்த மாதத்தில் நட்சத்திரம் இரண்டு முறை வந்தால் இரண்டாவது நாள்.',
});

const offH = (loc, at) => offsetHoursAt(loc.zone || loc.tz, at);
const isoAt = (at, loc) => new Date(at.getTime() + offH(loc, at) * 3600000).toISOString().slice(0, 10);
/** Local noon (UTC instant) of the civil date `iso` at `loc`. */
function noonOf(iso, loc) {
  const [y, m, d] = iso.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, 12);
  return new Date(guess - offH(loc, new Date(guess)) * 3600000);
}
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const dayOf = (iso, loc) => vedicDay(noonOf(iso, loc), loc.lat, loc.lon);

/** First civil date of the Tamil month that the given Sankranti (Sun's ingress instant) starts, at `loc`. */
function monthDay1(sankranti, loc) {
  const iso = isoAt(sankranti, loc);
  return sankranti >= dayOf(iso, loc).sunset ? addDays(iso, 1) : iso;
}

/**
 * Span of the Tamil month `month` (0 = Chithirai) whose Sankranti is the first one after `after`.
 * Returns { month, sankranti, first: 'YYYY-MM-DD', last: 'YYYY-MM-DD' } at the place `loc`.
 */
export function tamilMonthSpan(month, after, loc) {
  const sankranti = findCrossing(sunSidereal, month * 30, after, 380 * 24, 12 * 3600000);
  const next = findCrossing(sunSidereal, ((month + 1) % 12) * 30, new Date(sankranti.getTime() + 25 * DAY), 10 * 24, 6 * 3600000);
  return { month, sankranti, first: monthDay1(sankranti, loc), last: addDays(monthDay1(next, loc), -1) };
}

/** The Moon's passages through nakshatra `star` between two instants: [{ start, end }]. */
function starPassages(star, from, to) {
  const b = findBoundaries(moonSidereal, NAK_SPAN, from, to);
  const out = [];
  for (const e of b) {
    if (e.to === star) out.push({ start: e.at, end: null });
    else if (e.from === star && out.length && !out[out.length - 1].end) out[out.length - 1].end = e.at;
  }
  return out.filter((p) => p.end);
}

/** Which civil day a passage of the star is observed on (rules 2 and 4 above). */
function observedDay(p, loc) {
  const firstIso = addDays(isoAt(p.start, loc), -1);
  const days = [0, 1, 2, 3].map((k) => { const iso = addDays(firstIso, k); return { iso, day: dayOf(iso, loc) }; });
  const atSunrise = days.filter(({ day }) => day.sunrise >= p.start && day.sunrise < p.end);
  if (atSunrise.length) {
    const { iso, day } = atSunrise[0];
    const minutes = (p.end - day.sunrise) / 60000;
    const short = atSunrise.length === 1 && p.end - day.sunrise < NAZHIGAI_MS;
    return {
      date: iso, basis: 'sunrise', sunrise: day.sunrise, minutesAfterSunrise: Math.round(minutes),
      alternative: short ? addDays(iso, -1) : null,
      note: short ? {
        en: `The star is present only ${Math.round(minutes)} min after sunrise on this day; some families observe the previous day (${addDays(iso, -1)}), when it prevails through most of the daytime.`,
        ta: `இந்நாளில் சூரிய உதயத்திற்குப் பின் ${Math.round(minutes)} நிமிடமே நட்சத்திரம் உள்ளது; சில குடும்பங்கள் முந்தைய நாளை (${addDays(iso, -1)}) கொள்வர் — அன்று பகலின் பெரும்பகுதி இந்த நட்சத்திரம்.`,
      } : null,
    };
  }
  // The star touches no sunrise: the day whose daytime it covers longest.
  const overlap = ({ day }) => Math.max(0, Math.min(p.end, day.sunset) - Math.max(p.start, day.sunrise));
  const best = days.reduce((a, b) => (overlap(b) > overlap(a) ? b : a));
  return {
    date: best.iso, basis: 'daytime', sunrise: best.day.sunrise, minutesAfterSunrise: 0, alternative: null,
    note: {
      en: 'This time the star does not touch any sunrise (it starts after one sunrise and ends before the next); the day on which it prevails longest in the daytime is taken.',
      ta: 'இம்முறை நட்சத்திரம் எந்தச் சூரிய உதயத்தையும் தொடவில்லை (ஓர் உதயத்திற்குப் பின் தொடங்கி அடுத்த உதயத்திற்கு முன் முடிகிறது); பகலில் அதிக நேரம் உள்ள நாள் கொள்ளப்பட்டது.',
    },
  };
}

/**
 * The star birthday inside one Tamil month span (see tamilMonthSpan). Returns null only if the star never falls
 * in the month (impossible for real months, which are longer than the 27.3-day sidereal month).
 */
export function starDayInMonth(birthStar, span, loc, { twice = STAR_BIRTHDAY_RULE.twiceDefault } = {}) {
  const from = new Date(noonOf(span.first, loc).getTime() - 3 * DAY);
  const to = new Date(noonOf(span.last, loc).getTime() + 3 * DAY);
  const days = starPassages(birthStar, from, to)
    .map((p) => ({ ...observedDay(p, loc), starStart: p.start, starEnd: p.end }))
    .filter((x) => x.date >= span.first && x.date <= span.last);
  if (!days.length) return null;
  const pick = days.length > 1 && twice !== 'first' ? days[days.length - 1] : days[0];
  const day = dayOf(pick.date, loc);
  const td = tamilDate(new Date(day.sunset.getTime() - 60000), loc.lat, loc.lon, offH(loc, day.sunset));
  return {
    ...pick,
    tamil: td,
    weekday: { index: weekdayOf(day.sunrise, loc.zone || loc.tz), ...WEEKDAYS[weekdayOf(day.sunrise, loc.zone || loc.tz)] },
    star: NAKSHATRAS[birthStar],
    occurrences: days.map((x) => x.date),
    chosenBy: days.length > 1 ? (twice === 'first' ? 'first' : 'second') : 'only',
  };
}

/** Tamil birth month (0 = Chithirai) of a chart: the Tamil calendar month of the birth date at the birth place. */
export function birthTamilMonth(chart) {
  return tamilDate(chart.utc, chart.lat, chart.lon, offsetHoursAt(chart.zone || chart.tz, chart.utc));
}

/**
 * Natchathira Pirantha Naal: the next `count` star birthdays on or after the civil date of `from` at `loc`
 * (the RESIDENCE — where the family celebrates). See the rule at the top of this section.
 */
export function natchathiraBirthdays({ birthStar, birthTamilMonth: month, from = new Date(), loc, count = 2, twice = STAR_BIRTHDAY_RULE.twiceDefault }) {
  const out = [];
  const today = isoAt(from, loc);
  let after = new Date(from.getTime() - 40 * DAY);
  for (let i = 0; i < count + 3 && out.length < count; i++) {
    const span = tamilMonthSpan(month, after, loc);
    const d = starDayInMonth(birthStar, span, loc, { twice });
    if (d && d.date >= today) out.push(d);
    after = new Date(span.sankranti.getTime() + 300 * DAY);
  }
  return out;
}

/**
 * Thivasam / Sraddham: an ancestor's annual rite falls in the Tamil (solar) month of passing, on the day the
 * same tithi prevails in the afternoon (aparahna, taken at the middle of the 4th fifth of daytime). `death` is the
 * instant of passing; `loc` the place the rite is performed. Rules, per Tamil month instance:
 *  • if the tithi holds at aparahna on two consecutive days (one long tithi), the first of them;
 *  • if the tithi comes twice in the solar month, the SECOND (same convention as the star birthday);
 *  • if the tithi is skipped between two aparahnas (kshaya), the day in whose afternoon-to-next-afternoon it falls,
 *    with a note.
 */
export function thivasamDates({ death, loc, from = new Date(), count = 2 }) {
  const tz0 = offH(loc, death);
  const dp = panchang(death, loc.lat, loc.lon, tz0, { withEnds: false });
  const tithi = dp.tithi.index;
  const month = tamilDate(death, loc.lat, loc.lon, tz0).month;
  const out = [];
  const today = isoAt(from, loc);
  let after = new Date(from.getTime() - 40 * DAY);
  for (let i = 0; i < count + 3 && out.length < count; i++) {
    const span = tamilMonthSpan(month, after, loc);
    after = new Date(span.sankranti.getTime() + 300 * DAY);
    const rows = [];
    for (let iso = addDays(span.first, -1); iso <= addDays(span.last, 1); iso = addDays(iso, 1)) {
      const day = dayOf(iso, loc);
      const aparahna = new Date(day.sunrise.getTime() + (day.sunset - day.sunrise) * 0.7);
      rows.push({ iso, day, t: Math.floor(sunMoonSeparation(aparahna) / 12) });
    }
    const hits = [];
    for (let k = 1; k < rows.length - 1; k++) {
      const r = rows[k];
      if (r.iso < span.first || r.iso > span.last) continue;
      if (r.t === tithi && rows[k - 1].t !== tithi) hits.push({ r, kshaya: false });
      else if (r.t === (tithi + 29) % 30 && rows[k + 1].t === (tithi + 1) % 30) hits.push({ r, kshaya: true });
    }
    if (!hits.length) continue;
    const pick = hits[hits.length - 1];
    if (pick.r.iso < today) continue;
    const day = pick.r.day;
    const wd = weekdayOf(day.sunrise, loc.zone || loc.tz);
    out.push({
      date: pick.r.iso,
      tamil: tamilDate(new Date(day.sunset.getTime() - 60000), loc.lat, loc.lon, offH(loc, day.sunset)),
      weekday: { index: wd, ...WEEKDAYS[wd] },
      occurrences: hits.map((h) => h.r.iso),
      chosenBy: hits.length > 1 ? 'second' : 'only',
      note: pick.kshaya ? {
        en: 'The tithi does not reach any afternoon this month (it begins after one afternoon and ends before the next); this day is used.',
        ta: 'இம்மாதம் இந்தத் திதி எந்த மதிய வேளையையும் தொடவில்லை; அது நிகழும் இந்நாள் கொள்ளப்பட்டது.',
      } : null,
    });
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
export function findMuhurtham({ category, loc, persons = [], from = new Date(), days = 30, stepMin = 30, dayOnly = true, top = 8, deadline = null }) {
  const cat = typeof category === 'string' ? getCategory(category) : category;
  const results = [];
  // Never suggest a time after a real deadline: the scan stops at the deadline.
  const end = Math.min(from.getTime() + days * DAY, deadline ? new Date(deadline).getTime() : Infinity);
  const practicalFirst = !!(cat.practicalFirst || deadline);
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
      optional: true,
      ...(practicalFirst ? { practicalFirst: true, deadlineNote: DEADLINE_FIRST_NOTE[cat.id] || DEADLINE_FIRST_NOTE.default } : {}),
    }));
}

/**
 * Muhurtham finder with the engine's practical-first rule made explicit for the UI (brief §10):
 * windows are optional suggestions; for urgent categories (hospital, delivery, payments, court, contracts,
 * travel, visa, exams) or when a real deadline is given, an empty list never means "wait" — the person
 * should go ahead with the real deadline.
 */
export function muhurthamPlan(opts) {
  const cat = typeof opts.category === 'string' ? getCategory(opts.category) : opts.category;
  const windows = findMuhurtham(opts);
  const practicalFirst = !!(cat.practicalFirst || opts.deadline);
  return {
    windows,
    practicalFirst,
    neverBlocks: true,
    deadlineNote: practicalFirst ? DEADLINE_FIRST_NOTE[cat.id] || DEADLINE_FIRST_NOTE.default : null,
    emptyMeaning: windows.length ? null : practicalFirst
      ? { en: 'No traditional window before your deadline — go ahead with your real timing; an optional prayer can go with you.', ta: 'உங்கள் காலக்கெடுவுக்கு முன் மரபு நேரம் இல்லை — உங்கள் உண்மையான நேரப்படி செய்யுங்கள்; விருப்பமெனில் ஒரு பிரார்த்தனை உடன் வரலாம்.' }
      : { en: 'No traditional window in this range — try a longer range, or go ahead when it suits your family.', ta: 'இந்த இடைவெளியில் மரபு நேரம் இல்லை — நீண்ட இடைவெளியை முயலுங்கள் அல்லது குடும்பத்திற்கு ஏற்ற நேரத்தில் செய்யுங்கள்.' },
  };
}

/**
 * Ruthu first bath and Manjal Neerattu dates with data minimisation: the time of the first period is used
 * only for this calculation — it is not returned, logged or stored, and no name is kept. Callers must not
 * persist `at`. person: { janmaNakshatra, janmaRasi } (optional).
 */
export function ruthuPlan({ at, loc, person = null }) {
  const minimal = person && person.janmaNakshatra != null ? [{ name: '', janmaNakshatra: person.janmaNakshatra, janmaRasi: person.janmaRasi }] : [];
  const strip = (ws) => ws.map(({ personNotes, ...w }) => ({ ...w, personNotes: personNotes.map(({ en, ta }) => ({ en, ta })) }));
  const bath = findMuhurtham({ category: 'ruthu_bath', loc, persons: [], from: at, days: 3, stepMin: 15, top: 3 });
  const vizha = findMuhurtham({ category: 'manjal_neerattu', loc, persons: minimal, from: new Date(at.getTime() + 5 * DAY), days: 60, top: 5 });
  return {
    bath: strip(bath),
    vizha: strip(vizha),
    dataPolicy: {
      storesMenstrualDate: false,
      returnsInputTime: false,
      note: { en: 'The date and time you entered are used only for this calculation and are not saved.', ta: 'நீங்கள் உள்ளிட்ட தேதியும் நேரமும் இந்தக் கணக்கிற்கு மட்டுமே பயன்படும்; சேமிக்கப்படுவதில்லை.' },
    },
  };
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
      ? { en: 'Some members have a weak Tara — pray before starting', ta: 'சிலருக்குத் தாரை பலம் குறைவு — வழிபட்டுத் தொடங்கவும்' }
      : { en: 'No Chandrashtamam and good Tara for everyone selected', ta: 'தேர்ந்தெடுத்த அனைவருக்கும் சந்திராஷ்டமம் இல்லை, தாரை பலம் உண்டு' });
  }
  return out;
}

// ---------------------------------------------------------------- Milestone celebrations
// Each is held on the person's star birthday (rules above, at the RESIDENCE) in the Tamil birth month of the year
// in which the stated number of years is complete. For 60 years this is exactly when the Tamil year name of the
// 60-year cycle (e.g. Krodhi) returns. Kanakabhishekam is NOT offered: its age (84, 90 or 100) differs between
// families and texts, so no single date can be shown as correct.
const SIDEREAL_YEAR_DAYS = 365.25636;
const SYNODIC_MONTH_DAYS = 29.530589;
export const MILESTONES = Object.freeze([
  {
    id: 'shashti', years: 60, name: { en: 'Shashtiabdapoorthi (60th)', ta: 'சஷ்டியப்தபூர்த்தி (60-ம் ஆண்டு நிறைவு)' },
    basis: { en: '60 years complete: your Tamil birth-year name returns. Held on your birth star in your Tamil birth month.', ta: '60 ஆண்டுகள் நிறைவு — பிறந்த தமிழ் ஆண்டின் பெயர் மீண்டும் வரும் ஆண்டு. பிறந்த தமிழ் மாதத்தில் ஜென்ம நட்சத்திர நாளில்.' },
  },
  {
    id: 'bheemaratha', years: 70, name: { en: 'Bheemaratha Shanti (70th)', ta: 'பீமரத சாந்தி (70-ம் ஆண்டு நிறைவு)' },
    basis: { en: '70 years complete, on your birth star in your Tamil birth month. Some families hold it a year earlier, on entering the 70th year.', ta: '70 ஆண்டுகள் நிறைவு — பிறந்த தமிழ் மாதத்தில் ஜென்ம நட்சத்திர நாளில். சில குடும்பங்கள் 70-ம் வயது தொடங்கும்போதே (ஓராண்டு முன்) செய்வர்.' },
  },
  {
    id: 'sathabhishekam', years: 80, name: { en: 'Sathabhishekam (80th, 1000 moons)', ta: 'சதாபிஷேகம் (80 நிறைவு, ஆயிரம் பிறை)' },
    basis: { en: '80 years complete (about 1000 full moons seen), on your birth star in your Tamil birth month. The exact 1000th full moon is shown too.', ta: '80 ஆண்டுகள் நிறைவு (ஏறக்குறைய ஆயிரம் பிறை கண்டது) — பிறந்த தமிழ் மாதத்தில் ஜென்ம நட்சத்திர நாளில். சரியான 1000-வது பௌர்ணமியும் காட்டப்படும்.' },
  },
]);

/**
 * How the 60th / 70th / 80th is traditionally celebrated: at Thirukadaiyur or at home with homam. Never a statement
 * about lifespan.
 */
export function milestoneNote() {
  return { en: 'Traditionally celebrated at Thirukadaiyur Abhirami–Amritaghateswarar temple or at home with homam.', ta: 'பாரம்பரியமாகத் திருக்கடையூர் அபிராமி–அமிர்தகடேஸ்வரர் கோவிலில் அல்லது வீட்டில் ஹோமத்துடன் கொண்டாடப்படுகிறது.' };
}

/** The n-th full moon after an instant (n ≥ 1). */
export function nthFullMoonAfter(at, n) {
  const sep = (d) => (moonSidereal(d) - sunSidereal(d) + 360) % 360;
  const first = findCrossing(sep, 180, at, 31 * 24);
  if (n === 1) return first;
  const approx = new Date(first.getTime() + ((n - 1) * SYNODIC_MONTH_DAYS - 3) * DAY);
  return findCrossing(sep, 180, approx, 6 * 24);
}

/**
 * Shashtiabdapoorthi, Bheemaratha Shanti and Sathabhishekam for a chart. `loc` is the RESIDENCE (where the family
 * celebrates). Each item: { id, name, years, basis, day (starDayInMonth result or null), birthTamilYear, past }.
 */
export function milestones(chart, loc, from = new Date(), { twice = STAR_BIRTHDAY_RULE.twiceDefault } = {}) {
  const birth = birthTamilMonth(chart);
  const star = chart.janmaNakshatra.index;
  const today = isoAt(from, loc);
  return MILESTONES.map((m) => {
    const after = new Date(birth.sankranti.getTime() + (m.years * SIDEREAL_YEAR_DAYS - 20) * DAY);
    const span = tamilMonthSpan(birth.month, after, loc);
    const day = starDayInMonth(star, span, loc, { twice });
    const item = {
      id: m.id, name: m.name, years: m.years, basis: m.basis, day,
      birthTamilMonth: { index: birth.month, en: birth.monthEn, ta: birth.monthTa }, birthTamilYear: birth.year,
      past: day ? day.date < today : true,
    };
    if (m.id === 'sathabhishekam') item.thousandthFullMoon = nthFullMoonAfter(chart.utc, 1000);
    return item;
  });
}
