// Personal guide for each Jathagam (என் வழிகாட்டி): lucky numbers, Ishta Theivam, daily colour,
// gemstones (suitable / avoid), a proposed Siddhar and a personal mantra playlist.
// Everything is derived from the birth chart with traditional, explainable rules.
import { RASIS, PLANETS, NAKSHATRAS } from './astro.js';
import { NAVAGRAHA, grahaStrength } from './remedies.js';
import { ayulBalam } from './lifecheck.js';

const T = (en, ta) => ({ en, ta });
const SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const houseOf = (lagnaRasi, rasi) => ((rasi - lagnaRasi + 12) % 12) + 1;
const lordOf = (lagnaRasi, h) => RASIS[(lagnaRasi + h - 1) % 12].lord;
const ENEMIES = {
  Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'], Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars'],
};

// ---------------------------------------------------------------- Numerology (Chaldean planet numbers)
export const NUMBER_PLANET = { 1: 'Sun', 2: 'Moon', 3: 'Jupiter', 4: 'Rahu', 5: 'Mercury', 6: 'Venus', 7: 'Ketu', 8: 'Saturn', 9: 'Mars' };
const PLANET_NUMBER = Object.fromEntries(Object.entries(NUMBER_PLANET).map(([n, p]) => [p, Number(n)]));
const reduce = (n) => { while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n; };

export function luckyNumbers(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const birth = reduce(d);
  const destiny = reduce([...`${y}${m}${d}`].reduce((a, x) => a + Number(x), 0));
  const friendly = {
    1: [1, 2, 3, 9], 2: [1, 2, 7], 3: [1, 3, 6, 9], 4: [1, 5, 6], 5: [1, 5, 6], 6: [3, 5, 6, 9], 7: [1, 2, 7], 8: [5, 6, 8], 9: [1, 3, 6, 9],
  };
  const avoid = { 1: [8], 2: [8, 9], 3: [5, 6], 4: [2, 9], 5: [2], 6: [1], 7: [8, 9], 8: [1, 2, 4], 9: [5, 8] };
  const lucky = [...new Set([birth, destiny, ...friendly[birth]])].sort((a, b) => a - b);
  const luckyDates = Array.from({ length: 31 }, (_, i) => i + 1).filter((x) => lucky.includes(reduce(x)));
  return {
    birth, destiny, lucky, avoid: avoid[birth].filter((x) => !lucky.includes(x)), luckyDates,
    birthPlanet: NUMBER_PLANET[birth], destinyPlanet: NUMBER_PLANET[destiny],
  };
}

// ---------------------------------------------------------------- Deities
export const PLANET_DEITY = {
  Sun: T('Lord Shiva', 'சிவபெருமான்'), Moon: T('Goddess Parvathi (Ambal)', 'அம்பாள் (பார்வதி)'), Mars: T('Lord Murugan', 'முருகப் பெருமான்'),
  Mercury: T('Lord Vishnu (Perumal)', 'பெருமாள் (விஷ்ணு)'), Jupiter: T('Lord Dakshinamurthy', 'தட்சிணாமூர்த்தி'), Venus: T('Goddess Mahalakshmi', 'மகாலட்சுமி'),
  Saturn: T('Lord Venkatachalapathi / Sri Anjaneyar', 'வெங்கடாசலபதி / ஸ்ரீ ஆஞ்சநேயர்'), Rahu: T('Goddess Durga', 'துர்கை அம்மன்'), Ketu: T('Lord Vinayagar', 'விநாயகர்'),
};
const DEITY_MANTRA = {
  Sun: 'ஓம் நமசிவாய', Moon: 'ஓம் சக்தி பராசக்தி', Mars: 'ஓம் சரவணபவ', Mercury: 'ஓம் நமோ நாராயணாய', Jupiter: 'ஓம் குருவே நமஹ',
  Venus: 'ஓம் ஸ்ரீ மகாலட்சுமியை நமஹ', Saturn: 'ஓம் நமோ வெங்கடேசாய', Rahu: 'ஓம் துர்காயை நமஹ', Ketu: 'ஓம் கம் கணபதயே நமஹ',
};

