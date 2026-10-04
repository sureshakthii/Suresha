// Daily personal review (இன்று உங்களுக்கு) and the closing prayer line used after every answer.
// Built only from engine facts: today's Moon rasi and star (gochara), the person's birth star and rasi,
// the running Dasa–Bhukti and the weekday lord. Runs on device and server.
import { RASIS, NAKSHATRAS, PLANETS, moonSidereal } from './astro.js';
import { PLANET_DEITY, DEITY_MANTRA, STAR_DEITY } from './personal.js';

const T = (en, ta) => ({ en, ta });
const WEEKDAY_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

/** Traditional deity of each weekday (இன்றைய தெய்வம்). */
export const DAY_DEITY = [
  { god: T('Lord Surya & Lord Shiva', 'சூரிய பகவான் & சிவபெருமான்'), mantra: T('Om Namah Shivaya · Om Suryaya Namaha', 'ஓம் நமசிவாய · ஓம் சூர்யாய நமஹ'), act: T('Offer water to the rising Sun; light a lamp for Shiva.', 'உதய சூரியனுக்கு நீர் அர்ப்பணம்; சிவனுக்கு தீபம்.') },
  { god: T('Lord Shiva & Goddess Ambal', 'சிவபெருமான் & அம்பாள்'), mantra: T('Om Namah Shivaya · Om Sakthiye Potri', 'ஓம் நமசிவாய · ஓம் சக்தியே போற்றி'), act: T('Offer milk or bilva to Shiva; keep the mind calm.', 'சிவனுக்கு பால் / வில்வம்; மனதை அமைதியாக வைக்கவும்.') },
  { god: T('Lord Murugan & Goddess Durga', 'முருகப் பெருமான் & துர்கை அம்மன்'), mantra: T('Om Saravanabhava · Om Durgayai Namaha', 'ஓம் சரவணபவ · ஓம் துர்காயை நமஹ'), act: T('Recite Kanda Sashti Kavasam; light a lamp at Rahu Kalam for Durga.', 'கந்த சஷ்டி கவசம்; ராகு காலத்தில் துர்கைக்கு தீபம்.') },
  { god: T('Lord Perumal (Vishnu)', 'பெருமாள் (விஷ்ணு)'), mantra: T('Om Namo Narayanaya', 'ஓம் நமோ நாராயணாய'), act: T('Chant Vishnu Sahasranamam or Narayana nama; offer tulasi.', 'விஷ்ணு சகஸ்ரநாமம் / நாராயண நாமம்; துளசி அர்ப்பணம்.') },
  { god: T('Lord Dakshinamurthy & Guru', 'தட்சிணாமூர்த்தி & குரு பகவான்'), mantra: T('Om Gurave Namaha · Om Dakshinamurthaye Namaha', 'ஓம் குருவே நமஹ · ஓம் தட்சிணாமூர்த்தயே நமஹ'), act: T('Respect your teachers and elders; offer yellow flowers.', 'ஆசிரியர், பெரியோரை வணங்குங்கள்; மஞ்சள் மலர் அர்ப்பணம்.') },
  { god: T('Goddess Mahalakshmi & Amman', 'மகாலட்சுமி & அம்மன்'), mantra: T('Om Sri Mahalakshmiyai Namaha · Om Sakthiye Potri', 'ஓம் ஸ்ரீ மகாலட்சுமியை நமஹ · ஓம் சக்தியே போற்றி'), act: T('Light a ghee lamp at dusk; keep the home clean and fragrant.', 'மாலை நெய் தீபம்; வீட்டைச் சுத்தமாக, மணமாக வைக்கவும்.') },
  { god: T('Lord Venkatachalapathi, Sri Anjaneyar & Saneeswarar', 'வெங்கடாசலபதி, ஸ்ரீ ஆஞ்சநேயர் & சனீஸ்வரர்'), mantra: T('Om Namo Venkatesaya · Sri Rama Jayam', 'ஓம் நமோ வெங்கடேசாய · ஸ்ரீ ராம ஜெயம்'), act: T('Light a sesame-oil lamp; help someone who works hard for little.', 'நல்லெண்ணெய் தீபம்; உழைப்பாளிக்கு உதவுங்கள்.') },
];

/** Praise lines (போற்றி) for each planet's deity, used to close every answer. */
const POTRI = {
  Sun: T('Om Namah Shivaya — Sivane Potri', 'ஓம் நமசிவாய — சிவனே போற்றி'),
  Moon: T('Om Sakthiye Potri — Ambal Thaye Potri', 'ஓம் சக்தியே போற்றி — அம்பாள் தாயே போற்றி'),
  Mars: T('Om Saravanabhava — Muruga Potri', 'ஓம் சரவணபவ — முருகா போற்றி'),
  Mercury: T('Om Namo Narayanaya — Perumale Potri', 'ஓம் நமோ நாராயணாய — பெருமாளே போற்றி'),
  Jupiter: T('Om Gurave Namaha — Dakshinamurthiye Potri', 'ஓம் குருவே நமஹ — தட்சிணாமூர்த்தியே போற்றி'),
  Venus: T('Om Sri Mahalakshmiyai Namaha — Thaye Potri', 'ஓம் ஸ்ரீ மகாலட்சுமியை நமஹ — தாயே போற்றி'),
  Saturn: T('Om Namo Venkatesaya — Govinda Potri', 'ஓம் நமோ வெங்கடேசாய — கோவிந்தா போற்றி'),
  Rahu: T('Om Durgayai Namaha — Durga Thaye Potri', 'ஓம் துர்காயை நமஹ — துர்கை தாயே போற்றி'),
  Ketu: T('Om Gam Ganapataye Namaha — Vinayaga Potri', 'ஓம் கம் கணபதயே நமஹ — விநாயகா போற்றி'),
};

