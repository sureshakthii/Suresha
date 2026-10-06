// Marriage context, adult eligibility, consent ledger and the inclusive matching report (brief §27–§30).
//
// Principles enforced in code (not only in wording):
//  • Each participant chooses their own marriage mode; it is real-life context, never derived from planets,
//    and it never changes natal facts or any traditional factor result. No penalty for widowhood,
//    remarriage, gender, caste, religion or disability.
//  • Matching is for adults only. A minor gets a protective message, never a matching result.
//    Age 18 is a baseline only — jurisdiction-specific legal rules need legal review.
//  • Both adults must consent before a report is calculated for sharing, saved, shared or exported.
//    An uploaded chart or screenshot is not consent. A requester may run a private, ephemeral comparison
//    that is never saved or shared (consent model pending legal review).
//  • The 10 Tamil poruthams, the doshas and the optional 36-point Ashtakoota are shown as separate,
//    independent traditional factors. There is no averaged percentage and no marry/reject verdict.
//  • The report never computes spouse mortality, fertility, loyalty, violence, marriage count or divorce.
import { matchPorutham, doshams } from './porutham.js';
import { gunaMilan } from './ashtakoota.js';
import { assertNoProhibited } from './themes.js';
import { ageOn as ageOnDates } from './datetime.js';

const T = (en, ta) => ({ en, ta });

export const MARRIAGE_CONTEXT_VERSION = 'marriage-context-2026.10-v1';
export const ADULT_AGE_BASELINE = 18;

// ------------------------------------------------------------------------------------------ modes
export const MARRIAGE_MODES = {
  first: T('First marriage', 'முதல் திருமணம்'),
  remarriage_after_divorce: T('Remarriage after divorce', 'விவாகரத்துக்குப் பின் மறுமணம்'),
  widowed: T('Widowed and considering remarriage', 'வாழ்க்கைத் துணையை இழந்து மறுமணம் பரிசீலனை'),
  undisclosed: T('Other / prefer not to say', 'மற்றவை / சொல்ல விரும்பவில்லை'),
};

/**
 * Per-person marriage context. mode defaults to 'undisclosed'; historyPrivate hides it from any shared view.
 * Nothing here is derived from a chart and nothing here feeds a calculation.
 */
export function marriageContext({ mode = 'undisclosed', historyPrivate = false } = {}) {
  const m = MARRIAGE_MODES[mode] ? mode : 'undisclosed';
  return {
    mode: m,
    label: MARRIAGE_MODES[m],
    historyPrivate: !!historyPrivate,
    derivedFromChart: false,
    affectsTraditionalFactors: false,
    previousSpouseDetailsRequired: false,
  };
}

const isRemarriage = (ctx) => ctx.mode === 'remarriage_after_divorce' || ctx.mode === 'widowed';

// ------------------------------------------------------------------------------------------ eligibility
const ymd = (x) => (x instanceof Date ? (Number.isNaN(x.getTime()) ? null : x.toISOString().slice(0, 10)) : x ? String(x).slice(0, 10) : null);

/** Completed years on `now` for a birth date (Date | 'YYYY-MM-DD'), via datetime.ageOn; null if unknown. */
export function ageOn(birth, now = new Date()) {
  const b = ymd(birth), r = ymd(now);
  return b && r ? ageOnDates(b, r) : null;
}

export const PROTECTIVE_MESSAGE = T(
  'Marriage matching is only for adults, so we will not calculate a match here. If a young person is being pressured to marry, please talk to a trusted adult or call Childline 1098 (India).',
  'திருமணப் பொருத்தம் வயது வந்தவர்களுக்கு மட்டுமே; எனவே இங்கு பொருத்தம் கணிக்கப்படாது. ஒரு இளைஞர் திருமணத்திற்கு அழுத்தப்பட்டால், நம்பிக்கையான பெரியவரிடம் பேசுங்கள் அல்லது சைல்டுலைன் 1098 (இந்தியா) அழையுங்கள்.');

export const LEGAL_REVIEW_NOTE = T(
  'Age 18 is only our baseline. Legal marriage eligibility depends on the place of marriage and personal circumstances — please check local law or a lawyer. (Rules pending legal review.)',
  '18 வயது எங்கள் அடிப்படை வரம்பு மட்டுமே. சட்டப்படியான திருமணத் தகுதி, திருமணம் நடக்கும் இடம் மற்றும் தனிப்பட்ட சூழலைப் பொறுத்தது — உள்ளூர்ச் சட்டம் அல்லது வழக்கறிஞரிடம் சரிபார்க்கவும். (சட்ட மதிப்பாய்வு நிலுவையில்.)');

