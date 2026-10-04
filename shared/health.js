// Health Guide (ஆரோக்கிய வழிகாட்டி) — preventive health for each person from the Jathagam + age +
// current Dasa / Bhukti + Gochara: the age-wise check-up list, an Ayurveda / Siddha style constitution
// (வாதம் / பித்தம் / கபம்), body areas to protect (Kalapurusha + planet karakatvas + 6/8/12 houses),
// the present period's outlook, a 12-month strip, what to eat and avoid, simple yoga and free remedies.
// Wording is always about tendencies and prevention — never a diagnosis, never medicine, never fear.
import { RASIS, PLANETS, planetPositions } from './astro.js';
import { grahaStrength, NAVAGRAHA } from './remedies.js';
import { ayulBalam } from './lifecheck.js';

const T = (en, ta) => ({ en, ta });
const YEAR = 365.25 * 86400000;
const houseOf = (from, to) => ((to - from + 12) % 12) + 1;
const lordOf = (lagnaRasi, h) => RASIS[(lagnaRasi + h - 1) % 12].lord;
const housesRuled = (lagnaRasi, planet) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((h) => lordOf(lagnaRasi, h) === planet);
const MALEFICS = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];
const GRAHAS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const HOUSE_TA = { 6: 'ரோக ஸ்தானம்', 8: 'ஆயுள் ஸ்தானம்', 12: 'விரய ஸ்தானம்' };
const HOUSE_EN = { 6: 'disease', 8: 'chronic', 12: 'hospital & sleep' };

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

// ------------------------------------------------------------------ constitution
const DOSHAS = {
  vata: { ...T('Vata', 'வாதம்'),
    desc: T('Light, quick and creative. When out of balance it shows as dryness, gas, joint aches, poor sleep and worry. Warmth, routine and oil keep it calm.',
      'லேசான, சுறுசுறுப்பான, படைப்பாற்றல் உடல்வாகு. சமநிலை தவறினால் வறட்சி, வாயு, மூட்டு வலி, தூக்கமின்மை, கவலை வரலாம். சூடு, ஒழுங்கு, எண்ணெய் அமைதி தரும்.') },
  pitta: { ...T('Pitta', 'பித்தம்'),
    desc: T('Sharp, warm and driven. When out of balance it shows as acidity, body heat, skin rashes, anger and high pressure. Cooling food and a calm mind keep it steady.',
      'கூர்மையான, சூடான, உத்வேகமான உடல்வாகு. சமநிலை தவறினால் அமிலத்தன்மை, உடல் சூடு, தோல் அரிப்பு, கோபம், ரத்த அழுத்தம் வரலாம். குளிர்ச்சியான உணவும் அமைதியான மனமும் சமன் செய்யும்.') },
  kapha: { ...T('Kapha', 'கபம்'),
    desc: T('Steady, strong and patient. When out of balance it shows as weight gain, cold, cough, sugar and sluggishness. Daily activity, light warm food and early rising keep it light.',
      'நிலையான, வலுவான, பொறுமையான உடல்வாகு. சமநிலை தவறினால் எடை அதிகரிப்பு, சளி, இருமல், சர்க்கரை, மந்தம் வரலாம். தினசரி உழைப்பு, லேசான சூடான உணவு, அதிகாலை எழுதல் லேசாக்கும்.') },
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

function constitution(P) {
  const acc = { vata: 0, pitta: 0, kapha: 0 };
  const add = (map, w) => { for (const [k, v] of Object.entries(map)) acc[k] += v * w; };
  const L = P.Lagna.rasi;
  add(SIGN_DOSHA[L % 4], 3);
  add(PLANET_DOSHA[RASIS[L].lord], 2);
  add(SIGN_DOSHA[P.Moon.rasi % 4], 2);
  add(SIGN_DOSHA[P.Sun.rasi % 4], 1);
  const inLagna = GRAHAS.filter((k) => P[k].rasi === L);
  for (const k of inLagna) add(PLANET_DOSHA[k], 1.5);
  // Everyone carries all three doshas; a small base keeps any one from showing as 0%.
  for (const k of Object.keys(acc)) acc[k] += 1;
  const total = acc.vata + acc.pitta + acc.kapha;
  const pct = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, Math.round((v / total) * 100)]));
  const order = Object.keys(pct).sort((a, b) => acc[b] - acc[a]);
  pct[order[0]] += 100 - (pct.vata + pct.pitta + pct.kapha);
  const [dominant, secondary] = order;
  const dual = pct[dominant] - pct[secondary] <= 8;
  const name = dual ? T(`${DOSHAS[dominant].en}–${DOSHAS[secondary].en}`, `${DOSHAS[dominant].ta}–${DOSHAS[secondary].ta}`) : T(DOSHAS[dominant].en, DOSHAS[dominant].ta);
  const why = [
    T(`Lagna ${RASIS[L].en} (${ELEMENT[L % 4].en} sign), lord ${RASIS[L].lord}`, `லக்னம் ${RASIS[L].ta} (${ELEMENT[L % 4].ta} ராசி), அதிபதி ${PLANETS[RASIS[L].lord].ta}`),
    T(`Moon in ${RASIS[P.Moon.rasi].en} (${ELEMENT[P.Moon.rasi % 4].en} sign)`, `சந்திரன் ${RASIS[P.Moon.rasi].ta} (${ELEMENT[P.Moon.rasi % 4].ta} ராசி)`),
  ];
  if (inLagna.length) why.push(T(`In the lagna: ${inLagna.join(', ')}`, `லக்னத்தில்: ${inLagna.map((k) => PLANETS[k].ta).join(', ')}`));
  return { ...pct, dominant, secondary, dual, name, desc: DOSHAS[dominant].desc, why, doshas: DOSHAS };
}

