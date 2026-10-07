// Health Guide (ஆரோக்கிய வழிகாட்டி) — two clearly separated parts (owner checklist §5):
//  1. பொது நலம் / General wellbeing (not astrology): sleep, water, walking, regular age-wise check-ups and "see a
//     doctor for any symptom". Every item needs qualified medical review before release (needsMedicalReview) — no
//     diagnosis, no treatment, no food or activity restrictions.
//  2. மரபுச் சிந்தனை / Traditional reflection (optional): spiritual practices only (prayer, lamp, mantra, a calm
//     routine) linked to the running Dasa / Bhukti and Gochara. It is explicitly NOT health advice.
// Nothing here derives diet, body-part warnings, disease, reproductive or lifespan inferences from a horoscope.
import { PLANETS, planetPositions } from './astro.js';
import { NAVAGRAHA } from './remedies.js';

const T = (en, ta) => ({ en, ta });
const YEAR = 365.25 * 86400000;
const houseOf = (from, to) => ((to - from + 12) % 12) + 1;

export const HEALTH_POLICY_VERSION = 'health-split-2026.10-v2';
export const HEALTH_FLAGS = Object.freeze({
  generalWellbeingSeparate: true,
  astrologyIsTraditionalContextOnly: true,
  traditionalContextOptional: true,
  notMedicalAdvice: true,
  canDriveTreatment: false,
  diseaseInference: false,
  reproductiveInference: false,
  lifespanInference: false,
  dietFromAstrology: false,
  bodyPartWarningsFromAstrology: false,
  screeningNeedsMedicalReview: true,
});
export const SCREENING_SOURCE = Object.freeze({
  id: 'clinical-screening-source-pending',
  status: 'needs-medical-review',
  title: { en: 'Clinical source pending — to be added after qualified medical review', ta: 'மருத்துவ ஆதாரம் நிலுவையில் — தகுதியான மருத்துவ மதிப்பாய்விற்குப் பின் சேர்க்கப்படும்' },
  url: null,
  lastReviewed: null,
});
export const NEEDS_MEDICAL_REVIEW = T('Needs medical review', 'மருத்துவ மதிப்பாய்வு தேவை');
// ------------------------------------------------------------------ age & life stage
export const HEALTH_STAGES = [
  { id: 'child', max: 13, ...T('Childhood', 'குழந்தைப் பருவம்') },
  { id: 'youth', max: 25, ...T('Youth', 'இளமைப் பருவம்') },
  { id: 'adult', max: 40, ...T('Adult years', 'முழு வளர்ச்சிப் பருவம்') },
  { id: 'midlife', max: 55, ...T('Mid-life', 'நடுத்தர வயது') },
  { id: 'senior', max: 70, ...T('Senior years', 'மூத்த பருவம்') },
  { id: 'elder', max: 200, ...T('Elder years', 'முதுமைப் பருவம்') },
];