/** Traditional worship deity for each birth star (நட்சத்திர வழிபாட்டுத் தெய்வம்). */
export const STAR_DEITY = [
  T('Goddess Saraswathi', 'சரஸ்வதி'), T('Goddess Durga', 'துர்கை'), T('Lord Murugan', 'முருகன்'), T('Lord Krishna', 'கிருஷ்ணர்'),
  T('Lord Shiva (Chandramouleeswarar)', 'சந்திரமௌலீஸ்வரர் (சிவன்)'), T('Lord Nataraja', 'நடராஜர்'), T('Lord Rama', 'ஸ்ரீ ராமர்'), T('Lord Dakshinamurthy', 'தட்சிணாமூர்த்தி'),
  T('Naga Devathai / Adhiseshan', 'நாக தேவதை / ஆதிசேஷன்'), T('Lord Vinayagar', 'விநாயகர்'), T('Goddess Andal', 'ஆண்டாள்'), T('Lord Ayyappan (Sastha)', 'ஐயப்பன் (சாஸ்தா)'),
  T('Gayatri Devi', 'காயத்ரி தேவி'), T('Sri Chakrathazhwar', 'சக்கரத்தாழ்வார்'), T('Lord Narasimhar', 'நரசிம்மர்'), T('Lord Murugan', 'முருகன்'),
  T('Goddess Mahalakshmi', 'மகாலட்சுமி'), T('Lord Varahar', 'வராகப் பெருமாள்'), T('Sri Anjaneyar', 'ஆஞ்சநேயர்'), T('Goddess Ambal (Akilandeswari)', 'அகிலாண்டேஸ்வரி'),
  T('Lord Vinayagar', 'விநாயகர்'), T('Lord Perumal (Oppiliappan)', 'பெருமாள் (ஒப்பிலியப்பன்)'), T('Lord Anantha Padmanabhar', 'அனந்த பத்மநாபர்'), T('Lord Mrityunjayar (Shiva)', 'மிருத்யுஞ்ஜயர் (சிவன்)'),
  T('Lord Ekapadhar (Shiva)', 'ஏகபாதர் (சிவன்)'), T('Lord Maheswarar', 'மகேஸ்வரர்'), T('Lord Ranganathar', 'ரங்கநாதர்'),
];

/** Jaimini Atmakaraka: the planet with the highest degree within its sign (7 planets). */
export function atmakaraka(planets) {
  return SEVEN.reduce((best, k) => (planets[k].degreeInSign > planets[best].degreeInSign ? k : best), 'Sun');
}

/** Ishta Theivam: planets in (or the lord of) the 12th from Karakamsa (Atmakaraka's navamsa). */
export function ishtaTheivam(chart) {
  const P = chart.planets;
  const ak = atmakaraka(P);
  const karakamsa = P[ak].navamsaRasi;
  const twelfth = (karakamsa + 11) % 12;
  const inTwelfth = Object.keys(P).filter((k) => k !== 'Lagna' && P[k].navamsaRasi === twelfth);
  const planet = inTwelfth.find((k) => k === 'Jupiter' || k === 'Venus') || inTwelfth[0] || RASIS[twelfth].lord;
  return {
    planet, deity: PLANET_DEITY[planet], mantra: DEITY_MANTRA[planet], atmakaraka: ak,
    starDeity: STAR_DEITY[chart.janmaNakshatra.index],
    why: T(`Atmakaraka ${ak} → Karakamsa ${RASIS[karakamsa].en} → 12th from it ${RASIS[twelfth].en} → ${planet}`,
      `ஆத்மகாரகன் ${PLANETS[ak].ta} → காரகாம்சம் ${RASIS[karakamsa].ta} → அதன் 12-ம் வீடு ${RASIS[twelfth].ta} → ${PLANETS[planet].ta}`),
  };
}

// ---------------------------------------------------------------- Colours
export const DAY_COLOR = [
  { planet: 'Sun', ...T('Orange / saffron', 'ஆரஞ்சு / காவி'), hex: '#ff8c1a' },
  { planet: 'Moon', ...T('White / cream', 'வெள்ளை / இளம் வெண்மை'), hex: '#f4f1e6' },
  { planet: 'Mars', ...T('Red / coral', 'சிவப்பு / பவழ நிறம்'), hex: '#d62828' },
  { planet: 'Mercury', ...T('Green', 'பச்சை'), hex: '#2a9d4a' },
  { planet: 'Jupiter', ...T('Yellow / gold', 'மஞ்சள் / பொன்னிறம்'), hex: '#f2c230' },
  { planet: 'Venus', ...T('Light pink / silver white', 'இளஞ்சிவப்பு / வெள்ளி வெண்மை'), hex: '#f7b6c8' },
  { planet: 'Saturn', ...T('Dark blue / violet', 'கருநீலம் / ஊதா'), hex: '#283c86' },
];
const PLANET_COLOR = Object.fromEntries(DAY_COLOR.map((c) => [c.planet, c]));
PLANET_COLOR.Rahu = { planet: 'Rahu', ...T('Smoky grey / navy', 'புகை சாம்பல்'), hex: '#5c6370' };
PLANET_COLOR.Ketu = { planet: 'Ketu', ...T('Brown / multicolour', 'பழுப்பு / பல வண்ணம்'), hex: '#8a5a2b' };

