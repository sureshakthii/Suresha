// Practical safeguards (நடைமுறைப் பாதுகாப்பு) — brief §26, §29.
// This is the PRACTICAL stream, kept fully separate from astrology: it never imports chart scores,
// periods, Prasnam verdicts or porutham results, and it rejects astrology evidence as an indicator.
// Cards are built only from what the user reports and from verified practical sources (e.g. a weather
// forecast with a checked-at time), so they look exactly the same on a "favourable" astrology day,
// for people without a chart, and for every gender.
import { travelAdvice } from './weather.js';
import { assertNoProhibited } from './themes.js';

const T = (en, ta) => ({ en, ta });

export const POLICY_VERSION = 'practical-safeguards-2026.10-v1';

/** Practical source catalogue. `verified` sources were named in the brief; others need ops verification. */
export const SAFEGUARD_SOURCES = {
  who_road_traffic: {
    id: 'who_road_traffic', verified: true,
    title: T('WHO — Road traffic injuries fact sheet', 'உலக சுகாதார அமைப்பு — சாலை விபத்துக் காயங்கள் தகவல்'),
    url: 'https://www.who.int/news-room/fact-sheets/detail/road-traffic-injuries',
  },
  rbi_digital_banking: {
    id: 'rbi_digital_banking', verified: true,
    title: T('Reserve Bank of India — Safeguards for digital banking', 'இந்திய ரிசர்வ் வங்கி — டிஜிட்டல் வங்கிப் பாதுகாப்பு'),
    url: 'https://rbikehtahai.rbi.org.in/safeguards-for-digital-banking.html',
  },
  open_meteo_forecast: {
    id: 'open_meteo_forecast', verified: true,
    title: T('Open-Meteo weather forecast', 'ஓபன்-மீட்டியோ வானிலை முன்னறிவிப்பு'),
    url: 'https://open-meteo.com/',
  },
  india_cybercrime: {
    id: 'india_cybercrime', verified: false, needsVerification: true,
    title: T('National Cyber Crime Reporting Portal (helpline 1930) — verify before release', 'தேசிய இணையக் குற்றப் புகார் தளம் (உதவி எண் 1930) — வெளியீட்டுக்கு முன் சரிபார்க்கவும்'),
    url: 'https://cybercrime.gov.in/',
  },
  india_emergency: {
    id: 'india_emergency', verified: false, needsVerification: true,
    title: T('Emergency number 112 (India) — verify for the user\'s location', 'அவசர உதவி எண் 112 (இந்தியா) — பயனரின் இடத்திற்குச் சரிபார்க்கவும்'),
    url: 'https://112.gov.in/',
  },
};

export const SITUATIONS = ['travel', 'relationship_money', 'relationship_boundaries'];

/** Practical indicators a user may report (all optional; ask minimally). */
export const INDICATORS = {
  travel: {
    long_drive: T('Long drive planned', 'நீண்ட தூரப் பயணம்'),
    night_driving: T('Driving at night', 'இரவுப் பயணம்'),
    driver_tired: T('Driver feels tired or sleepy', 'ஓட்டுநர் சோர்வு / தூக்கக் கலக்கம்'),
    alcohol_involved: T('Driver has had alcohol', 'ஓட்டுநர் மது அருந்தியுள்ளார்'),
    two_wheeler: T('Two-wheeler trip', 'இருசக்கர வாகனப் பயணம்'),
    children_or_elders: T('Children or elders travelling', 'குழந்தைகள் / பெரியோர் உடன் பயணம்'),
  },
  relationship_money: {
    pressure_to_transfer: T('Pressure to send money quickly', 'விரைவாகப் பணம் அனுப்ப அழுத்தம்'),
    secrecy_requested: T('Asked to keep it secret', 'ரகசியமாக வைக்கச் சொல்கிறார்கள்'),
    identity_not_verified: T('Identity not verified / only met online', 'அடையாளம் உறுதி செய்யப்படவில்லை / இணையத்தில் மட்டும் அறிமுகம்'),
    asked_for_credentials: T('Asked for OTP, PIN, password or banking details', 'OTP, PIN, கடவுச்சொல் அல்லது வங்கி விவரம் கேட்கப்பட்டது'),
    credentials_shared: T('OTP / password / card details already shared', 'OTP / கடவுச்சொல் / அட்டை விவரம் ஏற்கெனவே பகிரப்பட்டது'),
    investment_promise: T('Promise of unusually high or guaranteed returns', 'அளவுக்கு மீறிய அல்லது உறுதியான லாப வாக்குறுதி'),
  },
  relationship_boundaries: {
    feeling_pressured: T('Feeling pressured to decide or commit quickly', 'விரைவாக முடிவெடுக்க அழுத்தம்'),
    secrecy_requested: T('Asked to keep the relationship secret from family or friends', 'உறவை ரகசியமாக வைக்கச் சொல்கிறார்கள்'),
    money_requests: T('Repeated requests for money or gifts', 'பணம் / பரிசு திரும்பத் திரும்பக் கேட்பது'),
    monitoring_requested: T('Asked to share location, passwords or phone access', 'இருப்பிடம், கடவுச்சொல், கைப்பேசி அணுகல் கேட்பது'),
    consent_unclear: T('Unsure whether something is truly mutual', 'இது இருவரின் விருப்பமா என்ற சந்தேகம்'),
  },
};

