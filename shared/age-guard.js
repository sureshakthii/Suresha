// Age guard (வயதுக் காப்பு) — the single on-device age policy. AGE IS THE TOP-MOST FILTER on every surface:
// before any topic is answered, scored, suggested or offered, the CHART OWNER's age (the selected family
// member, ageOn(dob, today) — pure calendar arithmetic from shared/datetime.js) decides what may be shown.
//
//   0–5    caregiver-directed only: today's panchangam, festivals, stories / prayers, name letters, star birthday,
//          health habits for parents. Nothing about marriage, love, job, business, money, court, property, porutham.
//   6–12   studies, friendship, kindness, health and good habits, exams, festivals, simple slokas, child-safe parigaram.
//   13–17  education, exams, higher-studies choice, career APTITUDE (interests / strengths — never job timing),
//          health, emotions, friendships, online safety. No marriage timing, romance prediction, matching, business,
//          loans or court.
//   18+    everything.
//   unknown DOB → general guidance only; adult-topic answers need a date of birth.
//
// The band rules and the reviewed child / teen wording live HERE and are re-used by the server policy
// (server/policy/age-policy.js and templates.js import them), so the phone and the server never disagree.
import { ageOn, ageBand } from './datetime.js';

export const AGE_GUARD_VERSION = 'age-guard-1.0.0';
export const ADULT_AGE = 18;

const T = (en, ta) => ({ en, ta });

// ------------------------------------------------------------------ band rules (shared with server policy)
/** Output classes that must never appear for minors (in addition to the always-prohibited list). */
export const MINOR_PROHIBITED = ['romantic_forecast', 'sexual_content', 'marriage_scheduling', 'frightening_dosha', 'adult_relationship_coaching'];

export const BAND_RULES = {
  '0-5': { readingLevel: 'caregiver', minor: true, independentChat: false, note: 'Caregiver-directed calendar, stories and observances only.' },
  '6-12': { readingLevel: 'simple', minor: true, independentChat: true, note: 'Friendship, feelings, kindness, study, play, body safety, trusted adults.' },
  '13-17': { readingLevel: 'teen', minor: true, independentChat: true, note: 'Emotions, boundaries, peers, pressure, online safety; non-graphic health info.' },
  'minor-unknown': { readingLevel: 'teen', minor: true, independentChat: true, note: 'Earlier minor signal without an exact age — treated as 13–17.' },
  '18-25': { readingLevel: 'adult', minor: false, independentChat: true, note: 'Adult autonomy; no assumption that everyone marries or has children.' },
  '26-59': { readingLevel: 'adult', minor: false, independentChat: true, note: 'Chosen goals; no gender/caste/religion destiny assignments.' },
  '60+': { readingLevel: 'adult', minor: false, independentChat: true, note: 'Same dignity; do not assume inability, dementia or loneliness.' },
  unknown: { readingLevel: 'general', minor: null, independentChat: true, note: 'General safe guidance; do not unlock adult-sensitive guidance.' },
};

