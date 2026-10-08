// Jathagam health guide (ஜாதக ஆரோக்கிய வழிகாட்டி) — restored at the owner's request (Oct 2026), rebuilt on the
// current engine. For ADULTS (18+) it reads the birth chart, the running Dasa / Bhukti and the Saturn, Jupiter and
// Rahu–Ketu Gochara and names the body areas that Tamil / Jyotish tradition asks a person to look after, with dates,
// a 12-month care map, traditional food tips (Tamil Siddha / Ayurveda planet and dosha associations), a daily routine,
// simple yoga and traditional remedies, plus age-wise check-ups with reminders.
//
// Hard rules (test/health-guide.test.js, docs/AI-SAFETY-POLICY.md §5):
//  • every section says it is a traditional indication, not a diagnosis, and to see a doctor for any symptom;
//  • wording is always "tradition says this period needs care for <area>" — never "you will get / you have <disease>";
//  • no fatal-disease names, no lifespan or death, no medicine or treatment instructions, no doses, no fear, no certainty;
//  • minors (<18) get only general sleep / play / food-habit tips and growth check-ups — no chart-based body areas;
//  • unknown birth time → Moon-sign (Chandra) reference only; Lagna-based parts are said to need the time;
//    approximate time → Lagna-based items carry mayChange (stability chip on screen);
//  • pregnancy: only "follow your obstetrician"; any condition: "follow your doctor's diet".
// General wellbeing (habits, check-ups) stays separate from astrology and is marked "needs medical review".
import { RASIS, PLANETS, planetPositions } from './astro.js';
import { grahaStrength, NAVAGRAHA } from './remedies.js';
import { MANTRAS } from './mantras.js';
import { MONTHS_EN, MONTHS_TA, planetAdjTa } from './fmt.js';
const ordEn = (n) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

const T = (en, ta) => ({ en, ta });
const YEAR = 365.25 * 86400000;
const houseOf = (from, to) => ((to - from + 12) % 12) + 1;
const lordOf = (refRasi, h) => RASIS[(refRasi + h - 1) % 12].lord;
const housesRuled = (refRasi, planet) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((h) => lordOf(refRasi, h) === planet);
const GRAHAS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const MALEFICS = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];
const ADULT_AGE = 18;

