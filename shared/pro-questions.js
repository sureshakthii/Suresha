// "Related questions" after an Ask Thunai answer, and the Thunai Pro (Personal plan) unlock preview.
// Pure — no DOM; shared by the app and the tests.
//
// Conversion rules (docs/PRO-CONVERSION.md, docs/DETERMINISTIC-PREDICTION-STANDARD.md):
//   • Value, not fear: a related question promises a deeper, more useful EXPLANATION — never certainty, protection,
//     a cure, a guaranteed outcome or "before it is too late".
//   • Personal: the preview shows facts already worked out from the person's own chart (true, not invented).
//   • Honest price: the per-day figure and the yearly saving are computed from the real plan prices.
//   • No false urgency, no countdowns, no invented social proof, no confirm-shaming ("Not now" is a plain button).
//   • High-risk topics (health, money, loans, court, a missing person, crisis) and every child / teen profile get
//     NO upsell at all — those answers stay free, practical and point to qualified professionals.

const T = (en, ta) => ({ en, ta });
export const PRO_VERSION = 'pro-related-1.0.0';

/** Risk level of an Ask Thunai topic (Deterministic-Prediction Safety Standard, "High-risk answer routing"). */
export const RISK_LEVEL = Object.freeze({
  low: ['festival', 'general_kb', 'hymn', 'mantra', 'ithihasa', 'timings', 'temple', 'kuladeivam', 'muhurtham', 'naming', 'vehicle', 'smalltalk', 'identity'],
  medium: ['marriage', 'second_marriage', 'job', 'job_change', 'career', 'business', 'education', 'property', 'travel', 'family', 'harmony', 'dosham', 'sani', 'remedy', 'luck', 'child'],
  high: ['health', 'money', 'loan', 'court', 'lost', 'crisis', 'death', 'pain', 'baby_sex', 'abuse', 'policy', 'age_guard', 'emotional'],
});
/** 'low' | 'medium' | 'high' for a topic id (unknown topics count as medium: uncertainty line + practical checklist). */
export function riskLevel(topic) {
  if (RISK_LEVEL.high.includes(topic)) return 'high';
  if (RISK_LEVEL.low.includes(topic)) return 'low';
  return 'medium';
}