// Reviewed wording (child-safety review drafts) — server/policy/templates.js uses these same texts.
export const REVIEWED_TEXT = {
  child_caregiver: T(
    "Hello! Let's explore together with a grown-up — today's festival, a story about the stars, or a little prayer. Please ask Amma, Appa or another grown-up you trust to help you use the app.",
    "வணக்கம்! ஒரு பெரியவருடன் சேர்ந்து பார்க்கலாம் — இன்றைய பண்டிகை, நட்சத்திரக் கதை, அல்லது ஒரு சிறிய பிரார்த்தனை. இந்தச் செயலியைப் பயன்படுத்த அம்மா, அப்பா அல்லது நம்பிக்கையான பெரியவரின் உதவியைக் கேளுங்கள்."),
  child_crush: T(
    "It is okay to like someone and enjoy being friends. You do not need to hurry into a relationship. Be kind, respect their feelings, and enjoy playing and learning. If someone makes you uncomfortable or asks you to keep an unsafe secret, tell a trusted grown-up.",
    "ஒருவரைப் பிடிப்பதும், அவர்களுடன் நண்பராக மகிழ்ச்சியாக இருப்பதும் சரிதான். காதல் உறவுக்கு அவசரப்பட வேண்டியதில்லை. அன்பாக இருங்கள், அவர்களின் உணர்வுகளை மதியுங்கள், விளையாடுவதையும் கற்றுக்கொள்வதையும் மகிழ்ச்சியாகச் செய்யுங்கள். யாராவது உங்களுக்குச் சங்கடம் தந்தாலோ, பாதுகாப்பில்லாத ரகசியத்தை மறைக்கச் சொன்னாலோ, நம்பிக்கையான ஒரு பெரியவரிடம் சொல்லுங்கள்."),
  teen_romance: T(
    "Having feelings for someone is a normal part of growing up. A chart cannot tell you whether a relationship will work or when love will come. What matters is respect, kindness and that nobody feels pressured. Take your time, keep up with your studies and friends, and talk to a trusted adult if anything feels confusing or unsafe. Online, be careful about sharing photos or personal details.",
    "ஒருவர் மீது ஈர்ப்பு வருவது வளரும் பருவத்தில் இயல்பானது. ஒரு உறவு வெற்றியடையுமா, காதல் எப்போது வரும் என்று ஜாதகம் சொல்ல முடியாது. மரியாதை, அன்பு, யாருக்கும் அழுத்தம் இல்லாமல் இருப்பது — இவைதான் முக்கியம். நிதானமாக இருங்கள், படிப்பையும் நண்பர்களையும் கவனியுங்கள்; ஏதாவது குழப்பமாகவோ பாதுகாப்பில்லாததாகவோ தோன்றினால் நம்பிக்கையான பெரியவரிடம் பேசுங்கள். இணையத்தில் புகைப்படங்களையும் தனிப்பட்ட விவரங்களையும் பகிர்வதில் கவனமாக இருங்கள்."),
  minor_marriage: T(
    "I do not give marriage timings or matching for anyone under 18. Marriage is an adult decision, and the law sets a minimum age for it. For now, the focus can be on education, health and growing confidence. If anyone is pressuring a young person to marry, that is a safety concern — please reach out to the help listed below.",
    "18 வயதுக்குக் குறைவானவர்களுக்கு நான் திருமண நேரமோ பொருத்தமோ பார்ப்பதில்லை. திருமணம் பெரியவர்கள் எடுக்கும் முடிவு; அதற்குச் சட்டம் குறைந்தபட்ச வயதை நிர்ணயித்துள்ளது. இப்போது கல்வி, உடல்நலம், தன்னம்பிக்கை வளர்ச்சி ஆகியவற்றில் கவனம் செலுத்தலாம். ஒரு இளம் வயதினரைத் திருமணம் செய்யுமாறு யாராவது அழுத்தம் கொடுத்தால், அது பாதுகாப்புப் பிரச்சினை — கீழே உள்ள உதவி எண்களைத் தொடர்புகொள்ளுங்கள்."),
  guardian_minor_romance: T(
    "Feelings and crushes are a normal part of growing up. A horoscope cannot tell you whom your child likes or whether a relationship will happen, and I do not make romance or marriage predictions for children. A calm, respectful conversation usually helps more than checking up on them: listen without judging, talk about kindness, consent, online safety and trusted adults, and let them know they can always come to you if something feels wrong.",
    "ஈர்ப்பும் உணர்வுகளும் வளரும் பருவத்தில் இயல்பானவை. உங்கள் பிள்ளை யாரை விரும்புகிறார், உறவு அமையுமா என்று ஜாதகம் சொல்ல முடியாது; குழந்தைகளுக்கு நான் காதல் அல்லது திருமணக் கணிப்புகள் சொல்வதில்லை. கண்காணிப்பதை விட, அமைதியான, மரியாதையான உரையாடலே அதிகம் உதவும்: தீர்ப்பு சொல்லாமல் கேளுங்கள்; அன்பு, ஒப்புதல், இணையப் பாதுகாப்பு, நம்பிக்கையான பெரியவர்கள் பற்றிப் பேசுங்கள்; ஏதாவது தவறாகத் தோன்றினால் எப்போதும் உங்களிடம் வரலாம் என்று உறுதியளியுங்கள்."),
};

