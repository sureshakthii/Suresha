// Detailed Jathaga analysis: 12 bhavas, yogas, transits (Ezharai / Ashtama Sani, Guru Balam),
// dasa outlook and life-area scores. Rule-based and explainable; written to encourage, not frighten.
import { planetPositions, RASIS, PLANETS } from './astro.js';
import { grahaStrength } from './remedies.js';

const KENDRA = [1, 4, 7, 10];
const TRIKONA = [1, 5, 9];
const DUSTHANA = [6, 8, 12];
const BENEFICS = ['Jupiter', 'Venus', 'Mercury'];
const MALEFICS = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];
const OWN = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
// Special aspects (in addition to the 7th) counted as houses from the planet.
const ASPECTS = { Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10], Rahu: [5, 7, 9], Ketu: [5, 7, 9] };

export const BHAVAS = [
  { en: 'Self, health, personality', ta: 'சுயம், ஆரோக்கியம், தோற்றம்' },
  { en: 'Wealth, family, speech', ta: 'செல்வம், குடும்பம், வாக்கு' },
  { en: 'Courage, siblings, efforts', ta: 'தைரியம், உடன்பிறப்பு, முயற்சி' },
  { en: 'Mother, home, vehicles, peace of mind', ta: 'தாய், வீடு, வாகனம், மன அமைதி' },
  { en: 'Children, intelligence, past merit', ta: 'குழந்தைகள், அறிவு, பூர்வ புண்ணியம்' },
  { en: 'Health issues, debts, competition', ta: 'நோய், கடன், போட்டி' },
  { en: 'Spouse, partnerships, business', ta: 'வாழ்க்கைத் துணை, கூட்டாளி, வியாபாரம்' },
  { en: 'Longevity, sudden events, research', ta: 'ஆயுள், திடீர் நிகழ்வு, ஆராய்ச்சி' },
  { en: 'Fortune, father, dharma, travel', ta: 'பாக்கியம், தந்தை, தர்மம், யாத்திரை' },
  { en: 'Career, status, karma', ta: 'தொழில், அந்தஸ்து, கர்மம்' },
  { en: 'Gains, income, friends', ta: 'லாபம், வருமானம், நண்பர்கள்' },
  { en: 'Expenses, foreign lands, moksha', ta: 'செலவு, வெளிநாடு, மோட்சம்' },
];

const houseOf = (lagnaRasi, rasi) => ((rasi - lagnaRasi + 12) % 12) + 1;
const lordOfHouse = (lagnaRasi, h) => RASIS[(lagnaRasi + h - 1) % 12].lord;
const housesRuled = (lagnaRasi, planet) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((h) => lordOfHouse(lagnaRasi, h) === planet);
const dignified = (k, rasi) => (OWN[k] || []).includes(rasi) || EXALT[k] === rasi;

/** Planets aspecting a given house (Vedic full aspects). */
function aspectsOn(planets, lagnaRasi, house) {
  const out = [];
  for (const [k, p] of Object.entries(planets)) {
    if (k === 'Lagna') continue;
    const from = houseOf(lagnaRasi, p.rasi);
    const offsets = ASPECTS[k] || [7];
    for (const o of offsets) if (((from - 1 + o - 1) % 12) + 1 === house) out.push(k);
  }
  return out;
}