// ------------------------------------------------------------------ body areas
export const BODY_AREAS = {
  head: { icon: '🧠', ...T('Head & brain', 'தலை, மூளை'), tip: T('Good sleep, a helmet on two-wheelers and less stress protect the head.', 'நல்ல உறக்கம், இருசக்கர வாகனத்தில் தலைக்கவசம், குறைந்த மன அழுத்தம் தலையைக் காக்கும்.') },
  throat: { icon: '🗣️', ...T('Face, throat & thyroid', 'முகம், தொண்டை, தைராய்டு'), tip: T('Warm water, gargle with salt water and avoid very cold drinks.', 'வெதுவெதுப்பான நீர், உப்புநீர் கொப்பளிப்பு; மிகக் குளிர்ந்த பானம் தவிர்க்கவும்.') },
  chest: { icon: '🫁', ...T('Chest, lungs & breathing', 'மார்பு, நுரையீரல், சுவாசம்'), tip: T('Daily pranayama, no smoking, and care in dust and cold.', 'தினமும் பிராணாயாமம், புகை தவிர்ப்பு, தூசி, குளிரில் கவனம்.') },
  heart: { icon: '❤️', ...T('Heart & circulation', 'இதயம், ரத்த ஓட்டம்'), tip: T('Walk daily, less oil and salt, and check BP regularly.', 'தினமும் நடை, குறைந்த எண்ணெய், உப்பு; ரத்த அழுத்தத்தை அடிக்கடி சரிபார்க்கவும்.') },
  eyes: { icon: '👁️', ...T('Eyes', 'கண்கள்'), tip: T('Screen breaks, greens and carrots, and a yearly eye test.', 'திரை இடைவெளி, கீரை, கேரட், ஆண்டுதோறும் கண் பரிசோதனை.') },
  stomach: { icon: '🍃', ...T('Stomach & digestion', 'வயிறு, செரிமானம்'), tip: T('Eat on time, chew well and do not overeat; buttermilk after lunch helps.', 'நேரத்திற்கு உணவு, நன்றாக மென்று உண்ணுதல், அளவோடு; மதியம் மோர் நல்லது.') },
  liver: { icon: '🫀', ...T('Liver, fat & sugar', 'கல்லீரல், கொழுப்பு, சர்க்கரை'), tip: T('Less sugar and fried food, a walk after meals, and a yearly sugar test.', 'குறைந்த இனிப்பு, பொரித்த உணவு; உணவுக்குப் பின் நடை; ஆண்டுதோறும் சர்க்கரைப் பரிசோதனை.') },
  kidneys: { icon: '💧', ...T('Kidneys, lower back & hormones', 'சிறுநீரகம், கீழ் முதுகு, ஹார்மோன்கள்'), tip: T('Drink enough water, less salt, and lift weights with a straight back.', 'போதுமான தண்ணீர், குறைந்த உப்பு, நேரான முதுகுடன் சுமை தூக்குதல்.') },
  reproductive: { icon: '🌸', ...T('Reproductive & urinary health', 'இனப்பெருக்க, சிறுநீர் உறுப்புகள்'), tip: T('Hygiene, enough water and timely check-ups.', 'சுத்தம், போதுமான தண்ணீர், உரிய நேரப் பரிசோதனை.') },
  thighs: { icon: '🦵', ...T('Hips & thighs', 'இடுப்பு, தொடைகள்'), tip: T('Stretch daily and avoid sitting for long hours.', 'தினமும் உடல் நீட்சிப் பயிற்சி; நீண்ட நேரம் உட்காருவதைத் தவிர்க்கவும்.') },
  joints: { icon: '🦴', ...T('Knees, joints, bones & teeth', 'மூட்டுகள், எலும்புகள், முழங்கால், பற்கள்'), tip: T('Gentle exercise, calcium-rich food (ragi, sesame) and morning sunlight.', 'மென்மையான பயிற்சி, கால்சியம் நிறைந்த உணவு (கேழ்வரகு, எள்), காலை வெயில்.') },
  legs: { icon: '🦶', ...T('Calves, ankles & leg veins', 'கெண்டைக்கால், கணுக்கால், கால் நரம்புகள்'), tip: T('Walk, raise the legs when resting and avoid standing still for hours.', 'நடைப்பயிற்சி, ஓய்வில் கால்களை உயர்த்தி வைத்தல்; மணிக்கணக்கில் நின்றபடி இருப்பதைத் தவிர்க்கவும்.') },
  feet: { icon: '👣', ...T('Feet', 'பாதங்கள்'), tip: T('Comfortable footwear, foot care, and a warm foot soak before sleep.', 'வசதியான காலணி, பாதப் பராமரிப்பு, உறங்கும் முன் வெதுவெதுப்பான நீரில் பாதம்.') },
  blood: { icon: '🩸', ...T('Blood, BP & injuries', 'ரத்தம், ரத்த அழுத்தம், காயங்கள்'), tip: T('Drive carefully, handle sharp tools with care, and keep anger and BP in check.', 'கவனமாக வாகனம் ஓட்டுதல், கூர்மையான கருவிகளில் கவனம், கோபம், ரத்த அழுத்தம் கட்டுக்குள்.') },
  nerves: { icon: '⚡', ...T('Nerves, skin & speech', 'நரம்புகள், தோல், பேச்சு'), tip: T('Rest the mind, sleep well and keep the skin clean and moisturised.', 'மனதுக்கு ஓய்வு, நல்ல உறக்கம், தோலைச் சுத்தமாகவும் ஈரப்பதமாகவும் வைத்தல்.') },
  mind: { icon: '🌙', ...T('Mind, sleep & body fluids', 'மனம், உறக்கம், உடல் நீர்ச்சத்து'), tip: T('Fixed sleep time, meditation and talking openly with loved ones.', 'குறித்த நேர உறக்கம், தியானம், அன்பானவர்களுடன் மனம் விட்டுப் பேசுதல்.') },
  allergy: { icon: '🌫️', ...T('Allergies & addictions', 'ஒவ்வாமை, போதைப் பழக்கம்'), tip: T('Fresh home food, no tobacco or alcohol, and note what triggers allergies.', 'வீட்டு உணவு, புகையிலை, மது தவிர்ப்பு; எது ஒவ்வாமை தருகிறது எனக் குறித்து வைத்தல்.') },
  infection: { icon: '🛡️', ...T('Infections, wounds & gut', 'தொற்று, புண்கள், குடல்'), tip: T('Wash hands, eat freshly cooked food and clean small wounds at once.', 'கை கழுவுதல், புதிதாகச் சமைத்த உணவு, சிறு காயங்களை உடனே சுத்தம் செய்தல்.') },
};
// Kalapurusha: Mesha head … Meena feet.
const SIGN_AREA = ['head', 'throat', 'chest', 'chest', 'heart', 'stomach', 'kidneys', 'reproductive', 'thighs', 'joints', 'legs', 'feet'];
const SIGN_PART = [
  T('head', 'தலை'), T('face & throat', 'முகம், தொண்டை'), T('shoulders & lungs', 'தோள், நுரையீரல்'), T('chest', 'மார்பு'),
  T('heart', 'இதயம்'), T('stomach', 'வயிறு'), T('kidneys & lower back', 'சிறுநீரகம், கீழ் முதுகு'), T('reproductive organs', 'இனப்பெருக்க உறுப்புகள்'),
  T('hips & thighs', 'இடுப்பு, தொடை'), T('knees', 'முழங்கால்'), T('calves & ankles', 'கெண்டைக்கால், கணுக்கால்'), T('feet', 'பாதங்கள்'),
];
// Planet karakatvas (first = main).
const PLANET_AREAS = {
  Sun: ['heart', 'eyes', 'joints'], Moon: ['mind', 'chest'], Mars: ['blood'], Mercury: ['nerves'], Jupiter: ['liver'],
  Venus: ['kidneys', 'reproductive'], Saturn: ['joints'], Rahu: ['allergy'], Ketu: ['infection', 'stomach'],
};
const PLANET_KARAKA = {
  Sun: T('heart, eyes, bones', 'இதயம், கண், எலும்பு'), Moon: T('mind, fluids, chest, sleep', 'மனம், நீர்ச்சத்து, மார்பு, உறக்கம்'),
  Mars: T('blood, BP, injuries', 'ரத்தம், ரத்த அழுத்தம், காயம்'), Mercury: T('nerves, skin, speech', 'நரம்பு, தோல், பேச்சு'),
  Jupiter: T('liver, fat, sugar', 'கல்லீரல், கொழுப்பு, சர்க்கரை'), Venus: T('kidneys, hormones, reproductive health', 'சிறுநீரகம், ஹார்மோன், இனப்பெருக்கம்'),
  Saturn: T('joints, bones, teeth, long-standing ailments', 'மூட்டு, எலும்பு, பல், நீண்டகால உபாதைகள்'), Rahu: T('allergies, poisons, addictions, unclear ailments', 'ஒவ்வாமை, நச்சு, போதை, புரியாத உபாதைகள்'),
  Ketu: T('infections, wounds, digestion', 'தொற்று, புண், செரிமானம்'),
};

