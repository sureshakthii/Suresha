// Reading an imported horoscope (photo / PDF → OCR text) into candidate birth details. Pure functions, no DOM.
//
// Typical South Indian jathagam text (Tamil, English or both) has label/value pairs such as
//   "பிறந்த தேதி: 12-03-1985", "ஜனன நேரம்: காலை 10.35", "உதயாதி நாழிகை 12-30", "பிறந்த ஊர்: மதுரை",
//   "நட்சத்திரம்: பூசம் 2ம் பாதம்", "ராசி: கடகம்", "லக்னம்: சிம்மம்", "சுக்கிர தசை இருப்பு 12 வ 4 மா 10 நா",
//   "குரோதி வருடம் ஆடி மாதம் 12ம் தேதி", "Date of Birth : 12/03/1985", "Time : 10:35 AM", "Place : Madurai".
// Every field comes back with a confidence ('high' | 'medium' | 'low') and flags. Nothing here calculates a chart:
// the screen shows the result in its confirmation panel and the family checks every field first.
import { NAKSHATRAS, RASIS } from './astro.js';
import { TAMIL_MONTHS, TAMIL_YEARS, tamilDate } from './tamilcal.js';
import { parseWrittenDate } from './written-date.js';
import { searchLocalPlaces, placeLabel } from './places.js';

const T = (en, ta) => ({ en, ta });
const TA_CHAR = '஀-௿';
const isTa = (s) => new RegExp(`[${TA_CHAR}]`).test(s);

// ---------------------------------------------------------------------------------------------------------------
// Text clean-up and fuzzy matching

