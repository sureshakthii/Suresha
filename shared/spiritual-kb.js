// Spiritual knowledge base + festival engine (offline, deterministic).
//
// answerGeneral(question, opts) answers everyday Hindu festival / vratham / panchangam / Ithihasa questions in
// Tamil, Tanglish or English — WHEN (next dates for the user's place from the app's own panchangam), WHY (meaning
// and the puranic story), HOW (simple observance, fasting care, offerings, mantra) and WHAT TODAY (tithi, star,
// yogam, special day). It returns null when the question is not one it covers, so the caller can fall back.
//
// Date rules (the convention this app follows — almanacs can differ by a day):
//   • A tithi / star is "of the day" when it prevails at local SUNRISE (udaya rule), with these exceptions:
//     Pradosham → Trayodasi at sunset · Sivaratri & Krishna Jayanthi → tithi at midnight (nishita) ·
//     Vinayagar Chathurthi, Rama Navami → tithi at midday · Sankatahara Chathurthi → tithi about 3 h after sunset (moonrise).
//   • A tithi that spans two sunrises is kept on the FIRST day; a tithi that touches no sunrise (kshaya) is kept on
//     the day during which it runs (or the next day for "begins" observances like Navaratri day 1).
//   • Tamil (solar) month = Sun's sidereal rasi at sunset (tamilcal.js). Lunar month = amanta (new moon to new moon),
//     named from the Sun's rasi at the new moon; adhika (leap) months are skipped for festivals.
import { sunMoonSeparation, moonSidereal, sunSidereal, yogaSum, vedicDay, weekdayOf, findCrossing, offsetHoursAt, NAKSHATRAS, TITHIS, TITHIS_TA, YOGAS, YOGAS_TA, WEEKDAYS, RASIS } from './astro.js';
import { tamilDate, tamilDay, TAMIL_MONTHS } from './tamilcal.js';
import { MANTRAS } from './mantras.js';
import { TEMPLES } from './temples.js';
import { currentPeyarchi } from './peyarchi.js';
import * as A from 'astronomy-engine';
import { MONTHLY } from './kb/monthly.js';
import { FESTIVALS_A } from './kb/festivals-a.js';
import { FESTIVALS_B } from './kb/festivals-b.js';
import { EKADASIS } from './kb/ekadasi.js';
import { CONCEPTS } from './kb/concepts.js';
import { CHARACTERS } from './kb/characters.js';
import { FAST_CARE, NON_HINDU_NOTE } from './kb/common.js';

export { CHARACTERS };
/** Every festival / vratham / concept entry (Ithihasa characters are separate: CHARACTERS). */
export const KB = [...MONTHLY, ...FESTIVALS_A, ...FESTIVALS_B, ...EKADASIS, ...CONCEPTS];
const BY_ID = new Map(KB.map((e) => [e.id, e]));
const CHAR_BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));
export const getEntry = (id) => BY_ID.get(id) || CHAR_BY_ID.get(id) || null;

export const DEFAULT_LOC = Object.freeze({ lat: 13.0827, lon: 80.2707, name: 'Chennai' });
const DAY = 86400000;
const NAK = 360 / 27;
export const LUNAR_MONTHS = [
  { en: 'Chaitra', ta: 'சைத்ர' }, { en: 'Vaisakha', ta: 'வைகாச' }, { en: 'Jyeshtha', ta: 'ஜ்யேஷ்ட' }, { en: 'Ashadha', ta: 'ஆஷாட' },
  { en: 'Shravana', ta: 'ச்ராவண' }, { en: 'Bhadrapada', ta: 'பாத்ரபத' }, { en: 'Ashvayuja', ta: 'ஆச்வயுஜ' }, { en: 'Kartika', ta: 'கார்த்திக' },
  { en: 'Margashirsha', ta: 'மார்கசீர்ஷ' }, { en: 'Pausha', ta: 'பௌஷ' }, { en: 'Magha', ta: 'மாக' }, { en: 'Phalguna', ta: 'பால்குன' },
];

// ================================================================ day snapshots
const tzHours = (tz, at = new Date()) => (typeof tz === 'string' ? offsetHoursAt(tz, at) : Number(tz ?? 5.5));
export const isoOf = (instant, tz) => new Date(instant.getTime() + tz * 3600000).toISOString().slice(0, 10);
export const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const noonOf = (iso, tz) => new Date(Date.parse(`${iso}T12:00:00Z`) - tz * 3600000);
const tithiAt = (d) => Math.floor(sunMoonSeparation(d) / 12) % 30;
const starAt = (d) => Math.floor(moonSidereal(d) / NAK) % 27;

// New moons (cached): the lunar month of an instant comes from the Sun's rasi at the new moon before it.
const nmCache = [];
function newMoonBefore(at) {
  const t = at.getTime();
  const hit = nmCache.find((n) => n.at <= t && t < n.next);
  if (hit) return hit;
  const sep = sunMoonSeparation(at);
  const approx = t - (sep / 12.19) * DAY;
  const nm = findCrossing(sunMoonSeparation, 0, new Date(approx - 2.5 * DAY), 24 * 5);
  const nmT = nm && nm.getTime() <= t ? nm.getTime() : findCrossing(sunMoonSeparation, 0, new Date(approx - 32 * DAY), 24 * 5).getTime();
  const next = findCrossing(sunMoonSeparation, 0, new Date(nmT + 26 * DAY), 24 * 6).getTime();
  const rasi = Math.floor(sunSidereal(new Date(nmT)) / 30);
  const rasiNext = Math.floor(sunSidereal(new Date(next)) / 30);
  const entry = { at: nmT, next, month: (rasi + 1) % 12, adhika: rasi === rasiNext };
  nmCache.push(entry);
  if (nmCache.length > 40) nmCache.shift();
  return entry;
}
/** Amanta lunar month at an instant: { month (0 = Chaitra), adhika }. */
export function lunarMonthAt(at) { const n = newMoonBefore(at); return { month: n.month, adhika: n.adhika }; }

