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
  // Adult–minor romantic/sexual facilitation (server template decline_minor_facilitation uses this same text).
  decline_minor_facilitation: T(
    'I cannot help an adult pursue a romantic or sexual relationship with a child. Astrology does not change that boundary. I can help you seek appropriate companionship with consenting adults. If these feelings worry you, a qualified counsellor can help confidentially.',
    'ஒரு பெரியவர் ஒரு குழந்தையுடன் காதல் அல்லது பாலியல் உறவைத் தேட நான் உதவ முடியாது. ஜோதிடம் இந்த எல்லையை மாற்றாது. ஒப்புதல் தரும் பெரியவர்களுடன் பொருத்தமான துணையைத் தேட நான் உதவ முடியும். இந்த உணர்வுகள் உங்களைக் கவலைப்படுத்தினால், தகுதியான ஆலோசகர் ரகசியமாக உதவ முடியும்.'),
  teen_adult_partner: T(
    'Thank you for sharing this. When an adult seeks a romantic or sexual relationship with someone under 18, that is not okay — even if it feels special. Keeping that boundary is the adult\'s responsibility, not yours. You deserve to feel safe and never pressured. Please talk to a trusted adult who is not involved, or contact the help listed below.',
    'இதைப் பகிர்ந்ததற்கு நன்றி. 18 வயதுக்குக் குறைவான ஒருவருடன் ஒரு பெரியவர் காதல் அல்லது பாலியல் உறவை நாடுவது சரியல்ல — அது சிறப்பாகத் தோன்றினாலும் கூட. அந்த எல்லையைக் காப்பது அந்தப் பெரியவரின் பொறுப்பு, உங்களுடையது அல்ல. நீங்கள் பாதுகாப்பாகவும் எந்த அழுத்தமும் இல்லாமலும் இருக்க உரிமை உண்டு. இதில் சம்பந்தப்படாத நம்பிக்கையான ஒரு பெரியவரிடம் பேசுங்கள், அல்லது கீழே உள்ள உதவியைத் தொடர்புகொள்ளுங்கள்.'),
  guardian_child_at_risk: T(
    'What you describe — an adult seeking a romantic or sexual relationship with someone under 18 — is a child-safety concern, and astrology does not change that. Please focus on keeping the child safe. Avoid confronting the adult alone if that could be dangerous, and contact the child helpline or police listed below. A counsellor or school counsellor can also help the child.',
    'நீங்கள் சொல்வது — 18 வயதுக்குக் குறைவான ஒருவருடன் ஒரு பெரியவர் காதல் அல்லது பாலியல் உறவை நாடுவது — குழந்தைப் பாதுகாப்புப் பிரச்சினை; ஜோதிடம் அதை மாற்றாது. குழந்தையைப் பாதுகாப்பாக வைப்பதில் கவனம் செலுத்துங்கள். ஆபத்து இருக்கக்கூடும் என்றால் அந்தப் பெரியவரைத் தனியாக எதிர்கொள்ள வேண்டாம்; கீழே உள்ள குழந்தைகள் உதவி எண் அல்லது காவல் துறையைத் தொடர்புகொள்ளுங்கள். ஒரு ஆலோசகர் அல்லது பள்ளி ஆலோசகரும் குழந்தைக்கு உதவ முடியும்.'),
  // 6–12: feelings, bullying, friendship fights — supportive, no chart reading, always "tell a trusted adult".
  child_feelings: T(
    'Thank you for telling me how you feel. Feeling sad, scared or alone sometimes is okay — it happens to everyone, and it does not come from your stars. If someone is teasing or bullying you, it is not your fault. If you had a fight with a friend, take a little time to calm down, then talk kindly — saying sorry or forgiving helps friendships grow again. Please tell a grown-up you trust — Amma, Appa, a teacher or another trusted adult — today. If anyone hurts you or makes you feel unsafe, tell them straight away.',
    'உங்கள் உணர்வைச் சொன்னதற்கு நன்றி. சில நேரம் வருத்தம், பயம், தனிமை உணர்வது சரிதான் — எல்லோருக்கும் அப்படி நடக்கும்; அது உங்கள் நட்சத்திரத்தால் வருவதல்ல. யாராவது உங்களைக் கேலி செய்தாலோ துன்புறுத்தினாலோ, அது உங்கள் தவறு அல்ல. நண்பருடன் சண்டை வந்தால், கொஞ்சம் அமைதியாகி, பிறகு அன்பாகப் பேசுங்கள் — மன்னிப்பு கேட்பதும் மன்னிப்பதும் நட்பை மீண்டும் வளர்க்கும். இன்றே நம்பிக்கையான ஒரு பெரியவரிடம் — அம்மா, அப்பா, ஆசிரியர் அல்லது வேறு நம்பிக்கையான பெரியவர் — சொல்லுங்கள். யாராவது உங்களைக் காயப்படுத்தினாலோ பாதுகாப்பில்லாமல் உணரச் செய்தாலோ, உடனே அவர்களிடம் சொல்லுங்கள்.'),
  // System texts (server templates no_ai_notice / validation_fallback use these same texts).
  no_ai_notice: T(
    'Quick-answer mode: the detailed AI explanation is not available right now, so this answer comes only from the app\'s calculations and reviewed templates. It may not cover every part of your question.',
    'சுருக்கப் பதில் முறை: விரிவான AI விளக்கம் இப்போது கிடைக்கவில்லை; எனவே இந்தப் பதில் செயலியின் கணக்கீடுகள் மற்றும் சரிபார்க்கப்பட்ட வார்ப்புருக்களிலிருந்து மட்டுமே வருகிறது. உங்கள் கேள்வியின் எல்லாப் பகுதிகளுக்கும் இது பதில் தராமல் இருக்கலாம்.'),
  validation_fallback: T(
    'I could not prepare a fully checked answer this time, so I am not showing an unverified one. In general: a chart shows tendencies, not fixed fate. Steady effort, practical planning and good advice from people you trust matter most. A simple free practice — lighting a lamp or a short prayer — can bring calm. Please try again later.',
    'இந்த முறை முழுமையாகச் சரிபார்க்கப்பட்ட பதிலைத் தயாரிக்க முடியவில்லை; எனவே சரிபார்க்காத பதிலைக் காட்டவில்லை. பொதுவாக: ஜாதகம் போக்குகளைக் காட்டுகிறது, மாற்ற முடியாத விதியை அல்ல. தொடர்ந்த முயற்சி, நடைமுறைத் திட்டமிடல், நம்பிக்கையானவர்களின் நல்ல ஆலோசனை — இவையே முக்கியம். விளக்கேற்றுதல் அல்லது சிறு பிரார்த்தனை போன்ற எளிய இலவச வழிபாடு மன அமைதி தரும். சிறிது நேரம் கழித்து மீண்டும் முயலுங்கள்.'),
};