function bodyAreas(P, st, md, ad) {
  const L = P.Lagna.rasi;
  const score = {}, reasons = {}, planets = {};
  const bump = (id, pts, reason, planet) => {
    score[id] = (score[id] || 0) + pts;
    (reasons[id] ||= []);
    if (reason && !reasons[id].some((r) => r.en === reason.en)) reasons[id].push(reason);
    if (planet) (planets[id] ||= new Set()).add(planet);
  };
  const viaPlanet = (k, pts, reason) => PLANET_AREAS[k].forEach((id, i) => bump(id, i ? pts * 0.5 : pts, reason, k));
  const viaSign = (s, pts, reason) => bump(SIGN_AREA[s], pts, reason);
  const sign = (s) => T(RASIS[s].en, RASIS[s].ta);

  viaSign(L, 1.5, T(`Lagna (body) is ${RASIS[L].en} — Kalapurusha ${SIGN_PART[L].en}`, `லக்னம் (உடல்) ${RASIS[L].ta} — காலபுருஷ ${SIGN_PART[L].ta}`));
  const lagnaLord = RASIS[L].lord;
  if (st[lagnaLord].level === 'weak') viaPlanet(lagnaLord, 2, T(`Lagna lord ${lagnaLord} is weak — protect ${PLANET_KARAKA[lagnaLord].en}`, `லக்னாதிபதி ${PLANETS[lagnaLord].ta} பலம் குறைவு — ${PLANET_KARAKA[lagnaLord].ta} காக்கவும்`));
  const llh = houseOf(L, P[lagnaLord].rasi);
  if ([6, 8, 12].includes(llh)) viaSign(P[lagnaLord].rasi, 1.5, T(`Lagna lord in the ${llh}th house (${sign(P[lagnaLord].rasi).en})`, `லக்னாதிபதி ${llh}-ம் வீட்டில் (${sign(P[lagnaLord].rasi).ta})`));

  for (const [h, w] of [[6, 2], [8, 1.5], [12, 1]]) {
    const s = (L + h - 1) % 12;
    viaSign(s, w, T(`${h}th house (${HOUSE_EN[h]}) falls in ${RASIS[s].en} — ${SIGN_PART[s].en}`, `${h}-ம் வீடு (${HOUSE_TA[h]}) ${RASIS[s].ta} — ${SIGN_PART[s].ta}`));
    const lord = lordOf(L, h);
    if (lord !== lagnaLord) {
      viaPlanet(lord, w * 0.6, T(`${lord} rules the ${h}th house (${HOUSE_EN[h]})`, `${PLANETS[lord].ta} ${h}-ம் வீட்டு அதிபதி (${HOUSE_TA[h]})`));
      viaSign(P[lord].rasi, w * 0.4, T(`${h}th lord ${lord} sits in ${RASIS[P[lord].rasi].en}`, `${h}-ம் அதிபதி ${PLANETS[lord].ta} ${RASIS[P[lord].rasi].ta} ராசியில்`));
    }
    for (const k of GRAHAS.filter((g) => P[g].rasi === s)) {
      const mal = MALEFICS.includes(k);
      viaPlanet(k, mal ? w * 0.9 : w * 0.5, T(`${k} in the ${h}th house (${HOUSE_EN[h]})`, `${PLANETS[k].ta} ${h}-ம் வீட்டில் (${HOUSE_TA[h]})`));
    }
  }
  for (const k of MALEFICS.filter((g) => houseOf(L, P[g].rasi) === 1)) {
    viaPlanet(k, 1, T(`${k} in the lagna`, `${PLANETS[k].ta} லக்னத்தில்`));
  }
  for (const g of Object.values(st)) {
    if (g.level === 'weak') viaPlanet(g.planet, 2, T(`${g.planet} is weak in the chart (strength ${g.score}) — ${PLANET_KARAKA[g.planet].en}`, `${PLANETS[g.planet].ta} பலம் குறைவு (${g.score}) — ${PLANET_KARAKA[g.planet].ta}`));
  }
  if (md) viaPlanet(md, 1, T(`Running ${md} Dasa`, `நடப்பு ${PLANETS[md].ta} தசை`));
  if (ad) viaPlanet(ad, 0.75, T(`Running ${ad} Bhukti`, `நடப்பு ${PLANETS[ad].ta} புக்தி`));

  const ranked = Object.keys(score).sort((a, b) => score[b] - score[a]);
  const top = ranked.filter((id, i) => i < 4 || (i < 6 && score[id] >= 3));
  const max = score[top[0]];
  return top.map((id) => ({
    id, ...BODY_AREAS[id], score: Math.round(score[id] * 10) / 10,
    level: score[id] >= Math.max(4, max * 0.7) ? 'care' : 'watch',
    planets: [...(planets[id] || [])],
    reasons: reasons[id].slice(0, 3),
  }));
}