const snapCache = new Map();
/** Light panchangam for one civil day at a place (sunrise tithi/star/yoga, anchor tithis, Tamil and lunar month). */
export function daySnap(iso, loc, tz) {
  const key = `${loc.lat.toFixed(3)},${loc.lon.toFixed(3)},${tz},${iso}`;
  const hit = snapCache.get(key);
  if (hit) return hit;
  const day = vedicDay(noonOf(iso, tz), loc.lat, loc.lon);
  const sr = new Date(day.sunrise.getTime() + 60000);
  const ss = day.sunset;
  const td = tamilDate(new Date(ss.getTime() - 60000), loc.lat, loc.lon, tz);
  const s = {
    iso,
    weekday: weekdayOf(day.sunrise, tz),
    sunrise: day.sunrise, sunset: ss, nextSunrise: day.nextSunrise,
    t: {
      sunrise: tithiAt(sr),
      sunset: tithiAt(ss),
      midday: tithiAt(new Date((sr.getTime() + ss.getTime()) / 2)),
      midnight: tithiAt(new Date((ss.getTime() + day.nextSunrise.getTime()) / 2)),
      moonrise: tithiAt(new Date(ss.getTime() + 3 * 3600000)),
    },
    star: starAt(sr),
    yoga: Math.floor(yogaSum(sr) / NAK) % 27,
    solar: { month: td.month, day: td.day },
    lunar: lunarMonthAt(sr),
  };
  snapCache.set(key, s);
  if (snapCache.size > 3000) snapCache.delete(snapCache.keys().next().value);
  return s;
}

function snapsRange(fromIso, days, loc, tz) {
  const out = [];
  for (let i = -1; i <= days + 1; i++) out.push(daySnap(addDays(fromIso, i), loc, tz));
  return out; // out[0] is the day before, out[days + 1] the day after
}

// ================================================================ rules
const asList = (x) => (Array.isArray(x) ? x : [x]);
/** Does the anchored value (tithi or star) belong to day i? Handles vriddhi (keep the first day) and kshaya. */
function anchored(S, i, get, target, N, kshaya = 'same') {
  const v = get(S[i]);
  if (v === target) return get(S[i - 1]) !== target ? { day: i } : null;
  if (kshaya === 'next') {
    const p = get(S[i - 1]);
    if (p === (target + N - 1) % N && v === (target + 1) % N) return { day: i, kshaya: true };
    return null;
  }
  if (v === (target + N - 1) % N && S[i + 1] && get(S[i + 1]) === (target + 1) % N) return { day: i, kshaya: true };
  return null;
}

function baseMatches(rule, S, lo, hi) {
  const out = [];
  if (rule.tithi != null) {
    const at = rule.at || 'sunrise';
    for (const target of asList(rule.tithi)) {
      for (let i = lo; i <= hi; i++) {
        const m = anchored(S, i, (s) => s.t[at], target, 30, rule.kshaya);
        if (!m) continue;
        const s = S[i];
        // lunar month while the tithi runs: a skipped Prathamai belongs to the month that begins with it
        const lunar = m.kshaya && target === 0 && rule.kshaya !== 'next' ? S[i + 1].lunar : s.lunar;
        if (rule.lunar && (!rule.lunar.includes(lunar.month) || lunar.adhika !== !!rule.adhika)) continue;
        if (rule.solar && !rule.solar.includes(s.solar.month)) continue;
        if (rule.weekday != null && !asList(rule.weekday).includes(s.weekday)) continue;
        out.push({ i, tithi: target, kshaya: !!m.kshaya });
      }
    }
  } else if (rule.star != null) {
    for (let i = lo; i <= hi; i++) {
      const m = anchored(S, i, (s) => s.star, rule.star, 27);
      if (!m) continue;
      if (rule.solar && !rule.solar.includes(S[i].solar.month)) continue;
      out.push({ i, star: rule.star, kshaya: !!m.kshaya });
    }
    // A star can come twice in one Tamil month: festivals tied to the full moon take the one nearer Pournami,
    // others take the SECOND (same convention as the app's star birthdays, special.js).
    if (rule.solar) {
      const keep = [];
      for (let k = 0; k < out.length; k++) {
        const a = out[k]; const b = out[k + 1];
        if (b && b.i - a.i < 32 && S[a.i].solar.month === S[b.i].solar.month) {
          const dist = (x) => Math.abs(S[x.i].t.sunrise - 14);
          keep.push(rule.twice === 'pournami' ? (dist(a) <= dist(b) ? a : b) : b);
          k++;
        } else keep.push(a);
      }
      return keep;
    }
  } else if (rule.solarDay) {
    const [m, d] = rule.solarDay;
    for (let i = lo; i <= hi; i++) if (S[i].solar.month === m && S[i].solar.day === d) out.push({ i });
  } else if (rule.solarDayAny != null) {
    for (let i = lo; i <= hi; i++) if (S[i].solar.day === rule.solarDayAny && !(rule.exceptMonths || []).includes(S[i].solar.month)) out.push({ i });
  } else if (rule.solarMonth != null) {
    for (let i = lo; i <= hi; i++) {
      if (S[i].solar.month !== rule.solarMonth || S[i].solar.day !== 1) continue;
      let j = i; while (j + 1 < S.length && S[j + 1].solar.month === rule.solarMonth) j++;
      out.push({ i, endIso: S[j].solar.month === rule.solarMonth && j < S.length - 1 ? S[j].iso : null });
    }
  } else if (rule.weekly != null) {
    for (let i = lo; i <= hi; i++) if (S[i].weekday === rule.weekly && rule.solar.includes(S[i].solar.month)) out.push({ i });
  } else if (rule.range) {
    const [a, b] = rule.range;
    const hits = [];
    for (let i = lo; i <= hi; i++) {
      const s = S[i];
      if (s.t.sunrise >= a && s.t.sunrise <= b && s.weekday === rule.weekday && rule.lunar.includes(s.lunar.month) && !s.lunar.adhika) hits.push(i);
    }
    for (let k = 0; k < hits.length; k++) if (k === hits.length - 1 || hits[k + 1] - hits[k] > 10) out.push({ i: hits[k] });
  }
  return out;
}

/**
 * All occurrences of every KB entry with a rule between fromIso and fromIso + days − 1.
 * Returns [{ id, date, end?, tithi?, star?, kshaya? }] sorted by date.
 */