/**
 * Adult eligibility for every participant. participants: [{ id, birthDate?, chart?, adultConfirmed? }].
 * Returns status 'eligible-baseline' | 'minor-refused' | 'needs-clarification'.
 */
export function eligibility(participants, { now = new Date(), jurisdiction = null } = {}) {
  const perPerson = participants.map((p) => {
    const age = ageOn(p.birthDate || p.chart?.date || p.chart?.utc, now);
    const status = age == null ? (p.adultConfirmed ? 'adult-confirmed' : 'unknown') : age < ADULT_AGE_BASELINE ? 'minor' : 'adult';
    return { id: p.id, status };
  });
  const anyMinor = perPerson.some((x) => x.status === 'minor');
  const anyUnknown = perPerson.some((x) => x.status === 'unknown');
  const youngAdult = participants.some((p) => { const a = ageOn(p.birthDate || p.chart?.date || p.chart?.utc, now); return a != null && a < 21; });
  const status = anyMinor ? 'minor-refused' : anyUnknown ? 'needs-clarification' : 'eligible-baseline';
  return {
    status,
    perPerson,
    baselineAge: ADULT_AGE_BASELINE,
    jurisdictionWhenNeeded: youngAdult ? (jurisdiction || 'ask') : jurisdiction,
    message: anyMinor ? PROTECTIVE_MESSAGE
      : anyUnknown ? T('Please confirm that both people are adults before matching.', 'பொருத்தம் பார்க்கும் முன் இருவரும் வயது வந்தவர்கள் என்பதை உறுதிப்படுத்துங்கள்.')
        : null,
    legalReviewNote: LEGAL_REVIEW_NOTE,
  };
}

// ------------------------------------------------------------------------------------------ consent ledger
export const CONSENT_SCOPES = ['calculate', 'save', 'share', 'export'];
export const REPORT_AUDIENCES = ['self_private', 'both_participants', 'family_with_permission', 'astrologer_with_permission'];

/** A new, empty consent ledger for a pair. Ledgers are immutable values: helpers return a new ledger. */
export function createConsentLedger(pairId) {
  return { pairId, version: MARRIAGE_CONTEXT_VERSION, entries: [] };
}

/** Record one adult's own consent for scopes. An uploaded chart is never accepted as consent. */
export function recordConsent(ledger, { participantId, scopes = ['calculate'], at = new Date(), method = 'in-app-confirmation' }) {
  if (!participantId) throw new Error('participantId required');
  if (/upload|screenshot|chart/i.test(method)) throw new Error('An uploaded chart or screenshot is not evidence of consent');
  const valid = scopes.filter((s) => CONSENT_SCOPES.includes(s));
  return { ...ledger, entries: [...ledger.entries, { type: 'grant', participantId, scopes: valid, at: new Date(at).toISOString(), method }] };
}

/** Revoke consent (all scopes unless given). Later grants can restore it. */
export function revokeConsent(ledger, { participantId, scopes = CONSENT_SCOPES, at = new Date() }) {
  return { ...ledger, entries: [...ledger.entries, { type: 'revoke', participantId, scopes: [...scopes], at: new Date(at).toISOString() }] };
}

/** Active scopes for one participant after replaying the ledger in order. */
export function activeScopes(ledger, participantId) {
  const set = new Set();
  for (const e of ledger?.entries || []) {
    if (e.participantId !== participantId) continue;
    for (const s of e.scopes) (e.type === 'grant' ? set.add(s) : set.delete(s));
  }
  return [...set];
}

/** True when EVERY listed participant has the scope active. */
export function hasConsent(ledger, participantIds, scope) {
  return participantIds.every((id) => activeScopes(ledger, id).includes(scope));
}

// ------------------------------------------------------------------------------------------ factor text
const RESULT_LABEL = {
  uttamam: T('Agrees in this tradition', 'இந்த மரபில் பொருந்துகிறது'),
  madhyamam: T('Partly agrees in this tradition', 'இந்த மரபில் ஓரளவு பொருந்துகிறது'),
  poruthamillai: T('Does not agree in this tradition — worth discussing with your astrologer', 'இந்த மரபில் பொருந்தவில்லை — உங்கள் ஜோதிடருடன் கலந்துபேசலாம்'),
};

