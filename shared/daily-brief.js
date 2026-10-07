// Morning brief (காலைக் குறிப்பு) — three short, warm lines for the active person each morning, plus the optional
// evening lamp time (சந்தியா தீபம்), the Sunday "your week ahead" and the 1st-of-month "your month" summaries.
// Pure: no DOM, no storage, no network — runs on the phone (Today card, local notifications) and in tests.
//
//   1. quality  — today's quality for THIS person (Chandrashtamam, Tara balam, Chandra balam: shared/daily.js logic)
//   2. do       — one thing to do in today's next good window (Gowri nalla neram outside Rahu Kalam / Yamagandam)
//   3. spirit   — one spiritual touch: today's festival / vratham, else the day's deity and mantra (Hindu); for
//                 every other faith a practice that fits all faiths (shared/faith.js) — never a deity puja.
// Age first (shared/age-guard.js): minors get study / play lines, no money, marriage or business topics and no
// fasting advice; a small child's brief is written for the caregiver. Wording is reflective ("tradition says"),
// never a promise, never fear (findProhibited in shared/themes.js scans every line in the tests).
import { panchang, RASIS, NAKSHATRAS, PLANETS } from './astro.js';
import { tamilDay } from './tamilcal.js';
import { dailyReview, dayVerdict, DAY_DEITY, runningDasa } from './daily.js';
import { dayPartTa, planetAdjTa } from './fmt.js';
import { ageProfile } from './age-guard.js';
import { isHinduFaith, universalPractice, faithBlessing, CHILD_PRACTICE } from './faith.js';
import { getEntry } from './spiritual-kb.js';

const T = (en, ta) => ({ en, ta });
const DAY = 86400000;

/** Default settings for the whole "daily companion" feature set (Settings → Daily brief & reminders). */
export const BRIEF_DEFAULTS = Object.freeze({
  showBrief: true,       // the morning brief card on Today
  notify: false,         // phone notification for the brief (asks permission only when switched on)
  morningTime: '06:30',  // local time at the residence
  sandhya: false,        // evening lamp-lighting reminder at sunset
  weekly: true,          // Sunday "your week ahead"
  monthly: true,         // 1st of the month "your month"
  welcome: true,         // first-week welcome cards
  milestones: true,      // celebrate the person's own milestones
  sharePrompt: true,     // at most once a month, only after the person marked something helpful
  markButtons: true,     // "✓ This helped" buttons on guidance cards
  journalBackup: false,  // diary in the account backup (also needs the backup consent)
});

/** Normalise stored settings (unknown keys dropped, bad values replaced by defaults). */
export function briefSettings(raw = {}) {
  const out = { ...BRIEF_DEFAULTS };
  for (const [k, d] of Object.entries(BRIEF_DEFAULTS)) {
    const v = raw?.[k];
    if (typeof d === 'boolean' && typeof v === 'boolean') out[k] = v;
    if (k === 'morningTime' && typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)) out[k] = v;
  }
  return out;
}
/** Every reminder, prompt and notification off (one switch in Settings). The brief card itself stays as chosen. */
export const allOff = (s) => ({ ...briefSettings(s), notify: false, sandhya: false, weekly: false, monthly: false, welcome: false, milestones: false, sharePrompt: false, markButtons: false });