export function occurrencesBetween(fromIso, days, loc = DEFAULT_LOC, tz = 5.5) {
  const pad = 40; // dependants (offsets, spans) look a little beyond the window
  const S = snapsRange(addDays(fromIso, -pad), days + 2 * pad, loc, tz);
  const lo = 1; const hi = S.length - 2;
  const isoAt = (i) => S[i].iso;
  const found = new Map();
  const pending = [];
  for (const e of KB) {
    if (!e.rule) continue;
    const r = e.rule;
    if (r.offset || r.span || r.navaratriDay || r.sameAs) { pending.push(e); continue; }
    found.set(e.id, baseMatches(r, S, lo, hi).map((m) => ({ id: e.id, date: isoAt(m.i), end: m.endIso || undefined, tithi: m.tithi, star: m.star, kshaya: m.kshaya || undefined })));
  }
  for (let pass = 0; pass < 3 && pending.length; pass++) {
    for (let k = pending.length - 1; k >= 0; k--) {
      const e = pending[k];
      const r = e.rule;
      const dep = r.offset || r.sameAs || r.span?.end || (r.navaratriDay ? 'navaratri' : null);
      if (!found.has(dep)) continue;
      let list = [];
      if (r.offset || r.sameAs) list = found.get(dep).map((o) => ({ id: e.id, date: addDays(o.date, r.days || 0) }));
      else if (r.span) {
        const starts = baseMatches(r.span.start, S, lo, hi);
        const ends = found.get(dep);
        for (const st of starts) {
          const end = ends.find((x) => x.date >= isoAt(st.i) && Date.parse(x.date) - Date.parse(isoAt(st.i)) < 20 * DAY);
          if (end) list.push({ id: e.id, date: isoAt(st.i), end: end.date });
        }
      } else if (r.navaratriDay) {
        for (const nv of found.get('navaratri')) {
          const d = addDays(nv.date, r.navaratriDay - 1);
          if (d <= nv.end) list.push({ id: e.id, date: d });
        }
      }
      found.set(e.id, list);
      pending.splice(k, 1);
    }
  }
  const endIso = addDays(fromIso, days - 1);
  const all = [...found.values()].flat().filter((o) => (o.end || o.date) >= fromIso && o.date <= endIso);
  return all.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : rank(a.id) - rank(b.id)));
}
const KIND_RANK = { festival: 0, vratham: 1, monthly: 2, ekadasi: 3, concept: 4 };
const rank = (id) => KIND_RANK[BY_ID.get(id)?.kind] ?? 5;

/** Ekadasi name for an Ekadasi day (amanta lunar month + paksha). */
export function ekadasiNameFor(iso, loc = DEFAULT_LOC, tz = 5.5, tithi = null) {
  const s = daySnap(iso, loc, tz);
  const t = tithi ?? s.t.sunrise;
  const shukla = t < 15;
  return EKADASIS.find((e) => e.rule && e.rule.lunar.includes(s.lunar.month) && e.rule.tithi === (shukla ? 10 : 25) && !!e.rule.adhika === s.lunar.adhika) || null;
}

/**
 * The festival calendar for the screen: next `days` days, one row per occurrence, bilingual.
 * Rows: { id, date, end, weekday, kind, names, line, solar: { month, day }, tithi, star, sub? }.
 */
export function festivalCalendar({ from = new Date(), days = 365, loc = DEFAULT_LOC, tz = 5.5 } = {}) {
  const h = tzHours(tz, from);
  const fromIso = typeof from === 'string' ? from : isoOf(from, h);
  const occ = occurrencesBetween(fromIso, days, loc, h);
  const rows = [];
  for (const o of occ) {
    const e = BY_ID.get(o.id);
    if (!e || e.listed === false) continue;
    const s = daySnap(o.date < fromIso ? fromIso : o.date, loc, h);
    let sub = null;
    if (e.id === 'ekadasi') { const n = ekadasiNameFor(o.date, loc, h, o.tithi); if (n) sub = { id: n.id, names: n.names }; }
    if (e.id === 'pradosham' && (s.weekday === 6 || s.weekday === 1)) sub = { id: s.weekday === 6 ? 'sani-pradosham' : 'soma-pradosham', names: BY_ID.get(s.weekday === 6 ? 'sani-pradosham' : 'soma-pradosham').names };
    // A span already running (e.g. Mahalaya Paksham) is listed from today, keeping its real start.
    rows.push({ id: e.id, date: o.date < fromIso ? fromIso : o.date, start: o.date, end: o.end || null, weekday: s.weekday, kind: e.kind, names: e.names, line: e.line, solar: s.solar, tithi: s.t.sunrise, star: s.star, sub });
  }
  return rows;
}

/** Next occurrences of one entry from `from` (searching up to `days`). */
export function nextOccurrences(id, { from = new Date(), count = 3, days = 400, loc = DEFAULT_LOC, tz = 5.5 } = {}) {
  const h = tzHours(tz, from);
  const fromIso = typeof from === 'string' ? from : isoOf(from, h);
  return occurrencesBetween(fromIso, days, loc, h).filter((o) => o.id === id).slice(0, count);
}

// ================================================================ text helpers
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_TA = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
const pick = (o, lang) => (o == null ? '' : typeof o === 'string' ? o : lang === 'ta' ? (o.ta ?? o.en) : (o.en ?? o.ta));
export function fmtDay(iso, lang, { weekday = true, year = true } = {}) {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  if (lang === 'ta') return `${d} ${MONTHS_TA[m - 1]}${year ? ` ${y}` : ''}${weekday ? `, ${wd.ta}` : ''}`;
  return `${weekday ? `${wd.en.slice(0, 3)}, ` : ''}${d} ${MONTHS_EN[m - 1]}${year ? ` ${y}` : ''}`;
}
function fmtClock(instant, tz, lang, withDate = true) {
  const x = new Date(instant.getTime() + tz * 3600000);
  const h = x.getUTCHours(); const mi = String(x.getUTCMinutes()).padStart(2, '0');
  const h12 = ((h + 11) % 12) + 1;
  const date = withDate ? `${x.getUTCDate()} ${lang === 'ta' ? MONTHS_TA[x.getUTCMonth()] : MONTHS_EN[x.getUTCMonth()]} ` : '';
  if (lang === 'ta') {
    const part = h < 4 ? 'அதிகாலை' : h < 12 ? 'காலை' : h < 16 ? 'மதியம்' : h < 19 ? 'மாலை' : 'இரவு';
    return `${date}${part} ${h12}:${mi}`;
  }
  return `${date}${h12}:${mi} ${h < 12 ? 'AM' : 'PM'}`;
}
export const tithiName = (i, lang) => {
  if (i === 14) return lang === 'ta' ? 'பௌர்ணமி' : 'Pournami';
  if (i === 29) return lang === 'ta' ? 'அமாவாசை' : 'Amavasai';
  const p = i < 15 ? (lang === 'ta' ? 'வளர்பிறை' : 'Shukla') : (lang === 'ta' ? 'தேய்பிறை' : 'Krishna');
  return `${p} ${lang === 'ta' ? TITHIS_TA[i % 15] : TITHIS[i % 15]}`;
};
const starName = (i, lang) => (lang === 'ta' ? NAKSHATRAS[i].ta : NAKSHATRAS[i].en);