/** Visible label on every offline / rule-based answer. */
export const LIMITED_LABEL = T('Limited offline guidance', 'சுருக்க வழிகாட்டல் (இணையமின்றி)');
/** One short limits line kept on every offline answer. */
export const LIMITS_LINE = T('This is traditional guidance about tendencies, not a certainty — real-world advice and deadlines come first.', 'இது போக்குகள் பற்றிய பாரம்பரிய வழிகாட்டல் மட்டுமே, உறுதியல்ல — நடைமுறை ஆலோசனையும் உண்மையான காலக்கெடுகளும் முதன்மை.');

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
    prayer: T('Before exams, pray to Saraswathi and Hayagreevar; light a lamp on Thursdays for Dakshinamurthy.', 'தேர்வுக்கு முன் சரஸ்வதி, ஹயக்ரீவர் வழிபாடு; வியாழன்தோறும் தட்சிணாமூர்த்திக்குத் தீபம்.'),
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
      `${topicName(topic).ta} பற்றிய பலனுக்குப் பிறந்த தேதி தேவை. குடும்பம் பகுதியில் பிறந்த தேதியைச் சேர்க்கவும் — அதுவரை பொதுவான வழிகாட்டல் தருகிறேன்: இன்றைய நல்ல நேரம், கோவில், எளிய பிரார்த்தனை.`))] });
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

// ------------------------------------------------------------------ who is speaking, and who is being asked about
// The SAME lexicon the server policy uses (server/policy/lexicon.js re-exports these): numbers in words (English,
// Tamil script, Tanglish), "I am 14", "my girlfriend is 15", "a 15 year old girl", "15 வயது பெண்", "padhinanju vayasu".
// Deterministic and dependency-free so it runs on the phone with no network.

// Tamil letters/marks: JS \b does not work for Tamil script, so we use these lookarounds.
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