/** The 12 bhavas with occupants, lord placement, aspects and a strength score. */
export function bhavaAnalysis(chart) {
  const P = chart.planets;
  const L = P.Lagna.rasi;
  const strength = Object.fromEntries(grahaStrength(P).map((g) => [g.planet, g.score]));
  return BHAVAS.map((b, i) => {
    const h = i + 1;
    const rasi = (L + i) % 12;
    const lord = RASIS[rasi].lord;
    const lordHouse = houseOf(L, P[lord].rasi);
    const occupants = Object.keys(P).filter((k) => k !== 'Lagna' && P[k].rasi === rasi);
    const aspects = aspectsOn(P, L, h);
    let score = 50;
    const notes = [];
    if (KENDRA.includes(lordHouse) || TRIKONA.includes(lordHouse)) { score += 12; notes.push({ en: `Lord ${lord} is well placed in house ${lordHouse}`, ta: `அதிபதி ${PLANETS[lord].ta} ${lordHouse}-ல் நல்ல இடத்தில்` }); }
    if (DUSTHANA.includes(lordHouse) && !DUSTHANA.includes(h)) { score -= 10; notes.push({ en: `Lord ${lord} sits in house ${lordHouse}`, ta: `அதிபதி ${PLANETS[lord].ta} ${lordHouse}-ல்` }); }
    score += Math.round((strength[lord] - 55) / 3);
    for (const o of occupants) {
      if (BENEFICS.includes(o) || (o === 'Moon')) score += 6;
      else if (MALEFICS.includes(o) && !([3, 6, 10, 11].includes(h))) score -= 5;
      else if (MALEFICS.includes(o)) score += 4; // malefics do well in upachaya houses
    }
    for (const a of aspects) {
      if (a === 'Jupiter') { score += 7; notes.push({ en: 'Blessed by Jupiter\'s aspect', ta: 'குருவின் பார்வை உண்டு' }); } else if (BENEFICS.includes(a)) score += 3;
      else if (a === 'Saturn' && !([3, 6, 10, 11].includes(h))) score -= 3;
    }
    score = Math.max(15, Math.min(95, score));
    return { house: h, rasi, rasiName: RASIS[rasi], lord, lordHouse, occupants, aspects, score, area: b, notes };
  });
}