// Neutral calculation basis for each porutham; directional = counted from the bride-side star by tradition.
const FACTOR_BASIS = {
  dina: { directional: true, basis: T('Star count from the bride-side star (traditional table).', 'பெண் தரப்பு நட்சத்திரத்திலிருந்து எண்ணிக்கை (மரபு அட்டவணை).') },
  gana: { directional: false, basis: T('Gana group of each star (Deva / Manushya / Rakshasa) — a traditional temperament grouping, not a judgement of anyone.', 'ஒவ்வொரு நட்சத்திரத்தின் கணம் (தேவ / மனித / ராட்சச) — மரபுக் குழுப்பிரிவு மட்டுமே, யாரைப் பற்றிய தீர்ப்பும் அல்ல.') },
  mahendra: { directional: true, basis: T('Star count from the bride-side star (traditional table).', 'பெண் தரப்பு நட்சத்திரத்திலிருந்து எண்ணிக்கை (மரபு அட்டவணை).') },
  stree: { directional: true, basis: T('Star-distance factor counted from the bride-side star (traditional table).', 'பெண் தரப்பு நட்சத்திரத்திலிருந்து நட்சத்திர இடைவெளி (மரபு அட்டவணை).') },
  yoni: { directional: false, basis: T('Traditional animal symbol of each star.', 'ஒவ்வொரு நட்சத்திரத்தின் மரபு யோனி அடையாளம்.') },
  rasi: { directional: false, basis: T('Distance between the two Moon signs.', 'இரு சந்திர ராசிகளுக்கு இடையிலான தூரம்.') },
  athipathi: { directional: false, basis: T('Natural friendship of the two Moon-sign lords.', 'இரு ராசி அதிபதிகளின் இயற்கை நட்பு.') },
  vasya: { directional: false, basis: T('Traditional Vasya sign pairs.', 'மரபு வசிய ராசி இணைகள்.') },
  rajju: { directional: false, expert: true, basis: T('Rajju group of each star. An astrologer-prioritised traditional factor with exceptions in many schools — not a proven danger and not a universal prohibition.', 'ஒவ்வொரு நட்சத்திரத்தின் ரஜ்ஜு பிரிவு. பல மரபுகளில் விதிவிலக்குகள் உள்ள, ஜோதிடர் முன்னுரிமை தரும் மரபுக் காரணி — நிரூபிக்கப்பட்ட ஆபத்தோ, எல்லோருக்குமான தடையோ அல்ல.') },
  vedhai: { directional: false, expert: true, basis: T('Traditional Vedha star pairs. An astrologer-prioritised traditional factor — not a proven danger and not a universal prohibition.', 'மரபு வேதை நட்சத்திர இணைகள். ஜோதிடர் முன்னுரிமை தரும் மரபுக் காரணி — நிரூபிக்கப்பட்ட ஆபத்தோ, எல்லோருக்குமான தடையோ அல்ல.') },
};

const FACTOR_NAME = {
  dina: T('Dina', 'தினம்'), gana: T('Gana', 'கணம்'), mahendra: T('Mahendra', 'மகேந்திரம்'), stree: T('Stree Deergham', 'ஸ்திரீ தீர்க்கம்'),
  yoni: T('Yoni', 'யோனி'), rasi: T('Rasi', 'ராசி'), athipathi: T('Rasi Athipathi', 'ராசி அதிபதி'), vasya: T('Vasya', 'வசியம்'),
  rajju: T('Rajju', 'ரஜ்ஜு'), vedhai: T('Vedhai', 'வேதை'),
};

/** Documented asymmetric factors (they follow the tradition's bride-side counting convention). */
export const ASYMMETRIC_FACTORS = {
  porutham: Object.keys(FACTOR_BASIS).filter((k) => FACTOR_BASIS[k].directional),
  ashtakoota: ['varna', 'gana'],
};