/**
 * Closing prayer for a person: the deities of the running Dasa lord and Bhukti lord.
 * Returns { lines:[{en,ta}], deities:[planet] } or null without a chart.
 */
export function closingPrayer(chart, now = new Date()) {
  if (!chart?.dasa) return null;
  const per = (chart.dasa.periods || []).find((p) => new Date(p.start) <= now && now < new Date(p.end));
  const md = per?.lord || chart.dasa.current?.lord;
  const ad = (per?.bhuktis || []).find((b) => new Date(b.start) <= now && now < new Date(b.end))?.lord || chart.dasa.currentBhukti?.lord;
  const lords = [...new Set([md, ad].filter(Boolean))];
  if (!lords.length) return null;
  return { deities: lords, lines: lords.map((p) => POTRI[p]), deityNames: lords.map((p) => PLANET_DEITY[p]) };
}

const TARA = [
  T('Janma', 'ஜென்ம'), T('Sampat', 'சம்பத்'), T('Vipat', 'விபத்'), T('Kshema', 'க்ஷேம'), T('Pratyak', 'பிரத்யக்'),
  T('Sadhana', 'சாதக'), T('Naidhana', 'நைதன'), T('Mitra', 'மித்ர'), T('Parama Mitra', 'பரம மித்ர'),
];
const TARA_GOOD = new Set([2, 4, 6, 8, 9]);
const TARA_BAD = new Set([3, 5, 7]);
const CHANDRA_GOOD = new Set([1, 3, 6, 7, 10, 11]);
const CHANDRA_BAD = new Set([4, 8, 12]);

/** Next Chandrashtamam window (Moon in the 8th rasi from the birth rasi), searched hourly for 32 days. */
export function nextChandrashtamam(janmaRasi, from = new Date()) {
  const target = (janmaRasi + 7) % 12;
  const rasiAt = (t) => Math.floor(moonSidereal(t) / 30);
  let t = new Date(from);
  let start = rasiAt(t) === target ? new Date(from.getTime()) : null;
  for (let h = 0; h < 32 * 24 && !start; h++) {
    t = new Date(t.getTime() + 3600000);
    if (rasiAt(t) === target) start = t;
  }
  if (!start) return null;
  if (start.getTime() === from.getTime()) { // already running: walk back to when it began
    for (let h = 0; h < 72 && rasiAt(new Date(start.getTime() - 3600000)) === target; h++) start = new Date(start.getTime() - 3600000);
  }
  let end = new Date(start);
  for (let h = 0; h < 72 && rasiAt(end) === target; h++) end = new Date(end.getTime() + 3600000);
  return { start, end, active: start <= from };
}

/**
 * Today's personal review from gochara: Chandra balam, Tara balam, Chandrashtamam, weekday lord vs Dasa,
 * plus do's and don'ts, today's deity and the closing prayer.
 */