/** Detects well-known yogas, each with a plain explanation. */
export function detectYogas(chart) {
  const P = chart.planets;
  const L = P.Lagna.rasi;
  const M = P.Moon.rasi;
  const fromMoon = (k) => houseOf(M, P[k].rasi);
  const fromLagna = (k) => houseOf(L, P[k].rasi);
  const yogas = [];
  const add = (id, en, ta, descEn, descTa, kind = 'good') => yogas.push({ id, name: { en, ta }, desc: { en: descEn, ta: descTa }, kind });

  if (KENDRA.includes(fromMoon('Jupiter'))) add('gajakesari', 'Gaja Kesari Yoga', 'கஜகேசரி யோகம்', 'Jupiter in a kendra from the Moon: respect, wisdom and lasting reputation.', 'சந்திரனுக்கு கேந்திரத்தில் குரு: மதிப்பு, ஞானம், நிலையான புகழ்.');
  if (P.Sun.rasi === P.Mercury.rasi) add('budhaditya', 'Budha-Aditya Yoga', 'புத ஆதித்ய யோகம்', 'Sun with Mercury: sharp intellect, good communication and learning.', 'சூரியனுடன் புதன்: கூர்மையான அறிவு, பேச்சுத் திறன், கல்வி.');
  if (P.Moon.rasi === P.Mars.rasi) add('chandramangala', 'Chandra-Mangala Yoga', 'சந்திர மங்கள யோகம்', 'Moon with Mars: enterprise and the ability to earn through effort.', 'சந்திரனுடன் செவ்வாய்: முயற்சியால் சம்பாதிக்கும் திறன்.');
  const MAHA = { Mars: ['Ruchaka', 'ருசக'], Mercury: ['Bhadra', 'பத்ர'], Jupiter: ['Hamsa', 'ஹம்ஸ'], Venus: ['Malavya', 'மாளவ்ய'], Saturn: ['Sasa', 'சச'] };
  for (const [k, [en, ta]] of Object.entries(MAHA)) {
    if (KENDRA.includes(fromLagna(k)) && dignified(k, P[k].rasi)) add(`mahapurusha_${k}`, `${en} Yoga (Pancha Mahapurusha)`, `${ta} யோகம் (பஞ்ச மகாபுருஷ)`, `${k} strong in a kendra: a natural leader in its areas.`, `${PLANETS[k].ta} கேந்திரத்தில் பலம்: தலைமைப் பண்பு.`);
  }
  // Yogakaraka and Raja yoga (kendra lord with trikona lord).
  for (const k of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']) {
    const ruled = housesRuled(L, k);
    if (ruled.some((h) => [4, 7, 10].includes(h)) && ruled.some((h) => [5, 9].includes(h))) {
      add(`yogakaraka_${k}`, `${k} is your Yogakaraka`, `${PLANETS[k].ta} யோககாரகர்`, `${k} rules both a kendra and a trikona for your lagna; its dasa and its strength bring rise.`, `உங்கள் லக்னத்திற்கு ${PLANETS[k].ta} கேந்திர, திரிகோண அதிபதி; இதன் தசை உயர்வு தரும்.`);
    }
  }
  const kendraLords = new Set([4, 7, 10].map((h) => lordOfHouse(L, h)));
  const trikonaLords = new Set([5, 9].map((h) => lordOfHouse(L, h)));
  let raja = false;
  for (const a of kendraLords) for (const b of trikonaLords) if (a !== b && P[a].rasi === P[b].rasi) raja = true;
  if (raja) add('raja', 'Raja Yoga', 'ராஜ யோகம்', 'A kendra lord joins a trikona lord: status, authority and success after effort.', 'கேந்திர அதிபதியும் திரிகோண அதிபதியும் சேர்க்கை: அந்தஸ்து, அதிகாரம், வெற்றி.');
  const dhanaA = new Set([2, 11].map((h) => lordOfHouse(L, h)));
  const dhanaB = new Set([5, 9].map((h) => lordOfHouse(L, h)));
  let dhana = false;
  for (const a of dhanaA) for (const b of dhanaB) if (a !== b && P[a].rasi === P[b].rasi) dhana = true;
  if (dhana) add('dhana', 'Dhana Yoga', 'தன யோகம்', 'Wealth lords join fortune lords: steady growth of savings and assets.', 'தன அதிபதிகள் பாக்கிய அதிபதிகளுடன்: சேமிப்பு, சொத்து வளர்ச்சி.');
  const dusLords = [6, 8, 12].map((h) => lordOfHouse(L, h));
  if (dusLords.every((k) => DUSTHANA.includes(fromLagna(k)))) add('viparita', 'Viparita Raja Yoga', 'விபரீத ராஜ யோகம்', 'Lords of difficulty sit in difficult houses: you rise strongly after obstacles.', 'தடைகளின் அதிபதிகள் மறைவு ஸ்தானத்தில்: தடைகளுக்குப் பின் பெரும் உயர்வு.');
  const adhi = ['Mercury', 'Jupiter', 'Venus'].filter((k) => [6, 7, 8].includes(fromMoon(k)));
  if (adhi.length >= 2) add('adhi', 'Adhi Yoga', 'அதி யோகம்', 'Benefics around the 6th–8th from the Moon: comfort, good helpers and respect.', 'சந்திரனுக்கு 6–8-ல் சுபர்கள்: சுகம், நல்ல உதவியாளர்கள், மதிப்பு.');
  for (const [k, p] of Object.entries(P)) {
    if (!(k in EXALT) || p.rasi !== (EXALT[k] + 6) % 12) continue;
    const dispositor = RASIS[p.rasi].lord;
    if (KENDRA.includes(fromLagna(dispositor)) || KENDRA.includes(fromMoon(dispositor))) {
      add(`neechabhanga_${k}`, `Neecha Bhanga Raja Yoga (${k})`, `நீச பங்க ராஜ யோகம் (${PLANETS[k].ta})`, `${k}'s weakness is cancelled: what starts hard turns into a strength.`, `${PLANETS[k].ta} நீசம் பங்கமாகிறது: கடினமாகத் தொடங்குவது பலமாக மாறும்.`);
    }
  }
  const around = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].filter((k) => [2, 12].includes(fromMoon(k)) || P[k].rasi === M);
  if (!around.length && !KENDRA.includes(fromLagna('Moon'))) {
    add('kemadruma', 'Kemadruma (mild)', 'கேமத்ரும (லேசானது)', 'The Moon stands alone; keep good company and a calm routine — prayer to Ambal on Mondays strengthens the mind.', 'சந்திரன் தனித்து உள்ளது; நல்ல நட்பு, அமைதியான வாழ்க்கை முறை; திங்கள் அம்பாள் வழிபாடு மனதைப் பலப்படுத்தும்.', 'mild');
  }
  return yogas;
}