// Each check: age range [min, max), optional gender. "Discuss with your doctor" is shown with the list.
const CHECKS = [
  { min: 0, max: 13, ...T('Yearly growth, weight and height check with the paediatrician', 'ஆண்டுதோறும் வளர்ச்சி, எடை, உயரம் — குழந்தை மருத்துவரிடம் பரிசோதனை') },
  { min: 0, max: 13, ...T('Vaccinations as per the schedule', 'அட்டவணைப்படி தடுப்பூசிகள்') },
  { min: 3, max: 25, ...T('Eye check-up every year', 'ஆண்டுதோறும் கண் பரிசோதனை') },
  { min: 2, max: 200, ...T('Dental check-up every 6 months', 'ஆறு மாதத்திற்கு ஒருமுறை பல் பரிசோதனை') },
  { min: 0, max: 13, ...T('One hour of outdoor play; limit screen time', 'தினமும் ஒரு மணி நேரம் வெளியில் விளையாட்டு; திரை நேரம் குறைவு') },
  { min: 0, max: 13, ...T('9–11 hours of sleep', '9–11 மணி நேரம் உறக்கம்') },
  { min: 13, max: 25, ...T('Posture: straight back while studying and using the phone', 'உட்காரும் நிலை: படிக்கும்போதும் கைப்பேசி பயன்படுத்தும்போதும் நேரான முதுகு') },
  { min: 13, max: 40, ...T('Screen breaks: every 20 minutes look 20 feet away for 20 seconds', 'திரை இடைவெளி: 20 நிமிடத்திற்கு ஒருமுறை 20 அடி தூரம் 20 விநாடி பாருங்கள்') },
  { min: 13, max: 40, ...T('7–9 hours of sleep at a fixed time', 'குறித்த நேரத்தில் 7–9 மணி நேரம் உறக்கம்') },
  { min: 13, max: 40, ...T('Blood test for haemoglobin (iron) and Vitamin D', 'ரத்தச் சோகை (இரும்புச்சத்து), வைட்டமின் டி ரத்தப் பரிசோதனை') },
  { min: 13, max: 25, gender: 'female', ...T('Menstrual health — talk to a doctor about any irregularity', 'மாதவிடாய் ஆரோக்கியம் — ஒழுங்கின்மை இருந்தால் மருத்துவரிடம் பேசுங்கள்') },
  { min: 13, max: 200, ...T('Mental wellbeing — talk openly with family; seek help when low', 'மன நலம் — குடும்பத்துடன் மனம் விட்டுப் பேசுங்கள்; சோர்வாக இருந்தால் உதவி நாடுங்கள்') },
  { min: 25, max: 40, ...T('Blood pressure and fasting sugar once a year', 'ஆண்டுக்கு ஒருமுறை ரத்த அழுத்தம், வெறும் வயிற்றுச் சர்க்கரை') },
  { min: 25, max: 40, ...T('Weight and waist measurement; cholesterol every 3–5 years', 'எடை, இடுப்பு அளவு; 3–5 ஆண்டுக்கு ஒருமுறை கொலஸ்ட்ரால்') },
  { min: 25, max: 200, ...T('Thyroid test if tired, gaining weight or losing hair', 'சோர்வு, எடை அதிகரிப்பு, முடி உதிர்வு இருந்தால் தைராய்டு பரிசோதனை') },
  { min: 25, max: 65, gender: 'female', ...T('Cervical (Pap) screening every 3–5 years', '3–5 ஆண்டுக்கு ஒருமுறை கருப்பை வாய்ப் பரிசோதனை') },
  { min: 40, max: 200, ...T('Blood pressure check every year', 'ஆண்டுதோறும் ரத்த அழுத்தப் பரிசோதனை') },
  { min: 40, max: 200, ...T('Sugar test with HbA1c (3-month average) every year', 'ஆண்டுதோறும் மூன்று மாதச் சர்க்கரை சராசரி பரிசோதனை') },
  { min: 40, max: 200, ...T('Cholesterol (lipid profile) every year', 'ஆண்டுதோறும் கொலஸ்ட்ரால் பரிசோதனை') },
  { min: 40, max: 200, ...T('Eye check-up with eye pressure (glaucoma) test', 'கண் அழுத்தப் பரிசோதனையுடன் கண் பரிசோதனை') },
  { min: 40, max: 200, gender: 'female', ...T('Breast check — mammogram as advised', 'மருத்துவர் ஆலோசனைப்படி மார்பகப் பரிசோதனை') },
  { min: 50, max: 200, gender: 'female', ...T('Bone density test after 50', '50 வயதுக்குப் பின் எலும்பு அடர்த்திப் பரிசோதனை') },
  { min: 50, max: 200, ...T('Colon screening as advised', 'மருத்துவர் ஆலோசனைப்படி பெருங்குடல் பரிசோதனை') },
  { min: 50, max: 200, ...T('Heart check — ECG, and TMT if advised', 'இதயப் பரிசோதனை — இதய மின் வரைபடம், தேவைப்பட்டால் நடைப்பயிற்சிப் பரிசோதனை') },
  { min: 50, max: 200, gender: 'male', ...T('Prostate check — discuss after 50', '50 வயதுக்குப் பின் புராஸ்டேட் சுரப்பி பரிசோதனை பற்றிப் பேசுங்கள்') },
  { min: 55, max: 200, ...T('Kidney function and urine test every year', 'ஆண்டுதோறும் சிறுநீரகச் செயல்பாடு, சிறுநீர்ப் பரிசோதனை') },
  { min: 60, max: 200, ...T('Hearing check', 'காது கேட்கும் திறன் பரிசோதனை') },
  { min: 60, max: 200, ...T('Memory check — puzzles, reading and conversation every day', 'நினைவுத்திறன் பரிசோதனை — தினமும் புதிர், வாசிப்பு, உரையாடல்') },
  { min: 60, max: 200, ...T('Fall prevention — good lighting, grab rails, non-slip floor and footwear', 'விழாமல் காக்க — நல்ல வெளிச்சம், பிடிகம்பி, வழுக்காத தரை, காலணி') },
  { min: 60, max: 200, ...T('Vaccines for flu and pneumonia — ask your doctor', 'காய்ச்சல், நிமோனியா தடுப்பூசி — மருத்துவரிடம் கேளுங்கள்') },
  { min: 70, max: 200, ...T('Review all medicines with the doctor every 6 months', 'ஆறு மாதத்திற்கு ஒருமுறை எல்லா மருந்துகளையும் மருத்துவரிடம் சரிபார்க்கவும்') },
  { min: 70, max: 200, ...T('Enough protein and water every day', 'தினமும் போதுமான புரதச்சத்து, தண்ணீர்') },
];