// ------------------------------------------------------------------ period (dasa + gochara)
function lordsAt(chart, date) {
  const md = chart.dasa.periods.find((p) => date >= p.start && date < p.end) || null;
  const ad = md ? md.bhuktis.find((b) => date >= b.start && date < b.end) || null : null;
  return { md, ad };
}

function lordHealth(chart, k, st) {
  const P = chart.planets, L = P.Lagna.rasi;
  let s = 0;
  const notes = [];
  const lagnaLord = RASIS[L].lord;
  if (k === lagnaLord) { s += 1; notes.push(T(`${k} is your lagna lord — vitality is supported`, `${PLANETS[k].ta} உங்கள் லக்னாதிபதி — உயிர்ச்சக்திக்கு ஆதரவு`)); }
  const bad = housesRuled(L, k).filter((h) => [6, 8, 12].includes(h));
  if (bad.length && k !== lagnaLord) { s -= 0.75; notes.push(T(`${k} rules the ${bad.join(' & ')}th house — keep routines`, `${PLANETS[k].ta} ${bad.join(', ')}-ம் வீட்டு அதிபதி — ஒழுங்கான வாழ்க்கை முறை தேவை`)); }
  const h = houseOf(L, P[k].rasi);
  if ([6, 8, 12].includes(h)) { s -= 0.75; notes.push(T(`${k} sits in the ${h}th house`, `${PLANETS[k].ta} ${h}-ம் வீட்டில்`)); }
  else if ([1, 5, 9].includes(h)) s += 0.5;
  if (st[k].level === 'weak') { s -= 1; notes.push(T(`${k} is weak — protect ${PLANET_KARAKA[k].en}`, `${PLANETS[k].ta} பலம் குறைவு — ${PLANET_KARAKA[k].ta} காக்கவும்`)); }
  else if (st[k].level === 'strong') { s += 0.75; notes.push(T(`${k} is strong — a protective influence`, `${PLANETS[k].ta} வலுவாக உள்ளார் — பாதுகாப்பு`)); }
  if (k === 'Rahu' || k === 'Ketu') s -= 0.25;
  return { score: s, notes };
}