const EN_UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const EN_VARIANTS = { fiveteen: 15, fifthteen: 15, fiften: 15, fourten: 14, sixten: 16, seventen: 17, eigthteen: 18, eightteen: 18, ninteen: 19, thirten: 13, twelfe: 12, eighty: 80 };
const TA_WORDS = {
  'ஒன்று': 1, 'ஒன்னு': 1, 'இரண்டு': 2, 'ரெண்டு': 2, 'மூன்று': 3, 'மூணு': 3, 'நான்கு': 4, 'நாலு': 4, 'ஐந்து': 5, 'அஞ்சு': 5,
  'ஆறு': 6, 'ஏழு': 7, 'எட்டு': 8, 'ஒன்பது': 9, 'பத்து': 10, 'பதினொன்று': 11, 'பதினொரு': 11, 'பதினொன்னு': 11,
  'பன்னிரண்டு': 12, 'பன்னெண்டு': 12, 'பனிரெண்டு': 12, 'பதிமூன்று': 13, 'பதின்மூன்று': 13, 'பதிமூணு': 13,
  'பதினான்கு': 14, 'பதிநான்கு': 14, 'பதினாலு': 14, 'பதினைந்து': 15, 'பதினஞ்சு': 15, 'பதினாறு': 16, 'பதினேழு': 17,
  'பதினெட்டு': 18, 'பத்தொன்பது': 19, 'இருபது': 20, 'முப்பது': 30, 'நாற்பது': 40, 'நாப்பது': 40, 'ஐம்பது': 50,
  'அம்பது': 50, 'அறுபது': 60, 'எழுபது': 70, 'எண்பது': 80, 'தொண்ணூறு': 90,
};
const TA_TENS_PREFIX = { 'இருபத்தி': 20, 'இருபத்து': 20, 'முப்பத்தி': 30, 'முப்பத்து': 30, 'நாற்பத்தி': 40, 'நாற்பத்து': 40, 'ஐம்பத்தி': 50, 'ஐம்பத்து': 50, 'அறுபத்தி': 60, 'அறுபத்து': 60, 'எழுபத்தி': 70, 'எழுபத்து': 70, 'எண்பத்தி': 80, 'எண்பத்து': 80, 'தொண்ணூற்றி': 90, 'தொண்ணூற்று': 90 };
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
  const tens = Object.keys(EN_TENS).join('|');
  const units = EN_UNITS.slice(1, 10).join('|');
  s = s.replace(new RegExp(`\\b(${tens})[- ]?(${units})\\b`, 'g'), (_m, t, u) => String(EN_TENS[t] + EN_UNITS.indexOf(u)));
  s = s.replace(new RegExp(`\\b(${tens})\\b`, 'g'), (m) => String(EN_TENS[m]));
  s = s.replace(new RegExp(`\\b(${Object.keys(EN_VARIANTS).join('|')})\\b`, 'g'), (m) => String(EN_VARIANTS[m]));
  s = s.replace(new RegExp(`\\b(${EN_UNITS.slice(1).sort((a, b) => b.length - a.length).join('|')})\\b`, 'g'), (m) => String(EN_UNITS.indexOf(m)));
  const taUnits = Object.entries(TA_WORDS).filter(([, v]) => v < 10);
  for (const [pre, val] of Object.entries(TA_TENS_PREFIX)) {
    for (const [u, uv] of taUnits) s = s.replace(new RegExp(`${TB}${esc(pre)}\\s?${esc(u)}`, 'gu'), String(val + uv));
  }
  s = s.replace(/இருபத்தைந்து/g, '25').replace(/முப்பத்தைந்து/g, '35').replace(/நாற்பத்தைந்து/g, '45').replace(/எண்பத்தைந்து/g, '85');
  const taKeys = Object.keys(TA_WORDS).sort((a, b) => b.length - a.length).map(esc).join('|');
  s = s.replace(new RegExp(`${TB}(${taKeys})`, 'gu'), (m) => String(TA_WORDS[m]));
  const tgKeys = Object.keys(TG_WORDS).sort((a, b) => b.length - a.length).join('|');
  s = s.replace(new RegExp(`\\b(${tgKeys})\\b`, 'g'), (m) => String(TG_WORDS[m]));
  return s;
}

const AGE_UNIT = '(?:years?|yrs?|yr|y\\/o|yo|year-old|years-old)';
const EXCLUDE_AFTER = String.raw`(?!\s*(?:%|percent|kg|kgs|kilo|feet|ft|foot|inch|cm|rs|rupees|lakh|lakhs|crore|k\b|minutes?|mins?|hours?|hrs?|days?|weeks?|months?|km|times|of\b|th\b|st\b|nd\b|rd\b|pm|am|o'clock|'|"))`;

