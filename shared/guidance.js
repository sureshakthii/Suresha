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

export { RULES_VERSION } from './version.js';

const T = (en, ta) => ({ en, ta });
const isTamilText = (s) => /[஀-௿]/.test(s || '');
/** Answer in the language the question was written in (English question in Tamil mode → English). */
export const answerLang = (question, appLang) => (isTamilText(question) ? 'ta' : /[a-z]{3,}/i.test(question || '') ? 'en' : appLang);

// ---------------------------------------------------------------- intents
const RULES = [
  ['crisis', /suicid|kill myself|end my life|want to die|no reason to live|self.?harm|தற்கொலை|சாக வேண்டும்|உயிரை மாய்|வாழ விருப்பமில்லை|சாகணும்/i],
  ['death', /when will i die|death date|lifespan|how long will i live|longevity|ஆயுள் எவ்வளவு|எப்போது இறப்|மரணம் எப்போது|சாவு எப்போது|ஆயுட்காலம்/i],
  ['pain', /\bpain\b|hurt(s|ing)?\b|வலி|வேதனை/i],
  ['emotional', /worr|anxi|stress|tension|sad|depress|lonely|afraid|fear|upset|confus|கவலை|பயம்|மன அழுத்த|மனக்குழப்ப|டென்ஷன்|வருத்த|தனிமை|மனம் சரியில்லை|நிம்மதி/i],
  ['health', /health|ill|sick|disease|fever|cancer|sugar|diabet|bp\b|pressure|surgery|operation|hospital|doctor|medicine|ஆரோக்கிய|நோய்|உடல்நல|காய்ச்சல்|சர்க்கரை|மருத்துவ|அறுவை|ஆஸ்பத்திரி|மருந்து/i],
  ['temple', /temple|pilgrim|yatra|kovil|koil|darshan|leave.*visit|trip|tour|கோவில்|கோயில்|யாத்திரை|தரிசன|சுற்றுலா|பயணம்.*கோ|விடுப்பு/i],
  ['dates', /housewarming|griha|graha pravesam|muhurt|auspicious date|good date|wedding date|which date|naming ceremony|கிரகப்பிரவேச|முகூர்த்த|நல்ல நாள்|தேதி தேர்வு|சுப நாள்|புதுமனை/i],
  ['vehicle', /\bcar\b|bike|vehicle|scooter|registration|number plate|\bcolou?r\b|கார்|வாகன|பைக்|ஸ்கூட்டர்|நிறம்|பதிவு எண்/i],
  ['dasa', /dasa|dasha|bhukti|bukthi|antar|mahadasha|current period|my period|தசை|தசா|புக்தி|நடப்பு காலம்|தற்போதைய காலம்/i],
  ['weak', /weak planet|which planet|planet.*weak|remed|parigar|pariharam|dosh|பலவீன|பரிகார|எந்த கிரகம்|தோஷ/i],
  ['kuladeivam', /kula ?deiv|family deity|kuladeivam|குலதெய்வ|குல தெய்வ/i],
  ['marriage', /marri|wedding|spouse|husband|wife|match|alliance|love|திருமண|கல்யாண|வரன்|மனைவி|கணவர்|காதல்|பொருத்த/i],
  ['pregnancy', /pregnan|baby|child birth|conceive|santhana|குழந்தை பாக்கிய|கர்ப்ப|சந்தான/i],
  ['legal', /court|case|legal|lawyer|dispute|police|வழக்கு|கோர்ட்|நீதிமன்ற|வக்கீல்|தகராறு/i],
  ['visa', /visa|abroad|foreign|onsite|overseas|immigra|வெளிநாடு|விசா|அயல்நாடு/i],
  ['finance', /money|finance|loan|debt|saving|invest|wealth|stock|share market|salary|income|பணம்|கடன்|சேமிப்பு|முதலீடு|செல்வ|வருமான|சம்பள|பொருளாதார/i],
  ['career', /career|job|work|office|promotion|business|boss|interview|profession|தொழில்|வேலை|அலுவலக|பதவி உயர்வு|வியாபார|நேர்காணல்|உத்தியோக/i],
  ['education', /exam|study|studies|education|college|school|result|கல்வி|தேர்வு|படிப்பு|கல்லூரி|பள்ளி/i],
  ['property', /house|home|land|property|flat|plot|வீடு|நிலம்|சொத்து|மனை|பிளாட்/i],
  ['goodtime', /good time|nalla neram|auspicious time|rahu ?kal|today.*time|time today|நல்ல நேரம்|ராகு காலம்|இன்று.*நேரம்|எந்த நேரம்/i],
  ['chart', /my chart|horoscope|jathagam|strength|overview|read my|ஜாதக|பலம்|சவால்/i],
  ['greeting', /^(hi|hello|hey|vanakkam|வணக்கம்|நமஸ்காரம்)\b/i],
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
  if (intent === 'temple' && all.includes('dates') && !/temple|கோவில்|கோயில்/i.test(q)) intent = 'dates';
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
  const cur = dasaOk ? chart.dasa.current : null;
  const bh = dasaOk ? chart.dasa.currentBhukti : null;
  const ruled = (k) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((h) => lordOf(from, h) === k);
  let transit = null;
  try { transit = transitStatus(chart, now); } catch { /* transit needs the ephemeris; skip if unavailable */ }
  return {
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
    dasa: cur && { lord: cur.lord, start: iso(cur.start), end: iso(cur.end), approx: rel?.dasa === false, shiftDays: rel?.dasaShiftDays },
    bhukti: bh && { lord: bh.lord, start: iso(bh.start), end: iso(bh.end) },
    nextDasa: dasaOk ? chart.dasa.periods.find((p) => p.start > now) : null,
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
  factors: T('Relevant chart factors', 'தொடர்புடைய ஜாதகக் காரணிகள்'),
  interpretation: T('Traditional interpretation', 'பாரம்பரிய விளக்கம்'),
  uncertainty: T('Uncertainty & conflicting factors', 'உறுதியின்மை & முரண்படும் காரணிகள்'),
  practice: T('Optional spiritual practice', 'விருப்ப ஆன்மீக வழிபாடு'),
  next: T('Practical next step', 'நடைமுறை அடுத்த படி'),
  facts: T('Factual information', 'உண்மைத் தகவல்'),
  support: T('Support', 'உதவி'),
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

/**
 * Build the answer.
 * @param {object} p { question, lang, facts (chartFacts or null), name, today: { rahuKalam, yamagandam, goodTimes:[], horai } }
 * @returns {{ intent, lang, sections:[{key,title,lines}], actions:[{go,param,label}], clarify?:{options}, text }}
 */
export function composeAnswer({ question, lang: appLang = 'ta', facts: f = null, name = '', today = null }) {
  const lang = answerLang(question, appLang);
  const tr = (o) => (lang === 'ta' ? o.ta : o.en);
  const L = (en, ta) => (lang === 'ta' ? ta : en);
  const { intent } = classify(question);
  const S = {};
  const add = (key, ...lines) => { (S[key] ||= []).push(...lines.flat().filter(Boolean)); };
  const actions = [];
  let clarify = null;
  add('question', String(question).trim());

  const needChart = () => {
    add('factors', L('No birth details are saved yet, so I cannot read your chart.', 'பிறப்பு விவரங்கள் சேமிக்கப்படாததால் உங்கள் ஜாதகத்தைப் பார்க்க முடியவில்லை.'));
    actions.push({ go: 'family', param: { add: true }, label: L('Add birth details', 'பிறப்பு விவரம் சேர்') });
  };
  const ref = () => f && referenceNote(f, lang);

  switch (intent) {
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
      add('question', L('When you say “pain”, what do you mean? Choose one so I can help in the right way:', '“வலி” என்று சொல்லும்போது எதைக் குறிக்கிறீர்கள்? சரியாக உதவ ஒன்றைத் தேர்வு செய்யுங்கள்:'));
      add('support', L('If the pain is physical and severe, sudden, or with chest pain or breathlessness, please seek medical care now (emergency: 112).', 'உடல் வலி கடுமையாக, திடீரென, அல்லது நெஞ்சு வலி / மூச்சுத் திணறலுடன் இருந்தால் உடனே மருத்துவ உதவி பெறுங்கள் (அவசரம்: 112).'));
      break;
    }
    case 'health': {
      add('interpretation', L('I do not diagnose illness or predict disease from a horoscope, and astrology cannot set a medical check-up schedule.', 'ஜாதகத்திலிருந்து நோயைக் கண்டறிவதோ கணிப்பதோ இல்லை; மருத்துவப் பரிசோதனை அட்டவணையையும் ஜோதிடம் தீர்மானிக்க முடியாது.'));
      add('next', L('Please speak to a doctor about the symptoms — that is the reliable path. If it is urgent, call 112.', 'அறிகுறிகள் பற்றி மருத்துவரிடம் பேசுங்கள் — அதுவே நம்பகமான வழி. அவசரம் என்றால் 112.'),
        L('General wellness (not from your chart): regular sleep, water, a short daily walk, and keeping prescribed medicines on time.', 'பொது நலவாழ்வு (ஜாதகத்திலிருந்து அல்ல): சீரான உறக்கம், தண்ணீர், தினசரி சிறு நடை, பரிந்துரைத்த மருந்துகளை நேரத்தில் எடுத்தல்.'));
      add('practice', L('Optional, for peace of mind: a prayer at Vaitheeswaran Kovil or at home to Dhanvantari — as comfort, never instead of treatment.', 'விருப்பம், மன அமைதிக்கு: வைத்தீஸ்வரன் கோவில் அல்லது வீட்டில் தன்வந்திரி வழிபாடு — ஆறுதலாக மட்டும், சிகிச்சைக்கு மாற்றாக அல்ல.'));
      break;
    }
    case 'emotional': {
      add('support', L(`I hear you${name ? `, ${name}` : ''}. Feeling worried is understandable, and it is good that you are looking at it calmly.`, `புரிகிறது${name ? `, ${name}` : ''}. கவலைப்படுவது இயல்பு; அமைதியாக இதைப் பார்க்க முயல்வது நல்லது.`));
      if (f) {
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
        add('interpretation', ...lords.map((k) => L(`Tradition associates ${k} with ${NAVAGRAHA[k].deity.en}; its Navagraha sthalam is ${NAVAGRAHA[k].temple.en}.`, `${pName(k, 'ta')} — ${NAVAGRAHA[k].deity.ta} வழிபாட்டுடன் பாரம்பரியமாக இணைக்கப்படுகிறது; நவகிரகத் தலம்: ${NAVAGRAHA[k].temple.ta}.`)));
      } else needChart();
      add('uncertainty', L('Worship associations differ between families and traditions; your Kula Deivam and family custom come first.', 'வழிபாட்டு மரபுகள் குடும்பத்திற்குக் குடும்பம் வேறுபடும்; உங்கள் குலதெய்வமும் குடும்ப வழக்கமும் முதன்மை.'));
      add('facts', L('Opening hours, travel time and costs change. The journey planner labels each detail as verified or estimated, with its source and date.', 'திறப்பு நேரம், பயண நேரம், செலவு மாறும். பயணத் திட்டத்தில் ஒவ்வொரு விவரமும் சரிபார்க்கப்பட்டதா / மதிப்பீடா என ஆதாரம், தேதியுடன் காட்டப்படும்.'));
      add('next', L('Open My Spiritual Journey: enter your dates, starting city and budget, and you will get three options — nearby, matching your leave, and a local worship option.', 'என் ஆன்மீகப் பயணம் திறந்து, தேதிகள், புறப்படும் ஊர், பட்ஜெட் உள்ளிடுங்கள் — அருகில், விடுப்புக்கு ஏற்ப, உள்ளூர் வழிபாடு என மூன்று வழிகள் கிடைக்கும்.'));
      actions.push({ go: 'journey', param: { question }, label: L('Plan my journey', 'என் பயணம் திட்டமிடு') });
      break;
    }
    case 'dates': {
      add('interpretation', L('Tradition chooses dates using the panchangam (tithi, star, weekday), avoids Rahu Kalam, Yamagandam, Ashtami, Navami and Amavasai, and checks each family member’s Tara Bala and Chandrashtamam.', 'பஞ்சாங்கம் (திதி, நட்சத்திரம், கிழமை) அடிப்படையில் நாள் தேர்வு; ராகு காலம், எமகண்டம், அஷ்டமி, நவமி, அமாவாசை தவிர்ப்பு; ஒவ்வொரு குடும்ப உறுப்பினரின் தாரா பலம், சந்திராஷ்டமம் சரிபார்ப்பு — இதுவே மரபு.'));
      if (f?.transit) add('factors', transitLines(f, lang, ['guru_balam', 'guru_weak']));
      add('uncertainty', L('Different family astrologers may prefer slightly different rules (for example about Aadi, Purattasi or Margazhi months). Confirm the final date with your family priest.', 'குடும்ப ஜோதிடர்கள் சிறிது வேறுபட்ட விதிகளை விரும்பலாம் (எ.கா. ஆடி, புரட்டாசி, மார்கழி). இறுதி நாளைக் குடும்பப் புரோகிதரிடம் உறுதி செய்யுங்கள்.'));
      add('practice', L('Optional: begin with a Ganapathi prayer and a lamp in the new home.', 'விருப்பம்: புதிய வீட்டில் விநாயகர் வழிபாடு, தீபத்துடன் தொடங்குங்கள்.'));
      add('next', L('Open the Muhurtham finder with all family members selected — it lists dates that suit everyone.', 'அனைத்துக் குடும்ப உறுப்பினர்களையும் தேர்வு செய்து முகூர்த்தம் தேடலைத் திறங்கள் — அனைவருக்கும் ஏற்ற நாட்கள் பட்டியலிடப்படும்.'));
      actions.push({ go: 'muhurtham', param: { category: /house|griha|graha|கிரக|புதுமனை|வீடு/i.test(question) ? 'graha_pravesam' : /wedding|marri|திருமண|கல்யாண/i.test(question) ? 'marriage' : 'graha_pravesam', allFamily: true }, label: L('Find dates for the family', 'குடும்பத்திற்கு நாள் தேடு') });
      break;
    }
    case 'goodtime': {
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
    case 'kuladeivam': {
      add('interpretation', L('A Kula Deivam is a family tradition passed down through generations. It cannot be established conclusively from a horoscope.', 'குலதெய்வம் தலைமுறைகளாகக் கடத்தப்படும் குடும்ப மரபு. ஜாதகத்திலிருந்து உறுதியாக நிர்ணயிக்க முடியாது.'));
      add('next', L('Ask the elders of your father’s family, the family’s native village, or the priest of your ancestral temple. Records of past family functions often name it.', 'தந்தை வழிப் பெரியோர், பூர்வீக ஊர், முன்னோர் கோவில் புரோகிதரிடம் கேளுங்கள். பழைய குடும்ப விழாப் பதிவுகளில் பெரும்பாலும் குறிப்பிடப்பட்டிருக்கும்.'));
      add('practice', L('Until then, praying to Ganapathi and to the deity your family already worships is entirely appropriate.', 'அதுவரை விநாயகரையும், உங்கள் குடும்பம் ஏற்கனவே வணங்கும் தெய்வத்தையும் வழிபடுவது முற்றிலும் பொருத்தமானது.'));
      break;
    }
    default: {
      // Life areas: career, finance, marriage, education, property, pregnancy, legal, visa, chart, general.
      const AREA = {
        career: { houses: [10, 6, 11], karaka: 'Saturn', en: 'work and career', ta: 'வேலை, தொழில்' },
        finance: { houses: [2, 11], karaka: 'Jupiter', en: 'money and savings', ta: 'பணம், சேமிப்பு' },
        marriage: { houses: [7, 2], karaka: 'Venus', en: 'marriage and partnership', ta: 'திருமணம், வாழ்க்கைத் துணை' },
        education: { houses: [4, 5], karaka: 'Mercury', en: 'studies', ta: 'கல்வி' },
        property: { houses: [4, 11], karaka: 'Mars', en: 'home and property', ta: 'வீடு, சொத்து' },
        pregnancy: { houses: [5], karaka: 'Jupiter', en: 'children', ta: 'குழந்தைப் பேறு' },
        legal: { houses: [6], karaka: 'Saturn', en: 'disputes', ta: 'வழக்கு, தகராறு' },
        visa: { houses: [9, 12], karaka: 'Rahu', en: 'travel abroad', ta: 'வெளிநாட்டுப் பயணம்' },
      }[intent];
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
      add('factors', dasaLine(f, lang), planetLine(f, best.planet, lang), ...f.weakest.slice(0, 1).map((g) => planetLine(f, g.planet, lang)), transitLines(f, lang));
      add('interpretation', L(`Strongest planet: ${best.planet}, traditionally supporting ${NAVAGRAHA[best.planet].governs.en.toLowerCase()}. Needs care: ${f.weakest[0].planet} (${NAVAGRAHA[f.weakest[0].planet].governs.en.toLowerCase()}).`, `பலமான கிரகம்: ${pName(best.planet, 'ta')} — ${NAVAGRAHA[best.planet].governs.ta} ஆகியவற்றுக்கு ஆதரவு. கவனம் தேவை: ${pName(f.weakest[0].planet, 'ta')} (${NAVAGRAHA[f.weakest[0].planet].governs.ta}).`),
        f.dasa && L(`Current theme (${f.dasa.lord} dasa): ${DASA_NATURE[f.dasa.lord].en}.`, `நடப்புக் கருப்பொருள் (${pName(f.dasa.lord, 'ta')} தசை): ${DASA_NATURE[f.dasa.lord].ta}.`));
      add('uncertainty', L('This is a general overview. Ask about one area (work, money, family, studies, a journey) for a focused answer.', 'இது பொதுவான கண்ணோட்டம். ஒரு பகுதியைப் பற்றி (வேலை, பணம், குடும்பம், கல்வி, பயணம்) கேட்டால் கவனமான பதில் கிடைக்கும்.'), ref());
      if (intent === 'general') add('next', L('I could not tell exactly what you are asking about. Try a short question such as “How is my career this year?” or “Which temple suits my current period?”', 'நீங்கள் எதைப் பற்றிக் கேட்கிறீர்கள் என்று சரியாகப் புரியவில்லை. “இந்த வருடம் என் தொழில் எப்படி?” அல்லது “என் நடப்புக் காலத்திற்கு எந்தக் கோவில்?” போன்ற சிறு கேள்வியாகக் கேளுங்கள்.'));
      add('practice', freePractice(f.weakest[0].planet, lang));
    }
  }

  const order = ['question', 'support', 'factors', 'interpretation', 'uncertainty', 'facts', 'practice', 'next'];
  const sections = order.filter((k) => S[k]?.length).map((k) => ({ key: k, title: tr(SECTION_TITLES[k]), lines: S[k] }));
  const text = sections.map((s) => `${s.title}:\n${s.lines.map((l) => `• ${l}`).join('\n')}`).join('\n\n');
  return { intent, lang, sections, actions, clarify, text };
}