/** Sidereal Saturn/Jupiter/Rahu now, relative to the natal Moon; Ezharai / Ashtama Sani and Guru Balam. */
export function transitStatus(chart, now = new Date()) {
  const { planets } = planetPositions(now);
  const M = chart.planets.Moon.rasi;
  const h = (k) => houseOf(M, planets[k].rasi);
  const sat = h('Saturn'), jup = h('Jupiter'), rahu = h('Rahu');
  const satPhase = sat === 12 ? 1 : sat === 1 ? 2 : sat === 2 ? 3 : 0;
  // Find when the current Saturn sign started and ends (scan months).
  const satSpan = signSpan('Saturn', now);
  const jupSpan = signSpan('Jupiter', now);
  const status = [];
  if (satPhase) status.push({ id: 'ezharai', kind: 'care', en: `Ezharai Sani (Sade Sati), phase ${satPhase} of 3`, ta: `ஏழரைச் சனி — ${['', 'விரய', 'ஜென்ம', 'பாத'][satPhase]} சனி`, adviceEn: 'A period of hard work that builds maturity. Avoid shortcuts, keep health routines, and light a sesame-oil lamp on Saturdays.', adviceTa: 'உழைப்பால் முதிர்ச்சி தரும் காலம். குறுக்கு வழிகளைத் தவிர்த்து, ஆரோக்கியம் பேணி, சனிக்கிழமை நல்லெண்ணெய் தீபம் ஏற்றவும்.' });
  else if (sat === 8) status.push({ id: 'ashtama', kind: 'care', en: 'Ashtama Sani (Saturn 8th from Moon)', ta: 'அஷ்டமச் சனி', adviceEn: 'Go slow on big risks and lending; patience and service bring protection.', adviceTa: 'பெரிய அபாயங்கள், கடன் கொடுப்பதில் நிதானம்; பொறுமையும் சேவையும் காக்கும்.' });
  else if (sat === 4) status.push({ id: 'ardhashtama', kind: 'care', en: 'Ardhashtama Sani (Saturn 4th from Moon)', ta: 'அர்த்தாஷ்டமச் சனி', adviceEn: 'Care for home and mother\'s health; avoid property disputes.', adviceTa: 'வீடு, தாயின் ஆரோக்கியத்தில் கவனம்; சொத்து பிரச்சினைகளைத் தவிர்க்கவும்.' });
  else if ([3, 6, 11].includes(sat)) status.push({ id: 'sani_good', kind: 'good', en: `Saturn transits the ${sat}th from your Moon — a rewarding period`, ta: `சனி ${sat}-ல் — பலன் தரும் காலம்`, adviceEn: 'Effort is rewarded; good for steady career growth.', adviceTa: 'உழைப்புக்குப் பலன்; தொழிலில் நிலையான வளர்ச்சி.' });
  const guruBalam = [2, 5, 7, 9, 11].includes(jup);
  status.push(guruBalam
    ? { id: 'guru_balam', kind: 'good', en: `Guru Balam: Jupiter ${jup}th from your Moon`, ta: `குரு பலம் உண்டு (${jup}-ல் குரு)`, adviceEn: 'Favourable for marriage, children, new ventures and learning.', adviceTa: 'திருமணம், குழந்தை, புதிய முயற்சி, கல்விக்கு சாதகம்.' }
    : { id: 'guru_weak', kind: 'mild', en: `Jupiter ${jup}th from your Moon (Guru Balam weak)`, ta: `குரு ${jup}-ல் (குரு பலம் குறைவு)`, adviceEn: 'Pray to Dakshinamurthy on Thursdays; choose muhurthams carefully for big events.', adviceTa: 'வியாழன் தட்சிணாமூர்த்தி வழிபாடு; பெரிய நிகழ்வுகளுக்கு முகூர்த்தத்தை கவனமாகத் தேர்வு செய்யவும்.' });
  if ([1, 7].includes(rahu)) status.push({ id: 'rahu', kind: 'mild', en: `Rahu transits the ${rahu}th from your Moon`, ta: `ராகு ${rahu}-ல் சஞ்சாரம்`, adviceEn: 'Avoid confusion in partnerships; Durga worship on Tuesdays/Fridays helps.', adviceTa: 'கூட்டு முயற்சிகளில் தெளிவு தேவை; செவ்வாய்/வெள்ளி துர்கை வழிபாடு நன்று.' });
  return { saturnFromMoon: sat, jupiterFromMoon: jup, rahuFromMoon: rahu, saturnSign: planets.Saturn.rasi, jupiterSign: planets.Jupiter.rasi, satSpan, jupSpan, status };
}

/** When the planet entered its current sidereal sign, and when it leaves (monthly scan, then refine to a day). */
function signSpan(planet, now) {
  const rasiAt = (d) => planetPositions(d).planets[planet].rasi;
  const cur = rasiAt(now);
  const MONTH = 30 * 86400000;
  let a = now.getTime(), b = now.getTime();
  for (let i = 0; i < 40 && rasiAt(new Date(a - MONTH)) === cur; i++) a -= MONTH;
  for (let i = 0; i < 40 && rasiAt(new Date(b + MONTH)) === cur; i++) b += MONTH;
  const refine = (t, dir) => { let x = t; for (let i = 0; i < 31 && rasiAt(new Date(x + dir * 86400000)) === cur; i++) x += dir * 86400000; return new Date(x); };
  return { from: refine(a, -1), to: refine(b, 1) };
}