// ------------------------------------------------------------------ yoga
const Y = {
  play: T('Outdoor play or cycling for an hour', 'ஒரு மணி நேரம் வெளியில் விளையாட்டு அல்லது சைக்கிள்'),
  suryaKids: T('5 rounds of Surya Namaskaram, slowly', 'மெதுவாக 5 சுற்று சூரிய நமஸ்காரம்'),
  breathGame: T('Balloon breathing — slow breath in, long breath out (5 minutes)', 'பலூன் சுவாசம் — மெதுவாக உள்ளிழுத்து நீளமாக வெளியே விடுதல் (5 நிமிடம்)'),
  surya: T('12 rounds of Surya Namaskaram in the morning', 'காலையில் 12 சுற்று சூரிய நமஸ்காரம்'),
  sport: T('Brisk walk, sport or run — 30 minutes', 'வேக நடை, விளையாட்டு அல்லது ஓட்டம் — 30 நிமிடம்'),
  nadi: T('Nadi Shodhana (alternate-nostril breathing) — 10 minutes', 'நாடி சுத்தி பிராணாயாமம் — 10 நிமிடம்'),
  bhramari: T('Bhramari (humming bee breath) for calm sleep', 'நல்ல உறக்கத்திற்கு பிரமரி (வண்டு ரீங்கார) சுவாசம்'),
  walk40: T('Brisk walk 40 minutes, 5 days a week', 'வாரம் 5 நாள், 40 நிமிட வேக நடை'),
  vajra: T('Vajrasana for 5 minutes after meals', 'உணவுக்குப் பின் 5 நிமிடம் வஜ்ராசனம்'),
  stretch: T('Gentle stretching for back and knees', 'முதுகு, முழங்காலுக்கு மென்மையான நீட்சிப் பயிற்சி'),
  walkGentle: T('Gentle walk 20–30 minutes in the morning', 'காலையில் 20–30 நிமிட மென்மையான நடை'),
  chair: T('Chair yoga — seated stretches and ankle circles', 'நாற்காலி யோகா — அமர்ந்தபடி நீட்சி, கணுக்கால் சுழற்சி'),
  deep: T('Slow deep breathing — 10 breaths, three times a day', 'மெதுவான ஆழ்ந்த சுவாசம் — தினமும் மூன்று முறை 10 மூச்சு'),
  sun: T('Sit in the gentle morning sun for 15 minutes', 'காலை இளவெயிலில் 15 நிமிடம் அமர்தல்'),
  balance: T('Balance practice holding a wall or chair', 'சுவர் அல்லது நாற்காலியைப் பிடித்தபடி சமநிலைப் பயிற்சி'),
  sheetali: T('Sheetali (cooling breath) on hot days', 'வெயில் நாட்களில் சீதளி (குளிர்ச்சி) சுவாசம்'),
};
const YOGA_BY_STAGE = {
  child: [Y.play, Y.suryaKids, Y.breathGame],
  youth: [Y.surya, Y.sport, Y.nadi],
  adult: [Y.sport, Y.surya, Y.nadi],
  midlife: [Y.walk40, Y.nadi, Y.vajra],
  senior: [Y.walkGentle, Y.stretch, Y.deep],
  elder: [Y.chair, Y.deep, Y.sun, Y.balance],
};
function yogaFor(stage) {
  const list = [...YOGA_BY_STAGE[stage]];
  if (list.length < 4) {
    const extra = stage === 'child' ? Y.sun
      : ['senior'].includes(stage) ? Y.bhramari
        : Y.bhramari;
    list.push(extra);
  }
  return list;
}