// ---------------------------------------------------------------- time helpers (fixed offset in hours)
const pad = (n) => String(n).padStart(2, '0');
/** 'YYYY-MM-DD' of an instant at a UTC offset. */
export const isoAt = (at, tz) => new Date(new Date(at).getTime() + tz * 3600000).toISOString().slice(0, 10);
/** The instant of a local wall-clock time on a civil date at a UTC offset. */
export function instantAt(iso, hm, tz) {
  const [y, m, d] = iso.split('-').map(Number);
  const [h, mi] = String(hm || '00:00').split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, h, mi) - tz * 3600000);
}
export const addDaysIso = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
/** "காலை 9:10" / "9:10 AM" — same wording as the app's clock (public/core.js fmtTime). */
export function fmtHM(at, tz, lang = 'ta') {
  const x = new Date(new Date(at).getTime() + tz * 3600000);
  const h = x.getUTCHours();
  const hm = `${((h + 11) % 12) + 1}:${pad(x.getUTCMinutes())}`;
  if (lang === 'ta') return `${dayPartTa(h)} ${hm}`;
  return `${hm} ${h < 12 ? 'AM' : 'PM'}`;
}
const both = (fn) => T(fn('en'), fn('ta'));
/** "காலை 7:28 – 8:57" (the part of day is said once when both ends share it). */
const range = (a, b, tz) => both((l) => {
  const x = fmtHM(a, tz, l), y = fmtHM(b, tz, l);
  if (l === 'ta' && x.split(' ')[0] === y.split(' ')[0]) return `${x} – ${y.split(' ')[1]}`;
  if (l === 'en' && x.slice(-2) === y.slice(-2)) return `${x.slice(0, -3)} – ${y}`;
  return `${x} – ${y}`;
});
const WD = [T('Sun', 'ஞாயிறு'), T('Mon', 'திங்கள்'), T('Tue', 'செவ்வாய்'), T('Wed', 'புதன்'), T('Thu', 'வியாழன்'), T('Fri', 'வெள்ளி'), T('Sat', 'சனி')];
const MON = [T('Jan', 'ஜனவரி'), T('Feb', 'பிப்ரவரி'), T('Mar', 'மார்ச்'), T('Apr', 'ஏப்ரல்'), T('May', 'மே'), T('Jun', 'ஜூன்'), T('Jul', 'ஜூலை'), T('Aug', 'ஆகஸ்ட்'), T('Sep', 'செப்டம்பர்'), T('Oct', 'அக்டோபர்'), T('Nov', 'நவம்பர்'), T('Dec', 'டிசம்பர்')];
/** "Tue 13" / "செவ்வாய் 13". */
export const dayLabel = (iso) => { const d = new Date(`${iso}T12:00:00Z`); const w = WD[d.getUTCDay()]; return T(`${w.en} ${d.getUTCDate()}`, `${w.ta} ${d.getUTCDate()}`); };
export const dateLabel = (iso) => { const d = new Date(`${iso}T12:00:00Z`); const m = MON[d.getUTCMonth()]; return T(`${d.getUTCDate()} ${m.en} ${d.getUTCFullYear()}`, `${d.getUTCDate()} ${m.ta} ${d.getUTCFullYear()}`); };
export const monthLabel = (ym) => { const [y, m] = ym.split('-').map(Number); return T(`${MON[m - 1].en} ${y}`, `${MON[m - 1].ta} ${y}`); };

// ---------------------------------------------------------------- good window
/**
 * The next good window of the day from `from`: a Gowri nalla neram slot (day part) with Rahu Kalam and Yamagandam
 * cut out, at least 20 minutes long. Returns { start, end, name } or null.
 */
export function goodWindow(td, from) {
  const t0 = new Date(from).getTime();
  const bad = [td.rahuKalam, td.yamagandam].filter(Boolean).map((k) => [new Date(k.start).getTime(), new Date(k.end).getTime()]);
  const slots = (td.gowri || []).filter((g) => g.good && g.part === 'day').map((g) => ({ s: new Date(g.start).getTime(), e: new Date(g.end).getTime(), g }))
    .sort((a, b) => a.s - b.s);
  for (const sl of slots) {
    let pieces = [[Math.max(sl.s, t0), sl.e]];
    for (const [bs, be] of bad) pieces = pieces.flatMap(([s, e]) => (be <= s || bs >= e ? [[s, e]] : [[s, bs], [be, e]]));
    const ok = pieces.find(([s, e]) => e - s >= 20 * 60000);
    if (ok) return { start: new Date(ok[0]), end: new Date(ok[1]), name: T(sl.g.en, sl.g.ta) };
  }
  return null;
}

