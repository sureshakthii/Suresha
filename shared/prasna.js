// Kaippesi Jothidar — Prasna (horary) + Muhurtha scoring for "Do or Don't" questions.
// Rules follow common Tamil panchangam practice: Horai, Rahu Kalam / Yamagandam / Guligai,
// Tara Bala, Chandra Bala / Chandrashtamam, Nakshatra nature, Tithi, Yoga, weekday and Prasna Lagna.
import { panchang, RASIS, NAKSHATRAS } from './astro.js';

export const CATEGORIES = [
  {
    id: 'surgery', icon: '🏥', en: 'Hospital / Surgery', ta: 'மருத்துவமனை / அறுவை சிகிச்சை',
    goodHora: ['Sun', 'Jupiter', 'Mars'], badHora: ['Saturn'],
    goodNak: ['kshipra', 'tikshna', 'mridu'], badNak: ['ugra'],
    goodDays: [0, 2, 4], badDays: [6],
  },
  {
    id: 'cheque', icon: '✍️', en: 'Cheque Signing / Payment', ta: 'காசோலை கையெழுத்து / பணப்பரிமாற்றம்',
    goodHora: ['Jupiter', 'Venus', 'Mercury', 'Moon'], badHora: ['Saturn', 'Mars'],
    goodNak: ['chara', 'kshipra', 'mridu', 'dhruva'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'meeting', icon: '🤝', en: 'Meeting', ta: 'சந்திப்பு / கூட்டம்',
    goodHora: ['Mercury', 'Jupiter', 'Venus', 'Moon', 'Sun'], badHora: ['Saturn'],
    goodNak: ['kshipra', 'mridu', 'chara', 'dhruva'], badNak: ['ugra'],
    goodDays: [1, 3, 4, 5], badDays: [],
  },
  {
    id: 'client', icon: '💼', en: 'Client Visit / Business Deal', ta: 'வாடிக்கையாளர் சந்திப்பு',
    goodHora: ['Mercury', 'Jupiter', 'Venus'], badHora: ['Saturn', 'Mars'],
    goodNak: ['kshipra', 'chara', 'mridu'], badNak: ['ugra', 'tikshna'],
    goodDays: [3, 4, 5], badDays: [2],
  },
  {
    id: 'bride_groom', icon: '💍', en: 'Bride / Groom Seeing', ta: 'பெண் / மாப்பிள்ளை பார்த்தல்',
    goodHora: ['Venus', 'Jupiter', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars', 'Sun'],
    goodNak: ['mridu', 'dhruva', 'kshipra'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], auspicious: true,
  },
  {
    id: 'court', icon: '⚖️', en: 'Court / Legal Case', ta: 'நீதிமன்றம் / வழக்கு',
    goodHora: ['Sun', 'Jupiter', 'Mars'], badHora: ['Saturn', 'Moon'],
    goodNak: ['tikshna', 'ugra', 'kshipra'], badNak: [],
    goodDays: [0, 2, 4], badDays: [6],
  },
  {
    id: 'office', icon: '🏢', en: 'Office / Job / Interview', ta: 'அலுவலகம் / வேலை / நேர்காணல்',
    goodHora: ['Sun', 'Jupiter', 'Mercury', 'Moon'], badHora: ['Saturn'],
    goodNak: ['dhruva', 'kshipra', 'mridu', 'chara'], badNak: ['ugra'],
    goodDays: [0, 1, 3, 4], badDays: [6],
  },
  {
    id: 'contract', icon: '📜', en: 'Contract / Agreement Signing', ta: 'ஒப்பந்தம் கையெழுத்து',
    goodHora: ['Mercury', 'Jupiter', 'Venus'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'mridu', 'kshipra'], badNak: ['ugra', 'tikshna'],
    goodDays: [3, 4, 5], badDays: [2, 6], auspicious: true,
  },
  {
    id: 'travel', icon: '✈️', en: 'Travel / Journey', ta: 'பயணம்',
    goodHora: ['Moon', 'Mercury', 'Venus', 'Jupiter'], badHora: ['Saturn', 'Mars'],
    goodNak: ['chara', 'kshipra', 'mridu'], badNak: ['ugra', 'dhruva'],
    goodDays: [1, 3, 4, 5], badDays: [2],
  },
  {
    id: 'property', icon: '🏡', en: 'Land / House Purchase', ta: 'நிலம் / வீடு வாங்குதல்',
    goodHora: ['Jupiter', 'Venus', 'Mars', 'Mercury'], badHora: ['Saturn'],
    goodNak: ['dhruva', 'mridu'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [6], auspicious: true,
  },
  {
    id: 'business', icon: '🚀', en: 'Start New Business', ta: 'புதிய தொழில் தொடக்கம்',
    goodHora: ['Mercury', 'Jupiter', 'Venus', 'Sun'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'kshipra', 'mridu'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], auspicious: true,
  },
  {
    id: 'gold_vehicle', icon: '🚗', en: 'Gold / Vehicle Purchase', ta: 'தங்கம் / வாகனம் வாங்குதல்',
    goodHora: ['Venus', 'Jupiter', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['kshipra', 'chara', 'mridu', 'dhruva'], badNak: ['ugra'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], auspicious: true,
  },
  {
    id: 'loan', icon: '💰', en: 'Loan / Investment', ta: 'கடன் / முதலீடு',
    goodHora: ['Jupiter', 'Venus', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['chara', 'kshipra', 'dhruva'], badNak: ['ugra', 'tikshna'],
    goodDays: [3, 4, 5], badDays: [2],
  },
  {
    id: 'education', icon: '🎓', en: 'Exam / Education', ta: 'தேர்வு / கல்வி',
    goodHora: ['Mercury', 'Jupiter', 'Sun'], badHora: ['Saturn'],
    goodNak: ['kshipra', 'mridu', 'chara'], badNak: ['ugra'],
    goodDays: [0, 3, 4], badDays: [],
  },
  {
    id: 'launch', icon: '🚀', en: 'Launch (product / rocket / website / shop)', ta: 'வெளியீடு (தயாரிப்பு / ராக்கெட் / கடை திறப்பு)',
    goodHora: ['Sun', 'Jupiter', 'Mercury', 'Venus'], badHora: ['Saturn'],
    goodNak: ['kshipra', 'chara', 'dhruva'], badNak: ['ugra'],
    goodDays: [0, 3, 4, 5], badDays: [6], goodLagna: [0, 2, 3, 6, 9],
  },
  {
    id: 'tech_partner', icon: '🤖', en: 'New Technology / Third-party Contract', ta: 'புதிய தொழில்நுட்ப / மூன்றாம் தரப்பு ஒப்பந்தம்',
    goodHora: ['Mercury', 'Jupiter', 'Venus', 'Moon'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'mridu', 'kshipra'], badNak: ['ugra', 'tikshna'],
    goodDays: [3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'job_change', icon: '🧭', en: 'Job Change / Resignation', ta: 'வேலை மாற்றம் / ராஜினாமா',
    goodHora: ['Sun', 'Jupiter', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['chara', 'kshipra', 'mridu'], badNak: ['ugra'],
    goodDays: [0, 3, 4], badDays: [2, 6],
  },
  {
    id: 'visa', icon: '🛂', en: 'Visa / Foreign Travel / Abroad Study', ta: 'விசா / வெளிநாட்டுப் பயணம் / படிப்பு',
    goodHora: ['Moon', 'Jupiter', 'Mercury', 'Venus'], badHora: ['Saturn'],
    goodNak: ['chara', 'kshipra', 'mridu'], badNak: ['ugra'],
    goodDays: [1, 3, 4, 5], badDays: [2],
  },
  {
    id: 'bhoomi_pooja', icon: '🏗️', en: 'Construction Start (Bhoomi Pooja)', ta: 'கட்டுமானத் தொடக்கம் (பூமி பூஜை)',
    goodHora: ['Jupiter', 'Venus', 'Mars', 'Mercury'], badHora: ['Saturn'],
    goodNak: ['dhruva', 'mridu'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [6, 0], goodLagna: [1, 4, 7, 10],
  },
  {
    id: 'lend_money', icon: '🤝', en: 'Lending / Borrowing Money', ta: 'கடன் கொடுத்தல் / வாங்குதல்',
    goodHora: ['Jupiter', 'Venus', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['chara', 'kshipra'], badNak: ['ugra', 'tikshna', 'dhruva'],
    goodDays: [3, 4], badDays: [2, 6],
  },
  {
    id: 'competition', icon: '🏆', en: 'Competition / Election / Sports', ta: 'போட்டி / தேர்தல் / விளையாட்டு',
    goodHora: ['Sun', 'Mars', 'Jupiter'], badHora: ['Saturn'],
    goodNak: ['tikshna', 'kshipra', 'ugra'], badNak: [],
    goodDays: [0, 2, 4], badDays: [6],
  },
  // Life events (Subha Muhurtham) — used by the Muhurtham finder rather than instant Prasnam.
  {
    id: 'marriage', icon: '💐', en: 'Marriage (Thirumanam)', ta: 'திருமணம்', event: true, auspicious: true,
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars', 'Sun'],
    goodNak: ['dhruva', 'mridu', 'kshipra'], badNak: ['ugra', 'tikshna', 'mishra'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], goodLagna: [1, 2, 5, 6, 8, 11], avoidMonths: [3, 5, 8],
  },
  {
    id: 'graha_pravesam', icon: '🏠', en: 'House Warming (Graha Pravesam)', ta: 'கிரகப் பிரவேசம்', event: true, auspicious: true,
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'mridu'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6, 0], goodLagna: [1, 4, 7, 10], avoidMonths: [3, 5, 8],
  },
  {
    id: 'naming', icon: '👶', en: 'Baby Naming (Peyar Sootuthal)', ta: 'பெயர் சூட்டுதல்', event: true, auspicious: true,
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['dhruva', 'mridu', 'kshipra', 'chara'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'ear_piercing', icon: '✨', en: 'Ear Piercing (Kaadhu Kuthu)', ta: 'காது குத்துதல்', event: true, auspicious: true,
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['kshipra', 'mridu', 'chara', 'dhruva'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'annaprasanam', icon: '🍚', en: 'First Rice Feeding (Annaprasanam)', ta: 'அன்னப்பிராசனம்', event: true, auspicious: true,
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['kshipra', 'mridu', 'chara', 'dhruva'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'vidyarambam', icon: '📿', en: 'Start of Learning (Vidyarambam)', ta: 'வித்யாரம்பம் / அட்சராப்பியாசம்', event: true, auspicious: true,
    goodHora: ['Mercury', 'Jupiter', 'Venus'], badHora: ['Saturn', 'Mars'],
    goodNak: ['kshipra', 'mridu', 'chara'], badNak: ['ugra', 'tikshna'],
    goodDays: [0, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'ruthu_bath', icon: '🌸', en: 'Ruthu — First Bath (Thanneer Oothuthal)', ta: 'ருது — தண்ணீர் ஊற்றுதல்', event: true, auspicious: true, lenient: true,
    goodHora: ['Venus', 'Moon', 'Jupiter', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['mridu', 'dhruva', 'kshipra', 'chara'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
  },
  {
    id: 'delivery', icon: '🤱', en: 'Planned Delivery (C-section) Muhurtham', ta: 'பிரசவ முகூர்த்தம் (திட்டமிட்ட அறுவை)', event: true, auspicious: true, lenient: true,
    goodHora: ['Jupiter', 'Venus', 'Moon', 'Mercury', 'Sun'], badHora: ['Saturn'],
    goodNak: ['dhruva', 'mridu', 'kshipra', 'chara'], badNak: ['ugra', 'tikshna'],
    goodDays: [0, 1, 3, 4, 5], badDays: [], goodLagna: [1, 3, 4, 8, 11],
  },
  {
    // Vahanam vanga (two-wheeler, auto, car, lorry): classical Tamil muhurtha rules — only the listed stars,
    // Mon/Wed/Thu/Fri (Sunday acceptable), no Rikta/Ashtami/Navami/Amavasai or Theipirai Prathamai, no Kuligai,
    // and a Venus (vahana karaka), Mercury, Moon or Jupiter Horai for the first drive.
    id: 'vehicle', icon: '🚗', en: 'Vehicle Purchase & First Drive (Vahanam)', ta: 'வாகனம் வாங்க', event: true, auspicious: true,
    goodHora: ['Venus', 'Mercury', 'Moon', 'Jupiter'], badHora: ['Saturn', 'Mars'],
    goodNak: [], badNak: [],
    goodStars: [0, 3, 4, 6, 7, 11, 12, 13, 14, 16, 20, 21, 22, 23, 25, 26],
    goodDays: [1, 3, 4, 5], badDays: [2, 6],
    avoidGuligai: true, avoidKrishnaPrathamai: true, avoidBadYoga: true, strictTara: true,
  },
  {
    id: 'manjal_neerattu', icon: '🌼', en: 'Manjal Neerattu Vizha', ta: 'மஞ்சள் நீராட்டு விழா', event: true, auspicious: true,
    goodHora: ['Venus', 'Moon', 'Jupiter', 'Mercury'], badHora: ['Saturn', 'Mars'],
    goodNak: ['mridu', 'dhruva', 'kshipra'], badNak: ['ugra', 'tikshna'],
    goodDays: [1, 3, 4, 5], badDays: [2, 6], goodLagna: [1, 2, 5, 6, 8, 11],
  },
];

export const BAD_YOGAS = new Set([0, 5, 8, 9, 12, 14, 16, 18, 26]);
const TARA = [
  { en: 'Janma', ta: 'ஜன்ம', score: -4 },
  { en: 'Sampat', ta: 'சம்பத்', score: 10 },
  { en: 'Vipat', ta: 'விபத்', score: -12 },
  { en: 'Kshema', ta: 'க்ஷேம', score: 10 },
  { en: 'Pratyak', ta: 'பிரத்யக்', score: -12 },
  { en: 'Sadhana', ta: 'சாதக', score: 10 },
  { en: 'Naidhana', ta: 'நைதன', score: -15 },
  { en: 'Mitra', ta: 'மித்ர', score: 8 },
  { en: 'Parama Mitra', ta: 'பரம மித்ர', score: 10 },
];
const BENEFICS = ['Jupiter', 'Venus', 'Mercury'];
const MALEFICS = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id);

/** Pure scoring of a Panchang snapshot for a category and optional birth chart. */
export function scoreSnapshot(snap, category, birth) {
  const factors = [];
  const add = (key, label, labelTa, points, detail) => factors.push({ key, label, labelTa, points, detail });
  const cat = typeof category === 'string' ? getCategory(category) : category;
  if (!cat) throw new Error('Unknown category');

  // 1. Horai
  const hl = snap.currentHora.lord;
  if (cat.goodHora.includes(hl)) add('hora', `${hl} Horai is favourable`, `${snap.currentHora.lordTa} ஓரை — சாதகம்`, 15, hl);
  else if (cat.badHora.includes(hl)) add('hora', `${hl} Horai is unfavourable`, `${snap.currentHora.lordTa} ஓரை — பாதகம்`, -15, hl);
  else add('hora', `${hl} Horai is neutral`, `${snap.currentHora.lordTa} ஓரை — சமம்`, 0, hl);

  // 2. Inauspicious periods
  if (snap.inRahuKalam) add('rahu', 'Rahu Kalam is running', 'ராகு காலம் நடக்கிறது', -25);
  if (snap.inYamagandam) add('yama', 'Yamagandam is running', 'எமகண்டம் நடக்கிறது', -20);
  if (snap.inGuligai) add('guligai', 'Guligai Kalam is running', 'குளிகை காலம் நடக்கிறது', -8);

  // 3. Nakshatra nature
  const nature = NAKSHATRAS[snap.nakshatra.index].nature;
  if (cat.goodStars) {
    if (cat.goodStars.includes(snap.nakshatra.index)) add('nak', `${snap.nakshatra.name} star suits this work`, `${snap.nakshatra.ta} நட்சத்திரம் ஏற்றது`, 8, nature);
    else add('nak', `${snap.nakshatra.name} star does not suit this work`, `${snap.nakshatra.ta} நட்சத்திரம் ஏற்றதல்ல`, -8, nature);
  } else if (cat.goodNak.includes(nature)) add('nak', `${snap.nakshatra.name} star suits this work`, `${snap.nakshatra.ta} நட்சத்திரம் ஏற்றது`, 8, nature);
  else if (cat.badNak.includes(nature)) add('nak', `${snap.nakshatra.name} star does not suit this work`, `${snap.nakshatra.ta} நட்சத்திரம் ஏற்றதல்ல`, -8, nature);

  // 4. Tithi
  const tn = snap.tithi.index % 15;
  if (snap.tithi.index === 29) add('tithi', 'Amavasai (new moon)', 'அமாவாசை', cat.auspicious ? -12 : -6);
  else if (tn === 3 || tn === 8 || tn === 13) add('tithi', `${snap.tithi.name} is a Rikta tithi`, `${snap.tithi.ta} — ரிக்த திதி`, -6);
  else if (tn === 7) add('tithi', 'Ashtami — avoid new starts', 'அஷ்டமி — புதிய தொடக்கம் தவிர்க்கவும்', -6);
  else if (snap.tithi.index === 14) add('tithi', 'Pournami (full moon) — strong Moon', 'பௌர்ணமி — சந்திர பலம்', 4);
  else add('tithi', `${snap.tithi.name} tithi is supportive`, `${snap.tithi.ta} திதி — நன்று`, 3);

  // 5. Waxing / waning moon
  if (snap.tithi.index < 15) add('paksha', 'Waxing Moon (Valarpirai)', 'வளர்பிறை', 4);
  else add('paksha', 'Waning Moon (Theipirai)', 'தேய்பிறை', -3);

  // 6. Yoga
  if (BAD_YOGAS.has(snap.yoga.index)) add('yoga', `${snap.yoga.name} yoga is unfavourable`, `${snap.yoga.ta} யோகம் — பாதகம்`, -5);

  // 7. Weekday
  const wd = snap.weekday.index;
  if (cat.goodDays.includes(wd)) add('day', `${snap.weekday.en} suits this work`, `${snap.weekday.ta} — ஏற்ற கிழமை`, 5);
  else if (cat.badDays.includes(wd)) add('day', `${snap.weekday.en} is not ideal`, `${snap.weekday.ta} — ஏற்ற கிழமை அல்ல`, -6);

  // 8. Prasna Lagna (ascendant at the moment of asking)
  const lagna = snap.planets.Lagna;
  if (lagna) {
    const inLagna = Object.entries(snap.planets).filter(([k, p]) => k !== 'Lagna' && p.rasi === lagna.rasi).map(([k]) => k);
    const ben = inLagna.filter((k) => BENEFICS.includes(k) || (k === 'Moon' && snap.tithi.index < 15));
    const mal = inLagna.filter((k) => MALEFICS.includes(k));
    if (ben.length) add('lagna_benefic', `Benefic ${ben.join(', ')} in Prasna Lagna`, 'பிரசன்ன லக்னத்தில் சுபர்', 6 * ben.length);
    if (mal.length) add('lagna_malefic', `Malefic ${mal.join(', ')} in Prasna Lagna`, 'பிரசன்ன லக்னத்தில் பாபர்', -5 * mal.length);
    const lord = RASIS[lagna.rasi].lord;
    const house = ((snap.planets[lord].rasi - lagna.rasi + 12) % 12) + 1;
    if ([6, 8, 12].includes(house)) add('lagna_lord', `Lagna lord ${lord} in ${house}th house (dusthana)`, `லக்னாதிபதி ${house}-ல் — பலவீனம்`, -6);
    else if ([1, 4, 5, 7, 9, 10].includes(house)) add('lagna_lord', `Lagna lord ${lord} strong in ${house}th house`, `லக்னாதிபதி ${house}-ல் — பலம்`, 5);
  }

  if (lagna && cat.goodLagna) {
    if (cat.goodLagna.includes(lagna.rasi)) add('lagna_sign', `${lagna.rasiName} lagna suits this event`, `${lagna.rasiTa} லக்னம் ஏற்றது`, 6);
    else add('lagna_sign', `${lagna.rasiName} lagna is not preferred`, `${lagna.rasiTa} லக்னம் உகந்ததல்ல`, -4);
  }

  // 9. Personal factors from the birth chart
  if (birth && birth.janmaNakshatra != null) {
    const count = ((snap.nakshatra.index - birth.janmaNakshatra + 27) % 27) % 9;
    const tara = TARA[count];
    add('tara', `${tara.en} Tara for your birth star`, `${tara.ta} தாரை`, tara.score);
  }
  if (birth && birth.janmaRasi != null) {
    const pos = ((snap.moonRasi.index - birth.janmaRasi + 12) % 12) + 1;
    if (pos === 8) add('chandrashtama', 'Chandrashtamam — Moon in 8th from your rasi', 'சந்திராஷ்டமம்', -22);
    else if ([1, 3, 6, 7, 10, 11].includes(pos)) add('chandra', `Chandra Bala good (Moon ${pos} from your rasi)`, 'சந்திர பலம் உண்டு', 8);
    else add('chandra', `Chandra Bala weak (Moon ${pos} from your rasi)`, 'சந்திர பலம் குறைவு', -4);
  }

  const raw = 50 + factors.reduce((s, f) => s + f.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const verdict = score >= 62 ? 'DO' : score >= 45 ? 'CAUTION' : 'AVOID';
  return { score, verdict, factors };
}

export const VERDICT_TEXT = {
  DO: { en: 'Go ahead — favourable', ta: 'செய்யலாம் — நல்ல நேரம்' },
  CAUTION: { en: 'Proceed with caution', ta: 'கவனத்துடன் செய்யவும்' },
  AVOID: { en: 'A better time is coming — wait a little', ta: 'சிறந்த நேரம் வருகிறது — சற்று காத்திருங்கள்' },
};

/** Scan ahead to find the best windows for this category in the next `hours`. */
export function findBestTimes(from, hours, category, loc, birth, stepMin = 15) {
  const results = [];
  for (let m = stepMin; m <= hours * 60; m += stepMin) {
    const t = new Date(from.getTime() + m * 60000);
    const snap = panchang(t, loc.lat, loc.lon, loc.tz, { withEnds: false });
    const r = scoreSnapshot(snap, category, birth);
    results.push({ at: t, score: r.score, verdict: r.verdict, hora: snap.currentHora.lord });
  }
  // Merge consecutive steps into windows and rank by peak score.
  const windows = [];
  let cur = null;
  for (const r of results) {
    if (r.verdict === 'DO') {
      if (cur && r.at - cur.end <= stepMin * 60000) { cur.end = r.at; cur.best = Math.max(cur.best, r.score); }
      else { cur = { start: r.at, end: r.at, best: r.score, hora: r.hora }; windows.push(cur); }
    } else cur = null;
  }
  for (const w of windows) w.end = new Date(w.end.getTime() + stepMin * 60000);
  windows.sort((a, b) => b.best - a.best || a.start - b.start);
  return windows.slice(0, 3);
}

/** Full Prasna evaluation used by the API and the Live screen. */
export function evaluatePrasna({ at = new Date(), category, loc, birth }) {
  const snap = panchang(at, loc.lat, loc.lon, loc.tz);
  const result = scoreSnapshot(snap, category, birth);
  const bestTimes = findBestTimes(at, 24, category, loc, birth);
  return { snapshot: snap, ...result, verdictText: VERDICT_TEXT[result.verdict], bestTimes };
}
