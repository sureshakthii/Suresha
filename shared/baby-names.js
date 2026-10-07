// Baby-name suggestion engine (fully offline).
// Data: a curated list of South Indian names (shared/baby-names-data-*.js) with Tamil script, English
// spelling, gender, short bilingual meanings and style tags. Names are matched to the birth-star pada
// sound (namakshara, shared/special.js nameLetters) by BOTH the English sound and the Tamil first letter,
// and scored with Chaldean numerology (shared/numerology.js) against the child's birth and destiny numbers.
import { NAKSHATRAS } from './astro.js';
import { nameLetters } from './special.js';
import { CHALDEAN, nameNumber, compoundMeaning, singleMeaning, reduceNum } from './numerology.js';
import { luckyNumbers, NUMBER_PLANET } from './personal.js';
import D1 from './baby-names-data-1.js';
import D2 from './baby-names-data-2.js';
import D3 from './baby-names-data-3.js';
import D4 from './baby-names-data-4.js';
import D5 from './baby-names-data-5.js';
import D6 from './baby-names-data-6.js';
import D7 from './baby-names-data-7.js';
import D8 from './baby-names-data-8.js';
import D9 from './baby-names-data-9.js';
import D10 from './baby-names-data-10.js';

const T = (en, ta) => ({ en, ta });

export const DEITIES = {
  mu: T('Murugan', 'முருகன்'), sh: T('Shiva', 'சிவன்'), vi: T('Vishnu / Perumal', 'திருமால் / பெருமாள்'), kr: T('Krishna', 'கிருஷ்ணர்'),
  ra: T('Rama', 'ராமர்'), ga: T('Ganesha', 'விநாயகர்'), am: T('Amman / Parvati / Shakti', 'அம்மன் / பார்வதி / சக்தி'), la: T('Lakshmi', 'லட்சுமி'),
  sa: T('Saraswati', 'சரஸ்வதி'), ay: T('Ayyappan / Ayyanar', 'ஐயப்பன் / ஐயனார்'), ha: T('Hanuman', 'அனுமன்'),
};
export const STYLES = {
  god: T('Deity names', 'கடவுள் பெயர்'), classic: T('Traditional', 'பாரம்பரிய'), modern: T('Modern', 'நவீன'), 'pure-tamil': T('Pure Tamil', 'தனித்தமிழ்'),
};
const TAG_CODE = { G: 'god', C: 'classic', M: 'modern', P: 'pure-tamil' };

// ---------------------------------------------------------------- sound keys
const DIGRAPH = { chh: 'ch', ch: 'ch', sh: 'sh', kh: 'k', gh: 'g', jh: 'j', th: 't', dh: 'd', ph: 'p', bh: 'b', ng: 'ng', gn: 'n', zh: 'l' };
const SINGLE = { c: 'k', q: 'k', w: 'v', f: 'p', z: 'j', x: 'k' };

/** English starting sound of a name or syllable: normalised consonant + vowel class ('Dharun' → 'da', 'Krishna' → 'ki'). */
export function enSound(word) {
  const s = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return '';
  let i = 0;
  let cons = '';
  const tri = s.slice(0, 3);
  if (tri === 'chh') { cons = 'ch'; i = 3; } else if (DIGRAPH[s.slice(0, 2)] && !(s.slice(0, 2) === 'ng' && /[aeiou]/.test(s[1]))) { cons = DIGRAPH[s.slice(0, 2)]; i = 2; } else if (/[aeiou]/.test(s[0])) { cons = ''; } else { cons = SINGLE[s[0]] || s[0]; i = 1; }
  if (cons === 'k' && s[0] === 'c' && s[1] === 'h') cons = 'ch';
  // skip the rest of a consonant cluster (Kr-, Pr-, Shr-, Sr-, Shy-)
  while (i < s.length && !/[aeiou]/.test(s[i])) i++;
  const v = s.slice(i, i + 2);
  let vowel;
  if (v === 'ai' || v === 'ay') vowel = 'a';
  else if (v === 'au' || v === 'ou' || v === 'ow') vowel = 'o';
  else if (v === 'oo') vowel = 'u';
  else if (v === 'ee' || v === 'ie') vowel = 'i';
  else if (v === 'ea' && !cons) vowel = 'e';
  else vowel = s[i] || 'a';
  return cons + vowel;
}

