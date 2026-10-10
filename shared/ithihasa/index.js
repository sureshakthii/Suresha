// Daily Ithihasa (இதிகாசத் தொடர்) — a ~15-minute Tamil urai (story-telling) each day, with continuity.
// Pure module (no DOM): the app screen (public/screens-ithihasa.js), the tests and any future server use share it.
//
// ─────────────────────────────────────────────────────────────── SERIES FILE FORMAT (shared by every series)
// Each series lives in its own file in this folder and exports ONE constant:
//
//   export const SERIES = {
//     id: 'ramayanam',                       // must match the id in SERIES_META below
//     title:  { ta, en },                    // "இராமாயணம்" / "Ramayanam"
//     source: { ta, en },                    // which text it follows (e.g. Valmiki, with Kamba notes)
//     intro:  { ta, en },                    // a short introduction shown before episode 1 (free for everyone)
//     episodes: [ EPISODE, ... ],            // numbered 1..N with no gaps, in story order
//   };
//
//   EPISODE = {
//     n: 1,                                  // 1-based, continuous
//     id: 'ram-01',                          // stable id (progress is stored by n, the id is for links/analytics)
//     part:    { ta, en },                   // kandam / parvam, e.g. { ta: 'பால காண்டம்', en: 'Bala Kandam' }
//     title:   { ta, en },
//     summary: { en, ta },                   // 2–3 sentences
//     ta: [ 'paragraph', ... ],              // the urai: ~1300–1600 Tamil words ≈ 15 minutes read aloud
//     moral:   { ta, en },                   // one-line takeaway
//     characters: ['rama', 'sita', ...],     // character ids (see CHARACTERS; unknown ids are allowed, just not shown)
//     next:    { ta, en },                   // "நாளை: ..." teaser for the following episode
//   };
//
// Writing rules (checked by test/ithihasa.test.js): devotional and respectful, faithful to the source, no invented
// events, no political or caste commentary, no fear wording (shared/themes.js findProhibited). Where Tamil tradition
// (e.g. Kamba Ramayanam, Villi Bharatham) differs from the Sanskrit source, say so inside the paragraph
// ("கம்பர் இதைச் சொல்லும் விதம்: …").
//
// Series files are loaded lazily (dynamic import with a non-literal path) so they are NOT in the service-worker
// precache; the network-first service worker keeps a copy after the first read, so a read episode works offline.

/** Approximate read-aloud speed of a calm Tamil urai (words per minute). 1300–1600 words ≈ 13–16 minutes. */
export const WORDS_PER_MINUTE = 100;
/** Free plan: the series intro, all of episode 1, and about the first 2 minutes of every later episode. */
export const FREE_FULL_EPISODES = 1;
export const PREVIEW_MINUTES = 2;

/** Every series, in display order. `file` is resolved relative to this module. */
export const SERIES_META = [
  { id: 'ramayanam', file: './ramayanam.js', title: { ta: 'இராமாயணம்', en: 'Ramayanam' }, icon: '🏹',
    blurb: { ta: 'வால்மீகி இராமாயணம் — ஏழு காண்டங்கள், கம்பர் சுவையுடன்', en: 'Valmiki Ramayanam — seven kandams, with Kamba Ramayanam notes' } },
  { id: 'mahabharatham', file: './mahabharatham.js', title: { ta: 'மகாபாரதம்', en: 'Mahabharatham' }, icon: '🪷',
    blurb: { ta: 'வியாசர் மகாபாரதம் — தர்மத்தின் பெருங்கதை', en: 'Vyasa’s Mahabharatham — the great story of dharma' } },
];

const cache = new Map();
/**
 * Load one series (cached). Resolves to the SERIES object, or null when the file is missing / not written yet.
 * @param {string} id
 */
export async function loadSeries(id) {
  const meta = SERIES_META.find((m) => m.id === id);
  if (!meta) return null;
  if (!cache.has(id)) {
    const spec = meta.file; // non-literal on purpose: keeps series data out of the precache walk
    cache.set(id, import(spec).then((m) => (m && m.SERIES && Array.isArray(m.SERIES.episodes) && m.SERIES.episodes.length ? m.SERIES : null)).catch(() => null));
  }
  return cache.get(id);
}

/** The series list with lazy loaders: [{ id, title, blurb, icon, load() }]. */
export const SERIES_LIST = SERIES_META.map((m) => ({ ...m, load: () => loadSeries(m.id) }));