// Each related question: the question (en / ta) and what the complete answer covers (shown, locked, on the Pro page).
const Q = (id, q, covers) => ({ id, q, covers });
const RELATED = {
  marriage: [
    Q('marriage_periods', T('Which periods in the next 3 years are traditionally more supportive for marriage planning?', 'அடுத்த 3 ஆண்டுகளில் திருமணத் திட்டமிடலுக்குப் பாரம்பரியமாக ஆதரவான காலங்கள் எவை?'),
      [T('Dasa–bhukti periods and Guru transit, month by month, with the chart reason for each', 'ஒவ்வொரு மாதத்திற்கும் தசா–புக்தி, குரு பெயர்ச்சி — ஜாதகக் காரணத்துடன்'), T('7th house, its lord and Venus — what tradition reads in your chart', '7-ஆம் வீடு, அதன் அதிபதி, சுக்கிரன் — உங்கள் ஜாதகத்தில் பாரம்பரிய விளக்கம்'), T('A practical planning checklist: consent, values, health, finances, family', 'நடைமுறைச் சரிபார்ப்புப் பட்டியல்: சம்மதம், மதிப்புகள், உடல்நலம், நிதி, குடும்பம்')]),
    Q('marriage_partner', T('What qualities does my chart traditionally associate with a compatible life partner?', 'பொருந்தும் வாழ்க்கைத் துணைக்கு என் ஜாதகம் பாரம்பரியமாகக் காட்டும் குணங்கள் எவை?'),
      [T('Nature of the 7th house and Navamsa (D9), in plain words', '7-ஆம் வீடு, நவாம்சம் (D9) — எளிய சொற்களில்'), T('Which porutham checks matter most for your star', 'உங்கள் நட்சத்திரத்திற்கு முக்கியமான பொருத்தங்கள்'), T('Questions to discuss together before deciding', 'முடிவுக்கு முன் சேர்ந்து பேச வேண்டிய கேள்விகள்')]),
    Q('marriage_delay', T('Why does my chart traditionally show waiting, and what can I do meanwhile?', 'என் ஜாதகத்தில் காத்திருப்பு ஏன் தெரிகிறது? அதுவரை என்ன செய்யலாம்?'),
      [T('The factors tradition links with delay — and what they do NOT mean', 'தாமதத்துடன் இணைக்கப்படும் காரணிகள் — அவை எதைக் குறிக்காது என்பதும்'), T('Free, voluntary prayers and temple visits first', 'இலவச, விருப்பமான வழிபாடுகள், கோவில் தரிசனம் முதலில்'), T('Practical steps that widen good alliances', 'நல்ல வரன்களை அதிகரிக்கும் நடைமுறைப் படிகள்')]),
  ],
  career: [
    Q('career_fields', T('Which fields of work does my chart traditionally favour, and why?', 'என் ஜாதகம் பாரம்பரியமாக எந்தத் துறைகளுக்கு ஆதரவாக உள்ளது, ஏன்?'),
      [T('10th house, its lord and Dasamsa (D10) — field groups ranked with reasons', '10-ஆம் வீடு, அதன் அதிபதி, தசாம்சம் (D10) — காரணத்துடன் துறைகள்'), T('Government or private — what tradition reads', 'அரசு அல்லது தனியார் — பாரம்பரிய விளக்கம்'), T('A skills-and-market checklist to test each option', 'ஒவ்வொரு வாய்ப்பையும் சோதிக்கத் திறன்–சந்தைப் பட்டியல்')]),
    Q('career_periods', T('Which months ahead are traditionally better for applications, interviews or a change?', 'விண்ணப்பம், நேர்காணல், மாற்றத்துக்குப் பாரம்பரியமாக நல்ல மாதங்கள் எவை?'),
      [T('A dated 24-month calendar from your dasa–bhukti and transits', 'உங்கள் தசா–புக்தி, பெயர்ச்சிகளிலிருந்து 24 மாத தேதியிட்ட நாட்காட்டி'), T('Good weekdays and horai for interviews', 'நேர்காணலுக்கு நல்ல கிழமைகள், ஓரை'), T('Never a reason to quit or stay — your contract and finances decide', 'வேலையை விடவோ தொடரவோ இது காரணமல்ல — ஒப்பந்தமும் நிதியும் முடிவு செய்யும்')]),
    Q('career_business', T('Does my chart traditionally lean towards a job or my own business?', 'என் ஜாதகம் பாரம்பரியமாக வேலைக்கா, சொந்தத் தொழிலுக்கா ஆதரவு?'),
      [T('3rd, 7th, 10th and 11th houses read together', '3, 7, 10, 11-ஆம் வீடுகள் சேர்த்துப் படித்தல்'), T('Partnership porutham pointers', 'கூட்டுத் தொழில் பொருத்தக் குறிப்புகள்'), T('A business-plan checklist before investing anything', 'எதையும் முதலீடு செய்யும் முன் தொழில்–திட்டப் பட்டியல்')]),
  ],
  education: [
    Q('edu_subjects', T('Which subjects and study styles suit my chart traditionally?', 'என் ஜாதகத்திற்குப் பாரம்பரியமாகப் பொருந்தும் பாடங்கள், படிக்கும் முறை எவை?'),
      [T('4th, 5th and 9th houses with Mercury and Jupiter', '4, 5, 9-ஆம் வீடுகள், புதன், குரு'), T('Good study times by horai', 'ஓரைப்படி படிக்க நல்ல நேரம்'), T('Interest, aptitude and career-counsellor checklist', 'ஆர்வம், திறன், வழிகாட்டி ஆலோசகர் பட்டியல்')]),
    Q('edu_abroad', T('Which periods are traditionally supportive for higher studies or studying abroad?', 'உயர்கல்வி / வெளிநாட்டுப் படிப்புக்குப் பாரம்பரியமாக ஆதரவான காலங்கள் எவை?'),
      [T('Dated windows from dasa–bhukti and transits', 'தசா–புக்தி, பெயர்ச்சியிலிருந்து தேதியிட்ட காலங்கள்'), T('12th and 9th house reading', '12, 9-ஆம் வீட்டு விளக்கம்'), T('Deadlines, scholarships and visa checklist first', 'காலக்கெடு, உதவித்தொகை, விசா பட்டியல் முதலில்')]),
  ],
  property: [
    Q('property_periods', T('Which periods are traditionally supportive for buying a home or land?', 'வீடு / நிலம் வாங்கப் பாரம்பரியமாக ஆதரவான காலங்கள் எவை?'),
      [T('4th house and Mars–Saturn reading', '4-ஆம் வீடு, செவ்வாய்–சனி விளக்கம்'), T('Muhurtham dates for registration and griha pravesam', 'பதிவு, கிரகப்பிரவேசத்திற்கான முகூர்த்த நாட்கள்'), T('Legal title, loan-eligibility and budget checklist', 'சட்டப் பத்திரம், கடன் தகுதி, பட்ஜெட் பட்டியல்')]),
  ],
  travel: [
    Q('travel_abroad', T('Which periods does my chart traditionally show for travel or work abroad?', 'வெளிநாட்டுப் பயணம் / வேலைக்கு என் ஜாதகம் பாரம்பரியமாகக் காட்டும் காலங்கள் எவை?'),
      [T('9th and 12th houses, Rahu and the running dasa', '9, 12-ஆம் வீடுகள், ராகு, நடப்பு தசை'), T('Dated windows for the next 3 years', 'அடுத்த 3 ஆண்டுகளுக்கான தேதியிட்ட காலங்கள்'), T('Visa, employer-verification and safety checklist', 'விசா, நிறுவனச் சரிபார்ப்பு, பாதுகாப்புப் பட்டியல்')]),
  ],
  family: [
    Q('family_harmony', T('What does tradition suggest for more peace and understanding at home?', 'வீட்டில் அமைதியும் புரிதலும் கூடப் பாரம்பரியம் என்ன சொல்கிறது?'),
      [T('2nd and 4th houses and the running period, in plain words', '2, 4-ஆம் வீடுகள், நடப்பு காலம் — எளிய சொற்களில்'), T('Calm days this month for important conversations', 'முக்கியப் பேச்சுக்கு இந்த மாத அமைதியான நாட்கள்'), T('Family prayers and a counselling option', 'குடும்ப வழிபாடு, ஆலோசனை வாய்ப்பு')]),
  ],
  dosham: [
    Q('dosham_full', T('What exactly does this dosham mean in my chart, and how strong is it traditionally?', 'இந்தத் தோஷம் என் ஜாதகத்தில் சரியாக என்ன? பாரம்பரியமாக எவ்வளவு வலிமை?'),
      [T('Placement, strength and cancellations (nivarthi) with the reasons', 'இடம், வலிமை, நிவர்த்திகள் — காரணங்களுடன்'), T('Which periods tradition says it is more active — and what it does not mean', 'எந்தக் காலத்தில் அதிகம் என பாரம்பரியம் சொல்கிறது — அது எதைக் குறிக்காது'), T('Free prayers first, then the parigara sthalam and a day-wise yatra plan', 'முதலில் இலவச வழிபாடு, பின் பரிகாரத் தலம், நாள்வாரிப் பயணத் திட்டம்')]),
  ],
  sani: [
    Q('sani_plan', T('How can I plan the Sani period calmly, month by month?', 'சனி காலத்தை மாதம் மாதமாக அமைதியாகத் திட்டமிடுவது எப்படி?'),
      [T('Exact dates of the phase from the ephemeris', 'கிரக நிலைப்படி சரியான தேதிகள்'), T('Areas tradition asks for patience in — without fear', 'பொறுமை தேவைப்படும் பகுதிகள் — பயமின்றி'), T('Saturday prayers, seva and practical habits', 'சனிக்கிழமை வழிபாடு, சேவை, நடைமுறைப் பழக்கங்கள்')]),
  ],
  remedy: [
    Q('remedy_plan', T('Which traditional prayers and temples suit my chart, step by step?', 'என் ஜாதகத்திற்குப் பொருந்தும் பாரம்பரிய வழிபாடு, கோவில்கள் — படிப்படியாக?'),
      [T('Deity, day and hymn for your running dasa', 'நடப்பு தசைக்கு தெய்வம், நாள், தோத்திரம்'), T('Parigara sthalam with timings and a yatra plan', 'பரிகாரத் தலம், நேரம், பயணத் திட்டம்'), T('All voluntary — no remedy guarantees an outcome', 'எல்லாம் விருப்பம் — எந்தப் பரிகாரமும் பலனுக்கு உத்தரவாதம் அல்ல')]),
  ],
  general: [
    Q('chart_full', T('What are the main strengths and challenges in my chart, area by area?', 'என் ஜாதகத்தின் முக்கிய பலம், சவால்கள் — துறைவாரியாக?'),
      [T('All 12 houses in plain words, with the chart reason', '12 வீடுகளும் எளிய சொற்களில், ஜாதகக் காரணத்துடன்'), T('Your running dasa–bhukti and the next 10 years, dated', 'நடப்பு தசா–புக்தி, அடுத்த 10 ஆண்டுகள் — தேதியுடன்'), T('Yogas and doshams with what they do and do not mean', 'யோகங்கள், தோஷங்கள் — எதைக் குறிக்கும், எதைக் குறிக்காது')]),
    Q('chart_year', T('What does tradition suggest I focus on in the next 12 months?', 'அடுத்த 12 மாதங்களில் எதில் கவனம் செலுத்தப் பாரம்பரியம் சொல்கிறது?'),
      [T('Month-by-month focus from dasa, bhukti and transits', 'தசா, புக்தி, பெயர்ச்சியிலிருந்து மாதவாரிக் கவனம்'), T('Good dates for your own plans', 'உங்கள் திட்டங்களுக்கு நல்ல நாட்கள்'), T('One free prayer for each month', 'ஒவ்வொரு மாதத்திற்கும் ஒரு இலவச வழிபாடு')]),
    Q('chart_dasa', T('What does my current dasa–bhukti traditionally mean for me?', 'என் நடப்பு தசா–புக்தி பாரம்பரியமாக எனக்கு என்ன குறிக்கிறது?'),
      [T('The lord’s strength, houses it rules and where it sits', 'அதிபதியின் வலிமை, ஆளும் வீடுகள், இருக்கும் இடம்'), T('Supportive and patient phases inside it, dated', 'அதற்குள் ஆதரவான, பொறுமைக் கட்டங்கள் — தேதியுடன்'), T('Practical focus and a free prayer', 'நடைமுறைக் கவனம், ஒரு இலவச வழிபாடு')]),
  ],
};
// What a related question sends to the answer engine when tapped — a phrasing the engine routes to the right topic
// (checked in test/pro-questions-route.test.js). The person still sees their own question. Missing id → the question itself.
const ASK = {
  marriage_periods: T('Which periods are good for marriage?', 'எனக்குத் திருமணம் எப்போது நடக்கும்?'),
  marriage_delay: T('Why is my marriage getting delayed?', 'என் திருமணம் ஏன் தாமதமாகிறது?'),
  career_periods: T('When is a good time for a job change or promotion?', 'வேலை மாற்றம், பதவி உயர்வுக்கு நல்ல காலம் எப்போது?'),
  property_periods: T('When can I buy a house or property?', 'வீடு, சொத்து வாங்க நல்ல காலம் எப்போது?'),
  family_harmony: T('How to improve family harmony and peace at home?', 'குடும்ப ஒற்றுமை, வீட்டில் அமைதி கூட என்ன செய்யலாம்?'),
  remedy_plan: T('Which parigaram, prayers and temples suit my chart?', 'என் ஜாதகத்திற்கு ஏற்ற பரிகாரம், வழிபாடு, கோவில் எது?'),
  chart_year: T('How will this year be for me? Next 12 months palan', 'இந்த ஆண்டு எனக்கு எப்படி இருக்கும்? அடுத்த 12 மாத பலன்'),
};
/** The engine phrasing for a related question id ({en, ta}), or null. */
export const relatedAsk = (id) => ASK[id] || relatedById(id)?.q || null;