/** Colour to wear on a given weekday: the day's colour unless its lord is an enemy of the lagna lord. */
export function colorForDay(chart, weekday) {
  const lagnaLord = lordOf(chart.planets.Lagna.rasi, 1);
  const day = DAY_COLOR[weekday];
  const clash = (ENEMIES[lagnaLord] || []).includes(day.planet);
  const pick = clash ? PLANET_COLOR[lagnaLord] : day;
  return {
    weekday, ...pick, dayColor: day, clash,
    note: clash
      ? T(`Today's lord ${day.planet} does not suit your lagna lord ${lagnaLord} — wear ${pick.en} (or keep ${day.en} as a small accent).`,
        `இன்றைய அதிபதி ${PLANETS[day.planet].ta}, உங்கள் லக்னாதிபதிக்கு (${PLANETS[lagnaLord].ta}) ஒத்துவராது — ${pick.ta} அணியுங்கள் (${day.ta} சிறிய அளவில் இருக்கலாம்).`)
      : T(`${day.en} — the colour of ${day.planet}, friendly to your chart.`, `${day.ta} — ${PLANETS[day.planet].ta} நிறம், உங்கள் ஜாதகத்திற்கு ஏற்றது.`),
  };
}

export function weeklyColors(chart) { return [0, 1, 2, 3, 4, 5, 6].map((d) => colorForDay(chart, d)); }

// ---------------------------------------------------------------- Gemstones
/** Suitable stones = lords of the 1st, 5th and 9th; avoid = lords of the 6th, 8th and 12th (unless also a trine lord). */
export function gemstones(chart) {
  const L = chart.planets.Lagna.rasi;
  const st = Object.fromEntries(grahaStrength(chart.planets).map((g) => [g.planet, g]));
  const good = [];
  for (const [h, role] of [[1, T('Lagna lord — life stone', 'லக்னாதிபதி — வாழ்க்கைக் கல்')], [5, T('5th lord — fortune & children', '5-ம் அதிபதி — பூர்வ புண்ணியம்')], [9, T('9th lord — luck & dharma', '9-ம் அதிபதி — பாக்கியம்')]]) {
    const p = lordOf(L, h);
    if (!good.some((g) => g.planet === p)) good.push({ planet: p, gem: NAVAGRAHA[p].gem, role, primary: h === 1 });
  }
  const trineLords = good.map((g) => g.planet);
  const avoid = [];
  for (const h of [6, 8, 12]) {
    const p = lordOf(L, h);
    if (!trineLords.includes(p) && !avoid.some((a) => a.planet === p)) avoid.push({ planet: p, gem: NAVAGRAHA[p].gem, role: T(`Lord of the ${h}th house`, `${h}-ம் அதிபதி`) });
  }
  // Rahu / Ketu stones only when they sit in good houses (3, 6, 11).
  for (const k of ['Rahu', 'Ketu']) {
    const h = houseOf(L, chart.planets[k].rasi);
    if (![3, 6, 11].includes(h)) avoid.push({ planet: k, gem: NAVAGRAHA[k].gem, role: T(`${k} in the ${h}th house`, `${PLANETS[k].ta} ${h}-ல்`) });
  }
  const weakGood = good.filter((g) => st[g.planet].level === 'weak');
  return {
    good, avoid,
    note: T('Wear a stone only after testing it for a few days and with an expert\'s confirmation; free remedies (prayer, charity) work for everyone.',
      'கல்லை சில நாட்கள் சோதித்து, நிபுணரின் உறுதிப்படுத்தலுடன் மட்டுமே அணியுங்கள்; வழிபாடு, தானம் போன்ற இலவசப் பரிகாரங்கள் அனைவருக்கும் பலன் தரும்.'),
    weakGood: weakGood.map((g) => g.planet),
  };
}