// ─────────────────────────────────────────────────────────────── text helpers
/** Tamil word count of an episode's urai (whitespace-separated words). */
export const wordCount = (paras) => (Array.isArray(paras) ? paras : [paras]).join(' ').split(/\s+/).filter(Boolean).length;
/** Minutes to read aloud at a normal pace. */
export const minutesOf = (ep) => Math.max(1, Math.round(wordCount(ep?.ta || []) / WORDS_PER_MINUTE));
/** Number of paragraphs that make up the free ~2-minute preview (at least one). */
export function previewParas(ep, minutes = PREVIEW_MINUTES) {
  const target = minutes * WORDS_PER_MINUTE;
  let words = 0;
  const paras = ep?.ta || [];
  for (let i = 0; i < paras.length; i++) {
    words += wordCount(paras[i]);
    if (words >= target) return i + 1;
  }
  return paras.length;
}
/** First sentence of a text (for the one-line "previously" recap). */
const firstSentence = (s) => { const t = String(s || '').trim(); const m = /^(.+?[.!?।])(\s|$)/u.exec(t); return m ? m[1] : t; };
/** One-line recap of the previous episode, or '' for episode 1. lang: 'ta' | 'en'. */
export function previously(series, n, lang = 'ta') {
  const prev = series?.episodes?.find((e) => e.n === n - 1);
  return prev ? firstSentence(prev.summary?.[lang] || prev.summary?.en || '') : '';
}

/** Common character names (both series). Unknown ids are simply not shown as chips. */
export const CHARACTERS = {
  rama: { ta: 'இராமன்', en: 'Rama' }, sita: { ta: 'சீதை', en: 'Sita' }, lakshmana: { ta: 'இலக்குவன்', en: 'Lakshmana' },
  bharata: { ta: 'பரதன்', en: 'Bharata' }, shatrughna: { ta: 'சத்ருக்னன்', en: 'Shatrughna' }, dasaratha: { ta: 'தசரதன்', en: 'Dasaratha' },
  kausalya: { ta: 'கோசலை', en: 'Kausalya' }, kaikeyi: { ta: 'கைகேயி', en: 'Kaikeyi' }, sumitra: { ta: 'சுமித்திரை', en: 'Sumitra' },
  vasishtha: { ta: 'வசிஷ்டர்', en: 'Vasishtha' }, vishwamitra: { ta: 'விசுவாமித்திரர்', en: 'Vishwamitra' }, janaka: { ta: 'ஜனகர்', en: 'Janaka' },
  valmiki: { ta: 'வால்மீகி', en: 'Valmiki' }, narada: { ta: 'நாரதர்', en: 'Narada' }, ahalya: { ta: 'அகலிகை', en: 'Ahalya' },
  parashurama: { ta: 'பரசுராமர்', en: 'Parashurama' }, manthara: { ta: 'மந்தரை', en: 'Manthara' }, guha: { ta: 'குகன்', en: 'Guha' },
  sumantra: { ta: 'சுமந்திரர்', en: 'Sumantra' }, bharadvaja: { ta: 'பரத்வாஜர்', en: 'Bharadvaja' }, atri: { ta: 'அத்திரி', en: 'Atri' },
  anasuya: { ta: 'அனசூயை', en: 'Anasuya' }, agastya: { ta: 'அகத்தியர்', en: 'Agastya' }, jatayu: { ta: 'ஜடாயு', en: 'Jatayu' },
  surpanakha: { ta: 'சூர்ப்பணகை', en: 'Surpanakha' }, ravana: { ta: 'இராவணன்', en: 'Ravana' }, maricha: { ta: 'மாரீசன்', en: 'Maricha' },
  kabandha: { ta: 'கபந்தன்', en: 'Kabandha' }, shabari: { ta: 'சபரி', en: 'Shabari' }, hanuman: { ta: 'அனுமன்', en: 'Hanuman' },
  sugriva: { ta: 'சுக்ரீவன்', en: 'Sugriva' }, vali: { ta: 'வாலி', en: 'Vali' }, tara: { ta: 'தாரை', en: 'Tara' }, angada: { ta: 'அங்கதன்', en: 'Angada' },
  jambavan: { ta: 'ஜாம்பவான்', en: 'Jambavan' }, sampati: { ta: 'சம்பாதி', en: 'Sampati' }, vibhishana: { ta: 'வீடணன்', en: 'Vibhishana' },
  kumbhakarna: { ta: 'கும்பகர்ணன்', en: 'Kumbhakarna' }, indrajit: { ta: 'இந்திரஜித்', en: 'Indrajit' }, mandodari: { ta: 'மண்டோதரி', en: 'Mandodari' },
  trijata: { ta: 'திரிசடை', en: 'Trijata' }, nala: { ta: 'நளன்', en: 'Nala' }, lava: { ta: 'லவன்', en: 'Lava' }, kusha: { ta: 'குசன்', en: 'Kusha' },
  krishna: { ta: 'கிருஷ்ணன்', en: 'Krishna' }, arjuna: { ta: 'அர்ஜுனன்', en: 'Arjuna' }, yudhishthira: { ta: 'தருமன்', en: 'Yudhishthira' },
  bhima: { ta: 'பீமன்', en: 'Bhima' }, nakula: { ta: 'நகுலன்', en: 'Nakula' }, sahadeva: { ta: 'சகாதேவன்', en: 'Sahadeva' },
  draupadi: { ta: 'திரௌபதி', en: 'Draupadi' }, kunti: { ta: 'குந்தி', en: 'Kunti' }, bhishma: { ta: 'பீஷ்மர்', en: 'Bhishma' },
  drona: { ta: 'துரோணர்', en: 'Drona' }, karna: { ta: 'கர்ணன்', en: 'Karna' }, duryodhana: { ta: 'துரியோதனன்', en: 'Duryodhana' },
  vyasa: { ta: 'வியாசர்', en: 'Vyasa' }, vidura: { ta: 'விதுரர்', en: 'Vidura' }, dhritarashtra: { ta: 'திருதராஷ்டிரன்', en: 'Dhritarashtra' },
  gandhari: { ta: 'காந்தாரி', en: 'Gandhari' }, shakuni: { ta: 'சகுனி', en: 'Shakuni' },
};