// Topics that share a set.
const ALIAS = { second_marriage: 'marriage', harmony: 'family', job: 'career', job_change: 'career', business: 'career', luck: 'remedy', temple: 'remedy', kuladeivam: 'remedy', vehicle: 'property', muhurtham: 'property' };

/** Every related question, flat (for the tests and the copy scan). */
export const ALL_RELATED = Object.freeze(Object.values(RELATED).flat());

/**
 * Related deep questions for an answer (Perplexity-style "↳" list). Empty for high-risk topics, policy / safety
 * answers, general (no chart) answers, people without a chart, and any child or teen profile.
 * @param {{ topic?: string, intent?: string, adult?: boolean, hasChart?: boolean, general?: boolean, asked?: string[], count?: number }} o
 */
export function relatedQuestions({ topic = 'general', intent = '', adult = false, hasChart = false, general = false, asked = [], count = 3 } = {}) {
  if (!adult || !hasChart || general) return [];
  if (riskLevel(topic) === 'high' || riskLevel(intent) === 'high') return [];
  if (['honest', 'mode_switch', 'policy', 'age_guard', 'crisis', 'death', 'pain'].includes(intent)) return [];
  const key = RELATED[topic] ? topic : ALIAS[topic] || 'general';
  const seen = new Set(asked.map((s) => String(s).trim().toLowerCase()));
  const own = RELATED[key].filter((x) => !seen.has(x.q.en.toLowerCase()) && !seen.has(x.q.ta));
  const extra = key === 'general' ? [] : RELATED.general.filter((x) => !seen.has(x.q.en.toLowerCase()) && !seen.has(x.q.ta));
  return [...own, ...extra].slice(0, count).map((x) => ({ ...x, pro: true }));
}
export const relatedById = (id) => ALL_RELATED.find((x) => x.id === id) || null;

