// Answer validator (Brief §6, §22 steps 8–9, §23): the model must return the JSON answer contract
//   { text, claims:[{ text, evidenceIds:[...] }], uncertainty, nextSteps:[...], optionalPractice, humanReview }
// Every chart claim must cite permitted evidence ids; prohibited output classes are blocked with English,
// Tamil and Tanglish checks. If anything fails, the caller shows a reviewed fallback — NEVER the draft.
// A validator is not a guarantee; false negatives must be reviewed using the evaluation corpus.

export const VALIDATOR_VERSION = 'validator-1.0.0';

export const ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    claims: {
      type: 'array',
      items: {
        type: 'object',
        properties: { text: { type: 'string' }, evidenceIds: { type: 'array', items: { type: 'string' } } },
        required: ['text', 'evidenceIds'],
        additionalProperties: false,
      },
    },
    uncertainty: { type: 'string' },
    nextSteps: { type: 'array', items: { type: 'string' } },
    optionalPractice: { type: 'string' },
    humanReview: { type: 'boolean' },
  },
  required: ['text', 'claims', 'uncertainty', 'nextSteps', 'optionalPractice', 'humanReview'],
  additionalProperties: false,
};

const S = '[^.!?\\n।]'; // "same sentence" character class
const re = (src, flags = 'iu') => new RegExp(src.replaceAll('§', S), flags);

// Negation near a match means the sentence is a refusal/caution, not a prediction.
const NEG_BEFORE = /\b(not|never|cannot|can'?t|don'?t|do not|does not|doesn'?t|no one|nobody|won'?t|isn'?t|aren'?t|without|whether|avoid|instead of|rather than|no need to worry|unable to|refuse|neither|nor)\b[^.!?\n]*$/i;
const NEG_AFTER_TA = /^[^.!?\n]{0,60}(முடியாது|இயலாது|இல்லை|வேண்டாம்|கூடாது|மாட்டேன்|மாட்டார்|அல்ல|சொல்வதில்லை|கணிப்பதில்லை|கூற முடியாது|என்று அர்த்தமில்லை|தேவையில்லை)/u;
const NEG_AFTER_EN = /^[^.!?\n]{0,25}\b(is not|isn't|cannot be|can't be|is never)\b/i;

const MONTH = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*';
const DATE = `(\\d{1,2}(st|nd|rd|th)?\\s+${MONTH}|${MONTH}\\s+\\d{1,4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|(19|20)\\d{2})`;