export const HEALTH_POLICY_VERSION = 'health-guide-2026.10-v3';
export const HEALTH_FLAGS = Object.freeze({
  generalWellbeingSeparate: true,
  // Traditional indications (body areas, food tips) are shown to adults only, always with the doctor line.
  traditionalIndicationsAdultsOnly: true,
  notMedicalAdvice: true,
  notADiagnosis: true,
  canDriveTreatment: false,
  diseaseInference: false,
  reproductiveInference: false,
  lifespanInference: false,
  medicineOrDoses: false,
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
/** Shown with every traditional section. */
export const TRADITION_NOTE = T(
  'Traditional indication only — not a diagnosis. For any symptom, please see a doctor.',
  'இது மரபுக் குறிப்பு மட்டுமே — நோய் கண்டறிதல் அல்ல. எந்த அறிகுறி இருந்தாலும் மருத்துவரைப் பாருங்கள்.',
);
const DIET_NOTE = T(
  'General traditional food tips, not treatment. If you have diabetes, a kidney or heart condition, are pregnant, or have any condition, follow your doctor’s diet. Traditional indication only — not a diagnosis; for any symptom, see a doctor.',
  'இவை பொதுவான மரபு உணவுக் குறிப்புகள், சிகிச்சை அல்ல. சர்க்கரை, சிறுநீரகம், இதயம் தொடர்பான உடல்நிலை, கர்ப்பம் அல்லது வேறு எந்த உடல்நிலை இருந்தாலும் மருத்துவர் சொல்லும் உணவு முறையையே பின்பற்றுங்கள். இது மரபுக் குறிப்பு மட்டுமே — நோய் கண்டறிதல் அல்ல; எந்த அறிகுறிக்கும் மருத்துவரைப் பாருங்கள்.',
);
const PREGNANCY_LINE = T('If you are pregnant, follow your obstetrician’s advice for food, exercise and every practice here.',
  'கர்ப்பமாக இருந்தால், உணவு, உடற்பயிற்சி, இங்குள்ள எந்தப் பழக்கத்திற்கும் உங்கள் மகப்பேறு மருத்துவரின் ஆலோசனையையே பின்பற்றுங்கள்.');
const SOURCE_NOTE = T('Traditional Jyotish association — Kalapurusha body map and planet significations (karakatvam) as commonly taught from Brihat Parashara Hora Shastra and Phaladeepika; food tips follow Tamil Siddha / Ayurveda usage.',
  'மரபு ஜோதிடத் தொடர்பு — காலபுருஷ உடல் வரைபடமும் கிரகக் காரகத்துவமும் (பிருஹத் பராசர ஹோரா சாஸ்திரம், பலதீபிகை வழியாகப் பொதுவாகக் கற்பிக்கப்படுவது); உணவுக் குறிப்புகள் தமிழ் சித்த / ஆயுர்வேத வழக்கப்படி.');
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
function yogaFor(stage, con) {
  const list = [...YOGA_BY_STAGE[stage]];
  if (list.length < 4) {
    const extra = stage === 'child' ? Y.sun
      : stage === 'senior' || !con ? Y.bhramari
        : con.dominant === 'pitta' ? Y.sheetali : con.dominant === 'vata' ? Y.bhramari : Y.stretch;
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

// ------------------------------------------------------------------ dates (residence time zone)
const localOf = (d, tz) => new Date(new Date(d).getTime() + (Number.isFinite(Number(tz)) ? Number(tz) : 5.5) * 3600000);
/** The last day of a period that ends at `end` (one convention: till = the day before the next period starts). */
const lastDay = (end) => new Date(new Date(end).getTime() - 86400000);
/** "Mar 2027" / "மார்ச் 2027" in the residence time zone (shared/fmt.js month names). */
export function monthLabel(d, tz = 5.5) {
  const x = localOf(d, tz);
  return T(`${MONTHS_EN[x.getUTCMonth()]} ${x.getUTCFullYear()}`, `${MONTHS_TA[x.getUTCMonth()]} ${x.getUTCFullYear()}`);
}
const spanLabel = (a, b, tz) => { const s = monthLabel(a, tz), e = monthLabel(lastDay(b), tz); return T(`${s.en} – ${e.en}`, `${s.ta} – ${e.ta}`); };

// ------------------------------------------------------------------ constitution (traditional body type)
const DOSHAS = {
  vata: { ...T('Vata (air)', 'வாதம் (காற்று)'),
    plain: T('A light, quick, active body type. Tradition says it does best with warmth, regular meals and a fixed sleep time; when out of balance it tends towards dryness, gas, aches and light sleep.',
      'லேசான, சுறுசுறுப்பான உடல்வாகு. சூடான உணவும் குறித்த நேரச் சாப்பாடும் குறித்த நேர உறக்கமும் இதற்கு நல்லது என மரபு சொல்கிறது; சமநிலை தவறினால் வறட்சி, வாயு, உடல் வலி, ஆழமில்லா உறக்கம் எனப் போகலாம் எனக் கூறப்படுகிறது.') },
  pitta: { ...T('Pitta (fire)', 'பித்தம் (நெருப்பு)'),
    plain: T('A warm, sharp, driven body type. Tradition says cooling food, enough water and a calm mind keep it steady; when out of balance it tends towards body heat, acidity, skin irritation and quick anger.',
      'சூடான, கூர்மையான, உத்வேகமான உடல்வாகு. குளிர்ச்சியான உணவும் போதுமான தண்ணீரும் அமைதியான மனமும் இதைச் சமமாக வைக்கும் என மரபு சொல்கிறது; சமநிலை தவறினால் உடல் சூடு, அமிலத்தன்மை, தோல் எரிச்சல், விரைவான கோபம் எனப் போகலாம் எனக் கூறப்படுகிறது.') },
  kapha: { ...T('Kapha (water & earth)', 'கபம் (நீர், நிலம்)'),
    plain: T('A steady, strong, patient body type. Tradition says daily activity, light warm food and rising early keep it light; when out of balance it tends towards weight gain, cold and cough, and sluggishness.',
      'நிலையான, வலுவான, பொறுமையான உடல்வாகு. தினசரி உழைப்பும் லேசான சூடான உணவும் அதிகாலை எழுதலும் இதை லேசாக வைக்கும் என மரபு சொல்கிறது; சமநிலை தவறினால் எடை கூடுதல், சளி, இருமல், மந்தம் எனப் போகலாம் எனக் கூறப்படுகிறது.') },
};
const PLANET_DOSHA = {
  Sun: { pitta: 1 }, Mars: { pitta: 1 }, Ketu: { pitta: 1 },
  Moon: { kapha: 1 }, Venus: { kapha: 1 }, Jupiter: { kapha: 1 },
  Saturn: { vata: 1 }, Rahu: { vata: 1 },
  Mercury: { vata: 1 / 3, pitta: 1 / 3, kapha: 1 / 3 },
};
// Element of a sign: index % 4 → fire, earth, air, water.
const SIGN_DOSHA = [{ pitta: 1 }, { vata: 0.5, kapha: 0.5 }, { vata: 1 }, { kapha: 1 }];
const ELEMENT = [T('fire', 'நெருப்பு'), T('earth', 'நிலம்'), T('air', 'காற்று'), T('water', 'நீர்')];

function constitution(P, hasLagna) {
  const acc = { vata: 0, pitta: 0, kapha: 0 };
  const add = (map, w) => { for (const [k, v] of Object.entries(map)) acc[k] += v * w; };
  const why = [];
  if (hasLagna) {
    const L = P.Lagna.rasi;
    add(SIGN_DOSHA[L % 4], 3);
    add(PLANET_DOSHA[RASIS[L].lord], 2);
    why.push({ basis: 'lagna', ...T(`Lagna ${RASIS[L].en} (${ELEMENT[L % 4].en} sign), lord ${RASIS[L].lord}`, `லக்னம் ${RASIS[L].ta} (${ELEMENT[L % 4].ta} ராசி), அதிபதி ${PLANETS[RASIS[L].lord].ta}`) });
    const inLagna = GRAHAS.filter((k) => P[k].rasi === L);
    for (const k of inLagna) add(PLANET_DOSHA[k], 1.5);
    if (inLagna.length) why.push({ basis: 'lagna', ...T(`In the Lagna: ${inLagna.join(', ')}`, `லக்னத்தில்: ${inLagna.map((k) => PLANETS[k].ta).join(', ')}`) });
  }
  add(SIGN_DOSHA[P.Moon.rasi % 4], hasLagna ? 2 : 3);
  add(PLANET_DOSHA[RASIS[P.Moon.rasi].lord], hasLagna ? 0 : 1.5);
  add(SIGN_DOSHA[P.Sun.rasi % 4], 1);
  why.push({ basis: 'moon', ...T(`Moon in ${RASIS[P.Moon.rasi].en} (${ELEMENT[P.Moon.rasi % 4].en} sign)`, `சந்திரன் ${RASIS[P.Moon.rasi].ta} (${ELEMENT[P.Moon.rasi % 4].ta} ராசி)`) });
  why.push({ basis: 'planet', ...T(`Sun in ${RASIS[P.Sun.rasi].en} (${ELEMENT[P.Sun.rasi % 4].en} sign)`, `சூரியன் ${RASIS[P.Sun.rasi].ta} (${ELEMENT[P.Sun.rasi % 4].ta} ராசி)`) });
  for (const k of Object.keys(acc)) acc[k] += 1; // everyone carries all three
  const total = acc.vata + acc.pitta + acc.kapha;
  const share = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, v / total]));
  const order = Object.keys(acc).sort((a, b) => acc[b] - acc[a]);
  const [dominant, secondary] = order;
  const dual = share[dominant] - share[secondary] <= 0.08;
  const name = dual ? T(`${DOSHAS[dominant].en} with ${DOSHAS[secondary].en}`, `${DOSHAS[dominant].ta} கலந்த ${DOSHAS[secondary].ta}`) : T(DOSHAS[dominant].en, DOSHAS[dominant].ta);
  const plain = dual
    ? T(`${DOSHAS[dominant].plain.en} It is mixed with ${DOSHAS[secondary].en}, so tips from both apply.`, `${DOSHAS[dominant].plain.ta} இதில் ${DOSHAS[secondary].ta} தன்மையும் கலந்திருப்பதால் இரண்டுக்குமான குறிப்புகள் பொருந்தும்.`)
    : DOSHAS[dominant].plain;
  return {
    dominant, secondary, dual, name, plain, why,
    share: Object.fromEntries(Object.entries(share).map(([k, v]) => [k, Math.round(v * 100) / 100])),
    doshas: Object.fromEntries(Object.entries(DOSHAS).map(([k, d]) => [k, T(d.en, d.ta)])),
    title: T('Body type by tradition', 'மரபுப்படி உடல்வாகு'),
    lagnaBased: hasLagna,
    note: TRADITION_NOTE,
  };
}

// ------------------------------------------------------------------ body areas (traditional association table)
/**
 * Body areas. `part` is the short name used in the sentence
 * "தமிழ் மரபில் இந்தக் காலம் <part> பகுதியில் கவனம் தேவை எனக் கூறப்படுகிறது".
 */
export const BODY_AREAS = {
  head: { icon: '🧠', ...T('Head', 'தலை'), part: T('head', 'தலை'),
    tip: T('Regular sleep, less stress and a helmet on two-wheelers look after the head.', 'சீரான உறக்கம், குறைந்த மன அழுத்தம், இருசக்கர வாகனத்தில் தலைக்கவசம் — தலையைக் காக்கும்.') },
  throat: { icon: '🗣️', ...T('Face, throat & thyroid', 'முகம், தொண்டை, தைராய்டு'), part: T('throat and neck', 'தொண்டை, கழுத்து'),
    tip: T('Warm water, a salt-water gargle and fewer ice-cold drinks.', 'வெதுவெதுப்பான நீர், உப்புநீர்க் கொப்பளிப்பு; மிகக் குளிர்ந்த பானம் குறைவு.') },
  chest: { icon: '🫁', ...T('Chest, lungs & breathing', 'மார்பு, நுரையீரல், சுவாசம்'), part: T('chest and breathing', 'மார்பு, சுவாசம்'),
    tip: T('Daily slow breathing, no smoking, and care in dust and cold weather.', 'தினமும் மெதுவான சுவாசப் பயிற்சி, புகை தவிர்ப்பு, தூசி, குளிரில் கவனம்.') },
  heart: { icon: '❤️', ...T('Heart & circulation', 'இதயம், ரத்த ஓட்டம்'), part: T('heart and circulation', 'இதயம், ரத்த ஓட்டம்'),
    tip: T('A daily walk, less oil and salt, and a regular BP check.', 'தினசரி நடை, குறைந்த எண்ணெய், உப்பு; ரத்த அழுத்தத்தை முறையாகச் சரிபார்த்தல்.') },
  eyes: { icon: '👁️', ...T('Eyes', 'கண்கள்'), part: T('eyes', 'கண்'),
    tip: T('Screen breaks, greens and a yearly eye check.', 'திரை இடைவெளி, கீரை, ஆண்டுதோறும் கண் பரிசோதனை.') },
  stomach: { icon: '🍃', ...T('Stomach & digestion', 'வயிறு, செரிமானம்'), part: T('stomach and digestion', 'வயிறு, செரிமானம்'),
    tip: T('Eat on time, chew well and do not overeat; buttermilk after lunch suits most people.', 'நேரத்திற்குச் சாப்பாடு, நன்றாக மென்று உண்ணுதல், அளவோடு; மதியம் மோர் பெரும்பாலோருக்கு ஒத்துக்கொள்ளும்.') },
  liver: { icon: '🌾', ...T('Liver, fat & sugar balance', 'கல்லீரல், கொழுப்பு, சர்க்கரைச் சமநிலை'), part: T('liver and fat balance', 'கல்லீரல், கொழுப்புச் சமநிலை'),
    tip: T('Less sugar and fried food, a short walk after meals, and the yearly sugar test your doctor suggests.', 'குறைந்த இனிப்பு, பொரித்த உணவு; உணவுக்குப் பின் சிறு நடை; மருத்துவர் சொல்லும் ஆண்டுச் சர்க்கரைப் பரிசோதனை.') },
  kidneys: { icon: '💧', ...T('Kidneys, urinary tract & lower back', 'சிறுநீரகம், சிறுநீர்ப் பாதை, கீழ் முதுகு'), part: T('kidneys and urinary tract', 'சிறுநீரகம், சிறுநீர்ப் பாதை'),
    tip: T('Drink enough water through the day, go less on salt, and do not hold urine for long.', 'நாள் முழுவதும் போதுமான தண்ணீர், உப்பு குறைவு; சிறுநீரை நீண்ட நேரம் அடக்கி வைக்க வேண்டாம்.') },
  reproductive: { icon: '🌸', ...T('Urinary & reproductive organs', 'சிறுநீர், இனப்பெருக்க உறுப்புகள்'), part: T('urinary and reproductive organs', 'சிறுநீர், இனப்பெருக்க உறுப்புகள்'),
    tip: T('Personal hygiene, enough water and timely check-ups.', 'தனிப்பட்ட சுத்தம், போதுமான தண்ணீர், உரிய நேரப் பரிசோதனை.') },
  thighs: { icon: '🦵', ...T('Hips & thighs', 'இடுப்பு, தொடைகள்'), part: T('hips and thighs', 'இடுப்பு, தொடை'),
    tip: T('Stretch daily and avoid sitting for long hours at a stretch.', 'தினமும் நீட்சிப் பயிற்சி; தொடர்ந்து மணிக்கணக்கில் உட்காருவதைத் தவிர்க்கவும்.') },
  joints: { icon: '🦴', ...T('Joints, bones, knees & teeth', 'மூட்டுகள், எலும்புகள், முழங்கால், பற்கள்'), part: T('joints and bones', 'மூட்டு, எலும்பு'),
    tip: T('Gentle daily movement, calcium-rich food like ragi and sesame, and morning sunlight.', 'தினமும் மென்மையான உடல் இயக்கம், கேழ்வரகு, எள் போன்ற கால்சியம் நிறைந்த உணவு, காலை வெயில்.') },
  legs: { icon: '🦶', ...T('Calves, ankles & leg veins', 'கெண்டைக்கால், கணுக்கால், கால் நரம்புகள்'), part: T('legs and ankles', 'கால், கணுக்கால்'),
    tip: T('Walk, rest with the legs raised and avoid standing still for hours.', 'நடை; ஓய்வின்போது கால்களை உயர்த்தி வைத்தல்; மணிக்கணக்கில் அசையாமல் நிற்பதைத் தவிர்த்தல்.') },
  feet: { icon: '👣', ...T('Feet', 'பாதங்கள்'), part: T('feet', 'பாதம்'),
    tip: T('Comfortable footwear and daily foot care.', 'வசதியான காலணி, தினசரிப் பாதப் பராமரிப்பு.') },
  blood: { icon: '🩸', ...T('Blood, BP & body heat', 'ரத்தம், ரத்த அழுத்தம், உடல் சூடு'), part: T('blood, BP and body heat', 'ரத்தம், ரத்த அழுத்தம், உடல் சூடு'),
    tip: T('Keep calm, drive carefully, take care with fire and sharp tools, and keep BP checks regular.', 'நிதானம், கவனமான வாகனப் பயணம், நெருப்பு, கூர்மையான கருவிகளில் கவனம், முறையான ரத்த அழுத்தப் பரிசோதனை.') },
  nerves: { icon: '⚡', ...T('Nerves, skin & speech', 'நரம்புகள், தோல், பேச்சு'), part: T('nerves and skin', 'நரம்பு, தோல்'),
    tip: T('Rest the mind, sleep well and keep the skin clean and moisturised.', 'மனதுக்கு ஓய்வு, நல்ல உறக்கம், தோலைச் சுத்தமாகவும் ஈரப்பதத்துடனும் வைத்தல்.') },
  mind: { icon: '🌙', ...T('Mind, sleep & body fluids', 'மனம், உறக்கம், உடல் நீர்ச்சத்து'), part: T('mind, sleep and body fluids', 'மனம், உறக்கம், உடல் நீர்ச்சத்து'),
    tip: T('A fixed sleep time, a few quiet minutes daily and talking openly with loved ones.', 'குறித்த நேர உறக்கம், தினமும் சில அமைதியான நிமிடங்கள், அன்பானவர்களுடன் மனம் விட்டுப் பேசுதல்.') },
  allergy: { icon: '🌫️', ...T('Allergies & hard-to-pin-down complaints', 'ஒவ்வாமை, எளிதில் புரியாத உபாதைகள்'), part: T('allergies and hard-to-pin-down complaints', 'ஒவ்வாமை, எளிதில் புரியாத உபாதைகள்'),
    tip: T('Fresh home food, no tobacco or alcohol, and note what triggers a reaction; if a complaint lingers, get it checked properly.', 'வீட்டு உணவு, புகையிலை, மது தவிர்ப்பு; எது ஒவ்வாமை தருகிறது எனக் குறித்து வைத்தல்; உபாதை நீடித்தால் முறையாகப் பரிசோதித்தல்.') },
  infection: { icon: '🛡️', ...T('Infections, small wounds & gut', 'தொற்று, சிறு புண்கள், குடல்'), part: T('infections, small wounds and the gut', 'தொற்று, சிறு புண், குடல்'),
    tip: T('Wash hands, eat freshly cooked food and clean small cuts at once.', 'கை கழுவுதல், புதிதாகச் சமைத்த உணவு, சிறு வெட்டுகளை உடனே சுத்தம் செய்தல்.') },
};
/** Kalapurusha (time-person) body map: Mesha = head … Meena = feet. Traditional Jyotish association. */
export const SIGN_PARTS = [
  { area: 'head', ...T('head', 'தலை') }, { area: 'throat', ...T('face & throat', 'முகம், தொண்டை') },
  { area: 'chest', ...T('shoulders & lungs', 'தோள், நுரையீரல்') }, { area: 'chest', ...T('chest', 'மார்பு') },
  { area: 'heart', ...T('heart & upper back', 'இதயம், மேல் முதுகு') }, { area: 'stomach', ...T('stomach & intestines', 'வயிறு, குடல்') },
  { area: 'kidneys', ...T('kidneys, urinary tract & lower back', 'சிறுநீரகம், சிறுநீர்ப் பாதை, கீழ் முதுகு') }, { area: 'reproductive', ...T('urinary & reproductive organs', 'சிறுநீர், இனப்பெருக்க உறுப்புகள்') },
  { area: 'thighs', ...T('hips & thighs', 'இடுப்பு, தொடை') }, { area: 'joints', ...T('knees & joints', 'முழங்கால், மூட்டு') },
  { area: 'legs', ...T('calves & ankles', 'கெண்டைக்கால், கணுக்கால்') }, { area: 'feet', ...T('feet', 'பாதம்') },
].map((x) => ({ ...x, source: 'traditional Jyotish association (Kalapurusha)' }));
/** Planet → body systems (first = main). Traditional Jyotish association (graha karakatvam). */
export const PLANET_SYSTEMS = {
  Sun: { areas: ['heart', 'eyes', 'joints'], ...T('heart, eyes, bones, vitality', 'இதயம், கண், எலும்பு, உடல் சக்தி') },
  Moon: { areas: ['mind', 'chest'], ...T('mind, sleep, body fluids, chest', 'மனம், உறக்கம், உடல் நீர்ச்சத்து, மார்பு') },
  Mars: { areas: ['blood'], ...T('blood, BP, body heat, cuts and burns', 'ரத்தம், ரத்த அழுத்தம், உடல் சூடு, வெட்டு, தீக்காயம்') },
  Mercury: { areas: ['nerves'], ...T('nerves, skin, speech', 'நரம்பு, தோல், பேச்சு') },
  Jupiter: { areas: ['liver'], ...T('liver, fat, sugar balance', 'கல்லீரல், கொழுப்பு, சர்க்கரைச் சமநிலை') },
  Venus: { areas: ['kidneys', 'reproductive'], ...T('kidneys, urinary tract, reproductive organs, hormones', 'சிறுநீரகம், சிறுநீர்ப் பாதை, இனப்பெருக்க உறுப்புகள், ஹார்மோன்கள்') },
  Saturn: { areas: ['joints', 'nerves'], ...T('joints, bones, teeth, nerves, long-standing complaints', 'மூட்டு, எலும்பு, பல், நரம்பு, நீண்டகால உபாதைகள்') },
  Rahu: { areas: ['allergy'], ...T('allergies, habits, hard-to-diagnose complaints', 'ஒவ்வாமை, பழக்க அடிமை, எளிதில் கண்டறிய முடியாத உபாதைகள்') },
  Ketu: { areas: ['infection', 'stomach'], ...T('infections, small wounds, digestion', 'தொற்று, சிறு புண், செரிமானம்') },
};
for (const v of Object.values(PLANET_SYSTEMS)) v.source = 'traditional Jyotish association (karakatvam)';

const HOUSE_NAME = {
  6: T('6th house (health)', '6-ம் வீடு (ரோக ஸ்தானம்)'),
  8: T('8th house (hidden matters)', '8-ம் வீடு (மறைவு ஸ்தானம்)'),
  12: T('12th house (rest & sleep)', '12-ம் வீடு (விரய ஸ்தானம்)'),
};
/** "In Tamil tradition this period is said to need care for the <part>." */
export function careLine(areaIds, { period = true } = {}) {
  // Kidneys + reproductive together: name the urinary tract once.
  const parts = areaIds.map((id) => (id === 'reproductive' && areaIds.includes('kidneys') ? T('reproductive organs', 'இனப்பெருக்க உறுப்புகள்') : BODY_AREAS[id].part));
  const en = parts.length > 1 ? `${parts.slice(0, -1).map((p) => p.en).join(', the ')}, and the ${parts[parts.length - 1].en}` : parts[0].en;
  const ta = parts.map((p) => p.ta).join(', ');
  return period
    ? T(`In Tamil tradition this period is said to need care for the ${en}.`, `தமிழ் மரபில் இந்தக் காலம் ${ta} பகுதியில் கவனம் தேவை எனக் கூறப்படுகிறது.`)
    : T(`In Tamil tradition your chart is said to ask for care of the ${en}.`, `தமிழ் மரபில் உங்கள் ஜாதகப்படி ${ta} பகுதியில் கவனம் தேவை எனக் கூறப்படுகிறது.`);
}

/** Reference point: the Lagna when the birth time is known, else the Moon sign (Chandra). */
function refOf(chart) {
  const P = chart.planets;
  const hasLagna = !!P.Lagna && chart.lagna !== null && chart.lagna !== undefined;
  const st = chart.stability;
  const lagnaMayChange = hasLagna && st?.timePrecision === 'approximate' && (st.unstable || []).includes('lagna');
  return {
    hasLagna, lagnaMayChange,
    rasi: hasLagna ? P.Lagna.rasi : P.Moon.rasi,
    basis: hasLagna ? 'lagna' : 'moon',
    from: hasLagna ? T('from the Lagna', 'லக்னத்திலிருந்து') : T('from the Moon sign', 'சந்திர ராசியிலிருந்து'),
  };
}

function natalAreas(chart, st, ref) {
  const P = chart.planets;
  const R = ref.rasi;
  const score = {}, reasons = {}, planets = {}, bases = {};
  const bump = (id, pts, reason, basis, planet) => {
    score[id] = (score[id] || 0) + pts;
    (reasons[id] ||= []);
    if (reason && !reasons[id].some((r) => r.en === reason.en)) reasons[id].push({ ...reason, basis });
    (bases[id] ||= new Set()).add(basis);
    if (planet) (planets[id] ||= new Set()).add(planet);
  };
  const viaPlanet = (k, pts, reason, basis) => PLANET_SYSTEMS[k].areas.forEach((id, i) => bump(id, i ? pts * 0.5 : pts, reason, basis, k));
  const viaSign = (s, pts, reason, basis) => bump(SIGN_PARTS[s].area, pts, reason, basis);
  const rb = ref.basis; // lagna-based (may need the exact time) or moon-based

  if (ref.hasLagna) viaSign(R, 1.5, T(`Lagna (the body) is ${RASIS[R].en} — Kalapurusha ${SIGN_PARTS[R].en}`, `லக்னம் (உடல்) ${RASIS[R].ta} — காலபுருஷ ${SIGN_PARTS[R].ta}`), rb);
  const refLord = RASIS[R].lord;
  const lordH = houseOf(R, P[refLord].rasi);
  if ([6, 8, 12].includes(lordH)) {
    viaSign(P[refLord].rasi, 1.5, ref.hasLagna
      ? T(`Lagna lord ${refLord} in the ${ordEn(lordH)} house (${RASIS[P[refLord].rasi].en})`, `லக்னாதிபதி ${PLANETS[refLord].ta} ${lordH}-ம் வீட்டில் (${RASIS[P[refLord].rasi].ta})`)
      : T(`Moon-sign lord ${refLord} in the ${ordEn(lordH)} from the Moon (${RASIS[P[refLord].rasi].en})`, `ராசியாதிபதி ${PLANETS[refLord].ta} சந்திரனிலிருந்து ${lordH}-ம் இடத்தில் (${RASIS[P[refLord].rasi].ta})`), rb);
  }
  for (const [h, w] of [[6, 2], [8, 1.5], [12, 1]]) {
    const s = (R + h - 1) % 12;
    const hn = ref.hasLagna ? HOUSE_NAME[h] : T(`${ordEn(h)} from the Moon`, `சந்திரனிலிருந்து ${h}-ம் இடம்`);
    viaSign(s, w, T(`${hn.en} falls in ${RASIS[s].en} — ${SIGN_PARTS[s].en}`, `${hn.ta} ${RASIS[s].ta} — ${SIGN_PARTS[s].ta}`), rb);
    const lord = lordOf(R, h);
    if (lord !== refLord) {
      viaPlanet(lord, w * 0.6, T(`${lord} rules the ${hn.en}`, `${PLANETS[lord].ta} ${hn.ta} அதிபதி`), rb);
      viaSign(P[lord].rasi, w * 0.4, T(`${ordEn(h)} lord ${lord} sits in ${RASIS[P[lord].rasi].en} — ${SIGN_PARTS[P[lord].rasi].en}`, `${h}-ம் அதிபதி ${PLANETS[lord].ta} ${RASIS[P[lord].rasi].ta} ராசியில் — ${SIGN_PARTS[P[lord].rasi].ta}`), rb);
    }
    const inH = ref.hasLagna ? T(`in the ${ordEn(h)} house`, `${h}-ம் வீட்டில்`) : T(`${ordEn(h)} from the Moon`, `சந்திரனிலிருந்து ${h}-ம் இடத்தில்`);
    for (const k of GRAHAS.filter((g) => g !== 'Moon' || ref.hasLagna).filter((g) => P[g].rasi === s)) {
      viaPlanet(k, MALEFICS.includes(k) ? w * 0.9 : w * 0.5, T(`${k} ${inH.en}`, `${PLANETS[k].ta} ${inH.ta}`), rb);
    }
  }
  for (const g of Object.values(st)) {
    if (g.level === 'weak') viaPlanet(g.planet, 2, T(`${g.planet} is weak in the chart — it signifies ${PLANET_SYSTEMS[g.planet].en}`, `${PLANETS[g.planet].ta} ஜாதகத்தில் பலம் குறைவு — இது ${PLANET_SYSTEMS[g.planet].ta} குறிக்கும் கிரகம்`), 'planet');
  }
  const ranked = Object.keys(score).sort((a, b) => score[b] - score[a]);
  const top = ranked.filter((id, i) => i < 4 || (i < 5 && score[id] >= 3));
  return top.map((id) => {
    const lagnaOnly = [...bases[id]].every((b) => b === 'lagna');
    return {
      id, icon: BODY_AREAS[id].icon, en: BODY_AREAS[id].en, ta: BODY_AREAS[id].ta, tip: BODY_AREAS[id].tip,
      line: careLine([id], { period: false }),
      planets: [...(planets[id] || [])],
      reasons: reasons[id].slice(0, 3),
      lagnaBased: lagnaOnly,
      mayChange: ref.lagnaMayChange && [...bases[id]].includes('lagna'),
    };
  });
}

// ------------------------------------------------------------------ periods (dasa + bhukti + gochara)
function lordsAt(chart, date) {
  const md = chart.dasa?.periods.find((p) => date >= p.start && date < p.end) || null;
  const ad = md ? md.bhuktis.find((b) => date >= b.start && date < b.end) || null : null;
  return { md, ad };
}

/** Body areas a period lord points to: its own significations, the 6/8/12 houses it rules, the sign it sits in when that is a 6/8/12 place. */
function lordAreas(chart, lord, ref) {
  const P = chart.planets;
  const out = [];
  const why = [];
  const add = (id, w, reason, basis) => {
    const x = out.find((o) => o.id === id);
    if (x) x.w += w; else out.push({ id, w, basis });
    if (reason && !why.some((r) => r.en === reason.en)) why.push({ ...reason, basis });
  };
  PLANET_SYSTEMS[lord].areas.forEach((id, i) => add(id, i ? 1.5 : 2, T(`${lord} signifies ${PLANET_SYSTEMS[lord].en}`, `${PLANETS[lord].ta} — ${PLANET_SYSTEMS[lord].ta} காரகர்`), 'planet'));
  const ruled = housesRuled(ref.rasi, lord).filter((h) => [6, 8, 12].includes(h));
  for (const h of ruled) {
    const s = (ref.rasi + h - 1) % 12;
    add(SIGN_PARTS[s].area, h === 6 ? 1.75 : h === 8 ? 1.5 : 1, ref.hasLagna
      ? T(`${lord} rules the ${HOUSE_NAME[h].en} (${RASIS[s].en} — ${SIGN_PARTS[s].en})`, `${PLANETS[lord].ta} ${HOUSE_NAME[h].ta} அதிபதி (${RASIS[s].ta} — ${SIGN_PARTS[s].ta})`)
      : T(`${lord} rules the ${ordEn(h)} from the Moon (${RASIS[s].en} — ${SIGN_PARTS[s].en})`, `${PLANETS[lord].ta} சந்திரனிலிருந்து ${h}-ம் இட அதிபதி (${RASIS[s].ta} — ${SIGN_PARTS[s].ta})`), ref.basis);
  }
  const h = houseOf(ref.rasi, P[lord].rasi);
  if ([6, 8, 12].includes(h)) {
    const s = P[lord].rasi;
    add(SIGN_PARTS[s].area, 1, ref.hasLagna
      ? T(`${lord} sits in the ${ordEn(h)} house (${RASIS[s].en} — ${SIGN_PARTS[s].en})`, `${PLANETS[lord].ta} ${h}-ம் வீட்டில் (${RASIS[s].ta} — ${SIGN_PARTS[s].ta})`)
      : T(`${lord} sits ${ordEn(h)} from the Moon (${RASIS[s].en} — ${SIGN_PARTS[s].en})`, `${PLANETS[lord].ta} சந்திரனிலிருந்து ${h}-ம் இடத்தில் (${RASIS[s].ta} — ${SIGN_PARTS[s].ta})`), ref.basis);
  }
  out.sort((a, b) => b.w - a.w);
  return { areas: out, why, dusthanaLord: ruled.length > 0 };
}

const periodName = (lord, kind) => (kind === 'dasa' ? T(`${lord} Dasa`, `${planetAdjTa(lord, PLANETS[lord].ta)} தசை`) : T(`${lord} Bhukti`, `${planetAdjTa(lord, PLANETS[lord].ta)} புக்தி`));

function periodItem(chart, p, kind, ref, tz) {
  const la = lordAreas(chart, p.lord, ref);
  const ids = la.areas.slice(0, 2).map((a) => a.id);
  return {
    kind, lord: p.lord, ta: PLANETS[p.lord].ta, start: p.start, end: p.end,
    name: periodName(p.lord, kind),
    dates: spanLabel(p.start, p.end, tz),
    until: p.end, untilLabel: monthLabel(lastDay(p.end), tz),
    areas: ids,
    line: careLine(ids),
    why: la.why.slice(0, 3),
    tips: ids.map((id) => BODY_AREAS[id].tip),
    extraCare: la.dusthanaLord,
    mayChange: ref.lagnaMayChange && la.areas.slice(0, 2).some((a) => a.basis === 'lagna'),
  };
}

/** When a slow planet entered its current sign and when it leaves (monthly scan, refined to a day). */
function signSpan(planet, now) {
  const rasiAt = (d) => planetPositions(d).planets[planet].rasi;
  const cur = rasiAt(now);
  const MONTH = 30 * 86400000;
  let b = now.getTime();
  for (let i = 0; i < 40 && rasiAt(new Date(b + MONTH)) === cur; i++) b += MONTH;
  let x = b;
  for (let i = 0; i < 31 && rasiAt(new Date(x + 86400000)) === cur; i++) x += 86400000;
  return new Date(x + 86400000);
}

/** Saturn, Jupiter, Rahu–Ketu (and Mars for the month map) from the Moon, and from the Lagna when it is known. */
function gocharaCare(chart, date, ref, { spans = false, tz = 5.5 } = {}) {
  const { planets } = planetPositions(date);
  const M = chart.planets.Moon.rasi;
  const fm = (k) => houseOf(M, planets[k].rasi);
  const fl = (k) => (ref.hasLagna ? houseOf(chart.planets.Lagna.rasi, planets[k].rasi) : null);
  const sat = fm('Saturn'), jup = fm('Jupiter'), rahu = fm('Rahu'), ketu = fm('Ketu'), mars = fm('Mars');
  const items = [];
  const until = (k) => (spans ? signSpan(k, date) : null);
  const add = (planet, id, areas, en, ta, basis = 'moon') => {
    const u = until(planet);
    items.push({ planet, id, areas, basis, until: u, untilLabel: u ? monthLabel(u, tz) : null, line: careLine(areas), ...T(en, ta), mayChange: basis === 'lagna' && ref.lagnaMayChange });
  };
  if ([12, 1, 2].includes(sat)) {
    const ph = sat === 12 ? 1 : sat === 1 ? 2 : 3;
    add('Saturn', 'ezharai', ['joints', 'mind'], `Ezharai Sani (phase ${ph} of 3) — Saturn ${ordEn(sat)} from your Moon`, `ஏழரைச் சனி (${sat === 12 ? 'விரயச் சனி' : sat === 1 ? 'ஜென்மச் சனி' : 'பாதச் சனி'}) — சனி உங்கள் ராசியிலிருந்து ${sat}-ம் இடத்தில்`);
  } else if (sat === 8) add('Saturn', 'ashtama', ['joints', 'stomach'], 'Ashtama Sani — Saturn 8th from your Moon', 'அஷ்டமச் சனி — சனி உங்கள் ராசிக்கு 8-ம் இடத்தில்');
  else if (sat === 4) add('Saturn', 'ardhashtama', ['chest', 'mind'], 'Ardhashtama Sani — Saturn 4th from your Moon', 'அர்த்தாஷ்டமச் சனி — சனி உங்கள் ராசிக்கு 4-ம் இடத்தில்');
  if (fl('Saturn') === 1 && ![12, 1, 2].includes(sat)) add('Saturn', 'sani_lagna', ['joints'], 'Saturn over your Lagna', 'சனி உங்கள் லக்னத்தின் மேல்', 'lagna');
  if ([6, 8, 12].includes(jup)) add('Jupiter', 'guru_weak', ['liver'], `Jupiter ${ordEn(jup)} from your Moon`, `குரு உங்கள் ராசிக்கு ${jup}-ம் இடத்தில்`);
  if (rahu === 1) add('Rahu', 'rahu', ['allergy'], 'Rahu over your Moon sign', 'ராகு உங்கள் ராசியின் மேல்');
  else if (fl('Rahu') === 1) add('Rahu', 'rahu_lagna', ['allergy'], 'Rahu over your Lagna', 'ராகு உங்கள் லக்னத்தின் மேல்', 'lagna');
  if (ketu === 1) add('Ketu', 'ketu', ['infection'], 'Ketu over your Moon sign', 'கேது உங்கள் ராசியின் மேல்');
  else if (fl('Ketu') === 1) add('Ketu', 'ketu_lagna', ['infection'], 'Ketu over your Lagna', 'கேது உங்கள் லக்னத்தின் மேல்', 'lagna');
  const guruBalam = [2, 5, 7, 9, 11].includes(jup);
  const marsCare = [1, 8].includes(mars);
  return { items, sat, jup, rahu, ketu, mars, guruBalam, marsCare };
}

// ------------------------------------------------------------------ food (traditional, never treatment)
const DOSHA_DIET = {
  pitta: {
    favour: [T('Tender coconut water', 'இளநீர்'), T('Buttermilk (neer mor) with curry leaves', 'கறிவேப்பிலை சேர்த்த நீர்மோர்'), T('Greens — ponnanganni, manathakkali keerai', 'கீரைகள் — பொன்னாங்கண்ணி, மணத்தக்காளி'), T('Cucumber, ash gourd, snake gourd', 'வெள்ளரி, வெண்பூசணி, புடலங்காய்'), T('Rice with moong dal (paasi paruppu)', 'பாசிப்பருப்புடன் சாதம்'), T('Coriander or fennel (sombu) water', 'கொத்தமல்லி அல்லது சோம்புத் தண்ணீர்')],
    reduce: [T('Too much chilli and pickles', 'அதிகக் காரம், ஊறுகாய்'), T('Deep-fried snacks', 'எண்ணெயில் பொரித்த தின்பண்டங்கள்'), T('Too much coffee or tea', 'அதிகக் காபி, தேநீர்'), T('Alcohol', 'மது'), T('Skipping meals', 'சாப்பாட்டைத் தவிர்த்தல்')],
  },
  kapha: {
    favour: [T('Millets — ragi, kambu, thinai, varagu', 'சிறுதானியங்கள் — கேழ்வரகு, கம்பு, தினை, வரகு'), T('Ginger, pepper rasam, sukku coffee', 'இஞ்சி, மிளகு ரசம், சுக்குக் காபி'), T('Horse gram (kollu) rasam', 'கொள்ளு ரசம்'), T('Bitter gourd, drumstick, fenugreek greens', 'பாகற்காய், முருங்கை, வெந்தயக் கீரை'), T('Warm water through the day', 'நாள் முழுவதும் வெதுவெதுப்பான நீர்')],
    reduce: [T('Curd at night', 'இரவில் தயிர்'), T('Sweets and bakery items', 'இனிப்பு, பேக்கரி உணவுகள்'), T('Fried food', 'பொரித்த உணவு'), T('Cold drinks and ice cream', 'குளிர்பானம், ஐஸ்கிரீம்'), T('Long daytime naps', 'நீண்ட பகல் தூக்கம்')],
  },
  vata: {
    favour: [T('Warm cooked meals — rice, sambar, rasam', 'சூடான சமைத்த உணவு — சாதம், சாம்பார், ரசம்'), T('A little sesame oil (nallennai) in cooking', 'சமையலில் சிறிது நல்லெண்ணெய்'), T('A little ghee', 'சிறிது நெய்'), T('Cooked vegetables — pumpkin, carrot, beans', 'சமைத்த காய்கறிகள் — பூசணி, கேரட், பீன்ஸ்'), T('Soaked dates, figs and banana', 'ஊறவைத்த பேரீச்சை, அத்திப்பழம், வாழைப்பழம்')],
    reduce: [T('Cold, dry and too much raw food', 'குளிர்ந்த, வறண்ட, அதிகப் பச்சை உணவு'), T('Leftover, stale food', 'மீதமான பழைய உணவு'), T('Long fasting', 'நீண்ட உண்ணாவிரதம்'), T('Gas-forming food late at night', 'இரவில் வாயு உண்டாக்கும் உணவு'), T('Irregular meal times', 'ஒழுங்கற்ற சாப்பாட்டு நேரம்')],
  },
};
const PLANET_DIET = {
  Sun: { favour: [T('Wheat and a little jaggery', 'கோதுமை, சிறிது வெல்லம்'), T('Carrot and orange-coloured fruit', 'கேரட், ஆரஞ்சு நிறப் பழங்கள்')], reduce: [T('Skipping breakfast', 'காலைச் சாப்பாட்டைத் தவிர்த்தல்')], habit: T('A little morning sunlight every day', 'தினமும் சிறிது நேரம் காலை வெயில்') },
  Moon: { favour: [T('Rice kanji and curd rice at lunch', 'அரிசிக் கஞ்சி, மதியம் தயிர் சாதம்'), T('Milk, if it suits you', 'ஒத்துக்கொண்டால் பால்')], reduce: [T('Late nights and stale food', 'இரவு கண் விழித்தல், பழைய உணவு')], habit: T('Sleep at a fixed time; a few quiet minutes before bed', 'குறித்த நேரத்தில் உறக்கம்; படுக்கும் முன் சில அமைதியான நிமிடங்கள்') },
  Mars: { favour: [T('Pomegranate and beetroot', 'மாதுளை, பீட்ரூட்'), T('Dates and greens', 'பேரீச்சை, கீரை')], reduce: [T('Very spicy, oily food and eating in anger', 'மிகக் காரமான, எண்ணெய் மிகுந்த உணவு; கோபத்தில் சாப்பிடுதல்')], habit: T('Drive carefully; take care with fire and sharp tools', 'கவனமான வாகனப் பயணம்; நெருப்பு, கூர்மையான கருவிகளில் கவனம்') },
  Mercury: { favour: [T('Green leafy vegetables and moong dal', 'பச்சைக் கீரைகள், பாசிப்பருப்பு'), T('Soaked almonds and groundnuts', 'ஊறவைத்த பாதாம், வேர்க்கடலை')], reduce: [T('Junk food and eating in front of a screen', 'நொறுக்குத் தீனி, திரை முன் சாப்பிடுதல்')], habit: T('A screen-free hour before sleep', 'உறங்கும் முன் ஒரு மணி நேரம் திரை இல்லாமல்') },
  Jupiter: { favour: [T('Turmeric in daily cooking', 'தினசரி சமையலில் மஞ்சள்'), T('Chana dal and banana', 'கடலைப்பருப்பு, வாழைப்பழம்')], reduce: [T('Too much sugar, ghee and fatty food; overeating', 'அதிக இனிப்பு, நெய், கொழுப்பு உணவு; அளவுக்கு மீறிச் சாப்பிடுதல்')], habit: T('A short walk after meals', 'சாப்பாட்டுக்குப் பின் சிறு நடை') },
  Venus: { favour: [T('Plenty of water through the day', 'நாள் முழுவதும் நிறையத் தண்ணீர்'), T('Barley water and tender coconut water', 'பார்லித் தண்ணீர், இளநீர்'), T('Ash gourd (vellai poosani) and buttermilk', 'வெண்பூசணி, மோர்')], reduce: [T('Too much salt, spice and sweets', 'அதிக உப்பு, காரம், இனிப்பு')], habit: T('Personal hygiene; do not hold urine for long', 'தனிப்பட்ட சுத்தம்; சிறுநீரை நீண்ட நேரம் அடக்க வேண்டாம்') },
  Saturn: { favour: [T('Sesame (ellu) and ellu urundai', 'எள், எள்ளுருண்டை'), T('Warm, freshly cooked food; black urad dal (ulundhu kali)', 'சூடான, புதிதாகச் சமைத்த உணவு; கருப்பு உளுந்து (உளுந்தங்களி)')], reduce: [T('Cold food; sitting for long hours', 'குளிர்ந்த உணவு; நீண்ட நேரம் உட்காருதல்')], habit: T('Walk daily; keep joints moving and posture straight', 'தினமும் நடை; மூட்டுகளை அசைத்து, நேராக உட்காருதல்') },
  Rahu: { favour: [T('Fresh home-cooked food and seasonal fruit', 'புதிதாக வீட்டில் சமைத்த உணவு, பருவகாலப் பழம்')], reduce: [T('Processed and packaged food; alcohol and tobacco', 'பதப்படுத்திய, பொட்டல உணவு; மது, புகையிலை')], habit: T('Note what disagrees with you, and keep away from habit-forming things', 'எது ஒத்துக்கொள்ளவில்லை எனக் குறித்து வைத்தல்; அடிமையாக்கும் பழக்கங்களிலிருந்து விலகுதல்') },
  Ketu: { favour: [T('Horse gram and hot, fresh food', 'கொள்ளு, சூடான புதிய உணவு'), T('Buttermilk for the gut', 'குடல் நலத்திற்கு மோர்')], reduce: [T('Street food and unwashed raw food', 'தெருவோர உணவு, கழுவாத பச்சை உணவு')], habit: T('Wash hands well; clean small cuts at once', 'நன்றாகக் கை கழுவுதல்; சிறு வெட்டுகளை உடனே சுத்தம் செய்தல்') },
};

function buildDiet(con, lords) {
  const favour = [], reduce = [], habits = [];
  const push = (list, items, from, n) => { for (const it of items.slice(0, n)) if (!list.some((x) => x.en === it.en)) list.push({ ...it, from }); };
  // Period lords first — the "what to eat now" part the owner asked for — then the body type.
  for (const k of lords) {
    const from = T(`${k} period`, `${PLANETS[k].ta} காலம்`);
    push(favour, PLANET_DIET[k].favour, from, 3);
    push(reduce, PLANET_DIET[k].reduce, from, 1);
    if (!habits.some((h) => h.en === PLANET_DIET[k].habit.en)) habits.push({ ...PLANET_DIET[k].habit, from });
  }
  const dFrom = T(DOSHAS[con.dominant].en, DOSHAS[con.dominant].ta);
  push(favour, DOSHA_DIET[con.dominant].favour, dFrom, 4);
  push(reduce, DOSHA_DIET[con.dominant].reduce, dFrom, 4);
  if (con.dual) {
    const sFrom = T(DOSHAS[con.secondary].en, DOSHAS[con.secondary].ta);
    push(favour, DOSHA_DIET[con.secondary].favour, sFrom, 2);
    push(reduce, DOSHA_DIET[con.secondary].reduce, sFrom, 1);
  }
  return {
    title: T('Food to favour and to reduce, by tradition', 'மரபுப்படி சேர்க்க வேண்டிய, குறைக்க வேண்டிய உணவு'),
    favour, reduce, habits, note: DIET_NOTE, pregnancy: PREGNANCY_LINE,
  };
}

// ------------------------------------------------------------------ minors: general habits only
const KID_TIPS = [
  { icon: '😴', ...T('Sleep at a regular time — children need more sleep than adults', 'குறித்த நேரத்தில் உறக்கம் — பெரியவர்களை விடக் குழந்தைகளுக்கு அதிக உறக்கம் தேவை') },
  { icon: '⚽', ...T('Outdoor play every day; less screen time', 'தினமும் வெளியில் விளையாட்டு; குறைந்த திரை நேரம்') },
  { icon: '🍚', ...T('Home food, fruit and vegetables at regular times; fewer packaged snacks and sugary drinks', 'குறித்த நேரத்தில் வீட்டு உணவு, பழம், காய்கறி; பொட்டலத் தின்பண்டமும் இனிப்புப் பானமும் குறைவு') },
  { icon: '💧', ...T('Water through the day and clean hands before eating', 'நாள் முழுவதும் தண்ணீர்; சாப்பிடும் முன் கை கழுவுதல்') },
  { icon: '🩺', ...T('Growth and vaccination check-ups with the paediatrician', 'குழந்தை மருத்துவரிடம் வளர்ச்சி, தடுப்பூசிப் பரிசோதனைகள்') },
].map((x) => ({ ...x, fromAstrology: false }));
const MINOR_NOTE = T('For children and teenagers Thunai shows only general habits and growth check-ups — no chart-based body readings. For any worry, see your paediatrician.',
  'குழந்தைகள், பதின்வயதினருக்குத் துணை பொதுப் பழக்கங்களையும் வளர்ச்சிப் பரிசோதனைகளையும் மட்டுமே காட்டும் — ஜாதக அடிப்படையிலான உடல் பகுதிக் குறிப்புகள் இல்லை. எந்தக் கவலைக்கும் குழந்தை மருத்துவரைப் பாருங்கள்.');

// ------------------------------------------------------------------ routine
const ROUTINE = {
  base: [
    T('Wake and sleep at fixed times', 'குறித்த நேரத்தில் எழுதல், உறங்குதல்'),
    T('Eat at fixed times; a lighter dinner, early', 'குறித்த நேரத்தில் சாப்பாடு; இரவில் லேசாக, சீக்கிரமாக'),
  ],
  pitta: T('Keep out of the hot midday sun; a weekly sesame-oil bath (Tamil custom)', 'உச்சி வெயிலைத் தவிர்த்தல்; வாரம் ஒருமுறை நல்லெண்ணெய்க் குளியல் (தமிழ் வழக்கம்)'),
  vata: T('A warm sesame-oil massage before a bath once a week', 'வாரம் ஒருமுறை குளிக்கும் முன் வெதுவெதுப்பான நல்லெண்ணெய்த் தேய்ப்பு'),
  kapha: T('Rise before sunrise and move briskly in the morning', 'சூரிய உதயத்திற்கு முன் எழுந்து காலையில் சுறுசுறுப்பான இயக்கம்'),
};

// ------------------------------------------------------------------ remedies
const HEALING = [
  T('Pray to Lord Dhanvantari on Thursdays, if it is part of your family tradition', 'உங்கள் குடும்ப மரபு என்றால், வியாழன்தோறும் தன்வந்திரி பகவானை வணங்குங்கள்'),
  T('Vaitheeswaran Kovil (near Sirkazhi) — a visit or a prayer from home for the family’s wellbeing', 'வைத்தீஸ்வரன் கோவில் (சீர்காழி அருகே) — குடும்ப நலனுக்காகத் தரிசனம் அல்லது வீட்டிலிருந்தே பிரார்த்தனை'),
  T('Share food with someone in need (annadhanam) — a traditional act of kindness', 'தேவைப்படுபவருக்கு உணவளித்தல் (அன்னதானம்) — மரபு வழி அன்புச் செயல்'),
];
// Same text as the mantra library (shared/mantras.js) — one source; its meaning line is not reused here.
const MRITYUNJAYA_SRC = MANTRAS.find((x) => x.id === 'mrityunjaya');
const MRITYUNJAYA = {
  ...T(MRITYUNJAYA_SRC.translit, MRITYUNJAYA_SRC.text),
  how: T('Optional: chant or listen 11 times in the morning — a traditional prayer for peace. It is a prayer, not a treatment.', 'விருப்பமெனில்: காலையில் 11 முறை சொல்லுங்கள் அல்லது கேளுங்கள் — அமைதிக்கான மரபுப் பிரார்த்தனை. இது பிரார்த்தனை, சிகிச்சை அல்ல.'),
};
const WEEKDAY = [T('Sunday', 'ஞாயிறு'), T('Monday', 'திங்கள்'), T('Tuesday', 'செவ்வாய்'), T('Wednesday', 'புதன்'), T('Thursday', 'வியாழன்'), T('Friday', 'வெள்ளி'), T('Saturday', 'சனி')];
// Rahu and Ketu have no weekday of their own; Durga (Rahu) and Vinayagar (Ketu) prayers are kept on Tuesday.
const PRAYER_DAY = { Rahu: 2, Ketu: 2 };
const dayOf = (k) => WEEKDAY[NAVAGRAHA[k].day ?? PRAYER_DAY[k]];
const REMEDY_NOTE = T('Optional prayer and kindness — never a replacement for a doctor or medicine. Free practices come first; nothing paid is needed.',
  'விருப்பத்திற்குரிய பிரார்த்தனையும் அன்புச் செயலும் மட்டுமே — மருத்துவருக்கோ மருந்துக்கோ மாற்று அல்ல. இலவசப் பழக்கங்களே முதன்மை; பணம் செலவழிக்கத் தேவையில்லை.');

// ------------------------------------------------------------------ labels
const DISCLAIMER = T(
  'This guide gives traditional indications from your Jathagam to help you take care early — it is not a diagnosis and cannot detect illness, fertility or lifespan. For any symptom, see a qualified doctor. It is not medical advice: do not start, stop or change any treatment or medicine because of it.',
  'இந்த வழிகாட்டி உங்கள் ஜாதகத்திலிருந்து முன்னெச்சரிக்கையாகக் கவனிக்க உதவும் மரபுக் குறிப்புகளைத் தருகிறது — இது நோய் கண்டறிதல் அல்ல; நோய், கருவுறுதல், ஆயுள் எதையும் கண்டறிய முடியாது. எந்த அறிகுறி இருந்தாலும் தகுதியான மருத்துவரைப் பாருங்கள். இது மருத்துவ ஆலோசனை அல்ல: இதை வைத்து எந்தச் சிகிச்சையையும் மருந்தையும் தொடங்கவோ நிறுத்தவோ மாற்றவோ வேண்டாம்.',
);
const NEEDS_TIME = T('Birth time not known — this guide uses the Moon sign (Chandra) and the Dasa only. Lagna-based body areas need the birth time, so they are not shown.',
  'பிறந்த நேரம் தெரியவில்லை — இந்த வழிகாட்டி சந்திர ராசியையும் தசையையும் மட்டுமே பயன்படுத்துகிறது. லக்ன அடிப்படையிலான உடல் பகுதிகளுக்குப் பிறந்த நேரம் தேவை; எனவே அவை காட்டப்படவில்லை.');
const APPROX_TIME = (w) => T(`Birth time approximate (±${w} min): items marked “may change” depend on the Lagna and can change within that window.`,
  `பிறந்த நேரம் தோராயம் (±${w} நிமி): “மாறக்கூடியது” எனக் குறிக்கப்பட்டவை லக்னத்தைச் சார்ந்தவை; அந்த இடைவெளிக்குள் மாறலாம்.`);
const WELLBEING_LABEL = T('General wellbeing', 'பொது நலம்');
const WELLBEING_NOTE = T('General habits, not from astrology — no diagnosis, no treatment. Follow your own doctor’s advice first.',
  'ஜோதிடத்திலிருந்து அல்லாத பொதுப் பழக்கங்கள் — நோய் கண்டறிதலோ சிகிச்சையோ அல்ல. உங்கள் மருத்துவர் ஆலோசனையே முதன்மை.');
const REFLECTION_LABEL = T('Traditional reflection (optional)', 'மரபுச் சிந்தனை (விருப்பம்)');
const REFLECTION_NOTE = T('Spiritual practices only — prayer, a lamp, a mantra, a calm routine. This is not health advice.',
  'ஆன்மீகப் பழக்கங்கள் மட்டுமே — பிரார்த்தனை, தீபம், மந்திரம், அமைதியான வழக்கம். இது உடல்நல ஆலோசனை அல்ல.');
const TRADITION_LABEL = T('Traditional indications — not a diagnosis, not medical advice', 'மரபுக் குறிப்புகள் — நோய் கண்டறிதல் அல்ல, மருத்துவ ஆலோசனை அல்ல');
const VITALITY_NOT_ASSESSED = T('Thunai does not estimate lifespan or vitality from a horoscope. Regular check-ups with your doctor are the reliable guide.',
  'துணை ஜாதகத்திலிருந்து ஆயுளையோ உயிர்ச்சக்தியையோ கணிப்பதில்லை. மருத்துவரிடம் வழக்கமான பரிசோதனையே நம்பகமான வழிகாட்டி.');
export const GUIDE_TITLE = T('Jathagam Health Guide', 'ஜாதக ஆரோக்கிய வழிகாட்டி');
const NOW_LABEL = T('Health care now', 'ஆரோக்கிய கவனம் இப்போது');

function ageOf(chart, now, profile) {
  const exact = (now - chart.utc) / YEAR;
  const age = Number.isFinite(profile?.age) ? profile.age : Math.max(0, Math.floor(exact));
  const minor = typeof profile?.minor === 'boolean' ? profile.minor : age < ADULT_AGE;
  return { age, exact: Number.isFinite(profile?.age) ? profile.age + 0.5 : exact, minor };
}

/** Rank the areas for "now": the Bhukti lord first, then the Dasa lord, then the slow transits; natal overlap breaks ties. */
function nowAreas(cur, gochara, natal) {
  const w = {};
  const add = (id, x) => { w[id] = (w[id] || 0) + x; };
  cur.ad?.areas.forEach((id, i) => add(id, i ? 2 : 3));
  cur.md?.areas.forEach((id, i) => add(id, i ? 1.25 : 2));
  gochara.items.forEach((g) => g.areas.forEach((id, i) => add(id, i ? 0.75 : 1.25)));
  (natal || []).forEach((a, i) => { if (w[a.id]) add(a.id, i < 2 ? 1 : 0.5); });
  return Object.keys(w).sort((a, b) => w[b] - w[a]);
}

// ------------------------------------------------------------------ main
/**
 * Health guide for one person. chart: birthChart output (birthArgs-mapped, so an unknown time has no Lagna).
 * options: now, gender ('male' | 'female' | undefined), tz (residence time zone, hours) for dates,
 * profile (ageProfile result) for the age guard.
 */
export function healthGuide(chart, { now = new Date(), gender, tz = null, profile = null } = {}) {
  const zone = tz ?? chart.tz ?? 5.5;
  const P = chart.planets;
  const ref = refOf(chart);
  const { age, exact, minor } = ageOf(chart, now, profile);
  const stageDef = HEALTH_STAGES.find((s) => exact < s.max);
  const checklist = CHECKS.filter((c) => age >= c.min && age < c.max && (!c.gender || !gender || c.gender === gender))
    .map((c) => ({ en: c.en, ta: c.ta, ...(c.gender ? { forGender: c.gender } : {}), needsMedicalReview: true, source: SCREENING_SOURCE.id }));
  const stage = {
    id: stageDef.id, en: stageDef.en, ta: stageDef.ta, checklist,
    note: T('General check-up list (not from astrology). Discuss it with your doctor — they decide what and how often.', 'பொதுப் பரிசோதனைப் பட்டியல் (ஜோதிடத்திலிருந்து அல்ல). உங்கள் மருத்துவரிடம் கலந்து பேசுங்கள் — எது, எப்போது என்பதை அவரே முடிவு செய்வார்.'),
    needsMedicalReview: true, source: SCREENING_SOURCE, fromAstrology: false,
  };
  const habits = generalHabits(stage.id);

  // Spiritual reflection (kept for Today, Ask Thunai and the guide's remedies card).
  const { md, ad } = lordsAt(chart, now);
  const g0 = gocharaCare(chart, now, ref, { spans: !minor, tz: zone });
  const reflNotes = [];
  const rn = (id, en, ta) => reflNotes.push({ id, ...T(en, ta) });
  if ([12, 1, 2].includes(g0.sat)) rn('ezharai', `Ezharai Sani (phase ${g0.sat === 12 ? 1 : g0.sat === 1 ? 2 : 3} of 3) — tradition suggests a Saturday lamp and patience`, `ஏழரைச் சனி (${g0.sat === 12 ? 'விரய' : g0.sat === 1 ? 'ஜென்ம' : 'பாத'} சனி) — சனிக்கிழமை தீபமும் பொறுமையும் என மரபு சொல்கிறது`);
  else if (g0.sat === 8) rn('ashtama', 'Ashtama Sani — tradition suggests Saturday prayer and a calm, unhurried routine', 'அஷ்டமச் சனி — சனிக்கிழமை வழிபாடும் அமைதியான, நிதானமான வழக்கமும் என மரபு சொல்கிறது');
  else if (g0.sat === 4) rn('ardhashtama', 'Ardhashtama Sani — tradition suggests a lamp at home on Saturdays', 'அர்த்தாஷ்டமச் சனி — சனிக்கிழமை வீட்டில் தீபம் என மரபு சொல்கிறது');
  if (g0.rahu === 1) rn('rahu', 'Rahu over your Moon sign — tradition suggests a prayer to Durga', 'ராகு உங்கள் சந்திர ராசி மேல் — துர்கை வழிபாடு என மரபு சொல்கிறது');
  if (g0.ketu === 1) rn('ketu', 'Ketu over your Moon sign — tradition suggests a prayer to Vinayagar', 'கேது உங்கள் சந்திர ராசி மேல் — விநாயகர் வழிபாடு என மரபு சொல்கிறது');
  if (g0.guruBalam) rn('guru_balam', 'Guru Balam — a time tradition sees for a Thursday prayer of thanks', 'குரு பலம் — வியாழன் நன்றி வழிபாட்டிற்கான காலம் என மரபு பார்க்கிறது');
  const gNotes = reflNotes;
  const lords = [...new Set([md?.lord, ad?.lord].filter(Boolean))];
  const practices = lords.map((k, i) => {
    const why = i === 0 && k === md?.lord ? T(`Running ${k} Dasa`, `நடப்பு ${planetAdjTa(k, PLANETS[k].ta)} தசை`) : T(`Running ${k} Bhukti`, `நடப்பு ${planetAdjTa(k, PLANETS[k].ta)} புக்தி`);
    const lamp = T(`Light a lamp on ${dayOf(k).en} with a short prayer to ${NAVAGRAHA[k].deity.en}`, `${dayOf(k).ta} அன்று ${NAVAGRAHA[k].deity.ta} முன் ஒரு தீபமும் சிறு பிரார்த்தனையும்`);
    return { planet: k, ta: PLANETS[k].ta, why, day: dayOf(k), deity: NAVAGRAHA[k].deity, mantra: NAVAGRAHA[k].mantra, charity: NAVAGRAHA[k].charity, lamp };
  });
  // The guide's remedies card adds the temple and a free practice to each reflection practice.
  const remedyPlanets = practices.map((x) => ({ ...x, temple: NAVAGRAHA[x.planet].temple, free: NAVAGRAHA[x.planet].free }));
  const calm = T('A calm routine: a few quiet minutes of prayer or slow breathing each morning', 'அமைதியான வழக்கம்: தினமும் காலையில் சில நிமிடங்கள் அமைதியான பிரார்த்தனை அல்லது மெதுவான சுவாசம்');
  const healing = HEALING;
  const reflection = {
    label: REFLECTION_LABEL, note: REFLECTION_NOTE, optional: true, notHealthAdvice: true, fromAstrology: true,
    period: null, practices, gochara: gNotes, calm, healing, mantra: MRITYUNJAYA,
  };

  const base = {
    name: chart.name,
    title: GUIDE_TITLE,
    policyVersion: HEALTH_POLICY_VERSION,
    flags: HEALTH_FLAGS,
    age, minor, stage,
    wellbeing: { label: WELLBEING_LABEL, note: WELLBEING_NOTE, fromAstrology: false, habits, checklist: stage.checklist, yoga: null, needsMedicalReview: true, reviewLabel: NEEDS_MEDICAL_REVIEW, source: SCREENING_SOURCE },
    reflection,
    needsBirthTime: !ref.hasLagna,
    birthTimeNote: ref.hasLagna ? (ref.lagnaMayChange ? APPROX_TIME(Math.round(chart.stability.windowMinutes)) : null) : NEEDS_TIME,
    lagnaMayChange: ref.lagnaMayChange,
    vitality: { level: 'not-assessed', text: VITALITY_NOT_ASSESSED, lifespanInference: false },
    disclaimer: DISCLAIMER,
    sourceNote: SOURCE_NOTE,
  };

  const periodBase = {
    md: md && { lord: md.lord, ta: PLANETS[md.lord].ta, start: md.start, end: md.end },
    ad: ad && { lord: ad.lord, ta: PLANETS[ad.lord].ta, start: ad.start, end: ad.end },
    gochara: gNotes,
    transit: { saturnFromMoon: g0.sat, jupiterFromMoon: g0.jup, rahuFromMoon: g0.rahu, ketuFromMoon: g0.ketu },
    guruBalam: g0.guruBalam,
  };

  // Minors: general habits and growth check-ups only — no chart-based body areas, food rules or period warnings.
  if (minor) {
    const yoga = yogaFor(stage.id, null).map((y) => ({ ...y, needsMedicalReview: true }));
    base.wellbeing.yoga = yoga;
    return {
      ...base, yoga,
      period: { ...periodBase, notHealthAdvice: true },
      kidTips: KID_TIPS, minorNote: MINOR_NOTE,
      constitution: null, bodyAreas: null, outlook: null, upcoming: null, months: null, diet: null, routine: null, now: null,
      traditionalContext: { label: TRADITION_LABEL, optional: true, adultOnly: true, shown: false, notMedicalAdvice: true, canDriveTreatment: false, sections: [] },
      remedies: { planets: practices, healing, mantra: reflection.mantra, optional: true, notTreatment: true, note: REMEDY_NOTE },
    };
  }

  // Adults: the full traditional guide.
  const st = Object.fromEntries(grahaStrength(P).map((x) => [x.planet, x]));
  const con = constitution(P, ref.hasLagna);
  const natal = natalAreas(chart, st, ref);
  const cur = { md: md ? periodItem(chart, md, 'dasa', ref, zone) : null, ad: ad ? periodItem(chart, ad, 'bhukti', ref, zone) : null };
  const ranked = nowAreas(cur, g0, natal);
  const top = ranked.slice(0, 2);
  const outlook = {
    title: T('This period: Dasa, Bhukti and Gochara', 'இந்தக் காலம்: தசை, புக்தி, கோசாரம்'),
    md: cur.md, ad: cur.ad,
    gochara: g0.items,
    guruBalam: g0.guruBalam,
    guruLine: g0.guruBalam
      ? T('Guru Balam is running — tradition sees support for steady routines and timely check-ups.', 'குரு பலம் நடக்கிறது — சீரான வழக்கத்துக்கும் உரிய நேரப் பரிசோதனைக்கும் ஆதரவான காலம் என மரபு பார்க்கிறது.')
      : null,
    areas: top,
    line: careLine(top.length ? top : ['mind']),
    tips: top.map((id) => BODY_AREAS[id].tip),
    note: TRADITION_NOTE,
  };

  // Next periods: the next three Bhuktis (they may cross into the next Dasa).
  const allB = chart.dasa.periods.flatMap((p) => p.bhuktis.map((b) => ({ ...b, md: p.lord })));
  const nextB = allB.filter((b) => b.start > now).slice(0, 3);
  const upcoming = {
    title: T('Coming periods', 'வரவிருக்கும் காலங்கள்'),
    items: nextB.map((b) => ({ ...periodItem(chart, b, 'bhukti', ref, zone), dasaLord: b.md, dasaName: periodName(b.md, 'dasa'), from: monthLabel(b.start, zone) })),
    note: TRADITION_NOTE,
  };

  // 12-month care map (mid-month, residence time zone).
  const loc = localOf(now, zone);
  const months = [];
  const cache = new Map();
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(loc.getUTCFullYear(), loc.getUTCMonth() + i, 15, 6) - zone * 3600000);
    const la = lordsAt(chart, d);
    const tg = gocharaCare(chart, d, ref);
    const key = la.ad?.lord || la.md?.lord || 'none';
    if (!cache.has(key)) cache.set(key, la.ad ? lordAreas(chart, la.ad.lord, ref) : la.md ? lordAreas(chart, la.md.lord, ref) : { areas: [{ id: 'mind' }], dusthanaLord: false });
    const lA = cache.get(key);
    const focus = tg.marsCare ? 'blood' : lA.areas[0].id;
    const level = tg.marsCare || lA.dusthanaLord || tg.items.some((x) => ['ashtama', 'ezharai'].includes(x.id)) ? 'care' : 'routine';
    const x = localOf(d, zone);
    months.push({
      month: `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`,
      label: monthLabel(d, zone), level, focus, icon: BODY_AREAS[focus].icon,
      area: T(BODY_AREAS[focus].en, BODY_AREAS[focus].ta),
      md: la.md?.lord || null, ad: la.ad?.lord || null, marsCare: tg.marsCare,
      note: tg.marsCare
        ? T('Mars over your Moon sign or 8th from it — tradition asks for extra care with body heat, fire, sharp tools and driving this month.', 'செவ்வாய் உங்கள் ராசியில் அல்லது ராசிக்கு 8-ம் இடத்தில் — இந்த மாதம் உடல் சூடு, நெருப்பு, கூர்மையான கருவிகள், வாகனப் பயணத்தில் கூடுதல் கவனம் என மரபு சொல்கிறது.')
        : T(`${la.ad ? `${la.ad.lord} Bhukti` : 'This period'}: ${BODY_AREAS[focus].part.en} — ${BODY_AREAS[focus].tip.en}`, `${la.ad ? `${PLANETS[la.ad.lord].ta} புக்தி` : 'இந்தக் காலம்'}: ${BODY_AREAS[focus].part.ta} — ${BODY_AREAS[focus].tip.ta}`),
    });
  }

  const dietLords = [...new Set([ad?.lord, md?.lord].filter(Boolean))];
  const diet = buildDiet(con, dietLords);
  const yoga = yogaFor(stage.id, con).map((y) => ({ ...y, needsMedicalReview: true }));
  base.wellbeing.yoga = yoga;
  const routine = {
    title: T('Daily routine, yoga & breathing', 'தினசரி வழக்கம், யோகா, சுவாசப் பயிற்சி'),
    daily: [...ROUTINE.base, ROUTINE[con.dominant], ...diet.habits.map((h) => T(h.en, h.ta))],
    yoga,
    note: T('Go gently and stop if anything hurts. Ask your doctor first if you have a condition or are pregnant. Traditional indication only — not a diagnosis; for any symptom, see a doctor.',
      'மெதுவாகச் செய்யுங்கள்; வலி இருந்தால் நிறுத்துங்கள். உடல்நிலை ஏதேனும் இருந்தால் அல்லது கர்ப்பமாக இருந்தால் முதலில் மருத்துவரிடம் கேளுங்கள். இது மரபுக் குறிப்பு மட்டுமே — நோய் கண்டறிதல் அல்ல; எந்த அறிகுறிக்கும் மருத்துவரைப் பாருங்கள்.'),
  };

  return {
    ...base,
    constitution: con,
    bodyAreas: { title: T('Body areas your chart asks you to look after', 'ஜாதகப்படி கவனிக்க வேண்டிய உடல் பகுதிகள்'), items: natal, reference: ref.from, note: TRADITION_NOTE, source: SOURCE_NOTE },
    outlook, upcoming, months: { title: T('12-month care map', '12 மாதக் கவனக் குறிப்பு'), items: months, note: TRADITION_NOTE }, diet, routine,
    now: healthNowFrom(cur, top, zone),
    period: { ...periodBase, areas: top, notHealthAdvice: false, traditionalIndication: true },
    yoga,
    kidTips: null,
    traditionalContext: { label: TRADITION_LABEL, optional: true, adultOnly: true, shown: true, houseBasedPartsShown: ref.hasLagna, notMedicalAdvice: true, canDriveTreatment: false,
      sections: ['constitution', 'bodyAreas', 'outlook', 'upcoming', 'months', 'diet', 'routine', 'remedies'] },
    remedies: {
      title: T('Remedies & prayer (optional)', 'பரிகாரம், பிரார்த்தனை (விருப்பம்)'),
      planets: remedyPlanets, healing, mantra: reflection.mantra, optional: true, notTreatment: true, note: REMEDY_NOTE,
    },
  };
}