// ------------------------------------------------------------------ general wellbeing habits (not astrology)
function generalHabits(stage) {
  const sleep = stage === 'child' ? T('Sleep 9–11 hours at a regular time', 'குறித்த நேரத்தில் 9–11 மணி நேர உறக்கம்')
    : ['senior', 'elder'].includes(stage) ? T('Sleep 7–8 hours at a regular time; a short afternoon rest is fine', 'குறித்த நேரத்தில் 7–8 மணி நேர உறக்கம்; சிறு மதிய ஓய்வு பரவாயில்லை')
      : T('Sleep 7–9 hours at a regular time', 'குறித்த நேரத்தில் 7–9 மணி நேர உறக்கம்');
  const move = stage === 'child' ? T('Play and move outdoors every day', 'தினமும் வெளியில் விளையாடி அசைந்து இருங்கள்')
    : ['senior', 'elder'].includes(stage) ? T('A gentle walk most days, at your own pace', 'பெரும்பாலான நாட்களில் உங்கள் வேகத்தில் மென்மையான நடை')
      : T('Walk or stay active for about 30 minutes most days', 'பெரும்பாலான நாட்களில் சுமார் 30 நிமிடம் நடை அல்லது உடல் இயக்கம்');
  return [
    { id: 'sleep', icon: '😴', ...sleep },
    { id: 'water', icon: '💧', ...T('Drink water through the day — a little more in hot weather', 'நாள் முழுவதும் தண்ணீர் குடியுங்கள் — வெயில் காலத்தில் சற்று அதிகம்') },
    { id: 'walk', icon: '🚶', ...move },
    { id: 'checkups', icon: '🩺', ...T('Regular check-ups suited to your age (list below) — your doctor decides what and how often', 'உங்கள் வயதுக்கேற்ற வழக்கமான பரிசோதனைகள் (கீழே பட்டியல்) — எது, எப்போது என்பதை மருத்துவர் முடிவு செய்வார்') },
    { id: 'doctor', icon: '👨‍⚕️', ...T('For any symptom or worry, see a doctor — in every period, without waiting for a good day', 'எந்த அறிகுறி அல்லது கவலைக்கும் மருத்துவரைப் பாருங்கள் — எந்தக் காலத்திலும், நல்ல நாளுக்காகக் காத்திருக்காமல்') },
  ].map((x) => ({ ...x, needsMedicalReview: true, fromAstrology: false }));
}

// ------------------------------------------------------------------ traditional reflection (optional, spiritual only)
function lordsAt(chart, date) {
  const md = chart.dasa.periods.find((p) => date >= p.start && date < p.end) || null;
  const ad = md ? md.bhuktis.find((b) => date >= b.start && date < b.end) || null : null;
  return { md, ad };
}

const WEEKDAY = [T('Sunday', 'ஞாயிறு'), T('Monday', 'திங்கள்'), T('Tuesday', 'செவ்வாய்'), T('Wednesday', 'புதன்'), T('Thursday', 'வியாழன்'), T('Friday', 'வெள்ளி'), T('Saturday', 'சனி')];
// Rahu and Ketu have no weekday of their own; Durga (Rahu) and Vinayagar (Ketu) prayers are kept on Tuesday.
const PRAYER_DAY = { Rahu: 2, Ketu: 2 };
const dayOf = (k) => WEEKDAY[NAVAGRAHA[k].day ?? PRAYER_DAY[k]];