const EXPERT_QUESTIONS = [
  T('Which tradition profile and exceptions should apply to Rajju and Vedhai for this pair?', 'இந்த இணைக்கு ரஜ்ஜு, வேதைக்கு எந்த மரபு, எந்த விதிவிலக்குகள் பொருந்தும்?'),
  T('Are both birth times reliable enough for Lagna-based Chevvai and Rahu–Ketu observations?', 'லக்னம் சார்ந்த செவ்வாய், ராகு–கேது கணிப்புக்கு இருவரின் பிறந்த நேரமும் போதுமான துல்லியமா?'),
  T('Which dosha samyam rules does your tradition use, and why?', 'உங்கள் மரபு எந்த தோஷ சாம்ய விதிகளைப் பயன்படுத்துகிறது, ஏன்?'),
];
const REMARRIAGE_EXPERT_Q = T('If your tradition treats remarriage differently, which houses and reference points does it use, and from which cited school?', 'உங்கள் மரபு மறுமணத்தை வேறுவிதமாகப் பார்க்கிறது என்றால், எந்த பாவங்கள், எந்தக் குறிப்புப் புள்ளிகள், எந்த ஆதாரபூர்வ பள்ளியிலிருந்து?');

const RECOMMENDATION = T('Discuss these factors and seek expert review if this tradition matters to you.',
  'இந்த மரபு உங்களுக்கு முக்கியமானதென்றால், இந்தக் காரணிகளைப் பற்றிக் கலந்துபேசி நிபுணர் மதிப்பாய்வைப் பெறுங்கள்.');

// ------------------------------------------------------------------------------------------ cards
const card = (cardId, icon, iconLabel, title, summary, prompts, extra = {}) => ({ cardId, icon, iconLabel, title, summary, prompts, ...extra });

function buildCards(factors) {
  const review = factors.filter((f) => f.expertReview && f.result !== 'uttamam').map((f) => f.name);
  return [
    card('traditional', '📜', T('Scroll icon: traditional matching', 'சுருள் அடையாளம்: மரபுப் பொருத்தம்'), T('Traditional Matching', 'மரபுப் பொருத்தம்'),
      review.length
        ? T(`Each factor is shown on its own. Factors to review with your astrologer: ${review.map((r) => r.en).join(', ')}.`, `ஒவ்வொரு காரணியும் தனித்தனியாகக் காட்டப்படுகிறது. ஜோதிடருடன் மதிப்பாய்வு செய்ய வேண்டியவை: ${review.map((r) => r.ta).join(', ')}.`)
        : T('Each factor is shown on its own, with how it was calculated.', 'ஒவ்வொரு காரணியும் கணக்கிட்ட விதத்துடன் தனித்தனியாகக் காட்டப்படுகிறது.'),
      [RECOMMENDATION], { factorIds: factors.map((f) => f.factorId), consent: 'pair' }),
    card('expectations', '💬', T('Speech bubble icon: relationship expectations', 'உரையாடல் அடையாளம்: உறவு எதிர்பார்ப்புகள்'), T('Relationship Expectations', 'உறவு எதிர்பார்ப்புகள்'),
      T('Optional prompts to talk through together — not a test and not a diagnosis.', 'சேர்ந்து பேச விருப்பத் தூண்டுகோல்கள் — இது தேர்வோ முடிவோ அல்ல.'),
      [T('How do each of you like to talk through disagreements?', 'கருத்து வேறுபாடுகளை நீங்கள் ஒவ்வொருவரும் எப்படிப் பேசித் தீர்க்க விரும்புகிறீர்கள்?'),
        T('What does consent and personal space mean to each of you?', 'ஒப்புதலும் தனிப்பட்ட இடமும் உங்கள் ஒவ்வொருவருக்கும் என்ன பொருள்?'),
        T('How will household roles be shared?', 'வீட்டுப் பொறுப்புகளை எப்படிப் பகிர்வீர்கள்?')],
      { optional: true, consent: 'separate', answersPrivateByDefault: true }),
    card('money', '💰', T('Coin icon: money and responsibilities', 'நாணய அடையாளம்: பணமும் பொறுப்புகளும்'), T('Money & Responsibilities', 'பணமும் பொறுப்புகளும்'),
      T('Optional prompts about money, work and caring for family.', 'பணம், வேலை, குடும்பப் பராமரிப்பு பற்றிய விருப்பத் தூண்டுகோல்கள்.'),
      [T('How will you handle savings, debts and big purchases?', 'சேமிப்பு, கடன், பெரிய செலவுகளை எப்படிக் கையாள்வீர்கள்?'),
        T('What are your work and location plans for the next few years?', 'அடுத்த சில ஆண்டுகளுக்கான வேலை, இருப்பிடத் திட்டங்கள் என்ன?'),
        T('Who may need care in your families, and how will you share it?', 'உங்கள் குடும்பங்களில் யாருக்குப் பராமரிப்பு தேவைப்படலாம், அதை எப்படிப் பகிர்வீர்கள்?')],
      { optional: true, consent: 'separate', answersPrivateByDefault: true }),
    card('family', '🏡', T('House icon: family and children', 'வீடு அடையாளம்: குடும்பமும் குழந்தைகளும்'), T('Family & Children', 'குடும்பமும் குழந்தைகளும்'),
      T('Optional prompts about family life and wishes about children — these are preferences to discuss, not predictions.', 'குடும்ப வாழ்க்கை, குழந்தைகள் பற்றிய விருப்பங்கள் — இவை பேச வேண்டிய விருப்பங்கள், கணிப்புகள் அல்ல.'),
      [T('Do you each want children, and if so, roughly when?', 'உங்கள் ஒவ்வொருவருக்கும் குழந்தைகள் வேண்டுமா, வேண்டுமெனில் எப்போது?'),
        T('Which religious practices and festivals matter to each of you?', 'எந்த வழிபாட்டு முறைகளும் பண்டிகைகளும் உங்கள் ஒவ்வொருவருக்கும் முக்கியம்?'),
        T('How involved will each family be in decisions?', 'முடிவுகளில் ஒவ்வொரு குடும்பமும் எவ்வளவு ஈடுபடும்?')],
      { optional: true, consent: 'separate', answersPrivateByDefault: true }),
    card('next_steps', '🗓️', T('Calendar icon: timing and next steps', 'நாள்காட்டி அடையாளம்: நேரமும் அடுத்த படிகளும்'), T('Timing & Next Steps', 'நேரமும் அடுத்த படிகளும்'),
      RECOMMENDATION,
      [T('Take the time you both need — there is no deadline from this report.', 'உங்கள் இருவருக்கும் தேவையான நேரத்தை எடுத்துக்கொள்ளுங்கள் — இந்த அறிக்கையிலிருந்து எந்தக் காலக்கெடுவும் இல்லை.'),
        T('If you wish, ask your family astrologer the expert questions listed in the detailed view.', 'விரும்பினால், விரிவான பார்வையில் உள்ள நிபுணர் கேள்விகளை உங்கள் குடும்ப ஜோதிடரிடம் கேளுங்கள்.'),
        T('A Muhurtham can be chosen later, around your real plans.', 'உங்கள் உண்மையான திட்டங்களுக்கு ஏற்ப முகூர்த்தத்தைப் பின்னர் தேர்வு செய்யலாம்.')],
      { consent: 'pair' }),
  ];
}

