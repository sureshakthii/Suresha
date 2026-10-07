// Name, mobile and vehicle numerology (Chaldean / Cheiro system, as used in Tamil numerology apps).
// Name number is compared with the birth number (day of birth) and destiny number (full date)
// from personal.js luckyNumbers().
import { luckyNumbers, NUMBER_PLANET } from './personal.js';

const T = (en, ta) => ({ en, ta });

/** Chaldean letter values (no letter has 9). */
export const CHALDEAN = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 8, G: 3, H: 5, I: 1, J: 1, K: 2, L: 3, M: 4,
  N: 5, O: 7, P: 8, Q: 1, R: 2, S: 3, T: 4, U: 6, V: 6, W: 6, X: 5, Y: 1, Z: 7,
};

export const reduceNum = (n) => { n = Math.abs(Math.trunc(n)); while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n; };

const PLANET_TA = { Sun: 'சூரியன்', Moon: 'சந்திரன்', Jupiter: 'குரு', Rahu: 'ராகு', Mercury: 'புதன்', Venus: 'சுக்கிரன்', Ketu: 'கேது', Saturn: 'சனி', Mars: 'செவ்வாய்' };

/** Name number: sum of Chaldean letter values (non-Latin characters ignored). */
export function nameNumber(name) {
  const letters = String(name || '').toUpperCase().replace(/[^A-Z]/g, '');
  const compound = [...letters].reduce((s, c) => s + CHALDEAN[c], 0);
  const single = reduceNum(compound);
  return { letters: letters.length, compound, single, planet: single ? NUMBER_PLANET[single] : null };
}

// Short, positive meanings of the single numbers (fallback) and compound numbers 10–52 (Cheiro).
const SINGLE_MEANING = {
  1: T('Leadership, independence and confidence (Sun).', 'தலைமை, சுதந்திரம், தன்னம்பிக்கை (சூரியன்).'),
  2: T('Gentleness, imagination and harmony (Moon).', 'மென்மை, கற்பனை, இணக்கம் (சந்திரன்).'),
  3: T('Wisdom, discipline and growth (Jupiter).', 'ஞானம், ஒழுக்கம், வளர்ச்சி (குரு).'),
  4: T('Originality, hard work and reform (Rahu).', 'புதுமை, உழைப்பு, சீர்திருத்தம் (ராகு).'),
  5: T('Intelligence, trade and quick thinking (Mercury).', 'அறிவு, வணிகம், விரைவான சிந்தனை (புதன்).'),
  6: T('Love, beauty, comfort and arts (Venus).', 'அன்பு, அழகு, சுகம், கலை (சுக்கிரன்).'),
  7: T('Spiritual insight, research and travel (Ketu).', 'ஆன்மிக நுண்ணறிவு, ஆய்வு, பயணம் (கேது).'),
  8: T('Patience, perseverance and lasting success (Saturn).', 'பொறுமை, விடாமுயற்சி, நிலையான வெற்றி (சனி).'),
  9: T('Courage, energy and service (Mars).', 'தைரியம், ஆற்றல், சேவை (செவ்வாய்).'),
};
const COMPOUND_GROUPS = [
  [[10, 19], T('Honour, self-confidence and rising fortune.', 'மரியாதை, தன்னம்பிக்கை, உயரும் அதிர்ஷ்டம்.')],
  [[11, 20], T('Faith and new beginnings — move ahead with patience.', 'நம்பிக்கை, புதிய தொடக்கங்கள் — பொறுமையுடன் முன்னேறுங்கள்.')],
  [[12, 30, 39, 48], T('Thoughtful mind; success through knowledge and service.', 'சிந்தனையுள்ள மனம்; அறிவு, சேவை மூலம் வெற்றி.')],
  [[13, 22, 31, 40, 49], T('Change and renewal — plan carefully and you progress.', 'மாற்றம், புதுப்பித்தல் — கவனமாகத் திட்டமிட்டால் முன்னேற்றம்.')],
  [[14, 23, 32, 41, 50], T('Communication, trade and helpful contacts bring success.', 'தொடர்பு, வணிகம், உதவும் நட்புகள் வெற்றி தரும்.')],
  [[15, 24, 33, 42, 51], T('Charm, love and support from people in power.', 'கவர்ச்சி, அன்பு, அதிகாரத்தில் உள்ளோரின் ஆதரவு.')],
  [[16, 25, 34, 43, 52], T('Strength through experience — think before big moves.', 'அனுபவத்தால் வலிமை — பெரிய முடிவுகளுக்கு முன் சிந்தியுங்கள்.')],
  [[17, 26, 35, 44], T('Steady effort brings a lasting name; choose partners wisely.', 'நிலையான உழைப்பு நிலைத்த பெயர் தரும்; கூட்டாளிகளைக் கவனமாகத் தேர்ந்தெடுங்கள்.')],
  [[18, 27, 36, 45], T('Creative authority and courage; stay calm in disputes.', 'படைப்பாற்றல், அதிகாரம், தைரியம்; வாக்குவாதங்களில் அமைதி காக்கவும்.')],
  [[21], T('Victory and advancement after effort — the crown number.', 'முயற்சிக்குப் பின் வெற்றியும் உயர்வும் — கிரீட எண்.')],
  [[28, 37, 46], T('Ambition, friendship and good progress with planning.', 'லட்சியம், நட்பு, திட்டமிடலுடன் நல்ல முன்னேற்றம்.')],
  [[29, 38, 47], T('Intuition and kindness; patience in relationships pays.', 'உள்ளுணர்வு, கருணை; உறவுகளில் பொறுமை பலன் தரும்.')],
];
const COMPOUND_MEANING = {};
for (const [nums, m] of COMPOUND_GROUPS) for (const n of nums) COMPOUND_MEANING[n] = m;