// Moon-based Gochara as reflection prompts only — no body, food or illness wording.
function gocharaReflection(chart, date) {
  const { planets } = planetPositions(date);
  const M = chart.planets.Moon.rasi;
  const fm = (k) => houseOf(M, planets[k].rasi);
  const sat = fm('Saturn'), jup = fm('Jupiter'), rahu = fm('Rahu'), ketu = fm('Ketu');
  const notes = [];
  const n = (id, en, ta) => notes.push({ id, ...T(en, ta) });
  if ([12, 1, 2].includes(sat)) n('ezharai', `Ezharai Sani (phase ${sat === 12 ? 1 : sat === 1 ? 2 : 3} of 3) — tradition suggests a Saturday lamp and patience`, `ஏழரைச் சனி (${sat === 12 ? 'விரய' : sat === 1 ? 'ஜென்ம' : 'பாத'} சனி) — சனிக்கிழமை தீபமும் பொறுமையும் என மரபு சொல்கிறது`);
  else if (sat === 8) n('ashtama', 'Ashtama Sani — tradition suggests Saturday prayer and a calm, unhurried routine', 'அஷ்டமச் சனி — சனிக்கிழமை வழிபாடும் அமைதியான, நிதானமான வழக்கமும் என மரபு சொல்கிறது');
  else if (sat === 4) n('ardhashtama', 'Ardhashtama Sani — tradition suggests a lamp at home on Saturdays', 'அர்த்தாஷ்டமச் சனி — சனிக்கிழமை வீட்டில் தீபம் என மரபு சொல்கிறது');
  if (rahu === 1) n('rahu', 'Rahu over your Moon sign — tradition suggests a prayer to Durga', 'ராகு உங்கள் சந்திர ராசி மேல் — துர்கை வழிபாடு என மரபு சொல்கிறது');
  if (ketu === 1) n('ketu', 'Ketu over your Moon sign — tradition suggests a prayer to Vinayagar', 'கேது உங்கள் சந்திர ராசி மேல் — விநாயகர் வழிபாடு என மரபு சொல்கிறது');
  if ([2, 5, 7, 9, 11].includes(jup)) n('guru_balam', 'Guru Balam — a time tradition sees for a Thursday prayer of thanks', 'குரு பலம் — வியாழன் நன்றி வழிபாட்டிற்கான காலம் என மரபு பார்க்கிறது');
  return { notes, sat, jup, rahu, ketu, guruBalam: [2, 5, 7, 9, 11].includes(jup) };
}

const HEALING = [
  T('A short prayer or a lamp at home at dusk — a calm close to the day', 'அந்திவேளையில் வீட்டில் ஒரு சிறு பிரார்த்தனை அல்லது தீபம் — நாளுக்கு அமைதியான நிறைவு'),
  T('Pray to Lord Dhanvantari on Thursdays, if it is part of your family tradition', 'உங்கள் குடும்ப மரபு என்றால், வியாழன்தோறும் தன்வந்திரி பகவானை வணங்குங்கள்'),
  T('Share food with someone in need (annadhanam) — a traditional act of kindness', 'தேவைப்படுபவருக்கு உணவளித்தல் (அன்னதானம்) — மரபு வழி அன்புச் செயல்'),
];
const MRITYUNJAYA = {
  ...T('Om Tryambakam Yajamahe Sugandhim Pushtivardhanam, Urvarukamiva Bandhanan Mrityor Mukshiya Maamritat',
    'ஓம் த்ரயம்பகம் யஜாமஹே சுகந்திம் புஷ்டிவர்த்தனம், உர்வாருகமிவ பந்தனான் ம்ருத்யோர் முக்ஷீய மாம்ருதாத்'),
  how: T('Optional: chant or listen 11 times in the morning — a traditional prayer for peace. It is a prayer, not a treatment.', 'விருப்பமெனில்: காலையில் 11 முறை சொல்லுங்கள் அல்லது கேளுங்கள் — அமைதிக்கான மரபுப் பிரார்த்தனை. இது பிரார்த்தனை, சிகிச்சை அல்ல.'),
};