const REMARRIAGE_CARD = card('remarriage', '🌱', T('Sprout icon: remarriage discussion', 'தளிர் அடையாளம்: மறுமண உரையாடல்'), T('Remarriage — optional discussion', 'மறுமணம் — விருப்ப உரையாடல்'),
  T('Optional prompts only. Nothing here is required, and there is no fixed time after a divorce or a loss.', 'விருப்பத் தூண்டுகோல்கள் மட்டுமே. எதுவும் கட்டாயமில்லை; விவாகரத்து அல்லது இழப்புக்குப் பின் குறிப்பிட்ட கால வரம்பு எதுவும் இல்லை.'),
  [T('How ready does each of you feel right now?', 'இப்போது நீங்கள் ஒவ்வொருவரும் எவ்வளவு தயாராக உணர்கிறீர்கள்?'),
    T('If there are children, how will step-family life and co-parenting work?', 'குழந்தைகள் இருந்தால், புதிய குடும்ப வாழ்க்கையும் இணைப் பெற்றோர் பொறுப்பும் எப்படி அமையும்?'),
    T('What caregiving and financial responsibilities does each of you carry?', 'உங்கள் ஒவ்வொருவரின் பராமரிப்பு, நிதிப் பொறுப்புகள் என்ன?'),
    T('What boundaries with previous relationships feel right to both of you?', 'முந்தைய உறவுகளுடன் இருவருக்கும் ஏற்ற எல்லைகள் என்ன?'),
    T('Grief support is available if either of you would like it.', 'உங்களில் யாருக்காவது துயர ஆதரவு தேவைப்பட்டால் கிடைக்கும்.')],
  { optional: true, neverForced: true, consent: 'separate', answersPrivateByDefault: true });

