// Thirumana Porutham — traditional Tamil 10-porutham marriage matching, plus
// Chevvai (Mars) dosham, Rahu-Ketu (Sarpa) dosham and dosha samyam checks.
import { NAKSHATRAS, RASIS, PLANETS } from './astro.js';

const PLANET_TA = Object.fromEntries(Object.entries(PLANETS).map(([k, v]) => [k, v.ta]));

// Gana: 0 Deva, 1 Manushya, 2 Rakshasa (by nakshatra index)
const GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];
const GANA_NAMES = [{ en: 'Deva', ta: 'தேவ' }, { en: 'Manushya', ta: 'மனித' }, { en: 'Rakshasa', ta: 'ராட்சச' }];

// Yoni animal per nakshatra and enemy pairs.
const YONI = ['horse', 'elephant', 'sheep', 'serpent', 'serpent', 'dog', 'cat', 'sheep', 'cat', 'rat', 'rat', 'cow', 'buffalo', 'tiger',
  'buffalo', 'tiger', 'deer', 'deer', 'dog', 'monkey', 'mongoose', 'monkey', 'lion', 'horse', 'lion', 'cow', 'elephant'];
const YONI_TA = { horse: 'குதிரை', elephant: 'யானை', sheep: 'ஆடு', serpent: 'பாம்பு', dog: 'நாய்', cat: 'பூனை', rat: 'எலி', cow: 'பசு', buffalo: 'எருமை', tiger: 'புலி', deer: 'மான்', monkey: 'குரங்கு', mongoose: 'கீரி', lion: 'சிங்கம்' };
const YONI_ENEMY = [['horse', 'buffalo'], ['elephant', 'lion'], ['sheep', 'monkey'], ['serpent', 'mongoose'], ['dog', 'deer'], ['cat', 'rat'], ['cow', 'tiger']];

// Rajju: 0 Paada, 1 Kati (Ooru), 2 Nabhi, 3 Kantha, 4 Siro — cycles over each group of 9 stars.
const RAJJU_CYCLE = [0, 1, 2, 3, 4, 3, 2, 1, 0];
const RAJJU_NAMES = [
  { en: 'Paada (feet)', ta: 'பாத ரஜ்ஜு' }, { en: 'Kati (waist)', ta: 'கடி ரஜ்ஜு' }, { en: 'Nabhi (navel)', ta: 'நாபி ரஜ்ஜு' },
  { en: 'Kantha (neck)', ta: 'கண்ட ரஜ்ஜு' }, { en: 'Siro (head)', ta: 'சிரோ ரஜ்ஜு' },
];

// Vedhai (mutually obstructing) star pairs.
const VEDHA = [[0, 17], [1, 16], [2, 15], [3, 14], [5, 21], [6, 20], [7, 19], [8, 18], [9, 26], [10, 25], [11, 24], [12, 23], [4, 22], [4, 13], [13, 22]];

// Vasya: rasi -> rasis under its influence.
const VASYA = { 0: [4, 7], 1: [3, 6], 2: [5], 3: [7, 8], 4: [9], 5: [1, 11], 6: [9], 7: [3, 5], 8: [11], 9: [10], 10: [11], 11: [9] };

// Natural (naisargika) friendships of the rasi lords.
const FRIENDS = {
  Sun: { f: ['Moon', 'Mars', 'Jupiter'], e: ['Venus', 'Saturn'] },
  Moon: { f: ['Sun', 'Mercury'], e: [] },
  Mars: { f: ['Sun', 'Moon', 'Jupiter'], e: ['Mercury'] },
  Mercury: { f: ['Sun', 'Venus'], e: ['Moon'] },
  Jupiter: { f: ['Sun', 'Moon', 'Mars'], e: ['Mercury', 'Venus'] },
  Venus: { f: ['Mercury', 'Saturn'], e: ['Sun', 'Moon'] },
  Saturn: { f: ['Mercury', 'Venus'], e: ['Sun', 'Moon', 'Mars'] },
};
const relation = (a, b) => (a === b ? 1 : FRIENDS[a].f.includes(b) ? 1 : FRIENDS[a].e.includes(b) ? -1 : 0);

// Same star for bride and groom is acceptable for these stars (Ekanakshatra exception).
const SAME_STAR_OK = new Set([3, 5, 9, 12, 15, 21, 11, 26]);
const DINA_GOOD = new Set([2, 4, 6, 8, 9, 11, 13, 15, 18, 20, 24, 26]);
const MAHENDRA_GOOD = new Set([4, 7, 10, 13, 16, 19, 22, 25]);

const count = (from, to, n) => ((to - from + n) % n) + 1;
const GOOD = 'uttamam', MID = 'madhyamam', BAD = 'poruthamillai';

/**
 * Match bride (girl) and groom (boy). Each side: { star (0-26), rasi (0-11) } — derived from a birth chart
 * or chosen directly. Returns the 10 poruthams with status and a summary verdict.
 */