const TA_VOWELS = { அ: 'அ', ஆ: 'அ', ஐ: 'அ', இ: 'இ', ஈ: 'இ', உ: 'உ', ஊ: 'உ', எ: 'ஏ', ஏ: 'ஏ', ஒ: 'ஓ', ஓ: 'ஓ', ஔ: 'ஓ' };
const TA_SIGN = { 'ா': '', 'ை': '', 'ி': 'ி', 'ீ': 'ி', 'ு': 'ு', 'ூ': 'ு', 'ெ': 'ே', 'ே': 'ே', 'ொ': 'ோ', 'ோ': 'ோ', 'ௌ': 'ோ' };
const TA_CONS = { ஸ: 'ச', ஷ: 'ச', ஶ: 'ச' };
/** Tamil first letter (உயிர்மெய்) of a word, normalised: long/short vowels merged, ஸ/ஷ written as ச. */
export function taSound(word) {
  const s = String(word || '').trim().normalize('NFC');
  if (!s) return '';
  const c0 = s[0];
  if (TA_VOWELS[c0]) return TA_VOWELS[c0];
  const cons = TA_CONS[c0] || c0;
  let j = 1;
  if (s[j] === '்') { j++; while (j < s.length && s[j + 1] === '்') j += 2; j++; } // cluster: க்ரு → vowel of the next letter
  const sign = s[j];
  return cons + (sign in TA_SIGN ? TA_SIGN[sign] : '');
}

// ---------------------------------------------------------------- data
function parse(src, part) {
  const out = [];
  for (const raw of src.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [en, ta, g, tags, mEn, mTa] = line.split('|').map((x) => (x || '').trim());
    const [codes, deity] = tags.split(':');
    out.push({
      en, ta, gender: g === 'b' ? 'boy' : g === 'g' ? 'girl' : 'unisex',
      tags: [...codes].map((c) => TAG_CODE[c]).filter(Boolean),
      deity: deity || null,
      meaning: T(mEn, mTa),
      enKey: enSound(en), taKey: taSound(ta), part,
    });
  }
  return out;
}
let NAMES = null;
/** All names (parsed once). */
export function allNames() {
  if (!NAMES) NAMES = [D1, D2, D3, D4, D5, D6, D7, D8, D9, D10].flatMap((d, i) => parse(d, i + 1));
  return NAMES;
}
export const nameId = (n) => `${n.en.toLowerCase()}|${n.gender[0]}`;

// ---------------------------------------------------------------- pada sounds
/** The pada sound (namakshara) as matching keys. */
export function padaSound(star, pada) {
  const nl = nameLetters(star, pada);
  const p = nl.all[pada - 1];
  return { star, pada, en: p.en, ta: p.ta, enKey: enSound(p.en), taKey: taSound(p.ta) };
}
/** Every one of the 108 nakshatra-pada sounds. */
export const ALL_PADAS = Array.from({ length: 108 }, (_, i) => padaSound(Math.floor(i / 4), (i % 4) + 1));