export const PROHIBITED_PATTERNS = {
  death_lifespan_prediction: [
    re('\\b(you|he|she|they|your \\w+|the native|the person)\\b§{0,30}\\b(will|shall|is going to|are going to|may|might)\\b§{0,15}\\b(die|pass away|perish|lose (his|her|your) life)\\b'),
    re('\\b(life ?span|longevity|ayul|aayul|ayush)\\b§{0,30}\\d{1,3}'),
    re('\\b(die|death|pass away|passing)\\b§{0,25}\\b(at|by|in|before|around)\\b§{0,10}\\b(age )?\\d{1,4}\\b'),
    re('\\blive (until|till|up ?to|to) (the )?(age (of )?)?\\d{1,3}\\b'),
    re('\\bmaraka\\w*'),
    re('ஆயுள்§{0,20}\\d'),
    re('(மரணம்|இறப்பு|சாவு|உயிரிழப்பு)§{0,25}(நிகழும்|ஏற்படும்|வரும்|நேரும்|சம்பவிக்கும்)'),
    re('(இறந்து ?விடுவா|இறப்பா(ர்|ள்|ன்)|சாவா(ர்|ள்|ன்)|மரணமடைவா)'),
    re('\\d{1,3}\\s*வயது வரை (வாழ்|உயிர்)'),
    re('மாரக (தசை|காலம்)'),
    re('\\b(saavu|maranam) (varum|nadakkum)\\b'),
  ],
  disease_prediction: [
    re('\\b(you|he|she|they|your \\w+)\\b§{0,20}\\b(will|shall|is going to|are going to|is likely to|are likely to)\\b§{0,20}\\b(get|develop|suffer|have|contract)\\b§{0,25}\\b(cancer|diabetes|disease|illness|heart attack|stroke|tumou?r|paralysis|infertil\\w*|kidney failure|dementia)\\b'),
    re('\\b(infertile|cannot (have|conceive) (children|a child)|no children (are|is) (promised|indicated)|childless)\\b'),
    re('(நோய்|புற்றுநோய்|சர்க்கரை நோய்|மாரடைப்பு)§{0,20}(வரும்|ஏற்படும்|தாக்கும்)'),
    re('(குழந்தை பாக்கியம் இல்லை|மலட்டு|குழந்தை பிறக்காது)'),
  ],
  accusation: [
    re('\\b(she|he|they|your (wife|husband|partner|spouse|girlfriend|boyfriend|fiancee?|lover|relative|friend|in-laws?)|this (woman|man|person|widow))\\b§{0,25}\\b(will|is|are|would|is going to|may)\\b§{0,15}\\b(cheat\\w*|betray\\w*|deceive\\w*|unfaithful|having an affair|steal\\w*|take your money|loot|kill|trap you|ruin you)\\b'),
    re('\\b(a|one|some) (woman|women|man|men|lady|relative)\\b§{0,20}\\b(will|may)\\b§{0,15}\\b(cheat|deceive|take (away )?your money|betray|trap)\\b'),
    re('\\b(widow|divorcee)\\b§{0,40}\\b(bad luck|unlucky|ominous|kill|death)\\b'),
    re('(ஏமாற்றுவா(ர்|ள்|ன்)|துரோகம் செய்வா(ர்|ள்|ன்)|பணத்தை எடுத்து ?விடுவா(ர்|ள்|ன்))'),
    re('பெண்களிடம் ஜாக்கிரதை'),
    re('கள்ளக் ?காதல் (உண்டு|ஏற்படும்|இருக்கும்)'),
    re('ஒரு பெண் வந்து'),
    re('\\b(cheat pannuva|emathuva)\\w*'),
  ],
  adult_minor_facilitation: [
    re('\\b(1[0-7]|[1-9])[- ]?(year|yr)s?[- ]?old\\b§{0,60}\\b(meet|date|marry|approach|win|propose|muhurtham|favou?rable|compatible|kiss|sex)\\w*'),
    re('\\b(meet|date|marry|approach|win|propose|favou?rable|compatible|kiss)\\w*§{0,60}\\b(1[0-7]|[1-9])[- ]?(year|yr)s?[- ]?old\\b'),
    re('\\b(minor|underage|schoolgirl|schoolboy)\\b§{0,40}\\b(meet|date|marry|approach|propose|favou?rable|compatible)\\w*'),
    re('(1[0-7]|[1-9])\\s*(வயது|vayasu)§{0,30}(சந்திக்க|திருமணம் செய்ய|காதலிக்க|kalyanam|meet)'),
  ],
  emergency_delay: [
    re('\\b(postpone|delay|defer|wait|put off|reschedule|hold off|skip|avoid going)\\w*\\b§{0,50}\\b(surgery|operation|hospital|doctor|treatment|admission|court|hearing|payment|emi|deadline|contract|medicine|ambulance|appointment|filing)'),
    re('\\b(surgery|operation|hospital|treatment|court|hearing|payment|emi|admission)\\b§{0,50}\\b(after|until|till)\\b§{0,25}\\b(rahu|yamagandam|kalam|better time|good time|auspicious|next week|bhukti|dasa)'),
    re('(அறுவை|மருத்துவமனை|சிகிச்சை|நீதிமன்ற|விசாரணை|கட்டண|EMI|ஒப்பந்த)§{0,40}(தள்ளி ?(வை|போடு|ப்போடு|வையுங்கள்)|ஒத்தி ?வை|காத்திரு)'),
    re('ராகு காலம் முடிந்த ?(பின்|பிறகு)§{0,30}(மருத்துவ|அறுவை|மருத்துவமனை)'),
  ],
  private_profile_leak: [
    re('\\b(her|his|their) (chats?|messages?|whatsapp|dms?|texts?)\\b§{0,20}\\b(say|show|reveal|mention|indicate)'),
    /[\w.+-]+@[\w-]+\.[\w.]+/,
  ],
  paid_remedy_as_protection: [
    re('\\b(must|have to|need to|should|necessary|essential|compulsory|only way|required)\\b§{0,40}\\b(buy|purchase|pay|book|wear|order)\\b§{0,40}\\b(gem\\w*|stone|ring|yantra|homam|homa|pooja|puja|ritual|remedy|parihar\\w*|kavach\\w*|talisman|amulet|rudraksh\\w*)'),
    re('\\b(gem\\w*|stone|ring|yantra|homam|pooja|puja|ritual|kavach\\w*|talisman|amulet)\\b§{0,40}\\b(will (protect|save|shield|guarantee)|guarantees?|ensures? (your )?(safety|success)|is the only)\\b'),
    re('\\b(costly|expensive|paid|premium)\\b§{0,15}\\b(remedy|pooja|puja|homam|ritual|parihar\\w*)'),
    re('(ரத்தினம்|ராசிக்கல்|யந்திரம்|ஹோமம்|பூஜை|பரிகாரம்)§{0,30}(கட்டாயம்|அவசியம்|செய்தே ஆக வேண்டும்|வாங்க வேண்டும்|காப்பாற்றும்|பாதுகாக்கும்)'),
  ],
  probability_of_betrayal_or_accident: [
    re('\\d{1,3}(\\.\\d+)?\\s?(%|percent|per cent)§{0,60}\\b(cheat\\w*|betray\\w*|affair|accident|death|die|divorce|fraud|disease|illness|cancer|danger)'),
    re('\\b(cheat\\w*|betray\\w*|affair|accident|death|die|divorce|fraud|disease|illness|cancer|danger)\\b§{0,60}\\d{1,3}(\\.\\d+)?\\s?(%|percent|per cent)'),
    re('\\b(probability|odds|likelihood|risk level|danger level|chance)\\b§{0,25}\\b(betray\\w*|cheat\\w*|affair|accident|death|dying|divorce|fraud|illness)\\b'),
    re('(சதவீத|%)§{0,30}(விபத்து|ஏமாற்|மரண|நோய்|விவாகரத்து)'),
  ],
  accident_date: [
    re('\\b(accident|crash|mishap|injury)\\b§{0,40}\\b(will (happen|occur)|is going to|on|around|between|is likely|is expected|is indicated)\\b'),
    re('\\b(will|may|could|are likely to) (have|meet with|face|suffer) (an? )?(accident|crash|injury)\\b'),
    re('விபத்து§{0,25}(நடக்கும்|ஏற்படும்|நேரும்|கண்டம்|வாய்ப்பு அதிகம்)'),
  ],
  guaranteed_outcome: [
    re('\\b(guarantee[sd]?|guaranteed|certainly will|definitely will|will definitely|will certainly|100 ?%|sure to|assured|will surely|surely will|without (any )?doubt|for sure|destined to)\\b'),
    re('(நிச்சயம்|உறுதியாக (நடக்கும்|கிடைக்கும்|வெற்றி)|கண்டிப்பாக (நடக்கும்|கிடைக்கும்)|உத்தரவாதம்)'),
  ],
  dated_event_promise: [
    re(`\\b(you will|you'll|you are going to|will)\\b§{0,30}\\b(get|receive|find|land|marry|be married|get married|meet|have|start|win|be promoted|get promoted|arrive|come)\\b§{0,30}\\b(on|by|before|in|during|around)\\b\\s*(the )?${DATE}`),
    re('\\b(job|marriage|wedding|child|baby|promotion|visa|house|money|wealth)\\b§{0,20}\\bwill (arrive|come|happen)\\b§{0,15}\\b(on|by|in)\\b'),
    re('(வேலை|திருமணம்|கல்யாணம்|குழந்தை|பதவி உயர்வு|விசா)§{0,30}(\\d{1,2}|\\d{4})§{0,25}(கிடைக்கும்|நடக்கும்|வரும்)'),
    re('(\\d{1,2}|\\d{4})§{0,25}(வேலை|திருமணம்|கல்யாணம்|குழந்தை|பதவி உயர்வு|விசா)§{0,15}(கிடைக்கும்|நடக்கும்|வரும்)'),
  ],
  unsafe_permission: [
    re('\\b(safe|okay|ok|fine|good time|allowed) to (drive (after|while) drinking|drink and drive|skip (your |the )?(medicine|medication|helmet|seat ?belt|treatment)|stop (your |the )?(medicine|medication|treatment)|take (big )?risks?|gamble|invest all)\\b'),
    re('\\bno need (for|of|to wear|to use) (a )?(helmet|seat ?belt|doctor|medicine)\\b'),
    re('\\b(you are|you\'re|you will be) (fully )?(protected|safe) (from|against) (accidents?|harm|danger|all risks)\\b'),
    re('\\b(nothing (bad )?will happen to you|you can\'t be harmed|you are invincible)\\b'),
    re('(ஹெல்மெட்|சீட் பெல்ட்|மருந்து)§{0,20}(தேவையில்லை|வேண்டியதில்லை)'),
    re('ஆபத்து எடுக்கலாம்'),
  ],
  // Minor-specific classes (added by the policy for minor / unknown-age speakers)
  romantic_forecast: [
    re('\\b(love|romance|relationship|marriage|marry|wedding|crush|soulmate)\\b§{0,40}\\b(will (come|happen|succeed|blossom|bloom|arrive)|is (favou?red|indicated|likely|promised)|good time|favou?rable|auspicious)\\b'),
    re('(காதல்|திருமண|கல்யாண)§{0,30}(கைகூடும்|நடக்கும்|வெற்றி|சாதகம்|நல்ல நேரம்)'),
  ],
  sexual_content: [re('\\b(sex|sexual|intercourse|intimacy|intimate)\\b'), re('(உடலுறவு|பாலுறவு|தாம்பத்திய)')],
  marriage_scheduling: [
    re('\\b(marriage|wedding|muhurtham)\\b§{0,30}\\b(date|year|muhurtham|age|month)\\b'),
    re('(திருமண|கல்யாண)§{0,25}(தேதி|வயது|ஆண்டு|முகூர்த்த|மாதம்)'),
  ],
  frightening_dosha: [
    re('\\b(dosha|dosham|curse|cursed|kandam|danger period|evil eye)\\b§{0,30}\\b(danger|harm|suffer|terrible|severe|death|destroy)\\w*'),
    re('(தோஷம்|சாபம்|கண்டம்)§{0,30}(ஆபத்து|கடுமை|அழிவு|துன்பம்)'),
  ],
  adult_relationship_coaching: [],
};