// ---------------------------------------------------------------- day quality
/** The one day score (shared/daily.js dayVerdict) — the same verdict Today, the family list and Panchangam show. */
export function dayQuality(chart, snap, now = new Date()) {
  const v = dayVerdict(chart, snap, now);
  return { level: v.level, label: v.label, score: v.score, chandra: v.chandra, chandrashtamam: v.chandrashtamam, tara: v.tara };
}

// ---------------------------------------------------------------- the three lines
const FASTING = /\bfast|viratham|vratham|விரதம்|உண்ணா|skip rice|அரிசி/i;
/** Today's main festival / vratham entry (festival before vratham; "month begins" last). */
function mainFestival(festivals = []) {
  const rank = (f) => (f.id === 'month-start' ? 2 : f.kind === 'festival' ? 0 : 1);
  return [...festivals].filter((f) => f && f.en).sort((a, b) => rank(a) - rank(b))[0] || null;
}
/** A festival's meaning line for greetings and the brief: { name, line, deity } (KB first, calendar name fallback). */
export function festivalInfo(f) {
  if (!f) return null;
  const e = getEntry(f.id);
  if (f.id === 'month-start') return { id: f.id, kind: 'month', name: T(f.en, f.ta), line: T('A new Tamil month begins — start it with a prayer and a clean home.', 'புதிய தமிழ் மாதம் பிறக்கிறது — வழிபாட்டுடனும் சுத்தமான வீட்டுடனும் தொடங்குங்கள்.'), deity: null };
  return { id: f.id, kind: f.kind, name: T(f.en, f.ta), line: e?.line ? T(e.line.en, e.line.ta) : T('A sacred day — pray with your family.', 'புனித நாள் — குடும்பத்துடன் வழிபடுங்கள்.'), deity: e?.deity ? T(e.deity.en, e.deity.ta) : null };
}

/**
 * The morning brief for one person.
 * @param {object} o { chart|null, member|null ({ name/display, date, relation }), name (display), loc { lat, lon, tz },
 *   now (Date), faith ('hindu'…), td (tamilDay, optional), snap (panchang, optional), from (Date: windows start here) }
 * @returns {{ date, personal, minor, band, level, greeting, lines: [{ key, icon, text:{en,ta} }], window, rahu, blessing }}
 */