/** Letters that are hardly used to begin names; the screen explains the accepted alternative. */
export const RARE_NOTE = {
  'ட': T('Tamil names rarely begin with ட; by custom names with the same sound in English (D / T), usually written with த in Tamil, are used.', 'ட-வரிசையில் தொடங்கும் தமிழ்ப் பெயர்கள் அரிது; வழக்கப்படி அதே ஒலியுள்ள D / T பெயர்கள் (தமிழில் பொதுவாக த) தரப்பட்டுள்ளன.'),
  'ண': T('No names begin with ண; by custom names beginning with ந / N are used.', 'ண-வில் பெயர்கள் தொடங்குவதில்லை; வழக்கப்படி ந / N பெயர்கள் தரப்பட்டுள்ளன.'),
  'ங': T('No names begin with ங; by custom names beginning with ந / N, or the other letters of the same star, are used.', 'ங-வில் பெயர்கள் தொடங்குவதில்லை; வழக்கப்படி ந / N பெயர்களும் அதே நட்சத்திரத்தின் மற்ற எழுத்துப் பெயர்களும் தரப்பட்டுள்ளன.'),
  'ஞ': T('Few names begin with ஞ; names beginning with ஞா (Gnana) and N are used.', 'ஞ-வில் சில பெயர்களே உண்டு; ஞா (ஞானம்) மற்றும் N பெயர்கள் தரப்பட்டுள்ளன.'),
};
const ALT_KEYS = { 'ண': { en: ['na'], ta: ['ந'] }, 'ங': { en: ['na'], ta: ['ந'] }, 'ஞ': { en: ['na'], ta: ['ந'] } };

/**
 * How a name fits a pada sound: 'exact' (same English sound or same Tamil letter), 'alt' (the accepted
 * substitute for a letter that names don't begin with), or null.
 */
export function soundMatch(n, ps) {
  if (n.enKey === ps.enKey || n.taKey === ps.taKey) return 'exact';
  const alt = ALT_KEYS[ps.ta];
  if (alt && (alt.en.includes(n.enKey) || alt.ta.includes(n.taKey))) return 'alt';
  return null;
}

// ---------------------------------------------------------------- numerology
/** Cheiro's cautionary compound numbers; a name on one of these is moved down a level. */
export const CAUTION_COMPOUNDS = new Set([12, 16, 18, 26, 29, 43]);
const PLANET_TA = { Sun: 'சூரியன்', Moon: 'சந்திரன்', Jupiter: 'குரு', Rahu: 'ராகு', Mercury: 'புதன்', Venus: 'சுக்கிரன்', Ketu: 'கேது', Saturn: 'சனி', Mars: 'செவ்வாய்' };
const LEVELS = ['excellent', 'good', 'neutral', 'avoid'];

/** Letters (A–Z) whose Chaldean value is one of `nums`. */
export const lettersFor = (nums) => Object.keys(CHALDEAN).filter((c) => nums.includes(CHALDEAN[c]));

/**
 * Numerology of a name for a child born on `dateStr` (YYYY-MM-DD). `initial` (e.g. "R" or "R.K.") is
 * added to the total when given, as Tamil families write the father's / mother's initial before the name.
 * Returns { level: excellent|good|neutral|avoid, single, compound, total, reason:{en,ta}, ... }.
 */