function gochara(chart, date) {
  const { planets } = planetPositions(date);
  const M = chart.planets.Moon.rasi, L = chart.planets.Lagna.rasi;
  const fm = (k) => houseOf(M, planets[k].rasi), fl = (k) => houseOf(L, planets[k].rasi);
  const sat = fm('Saturn'), jup = fm('Jupiter'), rahu = fm('Rahu'), ketu = fm('Ketu'), mars = fm('Mars');
  let s = 0;
  const notes = [];
  const n = (pts, kind, en, taText) => { s += pts; notes.push({ kind, ...T(en, taText) }); };
  if ([12, 1, 2].includes(sat)) n(-1.25, 'care', `Ezharai Sani (phase ${sat === 12 ? 1 : sat === 1 ? 2 : 3} of 3) — keep sleep, food and stress in check`, `ஏழரைச் சனி (${sat === 12 ? 'விரய' : sat === 1 ? 'ஜென்ம' : 'பாத'} சனி) — உறக்கம், உணவு, மன அழுத்தத்தில் கவனம்`);
  else if (sat === 8) n(-1.5, 'care', 'Ashtama Sani — do not ignore small symptoms; rest and regular check-ups', 'அஷ்டமச் சனி — சிறு அறிகுறிகளையும் புறக்கணிக்காதீர்கள்; ஓய்வும் பரிசோதனையும்');
  else if (sat === 4) n(-0.75, 'care', 'Ardhashtama Sani — care for chest, rest and peace at home', 'அர்த்தாஷ்டமச் சனி — மார்பு, ஓய்வு, வீட்டில் அமைதியில் கவனம்');
  else if ([3, 6, 11].includes(sat)) n(0.5, 'good', `Saturn ${sat}th from Moon — steady strength`, `சனி சந்திரனிலிருந்து ${sat}-ல் — நிலையான பலம்`);
  if (fl('Saturn') === 1 && ![12, 1, 2].includes(sat)) n(-0.5, 'care', 'Saturn over your lagna — joints and tiredness need care', 'சனி லக்னத்தில் — மூட்டு, சோர்வில் கவனம்');
  if (rahu === 1 || fl('Rahu') === 1) n(-0.75, 'care', 'Rahu over your Moon / lagna — avoid outside food, addictions and confusion', 'ராகு சந்திரன் / லக்னம் மேல் — வெளி உணவு, போதை, குழப்பம் தவிர்க்கவும்');
  if (ketu === 1 || fl('Ketu') === 1) n(-0.75, 'care', 'Ketu over your Moon / lagna — guard against infections and small wounds', 'கேது சந்திரன் / லக்னம் மேல் — தொற்று, சிறு காயங்களில் கவனம்');
  if ([2, 5, 7, 9, 11].includes(jup)) n(1, 'good', 'Guru Balam — Jupiter protects your health', 'குரு பலம் — குரு உங்கள் ஆரோக்கியத்தைக் காக்கிறார்');
  if ([1, 5, 7, 9].includes(fl('Jupiter'))) n(0.5, 'good', 'Jupiter blesses your lagna — a healing influence', 'குரு லக்னத்தைப் பார்க்கிறார் — குணமளிக்கும் ஆசி');
  const marsCare = [1, 8].includes(mars) || [1, 8].includes(fl('Mars'));
  if (marsCare) n(-1, 'care', 'Mars over the Moon / 8th — careful with injuries, fever, heat and driving', 'செவ்வாய் சந்திரன் / 8-ம் இடத்தில் — காயம், காய்ச்சல், உடல் சூடு, வாகனப் பயணத்தில் கவனம்');
  else if ([3, 6, 11].includes(mars)) n(0.25, 'good', 'Mars supports energy and recovery', 'செவ்வாய் சக்தியும் விரைவான குணமும் தருகிறார்');
  return { score: s, notes, sat, jup, rahu, ketu, mars, marsCare };
}

const PERIOD_TEXT = {
  good: T('A supportive period for health — keep the good habits going.', 'ஆரோக்கியத்திற்கு ஆதரவான காலம் — நல்ல பழக்கங்களைத் தொடருங்கள்.'),
  steady: T('A steady period — a regular routine and yearly check-ups keep you well.', 'நிலையான காலம் — ஒழுங்கான வாழ்க்கை முறையும் ஆண்டுப் பரிசோதனையும் உங்களை நலமாக வைக்கும்.'),
  care: T('A period to protect your health — rest well, eat simply and do not ignore small symptoms.', 'ஆரோக்கியத்தைப் பாதுகாக்க வேண்டிய காலம் — நன்றாக ஓய்வு, எளிய உணவு; சிறு அறிகுறிகளையும் புறக்கணிக்காதீர்கள்.'),
};