// Words that indicate a chart claim (must be backed by a cited claim).
const PLANETS = { Sun: ['sun', 'surya', 'சூரியன்', 'சூரிய'], Moon: ['moon', 'chandra', 'சந்திரன்', 'சந்திர'], Mars: ['mars', 'sevvai', 'chevvai', 'செவ்வாய்'], Mercury: ['mercury', 'budha', 'புதன்'], Jupiter: ['jupiter', 'guru', 'குரு', 'வியாழன்'], Venus: ['venus', 'sukra', 'சுக்கிரன்'], Saturn: ['saturn', 'sani', 'shani', 'சனி'], Rahu: ['rahu', 'ராகு'], Ketu: ['ketu', 'கேது'] };
const CHART_TERMS = re(`\\b(${Object.values(PLANETS).flat().filter((w) => /^[a-z]+$/.test(w)).join('|')}|dasa|dasha|bhukti|lagna|ascendant|house|bhava|nakshatra|rasi|yoga|horai|tithi)\\b|(${Object.values(PLANETS).flat().filter((w) => !/^[a-z]+$/.test(w)).join('|')}|தசை|புக்தி|லக்னம்|லக்ன|பாவம்|நட்சத்திர|ராசி|யோகம்|ஓரை|திதி)`);
// Calendar timing words (e.g. "Rahu Kalam") are not natal claims.
const CALENDAR_ONLY = re('\\b(rahu ?kalam|yamagandam|ராகு ?காலம்|எமகண்டம்)\\b');