const DISCLAIMER = T(
  'The traditional reflection is optional and spiritual only; it is not health advice and cannot detect illness, fertility or lifespan. For any symptom see a qualified doctor. This is not medical advice — do not start, stop or change any treatment based on this.',
  'மரபுச் சிந்தனை விருப்பத்திற்குரிய ஆன்மீகப் பகுதி மட்டுமே; இது உடல்நல ஆலோசனை அல்ல, நோய், கருவுறுதல், ஆயுள் எதையும் கண்டறிய முடியாது. எந்த அறிகுறி இருந்தாலும் தகுதியான மருத்துவரைப் பாருங்கள். இது மருத்துவ ஆலோசனை அல்ல — இதை வைத்து எந்தச் சிகிச்சையையும் தொடங்கவோ நிறுத்தவோ மாற்றவோ வேண்டாம்.',
);
const NEEDS_TIME = T('Birth time not known — the reflection uses only the Moon sign and the Dasa; nothing lagna-based is shown.', 'பிறந்த நேரம் தெரியவில்லை — சந்திர ராசியும் தசையும் மட்டுமே; லக்னம் சார்ந்த எதுவும் காட்டப்படவில்லை.');
const WELLBEING_LABEL = T('General wellbeing', 'பொது நலம்');
const WELLBEING_NOTE = T('General habits, not from astrology — no diagnosis, no treatment, no restrictions. Pending review by a qualified clinician; follow your own doctor’s advice first.',
  'ஜோதிடத்திலிருந்து அல்லாத பொதுப் பழக்கங்கள் — நோய் கண்டறிதல், சிகிச்சை, கட்டுப்பாடு எதுவும் இல்லை. தகுதியான மருத்துவரின் மதிப்பாய்வு நிலுவையில்; உங்கள் மருத்துவர் ஆலோசனையே முதன்மை.');
const REFLECTION_LABEL = T('Traditional reflection (optional)', 'மரபுச் சிந்தனை (விருப்பம்)');
const REFLECTION_NOTE = T('Spiritual practices only — prayer, a lamp, a mantra, a calm routine. This is not health advice.',
  'ஆன்மீகப் பழக்கங்கள் மட்டுமே — பிரார்த்தனை, தீபம், மந்திரம், அமைதியான வழக்கம். இது உடல்நல ஆலோசனை அல்ல.');
// Kept for callers that read the older label (not medical advice).
const TRADITION_LABEL = T('Traditional reflection — spiritual only, not medical advice', 'மரபுச் சிந்தனை — ஆன்மீகம் மட்டும், மருத்துவ ஆலோசனை அல்ல');
const VITALITY_NOT_ASSESSED = T('Thunai does not estimate lifespan or vitality from a horoscope. Regular check-ups with your doctor are the reliable guide.',
  'துணை ஜாதகத்திலிருந்து ஆயுளையோ உயிர்ச்சக்தியையோ கணிப்பதில்லை. மருத்துவரிடம் வழக்கமான பரிசோதனையே நம்பகமான வழிகாட்டி.');

// ------------------------------------------------------------------ main
/**
 * Health guide for one person. chart: birthChart output.
 * options: now (Date), gender ('male' | 'female' | undefined — unknown shows women's checks marked as such).
 */
