// Text normalisation and multilingual (Tamil script, Tanglish, English) lexicon helpers for the policy layer.
// Deterministic and dependency-free. The ORIGINAL wording is always kept by the caller; these helpers only
// produce a normalised copy used for matching (Brief §19).

// Tamil letters/marks: \p{L} or \p{M}. JS \b does not work for Tamil script, so we use these lookarounds.
export const TB = '(?<![\\p{L}\\p{M}\\p{N}])'; // "word start" for any script
export const TE = '(?![\\p{L}\\p{M}\\p{N}])'; // "word end" for any script

/** Unicode NFC, strip zero-width/soft hyphen, unify quotes/dashes, Tamil digits → ASCII, lower-case, light leetspeak. */
export function normalizeText(raw) {
  let s = String(raw ?? '').normalize('NFC');
  s = s.replace(/[​‌‍⁠﻿­]/g, '');
  s = s.replace(/[‘’‛′`´]/g, "'").replace(/[“”″]/g, '"').replace(/[‐-―−]/g, '-');
  s = s.replace(/[௦-௯]/g, (d) => String(d.charCodeAt(0) - 0x0BE6));
  s = s.toLowerCase();
  // Elongated Latin letters from chat/voice ("pleeease", "diiie") → single letter.
  s = s.replace(/([a-z])\1{2,}/g, '$1');
  // Common obfuscations of a few safety-relevant words.
  s = s.replace(/\bs[3e*]x+(y|ual)?\b/g, (m, suf) => `sex${suf || ''}`).replace(/\bs\.e\.x\b/g, 'sex').replace(/\bseggs\b/g, 'sex');
  s = s.replace(/\bk[i1!]ll\b/g, 'kill').replace(/\bsu[i1!]c[i1!]de\b/g, 'suicide').replace(/\bunalive\b/g, 'kill');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// ---------------------------------------------------------------- numbers in words
const EN_UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
// Common voice/typing variants.
const EN_VARIANTS = { fiveteen: 15, fifthteen: 15, fiften: 15, fourten: 14, sixten: 16, seventen: 17, eigthteen: 18, eightteen: 18, ninteen: 19, thirten: 13, twelfe: 12, eighty: 80 };

// Tamil script number words (including colloquial forms).
const TA_WORDS = {
  'ஒன்று': 1, 'ஒன்னு': 1, 'இரண்டு': 2, 'ரெண்டு': 2, 'மூன்று': 3, 'மூணு': 3, 'நான்கு': 4, 'நாலு': 4, 'ஐந்து': 5, 'அஞ்சு': 5,
  'ஆறு': 6, 'ஏழு': 7, 'எட்டு': 8, 'ஒன்பது': 9, 'பத்து': 10, 'பதினொன்று': 11, 'பதினொரு': 11, 'பதினொன்னு': 11,
  'பன்னிரண்டு': 12, 'பன்னெண்டு': 12, 'பனிரெண்டு': 12, 'பதிமூன்று': 13, 'பதின்மூன்று': 13, 'பதிமூணு': 13,
  'பதினான்கு': 14, 'பதிநான்கு': 14, 'பதினாலு': 14, 'பதினைந்து': 15, 'பதினஞ்சு': 15, 'பதினாறு': 16, 'பதினேழு': 17,
  'பதினெட்டு': 18, 'பத்தொன்பது': 19, 'இருபது': 20, 'முப்பது': 30, 'நாற்பது': 40, 'நாப்பது': 40, 'ஐம்பது': 50,
  'அம்பது': 50, 'அறுபது': 60, 'எழுபது': 70, 'எண்பது': 80, 'தொண்ணூறு': 90,
};
const TA_TENS_PREFIX = { 'இருபத்தி': 20, 'இருபத்து': 20, 'முப்பத்தி': 30, 'முப்பத்து': 30, 'நாற்பத்தி': 40, 'நாற்பத்து': 40, 'ஐம்பத்தி': 50, 'ஐம்பத்து': 50, 'அறுபத்தி': 60, 'அறுபத்து': 60, 'எழுபத்தி': 70, 'எழுபத்து': 70, 'எண்பத்தி': 80, 'எண்பத்து': 80, 'தொண்ணூற்றி': 90, 'தொண்ணூற்று': 90 };

// Tanglish (Tamil in Latin letters) — spelling varies a lot, so list the common ones.
const TG_WORDS = {
  onnu: 1, rendu: 2, randu: 2, moonu: 3, munu: 3, naalu: 4, nalu: 4, anju: 5, aindhu: 5, ainthu: 5, aaru: 6, ezhu: 7, yezhu: 7, elu: 7,
  ettu: 8, onbadhu: 9, onbathu: 9, ombodhu: 9, pathu: 10, paththu: 10, padhu: 10, padhinonnu: 11, pathinonnu: 11,
  panirendu: 12, pannendu: 12, pannirendu: 12, padhimoonu: 13, pathimoonu: 13, padhimunu: 13,
  padhinaalu: 14, pathinaalu: 14, padhinalu: 14, pathinalu: 14, padhinanju: 15, pathinanju: 15, padhinaindhu: 15, pathinainthu: 15, padinanju: 15,
  padhinaaru: 16, pathinaaru: 16, padhinaru: 16, padhinezhu: 17, pathinezhu: 17, padhinelu: 17, padhinettu: 18, pathinettu: 18,
  pathonbadhu: 19, patthonbadhu: 19, pathonbathu: 19, irubadhu: 20, irupathu: 20, irubathu: 20, muppadhu: 30, muppathu: 30,
  naarpadhu: 40, narpathu: 40, naapathu: 40, aimbadhu: 50, aimbathu: 50, ambadhu: 50, ambathu: 50, arubadhu: 60, arupathu: 60, arubathu: 60,
  ezhubadhu: 70, ezhupathu: 70, elupathu: 70, enbadhu: 80, enbathu: 80, embathu: 80, thonnooru: 90, thonnuru: 90,
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Replace number words (English, Tamil script, Tanglish) with digits. "fifty five" → "55", "பதினைந்து" → "15". */
export function wordsToDigits(text) {
  let s = text;
  // English compound: "fifty five", "fifty-five"
  const tens = Object.keys(EN_TENS).join('|');
  const units = EN_UNITS.slice(1, 10).join('|');
  s = s.replace(new RegExp(`\\b(${tens})[- ]?(${units})\\b`, 'g'), (_m, t, u) => String(EN_TENS[t] + EN_UNITS.indexOf(u)));
  s = s.replace(new RegExp(`\\b(${tens})\\b`, 'g'), (m) => String(EN_TENS[m]));
  s = s.replace(new RegExp(`\\b(${Object.keys(EN_VARIANTS).join('|')})\\b`, 'g'), (m) => String(EN_VARIANTS[m]));
  s = s.replace(new RegExp(`\\b(${EN_UNITS.slice(1).sort((a, b) => b.length - a.length).join('|')})\\b`, 'g'), (m) => String(EN_UNITS.indexOf(m)));
  // Tamil script compounds: "இருபத்தி ஐந்து", "இருபத்தைந்து" (prefix + unit, possibly fused)
  const taUnits = Object.entries(TA_WORDS).filter(([, v]) => v < 10);
  for (const [pre, val] of Object.entries(TA_TENS_PREFIX)) {
    for (const [u, uv] of taUnits) {
      s = s.replace(new RegExp(`${TB}${esc(pre)}\\s?${esc(u)}`, 'gu'), String(val + uv));
    }
  }
  s = s.replace(/இருபத்தைந்து/g, '25').replace(/முப்பத்தைந்து/g, '35').replace(/நாற்பத்தைந்து/g, '45').replace(/எண்பத்தைந்து/g, '85');
  const taKeys = Object.keys(TA_WORDS).sort((a, b) => b.length - a.length).map(esc).join('|');
  s = s.replace(new RegExp(`${TB}(${taKeys})`, 'gu'), (m) => String(TA_WORDS[m]));
  const tgKeys = Object.keys(TG_WORDS).sort((a, b) => b.length - a.length).join('|');
  s = s.replace(new RegExp(`\\b(${tgKeys})\\b`, 'g'), (m) => String(TG_WORDS[m]));
  return s;
}

// ---------------------------------------------------------------- age statements
const AGE_UNIT = '(?:years?|yrs?|yr|y\\/o|yo|year-old|years-old)';
const EXCLUDE_AFTER = String.raw`(?!\s*(?:%|percent|kg|kgs|kilo|feet|ft|foot|inch|cm|rs|rupees|lakh|lakhs|crore|k\b|minutes?|mins?|hours?|hrs?|days?|weeks?|months?|km|times|of\b|th\b|st\b|nd\b|rd\b|pm|am|o'clock|'|"))`;

// Roles for other people. 'romantic' roles signal a romantic/sexual interest; 'child' roles are family children.
const ROLE_GROUPS = {
  romantic: ['girlfriend', 'gf', 'boyfriend', 'bf', 'lover', 'crush', 'partner', 'fiance', 'fiancee', 'kadhali', 'kaadhali', 'kadhalan', 'kaadhalan', 'darling', 'sweetheart', 'காதலி', 'காதலன்'],
  child: ['daughter', 'son', 'kid', 'child', 'baby', 'grandson', 'granddaughter', 'magal', 'magan', 'pullai', 'kuzhandhai', 'kozhandha', 'மகள்', 'மகன்', 'குழந்தை', 'பேத்தி', 'பேரன்'],
  spouse: ['wife', 'husband', 'spouse', 'manaivi', 'purushan', 'kanavan', 'மனைவி', 'கணவர்', 'கணவன்'],
  other: ['girl', 'boy', 'she', 'he', 'her', 'him', 'student', 'neighbour', 'neighbor', 'niece', 'nephew', 'cousin', 'friend', 'person', 'lady', 'woman', 'man', 'teen', 'teenager', 'minor', 'schoolgirl', 'schoolboy', 'ponnu', 'paiyan', 'payyan', 'aval', 'avan', 'avalukku', 'avanukku', 'pen', 'பெண்', 'பொண்ணு', 'பையன்', 'சிறுமி', 'சிறுவன்', 'மாணவி', 'மாணவன்', 'அவள்', 'அவன்', 'அவர்', 'ஆண்'],
};
const ROLE_OF = Object.fromEntries(Object.entries(ROLE_GROUPS).flatMap(([g, ws]) => ws.map((w) => [w, g])));
const LATIN_ROLES = Object.keys(ROLE_OF).filter((w) => /^[a-z]+$/.test(w)).sort((a, b) => b.length - a.length).join('|');
const TAMIL_ROLES = Object.keys(ROLE_OF).filter((w) => !/^[a-z]+$/.test(w)).sort((a, b) => b.length - a.length).map(esc).join('|');
const VAYA = '(?:vayasu|vayadhu|vayathu|vayasa|vayasaana|vayasana|வயது|வயசு|வயதான|வயதுடைய|வயதுப்|வயதாகும்|வயதாகிறது|வயதுதான்|வயசான)';

const PRONOUNS = new Set(['she', 'he', 'her', 'him', 'aval', 'avan']);
export const roleGroup = (word) => ROLE_OF[word] || 'other';

/**
 * Extract age statements from normalised text (numbers already turned to digits).
 * Returns [{ who: 'speaker'|'other', role, group, age, claimNow }].
 */
export function extractAges(normText) {
  const s = wordsToDigits(normText);
  const out = [];
  const push = (who, age, role = null, claimNow = false) => {
    const n = Number(age);
    if (!Number.isFinite(n) || n < 0 || n > 120) return;
    out.push({ who, age: n, role, group: who === 'speaker' ? 'self' : roleGroup(role), claimNow });
  };
  let m;
  // Speaker — English
  const selfEn = new RegExp(`\\b(?:i am|i'm|im|i m|iam)\\s+(?:only |just |now |already |turning |almost |nearly |a |an )*(\\d{1,3})(?:\\s*${AGE_UNIT})?(?:\\s*old)?\\b${EXCLUDE_AFTER}(\\s*now)?`, 'g');
  while ((m = selfEn.exec(s))) {
    const before = s.slice(Math.max(0, m.index - 12), m.index);
    if (/\b(she|he|they|it)\s*$/.test(before)) continue;
    push('speaker', m[1], null, Boolean(m[2]) || /\b(now|already|turned)\b/.test(s.slice(m.index, m.index + 40)));
  }
  const selfEn2 = /\b(?:my age is|my age|i'm aged|i am aged|age[:=]?)\s*(?:is\s*)?(\d{1,3})\b/g;
  while ((m = selfEn2.exec(s))) {
    const before = s.slice(Math.max(0, m.index - 10), m.index);
    if (/\b(her|his|their)\s*$/.test(before)) continue;
    push('speaker', m[1]);
  }
  const selfTurned = /\bi (?:just )?turned (\d{1,3})\b/g;
  while ((m = selfTurned.exec(s))) push('speaker', m[1], null, true);
  // Speaker — Tamil script / Tanglish
  const selfTa = new RegExp(`(?:எனக்கு|நான்|என்\\s*வயது|என்னுடைய\\s*வயது|என் வயசு|enakku|ennaku|enaku|naan|nan|naa|en vayasu|en vayadhu|ennoda vayasu|enoda vayasu|en age|ennoda age)\\s*(?:ippo |இப்போ |இப்போது |ippa )?(\\d{1,3})\\s*${VAYA}?`, 'gu');
  while ((m = selfTa.exec(s))) {
    // Require an age word ("வயது", "vayasu", "age") somewhere in the phrase.
    if (!/(வய|vayas|vayadh|vayath|age)/u.test(m[0])) continue;
    push('speaker', m[1], null, /(ippo|இப்போ|ippa|now)/.test(m[0]));
  }
  // Others — "<role> is 15", "she is 15", "my gf 15"
  const otherEn = new RegExp(`\\b(${LATIN_ROLES})\\b(?:'s age)?\\s*(?:is|was|who is|aged|age|of age|,|-|is only|is just|only|just)?\\s*(?:only |just |about |around )?(\\d{1,3})\\b${EXCLUDE_AFTER}`, 'g');
  while ((m = otherEn.exec(s))) {
    const before = s.slice(Math.max(0, m.index - 6), m.index);
    if (/\bi\s*$/.test(before)) continue;
    if (PRONOUNS.has(m[1]) && !/\b(is|was|aged|age)\b/.test(m[0])) continue;
    push('other', m[2], m[1]);
  }
  // "<15> year old girl", "a 15-year-old"
  const otherEn2 = new RegExp(`\\b(\\d{1,3})\\s*[- ]?${AGE_UNIT}[- ]?(?:old)?\\s*(${LATIN_ROLES})?\\b`, 'g');
  while ((m = otherEn2.exec(s))) {
    const before = s.slice(Math.max(0, m.index - 14), m.index);
    if (/\b(i am|i'm|im|iam|am)\s*(a |an )?$/.test(before)) continue;
    if (!m[2] && !/\b(a|an|this|that|the|with|her|his|my|our)\s*$/.test(before)) continue;
    push('other', m[1], m[2] || 'person');
  }
  // Tamil/Tanglish — "15 வயது பெண்", "15 vayasu ponnu"
  const otherTa = new RegExp(`(\\d{1,3})\\s*${VAYA}\\s*(${TAMIL_ROLES}|${LATIN_ROLES})`, 'gu');
  while ((m = otherTa.exec(s))) push('other', m[1], m[2]);
  // "என் காதலிக்கு 15 வயது", "avalukku 15 vayasu", "kadhali 15 vayasu"
  const otherTa2 = new RegExp(`(${TAMIL_ROLES}|${LATIN_ROLES})[\\p{L}\\p{M}]*\\s*(?:ku|kku|க்கு|கு)?\\s*(\\d{1,3})\\s*${VAYA}`, 'gu');
  while ((m = otherTa2.exec(s))) push('other', m[2], m[1]);
  // de-duplicate
  const seen = new Set();
  return out.filter((a) => { const k = `${a.who}|${a.age}|${a.group}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** Test a list of patterns (RegExp or string) against text; returns the first matching pattern's source or null. */
export function firstMatch(text, patterns) {
  for (const p of patterns) {
    const re = p instanceof RegExp ? p : new RegExp(p, 'u');
    if (re.test(text)) return re.source;
  }
  return null;
}

/** Try to decode base64-looking tokens so encoded text cannot bypass the classifier. */
export function decodeEmbedded(text) {
  const out = [];
  for (const tok of String(text).match(/[A-Za-z0-9+/]{16,}={0,2}/g) || []) {
    try {
      const dec = Buffer.from(tok, 'base64').toString('utf8');
      if (/^[\p{L}\p{M}\p{N}\p{P}\p{Zs}]+$/u.test(dec) && /[\p{L}]{3,}/u.test(dec)) out.push(dec);
    } catch { /* not base64 */ }
  }
  return out;
}
