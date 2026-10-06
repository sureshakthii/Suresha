// Explainable guidance engine (works offline, no AI needed).
//
// 1. classify(question)  → what the person is asking about (bilingual keyword rules).
// 2. chartFacts(chart, reliability) → VERIFIED facts computed by the calculation engine only.
// 3. composeAnswer(...)  → a structured answer:
//      Your question · Relevant chart factors · Traditional interpretation · Uncertainty ·
//      Optional spiritual practice · Practical next step
// The same facts are handed to the AI (when configured) with an instruction not to invent any others.
// Safety rules live here too: no diagnosis, no death/lifespan prediction, no guarantees, crisis support.
import { RASIS, PLANETS } from './astro.js';
import { grahaStrength, NAVAGRAHA } from './remedies.js';
import { transitStatus, BHAVAS } from './analysis.js';
import { luckyNumbers } from './personal.js';
import { predictEvent } from './predict.js';
import { capDate, minCap, clipPeriods } from './lifespan-cap.js';
import { healthGuide } from './health.js';
import { closingPrayer } from './daily.js';
import { faithBlessing, universalPractice } from './faith.js';
import { tamilDay } from './tamilcal.js';
import { TEMPLES } from './temples.js';
import { ageProfile, topicAllowed, ageGuardAnswer } from './age-guard.js';

export { RULES_VERSION } from './version.js';

const T = (en, ta) => ({ en, ta });
const isTamilText = (s) => /[஀-௿]/.test(s || '');
/**
 * Answers always follow the language the person selected in the app: Tamil mode → Tamil answer, even when the
 * question was typed in English or Tanglish (many readers cannot read English); English mode → English.
 */
export const answerLang = (_question, appLang) => (appLang === 'en' ? 'en' : 'ta');
export { isTamilText };