// ------------------------------------------------------------------------------------------ report
const sideOf = (p) => ({
  star: p.star ?? p.chart?.janmaNakshatra?.index,
  rasi: p.rasi ?? p.chart?.janmaRasi?.index,
});

function doshaContext(p, certainty) {
  if (!p.chart?.planets) return { available: false };
  const d = doshams(p.chart.planets);
  const lagnaReliable = certainty === 'exact' && !!p.chart.planets.Lagna;
  return {
    available: true,
    status: 'needs-reviewed-predicates',
    chevvai: { placementNoted: d.chevvai.present, rawPlacement: d.chevvai.raw, exceptionsApplied: d.chevvai.exceptions, fromLagna: lagnaReliable ? d.chevvai.fromLagna : null, fromMoon: d.chevvai.fromMoon },
    rahuKetu: { placementNoted: lagnaReliable ? d.rahuKetu.present : null, rahuHouse: lagnaReliable ? d.rahuKetu.rahuHouse : null, ketuHouse: lagnaReliable ? d.rahuKetu.ketuHouse : null },
    lagnaReliable,
  };
}

function samyamNotes(da, db, names) {
  const out = [];
  for (const [key, label] of [['chevvai', T('Chevvai placement', 'செவ்வாய் நிலை')], ['rahuKetu', T('Rahu–Ketu placement', 'ராகு–கேது நிலை')]]) {
    const a = da.available ? da[key].placementNoted : null, b = db.available ? db[key].placementNoted : null;
    if (a == null || b == null) { out.push({ key, status: 'uncertain', ...T(`${label.en}: needs a reliable birth time for both.`, `${label.ta}: இருவருக்கும் துல்லியமான பிறந்த நேரம் தேவை.`) }); continue; }
    if (a && b) out.push({ key, status: 'both', ...T(`${label.en}: noted for both — many traditions call this samyam (balanced).`, `${label.ta}: இருவருக்கும் உள்ளது — பல மரபுகளில் இது சாம்யம்.`) });
    else if (a || b) out.push({ key, status: 'one', ...T(`${label.en}: noted for ${a ? names[0].en : names[1].en} only — traditions differ on exceptions; ask your astrologer.`, `${label.ta}: ${a ? names[0].ta : names[1].ta} அவர்களுக்கு மட்டும் — விதிவிலக்குகளில் மரபுகள் வேறுபடுகின்றன; ஜோதிடரிடம் கேளுங்கள்.`) });
    else out.push({ key, status: 'none', ...T(`${label.en}: not noted for either.`, `${label.ta}: இருவருக்கும் இல்லை.`) });
  }
  return out;
}

function refusal(reason, message, extra = {}) {
  return { status: 'refused', reason, message, traditionalFactorResults: [], cards: [], exportPermissions: { save: false, share: false, export: false, publicSearch: false }, ...extra };
}

/**
 * Inclusive Thirumana Porutham report.
 * bride, groom: { id, name?, chart? (birthChart output) | star+rasi, birthDate?, adultConfirmed?, birthTimeCertainty? }
 *   ('bride'/'groom' name only the tradition's counting side; any adults may be matched).
 * modes: { [participantId]: { mode, historyPrivate } }
 * consent: a consent ledger (createConsentLedger/recordConsent) OR { ephemeral: true, requesterId } for a private,
 *   unsaved comparison. Uploading a chart is never consent.
 * profile: { traditionProfileId, includeAshtakoota (default true) }
 * audience: one of REPORT_AUDIENCES (default 'self_private'). now, jurisdiction optional.
 */