export function nameNumerology(name, dateStr, initial = '') {
  const own = nameNumber(name);
  const ini = nameNumber(initial);
  const compound = own.compound + ini.compound;
  const single = reduceNum(compound);
  if (!dateStr) return { level: 'neutral', single, compound, own: own.single, planet: NUMBER_PLANET[single], reason: T(`Name number ${single}.`, `பெயர் எண் ${single}.`) };
  const ln = luckyNumbers(dateStr);
  let level;
  let why;
  const pEn = NUMBER_PLANET[single], pTa = PLANET_TA[pEn];
  const withIni = ini.letters ? T(' (with initial)', ' (இனிஷியலுடன்)') : T('', '');
  if (single === ln.birth && single === ln.destiny) { level = 'excellent'; why = T(`Name number ${single}${withIni.en} equals both the birth number and the destiny number.`, `பெயர் எண் ${single}${withIni.ta} — பிறந்த எண், விதி எண் இரண்டுடனும் ஒன்று.`); }
  else if (single === ln.birth) { level = 'excellent'; why = T(`Name number ${single}${withIni.en} matches birth number ${ln.birth}.`, `பெயர் எண் ${single}${withIni.ta} — பிறந்த எண் ${ln.birth}-உடன் ஒன்று.`); }
  else if (single === ln.destiny) { level = 'excellent'; why = T(`Name number ${single}${withIni.en} matches destiny number ${ln.destiny}.`, `பெயர் எண் ${single}${withIni.ta} — விதி எண் ${ln.destiny}-உடன் ஒன்று.`); }
  else if (ln.lucky.includes(single)) { level = 'good'; why = T(`Name number ${single} (${pEn}) is friendly to birth number ${ln.birth}.`, `பெயர் எண் ${single} (${pTa}) — பிறந்த எண் ${ln.birth}-உடன் இணக்கம்.`); }
  else if (ln.avoid.includes(single)) { level = 'avoid'; why = T(`Name number ${single} does not suit birth number ${ln.birth}.`, `பெயர் எண் ${single} — பிறந்த எண் ${ln.birth}-க்குப் பொருந்தாது.`); }
  else { level = 'neutral'; why = T(`Name number ${single} (${pEn}) is neutral to birth number ${ln.birth}.`, `பெயர் எண் ${single} (${pTa}) — பிறந்த எண் ${ln.birth}-உடன் சமநிலை.`); }
  if (CAUTION_COMPOUNDS.has(compound) && level !== 'avoid') {
    level = LEVELS[Math.min(2, LEVELS.indexOf(level) + 1)];
    why = T(`${why.en} Compound ${compound} asks for care, so one step lower.`, `${why.ta} கூட்டு எண் ${compound} கவனம் தேவை — ஒரு படி குறைவு.`);
  }
  return { level, single, compound, own: own.single, initial: ini.letters ? ini.single : null, planet: pEn, birth: ln.birth, destiny: ln.destiny, reason: why, compoundMeaning: compoundMeaning(compound) };
}

/** Birth-chart luck summary for the header: numbers, numerology letters and the star's name letters. */
export function luckSummary(dateStr, star, pada) {
  const nl = Number.isInteger(star) ? nameLetters(star, pada) : null;
  if (!dateStr) return { birth: null, destiny: null, lucky: [], letters: [], starLetters: nl?.all || [], primary: nl?.primary || null };
  const ln = luckyNumbers(dateStr);
  return {
    birth: ln.birth, destiny: ln.destiny, lucky: ln.lucky, avoid: ln.avoid,
    birthMeaning: singleMeaning(ln.birth), destinyMeaning: singleMeaning(ln.destiny),
    letters: lettersFor([ln.birth, ln.destiny]),
    starLetters: nl?.all || [], primary: nl?.primary || null,
  };
}

// ---------------------------------------------------------------- suggestions
const LEVEL_SCORE = { excellent: 30, good: 20, neutral: 10, avoid: 0 };
const fold = (s) => String(s || '').toLowerCase().normalize('NFC');
/** Spelling-tolerant key for English names: first letter kept, then vowels, h, y, w dropped and doubled letters merged. */
export const looseKey = (s) => { const t = fold(s).replace(/[^a-z]/g, ''); return t ? t[0] + t.slice(1).replace(/[aeiouhyw]/g, '').replace(/(.)\1+/g, '$1') : ''; };

/**
 * Suggest names.
 *   star, pada     – birth star index (0–26) and pada (1–4); null = any letter
 *   date           – child's birth date (YYYY-MM-DD) for numerology; optional
 *   gender         – 'any' | 'boy' | 'girl' (unisex names are included for both)
 *   style          – 'all' | 'god' | 'classic' | 'modern' | 'pure-tamil'
 *   deity          – deity code when style is 'god'
 *   initial        – father's / mother's initial(s) to include in the name number
 *   query          – search text (English, Tamil or meaning)
 *   allPadas       – also include the star's other pada letters (default true)
 *   groupSpellings – one result per Tamil name; other English spellings go to `spellings` (default true)
 * Returns { results:[{ name, match:'pada'|'star'|'alt'|'search', sound, num }], counts, pada, note }.
 * "Avoid" numerology names are never returned when a date is given.
 */