const AREAS = [
  { id: 'career', en: 'Career & status', ta: 'தொழில் & அந்தஸ்து', houses: [10, 6, 11], karakas: ['Saturn', 'Sun'] },
  { id: 'wealth', en: 'Wealth & savings', ta: 'செல்வம் & சேமிப்பு', houses: [2, 11, 9], karakas: ['Jupiter', 'Venus'] },
  { id: 'marriage', en: 'Marriage & partnership', ta: 'திருமணம் & கூட்டு', houses: [7, 2, 11], karakas: ['Venus', 'Jupiter'] },
  { id: 'health', en: 'Health & vitality', ta: 'ஆரோக்கியம்', houses: [1, 6, 8], karakas: ['Sun', 'Moon'] },
  { id: 'education', en: 'Education & intellect', ta: 'கல்வி & அறிவு', houses: [4, 5, 9], karakas: ['Mercury', 'Jupiter'] },
  { id: 'children', en: 'Children', ta: 'குழந்தைகள்', houses: [5, 9], karakas: ['Jupiter'] },
  { id: 'property', en: 'Home, land & vehicles', ta: 'வீடு, நிலம், வாகனம்', houses: [4, 11], karakas: ['Mars', 'Venus'] },
  { id: 'spiritual', en: 'Spiritual growth', ta: 'ஆன்மீக வளர்ச்சி', houses: [9, 12, 5], karakas: ['Jupiter', 'Ketu'] },
];

/** Full analysis bundle used by the Jathagam report screen and the Jothidar. */
export function fullAnalysis(chart, now = new Date()) {
  const bhavas = bhavaAnalysis(chart);
  const strength = grahaStrength(chart.planets);
  const sMap = Object.fromEntries(strength.map((g) => [g.planet, g.score]));
  const yogas = detectYogas(chart);
  const transit = transitStatus(chart, now);
  const areas = AREAS.map((a) => {
    const hs = a.houses.map((h) => bhavas[h - 1].score);
    const ks = a.karakas.map((k) => sMap[k]);
    let score = Math.round(hs[0] * 0.45 + (hs.slice(1).reduce((x, y) => x + y, 0) / Math.max(1, hs.length - 1)) * 0.25 + (ks.reduce((x, y) => x + y, 0) / ks.length) * 0.3);
    if (a.id === 'marriage' && transit.status.some((s) => s.id === 'guru_balam')) score += 4;
    if (a.id === 'career' && transit.status.some((s) => s.id === 'sani_good')) score += 4;
    score = Math.max(20, Math.min(95, score));
    return { ...a, score, level: score >= 66 ? 'strong' : score >= 48 ? 'steady' : 'needs care' };
  });
  const dasa = chart.dasa.current;
  let dasaOutlook = null;
  if (dasa) {
    const k = dasa.lord;
    const house = houseOf(chart.planets.Lagna.rasi, chart.planets[k].rasi);
    const ruled = k in OWN ? housesRuled(chart.planets.Lagna.rasi, k) : [];
    const good = sMap[k] >= 55 && !DUSTHANA.includes(house);
    dasaOutlook = {
      lord: k, house, ruled, strength: sMap[k], tone: good ? 'favourable' : 'growth through effort',
      en: `${k} Mahadasa: ${k} sits in house ${house}${ruled.length ? ` and rules ${ruled.join(' & ')}` : ''}. ${good ? 'A supportive period — use it to build.' : 'Results come through patience and steady effort; its parigaram helps.'}`,
      ta: `${PLANETS[k].ta} மகா தசை: ${house}-ம் வீட்டில்${ruled.length ? `, ${ruled.join(' & ')}-ம் வீடுகளின் அதிபதி` : ''}. ${good ? 'ஆதரவான காலம் — வளர்ச்சிக்குப் பயன்படுத்தவும்.' : 'பொறுமையும் தொடர் முயற்சியும் பலன் தரும்; அதன் பரிகாரம் உதவும்.'}`,
    };
  }
  return { bhavas, strength, yogas, transit, areas, dasaOutlook };
}