export function buildMatchingReport({ bride, groom, modes = {}, consent = null, profile = {}, audience = 'self_private', now = new Date(), jurisdiction = null, pairId } = {}) {
  const people = [bride, groom];
  const ids = people.map((p, i) => p?.id || `p${i + 1}`);
  const traditionProfileId = profile.traditionProfileId || 'tamil-10-porutham-standard';
  const ruleVersions = { porutham: 'porutham.js@unversioned-pending-review', ashtakoota: 'ashtakoota.js@unversioned-pending-review', marriageContext: MARRIAGE_CONTEXT_VERSION };
  const id = pairId || consent?.pairId || ids.join('~');

  // 1. Eligibility — adults only.
  const elig = eligibility(people.map((p, i) => ({ ...p, id: ids[i] })), { now, jurisdiction });
  if (elig.status === 'minor-refused') return assertNoProhibited(refusal('minor', PROTECTIVE_MESSAGE, { pairId: id, eligibilityStatus: elig }));
  if (elig.status === 'needs-clarification') return assertNoProhibited(refusal('eligibility-unclear', elig.message, { pairId: id, eligibilityStatus: elig }));

  // 2. Consent — both adults, or a private ephemeral comparison. An uploaded chart is ignored as consent.
  const ephemeral = consent?.ephemeral === true && ids.includes(consent.requesterId);
  const ledger = consent?.entries ? consent : null;
  const bothCalculate = ledger ? hasConsent(ledger, ids, 'calculate') : false;
  if (!bothCalculate && !ephemeral) {
    return assertNoProhibited(refusal('consent-missing', T('Both adults need to give their own consent before a shared match is calculated. An uploaded chart or screenshot is not consent. You can run a private comparison that is not saved or shared.',
      'பகிரப்படும் பொருத்தம் கணிக்கப்படும் முன் இருவரும் தாங்களே ஒப்புதல் தர வேண்டும். பதிவேற்றிய ஜாதகமோ திரைப்பிடிப்போ ஒப்புதல் அல்ல. சேமிக்கப்படாத, பகிரப்படாத தனிப்பட்ட ஒப்பீட்டைச் செய்யலாம்.'), { pairId: id, eligibilityStatus: elig }));
  }
  const exportPermissions = {
    save: !ephemeral && hasConsent(ledger, ids, 'save'),
    share: !ephemeral && hasConsent(ledger, ids, 'share'),
    export: !ephemeral && hasConsent(ledger, ids, 'export'),
    publicSearch: false,
    retention: ephemeral ? 'none-ephemeral' : 'per-consent',
  };
  const requestedReportAudience = REPORT_AUDIENCES.includes(audience) ? audience : 'self_private';
  const effectiveAudience = requestedReportAudience !== 'self_private' && !exportPermissions.share ? 'self_private' : requestedReportAudience;

  // 3. Context per person (never feeds a calculation).
  const ctx = ids.map((pid) => marriageContext(modes[pid] || {}));
  const certainty = people.map((p) => p.birthTimeCertainty || p.chart?.timePrecision || 'exact');
  const names = people.map((p, i) => T(p.name || (i ? 'Person B' : 'Person A'), p.name || (i ? 'நபர் ஆ' : 'நபர் அ')));

  // 4. Traditional factors — 10 poruthams, each independent.
  const sa = sideOf(bride), sb = sideOf(groom);
  const por = matchPorutham(sa, sb);
  const traditionalFactorResults = por.rows.map((r) => ({
    factorId: r.key,
    tradition: traditionProfileId,
    name: FACTOR_NAME[r.key] || T(r.en, r.ta),
    result: r.status,
    resultLabel: RESULT_LABEL[r.status],
    calculationBasis: FACTOR_BASIS[r.key]?.basis || T('Traditional table.', 'மரபு அட்டவணை.'),
    calculationDetail: r.detail,
    directional: !!FACTOR_BASIS[r.key]?.directional,
    expertReview: !!FACTOR_BASIS[r.key]?.expert,
    exceptions: [],
    birthDataLimitation: certainty.some((c) => c !== 'exact')
      ? T('If either birth time is uncertain near a star boundary, this factor may change — confirm the star with your astrologer.', 'நட்சத்திர எல்லைக்கு அருகில் பிறந்த நேரம் உறுதியில்லையெனில் இந்தக் காரணி மாறலாம் — நட்சத்திரத்தை ஜோதிடருடன் உறுதிப்படுத்துங்கள்.')
      : null,
  }));

  // 5. Doshas — separate, symmetric, uncertainty-aware.
  const dA = doshaContext(bride, certainty[0]), dB = doshaContext(groom, certainty[1]);
  const doshaReview = { perPerson: { [ids[0]]: dA, [ids[1]]: dB }, samyam: samyamNotes(dA, dB, names), status: 'needs-reviewed-predicates' };

  // 6. Ashtakoota — its own tradition and total, never averaged with the poruthams.
  let ashtakoota = null;
  if (profile.includeAshtakoota !== false) {
    const g = gunaMilan(sa, sb);
    ashtakoota = {
      tradition: 'north-indian-ashtakoota-36',
      shownSeparately: true, averagedWithPorutham: false,
      total: g.total, max: g.max, rows: g.rows, cancellations: g.cancellations, doshas: g.doshas,
      asymmetricFactors: ASYMMETRIC_FACTORS.ashtakoota,
      note: T('A separate North-Indian method with its own points. It is not combined with the 10 poruthams.', 'தனி வட இந்திய முறை; அதன் சொந்தப் புள்ளிகள். 10 பொருத்தங்களுடன் இணைக்கப்படவில்லை.'),
    };
  }

  const uncertainty = [];
  if (certainty.some((c) => c !== 'exact')) uncertainty.push(T('One or both birth times are approximate or unknown: Lagna-based observations are withheld and star-based factors may change near boundaries.', 'ஒருவர் அல்லது இருவரின் பிறந்த நேரம் தோராயமானது / தெரியாதது: லக்னம் சார்ந்த கணிப்புகள் காட்டப்படவில்லை; நட்சத்திர எல்லையில் காரணிகள் மாறலாம்.'));
  uncertainty.push(T('Traditional factors describe a tradition\'s view; they are not evidence about how a marriage will turn out.', 'மரபுக் காரணிகள் ஒரு மரபின் பார்வையை விவரிக்கின்றன; திருமணம் எப்படி அமையும் என்பதற்கான சான்று அல்ல.'));

  const cards = buildCards(traditionalFactorResults);
  if (ctx.some(isRemarriage)) cards.push(REMARRIAGE_CARD);
  const expertReviewQuestions = [...EXPERT_QUESTIONS, ...(ctx.some(isRemarriage) ? [REMARRIAGE_EXPERT_Q] : [])];
  const optionalSharedDiscussionTopics = cards.filter((c) => c.optional).map((c) => ({ cardId: c.cardId, title: c.title, prompts: c.prompts }));

  const report = {
    status: 'ok',
    pairId: id,
    traditionProfileId,
    ruleVersions,
    participants: ids.map((pid, i) => ({
      id: pid,
      countingSide: i === 0 ? 'bride-side' : 'groom-side',
      marriageContext: ctx[i].historyPrivate && effectiveAudience !== 'self_private' ? { mode: 'private', historyPrivate: true } : ctx[i],
      birthInputCertainty: certainty[i],
    })),
    perPersonMarriageContext: Object.fromEntries(ids.map((pid, i) => [pid, ctx[i].historyPrivate && effectiveAudience !== 'self_private' ? { mode: 'private' } : { mode: ctx[i].mode }])),
    eligibilityStatus: elig,
    jurisdictionWhenNeeded: elig.jurisdictionWhenNeeded,
    consentScope: ephemeral ? { mode: 'ephemeral-private', requesterId: consent.requesterId } : { mode: 'ledger', scopes: Object.fromEntries(ids.map((pid) => [pid, activeScopes(ledger, pid)])) },
    requestedReportAudience,
    effectiveAudience,
    traditionalFactorResults,
    doshaReview,
    ashtakoota,
    calculationEvidence: {
      [ids[0]]: { starIndex: sa.star, rasiIndex: sa.rasi, star: por.girl.star, rasi: por.girl.rasi },
      [ids[1]]: { starIndex: sb.star, rasiIndex: sb.rasi, star: por.boy.star, rasi: por.boy.rasi },
      asymmetricFactors: ASYMMETRIC_FACTORS,
      method: T('Moon star and Moon sign from each confirmed birth chart; standard Tamil 10-porutham tables.', 'உறுதிப்படுத்திய ஜாதகத்திலிருந்து சந்திர நட்சத்திரம், ராசி; நிலையான 10 பொருத்த அட்டவணைகள்.'),
    },
    uncertainty,
    cards,
    optionalSharedDiscussionTopics,
    expertReviewQuestions,
    exportPermissions,
    summary: {
      short: T('Here is how each traditional factor looks for you two. No single number decides a marriage — talk it through together.', 'ஒவ்வொரு மரபுக் காரணியும் உங்கள் இருவருக்கும் எப்படி உள்ளது என்பது இதோ. எந்த ஒரு எண்ணும் திருமணத்தைத் தீர்மானிப்பதில்லை — சேர்ந்து பேசுங்கள்.'),
      recommendation: RECOMMENDATION,
    },
    noOverallScore: true,
    noVerdict: true,
    legalReviewNote: LEGAL_REVIEW_NOTE,
  };
  return assertNoProhibited(report);
}