export function suggestNames({ star = null, pada = 1, date = '', gender = 'any', style = 'all', deity = '', initial = '', query = '', allPadas = true, groupSpellings = true } = {}) {
  const hasStar = Number.isInteger(star) && star >= 0 && star < 27;
  const target = hasStar ? padaSound(star, pada) : null;
  const others = hasStar ? [1, 2, 3, 4].filter((p) => p !== pada).map((p) => padaSound(star, p)) : [];
  const q = fold(query).trim();
  const results = [];
  // Exact text first; when nothing matches, a forgiving English match (murgan → Murugan, kartik → Karthik).
  const strictQ = (n) => fold(n.en).includes(q) || n.ta.includes(query.trim()) || fold(n.meaning.en).includes(q) || n.meaning.ta.includes(query.trim());
  const lq = looseKey(q);
  const looseQ = (n) => lq.length >= 3 && looseKey(n.en).includes(lq);
  for (const queryHit of q ? (/^[a-z .'-]+$/.test(q) ? [strictQ, looseQ] : [strictQ]) : [null]) {
  if (results.length) break;
  for (const n of allNames()) {
    if (gender === 'boy' && n.gender === 'girl') continue;
    if (gender === 'girl' && n.gender === 'boy') continue;
    if (style !== 'all' && !n.tags.includes(style)) continue;
    if (style === 'god' && deity && n.deity !== deity) continue;
    if (queryHit && !queryHit(n)) continue;
    let match = 'search';
    let sound = null;
    if (target) {
      const m = soundMatch(n, target);
      if (m) { match = m === 'exact' ? 'pada' : 'alt'; sound = target; } else {
        const o = allPadas ? others.find((ps) => soundMatch(n, ps)) : null;
        if (o) { match = 'star'; sound = o; } else if (!q) continue;
      }
    }
    const num = nameNumerology(n.en, date, initial);
    if (date && num.level === 'avoid') continue;
    const score = (match === 'pada' ? 100 : match === 'alt' ? 80 : match === 'star' ? 50 : 0) + LEVEL_SCORE[num.level];
    results.push({ name: n, id: nameId(n), match, sound, num, score });
  }
  }
  results.sort((a, b) => b.score - a.score || a.name.en.length - b.name.en.length || a.name.en.localeCompare(b.name.en));
  // One card per Tamil name: the best-scoring English spelling leads, other spellings are listed with their numbers.
  if (groupSpellings) {
    const byTa = new Map();
    for (const r of results) {
      const k = `${r.name.ta}|${r.name.gender}`;
      const lead = byTa.get(k);
      if (lead) lead.spellings.push({ id: r.id, en: r.name.en, single: r.num.single, level: r.num.level });
      else { r.spellings = []; byTa.set(k, r); }
    }
    results.splice(0, results.length, ...byTa.values());
  }
  const counts = { total: results.length, pada: results.filter((r) => r.match === 'pada').length, alt: results.filter((r) => r.match === 'alt').length, star: results.filter((r) => r.match === 'star').length };
  const note = target ? (RARE_NOTE[target.ta[0]] || (counts.pada < 8 && !q ? T('Few names begin with this exact sound; names with the other letters of the same birth star are equally accepted and are listed next.', 'இந்த எழுத்தில் தொடங்கும் பெயர்கள் குறைவு; அதே நட்சத்திரத்தின் மற்ற பாத எழுத்துகளில் தொடங்கும் பெயர்களும் ஏற்கத்தக்கவை — அவையும் தரப்பட்டுள்ளன.') : null)) : null;
  return { results, counts, pada: target, star: hasStar ? NAKSHATRAS[star] : null, note };
}

/** Plain-text list for sharing. */
export function shareText(list, lang = 'ta') {
  const ta = lang === 'ta';
  return list.map((r, i) => `${i + 1}. ${r.name.ta} (${r.name.en}) — ${ta ? r.name.meaning.ta : r.name.meaning.en}${r.num ? ` · ${ta ? 'எண்' : 'No.'} ${r.num.single}` : ''}`).join('\n');
}