export function healthGuide(chart, { now = new Date(), gender } = {}) {
  const P = chart.planets;
  const hasLagna = !!P.Lagna && chart.lagna !== null;
  const ageExact = (now - chart.utc) / YEAR;
  const age = Math.max(0, Math.floor(ageExact));
  const stageDef = HEALTH_STAGES.find((s) => ageExact < s.max);
  const checklist = CHECKS.filter((c) => age >= c.min && age < c.max && (!c.gender || !gender || c.gender === gender))
    .map((c) => ({ en: c.en, ta: c.ta, ...(c.gender ? { forGender: c.gender } : {}), needsMedicalReview: true, source: SCREENING_SOURCE.id }));
  const stage = {
    id: stageDef.id, en: stageDef.en, ta: stageDef.ta, checklist,
    note: T('General wellbeing list (not from astrology), pending medical review. Discuss it with your doctor — they decide what and how often.', 'பொது நலப் பட்டியல் (ஜோதிடத்திலிருந்து அல்ல), மருத்துவ மதிப்பாய்வு நிலுவையில். உங்கள் மருத்துவரிடம் கலந்து பேசுங்கள் — எது, எப்போது என்பதை அவரே முடிவு செய்வார்.'),
    needsMedicalReview: true,
    source: SCREENING_SOURCE,
    fromAstrology: false,
  };
  const yoga = yogaFor(stage.id).map((y) => ({ ...y, needsMedicalReview: true }));
  const habits = generalHabits(stage.id);

  // Part 2 — reflection: the running Dasa / Bhukti lords and the Moon-based Gochara, as prayer prompts only.
  const { md, ad } = lordsAt(chart, now);
  const g = gocharaReflection(chart, now);
  const lords = [...new Set([md?.lord, ad?.lord].filter(Boolean))];
  const practices = lords.map((k, i) => ({
    planet: k, ta: PLANETS[k].ta,
    why: i === 0 && k === md?.lord ? T(`Running ${k} Dasa`, `நடப்பு ${PLANETS[k].ta} தசை`) : T(`Running ${k} Bhukti`, `நடப்பு ${PLANETS[k].ta} புக்தி`),
    day: dayOf(k),
    deity: NAVAGRAHA[k].deity, mantra: NAVAGRAHA[k].mantra, charity: NAVAGRAHA[k].charity,
    lamp: T(`Light a lamp on ${dayOf(k).en} with a short prayer to ${NAVAGRAHA[k].deity.en}`, `${dayOf(k).ta} அன்று ${NAVAGRAHA[k].deity.ta} முன் ஒரு தீபமும் சிறு பிரார்த்தனையும்`),
  }));
  const period = {
    md: md && { lord: md.lord, ta: PLANETS[md.lord].ta, start: md.start, end: md.end },
    ad: ad && { lord: ad.lord, ta: PLANETS[ad.lord].ta, start: ad.start, end: ad.end },
    gochara: g.notes,
    transit: { saturnFromMoon: g.sat, jupiterFromMoon: g.jup, rahuFromMoon: g.rahu, ketuFromMoon: g.ketu },
    guruBalam: g.guruBalam,
    notHealthAdvice: true,
  };
  const calm = T('A calm routine: a few quiet minutes of prayer or slow breathing each morning', 'அமைதியான வழக்கம்: தினமும் காலையில் சில நிமிடங்கள் அமைதியான பிரார்த்தனை அல்லது மெதுவான சுவாசம்');
  const reflection = {
    label: REFLECTION_LABEL, note: REFLECTION_NOTE, optional: true, notHealthAdvice: true, fromAstrology: true,
    period, practices, gochara: g.notes, calm, healing: HEALING, mantra: MRITYUNJAYA,
  };

  return {
    name: chart.name,
    policyVersion: HEALTH_POLICY_VERSION,
    flags: HEALTH_FLAGS,
    age, stage,
    // Part 1 — general wellbeing (not astrology).
    wellbeing: { label: WELLBEING_LABEL, note: WELLBEING_NOTE, fromAstrology: false, habits, checklist: stage.checklist, yoga, needsMedicalReview: true, reviewLabel: NEEDS_MEDICAL_REVIEW, source: SCREENING_SOURCE },
    // Part 2 — optional traditional reflection; spiritual practices only, never health advice.
    reflection,
    needsBirthTime: !hasLagna,
    birthTimeNote: hasLagna ? null : NEEDS_TIME,
    traditionalContext: { label: TRADITION_LABEL, optional: true, houseBasedPartsShown: false, notMedicalAdvice: true, notHealthAdvice: true, canDriveTreatment: false, sections: ['reflection'] },
    period,
    yoga,
    remedies: { planets: practices, healing: HEALING, mantra: MRITYUNJAYA, optional: true, notTreatment: true },
    vitality: { level: 'not-assessed', text: VITALITY_NOT_ASSESSED, lifespanInference: false },
    disclaimer: DISCLAIMER,
  };
}