// ------------------------------------------------------------------ age of the chart owner
const ISO = /^\d{4}-\d{2}-\d{2}$/;
/** Today's calendar date ('YYYY-MM-DD') at a UTC offset in hours (the app keeps the place's offset). */
export function localToday(tzHours = 5.5, now = new Date()) {
  const ms = (now instanceof Date ? now.getTime() : Number(now)) + (Number.isFinite(Number(tzHours)) ? Number(tzHours) : 5.5) * 3600000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Date of birth ('YYYY-MM-DD') of a family member, a chart, or a plain date string; null if unknown. */
export function dobOf(subject) {
  if (!subject) return null;
  if (typeof subject === 'string') return ISO.test(subject.slice(0, 10)) ? subject.slice(0, 10) : null;
  const d = subject.birthDate || subject.dob || subject.date || subject.chart?.date;
  return typeof d === 'string' && ISO.test(d.slice(0, 10)) ? d.slice(0, 10) : null;
}

/** Guard band: '0-5' | '6-12' | '13-17' | 'adult' | 'unknown'. */
export function guardBand(age) {
  const b = ageBand(age);
  return b === '0-5' || b === '6-12' || b === '13-17' || b === 'unknown' ? b : 'adult';
}

/**
 * The age profile of a chart owner. subject: family member ({ date, relation }), chart ({ date, tz }) or 'YYYY-MM-DD'.
 * Companies / teams (relation 'organization') are not people and are never age-limited.
 */
export function ageProfile(subject, { today = null, tz = null, now = new Date() } = {}) {
  if (subject && typeof subject === 'object' && subject.relation === 'organization') {
    return { age: null, band: 'adult', minor: false, adult: true, unknown: false, organization: true };
  }
  const dob = dobOf(subject);
  const zone = tz ?? (subject && typeof subject === 'object' && Number.isFinite(Number(subject.tz)) ? Number(subject.tz) : 5.5);
  const ref = today && ISO.test(today) ? today : localToday(zone, now);
  const age = dob ? ageOn(dob, ref) : null;
  const band = guardBand(age);
  return { age, band, minor: band === '0-5' || band === '6-12' || band === '13-17', adult: band === 'adult', unknown: band === 'unknown', organization: false };
}

export const isMinor = (subject, opts) => ageProfile(subject, opts).minor;
/** Adults only — for marriage / love / partner matching pickers (unknown DOB is not shown either). */
export const isAdult = (subject, opts) => ageProfile(subject, opts).adult;

// ------------------------------------------------------------------ topics
// Every topic id used on any surface (Ask Thunai router, guidance intents, Prasnam categories, Life questions,
// Muhurtham categories, analysis areas, road-map areas) → the youngest band that may see it.
const RANK = { '0-5': 0, '6-12': 1, '13-17': 2, adult: 3 };
const ADULT_TOPICS = [
  'marriage', 'second_marriage', 'harmony', 'love', 'lovematch', 'porutham', 'couple', 'gunamilan', 'partner', 'partners', 'bride_groom',
  'marriage_when', 'divorce', 'child', 'child_when', 'children', 'pregnancy', 'delivery',
  'job', 'job_change', 'career', 'business', 'money', 'finance', 'wealth', 'loan', 'lend_money', 'cheque', 'client', 'contract',
  'tech_partner', 'launch', 'office', 'property', 'house', 'graha_pravesam', 'bhoomi_pooja', 'vehicle', 'gold_vehicle',
  'court', 'legal', 'pr', 'politics', 'acting', 'remarriage',
  // Prasnam categories (shared/prasna.js) — buying, money, property, work, marriage-related and police matters.
  'jewellery', 'clothes', 'electronics', 'pet_cattle', 'rent_agreement', 'house_move', 'land_buy', 'property_sell',
  'kitchen_start', 'borewell', 'interview', 'job_join', 'salary_talk', 'partnership', 'money_transfer', 'investment',
  'bank_account', 'loan_sign', 'marriage_talk', 'engagement', 'seemantham', 'police_complaint',
];
// Prasnam categories open to every age (studies, health, temple, a child's own samskaras, family travel, general).
const OPEN_TOPICS = ['surgery', 'medicine_start', 'education', 'course_start', 'travel', 'temple_visit', 'mudi_kaanikkai', 'ear_piercing', 'general'];
const TOPIC_MIN = {
  ...Object.fromEntries(ADULT_TOPICS.map((t) => [t, 'adult'])),
  compass: '13-17', visa: '13-17', meeting: '13-17', abroad_study: '13-17',
  competition: '6-12', friendship: '6-12',
  passport_apply: '13-17', vratham: '13-17',
  ...Object.fromEntries(OPEN_TOPICS.map((t) => [t, '0-5'])),
};
/** The youngest band that may see a topic ('0-5' = everyone), or null when the topic is not in the table. */
export const topicMinBand = (topic) => TOPIC_MIN[topic] || null;

/** May this topic be read / shown for this profile? Unlisted topics (today, temple, prayer, study, health, family…) are open to all. */
export function topicAllowed(topic, profile) {
  const min = TOPIC_MIN[topic];
  if (!min) return true;
  const p = profile || { band: 'unknown' };
  if (p.organization) return true;
  if (p.band === 'unknown') return min !== 'adult';
  return RANK[p.band] >= RANK[min];
}
export const isAdultTopic = (topic) => TOPIC_MIN[topic] === 'adult';

const TOPIC_NAME = {
  marriage: T('marriage', 'திருமணம்'), second_marriage: T('marriage', 'திருமணம்'), harmony: T('married life', 'திருமண வாழ்க்கை'),
  love: T('love and relationships', 'காதல், உறவு'), porutham: T('marriage matching', 'திருமணப் பொருத்தம்'), child: T('having children', 'குழந்தை பாக்கியம்'),
  pregnancy: T('having children', 'குழந்தை பாக்கியம்'), child_when: T('having children', 'குழந்தை பாக்கியம்'),
  job: T('getting a job', 'வேலை'), job_change: T('changing jobs', 'வேலை மாற்றம்'), career: T('career and job', 'வேலை, தொழில்'),
  business: T('business', 'வியாபாரம்'), money: T('money and earnings', 'பணம், வருமானம்'), finance: T('money and earnings', 'பணம், வருமானம்'),
  loan: T('loans', 'கடன்'), property: T('property', 'சொத்து'), house: T('buying a house', 'வீடு வாங்குதல்'), vehicle: T('buying a vehicle', 'வாகனம் வாங்குதல்'),
  court: T('court cases', 'வழக்கு'), legal: T('court cases', 'வழக்கு'), pr: T('settling abroad', 'வெளிநாட்டில் குடியேற்றம்'),
};
const TOPIC_LABEL = new Map(); // names passed in by a surface (e.g. a Prasnam category's own name)
const topicName = (topic) => TOPIC_NAME[topic] || TOPIC_LABEL.get(topic) || T('this', 'இது');
const ROMANCE = new Set(['love', 'lovematch']);
const MARRIAGE = new Set(['marriage', 'second_marriage', 'harmony', 'porutham', 'couple', 'gunamilan', 'partner', 'bride_groom', 'marriage_when', 'remarriage', 'divorce']);

// ------------------------------------------------------------------ age-appropriate suggestion chips
const CHIPS = {
  '0-5': [
    T('What is special about today?', 'இன்று என்ன சிறப்பு?'),
    T('A simple prayer to say together today', 'இன்று சேர்ந்து சொல்ல ஒரு எளிய பிரார்த்தனை'),
    T('Healthy food habits for little ones', 'சிறியவர்களுக்கு நல்ல உணவுப் பழக்கம்'),
    T('Name letters for the birth star', 'நட்சத்திரப்படி பெயர் எழுத்து'),
    T('Which festival is coming next?', 'அடுத்து வரும் பண்டிகை எது?'),
  ],
  '6-12': [
    T('What can I do to focus better on studies?', 'படிப்பில் கவனம் கூட என்ன செய்யலாம்?'),
    T('Which food keeps me healthy?', 'ஆரோக்கியமாக இருக்க உணவு?'),
    T('Which sloka can I say today?', 'இன்று எந்த ஸ்லோகம் சொல்லலாம்?'),
    T('How can I be a good friend?', 'நல்ல நண்பராக இருப்பது எப்படி?'),
    T('Good habits for every day', 'தினமும் செய்ய நல்ல பழக்கங்கள்'),
  ],
  '13-17': [
    T('How can I prepare well for my exams?', 'தேர்வுக்கு நன்றாகத் தயாராவது எப்படி?'),
    T('Which subjects suit my interests and strengths?', 'என் ஆர்வத்திற்கும் திறமைக்கும் எந்தப் படிப்பு ஏற்றது?'),
    T('How can I stay calm and handle stress?', 'மன அழுத்தம் இல்லாமல் அமைதியாக இருப்பது எப்படி?'),
    T('A prayer before exams', 'தேர்வுக்கு முன் ஒரு பிரார்த்தனை'),
    T('How do I stay safe online?', 'இணையத்தில் பாதுகாப்பாக இருப்பது எப்படி?'),
  ],
  unknown: [
    T('Which temple should I visit?', 'எந்தக் கோவிலுக்குச் செல்லலாம்?'),
    T('What is a good time today for important work?', 'இன்று முக்கிய வேலைக்கு நல்ல நேரம் எது?'),
    T('A simple prayer for today', 'இன்றைக்கு ஒரு எளிய பிரார்த்தனை'),
  ],
};

/**
 * Suggested-question chips for a profile. For adults the surface's own list (`adult`, [en, ta] pairs or {en, ta})
 * is returned unchanged; minors and unknown ages get their band's list. Returns { en, ta } objects.
 */
export function suggestionsFor(profile, adult = [], { count = 0 } = {}) {
  const norm = (x) => (Array.isArray(x) ? T(x[0], x[1]) : x);
  const band = profile?.band || 'unknown';
  let list;
  if (band === 'adult') list = adult.map(norm);
  else if (band === 'unknown') list = [...CHIPS.unknown, ...adult.map(norm).filter((x) => !adultText(x))];
  else list = CHIPS[band];
  const seen = new Set();
  list = list.filter((x) => (seen.has(x.en) ? false : seen.add(x.en)));
  return count ? list.slice(0, count) : list;
}

// ------------------------------------------------------------------ adult statements in free text
// Used to drop marriage / career / money / court / dosha-marriage statements from readings shown for minors.
const ADULT_RE = new RegExp([
  'marri', 'marry', 'wedding', 'spouse', 'husband', 'wife', 'bride', 'groom', 'alliance', 'romance', 'romantic', '\\blove\\b', 'partner',
  'porutham', 'matching', 'dosha samyam', 'chevvai dosh', 'mangal dosh', 'manglik', 'kuja dosh', 'conceiv', 'pregnan', 'childbirth', 'child blessing', 'santhana',
  'career', '\\bjob', 'promotion', 'salary', 'profession', 'business', 'venture', '\\btrade', '\\bdeal', 'contract', 'signature', 'invest',
  'money', 'wealth', 'income', 'earning', 'finance', 'financial', 'loan', 'debt', 'lending', '\\bemi\\b', 'savings', 'property', '\\bland\\b',
  'house purchase', 'vehicle', 'court', 'litigation', 'lawsuit', 'legal', 'badhaka', 'maraka', 'second union', 'speculat', 'gambl',
  // Tamil
  'திருமண', 'கல்யாண', 'மணமக', 'வரன்', 'மாப்பிள்ளை', 'காதல்', 'கணவன்', 'மனைவி', 'வாழ்க்கைத் துணை', 'துணையின்', 'தம்பதி', 'பொருத்தம்',
  'தோஷ சாம்ய', 'செவ்வாய் தோஷ', 'குழந்தை பாக்கிய', 'குழந்தைப் பேறு', 'சந்தான', 'கர்ப்ப', 'தொழில', 'வேலை', 'பதவி', 'சம்பள', 'வியாபார',
  'வணிக', 'கூட்டுத் தொழில்', 'கூட்டாளி', 'ஒப்பந்த', 'கையெழுத்து', 'முதலீ', 'பணம்', 'பணமு', 'பணத்', 'பணவரவு', 'பண வரவு', 'செல்வ', 'வருமான', 'கடன்', 'சொத்து', 'நிலம்',
  'வாகன', 'வழக்கு', 'நீதிமன்ற', 'பாதக', 'மாரக', 'ஊக வணிக', 'லாபம்',
].join('|'), 'i');

/** True when a string or { en, ta } line talks about an adult-only life area. */
export function adultText(x) {
  if (!x) return false;
  if (typeof x === 'string') return ADULT_RE.test(x);
  return ADULT_RE.test(String(x.en || '')) || ADULT_RE.test(String(x.ta || '')) || ADULT_RE.test(String(x.text || ''));
}
/** Keep only the lines a minor may see (adults: unchanged). Works on strings and { en, ta } objects. */
export function childSafe(lines, profile) {
  if (!profile || profile.adult) return lines;
  return (lines || []).filter((l) => !adultText(l));
}

// ------------------------------------------------------------------ the answer for a question a child should not get
const say = (o, lang) => (lang === 'ta' ? o.ta : o.en);

/** Band text: why this is not read, and what to focus on instead. */
function bandLines(topic, profile, name) {
  const t = topicName(topic);
  const age = profile.age;
  const nm = name ? T(`${name}, `, `${name}, `) : T('', '');
  if (profile.band === '0-5') {
    return {
      answer: T(`${name || 'Your child'} is only ${age} — ${t.en} is not read for a young child. At this age the chart is used only for gentle things: today's panchangam and festivals, stories and simple prayers, name letters and the star birthday.`,
        `${name || 'குழந்தை'} — வயது ${age} மட்டுமே; ${t.ta} பற்றி சிறு குழந்தைக்குப் பார்க்கப்படுவதில்லை. இந்த வயதில் ஜாதகம் இன்றைய பஞ்சாங்கம், பண்டிகைகள், கதைகள், எளிய பிரார்த்தனை, பெயர் எழுத்து, நட்சத்திரப் பிறந்தநாள் போன்ற மென்மையான விஷயங்களுக்கு மட்டுமே.`),
      focus: [T('Nutritious food, outdoor play and a fixed sleep time', 'சத்தான உணவு, வெளியில் விளையாட்டு, நேரத்திற்கு உறக்கம்'),
        T('Read a story together and sing a simple song every day', 'தினமும் சேர்ந்து ஒரு கதை வாசித்து, ஒரு எளிய பாடல் பாடுங்கள்'),
        T('Regular check-ups and vaccinations with the family doctor', 'குடும்ப மருத்துவரிடம் சீரான பரிசோதனை, தடுப்பூசிகள்')],
      prayer: T('Say together: "Om Gam Ganapataye Namaha" — Vinayagar blesses a happy, healthy childhood.', 'சேர்ந்து சொல்லுங்கள்: "ஓம் கம் கணபதயே நமஹ" — மகிழ்ச்சியான, ஆரோக்கியமான குழந்தைப் பருவத்திற்கு விநாயகர் அருள்.'),
      extra: REVIEWED_TEXT.child_caregiver,
    };
  }
  if (profile.band === '6-12') {
    return {
      answer: T(`${nm.en}this question is for when you grow up! At ${age}, the most important things are your studies, playing with friends, being kind and building good habits. The stars are happiest when you learn and play well.`,
        `${nm.ta}இந்தக் கேள்வி நீங்கள் பெரியவரான பிறகு கேட்க வேண்டியது! ${age} வயதில் படிப்பு, நண்பர்களுடன் விளையாட்டு, அன்பாக இருத்தல், நல்ல பழக்கங்கள் — இவைதான் முக்கியம். நீங்கள் நன்றாகப் படித்து விளையாடும்போது நட்சத்திரங்களும் மகிழ்ச்சியடையும்.`),
      focus: [T('Study a little every day at the same time — revise in the morning', 'தினமும் ஒரே நேரத்தில் கொஞ்சம் படியுங்கள் — காலையில் மீண்டும் பாருங்கள்'),
        T('Play outdoors, eat fruits and vegetables, sleep early', 'வெளியே விளையாடுங்கள், பழம், காய்கறி சாப்பிடுங்கள், சீக்கிரம் தூங்குங்கள்'),
        T('Help at home and be kind to friends — good deeds are the best parigaram', 'வீட்டில் உதவுங்கள், நண்பர்களிடம் அன்பாக இருங்கள் — நல்ல செயலே சிறந்த பரிகாரம்')],
      prayer: T('Before studying, say: "Saraswathi Namasthubhyam, Varade Kamaroopini" — Saraswathi helps you learn well.', 'படிக்கும் முன் சொல்லுங்கள்: "சரஸ்வதி நமஸ்துப்யம், வரதே காமரூபிணி" — சரஸ்வதி நன்றாகப் படிக்க உதவுவார்.'),
      extra: ROMANCE.has(topic) ? REVIEWED_TEXT.child_crush : null,
    };
  }
  // 13-17 (and any other minor)
  return {
    answer: MARRIAGE.has(topic) ? REVIEWED_TEXT.minor_marriage
      : ROMANCE.has(topic) ? REVIEWED_TEXT.teen_romance
        : T(`${nm.en}at ${age}, ${t.en} is not read from the chart — these questions are kept for after 18. This is the time to build your education, discover your interests and strengths, look after your health and keep good friends.`,
          `${nm.ta}${age} வயதில் ${t.ta} பற்றி ஜாதகம் பார்க்கப்படுவதில்லை — இவை 18 வயதுக்குப் பிறகே. இப்போது கல்வியை வளர்த்துக்கொள்ளுங்கள், உங்கள் ஆர்வத்தையும் திறமையையும் கண்டறியுங்கள், உடல்நலத்தைப் பேணுங்கள், நல்ல நண்பர்களுடன் இருங்கள்.`),
    focus: [T('A steady study timetable with short breaks — revise the hardest subject in the morning', 'சிறு இடைவேளையுடன் சீரான படிப்பு அட்டவணை — கடினமான பாடத்தைக் காலையில் படியுங்கள்'),
      T('Notice what you enjoy and do well — that is your aptitude, and it guides the study choice', 'எதை விரும்பி நன்றாகச் செய்கிறீர்கள் என்று கவனியுங்கள் — அதுவே உங்கள் திறமை; படிப்புத் தேர்வுக்கு அதுவே வழிகாட்டி'),
      T('Sleep 8 hours, move every day, and talk to a trusted adult when stressed', '8 மணி நேர உறக்கம், தினசரி உடற்பயிற்சி; மன அழுத்தம் வந்தால் நம்பிக்கையான பெரியவரிடம் பேசுங்கள்')],
    prayer: T('Before exams, pray to Saraswathi and Hayagreevar; light a lamp on Thursdays for Dakshinamurthy.', 'தேர்வுக்கு முன் சரஸ்வதி, ஹயக்ரீவர் வழிபாடு; வியாழன்தோறும் தட்சிணாமூர்த்திக்கு தீபம்.'),
    extra: null,
  };
}

/**
 * The warm, age-appropriate reply used INSTEAD of a prediction when a minor's chart (or an unknown age) is asked
 * about an adult topic. Same shape the chat bubble renders — and deliberately no meter, no periods, no percentage.
 */
export function ageGuardAnswer({ topic, profile, lang = 'ta', name = '', question = '', label = null }) {
  if (label?.en && label?.ta) TOPIC_LABEL.set(topic, label);
  const L = (o) => say(o, lang);
  const sections = [];
  if (profile?.band === 'unknown') {
    sections.push({ key: 'answer', title: L(T('Answer', 'பதில்')), lines: [L(T(`A reading about ${topicName(topic).en} needs the person's date of birth. Please add the birth date in Family — until then I can share general guidance: today's good times, temples and simple prayers.`,
      `${topicName(topic).ta} பற்றிய பலனுக்கு பிறந்த தேதி தேவை. குடும்பம் பகுதியில் பிறந்த தேதியைச் சேர்க்கவும் — அதுவரை பொதுவான வழிகாட்டல் தருகிறேன்: இன்றைய நல்ல நேரம், கோவில், எளிய பிரார்த்தனை.`))] });
    return { intent: 'age_guard', ageGuard: { band: 'unknown', topic }, topic, question, sections, meter: null, actions: [{ go: 'family', label: L(T('Add birth date', 'பிறந்த தேதி சேர்')) }], followups: suggestionsFor(profile).slice(0, 3).map(L), text: textOf(sections) };
  }
  const b = bandLines(topic, profile, name);
  sections.push({ key: 'answer', title: L(T('Answer', 'பதில்')), lines: [L(b.answer)] });
  if (b.extra) sections.push({ key: 'note', title: L(T('Remember', 'நினைவில் கொள்ளுங்கள்')), lines: [L(b.extra)] });
  sections.push({ key: 'dos', title: L(profile.band === '0-5' ? T('For parents now', 'பெற்றோருக்கு இப்போது') : T('Focus on now', 'இப்போது கவனம் செலுத்த')), lines: b.focus.map(L) });
  sections.push({ key: 'prayer', title: L(T('A simple prayer', 'எளிய பிரார்த்தனை')), lines: [L(b.prayer)] });
  const actions = profile.band === '0-5'
    ? [{ go: 'starbday', label: L(T('Star birthday', 'நட்சத்திரப் பிறந்தநாள்')) }, { go: 'names', label: L(T('Name letters', 'பெயர் எழுத்து')) }]
    : [{ go: 'health', label: L(T('Health & good habits', 'ஆரோக்கியம் & நல்ல பழக்கம்')) }, { go: 'parigaram', label: L(T('Simple prayers', 'எளிய வழிபாடு')) }];
  return { intent: 'age_guard', ageGuard: { band: profile.band, age: profile.age, topic }, topic, question, sections, meter: null, actions, followups: suggestionsFor(profile).slice(0, 3).map(L), text: textOf(sections) };
}

/**
 * A child-friendly answer for an open question (a sloka, a habit, being a good friend, online safety …):
 * today's deity and a simple prayer, the band's everyday focus, and age-appropriate follow-ups.
 * deity: optional { god: {en,ta}, mantra: {en,ta} } (shared/daily.js dailyReview().deity).
 */
export function childGeneralAnswer({ profile, lang = 'ta', name = '', deity = null, question = '' }) {
  const L = (o) => say(o, lang);
  const b = bandLines('general', profile, name);
  const q = String(question || '');
  const lines = [];
  if (/online|internet|phone|social|இணைய|கைப்பேசி/i.test(q)) {
    lines.push(L(T('Online, share nothing private — no photos, address, school or passwords — with people you have not met. If a chat or message makes you uncomfortable, stop and tell a parent or a trusted adult straight away.',
      'இணையத்தில் நேரில் சந்திக்காதவர்களுடன் தனிப்பட்ட எதையும் — புகைப்படம், முகவரி, பள்ளி, கடவுச்சொல் — பகிர வேண்டாம். ஏதாவது உரையாடல் சங்கடம் தந்தால் உடனே நிறுத்தி, பெற்றோர் அல்லது நம்பிக்கையான பெரியவரிடம் சொல்லுங்கள்.')));
  } else if (/friend|நண்ப|natpu|nanban/i.test(q)) {
    lines.push(L(T('A good friend listens, shares, keeps promises and says sorry when wrong. Be kind to someone who is alone today — that is the best good deed.',
      'நல்ல நண்பர் கேட்பார், பகிர்வார், சொன்னதைச் செய்வார், தவறு செய்தால் மன்னிப்பு கேட்பார். இன்று தனியாக இருக்கும் ஒருவரிடம் அன்பாக இருங்கள் — அதுவே சிறந்த நல்ல செயல்.')));
  } else if (deity?.mantra) {
    lines.push(L(T(`Today's prayer: ${deity.mantra.en} — to ${deity.god.en}. Say it slowly three times with folded hands.`, `இன்றைய பிரார்த்தனை: ${deity.mantra.ta} — ${deity.god.ta}. கை கூப்பி மெதுவாக மூன்று முறை சொல்லுங்கள்.`)));
  } else {
    lines.push(L(b.prayer));
  }
  const sections = [
    { key: 'answer', title: L(T('Answer', 'பதில்')), lines },
    { key: 'dos', title: L(profile.band === '0-5' ? T('For parents now', 'பெற்றோருக்கு இப்போது') : T('Good habits', 'நல்ல பழக்கங்கள்')), lines: b.focus.map(L) },
  ];
  if (lines[0] !== L(b.prayer)) sections.push({ key: 'prayer', title: L(T('A simple prayer', 'எளிய பிரார்த்தனை')), lines: [L(b.prayer)] });
  const actions = profile.band === '0-5'
    ? [{ go: 'starbday', label: L(T('Star birthday', 'நட்சத்திரப் பிறந்தநாள்')) }, { go: 'names', label: L(T('Name letters', 'பெயர் எழுத்து')) }]
    : [{ go: 'health', label: L(T('Health & good habits', 'ஆரோக்கியம் & நல்ல பழக்கம்')) }];
  return { intent: 'age_guard', ageGuard: { band: profile.band, age: profile.age, topic: 'general' }, question, sections, meter: null, actions, followups: suggestionsFor(profile).slice(0, 3).map(L), text: textOf(sections) };
}

function textOf(sections) {
  return sections.map((s) => `${s.title}:\n${s.lines.map((l) => `• ${l}`).join('\n')}`).join('\n\n');
}

/**
 * Last line of defence for any answer object shown for a minor: no meter / percentage, no adult statements,
 * age-appropriate follow-ups, no links into adult screens. Adults: returned unchanged.
 */
const ADULT_SCREENS = new Set(['couple', 'porutham', 'gunamilan', 'lovematch', 'partners', 'muhurtham', 'life', 'roadmap']);
export function guardAnswer(ans, profile, lang = 'ta') {
  if (!ans || !profile || profile.adult || profile.organization || ans.intent === 'age_guard') return ans;
  const sections = (ans.sections || [])
    .map((s) => ({ ...s, lines: (s.lines || []).filter((l) => !adultText(l) && !/\d+\s*%/.test(String(l))) }))
    .filter((s) => s.lines.length);
  const out = { ...ans, sections, meter: null, ageGuarded: true,
    followups: suggestionsFor(profile).slice(0, 3).map((o) => say(o, lang)),
    actions: (ans.actions || []).filter((a) => !ADULT_SCREENS.has(a.go)) };
  out.text = textOf(sections);
  return out;
}

// ------------------------------------------------------------------ per-surface filters
/** Prasnam / Muhurtham categories for a profile (by id). */
export const categoryAllowed = (id, profile) => topicAllowed(id, profile);

/** Life-question ids (shared/predict.js QUESTIONS + extras) allowed for a profile. */
export function lifeQuestionAllowed(id, profile) {
  if (id === 'kula') return true;
  if (id === 'visa') return topicAllowed('job', profile); // the Life question is about a WORK visa
  if (id === 'education') return !profile || profile.adult || profile.organization || profile.band === '13-17';
  return topicAllowed(id, profile);
}

/** Notes shown where a picker hides people under 18. */
export const MATCH_ADULTS_NOTE = T('Marriage matching is only for people aged 18 and over — younger family members are not shown here.', 'திருமணப் பொருத்தம் 18 வயதுக்கு மேற்பட்டவர்களுக்கு மட்டும் — இளைய குடும்ப உறுப்பினர்கள் இங்கே காட்டப்படுவதில்லை.');
export const PARTNER_ADULTS_NOTE = T('Business partner matching is only for people aged 18 and over.', 'வணிகக் கூட்டாளி பொருத்தம் 18 வயதுக்கு மேற்பட்டவர்களுக்கு மட்டும்.');

/** Short label of a minor's stage, for headers ("Age 6 · School years"). */
export function stageLabel(profile) {
  return {
    '0-5': T('Early childhood — caregiver guidance', 'சிறு குழந்தைப் பருவம் — பெற்றோர் வழிகாட்டல்'),
    '6-12': T('School years', 'பள்ளிப் பருவம்'),
    '13-17': T('Teen years', 'பதின்பருவம்'),
    adult: T('Adult', 'பெரியவர்'),
    unknown: T('Age not known', 'வயது தெரியவில்லை'),
  }[profile?.band || 'unknown'];
}