// ---------------------------------------------------------------- intents
// Keywords cover Tamil script, English (with common misspellings) and Tanglish (Tamil typed in English letters).
const WHEN = /\bwhen\b|\bwhich (year|age|month)\b|\bwhat age\b|\bwill i (get|have|be)\b|\beppo\b|\beppa\b|\beppodhu\b|\beppothu\b|\beppadi\b|\bepdi\b|\bvarum\b|\bnadakkum\b|\bkidaikkum\b|எப்போது|எப்போ|எந்த வருட|எந்த வயதில்|நடக்குமா|கிடைக்குமா|நடக்கும்|கிடைக்கும்/i;
const MARRIAGE = /mar+[iae]+g|marri|marry|merr?[ia]g|wedd|shaad[iy]|spouse|husband|wife|alliance|\bkall?y?aa?n[ae]?m|thiruman|tiruman|ponnu|maap+ill?ai|varan|jodi|திருமண|கல்யாண|வரன்|மனைவி|கணவர்|மாப்பிள்ளை|பெண் பார்|வாழ்க்கைத் துணை/i;
const CHILD = /\bkids?\b|child|children|\bbaby\b|pregnan|conceiv|santh?h?anam|kuzh?andh?ai|kulandh?ai|kuzhanth?ai|kulanth?ai|\bpillai|குழந்தை|பிள்ளை|சந்தான|கர்ப்ப|மகப்பேறு/i;
const RULES = [
  ['crisis', /suicid|kill myself|end my life|want to die|no reason to live|self.?harm|saaga?num|sethu?d|saa?ga ?(po|pog)|sethu ?(po|pog)|sethuruv|uyir ?vida|thar ?kolai|going to die|don'?t want to live|do not want to live|சாகப் ?போ|சாகப்போ|செத்துப் ?போ|செத்துருவ|தற்கொலை|சாக வேண்டும்|உயிரை மாய்|வாழ விருப்பமில்லை|சாகணும்/i],
  ['death', /when will i die|death date|lifespan|how long will i live|longevity|maranam|aayul|ஆயுள் எவ்வளவு|எப்போது இறப்|மரணம் எப்போது|சாவு எப்போது|ஆயுட்காலம்/i],
  ['pain', /\bpain\b|hurt(s|ing)?\b|\bvali\b|valikk?u|வலி|வேதனை/i],
  ['emotional', /worr|anxi|stress|tension|\bsad|depress|lonely|afraid|\bfear|upset|confus|kavalai|bayam|bayama|mana ?kast|nimmadhi|கவலை|பயம்|மன அழுத்த|மனக்குழப்ப|டென்ஷன்|வருத்த|தனிமை|மனம் சரியில்லை|நிம்மதி/i],
  ['health', /health|\bill(ness)?\b|\bsick|disease|fever|cancer|\bsugar\b|diabet|\bbp\b|blood pressure|surgery|operation|hospital|doctor|medicine|udambu|udal ?nal|\bnoi\b|kaichal|ஆரோக்கிய|நோய்|உடல்நல|காய்ச்சல்|சர்க்கரை|மருத்துவ|அறுவை|ஆஸ்பத்திரி|மருந்து/i],
  ['marriage_when', { test: (q) => MARRIAGE.test(q) && WHEN.test(q) }],
  ['child_when', { test: (q) => CHILD.test(q) && (WHEN.test(q) || /bless|பாக்கியம்|bhagyam|baakkiyam/i.test(q)) }],
  ['temple', /temple|pilgrim|yatra|yaath?irai|kovil|koil|darshan|darisanam|leave.*visit|\btrip\b|\btour|கோவில|கோயில|யாத்திரை|தரிசன|சுற்றுலா|பயணம்.*கோ|விடுப்பு/i],
  ['dates', /housewarming|griha|graha ?pravesam|grahapravesam|muhurt|mugurt|auspicious date|good date|good day|choose a (good )?(date|day)|wedding date|which date|naming ceremony|nalla naal|naal paar|pudhu veedu|கிரகப்பிரவேச|முகூர்த்த|நல்ல நாள்|தேதி தேர்வு|சுப நாள்|புதுமனை|நாளைத் தேர்வு|ஏற்ற நாள்|நாள் தேர்வு/i],
  ['vehicle', /\bcar\b|bike|vehicle|scooter|registration|number plate|\bcolou?r\b|\bvandi\b|vaaganam|vaganam|கார்|வாகன|பைக்|ஸ்கூட்டர்|நிறம்|பதிவு எண்/i],
  ['dasa', /dasa|dasha|dhasa|thasai|dasai|bhukti|bukthi|bhukthi|\bputhi\b|\bbuthi\b|antar|mahadasha|current period|my period|nadapp?u ?kaa?lam|kaa?lath|tharpoth?aiya|தசை|தசா|புக்தி|நடப்பு காலம்|தற்போதைய காலம்|தற்போதைய காலத்தை/i],
  ['weak', /weak planet|which planet|planet.*weak|remed|parigar|pariharam|parikaram|dosh|graham (balam|weak)|kiragam|பலவீன|பரிகார|எந்த கிரகம்|தோஷ/i],
  ['kuladeivam', /kula ?deiv|family deity|kuladeivam|kula ?dheivam|குலதெய்வ|குல தெய்வ/i],
  ['love', /\blove\b|crush|girlfriend|boyfriend|relationship|propos|kaa?dhal|kadal vazh|lover|காதல்/i],
  ['festival', /festival|vizhaa?|pandigai|pandikai|viratham|vratham|ekadasi|pradosh|amavas|pournami|விழா|பண்டிகை|விரத|ஏகாதசி|பிரதோஷ|அமாவாசை|பௌர்ணமி/i],
  ['marriage', MARRIAGE],
  ['pregnancy', CHILD],
  ['legal', /court|\bcase\b|legal|lawyer|dispute|police|vazhakk?u|vakeel|வழக்கு|கோர்ட்|நீதிமன்ற|வக்கீல்|தகராறு/i],
  ['visa', /visa|abroad|foreign|onsite|overseas|immigra|velinaadu|velinadu|videsh|videsam|videsham|வெளிநாடு|வெளிநாட்ட|விசா|அயல்நாடு|விதேச/i],
  ['finance', /money|finance|loan|debt|saving|invest|wealth|stock|share market|salary|income|\bpanam\b|\bkasu\b|kadan|semippu|varumanam|பணம்|பணத்|கடன|சேமிப்பு|முதலீடு|செல்வ|வருமான|சம்பள|பொருளாதார/i],
  ['career', /career|\bjob\b|\bwork|office|promotion|business|\bboss\b|interview|profession|\bvelai\b|\bvela\b|thozhil|tholil|vyabaram|தொழில|வேலை|அலுவலக|பதவி உயர்வு|வியாபார|நேர்காணல்|உத்தியோக/i],
  ['education', /exam|study|studies|education|college|school|result|padipp?u|padikk|parikshai|kalvi|கல்வி|தேர்வு|படிப்பு|கல்லூரி|பள்ளி/i],
  ['property', /\bhouse\b|\bhome\b|\bland\b|property|\bflat\b|\bplot\b|\bveedu\b|\bnilam\b|sothu|வீடு|நிலம்|சொத்து|மனை|பிளாட்/i],
  ['goodtime', /good time|nalla neram|auspicious time|rahu ?kal|raahu|today.*time|time today|inniku.*neram|நல்ல நேரம்|ராகு காலம்|இன்று.*நேரம்|எந்த நேரம்/i],
  ['chart', /my chart|horoscope|jath?agam|jaadhagam|jadhagam|strength|overview|read my|ஜாதக|பலம்|சவால்/i],
  ['greeting', /^(hi|hello|hey|vanakkam|namaskaram|வணக்கம்|நமஸ்காரம்)\b/i],
];

/** Returns { intent, all } — the first matching intent plus every match (for mixed questions). */
export function classify(text) {
  const q = String(text || '').trim();
  const all = RULES.filter(([, re]) => re.test(q)).map(([id]) => id);
  let intent = all[0] || 'general';
  // "pain" is ambiguous unless the person already said what kind.
  if (intent === 'pain' && all.includes('emotional')) intent = 'emotional';
  if (intent === 'pain' && all.includes('health')) intent = 'health';
  // A vehicle + date question is a date question.
  if (intent === 'vehicle' && all.includes('dates')) intent = 'dates';
  if (intent === 'temple' && all.includes('dates') && !/temple|kovil|koil|கோவில|கோயில/i.test(q)) intent = 'dates';
  // "another / second child" stays a child-timing question even without a "when" word.
  if (intent === 'pregnancy' && /another|second|next|இன்னொரு|இரண்டாவது|innoru|rendavadhu/i.test(q)) intent = 'child_when';
  return { intent, all };
}

// ---------------------------------------------------------------- facts (verified, from the engine)
const ordEn = (n) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
const house = (from, rasi) => ((rasi - from + 12) % 12) + 1;
const lordOf = (from, h) => RASIS[(from + h - 1) % 12].lord;
const pName = (k, lang) => (lang === 'ta' ? PLANETS[k].ta : k);
const rName = (i, lang) => (lang === 'ta' ? RASIS[i].ta : RASIS[i].en);
const iso = (d) => new Date(d).toISOString().slice(0, 10);

/**
 * Everything the answer may say about the chart. `rel` comes from shared/birthtime.js.
 * When the lagna is not reliable, houses are counted from the Moon sign (Chandra lagna),
 * which is the traditional fallback — and the answer says so.
 */
export function chartFacts(chart, rel, now = new Date()) {
  if (!chart) return null;
  const P = chart.planets;
  const useLagna = rel?.lagna !== false;
  const from = useLagna ? P.Lagna.rasi : P.Moon.rasi;
  const planetsForStrength = useLagna ? P : Object.fromEntries(Object.entries(P).filter(([k]) => k !== 'Lagna'));
  const strength = Object.fromEntries(grahaStrength(planetsForStrength).map((g) => [g.planet, g]));
  const occupants = (h) => Object.keys(P).filter((k) => k !== 'Lagna' && house(from, P[k].rasi) === h);
  const houseInfo = (h) => ({ h, lord: lordOf(from, h), lordHouse: house(from, P[lordOf(from, h)].rasi), occupants: occupants(h) });
  const dasaOk = rel?.nakshatra !== false;
  const horizon = capDate(chart);
  const cur = dasaOk ? chart.dasa.current : null;
  const bh = dasaOk ? chart.dasa.currentBhukti : null;
  const ruled = (k) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((h) => lordOf(from, h) === k);
  let transit = null;
  try { transit = transitStatus(chart, now); } catch { /* transit needs the ephemeris; skip if unavailable */ }
  return {
    now,
    chart,
    rel,
    reference: useLagna ? 'lagna' : 'moon',
    fromSign: from,
    lagnaSign: useLagna ? P.Lagna.rasi : null,
    moonSign: P.Moon.rasi,
    star: dasaOk ? chart.janmaNakshatra.index : null,
    houseInfo,
    strength,
    weakest: Object.values(strength).filter((g) => !['Rahu', 'Ketu'].includes(g.planet)).sort((a, b) => a.score - b.score).slice(0, 2),
    planetHouse: (k) => house(from, P[k].rasi),
    ruled,
    // Listed dates stay inside the person's age 0–80 (shared/lifespan-cap.js).
    dasa: cur && { lord: cur.lord, start: iso(cur.start), end: iso(minCap(cur.end, horizon)), approx: rel?.dasa === false, shiftDays: rel?.dasaShiftDays },
    bhukti: bh && { lord: bh.lord, start: iso(bh.start), end: iso(minCap(bh.end, horizon)) },
    nextDasa: dasaOk ? clipPeriods(chart.dasa.periods, horizon).find((p) => p.start > now) || null : null,
    transit,
    birthDate: chart.date,
  };
}

/** Compact JSON version of the facts for the AI prompt (so the AI uses only verified values). */
export function factsForAI(f) {
  if (!f) return null;
  const hi = (h) => { const x = f.houseInfo(h); return { lord: x.lord, lordIn: x.lordHouse, occupants: x.occupants }; };
  return {
    housesCountedFrom: f.reference === 'lagna' ? `Lagna ${RASIS[f.fromSign].en}` : `Moon sign ${RASIS[f.fromSign].en} (birth time not precise — no lagna)`,
    moonSign: RASIS[f.moonSign].en,
    houses: Object.fromEntries([1, 2, 4, 5, 7, 9, 10, 11, 12].map((h) => [h, hi(h)])),
    planetStrength: Object.fromEntries(Object.values(f.strength).map((g) => [g.planet, `${g.level} (${g.score}/100 traditional points: ${g.reasons.map((r) => r.en).join('; ') || 'no special factors'})`])),
    currentDasa: f.dasa ? `${f.dasa.lord} mahadasa ${f.dasa.start} to ${f.dasa.end}${f.dasa.approx ? ` (approximate, ± ${f.dasa.shiftDays} days)` : ''}` : 'not available (birth star uncertain)',
    currentBhukti: f.bhukti ? `${f.bhukti.lord} bhukti until ${f.bhukti.end}` : null,
    transits: f.transit?.status.map((s) => s.en) || [],
  };
}

// ---------------------------------------------------------------- answer building
const SECTION_TITLES = {
  question: T('Your question', 'உங்கள் கேள்வி'),
  answer: T('Answer', 'பதில்'),
  factors: T('Relevant chart factors', 'தொடர்புடைய ஜாதகக் காரணிகள்'),
  interpretation: T('Traditional interpretation', 'பாரம்பரிய விளக்கம்'),
  uncertainty: T('Uncertainty & conflicting factors', 'உறுதியின்மை & முரண்படும் காரணிகள்'),
  practice: T('Optional spiritual practice', 'விருப்ப ஆன்மீக வழிபாடு'),
  next: T('Practical next step', 'நடைமுறை அடுத்த படி'),
  facts: T('Factual information', 'உண்மைத் தகவல்'),
  support: T('Support', 'உதவி'),
  prayer: T('Prayer for you', 'உங்களுக்கான பிரார்த்தனை'),
};

const strengthWord = (g, lang) => (lang === 'ta'
  ? ({ strong: 'பலம்', average: 'மத்திமம்', weak: 'பலவீனம்' }[g.level])
  : g.level);

function planetLine(f, k, lang) {
  const g = f.strength[k];
  const h = f.planetHouse(k);
  const ruled = f.ruled(k);
  const ref = f.reference === 'lagna' ? T('from Lagnam', 'லக்னத்திலிருந்து') : T('from your Moon sign', 'சந்திர ராசியிலிருந்து');
  const reasons = g.reasons.slice(0, 2).map((r) => (lang === 'ta' ? r.ta : r.en)).join(', ');
  return lang === 'ta'
    ? `${pName(k, 'ta')}: ${ref.ta} ${h}-ம் இடம்${ruled.length ? `, ${ruled.join(', ')}-ம் வீட்டு அதிபதி` : ''} · ${strengthWord(g, 'ta')} (${g.score}/100)${reasons ? ` — ${reasons}` : ''}`
    : `${k}: ${ordEn(h)} ${ref.en}${ruled.length ? `, lord of house ${ruled.join(' & ')}` : ''} · ${g.level} (${g.score}/100)${reasons ? ` — ${reasons}` : ''}`;
}

function houseLine(f, h, lang) {
  const x = f.houseInfo(h);
  const meaning = lang === 'ta' ? BHAVAS[h - 1].ta : BHAVAS[h - 1].en;
  const occ = x.occupants.length ? x.occupants.map((k) => pName(k, lang)).join(', ') : (lang === 'ta' ? 'கிரகம் இல்லை' : 'no planets');
  return lang === 'ta'
    ? `${h}-ம் பாவம் (${meaning}): அதிபதி ${pName(x.lord, 'ta')} ${x.lordHouse}-ல், ${strengthWord(f.strength[x.lord], 'ta')}; பாவத்தில் ${occ}`
    : `House ${h} (${meaning}): lord ${x.lord} in the ${ordEn(x.lordHouse)}, ${f.strength[x.lord].level}; occupants: ${occ}`;
}

function dasaLine(f, lang) {
  if (!f.dasa) return lang === 'ta' ? 'தசா காலம்: பிறந்த நட்சத்திரம் உறுதியில்லாததால் கணிக்கப்படவில்லை.' : 'Dasa: not calculated because the birth star is uncertain.';
  const approx = f.dasa.approx ? (lang === 'ta' ? ` (தோராயம், ± ${f.dasa.shiftDays} நாள்)` : ` (approximate, ± ${f.dasa.shiftDays} days)`) : '';
  return lang === 'ta'
    ? `நடப்பு: ${pName(f.dasa.lord, 'ta')} மகா தசை (${f.dasa.start} – ${f.dasa.end})${f.bhukti ? `, ${pName(f.bhukti.lord, 'ta')} புக்தி ${f.bhukti.end} வரை` : ''}${approx}`
    : `Now: ${f.dasa.lord} mahadasa (${f.dasa.start} – ${f.dasa.end})${f.bhukti ? `, ${f.bhukti.lord} bhukti until ${f.bhukti.end}` : ''}${approx}`;
}

const transitLines = (f, lang, ids) => (f.transit?.status || []).filter((s) => !ids || ids.includes(s.id)).map((s) => (lang === 'ta' ? `கோசாரம்: ${s.ta}` : `Transit: ${s.en}`));

function referenceNote(f, lang) {
  if (f.reference === 'lagna') return null;
  return lang === 'ta'
    ? 'பிறந்த நேரம் துல்லியமில்லாததால் பாவங்கள் சந்திர ராசியிலிருந்து (சந்திர லக்னம்) கணக்கிடப்பட்டன — இது பாரம்பரிய மாற்று முறை, ஆனால் லக்ன அடிப்படையைவிடக் குறைந்த நம்பகத்தன்மை.'
    : 'Because the birth time is not precise, houses are counted from your Moon sign (Chandra lagna) — a traditional fallback, but less reliable than a lagna-based reading.';
}

/** Traditional meanings of a planet's period, written gently. */
const DASA_NATURE = {
  Sun: T('a period linked with responsibility, recognition and dealings with authority; pride and health routines need care', 'பொறுப்பு, அங்கீகாரம், அரசு/உயரதிகாரிகளுடன் தொடர்பு கொண்ட காலம் எனப் பாரம்பரியம் கூறுகிறது; தன்முனைப்பையும் உடல்நலப் பழக்கங்களையும் கவனிக்கவும்'),
  Moon: T('a period of feelings, family and public contact; the mind can swing, so rest and routine help', 'உணர்வு, குடும்பம், மக்கள் தொடர்பின் காலம்; மனம் ஏற்றத் தாழ்வாக இருக்கலாம், ஓய்வும் ஒழுங்கும் உதவும்'),
  Mars: T('a period of energy, property matters and quick decisions; patience prevents conflict', 'ஆற்றல், சொத்து, விரைவான முடிவுகளின் காலம்; பொறுமை தகராறுகளைத் தவிர்க்கும்'),
  Mercury: T('a period of learning, communication, trade and paperwork; careful contracts pay off', 'கற்றல், பேச்சு, வியாபாரம், ஆவணங்களின் காலம்; கவனமான ஒப்பந்தங்கள் பலன் தரும்'),
  Jupiter: T('an expansive period — guidance, teaching, family growth and dharma', 'விரிவாக்கம், வழிகாட்டல், கற்பித்தல், குடும்ப வளர்ச்சி, தர்மத்தின் காலம் எனப் பாரம்பரியம் கூறுகிறது'),
  Venus: T('a period of relationships, comforts, arts and vehicles; balance spending with saving', 'உறவுகள், வசதிகள், கலை, வாகனங்களின் காலம்; செலவையும் சேமிப்பையும் சமன் செய்யவும்'),
  Saturn: T('a period of steady effort and responsibility; results come slowly but last, and discipline is rewarded', 'நிலையான உழைப்பு, பொறுப்பின் காலம்; பலன் மெதுவாக வந்தாலும் நிலைக்கும், ஒழுக்கம் பலன் தரும்'),
  Rahu: T('a period of ambition, change and unusual opportunities; check facts twice before big moves', 'லட்சியம், மாற்றம், புதிய வாய்ப்புகளின் காலம்; பெரிய முடிவுகளுக்கு முன் உண்மைகளை இருமுறை சரிபார்க்கவும்'),
  Ketu: T('a reflective, inward period — spirituality and letting go; avoid hasty detachment from work or people', 'உள்நோக்கு, ஆன்மீகம், பற்றின்மையின் காலம்; வேலை, மனிதர்களிடமிருந்து அவசரமாக விலகுவதைத் தவிர்க்கவும்'),
};

const freePractice = (k, lang) => (lang === 'ta' ? NAVAGRAHA[k].free.ta : NAVAGRAHA[k].free.en);

// ---------------------------------------------------------------- life events (marriage, children)
const MONTHS_TA = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const my = (d, lang) => { const x = new Date(d); return `${(lang === 'ta' ? MONTHS_TA : MONTHS_EN)[x.getUTCMonth()]} ${x.getUTCFullYear()}`; };
const periodText = (w, lang) => (lang === 'ta'
  ? `${my(w.peakFrom || w.start, 'ta')} – ${my(w.peakTo || w.end, 'ta')} (${PLANETS[w.md].ta} தசை, ${PLANETS[w.ad].ta} புக்தி${w.doubleTransit ? ', குரு–சனி இரட்டைக் கோசாரம்' : ''})`
  : `${my(w.peakFrom || w.start, 'en')} – ${my(w.peakTo || w.end, 'en')} (${w.md} dasa, ${w.ad} bhukti${w.doubleTransit ? ', Jupiter–Saturn double transit' : ''})`);
const YEAR = 365.25 * 86400000;

/**
 * Supportive periods for a life event across the whole adult life, split into past and future, and — when the
 * person already told us the year it happened — whether that year falls inside one of them (a "match").
 * This is how a traditional astrologer checks a chart against real life before predicting anything new.
 */
export function lifeEventCheck(chart, eventId, { now = new Date(), eventYear = null } = {}) {
  const birth = chart.utc instanceof Date ? chart.utc : new Date(chart.utc);
  const adult = new Date(birth.getTime() + 18 * YEAR);
  const pastRun = adult < now ? predictEvent(chart, eventId, { from: adult, years: Math.min(45, (now - adult) / YEAR) }) : null;
  const past = pastRun ? pastRun.windows.filter((w) => w.start < now) : [];
  const future = predictEvent(chart, eventId, { from: now, years: 12 });
  let match = null;
  if (eventYear) {
    const mid = Date.UTC(Number(eventYear), 6, 1);
    // Compare with every clearly supportive period (not only the top four shown), as a traditional check would.
    const pool = [...(pastRun?.allWindows || []), ...(future.allWindows || [])];
    const topScore = Math.max(0, ...pool.map((w) => w.score));
    const all = pool.filter((w) => w.score >= topScore * 0.55);
    const hit = all.find((w) => mid >= new Date(w.start).getTime() - 0.5 * YEAR && mid <= new Date(w.end).getTime() + 0.5 * YEAR);
    const nearest = [...all].sort((a, b) => Math.abs((new Date(a.start).getTime() + new Date(a.end).getTime()) / 2 - mid) - Math.abs((new Date(b.start).getTime() + new Date(b.end).getTime()) / 2 - mid))[0] || null;
    match = { year: Number(eventYear), hit: hit || null, nearest };
  }
  return { past, future: future.windows, promise: future.promise, match };
}

/**
 * Build the answer.
 * @param {object} p { question, lang, facts (chartFacts or null), name, today: { rahuKalam, yamagandam, goodTimes:[], horai } }
 * @returns {{ intent, lang, sections:[{key,title,lines}], actions:[{go,param,label}], clarify?:{options}, text }}
 */
export function composeAnswer({ question, lang: appLang = 'ta', facts: f = null, name = '', today = null, life = {} }) {
  const lang = answerLang(question, appLang);
  const tr = (o) => (lang === 'ta' ? o.ta : o.en);
  const L = (en, ta) => (lang === 'ta' ? ta : en);
  const { intent } = classify(question);
  const S = {};
  const add = (key, ...lines) => { (S[key] ||= []).push(...lines.flat().filter(Boolean)); };
  const actions = [];
  let clarify = null;
  // One headline percentage for the question (traditional point score, never a probability).
  let meter = null;
  const setMeter = (pct, topic) => {
    const v = Math.max(20, Math.min(92, Math.round(pct)));
    const label = v >= 75 ? T('Very favourable', 'மிகச் சாதகம்') : v >= 60 ? T('Favourable', 'சாதகம்') : v >= 45 ? T('Moderate — steady effort', 'மிதமானது — தொடர் முயற்சி') : T('Needs care & patience', 'கவனமும் பொறுமையும் தேவை');
    meter = { pct: v, label: tr(label), level: v >= 60 ? 'good' : v >= 45 ? 'mid' : 'low', topic: topic ? tr(topic) : '' };
  };
  const transitAdj = (f2, ids) => (f2.transit?.status || []).reduce((a, x) => a + (ids.includes(x.id) ? ({ guru_balam: 6, sani_good: 5, guru_weak: -4, ezharai: -6, ashtama: -8 }[x.id] || 0) : 0), 0);
  add('question', String(question).trim());

  const needChart = () => {
    add('factors', L('No birth details are saved yet, so I cannot read your chart.', 'பிறப்பு விவரங்கள் சேமிக்கப்படாததால் உங்கள் ஜாதகத்தைப் பார்க்க முடியவில்லை.'));
    actions.push({ go: 'family', param: { add: true }, label: L('Add birth details', 'பிறப்பு விவரம் சேர்') });
  };
  const ref = () => f && referenceNote(f, lang);

  // Age & life-stage control: a child's chart is never read for marriage, children, career, money,
  // property or court matters — tradition reads those only after the person is mature (18+).
  // AGE FIRST (shared/age-guard.js): the chart owner's calendar age decides whether this topic is read at all.
  const ageP = f?.birthDate ? ageProfile(f.birthDate, { now: f.now ? new Date(f.now) : new Date(), tz: f.chart?.tz }) : null;
  const age = ageP ? ageP.age : null;
  const GUARD_TOPIC = { marriage: 'marriage', marriage_when: 'marriage', child_when: 'child', pregnancy: 'child', career: 'career', finance: 'money', property: 'property', legal: 'court', vehicle: 'vehicle', love: 'love' };
  const ageGate = () => {
    if (age == null || !f) return false;
    const gTopic = GUARD_TOPIC[intent];
    if (gTopic && !topicAllowed(gTopic, ageP)) {
      const g = ageGuardAnswer({ topic: gTopic, profile: ageP, lang, name });
      for (const sx of g.sections) add(sx.key === 'dos' ? 'practice' : sx.key === 'prayer' ? 'next' : sx.key === 'note' ? 'support' : 'answer', ...sx.lines);
      return true;
    }
    if (age >= 50 && (intent === 'child_when' || intent === 'pregnancy') && !Number(life.children)) {
      add('answer', L(`At ${age}, the 5th house is read for the welfare of children in the family and for disciples and younger people you guide — not for new childbirth timing.`, `${age} வயதில், 5-ம் வீடு குடும்பக் குழந்தைகளின் நலன், நீங்கள் வழிகாட்டும் இளையோர் பற்றியே பார்க்கப்படுகிறது — புதிய குழந்தைப் பிறப்பு நேரம் அல்ல.`));
      add('factors', houseLine(f, 5, lang), planetLine(f, 'Jupiter', lang), dasaLine(f, lang));
      setMeter(f.strength.Jupiter.score, T('children’s welfare', 'குழந்தைகள் நலன்'));
      return true;
    }
    return false;
  };

  if (!ageGate()) switch (intent) {
    case 'crisis': {
      add('support',
        L('I am really glad you told me. What you are feeling matters, and you do not have to carry it alone.', 'நீங்கள் சொன்னதற்கு மிக்க நன்றி. நீங்கள் உணர்வது முக்கியமானது; இதைத் தனியாகச் சுமக்க வேண்டியதில்லை.'),
        L('Please talk to someone right now: Tele-MANAS (free, 24×7, Tamil & English) — call 14416 or 1-800-891-4416. In immediate danger, call 112.', 'தயவுசெய்து இப்போதே யாரிடமாவது பேசுங்கள்: Tele-MANAS (இலவசம், 24×7, தமிழ் & ஆங்கிலம்) — 14416 அல்லது 1-800-891-4416 அழையுங்கள். உடனடி ஆபத்து என்றால் 112.'),
        L('If you can, tell a family member or a friend you trust how you feel today.', 'முடிந்தால் நம்பிக்கையான குடும்பத்தினர் அல்லது நண்பரிடம் இன்று உங்கள் உணர்வைச் சொல்லுங்கள்.'),
        L('A horoscope cannot decide your future. Difficult periods pass, and help works.', 'ஜாதகம் உங்கள் எதிர்காலத்தைத் தீர்மானிக்காது. கடினமான காலங்கள் கடந்து போகும்; உதவி பலன் தரும்.'));
      break;
    }
    case 'death': {
      add('interpretation', L('Thunai does not predict death, lifespan or the timing of anyone’s passing. Traditional texts are not a reliable basis for that, and such predictions cause real fear.', 'மரணம், ஆயுட்காலம், யாருடைய மறைவின் நேரத்தையும் துணை கணிக்காது. அதற்குப் பாரம்பரிய நூல்கள் நம்பகமான அடிப்படை அல்ல; அத்தகைய கணிப்புகள் உண்மையான பயத்தை உண்டாக்கும்.'));
      add('next', L('If you are worried about your own or a loved one’s health, a doctor’s check-up is the right next step. I can help with a prayer for well-being or a calm day plan.', 'உங்கள் அல்லது அன்புக்குரியவரின் உடல்நலம் பற்றிக் கவலை என்றால், மருத்துவப் பரிசோதனையே சரியான அடுத்த படி. நலனுக்கான வழிபாடு அல்லது அமைதியான நாள் திட்டத்திற்கு உதவுகிறேன்.'));
      add('practice', L('Optional: the Mahamrityunjaya mantra or lighting a lamp at home, simply as a prayer for peace and well-being.', 'விருப்பம்: அமைதி, நலனுக்கான பிரார்த்தனையாக மகா மிருத்யுஞ்ஜய மந்திரம் அல்லது வீட்டில் தீபம்.'));
      break;
    }
    case 'pain': {
      clarify = { options: [T('Physical pain', 'உடல் வலி'), T('Emotional distress / worry', 'மன வேதனை / கவலை'), T('Something else (a situation or relationship)', 'வேறு ஏதோ (சூழ்நிலை / உறவு)')] };
      if (/chest|breath|faint|stroke|heart|நெஞ்சு|மூச்சு|மயக்க|இதய|nenju|moochu/i.test(question)) add('answer', L('Chest pain, breathlessness or fainting can be an emergency — call 112 now or go to the nearest hospital. Please do not wait for any horoscope answer.', 'நெஞ்சு வலி, மூச்சுத் திணறல், மயக்கம் அவசர நிலையாக இருக்கலாம் — உடனே 112 அழையுங்கள் அல்லது அருகிலுள்ள மருத்துவமனைக்குச் செல்லுங்கள். ஜாதகப் பதிலுக்காகக் காத்திருக்க வேண்டாம்.'));
      add('next', L('When you say “pain”, what do you mean? Choose one so I can help in the right way:', '“வலி” என்று சொல்லும்போது எதைக் குறிக்கிறீர்கள்? சரியாக உதவ ஒன்றைத் தேர்வு செய்யுங்கள்:'));
      add('support', L('If the pain is physical and severe, sudden, or with chest pain or breathlessness, please seek medical care now (emergency: 112).', 'உடல் வலி கடுமையாக, திடீரென, அல்லது நெஞ்சு வலி / மூச்சுத் திணறலுடன் இருந்தால் உடனே மருத்துவ உதவி பெறுங்கள் (அவசரம்: 112).'));
      break;
    }
    case 'health': {
      // Traditional planetary health guidance (dasa, bhukti, gochara and peyarchi), kept separate from medical advice.
      const acute = /fever|pain|cancer|bleed|chest|breath|faint|accident|surgery|operation|hospital|காய்ச்சல்|வலி|ரத்த|நெஞ்சு|மூச்சு|மயக்க|விபத்து|அறுவை|ஆஸ்பத்திரி|kaichal|vali/i.test(question);
      if (acute) add('answer', L('For a symptom like this, please see a doctor first — that comes before any horoscope reading. If it is urgent, call 112. Below is only the traditional planetary health outlook, for your peace of mind.', 'இத்தகைய அறிகுறிக்கு முதலில் மருத்துவரைப் பாருங்கள் — எந்த ஜாதகப் பலனையும் விட அதுவே முதன்மை. அவசரம் என்றால் 112. கீழே மன அமைதிக்காக பாரம்பரிய கிரக ஆரோக்கியப் பார்வை மட்டும்.'));
      if (!f) { needChart(); break; }
      const hg = healthGuide(f.chart, { gender: life.gender });
      const p = hg.period;
      setMeter({ good: 80, steady: 63, care: 46 }[p.level] ?? 60, T('health', 'ஆரோக்கியம்'));
      const lvlEn = { good: 'a supportive period for health', steady: 'a steady period — keep your routine', care: 'a period to take extra care of your health' }[p.level];
      const lvlTa = { good: 'ஆரோக்கியத்திற்கு ஆதரவான காலம்', steady: 'நிலையான காலம் — வழக்கத்தைத் தொடருங்கள்', care: 'ஆரோக்கியத்தில் கூடுதல் கவனம் தேவையான காலம்' }[p.level];
      if (!acute) add('answer', L(`By your dasa, bhukti and current transits, this is ${lvlEn}. Protect: ${hg.bodyAreas.slice(0, 2).map((x) => x.en).join('; ')}.`, `உங்கள் தசை, புக்தி, கோசாரப்படி இது ${lvlTa}. கவனிக்க: ${hg.bodyAreas.slice(0, 2).map((x) => x.ta).join('; ')}.`),
        L(`Eat more: ${hg.diet.eat.slice(0, 3).map((x) => x.en.split(' — ')[0].toLowerCase()).join(', ')}. Reduce: ${hg.diet.avoid.slice(0, 2).map((x) => x.en.split(' — ')[0].toLowerCase()).join(', ')}.`, `அதிகம் உண்ண: ${hg.diet.eat.slice(0, 3).map((x) => x.ta.split(' — ')[0]).join(', ')}. குறைக்க: ${hg.diet.avoid.slice(0, 2).map((x) => x.ta.split(' — ')[0]).join(', ')}.`));
      add('factors', dasaLine(f, lang), ...p.dasaNotes.slice(0, 3).map((n) => tr(n)), ...p.gochara.slice(0, 3).map((n) => `${lang === 'ta' ? 'கோசாரம்' : 'Transit'}: ${tr(n)}`),
        L(`Body constitution (traditional): ${hg.constitution.name.en}`, `உடல்வாகு (பாரம்பரியம்): ${hg.constitution.name.ta}`));
      add('interpretation', ...hg.bodyAreas.slice(0, 3).map((x) => `${x.icon || '•'} ${tr(x)} — ${x.reasons.slice(0, 1).map((r) => tr(r)).join('')} ${x.tip ? `· ${tr(x.tip)}` : ''}`));
      const care = hg.months.filter((m) => m.level !== 'steady').slice(0, 3);
      if (care.length) add('interpretation', L(`Coming months to note: ${care.map((m) => `${my(`${m.month}-15`, 'en')} (${m.level === 'good' ? 'good' : 'take care'})`).join(', ')}.`, `கவனிக்க வேண்டிய மாதங்கள்: ${care.map((m) => `${my(`${m.month}-15`, 'ta')} (${m.level === 'good' ? 'நன்று' : 'கவனம்'})`).join(', ')}.`));
      add('facts', L(`Eat: ${hg.diet.eat.slice(0, 5).map((x) => x.en).join('; ')}`, `உண்ண: ${hg.diet.eat.slice(0, 5).map((x) => x.ta).join('; ')}`),
        L(`Avoid / reduce: ${hg.diet.avoid.slice(0, 4).map((x) => x.en).join('; ')}`, `தவிர்க்க / குறைக்க: ${hg.diet.avoid.slice(0, 4).map((x) => x.ta).join('; ')}`),
        hg.age >= 14 && L(`Fasting day: ${hg.diet.fasting.day.en}`, `விரத நாள்: ${hg.diet.fasting.day.ta}`));
      add('uncertainty', L('This is traditional astrological and Siddha/Ayurveda-style guidance about tendencies — not a diagnosis and not a prediction of illness. Your doctor’s advice always comes first; keep regular check-ups.', 'இது பாரம்பரிய ஜோதிட, சித்த/ஆயுர்வேத வழியிலான போக்குகள் பற்றிய வழிகாட்டல் — நோய் கண்டறிதலோ நோய் கணிப்போ அல்ல. மருத்துவர் ஆலோசனையே எப்போதும் முதன்மை; வழக்கமான பரிசோதனைகளைத் தொடருங்கள்.'));
      add('practice', ...hg.remedies.planets.slice(0, 2).map((r) => `${pName(r.planet, lang)}: ${tr(r.free)}`));
      add('next', L('Open Health & Planets for the full 12-month care map, foods and yoga.', 'முழு 12 மாத கவன வரைபடம், உணவு, யோகாவுக்கு "ஆரோக்கியம் & கிரகங்கள்" திறங்கள்.'));
      actions.push({ go: 'health', label: L('Health & Planets', 'ஆரோக்கியம் & கிரகங்கள்') });
      break;
    }
    case 'emotional': {
      add('support', L(`I hear you${name ? `, ${name}` : ''}. Feeling worried is understandable, and it is good that you are looking at it calmly.`, `புரிகிறது${name ? `, ${name}` : ''}. கவலைப்படுவது இயல்பு; அமைதியாக இதைப் பார்க்க முயல்வது நல்லது.`));
      if (f) {
        const pressure = f.transit?.status.some((x) => ['ezharai', 'ashtama'].includes(x.id));
        const support = f.transit?.status.some((x) => x.id === 'guru_balam');
        add('answer', L(`${pressure ? 'Saturn is putting some pressure on your Moon sign now, which can feel heavy — it builds strength and it passes.' : 'There is no heavy planetary pressure on you right now.'}${support ? ' Jupiter is supporting you (Guru Balam), so help and good advice will come.' : ''}${f.dasa ? ` Your ${f.dasa.lord} dasa asks for ${DASA_NATURE[f.dasa.lord].en.split(';')[1]?.trim() || 'patience'}.` : ''}`, `${pressure ? 'இப்போது சனி உங்கள் சந்திர ராசி மீது அழுத்தம் தருகிறது; சற்றுக் கனமாக இருக்கலாம் — இது வலிமை தரும், கடந்து போகும்.' : 'இப்போது உங்கள் மீது கனமான கிரக அழுத்தம் இல்லை.'}${support ? ' குரு பலம் உள்ளது; உதவியும் நல்ல ஆலோசனையும் கிடைக்கும்.' : ''}${f.dasa ? ` ${pName(f.dasa.lord, 'ta')} தசை: ${DASA_NATURE[f.dasa.lord].ta.split(';')[1]?.trim() || 'பொறுமை தேவை'}.` : ''}`));
        add('factors', dasaLine(f, lang), transitLines(f, lang, ['ezharai', 'ashtama', 'ardhashtama', 'sani_good', 'guru_balam', 'guru_weak']), f.dasa ? planetLine(f, f.dasa.lord, lang) : null, planetLine(f, 'Moon', lang));
        if (f.dasa) add('interpretation', L(`Traditionally, ${f.dasa.lord} mahadasa is ${DASA_NATURE[f.dasa.lord].en}.`, `பாரம்பரியப்படி ${pName(f.dasa.lord, 'ta')} மகா தசை — ${DASA_NATURE[f.dasa.lord].ta}.`));
        if (f.transit?.status.some((s) => ['ezharai', 'ashtama'].includes(s.id))) add('interpretation', L('Saturn’s transit over your Moon sign is traditionally read as a time of pressure that builds maturity — not as a misfortune.', 'சந்திர ராசி மீதான சனியின் சஞ்சாரம் முதிர்ச்சியை வளர்க்கும் அழுத்தமான காலமாகவே பாரம்பரியம் பார்க்கிறது — துரதிர்ஷ்டமாக அல்ல.'));
        add('uncertainty', L('These are tendencies, not a fixed outcome. Your own choices and support around you matter more than any period.', 'இவை போக்குகள் மட்டுமே; நிலையான முடிவு அல்ல. எந்தக் காலத்தையும் விட உங்கள் முடிவுகளும் சுற்றியுள்ள ஆதரவும் முக்கியம்.'), ref());
        if (f.dasa) add('practice', freePractice(f.dasa.lord, lang));
      } else needChart();
      add('next', L('Write down the one work concern that worries you most, and one small step you can take this week. If the worry affects sleep or daily life for more than two weeks, please talk to a counsellor (Tele-MANAS: 14416, free).', 'உங்களை அதிகம் கவலைப்படுத்தும் ஒரு விஷயத்தையும், இந்த வாரம் செய்யக்கூடிய ஒரு சிறு படியையும் எழுதுங்கள். இரண்டு வாரங்களுக்கு மேல் உறக்கம் / அன்றாட வாழ்க்கை பாதித்தால் ஆலோசகரிடம் பேசுங்கள் (Tele-MANAS: 14416, இலவசம்).'));
      break;
    }
    case 'dasa': {
      if (!f) { needChart(); break; }
      add('factors', dasaLine(f, lang), f.dasa && planetLine(f, f.dasa.lord, lang), f.bhukti && f.bhukti.lord !== f.dasa?.lord && planetLine(f, f.bhukti.lord, lang));
      if (f.dasa) {
        setMeter(0.6 * f.strength[f.dasa.lord].score + 0.4 * (f.bhukti ? f.strength[f.bhukti.lord].score : f.strength[f.dasa.lord].score) + transitAdj(f, ['ezharai', 'ashtama', 'sani_good', 'guru_balam', 'guru_weak']), T('your current period', 'நடப்புக் காலம்'));
        add('answer', L(`You are now in ${f.dasa.lord} mahadasa (until ${my(f.dasa.end, 'en')})${f.bhukti ? ` with ${f.bhukti.lord} bhukti until ${my(f.bhukti.end, 'en')}` : ''}. In simple words: ${DASA_NATURE[f.dasa.lord].en.split(';')[0]}${f.bhukti ? `, and for now ${DASA_NATURE[f.bhukti.lord].en.split(';')[0].replace(/^an? /, '').replace(/^period of /, '')}` : ''}.`, `நீங்கள் இப்போது ${pName(f.dasa.lord, 'ta')} மகா தசையில் (${my(f.dasa.end, 'ta')} வரை)${f.bhukti ? `, ${pName(f.bhukti.lord, 'ta')} புக்தியில் (${my(f.bhukti.end, 'ta')} வரை)` : ''} இருக்கிறீர்கள். எளிமையாகச் சொன்னால்: ${DASA_NATURE[f.dasa.lord].ta.split(';')[0]}.`));
        add('interpretation', L(`${f.dasa.lord} mahadasa: ${DASA_NATURE[f.dasa.lord].en}.`, `${pName(f.dasa.lord, 'ta')} மகா தசை: ${DASA_NATURE[f.dasa.lord].ta}.`));
        if (f.bhukti) add('interpretation', L(`Within it, the ${f.bhukti.lord} bhukti adds the flavour of ${DASA_NATURE[f.bhukti.lord].en.split(';')[0]}.`, `அதற்குள் ${pName(f.bhukti.lord, 'ta')} புக்தி — ${DASA_NATURE[f.bhukti.lord].ta.split(';')[0]}.`));
        const g = f.strength[f.dasa.lord];
        add('interpretation', g.level === 'strong' ? L('The period lord is strong in your chart, which tradition reads as supportive.', 'தசா நாதன் உங்கள் ஜாதகத்தில் பலமாக உள்ளார்; பாரம்பரியம் இதைச் சாதகமாகப் பார்க்கிறது.')
          : g.level === 'weak' ? L('The period lord is weak in your chart, so tradition advises patience and steady effort rather than big risks.', 'தசா நாதன் பலவீனமாக உள்ளதால், பெரிய அபாயங்களை விட பொறுமையும் நிலையான உழைப்பும் நல்லது எனப் பாரம்பரியம் கூறுகிறது.')
            : L('The period lord is of middling strength — results follow effort.', 'தசா நாதன் மத்திம பலம் — உழைப்புக்கேற்ற பலன்.'));
        if (f.nextDasa) add('factors', L(`Next: ${f.nextDasa.lord} mahadasa from ${iso(f.nextDasa.start)}.`, `அடுத்து: ${pName(f.nextDasa.lord, 'ta')} மகா தசை ${iso(f.nextDasa.start)} முதல்.`));
        add('practice', freePractice(f.dasa.lord, lang));
      }
      add('uncertainty', L('Dasa dates use the Vimshottari system with 365.25-day years; other conventions shift dates slightly. A dasa describes a theme, not specific events.', 'தசா தேதிகள் விம்சோத்தரி முறை, 365.25 நாள் ஆண்டு அடிப்படையில்; பிற முறைகளில் சிறிது மாறலாம். தசை ஒரு கருப்பொருளைக் காட்டும்; குறிப்பிட்ட நிகழ்வுகளை அல்ல.'), ref());
      add('next', L('Use this period for steady routines and one clear goal. For timing of a specific event, ask about it directly (e.g. a job change or a family function).', 'இந்தக் காலத்தை நிலையான பழக்கங்களுக்கும் ஒரு தெளிவான இலக்கிற்கும் பயன்படுத்துங்கள். குறிப்பிட்ட நிகழ்வின் நேரத்திற்கு அதைப் பற்றி நேரடியாகக் கேளுங்கள்.'));
      actions.push({ go: 'chart', label: L('Open my chart', 'என் ஜாதகம் திற') });
      break;
    }
    case 'weak': {
      if (!f) { needChart(); break; }
      add('answer', L(`The planets needing care in your chart are ${f.weakest.map((g) => g.planet).join(' and ')}. A simple free practice: ${freePractice(f.weakest[0].planet, 'en')}`, `உங்கள் ஜாதகத்தில் கவனம் தேவையான கிரகங்கள்: ${f.weakest.map((g) => pName(g.planet, 'ta')).join(', ')}. எளிய இலவச வழிபாடு: ${freePractice(f.weakest[0].planet, 'ta')}`));
      add('factors', ...f.weakest.map((g) => planetLine(f, g.planet, lang)));
      add('interpretation', ...f.weakest.map((g) => L(`${g.planet} traditionally governs ${NAVAGRAHA[g.planet].governs.en.toLowerCase()}. A weaker ${g.planet} suggests giving these areas a little more care — not that something bad will happen.`, `${pName(g.planet, 'ta')} பாரம்பரியப்படி ${NAVAGRAHA[g.planet].governs.ta} ஆகியவற்றைக் குறிக்கும். பலம் குறைந்தால் இவற்றில் சற்றுக் கூடுதல் கவனம் — தீங்கு நடக்கும் என்பதல்ல.`)));
      add('uncertainty', L('“Strength” here is a traditional point score (sign, house, combustion, retrogression), not a measured probability. Different schools weigh these differently.', 'இங்கு “பலம்” என்பது பாரம்பரியப் புள்ளி மதிப்பு (ராசி, பாவம், அஸ்தங்கம், வக்கிரம்); அளவிடப்பட்ட நிகழ்தகவு அல்ல. ஒவ்வொரு மரபும் வேறுபடலாம்.'), ref());
      add('practice', ...f.weakest.map((g) => `${pName(g.planet, lang)}: ${freePractice(g.planet, lang)}`));
      add('next', L('Choose one simple practice and keep it for 48 days. No costly pooja or gemstone is needed.', 'ஒரு எளிய வழிபாட்டைத் தேர்ந்து 48 நாள் தொடருங்கள். விலையுயர்ந்த பூஜையோ ரத்தினமோ தேவையில்லை.'));
      actions.push({ go: 'parigaram', label: L('All simple practices', 'அனைத்து எளிய வழிபாடுகள்') });
      break;
    }
    case 'vehicle': {
      if (f) {
        const lagnaLord = RASIS[f.fromSign].lord;
        const moonLord = RASIS[f.moonSign].lord;
        add('factors', L(`${f.reference === 'lagna' ? 'Lagna' : 'Moon-sign'} lord: ${lagnaLord} (${f.strength[lagnaLord].level}); Moon-sign lord: ${moonLord}.`, `${f.reference === 'lagna' ? 'லக்ன' : 'சந்திர ராசி'} அதிபதி: ${pName(lagnaLord, 'ta')} (${strengthWord(f.strength[lagnaLord], 'ta')}); ராசி அதிபதி: ${pName(moonLord, 'ta')}.`),
          houseLine(f, 4, lang), dasaLine(f, lang));
        const colours = [...new Set([lagnaLord, moonLord])].map((k) => `${pName(k, lang)} — ${tr(NAVAGRAHA[k].color)}`);
        const ln0 = f.birthDate ? luckyNumbers(f.birthDate) : null;
        add('answer', L(`Best colours for you: ${[...new Set([lagnaLord, moonLord])].map((k) => NAVAGRAHA[k].color.en).join(' or ')}.${ln0 ? ` Choose a registration number whose digits add up to ${ln0.lucky.join(', ')}.` : ''} Pick the delivery day with the vehicle muhurtham.`, `உங்களுக்கு ஏற்ற நிறம்: ${[...new Set([lagnaLord, moonLord])].map((k) => NAVAGRAHA[k].color.ta).join(' அல்லது ')}.${ln0 ? ` பதிவு எண்ணின் கூட்டுத்தொகை ${ln0.lucky.join(', ')} வருமாறு தேர்வு செய்யுங்கள்.` : ''} டெலிவரி நாளை வாகன முகூர்த்தம் மூலம் தேர்வு செய்யுங்கள்.`));
        add('interpretation', L(`Colour: tradition links colours with your chart’s ruling planets: ${colours.join('; ')}. Any colour you like is fine — this is a preference, not a rule.`, `நிறம்: உங்கள் ஜாதக அதிபதிகளுடன் பாரம்பரியம் இணைக்கும் நிறங்கள்: ${colours.join('; ')}. உங்களுக்குப் பிடித்த எந்த நிறமும் சரியே — இது விருப்பம், விதி அல்ல.`));
      } else needChart();
      if (f?.birthDate) {
        const ln = luckyNumbers(f.birthDate);
        add('interpretation', L(`Registration number: in numerology (a separate tradition from astrology), totals reducing to ${ln.lucky.join(', ')} are considered harmonious with your birth date; ${ln.avoid?.length ? `${ln.avoid.join(', ')} are usually avoided` : 'no number is “bad”'}.`, `பதிவு எண்: எண் கணிதத்தில் (ஜோதிடத்திலிருந்து தனி மரபு) கூட்டுத்தொகை ${ln.lucky.join(', ')} வருவது உங்கள் பிறந்த தேதிக்கு இணக்கமானது எனக் கருதப்படும்; ${ln.avoid?.length ? `${ln.avoid.join(', ')} பொதுவாகத் தவிர்க்கப்படும்` : 'எந்த எண்ணும் “கெட்டது” அல்ல'}.`));
        actions.push({ go: 'numerology', label: L('Check a specific number', 'ஒரு எண்ணைச் சரிபார்') });
      }
      add('uncertainty', L('Colour and number choices are traditional preferences. Road safety depends on the vehicle, driving and maintenance — not on its colour or number.', 'நிறம், எண் தேர்வுகள் பாரம்பரிய விருப்பங்கள் மட்டுமே. சாலைப் பாதுகாப்பு வாகனம், ஓட்டுதல், பராமரிப்பைச் சார்ந்தது — நிறம் அல்லது எண்ணை அல்ல.'));
      add('practice', L('Optional: a simple vahana pooja with a lamp and a coconut at your nearby temple before the first drive.', 'விருப்பம்: முதல் பயணத்திற்கு முன் அருகிலுள்ள கோவிலில் தீபம், தேங்காயுடன் எளிய வாகன பூஜை.'));
      add('next', L('Compare safety ratings, insurance and total cost first. Then pick a delivery date with the Muhurtham finder (Vehicle).', 'முதலில் பாதுகாப்பு மதிப்பீடு, காப்பீடு, மொத்தச் செலவை ஒப்பிடுங்கள். பின்னர் முகூர்த்தம் (வாகனம்) மூலம் டெலிவரி நாளைத் தேர்வு செய்யுங்கள்.'));
      actions.push({ go: 'muhurtham', param: { category: 'vehicle' }, label: L('Find a vehicle muhurtham', 'வாகன முகூர்த்தம் தேடு') });
      break;
    }
    case 'temple': {
      if (f) {
        add('factors', dasaLine(f, lang), ...f.weakest.slice(0, 1).map((g) => planetLine(f, g.planet, lang)));
        const lords = [...new Set([f.dasa?.lord, f.weakest[0]?.planet].filter(Boolean))];
        add('answer', L(`Temples that suit your chart now: ${lords.map((k) => `${NAVAGRAHA[k].temple.en} (for ${k})`).join(' and ')}. Plan the visit with My Spiritual Journey for dates, route and cost.`, `இப்போது உங்கள் ஜாதகத்திற்கு ஏற்ற கோவில்கள்: ${lords.map((k) => `${NAVAGRAHA[k].temple.ta} (${pName(k, 'ta')})`).join(', ')}. தேதி, வழி, செலவுக்கு "என் ஆன்மீகப் பயணம்" மூலம் திட்டமிடுங்கள்.`));
        add('interpretation', ...lords.map((k) => L(`Tradition associates ${k} with ${NAVAGRAHA[k].deity.en}; its Navagraha sthalam is ${NAVAGRAHA[k].temple.en}.`, `${pName(k, 'ta')} — ${NAVAGRAHA[k].deity.ta} வழிபாட்டுடன் பாரம்பரியமாக இணைக்கப்படுகிறது; நவகிரகத் தலம்: ${NAVAGRAHA[k].temple.ta}.`)));
      } else needChart();
      add('uncertainty', L('Worship associations differ between families and traditions; your Kula Deivam and family custom come first.', 'வழிபாட்டு மரபுகள் குடும்பத்திற்குக் குடும்பம் வேறுபடும்; உங்கள் குலதெய்வமும் குடும்ப வழக்கமும் முதன்மை.'));
      add('facts', L('Opening hours, travel time and costs change. The journey planner labels each detail as verified or estimated, with its source and date.', 'திறப்பு நேரம், பயண நேரம், செலவு மாறும். பயணத் திட்டத்தில் ஒவ்வொரு விவரமும் சரிபார்க்கப்பட்டதா / மதிப்பீடா என ஆதாரம், தேதியுடன் காட்டப்படும்.'));
      add('next', L('Open My Spiritual Journey: enter your dates, starting city and budget, and you will get three options — nearby, matching your leave, and a local worship option.', 'என் ஆன்மீகப் பயணம் திறந்து, தேதிகள், புறப்படும் ஊர், பட்ஜெட் உள்ளிடுங்கள் — அருகில், விடுப்புக்கு ஏற்ப, உள்ளூர் வழிபாடு என மூன்று வழிகள் கிடைக்கும்.'));
      {
        const lordsT = f ? [...new Set([f.dasa?.lord, f.weakest[0]?.planet].filter(Boolean))] : [];
        const focus = TEMPLES.filter((t) => lordsT.includes(t.planet)).map((t) => t.id);
        actions.push({ go: 'journey', param: { question, temples: focus, planets: lordsT }, label: L('🛕 Plan the visit to these temples', '🛕 இந்தக் கோவில்களுக்குப் பயணம் திட்டமிடு') });
      }
      break;
    }
    case 'dates': {
      add('answer', L('Tap “Find dates for the family” below — Thunai checks every family member’s star and lists the good dates and times that suit everyone.', 'கீழே “குடும்பத்திற்கு நாள் தேடு” அழுத்துங்கள் — ஒவ்வொரு குடும்ப உறுப்பினரின் நட்சத்திரத்தையும் பார்த்து, அனைவருக்கும் ஏற்ற நல்ல நாள், நேரங்களைத் துணை பட்டியலிடும்.'));
      add('interpretation', L('Tradition chooses dates using the panchangam (tithi, star, weekday), avoids Rahu Kalam, Yamagandam, Ashtami, Navami and Amavasai, and checks each family member’s Tara Bala and Chandrashtamam.', 'பஞ்சாங்கம் (திதி, நட்சத்திரம், கிழமை) அடிப்படையில் நாள் தேர்வு; ராகு காலம், எமகண்டம், அஷ்டமி, நவமி, அமாவாசை தவிர்ப்பு; ஒவ்வொரு குடும்ப உறுப்பினரின் தாரா பலம், சந்திராஷ்டமம் சரிபார்ப்பு — இதுவே மரபு.'));
      if (f?.transit) add('factors', transitLines(f, lang, ['guru_balam', 'guru_weak']));
      add('uncertainty', L('Different family astrologers may prefer slightly different rules (for example about Aadi, Purattasi or Margazhi months). Confirm the final date with your family priest.', 'குடும்ப ஜோதிடர்கள் சிறிது வேறுபட்ட விதிகளை விரும்பலாம் (எ.கா. ஆடி, புரட்டாசி, மார்கழி). இறுதி நாளைக் குடும்பப் புரோகிதரிடம் உறுதி செய்யுங்கள்.'));
      add('practice', L('Optional: begin with a Ganapathi prayer and a lamp in the new home.', 'விருப்பம்: புதிய வீட்டில் விநாயகர் வழிபாடு, தீபத்துடன் தொடங்குங்கள்.'));
      add('next', L('Open the Muhurtham finder with all family members selected — it lists dates that suit everyone.', 'அனைத்துக் குடும்ப உறுப்பினர்களையும் தேர்வு செய்து முகூர்த்தம் தேடலைத் திறங்கள் — அனைவருக்கும் ஏற்ற நாட்கள் பட்டியலிடப்படும்.'));
      actions.push({ go: 'muhurtham', param: { category: /house|griha|graha|கிரக|புதுமனை|வீடு/i.test(question) ? 'graha_pravesam' : /wedding|marri|திருமண|கல்யாண/i.test(question) ? 'marriage' : 'graha_pravesam', allFamily: true }, label: L('Find dates for the family', 'குடும்பத்திற்கு நாள் தேடு') });
      break;
    }
    case 'goodtime': {
      if (today) add('answer', today.goodTimes?.length
        ? L(`Best time today: ${today.goodTimes[0]}. Avoid Rahu Kalam ${today.rahuKalam}.`, `இன்று சிறந்த நேரம்: ${today.goodTimes[0]}. ராகு காலம் ${today.rahuKalam} தவிர்க்கவும்.`)
        : L(`No more good time today; start tomorrow morning. Avoid Rahu Kalam ${today.rahuKalam}.`, `இன்று இனி நல்ல நேரம் இல்லை; நாளை காலை தொடங்குங்கள். ராகு காலம் ${today.rahuKalam} தவிர்க்கவும்.`));
      if (today) {
        add('factors', L(`Rahu Kalam today: ${today.rahuKalam}. Yamagandam: ${today.yamagandam}.`, `இன்று ராகு காலம்: ${today.rahuKalam}. எமகண்டம்: ${today.yamagandam}.`),
          today.goodTimes?.length ? L(`Gowri nalla neram still ahead today: ${today.goodTimes.join(', ')}.`, `இன்று இன்னும் வரவிருக்கும் கௌரி நல்ல நேரம்: ${today.goodTimes.join(', ')}.`) : L('No more Gowri nalla neram today — tomorrow morning is the next.', 'இன்று இனி கௌரி நல்ல நேரம் இல்லை — நாளை காலை அடுத்தது.'),
          today.horai && L(`Current Horai: ${today.horai}.`, `தற்போதைய ஓரை: ${today.horai}.`));
      }
      if (f && today?.chandrashtamam) add('factors', L('Today is Chandrashtamam for you — tradition advises postponing big starts if you can.', 'இன்று உங்களுக்குச் சந்திராஷ்டமம் — முடிந்தால் பெரிய தொடக்கங்களைத் தள்ளிவைக்கலாம் என மரபு கூறுகிறது.'));
      add('interpretation', L('Tradition prefers starting important work in a nalla neram and outside Rahu Kalam and Yamagandam.', 'முக்கிய வேலையை நல்ல நேரத்தில், ராகு காலம், எமகண்டம் தவிர்த்துத் தொடங்குவது மரபு.'));
      add('next', L('For a yes/no on a specific action right now, use “Is now a good time?” (Prasnam).', 'இப்போது ஒரு குறிப்பிட்ட செயலுக்கு ஆம்/இல்லை அறிய “இப்போது செய்யலாமா?” (பிரசன்னம்) பயன்படுத்துங்கள்.'));
      actions.push({ go: 'ask', label: L('Is now a good time?', 'இப்போது செய்யலாமா?') });
      break;
    }
    case 'love': {
      if (!f) { needChart(); break; }
      // Romance: 5th house (love), 7th house (partner), Venus (affection); Jupiter for a woman's chart.
      const kar = life.gender === 'female' ? 'Jupiter' : 'Venus';
      const fifth = f.houseInfo(5), seventh = f.houseInfo(7);
      const linked = f.dasa && ([5, 7].includes(f.planetHouse(f.dasa.lord)) || f.ruled(f.dasa.lord).some((h) => [5, 7].includes(h)) || f.dasa.lord === 'Venus');
      setMeter(0.35 * f.strength[fifth.lord].score + 0.25 * f.strength.Venus.score + 0.2 * f.strength[seventh.lord].score + 0.2 * (f.dasa ? f.strength[f.dasa.lord].score : 50) + (linked ? 8 : 0) + transitAdj(f, ['guru_balam', 'guru_weak']), T('love life', 'காதல் வாழ்க்கை'));
      const pv = meter.pct;
      if (age >= 60) {
        add('answer', L(`At ${age}, the 5th and 7th houses speak of companionship, warmth and harmony at home. Your chart shows ${pv >= 60 ? 'good support' : 'that patience and gentle words matter most'} for that now.`, `${age} வயதில், 5, 7-ம் வீடுகள் துணை, அன்பு, வீட்டு இணக்கத்தைக் குறிக்கின்றன. இப்போது உங்கள் ஜாதகம் ${pv >= 60 ? 'அதற்கு நல்ல ஆதரவு' : 'பொறுமையும் இனிய சொல்லும் மிக முக்கியம் என்று'} காட்டுகிறது.`));
      } else {
        add('answer', L(`Your love life is ${pv >= 75 ? 'very well supported' : pv >= 60 ? 'well supported' : pv >= 45 ? 'steady — it grows with patience and honesty' : 'slow for now — friendship and patience come first'}.${linked ? ` Your current ${f.dasa.lord} dasa activates romance and partnership, so this is an active time.` : ''}`,
          `உங்கள் காதல் வாழ்க்கை ${pv >= 75 ? 'மிகுந்த ஆதரவுடன் உள்ளது' : pv >= 60 ? 'நல்ல ஆதரவுடன் உள்ளது' : pv >= 45 ? 'நிலையாக உள்ளது — பொறுமை, நேர்மையால் வளரும்' : 'இப்போது மெதுவாக உள்ளது — முதலில் நட்பு, பொறுமை'}.${linked ? ` நடப்பு ${pName(f.dasa.lord, 'ta')} தசை காதல், துணை பகுதியைச் செயல்படுத்துகிறது; இது செயலூக்கமான காலம்.` : ''}`));
      }
      add('factors', houseLine(f, 5, lang), houseLine(f, 7, lang), planetLine(f, 'Venus', lang), kar !== 'Venus' && planetLine(f, kar, lang), dasaLine(f, lang), transitLines(f, lang, ['guru_balam', 'guru_weak']));
      add('interpretation', L('Tradition reads the 5th house for romance, the 7th for a lasting partner, and Venus for affection and attraction.', 'மரபுப்படி 5-ம் வீடு காதல், 7-ம் வீடு நிலையான துணை, சுக்கிரன் அன்பு, ஈர்ப்பு.'));
      add('uncertainty', L('No chart decides whom you will love. Respect, consent and honesty build every good relationship.', 'யாரைக் காதலிப்பீர்கள் என்பதை எந்த ஜாதகமும் தீர்மானிக்காது. மரியாதை, சம்மதம், நேர்மையே நல்ல உறவின் அடிப்படை.'));
      add('practice', L('Friday: light a ghee lamp for Goddess Mahalakshmi; wear something clean and bright; speak kindly.', 'வெள்ளி: மகாலட்சுமிக்கு நெய் தீபம்; சுத்தமான, பிரகாசமான உடை; இனிய சொல்.'));
      add('next', L('Check the Love Match with the person you like — both charts side by side.', 'நீங்கள் விரும்பும் நபருடன் காதல் பொருத்தம் பாருங்கள் — இருவர் ஜாதகமும் ஒப்பீடு.'));
      actions.push({ go: 'lovematch', label: L('💘 Love Match', '💘 காதல் பொருத்தம்') });
      break;
    }
    case 'festival': {
      const lat = f?.chart?.lat ?? 9.9252, lon = f?.chart?.lon ?? 78.1198, tz = f?.chart?.tz ?? 5.5;
      const list = [];
      for (let d = 0; d < 31 && list.length < 8; d++) {
        const day = new Date(Date.now() + d * 86400000);
        const noon = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12 - tz));
        try { for (const fe of tamilDay(noon, lat, lon, tz).festivals || []) list.push(`${noon.toISOString().slice(0, 10)} — ${tr(fe)}`); } catch { /* skip day */ }
      }
      add('answer', list.length ? L(`Next festivals and viratha days: ${list.slice(0, 3).join('; ')}.`, `அடுத்த விழாக்கள், விரத நாட்கள்: ${list.slice(0, 3).join('; ')}.`) : L('No major festival in the next 30 days.', 'அடுத்த 30 நாட்களில் பெரிய விழா இல்லை.'));
      if (list.length > 3) add('facts', ...list.slice(3));
      add('next', L('Open the Tamil calendar for the full list with timings, and set a reminder.', 'நேரத்துடன் முழுப் பட்டியலுக்கு தமிழ் நாட்காட்டியைத் திறந்து நினைவூட்டல் அமையுங்கள்.'));
      actions.push({ go: 'vratham', label: L('Viratha days', 'விரத நாட்கள்') }, { go: 'calendar', label: L('Tamil calendar', 'தமிழ் நாட்காட்டி') });
      break;
    }
    case 'marriage_when':
    case 'child_when': {
      if (!f) { needChart(); break; }
      if (f.rel && f.rel.nakshatra === false) { add('uncertainty', L('Timing needs the dasa periods, but your birth star is uncertain (birth time unknown), so dates cannot be given reliably.', 'காலம் கணிக்க தசா காலம் தேவை; பிறந்த நேரம் தெரியாததால் நட்சத்திரம் உறுதியில்லை, எனவே தேதிகளை நம்பகமாகச் சொல்ல முடியாது.')); break; }
      const isMarriage = intent === 'marriage_when';
      const done = isMarriage ? life.maritalStatus === 'married' : Number(life.children) > 0;
      const eventYear = isMarriage ? life.marriedYear : life.firstChildYear;
      const askAgain = !isMarriage && done && /another|second|next|இன்னொரு|இரண்டாவது|innoru|rendavadhu/i.test(question);
      const chk = lifeEventCheck(f.chart, isMarriage ? 'marriage' : 'child', { eventYear: done ? eventYear : null });
      const key = isMarriage ? 7 : 5;
      // Children: timing periods only — a horoscope is never used to score fertility (no meter, no promise points).
      const scored = Number.isFinite(chk.promise.score);
      if (scored) setMeter(chk.promise.score, isMarriage ? T('marriage', 'திருமணம்') : T('children', 'குழந்தைப் பேறு'));
      add('factors', houseLine(f, key, lang), planetLine(f, isMarriage && life.gender !== 'female' ? 'Venus' : 'Jupiter', lang), dasaLine(f, lang),
        scored
          ? L(`Traditional promise for ${isMarriage ? 'marriage' : 'children'} in this chart: ${chk.promise.level} (${chk.promise.score}/100 points).`, `இந்த ஜாதகத்தில் ${isMarriage ? 'திருமண' : 'குழந்தை'} யோகம் (பாரம்பரியப் புள்ளி): ${chk.promise.level === 'strong' ? 'வலுவானது' : chk.promise.level === 'good' ? 'நல்லது' : 'முயற்சி தேவை'} (${chk.promise.score}/100).`)
          : L('The chart is read here for supportive periods only; Thunai never judges fertility from a horoscope — your doctor guides health questions.', 'இங்கு ஜாதகம் சாதகமான காலங்களுக்காக மட்டுமே பார்க்கப்படுகிறது; துணை ஜாதகத்திலிருந்து கருவுறுதலை மதிப்பிடுவதில்லை — உடல்நலக் கேள்விகளுக்கு மருத்துவரே வழிகாட்டி.'),
        transitLines(f, lang, ['guru_balam', 'guru_weak']));
      if (f.dasa?.approx) add('uncertainty', L(`Your birth time is approximate, so these dates may shift by about ${f.dasa.shiftDays} days.`, `பிறந்த நேரம் தோராயமானது; எனவே தேதிகள் சுமார் ${f.dasa.shiftDays} நாட்கள் மாறலாம்.`));
      if (done && !askAgain) {
        // Already happened: check the chart against real life instead of predicting it again.
        add('interpretation', isMarriage
          ? L('Your profile says you are already married, so instead of predicting a marriage, here is how your chart matches your life.', 'உங்கள் சுயவிவரப்படி உங்களுக்குத் திருமணம் ஆகிவிட்டது; எனவே மீண்டும் கணிக்காமல், உங்கள் ஜாதகம் உங்கள் வாழ்க்கையுடன் எப்படிப் பொருந்துகிறது என்று பார்க்கிறோம்.')
          : L(`Your profile shows ${life.children} child${Number(life.children) > 1 ? 'ren' : ''}, so here is how your chart matches that, rather than a new prediction.`, `உங்கள் சுயவிவரப்படி உங்களுக்கு ${life.children} குழந்தை${Number(life.children) > 1 ? 'கள்' : ''} உள்ளனர்; எனவே புதிய கணிப்பு அல்ல, ஜாதகப் பொருத்தத்தைப் பார்க்கிறோம்.`));
        add('answer', chk.match?.hit
          ? L(`Yes — your ${isMarriage ? 'marriage' : 'first child'} in ${chk.match.year} matches the period your chart marks as supportive (${periodText(chk.match.hit, 'en')}).`, `ஆம் — ${chk.match.year}-ல் உங்கள் ${isMarriage ? 'திருமணம்' : 'முதல் குழந்தை'}, உங்கள் ஜாதகம் சாதகமாகக் காட்டும் காலத்துடன் (${periodText(chk.match.hit, 'ta')}) பொருந்துகிறது.`)
          : chk.match ? L(`Your ${isMarriage ? 'marriage' : 'first child'} in ${chk.match.year} is close to, but not inside, the strongest period by this method${chk.match.nearest ? ` (${periodText(chk.match.nearest, 'en')})` : ''}.`, `${chk.match.year}-ல் நடந்த உங்கள் ${isMarriage ? 'திருமணம்' : 'முதல் குழந்தைப் பிறப்பு'}, ஜாதகம் காட்டும் வலுவான காலத்திற்கு மிக அருகில் உள்ளது${chk.match.nearest ? ` (${periodText(chk.match.nearest, 'ta')})` : ''}.`)
            : L(`You are already ${isMarriage ? 'married' : 'a parent'}. Add the year in your profile and Thunai will show how your chart matches it.`, `உங்களுக்கு ஏற்கனவே ${isMarriage ? 'திருமணம் ஆகிவிட்டது' : 'குழந்தை உள்ளது'}. சுயவிவரத்தில் ஆண்டைச் சேர்த்தால் ஜாதகப் பொருத்தத்தைத் துணை காட்டும்.`));
        if (chk.match?.hit) add('interpretation', L(`✅ The year ${chk.match.year} falls within ${periodText(chk.match.hit, lang)} — a period your chart marks as supportive. Your chart and your life event agree, which also suggests your birth time is close to right.`, `✅ ${chk.match.year} ஆம் ஆண்டு, உங்கள் ஜாதகம் சாதகமாகக் காட்டும் ${periodText(chk.match.hit, lang)} காலத்திற்குள் வருகிறது. ஜாதகமும் வாழ்க்கை நிகழ்வும் ஒத்துப்போகின்றன; பிறந்த நேரமும் சரியாக இருப்பதைக் காட்டுகிறது.`));
        else if (chk.match) add('interpretation', L(`The year ${chk.match.year} is not inside the strongest periods by this method${chk.match.nearest ? `; the nearest is ${periodText(chk.match.nearest, lang)}` : ''}. Life events also depend on family decisions and other chart factors; tradition uses such differences to re-check the birth time.`, `இந்த முறைப்படி ${chk.match.year} ஆம் ஆண்டு வலுவான காலங்களுக்குள் இல்லை${chk.match.nearest ? `; அருகிலுள்ளது ${periodText(chk.match.nearest, lang)}` : ''}. வாழ்க்கை நிகழ்வுகள் குடும்ப முடிவுகள், பிற ஜாதகக் காரணிகளையும் சார்ந்தவை; இத்தகைய வேறுபாட்டைக் கொண்டு பிறந்த நேரத்தை மீண்டும் சரிபார்ப்பது மரபு.`));
        else {
          if (chk.past.length) add('interpretation', L(`Periods your chart marked as supportive in the past: ${chk.past.map((w) => periodText(w, lang)).join('; ')}.`, `கடந்த காலத்தில் உங்கள் ஜாதகம் சாதகமாகக் காட்டிய காலங்கள்: ${chk.past.map((w) => periodText(w, lang)).join('; ')}.`));
          add('next', L(`Add the ${isMarriage ? 'year of your marriage' : 'birth year of your first child'} in your profile — Thunai will then show whether your chart matches it.`, `உங்கள் சுயவிவரத்தில் ${isMarriage ? 'திருமண ஆண்டை' : 'முதல் குழந்தை பிறந்த ஆண்டை'} சேர்த்தால், ஜாதகம் பொருந்துகிறதா என்று துணை காட்டும்.`));
          actions.push({ go: 'family', param: { edit: life.memberId }, label: L('Add life details', 'வாழ்க்கை விவரம் சேர்') });
        }
        if (isMarriage) {
          const h = predictEvent(f.chart, 'harmony', { from: new Date(), years: 8 });
          if (h.windows.length) add('interpretation', L(`For married life ahead, tradition sees these periods as especially good for togetherness: ${h.windows.slice(0, 2).map((w) => periodText(w, lang)).join('; ')}.`, `இனி வரும் மண வாழ்க்கையில் ஒற்றுமைக்குச் சிறப்பான காலங்கள்: ${h.windows.slice(0, 2).map((w) => periodText(w, lang)).join('; ')}.`));
          actions.push({ go: 'couple', label: L('Married life analysis', 'மண வாழ்க்கை ஆய்வு') });
        } else {
          add('next', L('For your children, use Family → add their birth details to see their own charts, study periods and star birthdays.', 'உங்கள் குழந்தைகளுக்கு: குடும்பம் → அவர்களின் பிறப்பு விவரம் சேர்த்து, அவர்களின் ஜாதகம், கல்விக் காலம், நட்சத்திரப் பிறந்தநாளைப் பாருங்கள்.'));
          actions.push({ go: 'family', param: { add: true }, label: L('Add a child', 'குழந்தையைச் சேர்') });
        }
      } else {
        const fut = chk.future;
        add('answer', fut.length
          ? L(`The next supportive period for ${isMarriage ? 'marriage' : 'children'} in your chart is ${periodText(fut[0], 'en')}${fut[1] ? `; the one after is ${periodText(fut[1], 'en')}` : ''}.`, `உங்கள் ஜாதகப்படி ${isMarriage ? 'திருமணத்திற்கு' : 'குழந்தை பாக்கியத்திற்கு'} அடுத்த சாதகமான காலம்: ${periodText(fut[0], 'ta')}${fut[1] ? `; அதன் பின்: ${periodText(fut[1], 'ta')}` : ''}.`)
          : L('No strongly marked period in the next 12 years by this method — effort and the right meeting matter most.', 'இந்த முறைப்படி அடுத்த 12 ஆண்டுகளில் வலுவான காலம் இல்லை — முயற்சியும் சரியான சந்திப்புமே முக்கியம்.'));
        if (fut.length) add('interpretation', L(`Periods your chart marks as supportive in the coming years: ${fut.map((w) => periodText(w, lang)).join('; ')}.`, `வரும் ஆண்டுகளில் உங்கள் ஜாதகம் சாதகமாகக் காட்டும் காலங்கள்: ${fut.map((w) => periodText(w, lang)).join('; ')}.`));
        else add('interpretation', L('No strongly marked period appears in the next 12 years by this method. Effort and the right meeting matter more than any period.', 'இந்த முறைப்படி அடுத்த 12 ஆண்டுகளில் வலுவாகக் குறிக்கப்பட்ட காலம் இல்லை. எந்தக் காலத்தையும் விட முயற்சியும் சரியான சந்திப்பும் முக்கியம்.'));
        if (fut[0]?.reasons?.length) add('factors', ...fut[0].reasons.slice(0, 2).map((r) => (lang === 'ta' ? r.ta : r.en)));
        if (life.maritalStatus === undefined && isMarriage) add('next', L('Already married? Set it in your profile — Thunai will then check your chart against your marriage year instead of predicting.', 'ஏற்கனவே திருமணம் ஆகிவிட்டதா? சுயவிவரத்தில் குறிப்பிடுங்கள் — கணிப்புக்குப் பதிலாக உங்கள் திருமண ஆண்டுடன் ஜாதகத்தைச் சரிபார்க்கும்.'));
        add('next', isMarriage
          ? L('Use these periods for proposals and meetings, and decide on the person — compatibility is a family conversation, not a verdict.', 'இந்தக் காலங்களை வரன் பார்க்கவும் சந்திப்புகளுக்கும் பயன்படுத்துங்கள்; முடிவு அந்த நபரைப் பொறுத்தது — பொருத்தம் குடும்ப உரையாடல், தீர்ப்பு அல்ல.')
          : life.gender === 'female'
            ? L('Please also consult a gynaecologist; medical guidance is what helps here. Prayer can be a comfort alongside it.', 'மகப்பேறு மருத்துவரையும் அணுகுங்கள்; இங்கு உதவுவது மருத்துவ வழிகாட்டலே. அதனுடன் வழிபாடு ஆறுதலாக இருக்கும்.')
            : L('Please also consult a doctor — as a couple, together; medical guidance is what helps here. Prayer can be a comfort alongside it.', 'மருத்துவரையும் அணுகுங்கள் — தம்பதியராகச் சேர்ந்து; இங்கு உதவுவது மருத்துவ வழிகாட்டலே. அதனுடன் வழிபாடு ஆறுதலாக இருக்கும்.'));
        if (isMarriage) actions.push({ go: 'couple', label: L('Check a match', 'பொருத்தம் பார்') });
      }
      add('uncertainty', L('These are traditional timing indicators from dasa-bhukti and Jupiter–Saturn transits — not a guarantee of when it will happen.', 'இவை தசா-புக்தி, குரு–சனி கோசார அடிப்படையிலான பாரம்பரியக் கால அறிகுறிகள் — எப்போது நடக்கும் என்பதற்கு உத்தரவாதம் அல்ல.'), ref());
      add('practice', freePractice(isMarriage ? 'Venus' : 'Jupiter', lang));
      break;
    }
    case 'kuladeivam': {
      add('interpretation', L('A Kula Deivam is a family tradition passed down through generations. It cannot be established conclusively from a horoscope.', 'குலதெய்வம் தலைமுறைகளாகக் கடத்தப்படும் குடும்ப மரபு. ஜாதகத்திலிருந்து உறுதியாக நிர்ணயிக்க முடியாது.'));
      add('next', L('Ask the elders of your father’s family, the family’s native village, or the priest of your ancestral temple. Records of past family functions often name it.', 'தந்தை வழிப் பெரியோர், பூர்வீக ஊர், முன்னோர் கோவில் புரோகிதரிடம் கேளுங்கள். பழைய குடும்ப விழாப் பதிவுகளில் பெரும்பாலும் குறிப்பிடப்பட்டிருக்கும்.'));
      add('practice', L('Until then, praying to Ganapathi and to the deity your family already worships is entirely appropriate.', 'அதுவரை விநாயகரையும், உங்கள் குடும்பம் ஏற்கனவே வணங்கும் தெய்வத்தையும் வழிபடுவது முற்றிலும் பொருத்தமானது.'));
      break;
    }
    default: {
      // Life areas: career, finance, marriage, education, property, pregnancy, legal, visa, chart, general.
      let AREA = {
        career: { houses: [10, 6, 11], karaka: 'Saturn', en: 'work and career', ta: 'வேலை, தொழில்' },
        finance: { houses: [2, 11], karaka: 'Jupiter', en: 'money and savings', ta: 'பணம், சேமிப்பு' },
        marriage: { houses: [7, 2], karaka: 'Venus', en: 'marriage and partnership', ta: 'திருமணம், வாழ்க்கைத் துணை' },
        education: { houses: [4, 5], karaka: 'Mercury', en: 'studies', ta: 'கல்வி' },
        property: { houses: [4, 11], karaka: 'Mars', en: 'home and property', ta: 'வீடு, சொத்து' },
        pregnancy: { houses: [5], karaka: 'Jupiter', en: 'children', ta: 'குழந்தைப் பேறு' },
        legal: { houses: [6], karaka: 'Saturn', en: 'disputes', ta: 'வழக்கு, தகராறு' },
        visa: { houses: [9, 12], karaka: 'Rahu', en: 'travel abroad', ta: 'வெளிநாட்டுப் பயணம்' },
      }[intent];
      // Tradition: for a woman's chart the husband is read from Jupiter, for a man's chart the wife from Venus.
      if (AREA && intent === 'marriage' && life.gender === 'female') AREA = { ...AREA, karaka: 'Jupiter' };
      if (intent === 'greeting') {
        add('support', L(`Vanakkam${name ? `, ${name}` : ''}! Ask me about your current period, work, family dates, a temple journey, or today’s good times.`, `வணக்கம்${name ? `, ${name}` : ''}! உங்கள் நடப்புக் காலம், வேலை, குடும்ப நாட்கள், கோவில் பயணம், இன்றைய நல்ல நேரம் — எதைப் பற்றியும் கேளுங்கள்.`));
        break;
      }
      if (!f) { needChart(); if (!AREA) add('next', L('Meanwhile you can ask about today’s good times, festivals or temple journeys — those do not need a chart.', 'அதுவரை இன்றைய நல்ல நேரம், விழாக்கள், கோவில் பயணம் பற்றிக் கேட்கலாம் — அதற்கு ஜாதகம் தேவையில்லை.')); break; }
      if (AREA) {
        add('factors', ...AREA.houses.map((h) => houseLine(f, h, lang)), planetLine(f, AREA.karaka, lang), dasaLine(f, lang),
          transitLines(f, lang, intent === 'marriage' || intent === 'pregnancy' ? ['guru_balam', 'guru_weak'] : ['ezharai', 'ashtama', 'sani_good', 'guru_balam', 'guru_weak']));
        const main = f.houseInfo(AREA.houses[0]);
        const lordG = f.strength[main.lord];
        const linkedNow = f.dasa && (f.ruled(f.dasa.lord).some((h) => AREA.houses.includes(h)) || AREA.houses.includes(f.planetHouse(f.dasa.lord)));
        const karG = f.strength[AREA.karaka];
        const dasaG = f.dasa ? f.strength[f.dasa.lord] : null;
        setMeter(0.45 * lordG.score + 0.25 * (karG?.score ?? 50) + 0.2 * (dasaG?.score ?? 50) + (linkedNow ? 8 : 0)
          + transitAdj(f, intent === 'marriage' || intent === 'pregnancy' ? ['guru_balam', 'guru_weak'] : ['ezharai', 'ashtama', 'sani_good', 'guru_balam', 'guru_weak']), T(AREA.en, AREA.ta));
        // Verdict words follow the headline percentage so the score and the sentence always agree.
        const pv = meter.pct;
        const verdictEn = pv >= 75 ? 'very well supported' : pv >= 60 ? 'well supported' : pv >= 45 ? 'good with steady effort' : 'slow for now — it needs patience and steady effort';
        const verdictTa = pv >= 75 ? 'மிகுந்த ஆதரவுடன் உள்ளது' : pv >= 60 ? 'நல்ல ஆதரவுடன் உள்ளது' : pv >= 45 ? 'தொடர் முயற்சியால் நன்றாக இருக்கும்' : 'இப்போது மெதுவாக உள்ளது — பொறுமையும் தொடர் முயற்சியும் தேவை';
        add('answer', L(`Your ${AREA.en} is ${verdictEn}.${linkedNow ? ` Your current ${f.dasa.lord} dasa activates this area, so ${my(new Date(), 'en').split(' ')[1]}–${my(f.dasa.end, 'en').split(' ')[1]} is an active time for it.` : ' Your current dasa is focused on other areas, so progress here comes through steady effort.'}`, `உங்கள் ${AREA.ta} ${verdictTa}.${linkedNow ? ` நடப்பு ${pName(f.dasa.lord, 'ta')} தசை இந்தப் பகுதியைச் செயல்படுத்துகிறது; எனவே ${my(f.dasa.end, 'ta').split(' ')[1]} வரை இது செயலூக்கமான காலம்.` : ' நடப்பு தசை பிற பகுதிகளில் கவனம் செலுத்துகிறது; இங்கு தொடர் முயற்சியால் முன்னேற்றம் வரும்.'}`));
        add('interpretation', lordG.level === 'strong'
          ? L(`The ${ordEn(AREA.houses[0])} house lord ${main.lord} is strong — tradition reads this as good support for ${AREA.en}.`, `${AREA.houses[0]}-ம் வீட்டு அதிபதி ${pName(main.lord, 'ta')} பலமாக உள்ளார் — ${AREA.ta} ஆகியவற்றுக்கு நல்ல ஆதரவு என மரபு கூறுகிறது.`)
          : lordG.level === 'weak'
            ? L(`The ${ordEn(AREA.houses[0])} house lord ${main.lord} is weaker — tradition advises patience and steady effort in ${AREA.en}, not that success is denied.`, `${AREA.houses[0]}-ம் வீட்டு அதிபதி ${pName(main.lord, 'ta')} பலம் குறைவு — ${AREA.ta} ஆகியவற்றில் பொறுமையும் தொடர் முயற்சியும் தேவை என மரபு கூறுகிறது; வெற்றி மறுக்கப்படும் என்பதல்ல.`)
            : L(`The ${ordEn(AREA.houses[0])} house lord ${main.lord} is of middling strength — results in ${AREA.en} follow effort.`, `${AREA.houses[0]}-ம் வீட்டு அதிபதி ${pName(main.lord, 'ta')} மத்திம பலம் — ${AREA.ta} ஆகியவற்றில் உழைப்புக்கேற்ற பலன்.`));
        if (f.dasa) {
          const linked = f.ruled(f.dasa.lord).some((h) => AREA.houses.includes(h)) || AREA.houses.includes(f.planetHouse(f.dasa.lord));
          add('interpretation', linked
            ? L(`Your current ${f.dasa.lord} dasa is connected to these houses, so this theme is active now.`, `நடப்பு ${pName(f.dasa.lord, 'ta')} தசை இந்தப் பாவங்களுடன் தொடர்புடையது; எனவே இந்தக் கருப்பொருள் இப்போது செயல்படும்.`)
            : L(`Your current ${f.dasa.lord} dasa is not directly linked to these houses; tradition would look to its own themes: ${DASA_NATURE[f.dasa.lord].en.split(';')[0]}.`, `நடப்பு ${pName(f.dasa.lord, 'ta')} தசை இந்தப் பாவங்களுடன் நேரடித் தொடர்பில்லை; அதன் கருப்பொருள்: ${DASA_NATURE[f.dasa.lord].ta.split(';')[0]}.`));
        }
        add('uncertainty', L('Several factors can point in different directions; this is a traditional reading of tendencies, not a prediction of a specific outcome.', 'பல காரணிகள் வெவ்வேறு திசைகளைக் காட்டலாம்; இது போக்குகளின் பாரம்பரிய வாசிப்பு, குறிப்பிட்ட முடிவின் கணிப்பு அல்ல.'), ref());
        if (['marriage', 'pregnancy', 'legal', 'visa', 'finance'].includes(intent)) add('uncertainty', L('No horoscope can guarantee a marriage, pregnancy, visa, court result or financial gain.', 'திருமணம், கர்ப்பம், விசா, நீதிமன்ற முடிவு, நிதி லாபம் — எதற்கும் ஜாதகம் உத்தரவாதம் தர முடியாது.'));
        add('practice', freePractice(AREA.karaka, lang));
        const NEXT = {
          career: T('Write down what you want from work in the next 6 months and talk it through with a trusted senior or mentor. Update your skills and CV regardless of timing.', 'அடுத்த 6 மாதங்களில் வேலையில் நீங்கள் விரும்புவதை எழுதி, நம்பிக்கையான மூத்தவர் / வழிகாட்டியுடன் பேசுங்கள். நேரம் எதுவாயினும் திறன்களையும் சுயவிவரத்தையும் புதுப்பியுங்கள்.'),
          finance: T('Make a simple monthly budget and an emergency fund first. For investments or loans, consult a SEBI-registered adviser or your bank — not a horoscope.', 'முதலில் எளிய மாத பட்ஜெட்டும் அவசர நிதியும் அமையுங்கள். முதலீடு / கடனுக்கு SEBI-பதிவு பெற்ற ஆலோசகர் அல்லது வங்கியை அணுகுங்கள் — ஜாதகத்தை அல்ல.'),
          marriage: T('Compatibility is for a family conversation, not a verdict on anyone’s worth. Open “Detailed marriage matching” to review both charts together.', 'பொருத்தம் குடும்ப உரையாடலுக்கானது; யாருடைய மதிப்பின் மீதான தீர்ப்பு அல்ல. இருவரின் ஜாதகத்தையும் சேர்த்துப் பார்க்க “விரிவான திருமணப் பொருத்தம்” திறங்கள்.'),
          education: T('A regular study timetable and enough sleep matter most. Talk to a teacher about any subject that feels difficult.', 'சீரான படிப்பு அட்டவணையும் போதுமான உறக்கமும் மிக முக்கியம். கடினமான பாடம் பற்றி ஆசிரியரிடம் பேசுங்கள்.'),
          property: T('Check the documents with a lawyer and the budget with your bank first; then choose a date with the Muhurtham finder.', 'முதலில் ஆவணங்களை வழக்கறிஞரிடமும் பட்ஜெட்டை வங்கியிடமும் சரிபாருங்கள்; பின்னர் முகூர்த்தம் மூலம் நாள் தேர்வு.'),
          pregnancy: T('Please consult a gynaecologist; medical guidance is what helps here. Prayer can be a source of comfort alongside it.', 'மகப்பேறு மருத்துவரை அணுகுங்கள்; இங்கு உதவுவது மருத்துவ வழிகாட்டலே. அதனுடன் வழிபாடு ஆறுதலாக இருக்கும்.'),
          legal: T('Follow your lawyer’s advice on every step. Astrology can at most help choose a calm time for a meeting.', 'ஒவ்வொரு படியிலும் வழக்கறிஞரின் ஆலோசனையைப் பின்பற்றுங்கள். சந்திப்புக்கு அமைதியான நேரத்தைத் தேர்வு செய்ய மட்டுமே ஜோதிடம் உதவலாம்.'),
          visa: T('Check the official embassy or VFS website for requirements and timelines, and prepare documents carefully.', 'தேவைகள், கால அளவுக்கு அதிகாரப்பூர்வ தூதரக / VFS இணையதளத்தைப் பாருங்கள்; ஆவணங்களைக் கவனமாகத் தயாரியுங்கள்.'),
        }[intent];
        add('next', tr(NEXT));
        if (intent === 'marriage') actions.push({ go: 'couple', label: L('Detailed marriage matching', 'விரிவான திருமணப் பொருத்தம்') });
        if (intent === 'property') actions.push({ go: 'muhurtham', param: { category: 'property' }, label: L('Property muhurtham', 'சொத்து முகூர்த்தம்') });
        if (intent === 'career') actions.push({ go: 'roadmap', label: L('Life periods road map', 'வாழ்க்கைக் கால வரைபடம்') });
        break;
      }
      // Chart overview or an open question.
      const best = Object.values(f.strength).filter((g) => !['Rahu', 'Ketu'].includes(g.planet)).sort((a, b) => b.score - a.score)[0];
      if (intent !== 'general') add('answer', L(`Your strongest planet is ${best.planet} (${NAVAGRAHA[best.planet].governs.en.toLowerCase()}); ${f.weakest[0].planet} needs care.${f.dasa ? ` Now running: ${f.dasa.lord} dasa until ${my(f.dasa.end, 'en')}.` : ''}`, `உங்கள் பலமான கிரகம் ${pName(best.planet, 'ta')} (${NAVAGRAHA[best.planet].governs.ta}); ${pName(f.weakest[0].planet, 'ta')} கவனம் தேவை.${f.dasa ? ` இப்போது ${pName(f.dasa.lord, 'ta')} தசை (${my(f.dasa.end, 'ta')} வரை).` : ''}`));
      else add('answer', L('Please ask about one topic — for example work, marriage, money, health, a temple or a good date — and you will get a direct answer with the planet details.', 'ஒரு தலைப்பைப் பற்றிக் கேளுங்கள் — உதாரணமாக வேலை, திருமணம், பணம், ஆரோக்கியம், கோவில், நல்ல நாள் — கிரக விவரங்களுடன் நேரடிப் பதில் கிடைக்கும்.'));
      add('factors', dasaLine(f, lang), planetLine(f, best.planet, lang), ...f.weakest.slice(0, 1).map((g) => planetLine(f, g.planet, lang)), transitLines(f, lang));
      add('interpretation', L(`Strongest planet: ${best.planet}, traditionally supporting ${NAVAGRAHA[best.planet].governs.en.toLowerCase()}. Needs care: ${f.weakest[0].planet} (${NAVAGRAHA[f.weakest[0].planet].governs.en.toLowerCase()}).`, `பலமான கிரகம்: ${pName(best.planet, 'ta')} — ${NAVAGRAHA[best.planet].governs.ta} ஆகியவற்றுக்கு ஆதரவு. கவனம் தேவை: ${pName(f.weakest[0].planet, 'ta')} (${NAVAGRAHA[f.weakest[0].planet].governs.ta}).`),
        f.dasa && L(`Current theme (${f.dasa.lord} dasa): ${DASA_NATURE[f.dasa.lord].en}.`, `நடப்புக் கருப்பொருள் (${pName(f.dasa.lord, 'ta')} தசை): ${DASA_NATURE[f.dasa.lord].ta}.`));
      add('uncertainty', L('This is a general overview. Ask about one area (work, money, family, studies, a journey) for a focused answer.', 'இது பொதுவான கண்ணோட்டம். ஒரு பகுதியைப் பற்றி (வேலை, பணம், குடும்பம், கல்வி, பயணம்) கேட்டால் கவனமான பதில் கிடைக்கும்.'), ref());
      if (intent === 'general') add('next', L('I could not tell exactly what you are asking about. Try a short question such as “How is my career this year?” or “Which temple suits my current period?”', 'நீங்கள் எதைப் பற்றிக் கேட்கிறீர்கள் என்று சரியாகப் புரியவில்லை. “இந்த வருடம் என் தொழில் எப்படி?” அல்லது “என் நடப்புக் காலத்திற்கு எந்தக் கோவில்?” போன்ற சிறு கேள்வியாகக் கேளுங்கள்.'));
      add('practice', freePractice(f.weakest[0].planet, lang));
    }
  }

  if (age >= 60 && intent === 'career' && S.answer?.length) {
    add('interpretation', L(`At ${age}, tradition reads the 10th house for respect, advisory roles and the legacy you leave — more than for a new job.`, `${age} வயதில், 10-ம் வீடு மரியாதை, ஆலோசனைப் பங்கு, நீங்கள் விட்டுச் செல்லும் பெயர் ஆகியவற்றுக்காகப் பார்க்கப்படுகிறது — புதிய வேலைக்காக மட்டும் அல்ல.`));
  }
  // Straight answer first (fallback: the first support/interpretation line), then all planet details, fully visible.
  if (!S.answer?.length) { const src = ['support', 'interpretation', 'next'].find((k) => S[k]?.length); if (src) S.answer = [S[src].shift()]; }
  // Close with the deities of the person's running Dasa and Bhukti lords (not after a crisis or a medical alarm).
  if (f?.chart && !['crisis', 'death', 'pain'].includes(intent)) {
    if (life.faith && life.faith !== 'hindu') {
      // Other faiths: a blessing in their own faith and practices that suit every faith.
      const bl = faithBlessing(life.faith);
      if (bl) add('prayer', tr(bl));
      if (S.practice?.length) S.practice = [tr(universalPractice(f.weakest?.[0]?.planet || f.dasa?.lord))];
    } else {
      const pr = closingPrayer(f.chart, f.now ? new Date(f.now) : new Date());
      if (pr) add('prayer', `🙏 ${pr.lines.map((x) => tr(x)).join(' · ')}`);
    }
  }
  const order = ['question', 'answer', 'support', 'factors', 'interpretation', 'uncertainty', 'facts', 'practice', 'next', 'prayer'];
  const sections = order.filter((k) => S[k]?.length).map((k) => ({ key: k, title: tr(SECTION_TITLES[k]), lines: S[k] }));
  const text = sections.map((s) => `${s.title}:\n${s.lines.map((l) => `• ${l}`).join('\n')}`).join('\n\n');
  const textOut = meter ? text.replace(/^([^\n]*\n• )/m, `$1${meter.pct}% — ${meter.label}. `) : text;
  return { intent, lang, sections, actions, clarify, meter, text: textOut };
}