export function morningBrief(o = {}) {
  const loc = o.loc;
  if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lon)) throw new Error('morningBrief needs a loc');
  const tz = Number(loc.tz ?? 5.5);
  const now = o.now ? new Date(o.now) : new Date();
  const date = isoAt(now, tz);
  const td = o.td || tamilDay(instantAt(date, '12:00', tz), loc.lat, loc.lon, tz);
  const snap = o.snap || panchang(now, loc.lat, loc.lon, tz);
  const chart = o.chart || null;
  const faith = o.faith || 'hindu';
  const hindu = isHinduFaith(faith);
  const prof = o.member ? ageProfile(o.member, { tz, now }) : chart ? ageProfile(chart, { tz, now }) : ageProfile(null);
  const age = prof.age ?? 30;
  const minor = Boolean(prof.minor);
  const small = prof.band === '0-5';
  const name = String(o.name || '').slice(0, 40);
  const lines = [];

  // 1. Quality for the person.
  let q = null;
  if (chart) {
    const r = dailyReview(chart, snap, now, { faith });
    q = { level: r.level, chandrashtamam: r.chandrashtamam, tara: r.tara };
    const star = NAKSHATRAS[snap.nakshatra.index];
    const tara = r.tara.name;
    let text;
    if (small) text = r.chandrashtamam || r.level === 'care'
      ? T('A day for a calm, restful routine for the little one — keep the home quiet and gentle.', 'குழந்தைக்கு அமைதியான, ஓய்வான ஒழுங்கு நல்லது — வீட்டை அமைதியாக, மென்மையாக வைத்திருங்கள்.')
      : T('A pleasant day for the little one — play, songs and family time.', 'குழந்தைக்கு இனிய நாள் — விளையாட்டு, பாடல், குடும்ப நேரம்.');
    else if (r.chandrashtamam) text = minor
      ? T('Chandrashtamam today — stay calm and patient; it is a quiet day, nothing to worry about.', 'இன்று சந்திராஷ்டமம் — அமைதியாக, பொறுமையாக இருங்கள்; இது அமைதியாகக் கடக்க வேண்டிய நாள், கவலை வேண்டாம்.')
      : T('Chandrashtamam today — go gently and keep big decisions for another day.', 'இன்று சந்திராஷ்டமம் — நிதானமாக இருங்கள்; பெரிய முடிவுகளை வேறு நாளுக்கு வையுங்கள்.');
    else if (r.level === 'great') text = T(`An excellent day for you — today's star ${star.en} is ${tara.en} tara for you, and the Moon supports you.`, `இன்று உங்களுக்குச் சிறப்பான நாள் — இன்றைய ${star.ta} உங்களுக்கு ${tara.ta} தாரை; சந்திர பலமும் உண்டு.`);
    else if (r.level === 'good') text = T(`A good day for you — today's star ${star.en} is ${tara.en} tara for you.`, `இன்று உங்களுக்கு நல்ல நாள் — இன்றைய ${star.ta} உங்களுக்கு ${tara.ta} தாரை.`);
    else if (r.level === 'steady') text = T('A steady day — keep things simple and unhurried.', 'இன்று நிலையான நாள் — எளிமையாக, நிதானமாக நடத்துங்கள்.');
    else text = T(`A careful day — today's star is ${tara.en} tara for you; keep new beginnings for a better day.`, `இன்று கவனமான நாள் — இன்றைய நட்சத்திரம் உங்களுக்கு ${tara.ta} தாரை; புதிய தொடக்கங்களை வேறு நாளுக்கு வையுங்கள்.`);
    lines.push({ key: 'quality', icon: q.level === 'great' || q.level === 'good' ? '🌞' : r.chandrashtamam ? '🌙' : '🌤️', text });
  } else {
    const star = NAKSHATRAS[snap.nakshatra.index];
    lines.push({ key: 'quality', icon: '🌤️', text: T(`Today is ${td.weekday.en}, ${star.en} star. Add birth details to see what the day means for you.`, `இன்று ${td.weekday.ta}, ${star.ta} நட்சத்திரம். பிறப்பு விவரம் சேர்த்தால் உங்களுக்கான தனிப் பலன் கிடைக்கும்.`) });
  }

  // 2. One thing to do, in the next good window (never inside Rahu Kalam / Yamagandam).
  const from = o.from ? new Date(o.from) : now;
  const win = goodWindow(td, from);
  const rk = td.rahuKalam || snap.rahuKalam;
  const level = q?.level || 'steady';
  const what = small ? T('a calm time for play and a story with the little one', 'குழந்தையுடன் விளையாட, கதை சொல்ல அமைதியான நேரம்')
    : minor ? T('a good time for the hardest subject or homework', 'கடினமான பாடம், வீட்டுப்பாடம் படிக்க ஏற்ற நேரம்')
      : level === 'great' || level === 'good' ? T('a good time to begin important work', 'முக்கியமான வேலையைத் தொடங்க ஏற்ற நேரம்')
        : level === 'steady' ? T('a good time to move ongoing work forward', 'நடக்கும் வேலையை முன்னெடுக்க ஏற்ற நேரம்')
          : T('a quiet time to finish routine work', 'வழக்கமான வேலைகளை அமைதியாக முடிக்க ஏற்ற நேரம்');
  const rkR = rk ? range(rk.start, rk.end, tz) : null;
  const rkText = rk && new Date(rk.end) > from ? T(` (avoid Rahu Kalam ${rkR.en})`, ` (ராகு காலம் ${rkR.ta} தவிர்க்கவும்)`) : T('', '');
  if (win) {
    const w = range(win.start, win.end, tz);
    lines.push({ key: 'do', icon: '⏰', text: T(`${w.en}: ${what.en}${rkText.en}.`, `${w.ta}: ${what.ta}${rkText.ta}.`) });
  } else {
    lines.push({ key: 'do', icon: '⏰', text: T(`Today's good times are over — a calm evening; plan tomorrow's work${rkText.en}.`, `இன்றைய நல்ல நேரம் முடிந்தது — அமைதியான மாலை; நாளைய வேலையைத் திட்டமிடுங்கள்${rkText.ta}.`) });
  }

  // 3. One spiritual touch (faith-aware, child-safe).
  const fe = mainFestival(td.festivals);
  const deity = DAY_DEITY[snap.weekday.index];
  let spirit;
  if (hindu) {
    const fi = fe ? festivalInfo(fe) : null;
    if (fi && minor && /amavasai/.test(fi.id)) {
      // Tharpanam is an adult's rite: a child remembers the elders with a short prayer.
      spirit = T(`Today is ${fi.name.en} — remember the family elders with gratitude and a short prayer.`, `இன்று ${fi.name.ta} — குடும்ப முன்னோர்களை நன்றியுடன் நினைத்து ஒரு சிறு பிரார்த்தனை.`);
    } else if (fi && (minor || age >= 60) && FASTING.test(fi.line.en + fi.line.ta)) {
      spirit = minor
        ? T(`Today is ${fi.name.en} — a short prayer is enough; children need not fast.`, `இன்று ${fi.name.ta} — ஒரு சிறு பிரார்த்தனை போதும்; குழந்தைகள் விரதம் இருக்க வேண்டியதில்லை.`)
        : T(`Today is ${fi.name.en} — a simple prayer is enough; fast only if your health allows.`, `இன்று ${fi.name.ta} — எளிய பிரார்த்தனை போதும்; உடல்நலம் அனுமதித்தால் மட்டும் விரதம்.`);
    } else if (fi) spirit = T(`Today is ${fi.name.en}: ${fi.line.en}`, `இன்று ${fi.name.ta} — ${fi.line.ta}`);
    else spirit = T(`God of the day: ${deity.god.en} — “${deity.mantra.en.split(' · ')[0]}”.`, `இன்றைய தெய்வம்: ${deity.god.ta} — “${deity.mantra.ta.split(' · ')[0]}”.`);
  } else {
    const p = minor ? CHILD_PRACTICE : universalPractice(snap.weekday.lord || 'Sun');
    spirit = T(`For today: ${p.en}`, `இன்றைக்கு: ${p.ta}`);
  }
  lines.push({ key: 'spirit', icon: hindu ? '🪔' : '🌿', text: spirit });

  const greeting = name ? T(`Good morning, ${name}`, `காலை வணக்கம், ${name}`) : T('Good morning', 'காலை வணக்கம்');
  return {
    date, personal: Boolean(chart), minor, band: prof.band, level, chandrashtamam: Boolean(q?.chandrashtamam), faith: hindu ? 'hindu' : faith,
    greeting, lines, window: win, rahu: rk || null, festival: fe ? festivalInfo(fe) : null,
    blessing: hindu ? null : faithBlessing(faith),
  };
}