// ------------------------------------------------------------------ diet
const DOSHA_DIET = {
  pitta: {
    eat: [T('Tender coconut water', 'இளநீர்'), T('Buttermilk (neer mor) with curry leaves', 'கறிவேப்பிலை சேர்த்த நீர்மோர்'), T('Greens — ponnanganni, manathakkali keerai', 'கீரைகள் — பொன்னாங்கண்ணி, மணத்தக்காளி'), T('Cucumber, ash gourd, snake gourd', 'வெள்ளரி, பூசணி, புடலங்காய்'), T('Rice with moong dal (paasi paruppu)', 'பாசிப்பருப்புடன் சாதம்'), T('Coriander or fennel (sombu) water', 'கொத்தமல்லி அல்லது சோம்புத் தண்ணீர்')],
    avoid: [T('Excess chilli and pickles', 'அதிகக் காரம், ஊறுகாய்'), T('Deep-fried snacks', 'எண்ணெயில் பொரித்த தின்பண்டங்கள்'), T('Too much coffee or tea', 'அதிகக் காபி, தேநீர்'), T('Alcohol', 'மது'), T('Skipping meals', 'உணவைத் தவிர்த்தல்')],
    habits: [T('Avoid the hot midday sun; keep the head cool', 'உச்சி வெயிலைத் தவிர்த்து தலையைக் குளிர்ச்சியாக வைக்கவும்'), T('Weekly oil bath with sesame oil', 'வாரம் ஒருமுறை நல்லெண்ணெய்க் குளியல்')],
  },
  kapha: {
    eat: [T('Millets — ragi, kambu, thinai, varagu', 'சிறுதானியங்கள் — கேழ்வரகு, கம்பு, தினை, வரகு'), T('Ginger, pepper rasam, sukku coffee', 'இஞ்சி, மிளகு ரசம், சுக்கு காபி'), T('Horse gram (kollu) soup', 'கொள்ளு ரசம்'), T('Bitter gourd, drumstick, fenugreek greens', 'பாகற்காய், முருங்கை, வெந்தயக் கீரை'), T('Warm water through the day', 'நாள் முழுவதும் வெதுவெதுப்பான நீர்')],
    avoid: [T('Curd at night', 'இரவில் தயிர்'), T('Sweets and bakery items', 'இனிப்பு, பேக்கரி உணவுகள்'), T('Fried food', 'பொரித்த உணவு'), T('Cold drinks and ice cream', 'குளிர்பானம், ஐஸ்கிரீம்'), T('Sleeping in the daytime', 'பகல் தூக்கம்')],
    habits: [T('Wake up before sunrise', 'சூரிய உதயத்திற்கு முன் எழுதல்'), T('A light dinner before 8 PM', 'இரவு 8 மணிக்குள் லேசான உணவு')],
  },
  vata: {
    eat: [T('Warm cooked meals — rice, sambar, rasam', 'சூடான சமைத்த உணவு — சாதம், சாம்பார், ரசம்'), T('Sesame oil in cooking (moderately)', 'சமையலில் நல்லெண்ணெய் (அளவோடு)'), T('Ghee in moderation', 'அளவோடு நெய்'), T('Cooked vegetables — pumpkin, carrot, beans', 'சமைத்த காய்கறிகள் — பூசணி, கேரட், பீன்ஸ்'), T('Soaked dates, figs and banana', 'ஊறவைத்த பேரீச்சை, அத்திப்பழம், வாழைப்பழம்')],
    avoid: [T('Cold, dry and too much raw food', 'குளிர்ந்த, வறண்ட, அதிகப் பச்சை உணவு'), T('Leftover food', 'மீதமான பழைய உணவு'), T('Long fasting', 'நீண்ட உண்ணாவிரதம்'), T('Gas-forming food late at night', 'இரவில் வாயு உண்டாக்கும் உணவு'), T('Irregular meal times', 'ஒழுங்கற்ற உணவு நேரம்')],
    habits: [T('Fixed times for meals and sleep', 'உணவுக்கும் உறக்கத்திற்கும் குறித்த நேரம்'), T('Warm sesame-oil massage once a week', 'வாரம் ஒருமுறை வெதுவெதுப்பான நல்லெண்ணெய் மசாஜ்')],
  },
};
const PLANET_DIET = {
  Sun: { eat: [T('Wheat and a little jaggery', 'கோதுமை, சிறிது வெல்லம்'), T('Carrot and orange fruits', 'கேரட், ஆரஞ்சுப் பழங்கள்')], avoid: [T('Skipping breakfast', 'காலை உணவைத் தவிர்த்தல்')], habits: [T('15 minutes of morning sunlight', 'தினமும் 15 நிமிடம் காலை வெயில்')] },
  Moon: { eat: [T('Rice kanji and curd rice at lunch', 'அரிசிக் கஞ்சி, மதியம் தயிர் சாதம்'), T('Milk if it suits you', 'ஒத்துக்கொண்டால் பால்')], avoid: [T('Late nights and stale food', 'இரவு கண் விழித்தல், பழைய உணவு')], habits: [T('Regular sleep by 10 PM; 10 minutes of meditation', 'இரவு 10 மணிக்குள் உறக்கம்; 10 நிமிடம் தியானம்')] },
  Mars: { eat: [T('Pomegranate and beetroot', 'மாதுளை, பீட்ரூட்'), T('Dates and greens for iron', 'இரும்புச்சத்துக்குப் பேரீச்சை, கீரை')], avoid: [T('Eating in anger; excess heat and spice', 'கோபத்தில் உண்ணுதல்; அதிகச் சூடு, காரம்')], habits: [T('Drive carefully; handle fire and sharp tools with care', 'கவனமாக வாகனம் ஓட்டுதல்; நெருப்பு, கூர்மையான கருவிகளில் கவனம்')] },
  Mercury: { eat: [T('Green leafy vegetables and moong dal', 'பச்சைக் கீரைகள், பாசிப்பருப்பு'), T('Soaked almonds and groundnuts', 'ஊறவைத்த பாதாம், வேர்க்கடலை')], avoid: [T('Junk food and eating in front of a screen', 'நொறுக்குத் தீனி, திரை முன் உண்ணுதல்')], habits: [T('Rest the nerves — screen-free hour before sleep', 'நரம்புக்கு ஓய்வு — உறங்கும் முன் ஒரு மணி நேரம் திரை இல்லை')] },
  Jupiter: { eat: [T('Turmeric in daily cooking', 'தினசரி சமையலில் மஞ்சள்'), T('Chana dal and banana', 'கடலைப்பருப்பு, வாழைப்பழம்')], avoid: [T('Excess sugar, ghee and fatty food; overeating', 'அதிக இனிப்பு, நெய், கொழுப்பு உணவு; அளவுக்கு மீறி உண்ணுதல்')], habits: [T('A 10-minute walk after every meal', 'ஒவ்வொரு உணவுக்குப் பின் 10 நிமிட நடை')] },
  Venus: { eat: [T('Plenty of water, barley water', 'நிறையத் தண்ணீர், பார்லித் தண்ணீர்'), T('White pumpkin and buttermilk', 'வெண்பூசணி, மோர்')], avoid: [T('Excess salt and sweets', 'அதிக உப்பு, இனிப்பு')], habits: [T('Personal hygiene and enough water', 'தனிப்பட்ட சுத்தமும் போதுமான தண்ணீரும்')] },
  Saturn: { eat: [T('Black sesame (ellu) and ellu urundai', 'எள், எள்ளுருண்டை'), T('Black urad dal — ulundhu kali', 'கருப்பு உளுந்து — உளுந்தங்களி')], avoid: [T('Stale, cold food and sitting for long hours', 'பழைய, குளிர்ந்த உணவு; நீண்ட நேரம் உட்காருதல்')], habits: [T('Walk daily and care for joints and posture', 'தினமும் நடை; மூட்டு, உடல் நிலையில் கவனம்')] },
  Rahu: { eat: [T('Fresh home-cooked food and seasonal fruit', 'புதிதாக வீட்டில் சமைத்த உணவு, பருவகாலப் பழம்')], avoid: [T('Processed and packaged food; alcohol and tobacco', 'பதப்படுத்தப்பட்ட, பொட்டல உணவு; மது, புகையிலை')], habits: [T('No addictions; a light fast once a week', 'எந்தப் போதையும் இல்லை; வாரம் ஒருமுறை லேசான விரதம்')] },
  Ketu: { eat: [T('Horse gram, hot and fresh cooked food', 'கொள்ளு, சூடான புதிய உணவு'), T('Buttermilk for the gut', 'குடல் நலத்திற்கு மோர்')], avoid: [T('Street food and unwashed raw food', 'தெருவோர உணவு, கழுவாத பச்சை உணவு')], habits: [T('Wash hands well; clean small wounds at once', 'நன்றாகக் கை கழுவுதல்; சிறு காயங்களை உடனே சுத்தம் செய்தல்')] },
};
const FAST_DAY = {
  Sun: T('Sunday', 'ஞாயிறு'), Moon: T('Monday', 'திங்கள்'), Mars: T('Tuesday', 'செவ்வாய்'), Mercury: T('Wednesday', 'புதன்'),
  Jupiter: T('Thursday', 'வியாழன்'), Venus: T('Friday', 'வெள்ளி'), Saturn: T('Saturday', 'சனி'), Rahu: T('Saturday', 'சனி'), Ketu: T('Tuesday', 'செவ்வாய்'),
};