/** OCR text → tidy text: NFC, Tamil digits → 0-9, joiners removed, dashes and colons unified, table bars dropped. */
export function cleanText(text) {
  let s = String(text || '').normalize('NFC').replace(/[​-‍﻿]/g, '');
  s = s.replace(/[௦-௯]/g, (d) => String(d.charCodeAt(0) - 0x0BE6));
  s = s.replace(/[–—−‐]/g, '-').replace(/[：꞉]/g, ':').replace(/[“”„]/g, '"').replace(/[‘’]/g, "'");
  // Digit look-alikes inside date/time tokens: "l2/O3/1985" → "12/03/1985" (needs at least one real digit).
  s = s.replace(/(?<![A-Za-z])[0-9OoIl|]+(?:\s?[/.\-:]\s?[0-9OoIl|]+)+(?![A-Za-z])/g, (m) => (/\d/.test(m) ? m.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1') : m));
  s = s.replace(/[|¦]/g, ' ').replace(/[ \t]+/g, ' ');
  return s.split('\n').map((l) => l.trim()).join('\n');
}

/** Latin spelling key: "Thiruvaadhirai" ≈ "Tiruvathirai", "Aswini" ≈ "Ashwini". */
export function latinKey(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')
    .replace(/zh/g, 'l').replace(/([sbdktgcjp])h/g, '$1').replace(/w/g, 'v').replace(/ee|ii/g, 'i').replace(/oo|uu/g, 'u')
    .replace(/aa/g, 'a').replace(/y$/, 'i').replace(/(.)\1+/g, '$1');
}

/** Levenshtein distance over code points (Tamil vowel signs count as one each). */
export function editDistance(a, b) {
  const x = [...a], y = [...b];
  if (Math.abs(x.length - y.length) > 3) return 99;
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[y.length];
}
const allowed = (len) => (len >= 9 ? 2 : len >= 5 ? 1 : 0);

/**
 * Find the best entry of `table` ([{ key, names: [...] }]) in `text`. Exact substring matches win (longest name first,
 * so "புனர்பூசம்" beats "பூசம்"); otherwise a word within edit distance 1–2 counts as a fuzzy match.
 * Returns { key, name, at, fuzzy } or null.
 */
export function findName(text, table, { fuzzy = true } = {}) {
  const s = String(text || '');
  const lower = s.toLowerCase();
  let best = null;
  for (const row of table) {
    for (const n of row.names) {
      if (isTa(n)) {
        const at = s.indexOf(n);
        if (at < 0) continue;
        // A Tamil name must not sit inside a longer Tamil word on its left ("பூசம்" inside "புனர்பூசம்").
        if (at > 0 && new RegExp(`[${TA_CHAR}]`).test(s[at - 1]) && !/[்]/.test(s[at - 1])) continue;
        if (!best || n.length > best.name.length || (n.length === best.name.length && at < best.at)) best = { key: row.key, name: n, at, fuzzy: false };
      } else {
        const re = new RegExp(`(^|[^a-z])${n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`);
        const m = lower.match(re);
        if (!m) continue;
        const at = m.index + m[1].length;
        if (!best || n.length > best.name.length || (n.length === best.name.length && at < best.at)) best = { key: row.key, name: n, at, fuzzy: false };
      }
    }
  }
  if (best || !fuzzy) return best;
  // Fuzzy: compare each word (Tamil words as written, Latin words by spelling key).
  const words = [...s.matchAll(new RegExp(`[${TA_CHAR}]+|[A-Za-z]+`, 'g'))];
  let fz = null;
  for (const w of words) {
    const word = w[0];
    for (const row of table) {
      for (const n of row.names) {
        if (n.includes(' ')) continue;
        const ta = isTa(n);
        if (ta !== isTa(word)) continue;
        const a = ta ? word : latinKey(word), b = ta ? n : latinKey(n);
        if (b.length < 4) continue;
        const d = a === b ? 0 : editDistance(a, b);
        if (d <= allowed([...b].length) && (!fz || d < fz.d)) fz = { key: row.key, name: n, at: w.index, fuzzy: d > 0, d };
      }
    }
  }
  return fz ? { key: fz.key, name: fz.name, at: fz.at, fuzzy: fz.fuzzy } : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Name tables

const STAR_EXTRA = [
  ['அசுவினி', 'அஸ்வினி', 'Aswini', 'Asvini', 'Ashvini', 'Ashwini'], ['பரணி', 'Bharani', 'Barani'],
  ['கிருத்திகை', 'கார்த்திகை', 'Krithigai', 'Karthigai', 'Kartika', 'Krittika', 'Kritika', 'Krithika'], ['ரோகிணி', 'ரோஹிணி', 'Rohini'],
  ['மிருகசீரிடம்', 'மிருகசீரிஷம்', 'மிருகசீரிஷம்', 'மிருகசீரிசம்', 'Mrigasira', 'Mrigashira', 'Mirugaseeridam', 'Mirugasirisham', 'Mrigashirsha'],
  ['திருவாதிரை', 'Thiruvathirai', 'Thiruvadhirai', 'Ardra', 'Arudra', 'Thiruvathira'], ['புனர்பூசம்', 'Punarpoosam', 'Punarvasu', 'Punartham'],
  ['பூசம்', 'Poosam', 'Pusam', 'Pushya', 'Pooyam'], ['ஆயில்யம்', 'Ayilyam', 'Aayilyam', 'Ashlesha', 'Aslesha'], ['மகம்', 'Magam', 'Makam', 'Magha'],
  ['பூரம்', 'Pooram', 'Puram', 'Purva Phalguni', 'Pubba'], ['உத்திரம்', 'Uthiram', 'Uthram', 'Uttara Phalguni', 'Uttaram'],
  ['அஸ்தம்', 'ஹஸ்தம்', 'Hastham', 'Hasta', 'Astham', 'Atham'], ['சித்திரை', 'Chithirai', 'Chitra', 'Chithira', 'Chithra'],
  ['சுவாதி', 'Swathi', 'Swati', 'Chothi', 'Suvathi'], ['விசாகம்', 'Visakam', 'Vishakha', 'Visakha', 'Vishakam'],
  ['அனுஷம்', 'அனுடம்', 'Anusham', 'Anuradha', 'Anizham', 'Anusha'], ['கேட்டை', 'Kettai', 'Jyeshta', 'Jyeshtha', 'Triketta', 'Ketta'],
  ['மூலம்', 'Moolam', 'Mula', 'Moola'], ['பூராடம்', 'Pooradam', 'Puradam', 'Purvashada', 'Purva Ashadha', 'Pooradam'],
  ['உத்திராடம்', 'Uthiradam', 'Uthradam', 'Uttarashada', 'Uttara Ashadha'], ['திருவோணம்', 'Thiruvonam', 'Shravana', 'Sravanam', 'Thiruvonam', 'Shravanam'],
  ['அவிட்டம்', 'Avittam', 'Dhanishta', 'Dhanishtha', 'Avittom'], ['சதயம்', 'Sathayam', 'Sadayam', 'Chathayam', 'Shatabhisha', 'Satabhisha'],
  ['பூரட்டாதி', 'Poorattathi', 'Purattathi', 'Purva Bhadrapada', 'Pururuttathi'], ['உத்திரட்டாதி', 'Uthirattathi', 'Uthrattathi', 'Uttara Bhadrapada', 'Uttrattathi'],
  ['ரேவதி', 'Revathi', 'Revati'],
];
const STARS = NAKSHATRAS.map((n, i) => ({ key: i, names: [...new Set([n.ta, n.en, ...STAR_EXTRA[i]])] }));
const RASI_EXTRA = [
  ['மேஷம்', 'மேடம்', 'Mesham', 'Mesha', 'Aries'], ['ரிஷபம்', 'இடபம்', 'Rishabam', 'Rishabha', 'Vrishabha', 'Taurus', 'Rishaba'],
  ['மிதுனம்', 'Mithunam', 'Mithuna', 'Gemini'], ['கடகம்', 'Kadagam', 'Katakam', 'Karkata', 'Karkataka', 'Cancer', 'Kataka'],
  ['சிம்மம்', 'சிங்கம்', 'Simham', 'Simha', 'Leo', 'Simmam'], ['கன்னி', 'Kanni', 'Kanya', 'Virgo'],
  ['துலாம்', 'Thulam', 'Tula', 'Thula', 'Libra'], ['விருச்சிகம்', 'Viruchigam', 'Vrischika', 'Vrishchika', 'Scorpio', 'Viruchikam'],
  ['தனுசு', 'Dhanusu', 'Dhanus', 'Dhanu', 'Sagittarius'], ['மகரம்', 'Makaram', 'Makara', 'Capricorn'],
  ['கும்பம்', 'Kumbham', 'Kumbha', 'Aquarius', 'Kumbam'], ['மீனம்', 'Meenam', 'Meena', 'Pisces'],
];
const RASI_TABLE = RASIS.map((r, i) => ({ key: i, names: [...new Set([r.ta, r.en, ...RASI_EXTRA[i]])] }));
const DASA_PLANETS = [
  ['Sun', ['சூரிய', 'சூரியன்', 'Sun', 'Surya', 'Suriya', 'Ravi']], ['Moon', ['சந்திர', 'சந்திரன்', 'Moon', 'Chandra', 'Chandran']],
  ['Mars', ['செவ்வாய்', 'அங்காரக', 'Mars', 'Sevvai', 'Kuja', 'Angaraka', 'Chevvai']], ['Mercury', ['புதன்', 'புத', 'Mercury', 'Budha', 'Budhan', 'Bhudha']],
  ['Jupiter', ['குரு', 'வியாழ', 'Jupiter', 'Guru', 'Brihaspati']], ['Venus', ['சுக்கிர', 'சுக்ர', 'Venus', 'Sukra', 'Shukra', 'Sukran']],
  ['Saturn', ['சனி', 'Saturn', 'Sani', 'Shani']], ['Rahu', ['ராகு', 'Rahu', 'Raghu']], ['Ketu', ['கேது', 'Ketu', 'Kethu']],
].map(([key, names]) => ({ key, names }));
const YEAR_EXTRA = { 37: ['குரோதி'], 35: ['சுபகிருது', 'சுபக்ருது'], 36: ['சோபகிருது', 'சோபக்ருது'], 48: ['ராட்சச', 'ராக்ஷஸ'], 1: ['விபவ'], 6: ['ஸ்ரீமுக', 'சிறீமுக', 'ஸ்ரீமுக'] };
const YEARS = TAMIL_YEARS.map((y) => ({ key: y.index, names: [...new Set([y.ta, y.en, ...(YEAR_EXTRA[y.index] || [])])] }));
const MONTH_EXTRA = [['Chithirai', 'Chitirai'], ['Vaikasi', 'Vaigasi'], ['Aani', 'Ani'], ['Aadi', 'Adi'], ['Aavani', 'Avani'], ['Purattasi', 'Puratasi'],
  ['Aippasi', 'Ippasi'], ['Karthigai', 'Karthikai', 'Kartikai'], ['Margazhi', 'Margali', 'Markazhi'], ['Thai', 'Tai'], ['Maasi', 'Masi'], ['Panguni']];
const MONTHS = TAMIL_MONTHS.map((m, i) => ({ key: i, names: [...new Set([m.ta, m.en, ...MONTH_EXTRA[i]])] }));
const GREG_MONTHS_TA = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
const MON_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAYS = [['ஞாயிறு', 'sunday'], ['திங்கள்', 'monday'], ['செவ்வாய்', 'tuesday'], ['புதன்', 'wednesday'], ['வியாழன்', 'thursday'], ['வெள்ளி', 'friday'], ['சனி', 'saturday']];

// Labels → field. Longer labels are matched first and mask the shorter ones inside them.
const LABELS = {
  name: ['ஜாதகர் பெயர்', 'குழந்தையின் பெயர்', 'குழந்தை பெயர்', 'பெயர்', 'Name of the Native', 'Name of Child', 'Native Name', 'Name'],
  gender: ['பாலினம்', 'Gender', 'Sex'],
  date: ['பிறந்த தேதி', 'ஜனன தேதி', 'பிறந்த நாள்', 'பிறந்த திகதி', 'ஜனன திகதி', 'Date of Birth', 'Birth Date', 'D.O.B', 'DOB', 'Date'],
  time: ['பிறந்த நேரம்', 'ஜனன நேரம்', 'ஜனன காலம்', 'பிறந்த காலம்', 'Time of Birth', 'Birth Time', 'T.O.B', 'TOB', 'Time'],
  place: ['பிறந்த ஊர்', 'பிறந்த இடம்', 'ஜனன ஊர்', 'ஜனன இடம்', 'பிறப்பிடம்', 'Place of Birth', 'Birth Place', 'P.O.B', 'POB', 'Place'],
  star: ['ஜென்ம நட்சத்திரம்', 'ஜன்ம நட்சத்திரம்', 'நட்சத்திரம்', 'நக்ஷத்திரம்', 'நட்சத்திறம்', 'Birth Star', 'Janma Nakshatra', 'Nakshatra', 'Nakshatram', 'Natchathiram', 'Star'],
  rasi: ['ஜென்ம ராசி', 'ஜன்ம ராசி', 'சந்திர ராசி', 'ராசி', 'இராசி', 'Janma Rasi', 'Moon Sign', 'Rasi', 'Raasi', 'Rashi'],
  lagna: ['லக்னம்', 'லக்கினம்', 'இலக்கினம்', 'Lagnam', 'Lagna', 'Lagnam', 'Ascendant'],
  balance: ['தசா இருப்பு', 'திசா இருப்பு', 'தசை இருப்பு', 'திசை இருப்பு', 'கர்ப்ப செல் தசை இருப்பு', 'இருப்பு', 'Balance of Dasa', 'Dasa Balance', 'Balance of Dasha', 'Dasha Balance', 'Balance'],
};

/** All label hits in reading order: [{ field, start, end, label }]. Shorter labels inside a longer hit are dropped. */
function labelHits(s) {
  const all = [];
  const lower = s.toLowerCase();
  for (const [field, labels] of Object.entries(LABELS)) {
    for (const lab of labels) {
      if (isTa(lab)) {
        let at = s.indexOf(lab);
        while (at >= 0) { all.push({ field, start: at, end: at + lab.length, label: lab }); at = s.indexOf(lab, at + 1); }
      } else {
        const re = new RegExp(`(^|[^a-z])(${lab.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![a-z])`, 'g');
        for (const m of lower.matchAll(re)) all.push({ field, start: m.index + m[1].length, end: m.index + m[1].length + lab.length, label: lab });
      }
    }
  }
  // Fuzzy Tamil labels for common OCR slips ("நட்சத்திறம்", "லக்கனம்"): one edit on words of 5+ letters.
  for (const w of s.matchAll(new RegExp(`[${TA_CHAR}]{5,}`, 'g'))) {
    if (all.some((h) => h.start <= w.index && h.end >= w.index + w[0].length)) continue;
    for (const [field, labels] of Object.entries(LABELS)) {
      const hit = labels.filter((l) => isTa(l) && !l.includes(' ') && [...l].length >= 5).find((l) => editDistance(w[0], l) <= 1);
      if (hit) { all.push({ field, start: w.index, end: w.index + w[0].length, label: hit, fuzzy: true }); break; }
    }
  }
  // Latin OCR slips: "Narne" → Name, "Tirne" → Time, "Plaee" → Place (rn↔m, one edit on 4+ letters).
  const latinSlip = (w) => w.toLowerCase().replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/cl/g, 'd');
  for (const w of s.matchAll(/[A-Za-z]{4,}/g)) {
    if (all.some((h) => h.start <= w.index && h.end >= w.index + w[0].length)) continue;
    const word = latinSlip(w[0]);
    for (const [field, labels] of Object.entries(LABELS)) {
      const hit = labels.filter((l) => /^[A-Za-z]{4,}$/.test(l)).find((l) => { const b = l.toLowerCase(); return word === b || (b.length >= 4 && editDistance(word, b) <= 1 && word[0] === b[0]); });
      if (hit) { all.push({ field, start: w.index, end: w.index + w[0].length, label: hit, fuzzy: true }); break; }
    }
  }
  all.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const kept = [];
  for (const h of all) if (!kept.some((k) => h.start < k.end && h.end > k.start)) kept.push(h);
  return kept;
}

/** The value after each label: up to the next label on the same line; the next line when the label ends the line. */
export function labelValues(s) {
  const hits = labelHits(s);
  return hits.map((h, i) => {
    const lineEnd = s.indexOf('\n', h.end) < 0 ? s.length : s.indexOf('\n', h.end);
    const nextOnLine = hits[i + 1] && hits[i + 1].start < lineEnd ? hits[i + 1].start : lineEnd;
    let value = s.slice(h.end, nextOnLine).replace(/^[\s:.\-=;,]+/, '').replace(/[\s,;]+$/, '');
    if (!value && nextOnLine === lineEnd && lineEnd < s.length) {
      const nl = s.indexOf('\n', lineEnd + 1);
      const next = s.slice(lineEnd + 1, nl < 0 ? s.length : nl);
      const nextHit = hits.find((x) => x.start > lineEnd && x.start < lineEnd + 1 + next.length);
      value = (nextHit ? next.slice(0, nextHit.start - lineEnd - 1) : next).replace(/^[\s:.\-=;,]+/, '').trim();
    }
    return { ...h, value };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Field readers

const CONF = { high: 3, medium: 2, low: 1 };
const lower = (a, b) => (CONF[a] <= CONF[b] ? a : b);

/** Gregorian date in a value: "12-03-1985", "12.3.85", "12 March 1985", "மார்ச் 12, 1985", "1985-03-12". */
export function readGregorianDate(v) {
  let s = String(v || '');
  GREG_MONTHS_TA.forEach((m, i) => { s = s.split(m).join(` ${MON_EN[i]} `); });
  const numeric = s.match(/(\d{1,4})\s?[/.\-]\s?(\d{1,2})\s?[/.\-]\s?(\d{2,4})/);
  if (numeric) return `${numeric[1]}/${numeric[2]}/${numeric[3]}`;
  const lowerS = s.toLowerCase();
  const w = lowerS.match(/(\d{1,2})(?:st|nd|rd|th)?[\s,.\-]*([a-z]{3,9})\.?[\s,.\-]*(\d{2,4})/) || lowerS.match(/([a-z]{3,9})\.?[\s,.\-]*(\d{1,2})(?:st|nd|rd|th)?[\s,.\-]+(\d{2,4})/);
  if (w) {
    const [a, b, c] = w.slice(1);
    const word = /[a-z]/.test(a) ? a : b;
    if (MON_EN.includes(word.slice(0, 3))) return /[a-z]/.test(a) ? `${b} ${word.slice(0, 3)} ${c}` : `${a} ${word.slice(0, 3)} ${c}`;
  }
  return null;
}

function weekdayIn(v) {
  const s = String(v || '').toLowerCase();
  for (let i = 0; i < 7; i++) {
    const [ta, en] = WEEKDAYS[i];
    if (new RegExp(`(^|[^a-z])${en}(?![a-z])`).test(s)) return i;
    if (new RegExp(`${ta}\\s*(கிழமை|க்கிழமை)`).test(v)) return i;
  }
  return null;
}

const PERIODS = [
  ['நள்ளிரவு', 'midnight'], ['அதிகாலை', 'am'], ['முற்பகல்', 'am'], ['பிற்பகல்', 'pm'], ['காலை', 'am'], ['மதியம்', 'noon'], ['பகல்', 'noon'],
  ['மாலை', 'pm'], ['இரவு', 'night'], ['ராத்திரி', 'night'], ['morning', 'am'], ['afternoon', 'pm'], ['evening', 'pm'], ['night', 'night'], ['noon', 'noon'],
];

/**
 * Clock time in a value. Returns { value: 'HH:MM', candidates: ['HH:MM', …], period, flags, confidence } or null.
 * 12-hour times without AM/PM (or a Tamil period word) give two candidates and an 'ampm' flag.
 */
export function readClockTime(v) {
  const s = String(v || '');
  const ls = s.toLowerCase();
  let m = ls.match(/(\d{1,2})\s?[:.\-]\s?(\d{2})(?:\s?[:.]\s?(\d{2}))?(?!\d)\s*(a\.?\s?m\.?|p\.?\s?m\.?|hrs?\.?|hours|மணி)?/);
  let h, min;
  let suffix = null;
  if (m) { h = Number(m[1]); min = Number(m[2]); suffix = m[4] || null; } else {
    m = s.match(/(\d{1,2})\s*மணி\s*(?:(\d{1,2})\s*(?:நிமிடம்|நிமி\S*|நி\.?)?)?/) || ls.match(/(\d{1,2})\s*(a\.?\s?m\.?|p\.?\s?m\.?)(?![a-z])/);
    if (!m) return null;
    h = Number(m[1]); min = m[2] && /^\d+$/.test(m[2]) ? Number(m[2]) : 0;
    if (m[2] && !/^\d+$/.test(m[2])) suffix = m[2];
  }
  if (!(h >= 0 && h <= 24 && min >= 0 && min < 60)) return null;
  const flags = [];
  let period = null;
  if (suffix && /^a/.test(suffix)) period = 'am'; else if (suffix && /^p/.test(suffix)) period = 'pm'; else if (suffix && /^h/.test(suffix)) period = '24h';
  if (!period) for (const [w, p] of PERIODS) if (s.includes(w) || ls.includes(w)) { period = p; break; }
  const hh = (x) => String(x % 24).padStart(2, '0'), mm = String(min).padStart(2, '0');
  let hours;
  let candidates = null;
  if (h > 12 || h === 0 || period === '24h') hours = [h % 24];
  else if (period === 'am') hours = [h === 12 ? 0 : h];
  else if (period === 'pm') hours = [h === 12 ? 12 : h + 12];
  else if (period === 'noon') hours = [h === 12 || h >= 10 ? h : h + 12];
  else if (period === 'midnight') hours = [h === 12 ? 0 : h];
  else if (period === 'night') {
    hours = [h === 12 ? 0 : h >= 6 ? h + 12 : h];
    if (h < 6 || h === 12) flags.push({ code: 'night-date', ...T('Born after midnight (“night”) — old jathagams often write the previous day’s date for such births. Please check the date.', 'நள்ளிரவுக்குப் பின் பிறப்பு (“இரவு”) — பழைய ஜாதகங்களில் முந்தைய நாளின் தேதி எழுதப்படுவதுண்டு. தேதியைச் சரிபார்க்கவும்.') });
  } else {
    hours = [h === 12 ? 12 : h, h === 12 ? 0 : h + 12];
    candidates = hours.map((x) => `${hh(x)}:${mm}`);
    flags.push({ code: 'ampm', ...T(`The time “${m[0].trim()}” has no AM/PM — please choose morning or evening.`, `“${m[0].trim()}” நேரத்தில் காலை/மாலை குறிப்பிடப்படவில்லை — சரியானதைத் தேர்வு செய்யவும்.`) });
  }
  const value = `${hh(hours[0])}:${mm}`;
  return { value, candidates: candidates || [value], period, flags, confidence: candidates ? 'low' : 'high' };
}

/** Nazhigai / vinadi after sunrise: "உதயாதி நாழிகை 12-30", "12 நாழிகை 30 விநாடி", "Nazhigai 12.30", "Ghati 12 Vighati 30". */
export function readNazhigai(text) {
  const s = String(text || '');
  const NA = '(?:நா[ழள]ிகை|நாழிகே|nazh?igai|nazhikai|naligai|naazhigai|ghatis?|ghatika|gh\\.)';
  const VI = '(?:வி[நன]ாடி|வி[நன]ாழிகை|vinadi|vinaadi|vighatis?|vinazhigai|vig\\.)';
  // "25 நாழிகை 40 விநாடி" (number first) is tried before "நாழிகை 25-40" / "நாழிகை: 25 விநாடி 40".
  let m = s.match(new RegExp(`(?<![\\d/.\\-])(\\d{1,2})[ \\t]*${NA}(?:[ \\t]*(\\d{1,2})[ \\t]*${VI})?`, 'i'));
  let n, v;
  if (m) { n = Number(m[1]); v = Number(m[2] || 0); } else {
    m = s.match(new RegExp(`${NA}[ \\t]*[:\\-=]?[ \\t]*(\\d{1,2})(?:[ \\t]*[-.:/][ \\t]*(\\d{1,2})(?!\\d))?(?:[ \\t]*${VI}[ \\t]*[:\\-=]?[ \\t]*(\\d{1,2}))?`, 'i'));
    if (!m) return null;
    n = Number(m[1]); v = Number(m[2] ?? m[3] ?? 0);
  }
  if (!(n >= 0 && n < 60 && v >= 0 && v < 60)) return null;
  return {
    nazhigai: n, vinadi: v, minutesAfterSunrise: n * 24 + v * 0.4, confidence: 'low',
    flags: [{ code: 'nazhigai', ...T(`Birth time written as ${n} nazhigai ${v} vinadi after sunrise. It is converted using the sunrise at the birth place on the birth date — this needs your confirmation.`, `பிறந்த நேரம் சூரிய உதயத்திலிருந்து ${n} நாழிகை ${v} விநாடி என எழுதப்பட்டுள்ளது. பிறந்த ஊரின் அன்றைய சூரிய உதயத்தைக் கொண்டு மணியாக மாற்றப்படும் — நீங்கள் உறுதிசெய்ய வேண்டும்.`) }],
  };
}

/** Nazhigai → clock time: sunrise (a Date) plus the minutes, shown in the given UTC offset (hours). */
export function nazhigaiToClock(minutesAfterSunrise, sunrise, tzHours) {
  const t = new Date(sunrise.getTime() + minutesAfterSunrise * 60000 + tzHours * 3600000);
  return { time: t.toISOString().slice(11, 16), date: t.toISOString().slice(0, 10), nextDay: t.toISOString().slice(0, 10) !== new Date(sunrise.getTime() + tzHours * 3600000).toISOString().slice(0, 10) };
}

/** Tamil calendar date "குரோதி வருடம் ஆடி மாதம் 12ம் தேதி" → { yearIndex, month, day } (month/day may be null). */
export function readTamilDate(text) {
  const s = String(text || '');
  const YW = '(?:வருடம்|வருஷம்|வருசம்|ஆண்டு|ஸம்வத்ஸரம்|சம்வத்சரம்|varudam|varusham|varsham|samvatsaram|year)';
  const re = new RegExp(`([${TA_CHAR}]+|[A-Za-z]+)\\s*(?:ஆம்\\s*|ம்\\s*)?${YW}`, 'gi');
  for (const m of s.matchAll(re)) {
    const y = findName(m[1], YEARS, { fuzzy: true });
    if (!y) continue;
    const rest = s.slice(m.index + m[0].length, m.index + m[0].length + 60);
    const mon = findName(rest, MONTHS, { fuzzy: false });
    let day = null;
    if (mon) {
      const after = rest.slice(mon.at + mon.name.length);
      const d = after.match(/^\s*(?:மாதம்|மாசம்|மீ|masam|month)?\.?\s*(\d{1,2})(?!\d)/i) || rest.slice(0, mon.at).match(/(\d{1,2})\s*(?:ஆம்|ம்|-?ம்)?\s*(?:தேதி)?\s*$/);
      if (d && Number(d[1]) >= 1 && Number(d[1]) <= 32) day = Number(d[1]);
    }
    return { yearIndex: y.key, month: mon ? mon.key : null, day, fuzzy: y.fuzzy, text: (m[0] + rest.slice(0, mon ? mon.at + mon.name.length + 12 : 0)).trim() };
  }
  return null;
}

/**
 * Gregorian dates matching a Tamil calendar date (the 60-year cycle repeats, so there can be several).
 * Only dates between `maxAge` years ago and `now` are returned, newest first.
 */
export function tamilDateCandidates({ yearIndex, month, day }, { now = new Date(), maxAge = 110, lat = 13.08, lon = 80.27, tz = 5.5 } = {}) {
  if (yearIndex == null || month == null || !day) return [];
  const out = [];
  const nowY = now.getUTCFullYear();
  for (let start = 1987 + yearIndex - 60 * 4; start <= nowY; start += 60) {
    if (start < nowY - maxAge - 1) continue;
    // Chithirai 1 ≈ 14 April; each Tamil month ≈ 30.44 days.
    const approx = Date.UTC(start, 3, 14) + (month * 30.44 + day - 1) * 86400000;
    for (let k = -5; k <= 5; k++) {
      const noonUtc = new Date(Math.round(approx / 86400000 + k) * 86400000 + (12 - tz) * 3600000);
      if (noonUtc > now) continue;
      const td = tamilDate(noonUtc, lat, lon, tz);
      if (td.month === month && td.day === day && td.year.index === yearIndex) {
        const iso = new Date(noonUtc.getTime() + tz * 3600000).toISOString().slice(0, 10);
        if (!out.includes(iso)) out.push(iso);
      }
    }
  }
  return out.sort().reverse();
}

const PADA_RE = /(?:பாதம்|பாத|padam|pada|paadam|quarter|charan(?:am)?)\s*[:\-]?\s*([1-4])(?!\d)|([1-4])\s*(?:ம்|ஆம்|-ம்|st|nd|rd|th)?\s*(?:பாதம்|பாத|padam|pada|paadam|charan)/i;

/** Dasa balance: "சுக்கிர தசை இருப்பு 12 வ 4 மா 10 நா", "Venus Dasa balance 12Y 4M 10D", "Guru 3 years 2 months". */
export function readBalance(v) {
  const s = String(v || '');
  const p = findName(s, DASA_PLANETS, { fuzzy: false });
  const num = (re) => { const m = s.match(re); return m ? Number(m[1]) : null; };
  let years = num(/(\d{1,2})\s*(?:வருடம்|வருஷம்|வருசம்|ஆண்டு|வ\.?(?![஀-௿])|y(?:ea)?rs?\.?|y\b|Y)/i);
  let months = num(/(\d{1,2})\s*(?:மாதம்|மாசம்|மா\.?(?![஀-௿])|m(?:on)?ths?\.?|m\b|M)/i);
  let days = num(/(\d{1,2})\s*(?:நாள்|நாட்கள்|நா\.?(?![஀-௿])|days?|d\b|D)/i);
  if (years == null && months == null) {
    const t = s.match(/(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})/);
    if (t) [years, months, days] = [Number(t[1]), Number(t[2]), Number(t[3])];
  }
  if (years == null && months == null) return null;
  if ((years ?? 0) > 20 || (months ?? 0) > 11 || (days ?? 0) > 31) return null;
  return { planet: p ? p.key : null, years: years ?? 0, months: months ?? 0, days: days ?? 0 };
}

function cleanName(v) {
  const s = String(v || '').replace(/^(?:திரு|செல்வன்|செல்வி|திருமதி|Mr|Mrs|Ms|Master|Baby|Selvan|Selvi|Kumari|Chi)\.?\s+/i, '').replace(/[^A-Za-z஀-௿ .']/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length >= 2 ? s.slice(0, 60) : null;
}

/** Place text → the search head ("Madurai, Tamil Nadu" → "Madurai"; "மதுரை மாவட்டம்" → "மதுரை"). */
function cleanPlace(v) {
  return String(v || '').replace(/\(.*?\)/g, ' ').replace(/\b(?:dist(?:rict)?|dt|taluk|tk|town|city|village|post|po)\b\.?/gi, ' ')
    .replace(/(?:மாவட்டம்|மா\.|வட்டம்|கிராமம்|நகர்|ஊர்)(?![஀-௿])/g, ' ').replace(/\b\d{6}\b/g, ' ')
    .replace(/[^A-Za-z஀-௿ ,.'-]/g, ' ').replace(/\s+/g, ' ').replace(/^[\s,.-]+|[\s,.-]+$/g, '').slice(0, 60);
}

/**
 * Match a place against the built-in gazetteer: { status: 'matched' | 'choose' | 'not-found', options }.
 * (The confirmation panel repeats this check on whatever the family finally types.)
 */
export function matchPlace(text) {
  const raw = String(text || '').trim();
  if (!raw) return { status: 'not-found', options: [] };
  const fold = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const parts = raw.split(',').map((x) => x.trim()).filter(Boolean);
  let found = searchLocalPlaces(raw, 6);
  if (!found.length && parts.length > 1) found = searchLocalPlaces(parts[0], 6);
  if (!found.length && isTa(raw)) found = searchLocalPlaces(raw.split(/\s+/)[0], 6);
  const head = fold(parts[0]);
  const exact = found.filter((p) => fold(p.name) === head || fold(placeLabel(p, 'ta').split(',')[0]) === head);
  const options = exact.length ? exact : found;
  return { status: options.length === 1 ? 'matched' : options.length ? 'choose' : 'not-found', options };
}

// ---------------------------------------------------------------------------------------------------------------
// Main entry

const F = {
  noDate: { code: 'no-date', ...T('No date of birth was found — please type it.', 'பிறந்த தேதி கிடைக்கவில்லை — உள்ளிடவும்.') },
  noisy: (field) => ({ code: 'noisy', ...T(`The ${field} was read from unclear text — please check it.`, `${field === 'date' ? 'தேதி' : field === 'time' ? 'நேரம்' : 'இந்த விவரம்'} தெளிவில்லாத எழுத்திலிருந்து படிக்கப்பட்டது — சரிபார்க்கவும்.`) }),
  weekday: { code: 'weekday', ...T('The weekday written next to the date does not match it — please check the date.', 'தேதிக்கு அருகில் எழுதிய கிழமை அந்தத் தேதியுடன் பொருந்தவில்லை — தேதியைச் சரிபார்க்கவும்.') },
  tamilCycle: (txt, n) => ({ code: 'tamil-cycle', ...T(`Read from the Tamil calendar date “${txt}”. The 60-year cycle repeats, so ${n > 1 ? `${n} dates match — please choose the right one` : 'please check the year'}.`, `தமிழ் நாட்காட்டித் தேதி “${txt}” இலிருந்து படிக்கப்பட்டது. 60 ஆண்டுச் சுழற்சி மீண்டும் வருவதால் ${n > 1 ? `${n} தேதிகள் பொருந்துகின்றன — சரியானதைத் தேர்வு செய்யவும்` : 'ஆண்டைச் சரிபார்க்கவும்'}.`) }),
  tamilMismatch: (iso) => ({ code: 'tamil-mismatch', ...T(`The Tamil calendar date written in the jathagam does not fall on ${iso} — please check the date.`, `ஜாதகத்தில் எழுதிய தமிழ்த் தேதி ${iso} உடன் பொருந்தவில்லை — தேதியைச் சரிபார்க்கவும்.`) }),
  placeChoose: (p) => ({ code: 'place-choose', ...T(`“${p}” matches more than one place — please choose.`, `“${p}” பல இடங்களுடன் பொருந்துகிறது — தேர்வு செய்யவும்.`) }),
  placeMissing: (p) => ({ code: 'place-missing', ...T(`“${p}” was not found in the place list — please pick the birth place from the suggestions.`, `“${p}” இடப் பட்டியலில் இல்லை — பரிந்துரையிலிருந்து பிறந்த இடத்தைத் தேர்வு செய்யவும்.`) }),
  starRasi: { code: 'star-rasi', ...T('The birth star and the Rasi written do not agree — please check both.', 'எழுதிய நட்சத்திரமும் ராசியும் பொருந்தவில்லை — இரண்டையும் சரிபார்க்கவும்.') },
  padaGuess: { code: 'pada', ...T('The pada (quarter) was not read — please check it.', 'பாதம் படிக்கப்படவில்லை — சரிபார்க்கவும்.') },
  balanceLord: (p, lord) => ({ code: 'balance-lord', ...T(`The dasa balance is for ${p}, but the birth star’s dasa is ${lord} — please check.`, `தசா இருப்பு ${p} தசைக்கு உள்ளது; ஆனால் நட்சத்திரப்படி பிறப்பு தசை ${lord} — சரிபார்க்கவும்.`) }),
  fuzzy: (what) => ({ code: 'fuzzy', ...T(`The ${what} was read from unclear text — please check it.`, `${what === 'star' ? 'நட்சத்திரம்' : what === 'rasi' ? 'ராசி' : what === 'lagna' ? 'லக்னம்' : 'இந்த விவரம்'} தெளிவில்லாத எழுத்திலிருந்து படிக்கப்பட்டது — சரிபார்க்கவும்.`) }),
};

/**
 * Read birth details from OCR / PDF text.
 * Returns { text, fields: { name, gender, date, tamilDate, time, nazhigai, place, star, rasi, lagna, balance }, flags, low }.
 * Each field is null when not found; `flags` is [{ field, code, en, ta }]; `low` lists the fields to highlight.
 */
/** Date/time tokens whose letters were read as digits ("l5/O8" → "15/08"), after the fix. */
function digitFixes(input) {
  const out = [];
  const s = String(input || '').normalize('NFC');
  for (const m of s.matchAll(/(?<![A-Za-z])[0-9OoIl|]+(?:\s?[/.\-:]\s?[0-9OoIl|]+)+(?![A-Za-z])/g)) {
    if (/\d/.test(m[0]) && /[OoIl|]/.test(m[0])) out.push(m[0].replace(/[Oo]/g, '0').replace(/[Il|]/g, '1'));
  }
  return out;
}

export function parseHoroscopeText(input, { now = new Date() } = {}) {
  const text = cleanText(input);
  const fixes = digitFixes(input);
  const noisy = (v) => fixes.some((x) => String(v || '').includes(x));
  const vals = labelValues(text);
  const of = (field) => vals.filter((v) => v.field === field);
  const flags = [];
  const flag = (field, f) => flags.push({ field, ...f });
  const fields = { name: null, gender: null, date: null, tamilDate: null, time: null, nazhigai: null, place: null, star: null, rasi: null, lagna: null, balance: null };

  // Name
  for (const h of of('name')) {
    const n = cleanName(h.value);
    if (n && !/\d/.test(h.value.slice(0, 3))) { fields.name = { value: n, confidence: h.fuzzy || n.length < 3 ? 'medium' : 'high' }; break; }
  }

  // Gender
  const gtext = of('gender').map((h) => h.value).join(' ') || text;
  const male = /(?:^|[^஀-௿])ஆண்(?:\s*குழந்தை|\s*$|[^஀-௿])|\bmale\b|\bboy\b|\bson\b/i.test(gtext);
  const female = /(?:^|[^஀-௿])பெண்(?:\s*குழந்தை|\s*$|[^஀-௿])|\bfemale\b|\bgirl\b|\bdaughter\b/i.test(gtext);
  if (male !== female) fields.gender = { value: male ? 'male' : 'female', confidence: of('gender').length ? 'high' : 'medium' };
  else if (!male && of('name').length) {
    // Honorific before the name: செல்வன் / Master → boy; செல்வி / திருமதி / Kumari → girl.
    const nv = of('name')[0].value;
    if (/^(?:செல்வன்|திரு|Mr\.?|Master|Selvan|Chi\.?)\s/i.test(nv)) fields.gender = { value: 'male', confidence: 'medium' };
    else if (/^(?:செல்வி|திருமதி|சௌ\.?|Ms\.?|Mrs\.?|Miss|Kumari|Selvi|Sow\.?)\s/i.test(nv)) fields.gender = { value: 'female', confidence: 'medium' };
  }

  // Gregorian date (labelled first, then anywhere)
  let dateHit = null;
  for (const h of of('date')) { const d = readGregorianDate(h.value); if (d) { dateHit = { written: d, at: h, labelled: true }; break; } }
  if (!dateHit) {
    for (const line of text.split('\n')) {
      if (/நேரம்|time|நாழிகை/i.test(line) && !/தேதி|date/i.test(line)) continue;
      const d = readGregorianDate(line);
      if (d) { dateHit = { written: d, at: { value: line }, labelled: false }; break; }
    }
  }
  if (dateHit) {
    const wd = parseWrittenDate(dateHit.written, { now });
    let candidates = wd.candidates;
    const dflags = [...wd.flags];
    let confidence = !wd.candidates.length ? 'low' : wd.ambiguous || wd.flags.length ? 'low' : dateHit.labelled ? 'high' : 'medium';
    const wk = weekdayIn(dateHit.at.value);
    if (wk != null && candidates.length) {
      const match = candidates.filter((c) => new Date(`${c.iso}T12:00:00Z`).getUTCDay() === wk);
      if (match.length && match.length < candidates.length) { candidates = match; if (match.length === 1) { confidence = 'medium'; dflags.splice(0, dflags.length, ...dflags.filter((f) => f.code !== 'day-month' && f.code !== 'two-digit-year')); } }
      else if (!match.length) { dflags.push({ code: 'weekday', ...F.weekday }); confidence = 'low'; }
    }
    if (noisy(dateHit.at.value)) { confidence = lower(confidence, 'medium'); dflags.push({ code: 'noisy', ...F.noisy('date') }); }
    fields.date = { written: dateHit.written, candidates, flags: dflags, confidence, iso: candidates.length === 1 && !dflags.length ? candidates[0].iso : null };
    for (const f of dflags) flag('date', f);
  }

  // Tamil calendar date (year name, month, day)
  const td = readTamilDate(text);
  if (td) {
    const iso = fields.date?.iso || (fields.date?.candidates?.length === 1 ? fields.date.candidates[0].iso : null);
    let cands = td.month != null && td.day ? tamilDateCandidates(td, { now }) : [];
    // A weekday written with the Tamil date ("… 12ம் தேதி சனிக்கிழமை") picks the right 60-year cycle.
    const wk = weekdayIn(text.slice(text.indexOf(td.text), text.indexOf(td.text) + td.text.length + 30));
    if (wk != null && cands.length > 1) {
      const match = cands.filter((c) => new Date(`${c}T12:00:00Z`).getUTCDay() === wk);
      if (match.length) cands = match;
    }
    fields.tamilDate = { ...td, candidates: cands, confidence: td.fuzzy ? 'medium' : 'high' };
    // The Tamil date settles a day/month (or century) ambiguity when exactly one reading falls on it.
    if (!iso && fields.date && !fields.date.fromTamil && fields.date.candidates.length > 1 && td.month != null && td.day) {
      const wide = tamilDateCandidates(td, { now, maxAge: 200 });
      const hit = fields.date.candidates.filter((c) => wide.includes(c.iso));
      if (hit.length === 1) {
        fields.date.candidates = hit;
        fields.date.flags = fields.date.flags.filter((x) => x.code !== 'day-month' && x.code !== 'two-digit-year');
        for (let i = flags.length - 1; i >= 0; i--) if (flags[i].field === 'date' && ['day-month', 'two-digit-year'].includes(flags[i].code)) flags.splice(i, 1);
        fields.date.confidence = 'medium';
        fields.date.byTamil = true;
      }
    }
    if (iso && cands.length && !cands.includes(iso)) {
      // A whole-cycle check only says something when the Gregorian date is in range of the candidates.
      const near = tamilDateCandidates(td, { now, maxAge: 200 });
      if (!near.includes(iso)) { flag('date', F.tamilMismatch(iso)); fields.date.confidence = 'low'; fields.tamilDate.confidence = 'low'; }
    }
    if (!fields.date && cands.length) {
      flag('date', F.tamilCycle(td.text, cands.length));
      fields.date = { written: null, candidates: cands.map((c) => ({ iso: c, reading: 'TAMIL' })), flags: [], confidence: cands.length === 1 ? 'medium' : 'low', iso: null, fromTamil: true };
    }
  }
  if (!fields.date) flag('date', F.noDate);

  // Time (clock) and nazhigai
  for (const h of of('time')) {
    if (/நாழிகை|நாளிகை|nazh?igai|ghati/i.test(h.value)) continue;
    const t = readClockTime(h.value);
    if (t) {
      fields.time = { ...t, confidence: h.fuzzy ? lower(t.confidence, 'medium') : t.confidence };
      if (noisy(h.value)) { fields.time.confidence = 'low'; fields.time.flags = [...t.flags, { code: 'noisy', ...F.noisy('time') }]; }
      break;
    }
  }
  if (!fields.time) {
    for (const line of text.split('\n')) {
      if (!/(a\.?\s?m\.?|p\.?\s?m\.?|மணி|காலை|மாலை|இரவு|பகல்)/i.test(line) || /நாழிகை|nazh?igai/i.test(line)) continue;
      if (readGregorianDate(line) && !/:/.test(line.replace(readGregorianDate(line), ''))) continue;
      const t = readClockTime(line.replace(/\d{1,4}\s?[/\-]\s?\d{1,2}\s?[/\-]\s?\d{2,4}/, ' '));
      if (t) { fields.time = { ...t, confidence: lower(t.confidence, 'medium') }; break; }
    }
  }
  if (fields.time) for (const f of fields.time.flags) flag('time', f);
  const nz = readNazhigai(text);
  if (nz) { fields.nazhigai = nz; for (const f of nz.flags) flag('time', f); }

  // Place
  for (const h of of('place')) {
    const p = cleanPlace(h.value);
    if (!p || p.length < 2) continue;
    const m = matchPlace(p);
    fields.place = { value: p, status: m.status, options: m.options.map((o) => ({ ...o, label: placeLabel(o) })), confidence: m.status === 'matched' ? (h.fuzzy ? 'medium' : 'high') : 'low' };
    if (m.status === 'choose') flag('place', F.placeChoose(p));
    if (m.status === 'not-found') flag('place', F.placeMissing(p));
    break;
  }

  // Star (+ pada), Rasi, Lagnam
  const nameField = (field, table) => {
    for (const h of of(field)) {
      const hit = findName(h.value, table);
      if (hit) return { index: hit.key, confidence: hit.fuzzy || h.fuzzy ? 'medium' : 'high', value: h.value };
    }
    return null;
  };
  const star = nameField('star', STARS);
  if (star) {
    const pm = star.value.match(PADA_RE) || text.match(PADA_RE);
    fields.star = { index: star.index, pada: pm ? Number(pm[1] || pm[2]) : null, confidence: star.confidence };
    if (star.confidence !== 'high') flag('star', F.fuzzy('star'));
  }
  const rasi = nameField('rasi', RASI_TABLE);
  if (rasi) { fields.rasi = { index: rasi.index, confidence: rasi.confidence }; if (rasi.confidence !== 'high') flag('rasi', F.fuzzy('rasi')); }
  const lagna = nameField('lagna', RASI_TABLE);
  if (lagna) { fields.lagna = { index: lagna.index, confidence: lagna.confidence }; if (lagna.confidence !== 'high') flag('lagna', F.fuzzy('lagna')); }
  if (fields.star) {
    const s = fields.star.index;
    const rasiOfPada = (p) => Math.floor((s * 4 + p - 1) / 9);
    if (fields.rasi) {
      const ok = fields.star.pada ? rasiOfPada(fields.star.pada) === fields.rasi.index : [1, 2, 3, 4].some((p) => rasiOfPada(p) === fields.rasi.index);
      if (!ok) { flag('star', F.starRasi); fields.star.confidence = 'low'; fields.rasi.confidence = 'low'; }
      else if (!fields.star.pada) fields.star.padaGuess = [1, 2, 3, 4].find((p) => rasiOfPada(p) === fields.rasi.index);
    }
    if (!fields.star.pada) { flag('star', F.padaGuess); fields.star.padaConfidence = 'low'; }
  }

  // Dasa balance
  for (const h of of('balance')) {
    // The planet is often written just before the label: "சுக்கிர தசை இருப்பு".
    const lineStart = text.lastIndexOf('\n', h.start) + 1;
    const b = readBalance(`${text.slice(lineStart, h.start)} ${h.value}`);
    if (b) {
      fields.balance = { ...b, confidence: 'medium' };
      if (fields.star && b.planet && NAKSHATRAS[fields.star.index].lord !== b.planet) { flag('balance', F.balanceLord(b.planet, NAKSHATRAS[fields.star.index].lord)); fields.balance.confidence = 'low'; }
      else if (fields.star && b.planet) fields.balance.confidence = 'high';
      break;
    }
  }

  const low = Object.entries(fields).filter(([, v]) => v && v.confidence === 'low').map(([k]) => k);
  for (const f of flags) if (!low.includes(f.field)) low.push(f.field);
  return { text, fields, flags, low, found: Object.values(fields).filter(Boolean).length };
}

// ---------------------------------------------------------------------------------------------------------------
// Draft helpers for the written-jathagam screen (pure — the screen passes its draft object)

/**
 * Copy what was read into a kattam-screen draft. Never marks it confirmed: the family always sees the form and then
 * the confirmation panel. Returns the new draft (the input is not modified).
 */
export function importToDraft(draft, parsed, { source = 'image' } = {}) {
  const d = JSON.parse(JSON.stringify(draft || {}));
  d.kattam ||= { star: null, pada: 1, lagna: null, planets: {}, balance: null };
  d.kattam.planets ||= {};
  const f = parsed.fields;
  const filled = [];
  if (f.name) { d.name = f.name.value; filled.push('name'); }
  if (f.gender) { d.gender = f.gender.value; filled.push('gender'); }
  d.tamilDateRead = null;
  if (f.date?.fromTamil) {
    d.writtenDate = ''; d.date = f.date.candidates.length === 1 ? f.date.candidates[0].iso : '';
    d.tamilDateRead = { text: f.tamilDate.text, candidates: f.date.candidates.map((c) => c.iso) };
    filled.push('date');
  } else if (f.date) {
    d.writtenDate = f.date.written; d.date = f.date.iso || ''; d.dateChoice = null;
    // A weekday that picks one reading is kept as the default choice; the panel still shows the flag.
    if (!f.date.iso && f.date.candidates.length === 1) d.dateChoice = f.date.candidates[0].iso;
    filled.push('date');
  }
  if (f.tamilDate) { d.tamilYear = f.tamilDate.yearIndex; filled.push('tamilYear'); }
  d.time = ''; d.timeOptions = null; d.autoTime = null; d.nazhigai = null;
  if (f.time) { d.time = f.time.value; d.autoTime = f.time.value; d.timeOptions = f.time.candidates.length > 1 ? f.time.candidates : null; filled.push('time'); }
  if (f.nazhigai) { d.nazhigai = { nazhigai: f.nazhigai.nazhigai, vinadi: f.nazhigai.vinadi, minutesAfterSunrise: f.nazhigai.minutesAfterSunrise }; filled.push('nazhigai'); }
  if (f.place) {
    const one = f.place.status === 'matched' ? f.place.options[0] : null;
    Object.assign(d, { place: one ? one.label : f.place.value, placePicked: false, placeChoice: null, lat: null, lon: null, zone: undefined });
    filled.push('place');
  }
  if (f.star) { d.kattam.star = f.star.index; d.kattam.pada = f.star.pada || f.star.padaGuess || 1; filled.push('star'); if (!f.star.pada) filled.push('pada'); }
  if (f.rasi) { d.kattam.planets.Moon = f.rasi.index; filled.push('rasi'); }
  if (f.lagna) { d.kattam.lagna = f.lagna.index; filled.push('lagna'); }
  if (f.balance) { d.kattam.balance = { years: f.balance.years, months: f.balance.months }; filled.push('balance'); }
  const low = [...parsed.low];
  if (f.star && !f.star.pada) low.push('pada');
  if (f.tamilDate && f.tamilDate.confidence !== 'high') low.push('tamilYear');
  d.autoRead = { source, filled, low: [...new Set(low)], flags: parsed.flags, text: String(parsed.text || '').slice(0, 4000) };
  d.confirming = false;
  d.confirmed = false;
  return d;
}

/** The screen may store the profile and open the chart only after the family pressed “Confirm” on the panel. */
export function mayCalculate(draft) {
  return Boolean(draft && draft.confirming === true && draft.confirmed === true);
}