// ---------------------------------------------------------------- Siddhars
export const SIDDHARS = {
  Sun: { ...T('Thirumoolar', 'திருமூலர்'), place: T('Chidambaram', 'சிதம்பரம்'), mantra: 'ஓம் ஸ்ரீ திருமூலர் திருவடிகளே போற்றி' },
  Moon: { ...T('Sundaranandar', 'சுந்தரானந்தர்'), place: T('Madurai', 'மதுரை'), mantra: 'ஓம் ஸ்ரீ சுந்தரானந்தர் திருவடிகளே போற்றி' },
  Mars: { ...T('Bogar', 'போகர்'), place: T('Palani', 'பழனி'), mantra: 'ஓம் ஸ்ரீ போகர் திருவடிகளே போற்றி' },
  Mercury: { ...T('Sattamuni', 'சட்டைமுனி'), place: T('Srirangam', 'ஸ்ரீரங்கம்'), mantra: 'ஓம் ஸ்ரீ சட்டைமுனி திருவடிகளே போற்றி' },
  Jupiter: { ...T('Agathiyar', 'அகத்தியர்'), place: T('Pothigai hills / Papanasam', 'பொதிகை மலை / பாபநாசம்'), mantra: 'ஓம் ஸ்ரீ அகத்தியர் திருவடிகளே போற்றி' },
  Venus: { ...T('Kamalamuni', 'கமலமுனி'), place: T('Thiruvarur', 'திருவாரூர்'), mantra: 'ஓம் ஸ்ரீ கமலமுனி திருவடிகளே போற்றி' },
  Saturn: { ...T('Konganar', 'கொங்கணர்'), place: T('Tirupati', 'திருப்பதி'), mantra: 'ஓம் ஸ்ரீ கொங்கணர் திருவடிகளே போற்றி' },
  Rahu: { ...T('Pambatti Siddhar', 'பாம்பாட்டிச் சித்தர்'), place: T('Sankarankovil', 'சங்கரன்கோவில்'), mantra: 'ஓம் ஸ்ரீ பாம்பாட்டிச் சித்தர் திருவடிகளே போற்றி' },
  Ketu: { ...T('Idaikadar', 'இடைக்காடர்'), place: T('Tiruvannamalai', 'திருவண்ணாமலை'), mantra: 'ஓம் ஸ்ரீ இடைக்காடர் திருவடிகளே போற்றி' },
};

/** Proposed Siddhar: the janma-star lord's Siddhar, with the Atmakaraka's Siddhar as the second. */
export function proposeSiddhar(chart) {
  const starLord = chart.janmaNakshatra.lord || NAKSHATRAS[chart.janmaNakshatra.index].lord;
  const ak = atmakaraka(chart.planets);
  const main = { planet: starLord, ...SIDDHARS[starLord] };
  const second = ak !== starLord ? { planet: ak, ...SIDDHARS[ak] } : null;
  return {
    main, second,
    why: T(`Your birth star's lord is ${starLord}${second ? `; your soul planet (Atmakaraka) is ${ak}` : ''}.`,
      `உங்கள் ஜன்ம நட்சத்திர அதிபதி ${PLANETS[starLord].ta}${second ? `; ஆத்மகாரகன் ${PLANETS[ak].ta}` : ''}.`),
    howTo: T('On Thursdays, light a ghee lamp, chant the Siddhar\'s name 108 times and feed someone in need. Visit the Jeeva Samadhi once a year.',
      'வியாழன்தோறும் நெய் தீபம் ஏற்றி, சித்தரின் திருநாமத்தை 108 முறை சொல்லி, ஒருவருக்கு அன்னம் அளியுங்கள். ஆண்டுக்கு ஒருமுறை ஜீவ சமாதியைத் தரிசியுங்கள்.'),
  };
}