/** Notification text for a brief: { title, body } in one language. */
export function briefNotification(b, lang = 'ta') {
  const pick = (x) => (lang === 'ta' ? x.ta : x.en);
  return { title: `🌅 ${pick(b.greeting)}`, body: b.lines.map((l) => `${l.icon} ${pick(l.text)}`).join('\n') };
}

// ---------------------------------------------------------------- evening lamp (sandhya)
/** Evening lamp-lighting time: sunset of the day. Returns { at, text } (faith-aware) or null. */
export function sandhyaReminder({ loc, date, faith = 'hindu', td = null }) {
  const tz = Number(loc.tz ?? 5.5);
  const day = td || tamilDay(instantAt(date, '12:00', tz), loc.lat, loc.lon, tz);
  if (!day?.sunset) return null;
  const at = new Date(day.sunset);
  const t = both((l) => fmtHM(at, tz, l));
  const text = isHinduFaith(faith)
    ? T(`Sunset at ${t.en} — time to light the evening lamp (sandhya deepam).`, `${t.ta} சூரிய அஸ்தமனம் — மாலை விளக்கேற்றும் நேரம் (சந்தியா தீபம்).`)
    : T(`Sunset at ${t.en} — a quiet moment of evening prayer in your own way.`, `${t.ta} சூரிய அஸ்தமனம் — உங்கள் வழக்கப்படி ஓர் அமைதியான மாலைப் பிரார்த்தனை.`);
  return { at, text };
}