// ─────────────────────────────────────────────────────────────── dates (residence calendar)
const ISO = /^\d{4}-\d{2}-\d{2}$/;
/**
 * Today's calendar date ('YYYY-MM-DD') where the person lives. zone: IANA name (preferred) or a numeric UTC offset in
 * hours. Episodes unlock by this date, so moving from Chennai to Dubai never skips or repeats a day by accident.
 */
export function todayIn(zone, now = new Date()) {
  const t = now instanceof Date ? now : new Date(now);
  if (typeof zone === 'string' && zone) {
    try {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(t).map((x) => [x.type, x.value]));
      if (p.year && p.month && p.day) return `${p.year}-${p.month}-${p.day}`;
    } catch { /* unknown zone → offset / UTC below */ }
  }
  const off = typeof zone === 'number' && Number.isFinite(zone) ? zone : 0;
  return new Date(t.getTime() + off * 3600000).toISOString().slice(0, 10);
}
/** Whole days from date a to date b ('YYYY-MM-DD'). */
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

// ─────────────────────────────────────────────────────────────── progress & continuity
// progress (per series, stored by the app under kj_ithihasa): {
//   startedOn: 'YYYY-MM-DD',          first day the person opened the series
//   done: { [n]: 'YYYY-MM-DD' },      completed episodes and the residence date each was completed
//   pos: { n, para, at },             where the reader stopped (episode, paragraph index, timestamp ms)
//   streak: { count, last },          consecutive residence days on which an episode was completed
// }
/** A fresh progress object. */
export const newProgress = (today) => ({ startedOn: today, done: {}, pos: null, streak: { count: 0, last: null } });
const norm = (p) => ({ startedOn: p?.startedOn || null, done: { ...(p?.done || {}) }, pos: p?.pos || null, streak: { count: 0, last: null, ...(p?.streak || {}) } });

/**
 * Highest unlocked episode number. Episode 1 is always open. Episode n+1 opens on the first residence day AFTER the
 * day episode n was completed — one new episode a day, never a pile-up of unread episodes after a break, and
 * completed episodes always stay open for re-reading.
 */
export function unlockedUpTo(progress, total, today) {
  const p = norm(progress);
  let n = 1;
  while (n < total) {
    const d = p.done[n];
    if (!d || !ISO.test(d) || !(d < today)) break;
    n++;
  }
  return Math.min(n, Math.max(total, 1));
}
/** Is episode n open for this person today? (Plan gating is separate — see episodeAccess.) */
export const isUnlocked = (progress, total, n, today) => n >= 1 && n <= unlockedUpTo(progress, total, today);

/**
 * What to show on the "Today's episode" card.
 * @returns {{ n:number, kind:'today'|'continue'|'resume'|'waiting'|'finished', para:number, nextOn?:string }}
 *   today    — a new episode opened today (or the first ever)
 *   continue — the current episode was opened on an earlier day and is not finished ("continue yesterday's")
 *   resume   — started today and not finished
 *   waiting  — today's episode is already finished; the next one opens tomorrow (n = the finished one)
 *   finished — the whole series is complete
 */