/** Short bilingual meaning for a compound number (10–52); other values use the single-number meaning. */
export function compoundMeaning(n) {
  if (COMPOUND_MEANING[n]) return COMPOUND_MEANING[n];
  return SINGLE_MEANING[reduceNum(n)] || T('', '');
}
export const singleMeaning = (n) => SINGLE_MEANING[reduceNum(n)] || T('', '');

function harmonyOf(single, ln) {
  if (!single) return 'neutral';
  if (ln.lucky.includes(single)) return 'good';
  if (ln.avoid.includes(single)) return 'change';
  return 'neutral';
}
const planetBi = (n) => T(NUMBER_PLANET[n], PLANET_TA[NUMBER_PLANET[n]]);

/** Small spelling variants: double a vowel / u→oo, add a letter, double the last letter. */
function variants(name) {
  const base = String(name).trim();
  const out = new Set();
  const ins = (i, s) => out.add(base.slice(0, i) + s + base.slice(i));
  const isUp = base === base.toUpperCase();
  const c = (s) => (isUp ? s.toUpperCase() : s.toLowerCase());
  for (let i = 1; i < base.length; i++) {
    const ch = base[i];
    if (/[aeiou]/i.test(ch)) ins(i, ch);                              // double a vowel
    if (/u/i.test(ch)) out.add(base.slice(0, i) + c('oo') + base.slice(i + 1)); // u → oo
    if (/i/i.test(ch)) out.add(base.slice(0, i) + c('ee') + base.slice(i + 1)); // i → ee
  }
  const last = base[base.length - 1];
  if (last) {
    out.add(base + last);                                             // double the last letter
    for (const s of ['a', 'h', 'e', 'y']) out.add(base + c(s));
  }
  if (/[bcdfgjklmnpqrstvwxz]/i.test(base[0] || '')) ins(1, c('h'));    // Sh / Th style
  out.delete(base);
  return [...out].filter((v) => /^[A-Za-z][A-Za-z .'-]*$/.test(v));
}

/**
 * Compare the name number with birth & destiny numbers.
 * Returns { name, birth, destiny, lucky, harmony: 'good'|'neutral'|'change', text:{en,ta}, suggestions:[{name, compound, single, planet}] }.
 */
export function nameAdvice(name, dateStr) {
  const ln = luckyNumbers(dateStr);
  const n = nameNumber(name);
  const harmony = harmonyOf(n.single, ln);
  const p = planetBi(n.single || 1);
  let text;
  if (!n.letters) text = T('Type your name in English letters.', 'உங்கள் பெயரை ஆங்கில எழுத்துகளில் தட்டச்சு செய்யவும்.');
  else if (harmony === 'good') text = T(`Name number ${n.single} (${p.en}) is in harmony with your birth number ${ln.birth} and destiny number ${ln.destiny}. Keep this spelling.`,
    `பெயர் எண் ${n.single} (${p.ta}) உங்கள் பிறவி எண் ${ln.birth}, விதி எண் ${ln.destiny} உடன் இணக்கமாக உள்ளது. இந்த எழுத்துக்கூட்டலையே வைத்துக் கொள்ளுங்கள்.`);
  else if (harmony === 'change') text = T(`Name number ${n.single} (${p.en}) does not sit well with birth number ${ln.birth}. A small spelling change to a lucky number (${ln.lucky.join(', ')}) is suggested.`,
    `பெயர் எண் ${n.single} (${p.ta}) பிறவி எண் ${ln.birth} உடன் ஒத்துப்போகவில்லை. அதிர்ஷ்ட எண்ணுக்கு (${ln.lucky.join(', ')}) சிறிய எழுத்து மாற்றம் பரிந்துரைக்கப்படுகிறது.`);
  else text = T(`Name number ${n.single} (${p.en}) is neutral to birth number ${ln.birth}. A spelling on ${ln.lucky.join(', ')} would be luckier.`,
    `பெயர் எண் ${n.single} (${p.ta}) பிறவி எண் ${ln.birth} உடன் சமநிலை. ${ln.lucky.join(', ')} எண்ணில் வரும் எழுத்துக்கூட்டல் கூடுதல் அதிர்ஷ்டம்.`);

  let suggestions = [];
  if (n.letters && harmony !== 'good') {
    const prefer = (s) => (s === ln.birth ? 0 : s === ln.destiny ? 1 : 2);
    suggestions = variants(name)
      .map((v) => ({ name: v, ...nameNumber(v) }))
      .filter((v) => ln.lucky.includes(v.single))
      .sort((a, b) => prefer(a.single) - prefer(b.single) || a.name.length - b.name.length)
      .slice(0, 5)
      .map(({ name: nm, compound, single, planet }) => ({ name: nm, compound, single, planet }));
  }
  return { name, ...n, meaning: n.letters ? compoundMeaning(n.compound) : T('', ''), birth: ln.birth, destiny: ln.destiny, lucky: ln.lucky, harmony, text, suggestions };
}

function luckOf(sum, dateStr, label) {
  const ln = luckyNumbers(dateStr);
  const single = reduceNum(sum);
  const harmony = harmonyOf(single, ln);
  const p = planetBi(single || 1);
  const text = !single ? T('Enter the number.', 'எண்ணை உள்ளிடவும்.')
    : harmony === 'good' ? T(`${label.en} total ${single} (${p.en}) is lucky for your birth number ${ln.birth}.`, `${label.ta} கூட்டு எண் ${single} (${p.ta}) உங்கள் பிறவி எண் ${ln.birth}-க்கு அதிர்ஷ்டமானது.`)
    : harmony === 'change' ? T(`${label.en} total ${single} (${p.en}) is not favourable for birth number ${ln.birth}. Prefer a total of ${ln.lucky.join(', ')}.`, `${label.ta} கூட்டு எண் ${single} (${p.ta}) பிறவி எண் ${ln.birth}-க்கு சாதகமில்லை. ${ln.lucky.join(', ')} கூட்டு எண் சிறந்தது.`)
    : T(`${label.en} total ${single} (${p.en}) is neutral. Totals of ${ln.lucky.join(', ')} are luckier.`, `${label.ta} கூட்டு எண் ${single} (${p.ta}) சமநிலை. ${ln.lucky.join(', ')} கூட்டு எண்கள் கூடுதல் அதிர்ஷ்டம்.`);
  return { sum, single, planet: single ? NUMBER_PLANET[single] : null, birth: ln.birth, lucky: ln.lucky, harmony, text, meaning: single ? SINGLE_MEANING[single] : T('', '') };
}

/** Mobile number luck: sum of all digits → single number, compared with the birth number. */
export function mobileNumberLuck(digits, dateStr) {
  const ds = String(digits || '').replace(/\D/g, '');
  const sum = [...ds].reduce((s, d) => s + Number(d), 0);
  return { digits: ds, ...luckOf(sum, dateStr, T('Mobile number', 'கைப்பேசி எண்')) };
}

/**
 * Vehicle number luck: the registration digits are summed (the common Tamil-app convention);
 * letters are also given Chaldean values in `withLetters` for reference.
 */
export function vehicleNumberLuck(text, dateStr) {
  const s = String(text || '').toUpperCase();
  const digits = s.replace(/\D/g, '');
  const sum = [...digits].reduce((a, d) => a + Number(d), 0);
  const letterSum = [...s.replace(/[^A-Z]/g, '')].reduce((a, c) => a + CHALDEAN[c], 0);
  return { digits, ...luckOf(sum, dateStr, T('Vehicle number', 'வாகன எண்')), withLetters: { sum: sum + letterSum, single: reduceNum(sum + letterSum) } };
}