const NEG_INSIDE = /\b(not|never|cannot|can'?t|won'?t|don'?t|doesn'?t|no one|nobody)\b|n't\b/i;
function negated(text, index, length) {
  if (NEG_INSIDE.test(text.slice(index, index + length))) return true;
  const before = text.slice(Math.max(0, index - 70), index);
  const after = text.slice(index + length, index + length + 70);
  return NEG_BEFORE.test(before) || NEG_AFTER_TA.test(after) || NEG_AFTER_EN.test(after);
}

/** Scan text for prohibited classes. Returns [{ class, sample }]. */
export function scanProhibited(text, classes = Object.keys(PROHIBITED_PATTERNS), { privateValues = [], deadline = false } = {}) {
  const hits = [];
  const s = String(text || '');
  for (const cls of classes) {
    for (const p of PROHIBITED_PATTERNS[cls] || []) {
      const g = new RegExp(p.source, p.flags.includes('g') ? p.flags : `${p.flags}g`);
      let m;
      while ((m = g.exec(s))) {
        if (m[0].length === 0) { g.lastIndex++; continue; }
        if (cls !== 'private_profile_leak' && cls !== 'sexual_content' && negated(s, m.index, m[0].length)) continue;
        hits.push({ class: cls, sample: m[0].slice(0, 60) });
        break;
      }
    }
  }
  if (deadline) {
    const m = re('\\b(wait|better time is coming|start then|postpone|delay)\\b|(காத்திருங்கள்|தள்ளிப் ?போடுங்கள்|சிறந்த நேரம் விரைவில்)').exec(s);
    if (m && !negated(s, m.index, m[0].length)) hits.push({ class: 'emergency_delay', sample: m[0] });
  }
  for (const v of privateValues) {
    if (typeof v === 'string' && v.length >= 4 && s.toLowerCase().includes(v.toLowerCase())) hits.push({ class: 'private_profile_leak', sample: '[private value]' });
  }
  return hits;
}