export function episodeFor(progress, total, today) {
  const p = norm(progress);
  const up = unlockedUpTo(p, total, today);
  const allDone = total > 0 && Array.from({ length: total }, (_, i) => i + 1).every((k) => p.done[k]);
  if (allDone) return { n: total, kind: 'finished', para: 0 };
  if (p.done[up]) return { n: up, kind: 'waiting', para: 0, nextOn: addDays(today, 1) };
  const para = p.pos && p.pos.n === up ? Math.max(0, p.pos.para | 0) : 0;
  if (para > 0) return { n: up, kind: p.pos.day && p.pos.day < today ? 'continue' : 'resume', para };
  return { n: up, kind: 'today', para: 0 };
}
/** 'YYYY-MM-DD' + n days. */
export const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/** Save the reading position (returns a new progress object). */
export function savePosition(progress, n, para, today, at = Date.now()) {
  const p = norm(progress);
  if (!p.startedOn) p.startedOn = today;
  p.pos = { n, para: Math.max(0, para | 0), at, day: today };
  return p;
}
/** Where to start reading episode n: the saved paragraph if the person stopped inside it, else 0. */
export const resumeAt = (progress, n, paraCount = Infinity) => {
  const pos = progress?.pos;
  if (!pos || pos.n !== n) return 0;
  return Math.min(Math.max(0, pos.para | 0), Math.max(0, paraCount - 1));
};

/** Mark episode n complete on `today` (keeps the first completion date) and update the daily streak. */
export function markDone(progress, n, today) {
  const p = norm(progress);
  if (!p.startedOn) p.startedOn = today;
  if (!p.done[n]) p.done[n] = today;
  const s = p.streak;
  if (s.last !== today) {
    s.count = s.last && daysBetween(s.last, today) === 1 ? (s.count || 0) + 1 : 1;
    s.last = today;
  }
  if (p.pos && p.pos.n === n) p.pos = null;
  return p;
}
/** Current streak shown to the person: kept while the last completion was today or yesterday, else 0. */
export function currentStreak(progress, today) {
  const s = progress?.streak;
  if (!s?.last || !s.count) return 0;
  const gap = daysBetween(s.last, today);
  return gap === 0 || gap === 1 ? s.count : 0;
}
/** Number of completed episodes. */
export const doneCount = (progress) => Object.keys(progress?.done || {}).length;

// ─────────────────────────────────────────────────────────────── plan access
/**
 * Access to episode n. `allowed` = the plan gate result for feature 'ithihasa' (shared/plan-gates.js: always true
 * unless BILLING_ENFORCE is on). Free plan: intro + episode 1 in full, a ~2-minute preview of later episodes.
 * @returns {'full'|'preview'}
 */
export const episodeAccess = (n, allowed) => (allowed || n <= FREE_FULL_EPISODES ? 'full' : 'preview');
/** Paragraphs the person may read/hear for this episode. */
export const readableParas = (ep, allowed) => (episodeAccess(ep.n, allowed) === 'full' ? ep.ta.length : previewParas(ep));

// ─────────────────────────────────────────────────────────────── validation (used by the tests)
const biOk = (o) => !!(o && typeof o.ta === 'string' && o.ta.trim() && typeof o.en === 'string' && o.en.trim() && /[஀-௿]/.test(o.ta));
/** Format problems in a series object ([] when valid). */
export function validateSeries(s, { minWords = 1200, maxWords = 1800 } = {}) {
  const out = [];
  if (!s || typeof s !== 'object') return ['series is not an object'];
  if (!SERIES_META.some((m) => m.id === s.id)) out.push(`unknown series id ${s.id}`);
  for (const k of ['title', 'source', 'intro']) if (!biOk(s[k])) out.push(`${k} needs ta + en`);
  if (!Array.isArray(s.episodes) || !s.episodes.length) { out.push('no episodes'); return out; }
  const ids = new Set();
  s.episodes.forEach((e, i) => {
    const at = `episode ${i + 1}`;
    if (e.n !== i + 1) out.push(`${at}: n is ${e.n}, expected ${i + 1}`);
    if (typeof e.id !== 'string' || !e.id) out.push(`${at}: missing id`); else if (ids.has(e.id)) out.push(`${at}: duplicate id ${e.id}`); else ids.add(e.id);
    for (const k of ['part', 'title', 'summary', 'moral', 'next']) if (!biOk(e[k])) out.push(`${at}: ${k} needs ta + en`);
    if (!Array.isArray(e.ta) || e.ta.length < 3 || e.ta.some((p) => typeof p !== 'string' || !/[஀-௿]/.test(p))) out.push(`${at}: ta must be an array of Tamil paragraphs`);
    else { const w = wordCount(e.ta); if (w < minWords || w > maxWords) out.push(`${at}: ${w} Tamil words (want ${minWords}–${maxWords})`); }
    if (!Array.isArray(e.characters) || !e.characters.every((c) => typeof c === 'string')) out.push(`${at}: characters must be a string array`);
  });
  return out;
}