/** Indicators that switch to the safety route (immediate practical help, no further astrology). */
export const SAFETY_ROUTE_INDICATORS = ['imminent_harm', 'abuse_suspected', 'severe_distress', 'urgent_medical'];

const ASTRO_WORDS = /(dasa|dasha|bhukti|antar|rahu|ketu|saturn|sani|shani|jupiter|guru ?balam|mars|chevvai|venus|moon|chandra|chandrashtam|ashtama|ezharai|sade ?sati|nakshatra|natchathira|star sign|rasi|rashi|lagna|horoscope|jathagam|jathakam|kundli|chart|planet|graha|transit|gochara|astrolog|porutham|dosha|dosham|tara ?bala|rahu ?kalam|yamagandam|kuligai|guligai|horai|hora|prasna|muhurth|panchang|tithi|yoga|ஜாதக|தசை|புக்தி|ராகு|கேது|சனி|குரு|செவ்வாய்|சந்திர|நட்சத்திர|ராசி|லக்ன|கிரக|கோசார|தோஷ|பொருத்த|பிரசன்ன|முகூர்த்த)/i;

/** True when an indicator is astrology evidence (string, or object marked as such) — never accepted here. */
export function isAstrologyEvidence(indicator) {
  if (indicator == null) return false;
  if (typeof indicator === 'object') {
    if (['astrology', 'chart', 'prasna', 'porutham', 'dasa', 'transit'].includes(String(indicator.source || indicator.kind || '').toLowerCase())) return true;
    return isAstrologyEvidence(indicator.id || indicator.name || '');
  }
  return ASTRO_WORDS.test(String(indicator));
}

/** Throws if any astrology evidence is offered as a practical-risk indicator. */
export function assertPracticalOnly(indicators = []) {
  const bad = indicators.filter(isAstrologyEvidence);
  if (bad.length) throw new TypeError(`Astrology evidence is not accepted as a practical-risk indicator: ${bad.map((b) => (typeof b === 'string' ? b : JSON.stringify(b))).join(', ')}`);
  return true;
}

function sortIndicators(situationId, indicators) {
  const known = INDICATORS[situationId] || {};
  const accepted = [], rejected = [];
  for (const raw of indicators || []) {
    const id = typeof raw === 'string' ? raw : raw?.id;
    // Free text is never echoed back (it may contain an accusation or private details); only safe ids are.
    const safeId = typeof id === 'string' && /^[a-z0-9_]{1,40}$/.test(id) ? id : '[redacted]';
    if (isAstrologyEvidence(raw)) rejected.push({ indicator: safeId, reason: 'astrology-evidence-not-accepted' });
    else if (known[id] || SAFETY_ROUTE_INDICATORS.includes(id)) { if (!accepted.includes(id)) accepted.push(id); }
    else rejected.push({ indicator: safeId, reason: 'unknown-indicator' });
  }
  return { accepted, rejected };
}

const action = (id, en, ta, priority = 'always') => ({ id, priority, en, ta });