/**
 * What the Pro page shows as "already prepared from your chart": true facts the app has computed (no invention).
 * @param {{ star?: string, rasi?: string, lagna?: string, dasa?: string, dasaEnd?: string, bhukti?: string, bhuktiEnd?: string }} p display strings
 */
export function preparedFacts(p = {}, lang = 'en') {
  const ta = lang === 'ta';
  const out = [];
  if (p.star) out.push(ta ? `ஜன்ம நட்சத்திரம்: ${p.star}` : `Birth star: ${p.star}`);
  if (p.rasi) out.push(ta ? `ராசி: ${p.rasi}` : `Moon sign (Rasi): ${p.rasi}`);
  if (p.lagna) out.push(ta ? `லக்னம்: ${p.lagna}` : `Lagnam: ${p.lagna}`);
  if (p.dasa) out.push(ta ? `நடப்பு தசை: ${p.dasa}${p.dasaEnd ? ` (${p.dasaEnd} வரை)` : ''}` : `Running dasa: ${p.dasa}${p.dasaEnd ? ` (until ${p.dasaEnd})` : ''}`);
  if (p.bhukti) out.push(ta ? `நடப்பு புக்தி: ${p.bhukti}${p.bhuktiEnd ? ` (${p.bhuktiEnd} வரை)` : ''}` : `Running bhukti: ${p.bhukti}${p.bhuktiEnd ? ` (until ${p.bhuktiEnd})` : ''}`);
  return out;
}