// ---------------------------------------------------------------- week / month summaries
function daysInfo(chart, loc, isos) {
  const tz = Number(loc.tz ?? 5.5);
  return isos.map((iso) => {
    const td = tamilDay(instantAt(iso, '12:00', tz), loc.lat, loc.lon, tz);
    const q = chart ? dayQuality(chart, panchang(instantAt(iso, '09:00', tz), loc.lat, loc.lon, tz), instantAt(iso, '09:00', tz)) : null;
    return { date: iso, td, q, festivals: (td.festivals || []).filter((f) => f && f.en) };
  });
}
const listDays = (ds, lang) => ds.map((d) => dayLabel(d.date)[lang]).join(', ');

/**
 * Sunday "your week ahead": good days, care days (Chandrashtamam), and (Hindu) the coming vratham / festival days.
 * @returns {{ start, end, lines:[{icon,text}], good:[iso], care:[iso], festivals:[{date,name}] }}
 */
export function weekAhead({ chart = null, loc, start, faith = 'hindu', member = null, now = new Date() }) {
  const tz = Number(loc.tz ?? 5.5);
  const s = start || isoAt(now, tz);
  const ds = daysInfo(chart, loc, Array.from({ length: 7 }, (_, i) => addDaysIso(s, i)));
  return summarise(ds, { chart, faith, member, now, tz, kind: 'week' });
}

/** 1st of the month "your month": good-day count, care days, main festivals and the running Dasa / Bhukti. */
export function monthAhead({ chart = null, loc, month, faith = 'hindu', member = null, now = new Date() }) {
  const tz = Number(loc.tz ?? 5.5);
  const ym = month || isoAt(now, tz).slice(0, 7);
  const [y, m] = ym.split('-').map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const ds = daysInfo(chart, loc, Array.from({ length: n }, (_, i) => `${ym}-${pad(i + 1)}`));
  return summarise(ds, { chart, faith, member, now, tz, kind: 'month', ym });
}