function tithiWindow(target, sunrise) {
  const from = new Date(sunrise.getTime() - 30 * 3600000);
  const start = findCrossing(sunMoonSeparation, target * 12, from, 60);
  const end = start && findCrossing(sunMoonSeparation, ((target + 1) * 12) % 360, start, 36);
  return start && end ? { start, end } : null;
}
function starWindow(target, sunrise) {
  const from = new Date(sunrise.getTime() - 30 * 3600000);
  const start = findCrossing(moonSidereal, target * NAK, from, 60);
  const end = start && findCrossing(moonSidereal, ((target + 1) * NAK) % 360, start, 36);
  return start && end ? { start, end } : null;
}

// ================================================================ question understanding
function foldLatin(w) {
  return w.replace(/zh/g, 'l').replace(/([kgcjtdpb])h/g, '$1').replace(/sh/g, 's').replace(/ch/g, 'c')
    .replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/w/g, 'v').replace(/y/g, 'i').replace(/(.)\1+/g, '$1');
}
function foldTamil(w) {
  return w.replace(/[ஷஸஜ]/g, 'ச').replace(/ண/g, 'ன').replace(/ற/g, 'ர').replace(/[ளழ]/g, 'ல').replace(/ௌ/g, 'ொ')
    .replace(/([கசடதபறலனமவரய])்\1/g, '$1').replace(/[கசதப]்(?=[கசதப])/g, '');
}
/** Normalise a question or alias: lower-case, punctuation dropped, Latin folded, Tamil variants unified. */
export function normalizeQ(text, { tamilFold = true } = {}) {
  const t = String(text || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  return t.split(' ').map((w) => (/^[a-z0-9]+$/.test(w) ? foldLatin(w) : tamilFold && /[஀-௿]/.test(w) ? foldTamil(w) : w)).join(' ');
}

const SHORT_SUFFIX = '(?:n|a|ai|in|la|ku|ar|e|s|um|kal|gal|vin|oda)?';
function aliasMatcher(alias) {
  const n = normalizeQ(alias);
  if (!n) return null;
  if (/[஀-௿]/.test(n)) { const ns = foldTamil(normalizeQ(alias, { tamilFold: false }).replace(/ /g, '')); return { len: ns.length, test: (q) => q.tamil.includes(ns) }; }
  const words = n.split(' ').map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const core = words.join('\\s*');
  const tail = core.replace(/\\s\*/g, '').length >= 6 ? '[a-z]{0,6}' : core.length >= 5 ? '[a-z]{0,3}' : SHORT_SUFFIX;
  const re = new RegExp(`(?:^|\\s)${core}${tail}(?=\\s|$)`);
  return { len: words.join('').length, test: (q) => re.test(q.latin) };
}
const MATCHERS = [];
for (const e of [...KB, ...CHARACTERS]) {
  for (const a of new Set([e.names.en, e.names.ta, ...(e.aliases || [])])) {
    const m = aliasMatcher(a);
    if (m) MATCHERS.push({ id: e.id, ...m, char: CHAR_BY_ID.has(e.id) });
  }
}

// Intent words are matched on Latin-folded text (why → vhi, yaar → iar, eppo → epo) with Tamil left as typed.
const W = (latin, tamil) => new RegExp(`(?:^|\\s)(?:${latin})(?=\\s|$)${tamil ? `|${tamil}` : ''}`);
const INTENTS = {
  today: W('indru|inru|inaiku|iniku|inaki|indraiku|todai|ipo|ipodu|right nov|nov', 'இன்று|இன்னைக்கு|இன்னிக்கு|இன்றைக்கு|இன்றைய|இப்போது'),
  tomorrow: W('nalai|nalaiku|tomorov', 'நாளை|நாளைக்கு'),
  when: W('epo|epa|epodu|epoludu|vhen|date|dates|next|aduta|adutu|varum|varudu|varutu|tedi|teti|nal|kilamai|calendar|scedule|upcoming|coming|dai|varusam|iear', 'எப்போ|எப்ப|எந்த நாள்|எந்தத் தேதி|எந்த தேதி|தேதி|அடுத்த|வரும்|வருகிற|வருது|கிழமை|நாள்'),
  why: W('vhi|ien|en|etarku|edarku|significance|meaning|artam|karanam|special|sirapu|importance|purpose|histori|stori|katai|kadai|varalaru|puranam|explain|reason', 'ஏன்|சிறப்பு|முக்கியத்துவம்|அர்த்தம்|காரணம்|பொருள்|கதை|வரலாறு|புராண|விளக்க'),
  whyWeak: W('ena|vhat|about|tel|pati|patri', 'என்ன|பற்றி'),
  how: W('hov|epadi|epdi|seianum|seia|seivadu|seiradu|seialam|valipadu|vali|vidi|rules|rule|fast|fasting|murai|sapidalam|sapidalama|sapadu|unavu|eat|fud|ofer|naivediam|neivediam|prasadam|mantra|mantiram|slokam|sloka|observe|perform|celebrate|kondadu|kondaduvadu|kondadanum|irukanum|irupadu|steps|procedure', 'எப்படி|செய்ய|செய்வது|வழிபா|முறை|விதி|சாப்பிட|உணவு|நைவேத்|நிவேத|பிரசாத|மந்திர|ஸ்லோக|கொண்டாட|இருக்க|கடைப்பிடி'),
  who: W('vho|iar|iaru|ivar|avar|caracter|patiram', 'யார்|யாரு|பாத்திர'),
};
const PANCHANG_WORDS = W('titi|natcatiram|naksatra|naksatram|star|iogam|ioga|panjangam|pancangam|pancang|visesam|special|nal|vratam|viratam|festival|pandigai', 'திதி|நட்சத்திர|யோக|பஞ்சாங்க|விசேஷ|சிறப்பு|விரத|பண்டிகை');
const CHART_WORDS = W('jatagam|jadagam|jatakam|cart|dasa|dasai|bukti|puti|lagna|lagnam|oroscope|horoscope|palan|kundli|kundali|rasi palan', 'ஜாதக|தசை|தசா|புக்தி|லக்ன|பலன்');
const PERSONAL = W('mi|mine|enaku|enudaia|nan|en rasi', 'எனக்கு|என்னுடைய|என் ராசி');
const UPCOMING = W('festivals|festival|pandigai|pandigaigal|viza|vilakal|vilagal|vizakal|vratangal|viratangal|vratams|olidais', 'பண்டிகை|திருவிழா|விழா|விரதங்கள்|விரத நாட்கள்');
const YEAR = /(?:^|\s)(20[2-4]\d)(?=\s|$)/;

/** Which entry (and intents) does a question point at? Returns { entry, char, intents, year } or null. */
export function matchQuestion(question) {
  const n = normalizeQ(question);
  if (!n) return null;
  // Tamil is folded after joining words, so sandhi across a space ("தைப் பூசம்") matches "தைப்பூசம்".
  const q = { latin: n, tamil: foldTamil(normalizeQ(question, { tamilFold: false }).replace(/ /g, '')) };
  let best = null;
  for (const m of MATCHERS) {
    if (!m.test(q)) continue;
    const e = getEntry(m.id);
    const score = m.len * 10 - (KIND_RANK[e.kind] ?? (m.char ? 2 : 5));
    if (!best || score > best.score) best = { score, id: m.id, char: m.char };
  }
  const it = normalizeQ(question, { tamilFold: false });
  let intents = Object.entries(INTENTS).filter(([, re]) => re.test(it)).map(([k]) => k);
  // "enna" / "what" / "about" count as WHY only when nothing more specific was asked.
  if (intents.includes('whyWeak')) intents = intents.filter((k) => k !== 'whyWeak').concat(intents.some((k) => ['how', 'when', 'why', 'today', 'tomorrow'].includes(k)) ? [] : ['why']);
  const ym = YEAR.exec(it);
  return { entry: best ? getEntry(best.id) : null, char: best?.char || false, intents, year: ym ? Number(ym[1]) : null, n: it };
}

// ================================================================ answer builders
const sec = (key, title, lines) => ({ key, title, lines: lines.filter(Boolean) });
const T = (lang, en, ta) => (lang === 'ta' ? ta : en);

function whenLines(e, occ, lang, loc, tz, now) {
  const lines = [];
  if (!occ.length) {
    lines.push(T(lang, 'No date found in the next 400 days for your place.', 'உங்கள் ஊருக்கு அடுத்த 400 நாட்களில் தேதி கிடைக்கவில்லை.'));
    return lines;
  }
  const todayIso = isoOf(now, tz);
  occ.forEach((o, k) => {
    const s = daySnap(o.date, loc, tz);
    let line = o.end ? `${fmtDay(o.date, lang)} → ${fmtDay(o.end, lang)}` : fmtDay(o.date, lang);
    if (o.date === todayIso) line += T(lang, ' (today)', ' (இன்று)');
    else if (o.date < todayIso) line += T(lang, ' (already passed)', ' (கடந்துவிட்டது)');
    const tamil = `${pick(TAMIL_MONTHS[s.solar.month], lang)} ${s.solar.day}`;
    line += ` · ${tamil}`;
    if (e.id === 'ekadasi') { const nm = ekadasiNameFor(o.date, loc, tz, o.tithi); if (nm) line += ` · ${pick(nm.names, lang)}`; }
    if (e.id === 'pradosham' && s.weekday === 6) line += T(lang, ' · Sani Pradosham', ' · சனிப் பிரதோஷம்');
    if (e.id === 'pradosham' && s.weekday === 1) line += T(lang, ' · Soma Pradosham', ' · சோமப் பிரதோஷம்');
    if (o.tithi != null) line += ` · ${tithiName(o.tithi, lang)}${T(lang, ' tithi', ' திதி')}`;
    else if (o.star != null) line += ` · ${starName(o.star, lang)}${T(lang, ' star', ' நட்சத்திரம்')}`;
    else if (!o.end) line += ` · ${tithiName(s.t.sunrise, lang)} · ${starName(s.star, lang)}`;
    lines.push(line);
    if (k === 0 && (o.tithi != null || o.star != null)) {
      const w = o.tithi != null ? tithiWindow(o.tithi, s.sunrise) : starWindow(o.star, s.sunrise);
      if (w) {
        const name = o.tithi != null ? tithiName(o.tithi, lang) : starName(o.star, lang);
        lines.push(T(lang, `${name} runs from ${fmtClock(w.start, tz, 'en')} to ${fmtClock(w.end, tz, 'en')} (local time).`,
          `${name}: ${fmtClock(w.start, tz, 'ta')} முதல் ${fmtClock(w.end, tz, 'ta')} வரை (உள்ளூர் நேரம்).`));
      }
      const at = e.rule?.at;
      if (at === 'sunset') lines.push(T(lang, `Pradosha kalam is about 1½ hours either side of sunset (${fmtClock(s.sunset, tz, 'en', false)}).`, `பிரதோஷ காலம்: சூரிய அஸ்தமனத்துக்கு (${fmtClock(s.sunset, tz, 'ta', false)}) முன்னும் பின்னும் சுமார் 1½ மணி நேரம்.`));
    }
  });
  if (e.ruleText) lines.push(T(lang, `How the date is fixed: ${e.ruleText.en}`, `தேதி கணிப்பு: ${e.ruleText.ta}`));
  lines.push(T(lang, 'Dates follow this app’s panchangam for your place (sunrise rule); printed almanacs can differ by a day.',
    'தேதிகள் உங்கள் ஊருக்கான இந்தச் செயலியின் பஞ்சாங்கப்படி (சூரிய உதய விதி); அச்சுப் பஞ்சாங்கங்களில் ஒரு நாள் மாறுபடலாம்.'));
  return lines;
}

function mantraLines(e, lang) {
  const m = e.mantra ? MANTRAS.find((x) => x.id === e.mantra) : null;
  if (m) return [`${pick(m.title, lang)}: ${lang === 'ta' ? m.text : m.translit}`, pick(m.meaning, lang)];
  if (e.chant) return [lang === 'ta' ? e.chant.text : e.chant.translit, e.chant.meaning ? pick(e.chant.meaning, lang) : ''];
  return [];
}
function templeLines(e, lang) {
  return (e.temples || []).map((id) => TEMPLES.find((t) => t.id === id)).filter(Boolean).slice(0, 4)
    .map((t) => `${pick(t.name, lang)} — ${t.town}`);
}

/** Full detail sections for one entry (used by the Festivals screen and by answers). */
export function entrySections(e, lang = 'ta', { faith = 'hindu', parts = ['why', 'story', 'how', 'fast', 'offer', 'mantra', 'temples', 'regional', 'extra'] } = {}) {
  const hindu = !faith || faith === 'hindu';
  const out = [];
  const has = (k) => parts.includes(k);
  if (has('why') && e.why) out.push(sec('why', T(lang, 'Why it is observed', 'ஏன் கடைப்பிடிக்கப்படுகிறது'), [pick(e.why, lang)]));
  if (has('story') && e.story) out.push(sec('story', T(lang, 'The story (tradition)', 'புராணக் கதை (மரபு)'), [pick(e.story, lang)]));
  if (has('extra') && e.extra) for (const x of e.extra) out.push(sec(x.key, pick(x.title, lang), pick(x.lines, lang)));
  if (has('how') && e.how) out.push(sec('how', hindu ? T(lang, 'How to observe (simple)', 'எப்படிக் கடைப்பிடிப்பது (எளிய முறை)') : T(lang, 'How Hindu families observe it', 'இந்துக் குடும்பங்கள் கடைப்பிடிக்கும் முறை'), pick(e.how, lang)));
  if (has('fast') && e.fast) out.push(sec('fast', T(lang, 'About fasting — who should not fast', 'விரதம் — யார் இருக்க வேண்டாம்'), [pick(FAST_CARE, lang)]));
  if (has('offer') && e.offer) out.push(sec('offer', T(lang, 'Offerings & food', 'நைவேத்தியம் & உணவு'), [pick(e.offer, lang)]));
  if (has('mantra') && hindu) { const ml = mantraLines(e, lang); if (ml.length) out.push(sec('mantra', T(lang, 'Mantra / chant', 'மந்திரம் / நாமம்'), ml)); }
  if (has('temples')) { const tl = templeLines(e, lang); if (tl.length) out.push(sec('temples', T(lang, 'Temples known for it', 'சிறப்பான கோவில்கள்'), tl)); }
  if (has('regional') && e.regional) out.push(sec('regional', T(lang, 'Regional practice', 'பகுதி வழக்கம்'), [pick(e.regional, lang)]));
  return out;
}

function followupsFor(e, lang, intents) {
  const f = [];
  const nm = pick(e.names, lang);
  if (!intents.includes('when') && e.rule) f.push({ label: T(lang, `When is ${nm}?`, `${nm} எப்போது?`), ask: T(lang, `when is ${e.names.en}`, `${e.names.ta} எப்போது`) });
  if (!intents.includes('why') && e.why) f.push({ label: T(lang, `Why ${nm}?`, `${nm} ஏன்?`), ask: T(lang, `why ${e.names.en}`, `${e.names.ta} ஏன்`) });
  if (!intents.includes('how') && e.how) f.push({ label: T(lang, `How to observe ${nm}`, `${nm} எப்படிக் கடைப்பிடிப்பது`), ask: T(lang, `how to observe ${e.names.en}`, `${e.names.ta} எப்படி செய்வது`) });
  if (e.rule) f.push({ label: T(lang, 'Festivals & vratham calendar', 'விழாக்கள் & விரதங்கள் நாட்காட்டி'), go: 'festivals', params: { id: e.id } });
  if (e.see) for (const id of e.see) { const x = BY_ID.get(id); if (x) f.push({ label: pick(x.names, lang), ask: T(lang, `about ${x.names.en}`, `${x.names.ta} பற்றி`) }); }
  return f.slice(0, 5);
}

const SOURCES = (lang) => [T(lang, 'Traditional / puranic accounts (as commonly told in Tamil Nadu)', 'மரபு / புராணச் செய்திகள் (தமிழ்நாட்டில் வழங்கும் முறை)'),
  T(lang, 'Dates: Thunai panchangam — Lahiri ayanamsa, sunrise rule, your location', 'தேதிகள்: துணை பஞ்சாங்கம் — லாஹிரி அயனாம்சம், சூரிய உதய விதி, உங்கள் இருப்பிடம்')];

function finish(topic, sections, followups, sources, extra = {}) {
  const text = sections.map((s) => `${s.title}\n${s.lines.map((l) => `• ${l}`).join('\n')}`).join('\n\n');
  return { topic, sections, text, followups, sources, ...extra };
}

function todayAnswer(lang, now, loc, tz, offsetDays = 0) {
  const iso = addDays(isoOf(now, tz), offsetDays);
  const d = tamilDay(noonOf(iso, tz), loc.lat, loc.lon, tz);
  const lines = [];
  lines.push(`${fmtDay(iso, lang)} · ${pick(TAMIL_MONTHS[d.tamil.month], lang)} ${d.tamil.day} · ${T(lang, `${d.tamil.year.en} year`, `${d.tamil.year.ta} ஆண்டு`)}`);
  const until = (x) => (x ? T(lang, ` (until ${fmtClock(x, tz, 'en')})`, ` (${fmtClock(x, tz, 'ta')} வரை)`) : '');
  lines.push(`${T(lang, 'Tithi', 'திதி')}: ${tithiName(d.tithi.index, lang)}${until(d.tithi.endsAt)}`);
  lines.push(`${T(lang, 'Star', 'நட்சத்திரம்')}: ${starName(d.nakshatra.index, lang)}${until(d.nakshatra.endsAt)}`);
  lines.push(`${T(lang, 'Yogam', 'யோகம்')}: ${lang === 'ta' ? YOGAS_TA[d.yoga.index] : YOGAS[d.yoga.index]}${until(d.yoga.endsAt)}`);
  lines.push(`${T(lang, 'Sunrise / sunset', 'சூரிய உதயம் / அஸ்தமனம்')}: ${fmtClock(d.sunrise, tz, lang, false)} / ${fmtClock(d.sunset, tz, lang, false)}`);
  const occ = occurrencesBetween(iso, 8, loc, tz);
  const todays = occ.filter((o) => o.date === iso || (o.end && o.date <= iso && o.end >= iso)).map((o) => BY_ID.get(o.id)).filter((e) => e && e.listed !== false);
  const special = [sec('today', T(lang, offsetDays ? 'Tomorrow’s panchangam' : 'Today’s panchangam', offsetDays ? 'நாளைய பஞ்சாங்கம்' : 'இன்றைய பஞ்சாங்கம்'), lines)];
  special.push(sec('special', T(lang, 'Special today', offsetDays ? 'நாளைய சிறப்பு' : 'இன்றைய சிறப்பு'),
    todays.length ? todays.map((e) => `${pick(e.names, lang)} — ${pick(e.line, lang)}`) : [T(lang, 'No major festival or vratham today.', 'இன்று பெரிய பண்டிகை / விரதம் இல்லை.')]));
  const soon = occ.filter((o) => o.date > iso).map((o) => ({ o, e: BY_ID.get(o.id) })).filter((x) => x.e && x.e.listed !== false && x.e.kind !== 'concept').slice(0, 4);
  if (soon.length) special.push(sec('soon', T(lang, 'Coming up this week', 'இந்த வாரம் வருபவை'), soon.map(({ o, e }) => `${fmtDay(o.date, lang, { year: false })} — ${pick(e.names, lang)}`)));
  special.push(sec('note', T(lang, 'Place', 'இடம்'), [T(lang, `Calculated for ${loc.name || 'your place'} (sunrise rule).`, `${loc.name || 'உங்கள் ஊர்'} — சூரிய உதய விதிப்படி கணிக்கப்பட்டது.`)]));
  return finish('today', special, [
    { label: T(lang, 'Full panchangam', 'முழு பஞ்சாங்கம்'), go: 'panchangam' },
    { label: T(lang, 'Festivals & vratham calendar', 'விழாக்கள் & விரதங்கள் நாட்காட்டி'), go: 'festivals' },
  ], SOURCES(lang), { date: iso, tithi: d.tithi.index, star: d.nakshatra.index, yoga: d.yoga.index });
}

function upcomingAnswer(lang, now, loc, tz, kindFilter) {
  const iso = isoOf(now, tz);
  const occ = occurrencesBetween(iso, 60, loc, tz).map((o) => ({ o, e: BY_ID.get(o.id) }))
    .filter((x) => x.e && x.e.listed !== false && (kindFilter ? x.e.kind === kindFilter : x.e.kind === 'festival')).slice(0, 8);
  const lines = occ.map(({ o, e }) => `${fmtDay(o.date, lang, { year: false })} — ${pick(e.names, lang)}: ${pick(e.line, lang)}`);
  return finish('upcoming', [sec('upcoming', T(lang, kindFilter === 'vratham' ? 'Coming vratham days' : 'Coming festivals', kindFilter === 'vratham' ? 'வரவிருக்கும் விரத நாட்கள்' : 'வரவிருக்கும் பண்டிகைகள்'),
    lines.length ? lines : [T(lang, 'Nothing major in the next 60 days.', 'அடுத்த 60 நாட்களில் பெரிய பண்டிகை இல்லை.')])],
  [{ label: T(lang, 'Full 365-day list', 'முழு 365 நாள் பட்டியல்'), go: 'festivals' }], SOURCES(lang));
}

function peyarchiWhen(e, lang, now, tz) {
  const planet = e.planet;
  if (!planet) return [];
  const c = currentPeyarchi(now)[planet];
  if (!c) return [];
  const lines = [T(lang, `${e.names.en.replace(' Peyarchi', '')} is now in ${RASIS[c.rasi].en}.`, `இப்போது ${RASIS[c.rasi].ta} ராசியில் உள்ளது.`)];
  if (c.next) lines.push(T(lang, `Next change: ${fmtDay(isoOf(c.next, tz), 'en')} into ${RASIS[c.nextRasi].en}${c.nextRetro ? ' (while retrograde — temporary)' : ''}.`,
    `அடுத்த பெயர்ச்சி: ${fmtDay(isoOf(c.next, tz), 'ta')} — ${RASIS[c.nextRasi].ta} ராசிக்கு${c.nextRetro ? ' (வக்கிர நிலையில் — தற்காலிகம்)' : ''}.`));
  lines.push(T(lang, 'Thirukanitha (this app) and Vakya almanacs can give different peyarchi dates — temples usually follow one of them.', 'திருக்கணிதம் (இந்தச் செயலி), வாக்கியப் பஞ்சாங்கம் இரண்டிலும் பெயர்ச்சி தேதிகள் வேறுபடலாம் — கோவில்கள் ஏதேனும் ஒன்றைப் பின்பற்றுகின்றன.'));
  return lines;
}

function eclipseWhen(lang, now, loc, tz) {
  const lines = [];
  try {
    const obs = new A.Observer(loc.lat, loc.lon, 0);
    let t = now;
    for (let k = 0; k < 6 && lines.length < 2; k++) {
      const le = A.SearchLunarEclipse(t);
      const peak = le.peak.date;
      const hor = A.Horizon(le.peak, obs, ...(() => { const eq = A.Equator('Moon', le.peak, obs, true, true); return [eq.ra, eq.dec]; })(), 'normal');
      if (hor.altitude > 0) {
        const kind = { penumbral: T(lang, 'penumbral (very faint — usually not observed)', 'புறநிழல் (மிக மங்கல் — பொதுவாக அனுசரிப்பதில்லை)'), partial: T(lang, 'partial', 'பகுதி'), total: T(lang, 'total', 'முழு') }[le.kind];
        lines.push(T(lang, `Lunar eclipse (Chandra grahanam): ${fmtDay(isoOf(peak, tz), 'en')}, peak ${fmtClock(peak, tz, 'en', false)} — ${kind}, visible from ${loc.name || 'your place'}.`,
          `சந்திர கிரகணம்: ${fmtDay(isoOf(peak, tz), 'ta')}, உச்சம் ${fmtClock(peak, tz, 'ta', false)} — ${kind}, ${loc.name || 'உங்கள் ஊரில்'} தெரியும்.`));
      }
      t = new Date(peak.getTime() + 10 * DAY);
    }
    const se = A.SearchLocalSolarEclipse(now, obs);
    const sp = se.peak.time.date;
    if (se.peak.altitude > 0 && sp.getTime() - now.getTime() < 2 * 365 * DAY) {
      lines.push(T(lang, `Solar eclipse (Surya grahanam): ${fmtDay(isoOf(sp, tz), 'en')}, peak ${fmtClock(sp, tz, 'en', false)} — ${se.kind}, visible from ${loc.name || 'your place'}. Never look at the Sun directly.`,
        `சூரிய கிரகணம்: ${fmtDay(isoOf(sp, tz), 'ta')}, உச்சம் ${fmtClock(sp, tz, 'ta', false)} — ${loc.name || 'உங்கள் ஊரில்'} தெரியும். சூரியனை நேரடியாகப் பார்க்க வேண்டாம்.`));
    }
  } catch { /* astronomy failure: explanation only */ }
  if (!lines.length) lines.push(T(lang, 'No eclipse visible from your place in the coming months.', 'வரும் மாதங்களில் உங்கள் ஊரில் கிரகணம் தெரியாது.'));
  return lines;
}

function characterAnswer(c, lang, intents) {
  const sections = [sec('who', T(lang, `Who is ${c.names.en}?`, `${c.names.ta} யார்?`), [pick(c.who, lang)])];
  if (c.story) sections.push(sec('story', T(lang, 'Key events', 'முக்கிய நிகழ்வுகள்'), [pick(c.story, lang)]));
  if (c.lesson) sections.push(sec('lesson', T(lang, 'What we learn', 'நாம் கற்பது'), [pick(c.lesson, lang)]));
  const epic = { ramayanam: T(lang, 'Ramayanam', 'இராமாயணம்'), mahabharatham: T(lang, 'Mahabharatham', 'மகாபாரதம்'), puranam: T(lang, 'Puranam', 'புராணம்') }[c.epic];
  sections.push(sec('source', T(lang, 'Source', 'மூலம்'), [`${epic}${c.note ? ` — ${pick(c.note, lang)}` : ''}`]));
  const followups = [{ label: T(lang, 'Read the Ithihasa series', 'இதிகாசத் தொடர் படிக்க'), go: 'ithihasa', params: { epic: c.epic, character: c.id } }];
  for (const id of c.related || []) { const r = CHAR_BY_ID.get(id); if (r) followups.push({ label: T(lang, `Who is ${r.names.en}?`, `${r.names.ta} யார்?`), ask: T(lang, `who is ${r.names.en}`, `${r.names.ta} யார்`) }); }
  return finish('ithihasa', sections, followups.slice(0, 4), [T(lang, `${epic} (traditional retellings; versions differ)`, `${epic} (மரபுக் கதைகள்; பதிப்புகள் வேறுபடலாம்)`)], { id: c.id, intents });
}

/**
 * Answer an everyday festival / vratham / panchangam / Ithihasa question offline.
 * @returns {null | { topic, sections: [{ key, title, lines }], text, followups, sources, id?, dates? }}
 */
export function answerGeneral(question, { lang = 'ta', now = new Date(), loc = DEFAULT_LOC, tz = 5.5, faith = 'hindu' } = {}) {
  const m = matchQuestion(question);
  if (!m) return null;
  lang = lang === 'en' ? 'en' : 'ta';
  loc = { ...DEFAULT_LOC, ...(loc || {}) };
  if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lon)) loc = { ...DEFAULT_LOC };
  const h = tzHours(tz, now);
  const { entry: e, intents } = m;
  const hindu = !faith || faith === 'hindu';

  if (!e) {
    if (CHART_WORDS.test(m.n)) return null;
    if ((intents.includes('today') || intents.includes('tomorrow')) && PANCHANG_WORDS.test(m.n)) return todayAnswer(lang, now, loc, h, intents.includes('tomorrow') && !intents.includes('today') ? 1 : 0);
    if (/(?:^|\s)(titi|natcatiram|naksatra|nakshatra|iogam)(?=\s|$)|திதி|நட்சத்திரம்|யோகம்/.test(m.n) && (intents.includes('why') || intents.length === 0)) return todayAnswer(lang, now, loc, h, 0);
    if (UPCOMING.test(m.n) && (intents.includes('when') || intents.includes('today') || /(?:^|\s)(list|month|masam|matam|upcoming|varum)(?=\s|$)|மாத|பட்டியல்/.test(m.n))) {
      return upcomingAnswer(lang, now, loc, h, /(?:^|\s)(vratangal|viratangal|vratams|vratam|viratam)(?=\s|$)|விரத/.test(m.n) ? 'vratham' : null);
    }
    return null;
  }
  if (m.char) return characterAnswer(e, lang, intents);
  if (e.kind === 'concept' && e.personalNull && (CHART_WORDS.test(m.n) || PERSONAL.test(m.n))) return null;
  if (e.needIntent && !intents.some((k) => ['why', 'how', 'when'].includes(k))) return null;

  const wantWhen = intents.includes('when') || intents.includes('today') || intents.includes('tomorrow') || m.year != null;
  const wantWhy = intents.includes('why');
  const wantHow = intents.includes('how');
  const all = !wantWhen && !wantWhy && !wantHow;
  const sections = [];
  if (!hindu) sections.push(sec('note', T(lang, 'For information', 'தகவலுக்காக'), [pick(NON_HINDU_NOTE, lang)]));
  sections.push(sec('about', pick(e.names, lang), [pick(e.line, lang), e.deity ? `${T(lang, 'Deity', 'தெய்வம்')}: ${pick(e.deity, lang)}` : '']));

  let dates = [];
  if (wantWhen || all) {
    if (e.rule) {
      let from = now;
      let days = 400;
      if (m.year != null) { from = `${m.year}-01-01`; days = 366; }
      const fromIso = typeof from === 'string' ? from : isoOf(from, h);
      const count = m.year != null ? (e.kind === 'monthly' || e.kind === 'ekadasi' ? 30 : 4) : (e.kind === 'monthly' ? 3 : e.rule.weekly != null ? 5 : 1);
      dates = occurrencesBetween(fromIso, days, loc, h).filter((o) => o.id === e.id).slice(0, count);
      if (m.year != null) dates = dates.filter((o) => o.date.startsWith(String(m.year)) || (o.end || '').startsWith(String(m.year)));
      if (m.year != null && e.kind === 'monthly') dates = dates.slice(0, 26);
      sections.push(sec('when', T(lang, m.year ? `Dates in ${m.year}` : 'Next date', m.year ? `${m.year} தேதிகள்` : 'அடுத்த தேதி'), whenLines(e, dates, lang, loc, h, now)));
    } else if (e.planet) sections.push(sec('when', T(lang, 'Dates', 'தேதிகள்'), peyarchiWhen(e, lang, now, h)));
    else if (e.id === 'grahanam') sections.push(sec('when', T(lang, 'Next eclipses for your place', 'உங்கள் ஊரில் அடுத்த கிரகணங்கள்'), eclipseWhen(lang, now, loc, h)));
    else if (e.whenText) sections.push(sec('when', T(lang, 'When', 'எப்போது'), [pick(e.whenText, lang)]));
  }
  const parts = [];
  if (wantWhy || all) parts.push('why', 'story', 'extra');
  if (wantHow || all) parts.push('how', 'fast', 'offer', 'mantra');
  if (all || wantWhy) parts.push('temples', 'regional');
  if (wantHow && !wantWhy) parts.push('temples');
  if (wantWhen && !wantWhy && !wantHow) parts.push('why');
  if (!wantWhen && !all && e.rule) {
    const fromIso = isoOf(now, h);
    const nx = occurrencesBetween(fromIso, 400, loc, h).find((o) => o.id === e.id);
    if (nx) { dates = [nx]; sections.push(sec('next', T(lang, 'Next date', 'அடுத்த தேதி'), [whenLines(e, [nx], lang, loc, h, now)[0]])); }
  }
  sections.push(...entrySections(e, lang, { faith, parts }));
  return finish(e.id, sections, followupsFor(e, lang, intents), SOURCES(lang), { id: e.id, dates: dates.map((o) => ({ date: o.date, end: o.end || null })) });
}
