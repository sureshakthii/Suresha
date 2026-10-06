// Traditional reflection themes for Dasa / Bhukti (brief §25, §29).
// A theme is a gentle reflection that a selected tradition emphasises during a period — never a forecast
// that an event will happen, never a judgement of a person and never a probability. Every theme stays
// 'proposed' until a reviewing astrologer supplies cited rule predicates (supportingRuleIds, modifiers,
// exclusions, activation logic). AI must not invent a formula mapping planets or stars to accidents,
// affairs, theft or betrayal.
//
// This module also owns the shared output validator `assertNoProhibited` used by the safeguard,
// matching and temple modules and by the tests: it walks every string in a report/card and rejects
// accusation, mortality, fertility, guaranteed-event and unsafe-permission wording.

const T = (en, ta) => ({ en, ta });
const DAY = 86400000;

export const THEME_RULE_VERSION = 'themes-0.1-proposed';
export const DEFAULT_TRADITION_PROFILE = 'tamil-parashari-unreviewed';

// ----------------------------------------------------------------------------- prohibited output
// Patterns are deliberately specific: they target claims, not the safety wording that refutes them.
const PROHIBITED = [
  // Accidents / injury / disasters stated as fate.
  { id: 'accident-claim', re: /\b(heavy|major|big|fatal)\s+accident\b|\baccident\s+(will|is going to|is sure to)\b|\baccident\s+date\b|\bdate of (the|your) accident\b/i },
  { id: 'accident-claim-ta', re: /விபத்து\s*கண்டம்|பெரிய\s*விபத்து|விபத்து\s*நடக்கும்(?!\s*என்று)|விபத்து\s*ஏற்படும்(?!\s*என்று)/ },
  // Infidelity / deception accusations.
  { id: 'infidelity-claim', re: /\b(is|are|will be|will start)\s+(cheating|having an affair|unfaithful)\b|\bwill\s+(cheat|betray|deceive)\b|\bpredicted infidelity\b|\baffair\s+(will|is likely)\b/i },
  { id: 'infidelity-claim-ta', re: /ஏமாற்றுவார்|ஏமாற்றுவாள்|கள்ளத்\s*தொடர்பு|துரோகம்\s*செய்வார்/ },
  // Theft / money-taking accusations.
  { id: 'theft-claim', re: /\bwill\s+(steal|rob|take your money|take all your money)\b|\b(guaranteed|certain)\s+theft\b|\bwhich (woman|man|person) will take\b/i },
  { id: 'theft-claim-ta', re: /பணத்தை\s*எடுத்துவிடுவார்|திருடுவார்/ },
  // Mortality / lifespan / spouse death.
  { id: 'mortality', re: /\b(will|going to)\s+(die|kill)\b|\b(short[- ]lived|short life|early death|untimely death|spouse'?s death|death of (the|your) (spouse|husband|wife|partner))\b|\blifespan (is|of)\b|\bwidow(ed)? (brings|causes)\b|\bkill (her|his|the) (second |next )?(husband|wife|spouse)\b/i },
  { id: 'mortality-ta', re: /மரணம்\s*(நிகழும்|ஏற்படும்)|அற்ப\s*ஆயுள்|ஆயுள்\s*குறைவு|உயிருக்கு\s*ஆபத்து|மாங்கல்ய\s*தோஷம்/ },
  // Fertility judgements.
  { id: 'fertility', re: /\b(infertile|infertility|barren|cannot (have|conceive) (a )?child(ren)?|no children will)\b/i },
  { id: 'fertility-ta', re: /மலட்டு|குழந்தை\s*பிறக்காது/ },
  // Divorce / doom verdicts.
  { id: 'doom-verdict', re: /\b(guaranteed|certain|will end in)\s+divorce\b|\bdivorce\s+will\b|\bwill destroy your life\b|\bunsuitable (match|person|partner|bride|groom)\b|\b(reject|avoid) this (person|marriage|bride|groom)\b/i },
  { id: 'doom-verdict-ta', re: /விவாகரத்து\s*நிச்சயம்|வாழ்க்கையை\s*அழிப்பார்/ },
  // Unsafe permission from a favourable period.
  { id: 'unsafe-permission', re: /\bsafe to take risks\b|\bsafe[- ]day guarantee\b|\bguaranteed (safe|protection)\b|\b(can|may|ok to) drive (drunk|after drinking)\b|\bno need (for|to wear) (a )?(seat ?belt|helmet)\b/i },
  { id: 'unsafe-permission-ta', re: /எந்த\s*ஆபத்தும்\s*வராது|பாதுகாப்பு\s*உறுதி/ },
  // Personalised probability of betrayal / danger.
  { id: 'probability', re: /\b\d{1,3}\s*%\s*(chance|probability|risk)\s+of\s+(betrayal|cheating|accident|death|theft|divorce)\b|\b(betrayal|danger) (level|probability|score)\b/i },
  // Kula Deivam presented as chart fact.
  { id: 'kuladeivam-fact', re: /\byour kula deivam is (lord|goddess|sri|amman|ayyanar|sastha|murugan|shiva|vishnu|perumal|durga|vinayagar|karuppa)/i },
  // Paid remedies / gems as necessary protection.
  { id: 'remedy-necessary', re: /\b(must|have to|need to) (wear|buy) (a |this )?(gem|gemstone|stone|pooja|remedy)\b|\b(gem|gemstone|pooja|remedy) (is )?(required|necessary) for protection\b/i },
];

/** Every string inside a value (objects, arrays), with its path. Dates and functions are skipped. */
export function collectStrings(value, path = '$', out = []) {
  if (value == null) return out;
  if (typeof value === 'string') { out.push([path, value]); return out; }
  if (typeof value !== 'object' || value instanceof Date) return out;
  if (Array.isArray(value)) value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  else for (const [k, v] of Object.entries(value)) collectStrings(v, `${path}.${k}`, out);
  return out;
}

/** Find prohibited claims anywhere in a string or object. Returns [{ id, path, text }]. */
export function findProhibited(value) {
  const hits = [];
  for (const [path, text] of collectStrings(value)) {
    for (const p of PROHIBITED) if (p.re.test(text)) hits.push({ id: p.id, path, text });
  }
  return hits;
}

/** Throws if any prohibited claim is present; returns the value otherwise (so it can wrap outputs). */
export function assertNoProhibited(value) {
  const hits = findProhibited(value);
  if (hits.length) {
    const msg = hits.slice(0, 5).map((h) => `${h.id} at ${h.path}: "${h.text.slice(0, 120)}"`).join('; ');
    throw new Error(`Prohibited wording: ${msg}`);
  }
  return value;
}

// ----------------------------------------------------------------------------- themes
// Candidate themes (reflection wording only). Each lists the lords that a reviewing astrologer may attach
// to it; until they do, `supportingRuleIds` stays empty and the status stays 'proposed'.
export const THEME_CATALOGUE = {
  restraint_money_relationships: {
    candidateLords: ['Rahu', 'Venus', 'Mars'],
    reflection: T('Your selected tradition emphasizes restraint in relationship and financial decisions during this period.',
      'நீங்கள் தேர்ந்தெடுத்த மரபு, இந்தக் காலத்தில் உறவு மற்றும் பண முடிவுகளில் நிதானத்தை வலியுறுத்துகிறது.'),
    practice: T('Take big money or relationship decisions after a night\'s sleep and a talk with someone you trust.',
      'பெரிய பண அல்லது உறவு முடிவுகளை ஒரு இரவு கழித்து, நம்பிக்கையானவரிடம் பேசிய பின் எடுங்கள்.'),
  },
  patience_effort: {
    candidateLords: ['Saturn'],
    reflection: T('Your selected tradition associates this period with patience, steady effort and responsibility.',
      'நீங்கள் தேர்ந்தெடுத்த மரபு இந்தக் காலத்தைப் பொறுமை, தொடர் உழைப்பு, பொறுப்புடன் தொடர்புபடுத்துகிறது.'),
    practice: T('Keep a simple routine and finish one pending task each week.', 'எளிய ஒழுங்கைப் பின்பற்றி, வாரம் ஒரு நிலுவைப் பணியை முடியுங்கள்.'),
  },
  learning_guidance: {
    candidateLords: ['Jupiter', 'Mercury'],
    reflection: T('Your selected tradition associates this period with learning, guidance and good counsel.',
      'நீங்கள் தேர்ந்தெடுத்த மரபு இந்தக் காலத்தைக் கற்றல், வழிகாட்டல், நல்ல ஆலோசனையுடன் தொடர்புபடுத்துகிறது.'),
    practice: T('Set aside time to learn something useful and to thank a teacher or elder.', 'பயனுள்ள ஒன்றைக் கற்க நேரம் ஒதுக்கி, ஒரு ஆசிரியர் அல்லது பெரியவருக்கு நன்றி சொல்லுங்கள்.'),
  },
  care_rest_reflection: {
    candidateLords: ['Ketu', 'Moon'],
    reflection: T('Your selected tradition associates this period with reflection, rest and inner calm.',
      'நீங்கள் தேர்ந்தெடுத்த மரபு இந்தக் காலத்தைச் சிந்தனை, ஓய்வு, மன அமைதியுடன் தொடர்புபடுத்துகிறது.'),
    practice: T('Protect your sleep and spend quiet time each day.', 'உறக்கத்தைப் பேணி, தினமும் சிறிது அமைதியான நேரம் செலவிடுங்கள்.'),
  },
  confidence_duty: {
    candidateLords: ['Sun'],
    reflection: T('Your selected tradition associates this period with duty, confidence and keeping your word.',
      'நீங்கள் தேர்ந்தெடுத்த மரபு இந்தக் காலத்தைக் கடமை, தன்னம்பிக்கை, சொல் தவறாமையுடன் தொடர்புபடுத்துகிறது.'),
    practice: T('Keep commitments small and clear, and keep them.', 'வாக்குறுதிகளைச் சிறியதாகவும் தெளிவாகவும் வைத்து நிறைவேற்றுங்கள்.'),
  },
};

// Precautions that are sensible whether or not any interpretation is right (§25).
export const ALWAYS_SENSIBLE = [
  T('Verify before you transfer money, and never share an OTP or password.', 'பணம் அனுப்பும் முன் சரிபார்க்கவும்; OTP அல்லது கடவுச்சொல்லை யாரிடமும் பகிர வேண்டாம்.'),
  T('Wear a seat belt or helmet, keep to the speed limit and rest when tired — on every day.', 'ஒவ்வொரு நாளும் சீட் பெல்ட் அல்லது ஹெல்மெட், வேகக் கட்டுப்பாடு, சோர்வாக இருந்தால் ஓய்வு.'),
];

const POSITIVE_NOTE = T('A supportive period in your tradition is not a reason to skip ordinary care — keep the same precautions.',
  'உங்கள் மரபில் சாதகமான காலம் என்பது வழக்கமான கவனத்தைக் கைவிடக் காரணமல்ல — அதே முன்னெச்சரிக்கைகளைத் தொடருங்கள்.');

function themeIdFor(lord) {
  return Object.keys(THEME_CATALOGUE).find((id) => THEME_CATALOGUE[id].candidateLords.includes(lord)) || 'learning_guidance';
}

/**
 * Reflection themes for the current and upcoming Dasa–Bhukti periods.
 * chart: birthChart output (needs chart.dasa.periods). Options:
 *   from (Date), count (number of bhuktis, default 3), traditionProfileId,
 *   birthTimeCertainty: 'exact' | 'approximate' | 'unknown' (lowers inputCertainty),
 *   approvedRules: { [themeId]: { ruleIds: [...], modifiers: [...] } } supplied by a reviewing astrologer.
 * Output objects never carry probabilities, danger levels or event claims.
 */
export function dasaThemes(chart, { from = new Date(), count = 3, traditionProfileId = DEFAULT_TRADITION_PROFILE, birthTimeCertainty = 'exact', approvedRules = {} } = {}) {
  const out = [];
  const certainty = birthTimeCertainty === 'exact' ? 'exact-time' : birthTimeCertainty === 'approximate' ? 'approximate-time' : 'unknown-time';
  for (const md of chart?.dasa?.periods || []) {
    if (md.end <= from) continue;
    for (const ad of md.bhuktis) {
      if (ad.end <= from) continue;
      if (out.length >= count) break;
      const themeId = themeIdFor(ad.lord);
      const def = THEME_CATALOGUE[themeId];
      const approved = approvedRules[themeId];
      const nearBoundary = Math.min(Math.abs(ad.start - from), Math.abs(ad.end - from)) < 60 * DAY;
      out.push({
        themeId,
        traditionProfileId,
        ruleVersion: THEME_RULE_VERSION,
        status: approved?.ruleIds?.length ? 'approved' : 'proposed',
        periodStart: new Date(ad.start),
        periodEnd: new Date(ad.end),
        periodLords: { dasa: md.lord, bhukti: ad.lord },
        supportingRuleIds: approved?.ruleIds ? [...approved.ruleIds] : [],
        modifiers: approved?.modifiers ? [...approved.modifiers] : [],
        inputCertainty: certainty === 'exact-time' && nearBoundary ? 'boundary-sensitive' : certainty,
        reflectionText: def.reflection,
        optionalPractice: { ...def.practice, optional: true },
        alwaysSensible: ALWAYS_SENSIBLE,
        positiveNote: POSITIVE_NOTE,
      });
    }
    if (out.length >= count) break;
  }
  return assertNoProhibited(out);
}