function buildDiet(con, dietPlanets, fastPlanet, stage) {
  const eat = [], avoid = [], habits = [];
  const push = (list, items, from, n) => {
    for (const it of items.slice(0, n)) if (!list.some((x) => x.en === it.en)) list.push({ ...it, from });
  };
  const dFrom = T(DOSHAS[con.dominant].en, DOSHAS[con.dominant].ta);
  push(eat, DOSHA_DIET[con.dominant].eat, dFrom, 5);
  push(avoid, DOSHA_DIET[con.dominant].avoid, dFrom, 4);
  push(habits, DOSHA_DIET[con.dominant].habits, dFrom, 2);
  if (con.dual) {
    const sFrom = T(DOSHAS[con.secondary].en, DOSHAS[con.secondary].ta);
    push(eat, DOSHA_DIET[con.secondary].eat, sFrom, 2);
    push(avoid, DOSHA_DIET[con.secondary].avoid, sFrom, 1);
  }
  for (const k of dietPlanets) {
    const from = T(k, PLANETS[k].ta);
    push(eat, PLANET_DIET[k].eat, from, 2);
    push(avoid, PLANET_DIET[k].avoid, from, 1);
    push(habits, PLANET_DIET[k].habits, from, 1);
  }
  const gentle = ['child', 'elder'].includes(stage) || con.dominant === 'vata';
  const day = FAST_DAY[fastPlanet];
  const fasting = {
    planet: fastPlanet, day, light: gentle,
    why: gentle
      ? T(`On ${day.en}, eat one simple light meal for ${fastPlanet} instead of a full fast.`, `${day.ta} அன்று ${PLANETS[fastPlanet].ta} பலம் பெற முழு விரதத்திற்குப் பதில் ஒரு எளிய லேசான உணவு.`)
      : T(`A light fast or simple satvik food on ${day.en} strengthens ${fastPlanet}. Skip fasting if diabetic, pregnant or unwell.`, `${day.ta} அன்று லேசான விரதம் அல்லது எளிய சாத்விக உணவு ${PLANETS[fastPlanet].ta} பலத்தைக் கூட்டும். சர்க்கரை நோய், கர்ப்பம், உடல்நலக் குறைவு இருந்தால் விரதம் வேண்டாம்.`),
  };
  habits.push({ ...T('Drink 8–10 glasses of water; eat at fixed times', 'தினமும் 8–10 குவளை தண்ணீர்; குறித்த நேரத்தில் உணவு'), from: T('Daily', 'தினசரி') });
  return { eat, avoid, habits, fasting };
}

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
      : ['senior'].includes(stage) ? Y.bhramari
        : con.dominant === 'pitta' ? Y.sheetali : con.dominant === 'vata' ? Y.bhramari : Y.stretch;
    list.push(extra);
  }
  return list;
}

// ------------------------------------------------------------------ remedies
const HEALING = [
  T('Pray to Lord Dhanvantari, the divine physician, on Thursdays', 'வியாழன்தோறும் தெய்வ மருத்துவர் தன்வந்திரி பகவானை வணங்குங்கள்'),
  T('Vaitheeswaran Kovil (Lord of healing, near Sirkazhi) — a visit or prayer for the family\'s health', 'வைத்தீஸ்வரன் கோவில் (சீர்காழி அருகே, நோய் தீர்க்கும் இறைவன்) — குடும்ப ஆரோக்கியத்திற்கு தரிசனம் அல்லது பிரார்த்தனை'),
  T('Share food or medicines with the needy — annadhanam protects health', 'ஏழைகளுக்கு உணவு, மருந்து தானம் — அன்னதானம் ஆரோக்கியம் காக்கும்'),
];
const MRITYUNJAYA = {
  ...T('Om Tryambakam Yajamahe Sugandhim Pushtivardhanam, Urvarukamiva Bandhanan Mrityor Mukshiya Maamritat',
    'ஓம் த்ரயம்பகம் யஜாமஹே சுகந்திம் புஷ்டிவர்த்தனம், உர்வாருகமிவ பந்தனான் ம்ருத்யோர் முக்ஷீய மாம்ருதாத்'),
  how: T('Chant 11 times every morning (or listen) — the Maha Mrityunjaya mantra for health and protection.', 'தினமும் காலையில் 11 முறை சொல்லுங்கள் (அல்லது கேளுங்கள்) — ஆரோக்கியமும் பாதுகாப்பும் தரும் மகா மிருத்யுஞ்ஜய மந்திரம்.'),
};

const DISCLAIMER = T(
  'Astrology shows tendencies for prevention; for any symptom see a qualified doctor. This is not medical advice — do not start or stop any medicine based on this.',
  'ஜோதிடம் தடுப்பு முன்னெச்சரிக்கைக்கான போக்குகளை மட்டுமே காட்டுகிறது; எந்த அறிகுறி இருந்தாலும் தகுதியான மருத்துவரைப் பாருங்கள். இது மருத்துவ ஆலோசனை அல்ல — இதை வைத்து எந்த மருந்தையும் தொடங்கவோ நிறுத்தவோ வேண்டாம்.',
);