// ---------------------------------------------------------------- Personal mantra playlist
/** Ordered, de-duplicated list of mantras for this person, each with why it is included. */
export function personalPlaylist(chart, now = new Date()) {
  const L = chart.planets.Lagna.rasi;
  const list = [];
  const add = (key, title, text, why, repeat = 9) => { if (!list.some((x) => x.text === text)) list.push({ key, title, text, why, repeat }); };
  const ishta = ishtaTheivam(chart);
  const siddhar = proposeSiddhar(chart);
  const lagnaLord = lordOf(L, 1);
  const weak = grahaStrength(chart.planets).filter((g) => g.level === 'weak').sort((a, b) => a.score - b.score).slice(0, 2);
  const dasa = chart.dasa?.periods?.find((p) => now >= p.start && now < p.end);
  add('start', T('Vinayagar — to begin', 'விநாயகர் — தொடக்கம்'), 'ஓம் கம் கணபதயே நமஹ', T('Removes obstacles before every prayer', 'எந்த வழிபாட்டிற்கும் முன் தடைகளை நீக்க'), 3);
  add('ishta', T(`Ishta Theivam — ${ishta.deity.en}`, `இஷ்ட தெய்வம் — ${ishta.deity.ta}`), ishta.mantra, T('Your personal deity from the Karakamsa', 'காரகாம்சத்திலிருந்து உங்கள் இஷ்ட தெய்வம்'), 27);
  add('star', T(`Birth-star deity — ${ishta.starDeity.en}`, `நட்சத்திரத் தெய்வம் — ${ishta.starDeity.ta}`), `ஓம் ${ishta.starDeity.ta.split(' (')[0].split(' / ')[0]} போற்றி`, T('Deity of your janma nakshatra', 'ஜன்ம நட்சத்திர வழிபாட்டுத் தெய்வம்'), 9);
  add('lagna', T(`Lagna lord — ${lagnaLord}`, `லக்னாதிபதி — ${PLANETS[lagnaLord].ta}`), NAVAGRAHA[lagnaLord].mantra.ta.split(' · ')[0], T('Strengthens health and confidence', 'ஆரோக்கியம், தன்னம்பிக்கை வலுப்பெற'), 9);
  if (dasa) add('dasa', T(`Running dasa — ${dasa.lord}`, `நடப்பு தசை — ${PLANETS[dasa.lord].ta}`), NAVAGRAHA[dasa.lord].mantra.ta.split(' · ')[0], T('Brings out the best of the current Maha Dasa', 'நடப்பு மகா தசையின் நற்பலனுக்கு'), 9);
  for (const w of weak) add(`weak_${w.planet}`, T(`Strengthen ${w.planet}`, `${PLANETS[w.planet].ta} பலம் பெற`), NAVAGRAHA[w.planet].mantra.ta.split(' · ')[0], T(`${w.planet} is weak in your chart`, `உங்கள் ஜாதகத்தில் ${PLANETS[w.planet].ta} பலம் குறைவு`), 9);
  add('siddhar', T(`Siddhar — ${siddhar.main.en}`, `சித்தர் — ${siddhar.main.ta}`), siddhar.main.mantra, T('Your guiding Siddhar', 'உங்கள் வழிகாட்டும் சித்தர்'), 9);
  if (ayulBalam(chart).level !== 'strong') add('ayul', T('Maha Mrityunjaya — health & long life', 'மகா மிருத்யுஞ்ஜயம் — ஆரோக்கியம், ஆயுள்'), 'ஓம் த்ர்யம்பகம் யஜாமஹே ஸுகந்திம் புஷ்டி வர்தனம் உர்வாருகமிவ பந்தனான் ம்ருத்யோர் முக்ஷீய மாம்ருதாத்', T('For health and long life', 'ஆரோக்கியம், நீண்ட ஆயுளுக்கு'), 3);
  add('navagraha', T('Navagraha — all nine', 'நவகிரகம் — ஒன்பதும்'), 'ஆதித்யாய ச சோமாய மங்களாய புதாய ச குரு சுக்ர சனிப்யஶ்ச ராஹவே கேதவே நமஹ', T('Balance of all planets', 'அனைத்து கிரகங்களின் சமநிலை'), 3);
  return list;
}

/** The complete personal guide for one person. */
export function personalGuide(chart, { date, now = new Date(), weekday = now.getDay() } = {}) {
  return {
    numbers: luckyNumbers(date || chart.date),
    ishta: ishtaTheivam(chart),
    today: colorForDay(chart, weekday),
    week: weeklyColors(chart),
    gems: gemstones(chart),
    siddhar: proposeSiddhar(chart),
    ayul: ayulBalam(chart),
    playlist: personalPlaylist(chart, now),
    lagnaLord: lordOf(chart.planets.Lagna.rasi, 1),
    luckyColors: [...new Set([lordOf(chart.planets.Lagna.rasi, 1), lordOf(chart.planets.Lagna.rasi, 9), lordOf(chart.planets.Lagna.rasi, 5)])].map((p) => PLANET_COLOR[p]),
  };
}

export { PLANET_COLOR, PLANET_NUMBER };