// Roles for other people. 'romantic' roles signal a romantic/sexual interest; 'child' roles are the speaker's own children.
const ROLE_GROUPS = {
  romantic: ['girlfriend', 'gf', 'boyfriend', 'bf', 'lover', 'crush', 'partner', 'fiance', 'fiancee', 'kadhali', 'kaadhali', 'kadhalan', 'kaadhalan', 'darling', 'sweetheart', 'aalu', 'காதலி', 'காதலன்'],
  child: ['daughter', 'son', 'kid', 'child', 'baby', 'grandson', 'granddaughter', 'magal', 'magan', 'pullai', 'kuzhandhai', 'kozhandha', 'மகள்', 'மகன்', 'குழந்தை', 'பேத்தி', 'பேரன்'],
  spouse: ['wife', 'husband', 'spouse', 'manaivi', 'purushan', 'kanavan', 'மனைவி', 'கணவர்', 'கணவன்'],
  other: ['girl', 'boy', 'she', 'he', 'her', 'him', 'student', 'neighbour', 'neighbor', 'niece', 'nephew', 'cousin', 'friend', 'person', 'lady', 'woman', 'man', 'teen', 'teenager', 'minor', 'schoolgirl', 'schoolboy', 'ponnu', 'ponna', 'ponnai', 'pennu', 'penna', 'paiyan', 'paiyana', 'payyan', 'aval', 'avan', 'avalukku', 'avanukku', 'pen', 'பெண்', 'பொண்ணு', 'பையன்', 'சிறுமி', 'சிறுவன்', 'மாணவி', 'மாணவன்', 'அவள்', 'அவன்', 'அவர்', 'ஆண்'],
};
const ROLE_OF = Object.fromEntries(Object.entries(ROLE_GROUPS).flatMap(([g, ws]) => ws.map((w) => [w, g])));
const LATIN_ROLES = Object.keys(ROLE_OF).filter((w) => /^[a-z]+$/.test(w)).sort((a, b) => b.length - a.length).join('|');
const TAMIL_ROLES = Object.keys(ROLE_OF).filter((w) => !/^[a-z]+$/.test(w)).sort((a, b) => b.length - a.length).map(esc).join('|');
const VAYA = '(?:vayasu|vayadhu|vayathu|vayasa|vayasaana|vayasana|வயது|வயசு|வயதான|வயதுடைய|வயதுப்|வயதாகும்|வயதாகிறது|வயதுதான்|வயசான)';
const PRONOUNS = new Set(['she', 'he', 'her', 'him', 'aval', 'avan']);
export const roleGroup = (word) => ROLE_OF[word] || 'other';

/** "wife-to-be", "would-be wife", "future husband" → fiancee / fiance (romantic). */
const unifyRoles = (s) => s
  .replace(/\b(wife|bride)[- ]to[- ]be\b|\b(would[- ]be|future|to[- ]be) (wife|bride)\b/g, 'fiancee')
  .replace(/\b(husband|groom)[- ]to[- ]be\b|\b(would[- ]be|future|to[- ]be) (husband|groom)\b/g, 'fiance');

/**
 * Ages stated in a message (normalised text; number words are converted here).
 * Returns [{ who: 'speaker'|'other', role, group, age, claimNow }].
 */