function summarise(ds, { chart, faith, member, now, tz, kind, ym }) {
  const hindu = isHinduFaith(faith);
  const prof = member ? ageProfile(member, { tz, now }) : chart ? ageProfile(chart, { tz, now }) : ageProfile(null);
  const good = ds.filter((d) => d.q && (d.q.level === 'great' || d.q.level === 'good'));
  const care = ds.filter((d) => d.q && d.q.chandrashtamam);
  const fests = ds.flatMap((d) => d.festivals.filter((f) => (kind === 'month' ? f.kind === 'festival' && f.id !== 'month-start' : true)).map((f) => ({ date: d.date, name: T(f.en, f.ta), kind: f.kind })));
  const lines = [];
  const T2 = (fn) => T(fn('en'), fn('ta'));
  if (chart) {
    if (kind === 'week') {
      const top = [...good].sort((a, b) => b.q.score - a.q.score).slice(0, 3).sort((a, b) => a.date.localeCompare(b.date));
      lines.push(top.length
        ? { icon: '🌞', text: T2((l) => (l === 'ta' ? `இந்த வாரம் உங்களுக்கு நல்ல நாட்கள்: ${listDays(top, l)}` : `Good days for you this week: ${listDays(top, l)}`)) }
        : { icon: '🌤️', text: T('A steady week — keep a calm, regular routine.', 'சீரான வாரம் — அமைதியான, ஒழுங்கான நாட்களாக நடத்துங்கள்.') });
    } else {
      lines.push({ icon: '🌞', text: T2((l) => (l === 'ta' ? `இந்த மாதம் உங்களுக்கு ${good.length} நல்ல நாட்கள் — முக்கிய வேலைகளை அவற்றில் திட்டமிடலாம்.` : `${good.length} good days for you this month — plan important work on them.`)) });
    }
    if (care.length) {
      lines.push({ icon: '🌙', text: prof.minor
        ? T2((l) => (l === 'ta' ? `அமைதியாக இருக்க வேண்டிய நாட்கள்: ${listDays(care, l)} (சந்திராஷ்டமம்)` : `Quiet, patient days: ${listDays(care, l)} (Chandrashtamam)`))
        : T2((l) => (l === 'ta' ? `கவனமான நாட்கள்: ${listDays(care, l)} (சந்திராஷ்டமம்) — பெரிய முடிவுகளை அந்த நாட்களில் தவிர்க்கவும்` : `Careful days: ${listDays(care, l)} (Chandrashtamam) — keep big decisions off these days`)) });
    }
    if (kind === 'month' && !prof.minor) {
      const first = new Date(`${ds[0].date}T06:00:00Z`), last = new Date(`${ds[ds.length - 1].date}T18:00:00Z`);
      const a = runningDasa(chart, first), b = runningDasa(chart, last);
      if (a.md && a.ad) {
        lines.push({ icon: '⏳', text: T(`${a.md.lord} Dasa – ${a.ad.lord} Bhukti is running for you.`, `உங்களுக்கு ${planetAdjTa(a.md.lord, PLANETS[a.md.lord].ta)} தசை – ${planetAdjTa(a.ad.lord, PLANETS[a.ad.lord].ta)} புக்தி நடக்கிறது.`) });
        if (b.ad && b.ad.lord !== a.ad.lord) {
          const iso = isoAt(new Date(b.ad.start), tz);
          lines.push({ icon: '🔄', text: T2((l) => (l === 'ta' ? `${dateLabel(iso).ta} முதல் ${planetAdjTa(b.ad.lord, PLANETS[b.ad.lord].ta)} புக்தி தொடங்குகிறது.` : `${b.ad.lord} Bhukti begins on ${dateLabel(iso).en}.`)) });
        }
      }
    }
  } else {
    lines.push({ icon: '🌤️', text: T('Add birth details to see your good days and days for care.', 'உங்கள் நல்ல நாட்கள், கவனமான நாட்களைப் பார்க்கப் பிறப்பு விவரம் சேர்க்கவும்.') });
  }
  if (hindu && fests.length) {
    const top = fests.slice(0, kind === 'week' ? 3 : 4);
    lines.push({ icon: '🪔', text: T2((l) => (l === 'ta' ? `வரும் விசேஷ நாட்கள்: ${top.map((f) => `${f.name.ta} (${dayLabel(f.date).ta})`).join(', ')}` : `Sacred days ahead: ${top.map((f) => `${f.name.en} (${dayLabel(f.date).en})`).join(', ')}`)) });
  }
  const title = kind === 'week' ? T('Your week ahead', 'உங்கள் இந்த வாரம்') : T(`Your month — ${monthLabel(ym).en}`, `உங்கள் மாதம் — ${monthLabel(ym).ta}`);
  return { kind, start: ds[0].date, end: ds[ds.length - 1].date, title, lines, good: good.map((d) => d.date), care: care.map((d) => d.date), festivals: fests };
}

/** Star / rasi names for share cards of the person's OWN day (never someone else's birth data). */
export const starName = (i) => NAKSHATRAS[i];
export const rasiName = (i) => RASIS[i];