export function matchPorutham(girl, boy) {
  const gs = girl.star, bs = boy.star;
  const c = count(gs, bs, 27);
  const rows = [];
  const push = (key, en, ta, status, detail, importance = 'normal') => rows.push({ key, en, ta, status, detail, importance });

  // 1. Dina
  let dina = DINA_GOOD.has(c) ? GOOD : BAD;
  if (gs === bs) dina = SAME_STAR_OK.has(gs) ? MID : BAD;
  push('dina', 'Dina Porutham', 'தினப் பொருத்தம்', dina, { en: `Count ${c} from bride's star`, ta: `பெண் நட்சத்திரத்திலிருந்து ${c}` }, 'high');

  // 2. Gana
  const gg = GANA[gs], bg = GANA[bs];
  let gana;
  if (gg === bg) gana = GOOD;
  else if (gg !== 2 && bg !== 2) gana = MID;
  else gana = BAD;
  push('gana', 'Gana Porutham', 'கணப் பொருத்தம்', gana, { en: `${GANA_NAMES[gg].en} – ${GANA_NAMES[bg].en}`, ta: `${GANA_NAMES[gg].ta} – ${GANA_NAMES[bg].ta}` }, 'high');

  // 3. Mahendra
  push('mahendra', 'Mahendra Porutham', 'மகேந்திரப் பொருத்தம்', MAHENDRA_GOOD.has(c) ? GOOD : BAD, { en: `Count ${c}`, ta: `எண்ணிக்கை ${c}` });

  // 4. Stree Deergham
  push('stree', 'Stree Deergham', 'ஸ்திரீ தீர்க்கம்', c > 13 ? GOOD : c > 7 ? MID : BAD, { en: `Count ${c}`, ta: `எண்ணிக்கை ${c}` });

  // 5. Yoni
  const gy = YONI[gs], by = YONI[bs];
  const enemy = YONI_ENEMY.some(([a, b]) => (a === gy && b === by) || (a === by && b === gy));
  push('yoni', 'Yoni Porutham', 'யோனிப் பொருத்தம்', gy === by ? GOOD : enemy ? BAD : MID, { en: `${gy} – ${by}`, ta: `${YONI_TA[gy]} – ${YONI_TA[by]}` }, 'high');

  // 6. Rasi
  const rc = count(girl.rasi, boy.rasi, 12);
  const rasi = [2, 6, 8, 12].includes(rc) ? BAD : [5, 9].includes(rc) ? MID : GOOD;
  push('rasi', 'Rasi Porutham', 'ராசிப் பொருத்தம்', rasi, { en: `Groom's rasi is ${rc} from bride's`, ta: `பெண் ராசியிலிருந்து மாப்பிள்ளை ராசி ${rc}` }, 'high');

  // 7. Rasi Athipathi
  const gl = RASIS[girl.rasi].lord, bl = RASIS[boy.rasi].lord;
  const r1 = relation(gl, bl), r2 = relation(bl, gl);
  const lord = gl === bl || (r1 === 1 && r2 === 1) ? GOOD : r1 === -1 || r2 === -1 ? BAD : MID;
  push('athipathi', 'Rasi Athipathi Porutham', 'ராசி அதிபதிப் பொருத்தம்', lord, { en: `${gl} – ${bl}`, ta: `${PLANET_TA[gl]} – ${PLANET_TA[bl]}` });

  // 8. Vasya
  const vasya = VASYA[girl.rasi].includes(boy.rasi) || VASYA[boy.rasi].includes(girl.rasi);
  push('vasya', 'Vasya Porutham', 'வசியப் பொருத்தம்', vasya ? GOOD : BAD, { en: `${RASIS[girl.rasi].en} – ${RASIS[boy.rasi].en}`, ta: `${RASIS[girl.rasi].ta} – ${RASIS[boy.rasi].ta}` });

  // 9. Rajju (most important)
  const gr = RAJJU_CYCLE[gs % 9], br = RAJJU_CYCLE[bs % 9];
  push('rajju', 'Rajju Porutham', 'ரஜ்ஜுப் பொருத்தம்', gr === br ? BAD : GOOD, { en: `${RAJJU_NAMES[gr].en} – ${RAJJU_NAMES[br].en}`, ta: `${RAJJU_NAMES[gr].ta} – ${RAJJU_NAMES[br].ta}` }, 'critical');

  // 10. Vedhai
  const vedha = VEDHA.some(([a, b]) => (a === gs && b === bs) || (a === bs && b === gs));
  push('vedhai', 'Vedhai Porutham', 'வேதைப் பொருத்தம்', vedha ? BAD : GOOD, vedha ? { en: 'Stars obstruct each other', ta: 'நட்சத்திரங்கள் ஒன்றுக்கொன்று வேதை' } : { en: 'No vedha', ta: 'வேதை இல்லை' }, 'critical');

  const score = rows.reduce((s, r) => s + (r.status === GOOD ? 1 : r.status === MID ? 0.5 : 0), 0);
  const criticalFail = rows.some((r) => r.importance === 'critical' && r.status === BAD);
  const verdict = criticalFail ? 'NOT_RECOMMENDED' : score >= 7 ? 'EXCELLENT' : score >= 5.5 ? 'GOOD' : score >= 4 ? 'AVERAGE' : 'NOT_RECOMMENDED';
  return {
    rows, score, outOf: 10, verdict, criticalFail,
    girl: { star: NAKSHATRAS[gs], rasi: RASIS[girl.rasi], gana: GANA_NAMES[gg], yoni: { en: gy, ta: YONI_TA[gy] }, rajju: RAJJU_NAMES[gr] },
    boy: { star: NAKSHATRAS[bs], rasi: RASIS[boy.rasi], gana: GANA_NAMES[bg], yoni: { en: by, ta: YONI_TA[by] }, rajju: RAJJU_NAMES[br] },
  };
}