function healthNowFrom(cur, top, zone) {
  const p = cur.ad || cur.md;
  if (!p || !top.length) return null;
  const until = p.end;
  const tip = BODY_AREAS[top[0]].tip;
  const line = careLine(top.slice(0, 1));
  return {
    label: NOW_LABEL,
    en: `${p.name.en} (till ${monthLabel(lastDay(until), zone).en}): ${line.en} ${tip.en} Traditional indication, not a diagnosis — see a doctor for any symptom.`,
    ta: `${p.name.ta} (${monthLabel(lastDay(until), zone).ta} வரை): ${line.ta} ${tip.ta} இது மரபுக் குறிப்பு, நோய் கண்டறிதல் அல்ல — அறிகுறி இருந்தால் மருத்துவரைப் பாருங்கள்.`,
    areas: top.slice(0, 1), until, untilLabel: monthLabel(lastDay(until), zone), period: p.name, link: 'health',
  };
}

/**
 * One-line "ஆரோக்கிய கவனம் இப்போது / Health care now" summary for the Today wellbeing card and the written palan.
 * profile: an ageProfile() result or a member ({ age, minor, gender }). Returns { en, ta, areas, until, link, label }.
 * Minors get a general habit line (areas: []), never a chart-based body area.
 */
export function healthNow(chart, profile = null, now = new Date(), { tz = null } = {}) {
  if (!chart?.planets?.Moon || !chart.dasa) return null;
  const zone = tz ?? chart.tz ?? 5.5;
  const { minor } = ageOf(chart, now, profile);
  if (minor) {
    return { label: NOW_LABEL, areas: [], until: null, untilLabel: null, link: 'health', minor: true,
      en: 'Regular sleep, outdoor play and home food at fixed times. For any worry, see your paediatrician.',
      ta: 'சீரான உறக்கம், வெளியில் விளையாட்டு, குறித்த நேரத்தில் வீட்டு உணவு. எந்தக் கவலைக்கும் குழந்தை மருத்துவரைப் பாருங்கள்.' };
  }
  const ref = refOf(chart);
  const { md, ad } = lordsAt(chart, now);
  const cur = { md: md ? periodItem(chart, md, 'dasa', ref, zone) : null, ad: ad ? periodItem(chart, ad, 'bhukti', ref, zone) : null };
  const g = gocharaCare(chart, now, ref);
  const st = Object.fromEntries(grahaStrength(chart.planets).map((x) => [x.planet, x]));
  const top = nowAreas(cur, g, natalAreas(chart, st, ref)).slice(0, 2);
  const out = healthNowFrom(cur, top, zone);
  return out && { ...out, minor: false, mayChange: !!(cur.ad?.mayChange || cur.md?.mayChange) };
}