const NEVER_ASK = [
  T('Thunai never asks for your OTP, PIN, password, card number, account statement or private messages.',
    'துணை உங்கள் OTP, PIN, கடவுச்சொல், அட்டை எண், கணக்கு அறிக்கை அல்லது தனிப்பட்ட செய்திகளை ஒருபோதும் கேட்காது.'),
];

const ASTROLOGY_SEPARATION = T(
  'This card uses only what you tell us and checked practical sources. It is the same on every day, whatever any chart or period says.',
  'இந்த அட்டை நீங்கள் சொல்வதையும் சரிபார்க்கப்பட்ட நடைமுறைத் தகவல்களையும் மட்டுமே பயன்படுத்துகிறது. எந்த ஜாதகமும் காலமும் எதைச் சொன்னாலும், ஒவ்வொரு நாளும் இது ஒரே மாதிரியானது.');

// Respectful replacements for fear-based phrases (§26 Tamil examples — native review pending).
export const RESPECTFUL_WORDING = {
  newRelationsMoney: T(
    'In new relationships, do not rush — let trust grow slowly. Verify details before sending money. Never share an OTP or banking secrets with anyone.',
    'புதிய உறவுகளில் அவசரப்படாமல், நம்பிக்கையை மெதுவாக வளர்த்துக்கொள்ளுங்கள். பணம் அனுப்பும் முன் தகவல்களைச் சரிபார்க்கவும். யாரிடமும் OTP அல்லது வங்கி ரகசிய விவரங்களைப் பகிர வேண்டாம்.'),
  travel: T(
    'A horoscope cannot predict road accidents with certainty. On the road, keep to the speed limit, wear a seat belt or helmet, and rest enough.',
    'ஜாதகத்திலிருந்து விபத்து நடக்கும் என்று உறுதியாகக் கூற முடியாது. பயணத்தில் வேகக் கட்டுப்பாடு, சீட் பெல்ட் அல்லது ஹெல்மெட், போதிய ஓய்வு ஆகியவற்றைக் கவனியுங்கள்.'),
  newAcquaintances: T(
    'If a new acquaintance brings pressure about money, secrecy or a quick decision, slow down, verify and then decide.',
    'புதிய அறிமுகங்களில் பணம், ரகசியம் அல்லது விரைவான முடிவுக்கான அழுத்தம் இருந்தால், நிதானமாகச் சரிபார்த்து முடிவு செய்யுங்கள்.'),
};
export const NATIVE_REVIEW_STATUS = 'tamil-wording-pending-native-review';

function safetyRoute(accepted) {
  const hit = accepted.filter((x) => SAFETY_ROUTE_INDICATORS.includes(x));
  if (!hit.length) return null;
  return {
    route: 'age-aware-safety',
    indicators: hit,
    message: T('If anyone is in immediate danger or needs urgent medical help, contact local emergency services now (112 in India). You do not need to check any chart first.',
      'யாருக்காவது உடனடி ஆபத்து அல்லது அவசர மருத்துவ உதவி தேவைப்பட்டால், இப்போதே உள்ளூர் அவசர சேவையைத் தொடர்பு கொள்ளுங்கள் (இந்தியாவில் 112). எந்த ஜாதகத்தையும் முதலில் பார்க்க வேண்டியதில்லை.'),
    sourceIds: ['india_emergency'],
  };
}

function base(situationId, title, icon, { accepted, rejected }, locale, now) {
  return {
    situationId,
    cardId: `safeguard.${situationId}`,
    title, icon,
    policyVersion: POLICY_VERSION,
    locale: locale === 'ta' ? 'ta' : 'en',
    generatedAt: now.toISOString(),
    userReportedIndicators: accepted,
    rejectedIndicators: rejected,
    verifiedSourceIds: [],
    sourceCheckedAt: null,
    recommendedActions: [],
    urgencyFromPracticalEvidence: 'routine',
    alert: null,
    safetyRoute: safetyRoute(accepted),
    usesAstrology: false,
    separationNote: ASTROLOGY_SEPARATION,
    neverAsk: NEVER_ASK,
    nativeReviewStatus: NATIVE_REVIEW_STATUS,
  };
}