// ------------------------------------------------------------------ main
/**
 * Health guide for one person. chart: birthChart output.
 * options: now (Date), gender ('male' | 'female' | undefined — unknown shows women's checks marked as such).
 */
export function healthGuide(chart, { now = new Date(), gender } = {}) {
  const P = chart.planets;
  const L = P.Lagna.rasi;
  const st = Object.fromEntries(grahaStrength(P).map((g) => [g.planet, g]));
  const ageExact = (now - chart.utc) / YEAR;
  const age = Math.max(0, Math.floor(ageExact));
  const stageDef = HEALTH_STAGES.find((s) => ageExact < s.max);
  const checklist = CHECKS.filter((c) => age >= c.min && age < c.max && (!c.gender || !gender || c.gender === gender))
    .map((c) => ({ en: c.en, ta: c.ta, ...(c.gender ? { forGender: c.gender } : {}) }));
  const stage = {
    id: stageDef.id, en: stageDef.en, ta: stageDef.ta, checklist,
    note: T('Discuss these with your doctor — they decide what and how often.', 'இவற்றை உங்கள் மருத்துவரிடம் கலந்து பேசுங்கள் — எது, எப்போது என்பதை அவரே முடிவு செய்வார்.'),
  };

  const con = constitution(P);
  const { md, ad } = lordsAt(chart, now);
  const areas = bodyAreas(P, st, md?.lord, ad?.lord);

  // Current period.
  const mdH = md ? lordHealth(chart, md.lord, st) : { score: 0, notes: [] };
  const adH = ad ? lordHealth(chart, ad.lord, st) : { score: 0, notes: [] };
  const g = gochara(chart, now);
  const pScore = mdH.score * 0.8 + adH.score + g.score;
  const pLevel = pScore >= 0.75 ? 'good' : pScore >= -1.25 ? 'steady' : 'care';
  const period = {
    md: md && { lord: md.lord, ta: PLANETS[md.lord].ta, start: md.start, end: md.end },
    ad: ad && { lord: ad.lord, ta: PLANETS[ad.lord].ta, start: ad.start, end: ad.end },
    score: Math.round(pScore * 10) / 10,
    level: pLevel,
    summary: PERIOD_TEXT[pLevel],
    dasaNotes: [...mdH.notes, ...adH.notes.filter((x) => !mdH.notes.some((y) => y.en === x.en))],
    gochara: g.notes,
    transit: { saturnFromMoon: g.sat, jupiterFromMoon: g.jup, rahuFromMoon: g.rahu, ketuFromMoon: g.ketu, marsFromMoon: g.mars },
    guruBalam: [2, 5, 7, 9, 11].includes(g.jup),
  };

  // Next 12 months, sampled mid-month.
  const months = [];
  const y0 = now.getUTCFullYear(), m0 = now.getUTCMonth();
  const lordCache = new Map();
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(y0, m0 + i, 15, 6));
    const la = lordsAt(chart, d);
    const key = `${la.md?.lord}|${la.ad?.lord}`;
    if (!lordCache.has(key)) {
      const a = la.md ? lordHealth(chart, la.md.lord, st).score : 0;
      const b = la.ad ? lordHealth(chart, la.ad.lord, st).score : 0;
      lordCache.set(key, a * 0.8 + b);
    }
    const tg = gochara(chart, d);
    const s = lordCache.get(key) * 0.5 + tg.score;
    const level = s >= 0.5 ? 'good' : s >= -1.25 ? 'steady' : 'care';
    const pick = tg.marsCare ? tg.notes.find((x) => x.en.startsWith('Mars'))
      : level === 'good' ? tg.notes.find((x) => x.kind === 'good') : tg.notes.find((x) => x.kind === 'care') || tg.notes.find((x) => x.kind === 'good');
    const note = pick ? T(pick.en, pick.ta) : T('A steady month — keep your routine.', 'நிலையான மாதம் — வழக்கத்தைத் தொடருங்கள்.');
    months.push({
      month: d.toISOString().slice(0, 7), level, score: Math.round(s * 10) / 10, note,
      md: la.md?.lord || null, ad: la.ad?.lord || null, marsCaution: tg.marsCare,
    });
  }

  // Planets that need support for health: weak ones first, then the period lords and the lagna lord.
  const lagnaLord = RASIS[L].lord;
  const weakOrder = GRAHAS.filter((k) => st[k].level === 'weak').sort((a, b) => st[a].score - st[b].score);
  const candidates = [...new Set([...weakOrder, ad?.lord, md?.lord, lagnaLord].filter(Boolean))];
  const remedyPlanets = candidates.slice(0, 3);
  const dietPlanets = [...new Set([...(weakOrder.length ? weakOrder.slice(0, 2) : [GRAHAS.slice().sort((a, b) => st[a].score - st[b].score)[0]]), md?.lord].filter(Boolean))].slice(0, 3);
  const fastPlanet = remedyPlanets[0] || lagnaLord;
  const diet = buildDiet(con, dietPlanets, fastPlanet, stage.id);

  const remedies = {
    planets: remedyPlanets.map((k) => ({
      planet: k, ta: PLANETS[k].ta, score: st[k].score, level: st[k].level,
      governs: PLANET_KARAKA[k],
      deity: NAVAGRAHA[k].deity, mantra: NAVAGRAHA[k].mantra, free: NAVAGRAHA[k].free, charity: NAVAGRAHA[k].charity,
      grain: NAVAGRAHA[k].grain, color: NAVAGRAHA[k].color,
    })),
    healing: HEALING,
    mantra: MRITYUNJAYA,
  };

  const ayul = ayulBalam(chart);
  return {
    name: chart.name,
    age, stage,
    constitution: con,
    bodyAreas: areas,
    period,
    months,
    diet,
    yoga: yogaFor(stage.id, con),
    remedies,
    vitality: { level: ayul.level, text: ayul.text },
    disclaimer: DISCLAIMER,
  };
}