export function extractAges(normText) {
  const s = unifyRoles(wordsToDigits(normText));
  const out = [];
  const push = (who, age, role = null, claimNow = false) => {
    const n = Number(age);
    if (!Number.isFinite(n) || n < 0 || n > 120) return;
    out.push({ who, age: n, role, group: who === 'speaker' ? 'self' : roleGroup(role), claimNow });
  };
  let m;
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
  const selfTa = new RegExp(`(?:எனக்கு|நான்|என்\\s*வயது|என்னுடைய\\s*வயது|என் வயசு|enakku|ennaku|enaku|naan|nan|naa|en vayasu|en vayadhu|ennoda vayasu|enoda vayasu|en age|ennoda age)\\s*(?:ippo |இப்போ |இப்போது |ippa )?(\\d{1,3})\\s*${VAYA}?`, 'gu');
  while ((m = selfTa.exec(s))) {
    if (!/(வய|vayas|vayadh|vayath|age)/u.test(m[0])) continue; // an age word must be in the phrase
    push('speaker', m[1], null, /(ippo|இப்போ|ippa|now)/.test(m[0]));
  }
  const otherEn = new RegExp(`\\b(${LATIN_ROLES})\\b(?:'s age)?\\s*(?:is|was|who is|aged|age|of age|,|-|is only|is just|only|just)?\\s*(?:only |just |about |around )?(\\d{1,3})\\b${EXCLUDE_AFTER}`, 'g');
  while ((m = otherEn.exec(s))) {
    const before = s.slice(Math.max(0, m.index - 6), m.index);
    if (/\bi\s*$/.test(before)) continue;
    if (PRONOUNS.has(m[1]) && !/\b(is|was|aged|age)\b/.test(m[0])) continue;
    push('other', m[2], m[1]);
  }
  const otherEn2 = new RegExp(`\\b(\\d{1,3})\\s*[- ]?${AGE_UNIT}[- ]?(?:old)?\\s*(${LATIN_ROLES})?\\b`, 'g');
  while ((m = otherEn2.exec(s))) {
    const before = s.slice(Math.max(0, m.index - 14), m.index);
    if (/\b(i am|i'm|im|iam|am)\s*(a |an )?$/.test(before)) continue;
    if (!m[2] && !/\b(a|an|this|that|the|with|her|his|my|our)\s*$/.test(before)) continue;
    push('other', m[1], m[2] || 'person');
  }
  const otherTa = new RegExp(`(\\d{1,3})\\s*${VAYA}\\s*(${TAMIL_ROLES}|${LATIN_ROLES})`, 'gu');
  while ((m = otherTa.exec(s))) push('other', m[1], m[2]);
  const otherTa2 = new RegExp(`(${TAMIL_ROLES}|${LATIN_ROLES})[\\p{L}\\p{M}]*\\s*(?:ku|kku|க்கு|கு)?\\s*(\\d{1,3})\\s*${VAYA}`, 'gu');
  while ((m = otherTa2.exec(s))) push('other', m[2], m[1]);
  const seen = new Set();
  return out.filter((a) => { const k = `${a.who}|${a.age}|${a.group}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

// ------------------------------------------------------------------ romance / attraction wording (EN, Tamil, Tanglish)
const TA = (src) => new RegExp(src, 'u');
const PERSON = '(?:girl|boy|ponnu|paiyan|pen|lady|woman|man|teen|teenager|minor|schoolgirl|schoolboy|student|kid)';
const AGED = '(?:\\d{1,2}[- ]?(?:years?|yrs?|y\\/o|yo)(?:[- ]old)?)';
/** Shared with server/policy/intent-router.js. Tested on normalised text with numbers as digits. */
export const INTENT_PATTERNS = {
  romance: [
    /\b(fall(ing)? in love|in love|for love|find (my )?(true )?love|love life|love (life|marriage|affair|proposal|success|failure|match|her|him|someone|a girl|a boy|this girl|this boy)|(my|her|his|true|first) love|crush|romance|romantic|relationship|dating|date (her|him|someone|a girl|a boy|an? \d{1,2})|girlfriend|boyfriend|gf|bf|propose|kiss\w*|soul ?mate|lover|companion(ship)?|impress (her|him)|attract\w*|flirt\w*|pursue|woo|win (her|him) over|get (her|him) to like)\b/,
    TA('காதல்|காதலி|காதலன்|ப்ரபோஸ்|முத்தம்|ஈர்க்க'),
    /\b(kaa?dhal|kaa?thal|love pann\w*|propose pann\w*|lover|correct pann\w*|impress pann\w*)\b/,
  ],
  marriage: [
    /\b(marry|married|marriage|wedding|bride|groom|matrimon\w*|alliance|proposal|thali|engagement)\b/,
    TA('திருமண|கல்யாண|மணமகள்|மணமகன்|தாலி|நிச்சயதார்த்த|பொருத்தம்'),
    /\b(kalyaa?nam|thirumanam|ponnu paa?rk|maappillai|mapillai|nichayadhartham|porutham)\b/,
  ],
  sexual: [
    /\b(sex|sexual|sexy|intercourse|have sex|sleep(ing)? with|make love|hook ?up|physical relation\w*|get physical|intimate|intimacy|virgin\w*|nudes?|naked|porn\w*|horny|fuck\w*|f\*ck|bang (her|him)|first night|shanti muhur?th?am)\b/,
    TA('உடலுறவு|பாலுறவு|உறவு கொள்ள|தாம்பத்திய|நிர்வாண|முதலிரவு|சாந்தி முகூர்த்த'),
    /\b(udaluravu|sex pann\w*|first night|mudhal ?iravu|santhi muhur?th?am)\b/,
  ],
  // Liking / wanting / winning over a specific person — romance without the word "love" or "marry".
  attraction: [
    new RegExp(`\\bi (?:really |truly |so much |very much )?(?:like|love|want|fancy|adore|desire|miss|need)\\s+(?:her|him|(?:this|that|a|an|the)\\s+(?:${AGED}\\s*)?${PERSON}|(?:a|an|this|that|the)\\s+${AGED})`),
    /\bi('m| am) (attracted to|in love with|crazy about|into) /,
    /\b(love|like|marry|date|kiss|want|choose|accept) (me|us)\b|\bfall for me\b|\bbe mine\b|\bgo out with (me|her|him)\b/,
    /\b(she|he|aval|avan)\b[^.?!]{0,24}\b(will|would|going to|ever)?\s*(agree|say yes|accept me|come with me)\b(?!\s+to\s+(?!(marry|date|love|be with|go out|meet|kiss)))/,
    new RegExp(`\\b(help|make|let) me (with|get|win|have|impress|meet) (her|him|(?:a|an|this|that|the)\\s+(?:${AGED}\\s*)?${PERSON}|(?:a|an|this|that|the)\\s+${AGED})`),
    new RegExp(`\\b(?:kiss|date|marry|sleep with|have sex with|touch|hug|propose to|meet up with|be with|go out with|elope with|run away with) (?:a|an|this|that|the)\\s+${AGED}`),
    new RegExp(`\\b(?:win|woo|impress|charm|seduce|attract|pursue|chase) (?:over )?(?:her|him|(?:a|an|this|that|the)\\s+(?:${AGED}\\s*)?${PERSON}|(?:a|an|this|that|the)\\s+${AGED})`),
    new RegExp(`\\bget (?:her|him|(?:a|an|this|that|the)\\s+(?:${AGED}\\s*)?${PERSON}) to (love|like|marry|date|agree|accept|be with)`),
    TA('(எனக்கு|நான்)[^.?!]{0,40}(பிடிக்கும்|விரும்புகிறேன்|காதலிக்கிறேன்)|ஒப்புக்கொள்வாளா|ஒப்புக்கொள்வானா|சம்மதிப்பாளா|சம்மதிப்பானா|என்னை (காதலி|விரும்ப|ஏற்று|கல்யாணம்|திருமணம்)|எனக்குக் கிடைப்பாளா|கிடைப்பாளா|கிடைப்பானா'),
    /\b(enakku|enaku|naan|nan)\b[^.?!]{0,40}\b(pidikkum|pudikkum|pidikum|pudikum|virumbu\w*)\b|\b(ok solluva(la|na)?|othukkuva(la|na)|sammadhi\w*|kidaipaa?la|kidaippaa?la|set aa?guva(la|na))\b/,
  ],
  firstPersonRomance: [
    /\b(i|i'm|im|me|my|myself)\b[^.?!]{0,60}\b(marry|date|dating|love|pursue|sex|meet|propose|kiss|impress|attract|win|be with|sleep with|relationship|get her|get him|with her|with him)\b/,
    /\b(help me|can i|could i|should i|will i|for me to)\b[^.?!]{0,60}\b(her|him|girl|boy|she|he)\b/,
    TA('(நான்|எனக்கு|என்னை|என்னுடன்)[^.?!]{0,50}(திருமண|கல்யாண|காதல்|உறவு|சந்திக்க)'),
    /\b(naan|nan|enakku|ennai|ennoda|enaku)\b[^.?!]{0,50}(kalyaa?nam|kaa?dhal|love|sex|marry|kooda|meet)/,
    TA('(திருமணம் செய்யலாமா|கல்யாணம் (செய்யலாமா|பண்ணலாமா)|காதலிக்கலாமா|சந்திக்கலாமா)'),
    /\b((kalyaa?nam|love|marry|sex|meet) pann?alaa?ma|kaa?dhalikkalaa?ma)\b/,
  ],
  secrecy: [
    /\b(keep (it|this) (a )?secret|secretly|don'?t tell (anyone|your parents|my parents|her parents|his parents)|without (her|his|their|my) parents knowing|behind (her|his) parents)\b/,
    TA('ரகசியமாக|யாரிடமும் சொல்லாத|பெற்றோருக்குத் தெரியாமல்'),
    /\b(ragasiyama|rahasiyama|yaar ?kittayum sollatha|yaarukkum theriyama|veetla theriyama|secret ah)\b/,
  ],
  privateMeeting: [/\b(alone|in private|secretly|without (her|his) parents)\b/, TA('தனியாக|ரகசியமாக'), /\b(thaniya|ragasiyama|rahasiyama)\b/],
  // 6–12 feelings / bullying / friendship trouble.
  childFeelings: [
    /\b(sad|unhappy|cry(ing)?|cried|scared|afraid|lonely|alone|no friends?|bull(y|ied|ies|ying)|teas(e|ed|es|ing)|left out|nobody (likes|plays with) me|fight(ing)? with (my )?(friend|friends|classmate)|my friends? (fight|fought|hate|left)|angry with my friend|feel bad)\b/,
    TA('வருத்த|அழுகை|அழுகிறேன்|பயம்|பயமா|தனிமை|தனியா|சண்டை|கேலி|கிண்டல்|நண்பர்கள் இல்லை|யாரும் விளையாட'),
    /\b(kavalai|azhuga|azhuguren|bayam|bayama|thaniya|thanimai|sandai|chandai|kindal|keli|friends illa)\b/,
  ],
};
const any = (list, s) => list.some((re) => re.test(s));

/** Intent flags of one message (normalised + digits). */
export function intentFlags(text) {
  const s = wordsToDigits(normalizeText(text));
  const f = {};
  for (const [k, list] of Object.entries(INTENT_PATTERNS)) if (any(list, s)) f[k] = true;
  f.romanticOrSexual = Boolean(f.romance || f.sexual || f.marriage);
  return { s, flags: f };
}

const PRONOUN_FOLLOWUP = /\b(her|him|she|he|them)\b|அவள்|அவன்|\baval\b|\bavan\b/u;
/**
 * Facilitation and speaker-age check — runs FIRST, before any topic answer, on the phone and the server alike.
 *   text     the current question; turns: the person's earlier messages (oldest first), optional
 *   speaker  the age profile of the person typing when the app knows it (their own profile), else null
 * Returns null (ordinary question) or { route, templateId, band, age, reason } where route is
 *   'decline_facilitation'  adult / unknown-age speaker + romantic, sexual or attraction intent about a minor
 *   'safety_support'        a minor with an adult partner, or a child the speaker reports at risk
 *   'minor_speaker'         the speaker says they are under 18 (child / teen answers)
 *   'guardian_minor'        a third-party question about a minor's romance / marriage (no chart reading)
 */
export function facilitationCheck(text, { turns = [], speaker = null } = {}) {
  const cur = intentFlags(text);
  const earlier = (Array.isArray(turns) ? turns : []).filter((t) => typeof t === 'string' && t.trim() && t !== text).slice(-11).map((t) => ({ ...intentFlags(t), ages: extractAges(normalizeText(t)) }));
  const curAges = extractAges(normalizeText(text));
  const ages = [...earlier.flatMap((e) => e.ages), ...curAges];
  const f = cur.flags;
  const romanticMinor = (list) => list.some((a) => a.who === 'other' && a.age < ADULT_AGE && a.group === 'romantic');
  const stickyRomance = earlier.some((e) => e.flags.romanticOrSexual || e.flags.attraction || romanticMinor(e.ages));
  const speakerAges = ages.filter((a) => a.who === 'speaker').map((a) => a.age);
  const statedMinor = speakerAges.some((a) => a < ADULT_AGE);
  const profMinor = speaker?.minor === true;
  const minorSpeaker = statedMinor || profMinor;
  const speakerAge = statedMinor ? Math.min(...speakerAges) : profMinor ? speaker.age : null;
  const others = ages.filter((a) => a.who === 'other');
  const minorTargets = others.filter((a) => a.age < ADULT_AGE && a.group !== 'child');
  const minorChildren = others.filter((a) => a.age < ADULT_AGE && a.group === 'child');
  const adultActors = others.filter((a) => a.age >= ADULT_AGE && a.group !== 'child');
  // A romantic role for a minor in THIS message ("my girlfriend is 15") is romantic by itself; earlier turns carry
  // over only for follow-ups about them ("will my dasa help me with her?"), never for an unrelated question.
  const romantic = f.romanticOrSexual || f.attraction || romanticMinor(curAges)
    || (stickyRomance && minorTargets.length && (f.firstPersonRomance || PRONOUN_FOLLOWUP.test(cur.s)))
    || (minorTargets.length && (f.secrecy || f.privateMeeting));
  const out = (route, templateId, reason, extra = {}) => ({ route, templateId, reason, age: speakerAge, band: speakerAge != null ? guardBand(speakerAge) : minorSpeaker ? '13-17' : null, ...extra });

  if (romantic) {
    if (minorChildren.length && adultActors.length && !minorSpeaker) return out('safety_support', 'guardian_child_at_risk', 'adult_minor_relationship_reported');
    if (minorSpeaker && adultActors.length) return out('safety_support', 'teen_adult_partner', 'minor_speaker_adult_partner');
    if (minorTargets.length && !minorSpeaker) {
      const pursuing = f.firstPersonRomance || f.attraction || f.secrecy || f.privateMeeting || stickyRomance
        || minorTargets.some((p) => p.group === 'romantic' || p.group === 'spouse');
      if (pursuing) return out('decline_facilitation', 'decline_minor_facilitation', speaker?.adult ? 'adult_minor_facilitation' : 'unknown_age_minor_facilitation');
      return out('guardian_minor', f.marriage ? 'minor_marriage' : 'guardian_minor_romance', 'third_party_minor_romance_question');
    }
  }
  if (statedMinor) return out('minor_speaker', null, 'speaker_stated_minor_age', { romantic: Boolean(romantic), feelings: Boolean(f.childFeelings) });
  return null;
}

/** True when a 6–12 child's question is about feelings, bullying or a friendship fight. */
export const childFeelingsAsked = (text) => Boolean(intentFlags(text).flags.childFeelings);

/** Reviewed-text answer in the chat bubble shape (no meter, no chart, no periods). */
export function reviewedAnswer(id, { lang = 'ta', question = '', route = null, note = null } = {}) {
  const L = (o) => say(o, lang);
  const sections = [{ key: 'answer', title: L(T('Answer', 'பதில்')), lines: [L(REVIEWED_TEXT[id])] }];
  if (note) sections.push({ key: 'support', title: L(T('Support', 'உதவி')), lines: [L(note)] });
  return { intent: 'policy', policy: { route, templateId: id }, question, sections, meter: null, actions: [], followups: [], text: textOf(sections) };
}

const HELP_NOTE = T('If you are in India: Childline 1098 (children), Tele-MANAS 14416 (free counselling, 24×7). In an emergency call 112. Elsewhere, please use your local helplines.',
  'இந்தியாவில்: குழந்தைகள் உதவி எண் 1098, டெலி-மனஸ் 14416 (இலவச ஆலோசனை, 24×7). அவசரம் என்றால் 112. பிற நாடுகளில் உள்ளூர் உதவி எண்களைப் பயன்படுத்துங்கள்.');

/**
 * The on-device answer for a facilitation-check result (or null when the question is ordinary).
 * Minor speakers get the child / teen answer for what they asked; decline / safety routes get the reviewed text only.
 */
export function policyAnswer(check, { lang = 'ta', question = '', topic = null, name = '' } = {}) {
  if (!check) return null;
  if (check.route === 'decline_facilitation') return reviewedAnswer('decline_minor_facilitation', { lang, question, route: check.route });
  if (check.route === 'safety_support') return reviewedAnswer(check.templateId, { lang, question, route: check.route, note: HELP_NOTE });
  if (check.route === 'guardian_minor') return reviewedAnswer(check.templateId, { lang, question, route: 'teen_guidance', note: check.templateId === 'minor_marriage' ? HELP_NOTE : null });
  if (check.route === 'minor_speaker') {
    const profile = { age: check.age, band: check.band || '13-17', minor: true, adult: false, unknown: false, organization: false };
    if (profile.band === '6-12' && check.feelings) return reviewedAnswer('child_feelings', { lang, question, route: 'child_guidance' });
    const t = topic || (check.romantic ? 'love' : null);
    if (t && !topicAllowed(t, profile)) return { ...ageGuardAnswer({ topic: t, profile, lang, name, question }), policy: { route: profile.band === '13-17' ? 'teen_guidance' : 'child_guidance', templateId: null } };
    return { ...childGeneralAnswer({ profile, lang, name, question }), policy: { route: profile.band === '13-17' ? 'teen_guidance' : 'child_guidance', templateId: null } };
  }
  return null;
}