/**
 * Honest price framing from the real plan prices: per-day cost of the yearly plan and the saving against 12 months.
 * @returns {{ perDay: number, saving: number, savingPct: number } | null}
 */
export function priceFrame(monthly, yearly) {
  const m = Number(monthly), y = Number(yearly);
  if (!(m > 0) || !(y > 0)) return null;
  const perDay = Math.round((y / 365) * 10) / 10;
  const saving = Math.max(0, Math.round((m * 12 - y) * 100) / 100);
  return { perDay, saving, savingPct: Math.round((saving / (m * 12)) * 100) };
}

/** The conversion funnel steps, in order (events sent with analytics consent only — server/growth.js). */
export const FUNNEL = Object.freeze([
  { step: 'help_search', en: 'Asked from the Home box', ta: 'முகப்புப் பெட்டியில் கேட்டனர்' },
  { step: 'related_view', en: 'Saw related questions', ta: 'தொடர்புடைய கேள்விகளைப் பார்த்தனர்' },
  { step: 'related_click', en: 'Tapped a deeper question', ta: 'ஆழமான கேள்வியைத் தொட்டனர்' },
  { step: 'pro_view', en: 'Saw the Pro page', ta: 'Pro பக்கத்தைப் பார்த்தனர்' },
  { step: 'pro_cta', en: 'Tapped Activate Pro', ta: 'Pro-வைச் செயல்படுத்தத் தொட்டனர்' },
  { step: 'purchase', en: 'Paid', ta: 'கட்டணம் செலுத்தினர்' },
]);

/**
 * Funnel table from step counts: each step's count, its conversion from the previous step and from the first.
 * @param {Record<string, number>} counts
 */
export function funnelTable(counts = {}) {
  const first = Number(counts[FUNNEL[0].step]) || 0;
  let prev = null;
  return FUNNEL.map((f) => {
    const n = Number(counts[f.step]) || 0;
    const row = { ...f, count: n, fromPrev: prev === null ? null : prev > 0 ? Math.round((n / prev) * 1000) / 10 : 0, fromStart: first > 0 ? Math.round((n / first) * 1000) / 10 : 0 };
    prev = n;
    return row;
  });
}