/** Severe-weather alert from a verified forecast (mapForecast shape + checkedAt). Null if not verified. */
function weatherAlert(weather) {
  if (!weather || !weather.checkedAt) return null;
  const today = weather.today || weather.daily?.[0];
  const adv = travelAdvice(weather.current, today);
  if (adv.level === 'good') return { level: 'good', checkedAt: weather.checkedAt, reasons: [] };
  return { level: adv.level, checkedAt: weather.checkedAt, reasons: adv.reasons };
}

function travelCard(ind, { weather, locale, now }) {
  const c = base('travel', T('Travel safety', 'பயணப் பாதுகாப்பு'), '🚗', ind, locale, now);
  const a = ind.accepted;
  c.recommendedActions.push(
    action('restraint', 'Wear a seat belt in every seat; on two-wheelers, a fastened helmet for rider and pillion.', 'ஒவ்வொரு இருக்கையிலும் சீட் பெல்ட்; இருசக்கர வாகனத்தில் ஓட்டுநருக்கும் பின்னால் அமர்பவருக்கும் கட்டப்பட்ட ஹெல்மெட்.'),
    action('speed', 'Keep to the legal speed limit and slow down in rain, fog and crowds.', 'சட்டப்படியான வேக வரம்பைப் பின்பற்றுங்கள்; மழை, மூடுபனி, கூட்டத்தில் வேகத்தைக் குறையுங்கள்.'),
    action('sober', 'Drive only when sober — no alcohol or drugs before or during the drive.', 'போதையில்லாமல் மட்டுமே ஓட்டுங்கள் — பயணத்திற்கு முன்னும் பயணத்தின்போதும் மது, போதைப்பொருள் வேண்டாம்.'),
    action('phone', 'Keep the phone away while driving; let a passenger navigate or stop safely to check.', 'ஓட்டும்போது கைப்பேசியைத் தள்ளி வையுங்கள்; வழிகாட்டலைப் பயணியிடம் விடுங்கள் அல்லது பாதுகாப்பாக நிறுத்திப் பாருங்கள்.'),
    action('rest', 'Rest when tired — take a break every two hours on long drives.', 'சோர்வாக இருந்தால் ஓய்வெடுங்கள் — நீண்ட பயணத்தில் இரண்டு மணி நேரத்திற்கு ஒருமுறை இடைவேளை.'),
  );
  c.verifiedSourceIds.push('who_road_traffic');
  if (a.includes('alcohol_involved')) {
    c.urgencyFromPracticalEvidence = 'urgent';
    c.recommendedActions.unshift(action('no_drive_alcohol', 'Do not drive after drinking. Choose a sober driver, a taxi or public transport.', 'மது அருந்திய பின் வாகனம் ஓட்ட வேண்டாம். போதையில்லாத ஓட்டுநர், டாக்ஸி அல்லது பொதுப் போக்குவரத்தைத் தேர்ந்தெடுங்கள்.', 'now'));
  }
  if (a.includes('driver_tired')) {
    if (c.urgencyFromPracticalEvidence === 'routine') c.urgencyFromPracticalEvidence = 'elevated';
    c.recommendedActions.unshift(action('tired_stop', 'Feeling sleepy? Stop somewhere safe and rest, or hand over to a rested driver.', 'தூக்கக் கலக்கமா? பாதுகாப்பான இடத்தில் நிறுத்தி ஓய்வெடுங்கள் அல்லது ஓய்வான ஓட்டுநரிடம் கொடுங்கள்.', 'now'));
  }
  if (a.includes('children_or_elders')) c.recommendedActions.push(action('child_seat', 'Use a suitable child seat and plan comfort stops for elders.', 'குழந்தைக்கு ஏற்ற இருக்கை; பெரியோருக்கு ஓய்வு நிறுத்தங்களைத் திட்டமிடுங்கள்.', 'context'));
  if (a.includes('night_driving') || a.includes('long_drive')) c.recommendedActions.push(action('plan_route', 'Share your route and arrival time with family; start early so you are not rushing.', 'உங்கள் வழியையும் வரும் நேரத்தையும் குடும்பத்திடம் பகிருங்கள்; அவசரப்படாமல் இருக்க முன்னதாகவே புறப்படுங்கள்.', 'context'));
  const wa = weatherAlert(weather);
  if (weather && !wa) c.weatherStatus = T('Weather needs checking — no verified forecast time was supplied.', 'வானிலையைச் சரிபார்க்க வேண்டும் — சரிபார்த்த நேரத்துடன் முன்னறிவிப்பு இல்லை.');
  if (wa) {
    c.verifiedSourceIds.push('open_meteo_forecast');
    c.sourceCheckedAt = new Date(wa.checkedAt).toISOString();
    if (wa.level !== 'good') {
      if (c.urgencyFromPracticalEvidence === 'routine') c.urgencyFromPracticalEvidence = 'elevated';
      c.alert = {
        kind: 'weather', level: wa.level, reasons: wa.reasons,
        ...T('Verified forecast shows difficult weather — consider changing the time or route, and drive slowly with lights on.',
          'சரிபார்க்கப்பட்ட முன்னறிவிப்பு கடினமான வானிலையைக் காட்டுகிறது — நேரம் அல்லது வழியை மாற்றுவதைப் பரிசீலியுங்கள்; விளக்குகளுடன் மெதுவாக ஓட்டுங்கள்.'),
      };
    }
  }
  if (c.safetyRoute) c.urgencyFromPracticalEvidence = 'urgent';
  c.respectfulGuidance = RESPECTFUL_WORDING.travel;
  return c;
}