export const VERDICTS = {
  EXCELLENT: { en: 'Excellent match (Uthamam)', ta: 'உத்தமப் பொருத்தம்' },
  GOOD: { en: 'Good match (Madhyamam)', ta: 'நல்ல பொருத்தம்' },
  AVERAGE: { en: 'Average — consult further', ta: 'சுமாரான பொருத்தம்' },
  NOT_RECOMMENDED: { en: 'Not recommended', ta: 'பொருத்தம் இல்லை' },
};

const houseFrom = (fromRasi, rasi) => ((rasi - fromRasi + 12) % 12) + 1;

/**
 * Chevvai dosham (Mars in 2, 4, 7, 8, 12 from Lagna or Moon) with common Tamil exceptions,
 * and Rahu-Ketu dosham (Rahu/Ketu in 1, 2, 7, 8 from Lagna).
 */
export function doshams(planets) {
  const mars = planets.Mars.rasi;
  const fromLagna = planets.Lagna ? houseFrom(planets.Lagna.rasi, mars) : null;
  const fromMoon = houseFrom(planets.Moon.rasi, mars);
  const bad = [2, 4, 7, 8, 12];
  let chevvai = (fromLagna && bad.includes(fromLagna)) || bad.includes(fromMoon);
  const exceptions = [];
  if (chevvai) {
    if ([0, 7, 9].includes(mars)) exceptions.push({ en: 'Mars in own sign or exalted (Mesha, Vrischika, Makara)', ta: 'செவ்வாய் ஆட்சி/உச்சம் பெற்றது' });
    if ([4, 10].includes(mars)) exceptions.push({ en: 'Mars in Simha or Kumbha', ta: 'சிம்மம் / கும்பத்தில் செவ்வாய்' });
    if (planets.Jupiter.rasi === mars) exceptions.push({ en: 'Jupiter with Mars', ta: 'குருவுடன் செவ்வாய் சேர்க்கை' });
    if (fromLagna === 2 && [2, 5].includes(mars)) exceptions.push({ en: 'Mars in 2nd in Mithuna/Kanni', ta: 'மிதுனம்/கன்னியில் 2-ல் செவ்வாய்' });
  }
  const effective = chevvai && exceptions.length === 0;
  const rahuH = planets.Lagna ? houseFrom(planets.Lagna.rasi, planets.Rahu.rasi) : null;
  const ketuH = planets.Lagna ? houseFrom(planets.Lagna.rasi, planets.Ketu.rasi) : null;
  const naga = [1, 2, 7, 8];
  const rahuKetu = planets.Lagna ? naga.includes(rahuH) || naga.includes(ketuH) : null;
  return {
    chevvai: { present: effective, raw: chevvai, fromLagna, fromMoon, exceptions },
    rahuKetu: { present: rahuKetu, rahuHouse: rahuH, ketuHouse: ketuH },
  };
}

/** Dosha samyam: doshams on both sides cancel; a dosham on one side only is a concern. */
export function doshaSamyam(girlD, boyD) {
  const notes = [];
  const cmp = (key, en, ta) => {
    const g = girlD[key].present, b = boyD[key].present;
    if (g == null || b == null) return;
    if (g && b) notes.push({ key, ok: true, en: `${en}: present in both — samyam (balanced)`, ta: `${ta}: இருவருக்கும் உள்ளது — சமம்` });
    else if (g || b) notes.push({ key, ok: false, en: `${en}: present only for the ${g ? 'bride' : 'groom'}`, ta: `${ta}: ${g ? 'பெண்ணுக்கு' : 'மாப்பிள்ளைக்கு'} மட்டும் உள்ளது` });
    else notes.push({ key, ok: true, en: `${en}: none`, ta: `${ta}: இல்லை` });
  };
  cmp('chevvai', 'Chevvai dosham', 'செவ்வாய் தோஷம்');
  cmp('rahuKetu', 'Rahu-Ketu dosham', 'ராகு-கேது தோஷம்');
  return notes;
}