export function dailyReview(chart, snap, now = new Date()) {
  const wd = snap.weekday.index;
  const dayLord = WEEKDAY_LORD[wd];
  const deity = DAY_DEITY[wd];
  if (!chart) return { personal: false, deity, dayLord };
  const jr = chart.janmaRasi.index, js = chart.janmaNakshatra.index;
  const chandra = ((snap.moonRasi.index - jr + 12) % 12) + 1;
  const taraN = ((snap.nakshatra.index - js + 27) % 27) % 9 + 1;
  const chandrashtamam = chandra === 8;
  const md = chart.dasa?.current?.lord;
  let score = 0;
  const why = [];
  if (chandrashtamam) { score -= 3; why.push(T(`Chandrashtamam: today's Moon in ${RASIS[snap.moonRasi.index].en} is 8th from your rasi ${RASIS[jr].en}`, `சந்திராஷ்டமம்: இன்றைய சந்திரன் ${RASIS[snap.moonRasi.index].ta} — உங்கள் ${RASIS[jr].ta} ராசிக்கு 8-ம் இடம்`)); }
  else if (CHANDRA_GOOD.has(chandra)) { score += 2; why.push(T(`Chandra balam: Moon in the ${chandra}th from your rasi — supportive`, `சந்திர பலம்: சந்திரன் உங்கள் ராசிக்கு ${chandra}-ம் இடம் — சாதகம்`)); }
  else if (CHANDRA_BAD.has(chandra)) { score -= 1; why.push(T(`Moon in the ${chandra}th from your rasi — go gently`, `சந்திரன் உங்கள் ராசிக்கு ${chandra}-ம் இடம் — நிதானம்`)); }
  else why.push(T(`Moon in the ${chandra}th from your rasi — neutral`, `சந்திரன் உங்கள் ராசிக்கு ${chandra}-ம் இடம் — சமம்`));
  const taraName = TARA[taraN - 1];
  if (TARA_GOOD.has(taraN)) { score += 2; why.push(T(`Tara balam: today's star ${NAKSHATRAS[snap.nakshatra.index].en} is ${taraName.en} tara for you — favourable`, `தாரா பலம்: இன்றைய ${NAKSHATRAS[snap.nakshatra.index].ta} உங்களுக்கு ${taraName.ta} தாரை — சாதகம்`)); }
  else if (TARA_BAD.has(taraN)) { score -= 2; why.push(T(`Today's star ${NAKSHATRAS[snap.nakshatra.index].en} is ${taraName.en} tara for you — avoid new beginnings`, `இன்றைய ${NAKSHATRAS[snap.nakshatra.index].ta} உங்களுக்கு ${taraName.ta} தாரை — புதிய தொடக்கம் தவிர்க்கவும்`)); }
  else why.push(T(`Today's star is your Janma tara — keep the day simple`, `இன்று உங்கள் ஜென்ம தாரை — எளிமையாக நடத்துங்கள்`));
  if (md && md === dayLord) { score += 1; why.push(T(`Today is ruled by ${dayLord}, your Dasa lord — a good day to pray to ${PLANET_DEITY[md].en}`, `இன்று ${snap.weekday.ta} — ${PLANETS[dayLord].ta}, உங்கள் தசா நாதர்; ${PLANET_DEITY[md].ta} வழிபாட்டுக்கு உகந்த நாள்`)); }

  const level = chandrashtamam ? 'care' : score >= 3 ? 'great' : score >= 1 ? 'good' : score >= -1 ? 'steady' : 'care';
  const label = { great: T('Excellent day', 'சிறப்பான நாள்'), good: T('Good day', 'நல்ல நாள்'), steady: T('Steady day', 'சுமாரான நாள்'), care: T('Day for care', 'கவனமான நாள்') }[level];

  const dos = [];
  const donts = [];
  if (chandrashtamam) {
    dos.push(T('Stay patient, speak softly, finish routine work', 'பொறுமை, மென்மையான பேச்சு, வழக்கமான வேலைகளை முடியுங்கள்'), T('Pray to Ambal / Shiva and keep the mind calm', 'அம்பாள் / சிவனை வழிபட்டு மனதை அமைதியாக வைக்கவும்'));
    donts.push(T('No big decisions, signatures or new ventures', 'பெரிய முடிவு, கையெழுத்து, புதிய முயற்சி வேண்டாம்'), T('Avoid arguments and risky travel', 'வாக்குவாதம், அபாயப் பயணம் தவிர்க்கவும்'));
  } else if (level === 'great' || level === 'good') {
    dos.push(T('Start important work, meetings or purchases (outside Rahu Kalam)', 'முக்கிய வேலை, சந்திப்பு, வாங்குதல் தொடங்கலாம் (ராகு காலம் தவிர்த்து)'), T('Reach out to people — your words carry weight today', 'மக்களைத் தொடர்பு கொள்ளுங்கள் — இன்று உங்கள் சொல்லுக்கு மதிப்பு'));
    donts.push(T('Do not waste the day in delay or doubt', 'தாமதம், சந்தேகத்தில் நாளை வீணாக்க வேண்டாம்'), T('Avoid over-promising', 'அதிக வாக்குறுதி தவிர்க்கவும்'));
  } else {
    dos.push(T('Continue ongoing work; plan rather than launch', 'நடக்கும் வேலையைத் தொடருங்கள்; தொடங்குவதை விட திட்டமிடுங்கள்'), T('Keep health and sleep regular', 'உடல்நலம், உறக்கம் சீராக இருக்கட்டும்'));
    donts.push(T('Avoid lending money or hasty commitments', 'கடன் கொடுப்பது, அவசர உறுதிமொழி தவிர்க்கவும்'), T('Do not react in anger', 'கோபத்தில் பதில் சொல்ல வேண்டாம்'));
  }
  donts.push(T('Begin nothing new during Rahu Kalam', 'ராகு காலத்தில் புதிதாக எதையும் தொடங்க வேண்டாம்'));

  return {
    personal: true, level, label, score, chandra, chandrashtamam, tara: { n: taraN, name: taraName }, why, dos, donts,
    deity, dayLord, starDeity: STAR_DEITY[js], dasaDeity: md ? { planet: md, name: PLANET_DEITY[md], mantra: DEITY_MANTRA[md] } : null,
    prayer: closingPrayer(chart, now),
    nextChandrashtamam: nextChandrashtamam(jr, now),
  };
}