/** Parse the model's raw output into the answer object (tolerates ```json fences). Throws on failure. */
export function parseModelAnswer(raw) {
  if (raw && typeof raw === 'object') return raw;
  const s = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no_json');
  return JSON.parse(s.slice(start, end + 1));
}

const planetsIn = (text) => Object.entries(PLANETS).filter(([, ws]) => ws.some((w) => (/^[a-z]+$/.test(w) ? new RegExp(`\\b${w}\\b`, 'i').test(text) : text.includes(w)))).map(([k]) => k);
const housesIn = (text) => [...String(text).matchAll(/\b(?:house\s*(\d{1,2})|(\d{1,2})(?:st|nd|rd|th)\s+house)\b/gi)].map((m) => Number(m[1] || m[2]));

/**
 * Validate a parsed answer against the decision and evidence.
 * Returns { ok, status: 'valid'|'invalid', errors: [...], answer }.
 */
export function validateAnswer(answer, { decision, evidence, privateValues = [] } = {}) {
  const errors = [];
  const a = answer && typeof answer === 'object' ? answer : null;
  if (!a) return { ok: false, status: 'invalid', errors: ['schema:not_object'], answer: null };
  if (typeof a.text !== 'string' || !a.text.trim()) errors.push('schema:text');
  if (typeof a.text === 'string' && a.text.length > 4000) errors.push('schema:text_too_long');
  if (!Array.isArray(a.claims)) errors.push('schema:claims');
  if (a.nextSteps !== undefined && !(Array.isArray(a.nextSteps) && a.nextSteps.every((x) => typeof x === 'string'))) errors.push('schema:nextSteps');
  if (a.uncertainty !== undefined && typeof a.uncertainty !== 'string') errors.push('schema:uncertainty');
  if (a.optionalPractice !== undefined && typeof a.optionalPractice !== 'string') errors.push('schema:optionalPractice');
  if (errors.length) return { ok: false, status: 'invalid', errors, answer: null };

  const permitted = new Set(decision?.permittedEvidenceIds?.length ? decision.permittedEvidenceIds : evidence?.ids || []);
  const factText = new Map((evidence?.facts || []).map((f) => [f.id, f.text]));
  const claims = a.claims;
  if (claims.length && decision && !decision.allowAstrology) errors.push('claims:astrology_not_allowed');
  for (const [i, c] of claims.entries()) {
    if (!c || typeof c.text !== 'string' || !Array.isArray(c.evidenceIds) || !c.evidenceIds.length) { errors.push(`claims:${i}:no_evidence`); continue; }
    const bad = c.evidenceIds.filter((id) => !permitted.has(id));
    if (bad.length) { errors.push(`claims:${i}:unknown_evidence`); continue; }
    const cited = c.evidenceIds.map((id) => factText.get(id) || '').join(' \n ');
    const citedPlanets = new Set(planetsIn(cited));
    if (planetsIn(c.text).some((p) => !citedPlanets.has(p))) errors.push(`claims:${i}:planet_not_in_evidence`);
    const citedHouses = new Set(housesIn(cited));
    if (housesIn(c.text).some((h) => !citedHouses.has(h))) errors.push(`claims:${i}:house_not_in_evidence`);
  }
  // Chart talk in the visible text needs at least one cited claim.
  const visible = [a.text, ...(a.nextSteps || []), a.optionalPractice || '', a.uncertainty || ''].join('\n');
  const chartTalk = CHART_TERMS.test(visible.replace(new RegExp(CALENDAR_ONLY.source, 'giu'), ''));
  if (chartTalk && !claims.length) errors.push('claims:uncited_chart_claim');
  if (claims.length && !(a.uncertainty || '').trim()) errors.push('elements:uncertainty_missing');

  const classes = decision?.prohibitedOutputs?.length ? decision.prohibitedOutputs : Object.keys(PROHIBITED_PATTERNS);
  const hits = scanProhibited([visible, ...claims.map((c) => c.text)].join('\n'), classes, { privateValues, deadline: Boolean(decision?.deadline) });
  for (const h of hits) errors.push(`prohibited:${h.class}`);
  return { ok: errors.length === 0, status: errors.length ? 'invalid' : 'valid', errors: [...new Set(errors)], answer: errors.length ? null : a };
}

/** The visible text for a validated answer. */
export function composeAnswer(a, lang = 'en', { textOnly = false } = {}) {
  const ta = lang === 'ta';
  const parts = [a.text.trim()];
  // textOnly: the answer style already writes next steps / practice into "text"; the other fields stay as data.
  if (textOnly) return parts[0];
  if (a.nextSteps?.length) parts.push(`${ta ? 'அடுத்த படிகள்:' : 'Next steps:'}\n${a.nextSteps.map((x) => `• ${x}`).join('\n')}`);
  if (a.uncertainty?.trim()) parts.push(`ℹ️ ${a.uncertainty.trim()}`);
  if (a.optionalPractice?.trim()) parts.push(`🪔 ${a.optionalPractice.trim()}`);
  if (a.humanReview) parts.push(ta ? '🙏 விரும்பினால், இதை ஒரு அனுபவமிக்க ஜோதிடரிடம் சரிபார்த்துக்கொள்ளலாம்.' : '🙏 If you wish, you can ask an experienced astrologer to review this.');
  return parts.join('\n\n');
}