function moneyCard(ind, { locale, now }) {
  const c = base('relationship_money', T('Relationships & money', 'உறவுகளும் பணமும்'), '💸', ind, locale, now);
  const a = ind.accepted;
  c.recommendedActions.push(
    action('pause_transfer', 'Pause any transfer you have not verified — a genuine person can wait a day.', 'சரிபார்க்காத எந்தப் பணப் பரிமாற்றத்தையும் நிறுத்தி வையுங்கள் — உண்மையானவர் ஒரு நாள் காத்திருப்பார்.'),
    action('verify', 'Verify identity independently: call back on a number you already know, or meet with family present.', 'அடையாளத்தைத் தனியாகச் சரிபாருங்கள்: உங்களுக்கு ஏற்கெனவே தெரிந்த எண்ணில் அழையுங்கள் அல்லது குடும்பத்தினருடன் சந்தியுங்கள்.'),
    action('no_credentials', 'Never share an OTP, PIN, password or card details with anyone — not even someone claiming to be from a bank.', 'OTP, PIN, கடவுச்சொல், அட்டை விவரங்களை யாரிடமும் பகிர வேண்டாம் — வங்கியிலிருந்து பேசுவதாகச் சொல்பவரிடமும் கூட.'),
    action('talk', 'Talk it over with someone you trust before deciding.', 'முடிவெடுக்கும் முன் நம்பிக்கையானவரிடம் பேசுங்கள்.'),
  );
  c.verifiedSourceIds.push('rbi_digital_banking');
  if (a.includes('credentials_shared')) {
    c.urgencyFromPracticalEvidence = 'urgent';
    c.recommendedActions.unshift(action('contact_bank', 'Contact your bank now through its official number or app to block cards and change passwords; report the fraud (1930 / cybercrime.gov.in in India).', 'அதிகாரப்பூர்வ எண் அல்லது செயலி மூலம் உடனே உங்கள் வங்கியைத் தொடர்பு கொண்டு அட்டைகளை முடக்கி, கடவுச்சொற்களை மாற்றுங்கள்; மோசடியைப் புகாரளியுங்கள் (இந்தியாவில் 1930 / cybercrime.gov.in).', 'now'));
    c.verifiedSourceIds.push('india_cybercrime');
  } else if (['pressure_to_transfer', 'asked_for_credentials', 'secrecy_requested', 'investment_promise'].some((x) => a.includes(x))) {
    c.urgencyFromPracticalEvidence = 'elevated';
  }
  if (c.safetyRoute) c.urgencyFromPracticalEvidence = 'urgent';
  c.behaviourNote = T('These are warning behaviours, not a judgement of any person. A horoscope can never show that someone is a fraudster.',
    'இவை எச்சரிக்கை நடத்தைகள் மட்டுமே, எந்த நபரைப் பற்றிய தீர்ப்பும் அல்ல. ஒருவர் மோசடிக்காரர் என்பதை ஜாதகம் ஒருபோதும் காட்ட முடியாது.');
  c.respectfulGuidance = [RESPECTFUL_WORDING.newRelationsMoney, RESPECTFUL_WORDING.newAcquaintances];
  return c;
}

function boundariesCard(ind, { locale, now }) {
  const c = base('relationship_boundaries', T('Relationship boundaries', 'உறவில் எல்லைகள்'), '🤝', ind, locale, now);
  const a = ind.accepted;
  c.recommendedActions.push(
    action('consent', 'Every step should be freely agreed by both people; either person can say no or pause at any time.', 'ஒவ்வொரு அடியும் இருவரின் முழு விருப்பத்துடன் இருக்க வேண்டும்; யார் வேண்டுமானாலும் எப்போது வேண்டுமானாலும் வேண்டாம் / நிறுத்து என்று சொல்லலாம்.'),
    action('honesty', 'Be honest about expectations, and ask openly rather than check secretly.', 'எதிர்பார்ப்புகளைப் பற்றி நேர்மையாகப் பேசுங்கள்; ரகசியமாகக் கண்காணிப்பதை விட நேரடியாகக் கேளுங்கள்.'),
    action('pacing', 'Go at a pace that feels comfortable to both; pressure to rush is a reason to slow down.', 'இருவருக்கும் வசதியான வேகத்தில் செல்லுங்கள்; அவசரப்படுத்தும் அழுத்தம் நிதானிக்க வேண்டிய அறிகுறி.'),
    action('money_boundaries', 'Agree clear money boundaries early: no loans or shared accounts until trust is well established.', 'பண எல்லைகளை முன்பே தெளிவாகப் பேசுங்கள்: நம்பிக்கை நன்கு வளரும் வரை கடன், கூட்டுக் கணக்கு வேண்டாம்.'),
  );
  if (a.includes('monitoring_requested')) c.recommendedActions.push(action('privacy', 'You do not have to share passwords, location or phone access to prove love or loyalty.', 'அன்பையோ நம்பிக்கையையோ நிரூபிக்க கடவுச்சொல், இருப்பிடம், கைப்பேசி அணுகலைப் பகிர வேண்டியதில்லை.', 'context'));
  if (['feeling_pressured', 'money_requests', 'monitoring_requested', 'secrecy_requested'].some((x) => a.includes(x))) c.urgencyFromPracticalEvidence = 'elevated';
  if (c.safetyRoute) c.urgencyFromPracticalEvidence = 'urgent';
  c.noAstrologyConfrontation = T('Please do not confront or monitor anyone because of a chart reading — talk openly or seek a counsellor if you are worried.',
    'ஜாதகத்தை வைத்து யாரையும் எதிர்கொள்ளவோ கண்காணிக்கவோ வேண்டாம் — கவலையிருந்தால் வெளிப்படையாகப் பேசுங்கள் அல்லது ஆலோசகரை அணுகுங்கள்.');
  c.genderNeutral = true;
  c.respectfulGuidance = RESPECTFUL_WORDING.newAcquaintances;
  return c;
}

const BUILDERS = { travel: travelCard, relationship_money: moneyCard, relationship_boundaries: boundariesCard };

/**
 * One practical safeguard card.
 * situationId: 'travel' | 'relationship_money' | 'relationship_boundaries'.
 * opts: indicators (array of indicator ids — astrology evidence is rejected), weather (mapForecast shape
 * with `checkedAt`, optional), locale ('en' | 'ta'), now (Date).
 * Any other option (for example a chart, dasa or Prasnam verdict) is ignored by design.
 */
export function safeguardCard(situationId, { indicators = [], weather = null, locale = 'en', now = new Date() } = {}) {
  const build = BUILDERS[situationId];
  if (!build) throw new Error(`Unknown safeguard situation: ${situationId}`);
  const ind = sortIndicators(situationId, indicators);
  const card = build(ind, { weather, locale, now });
  card.sources = card.verifiedSourceIds.map((id) => SAFEGUARD_SOURCES[id]);
  return assertNoProhibited(card);
}

/** All three cards — always available, with or without a chart. indicators may be keyed by situation. */
export function practicalSafeguards({ indicators = {}, weather = null, locale = 'en', now = new Date() } = {}) {
  return SITUATIONS.map((id) => safeguardCard(id, { indicators: Array.isArray(indicators) ? indicators : indicators[id] || [], weather: id === 'travel' ? weather : null, locale, now }));
}
