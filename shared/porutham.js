// Thirumana Porutham — traditional Tamil 10-porutham marriage matching, plus
// Chevvai (Mars) dosham, Rahu-Ketu (Sarpa) dosham and dosha samyam checks.
import { NAKSHATRAS, RASIS, PLANETS } from './astro.js';
import { T, makeContext } from './rules/core.js';
import { resolveProfile } from './rules/profiles.js';
import { evaluateRule } from './rules/registry.js';
import { CHEVVAI_RULE, CHEVVAI_EXCEPTIONS, RAHU_KETU_RULE } from './rules/chevvai.js';

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

/**
 * Chevvai dosham and Rahu-Ketu dosham from the rule registry (shared/rules/chevvai.js).
 * Raw presence is reported per reference point (Lagna and Moon separately). Each Chevvai exception is
 * a separately identified 'proposed' rule with a reason; exceptions are listed and cancel ONLY when the
 * selected profile explicitly applies them (the default profile applies none — no auto-cancellation).
 * Backward-compatible fields: chevvai.{present, raw, fromLagna, fromMoon, exceptions[{en,ta}]},
 * rahuKetu.{present, rahuHouse, ketuHouse}.
 */
export function doshams(planets, { profile, stability } = {}) {
  const pr = resolveProfile(profile);
  const ctx = makeContext({ planets }, pr);
  const cv = evaluateRule(CHEVVAI_RULE, ctx);
  const raw = cv.present;
  const applied = new Set(pr.chevvai.applyExceptions || []);
  const exceptions = raw ? CHEVVAI_EXCEPTIONS.filter((e) => e.test(planets)).map((e) => ({
    id: e.id, en: e.name.en, ta: e.name.ta, status: e.status, reason: e.reason, appliesUnderProfile: applied.has(e.id),
  })) : [];
  const cancelled = exceptions.some((e) => e.appliesUnderProfile);
  const ref = (v) => (v ? { house: v.house ?? null, present: v.present, counted: v.enabled, unavailable: v.unavailable } : null);
  const rk = evaluateRule(RAHU_KETU_RULE, ctx);
  const rkL = rk.variants.lagna;
  return {
    profile: pr.id,
    chevvai: {
      ruleId: CHEVVAI_RULE.id, status: CHEVVAI_RULE.status,
      present: raw && !cancelled, raw, cancelledUnderProfile: cancelled,
      fromLagna: cv.variants.lagna.house ?? null, fromMoon: cv.variants.moon.house,
      references: { lagna: ref(cv.variants.lagna), moon: ref(cv.variants.moon) },
      countedReferences: cv.enabledPresent,
      needsBirthTime: !planets.Lagna,
      lagnaStable: !planets.Lagna ? null : !(stability?.unstable || []).includes('lagna') && !(stability?.unstable || []).includes('house:Mars'),
      exceptions,
      note: T('Exceptions are listed for your astrologer; under this profile they do not cancel automatically.', 'விலக்குகள் ஜோதிடருக்காகப் பட்டியலிடப்பட்டுள்ளன; இந்த முறையில் அவை தானாக நீக்குவதில்லை.'),
    },
    rahuKetu: {
      ruleId: RAHU_KETU_RULE.id, status: RAHU_KETU_RULE.status,
      present: rkL.unavailable && !rk.present ? null : rk.present,
      rahuHouse: rkL.rahuHouse ?? null, ketuHouse: rkL.ketuHouse ?? null,
      references: { lagna: rkL.unavailable ? { present: false, counted: rkL.enabled, unavailable: true } : { rahuHouse: rkL.rahuHouse, ketuHouse: rkL.ketuHouse, present: rkL.present, counted: rkL.enabled }, moon: { rahuHouse: rk.variants.moon.rahuHouse, ketuHouse: rk.variants.moon.ketuHouse, present: rk.variants.moon.present, counted: rk.variants.moon.enabled } },
      countedReferences: rk.enabledPresent,
      needsBirthTime: !planets.Lagna,
    },
  };
}

const SAMYAM = {
  chevvai: { en: 'Chevvai dosham', ta: 'செவ்வாய் தோஷம்', cmpEn: 'Chevvai is compared only with Chevvai in the other chart, using the same reference points for both.', cmpTa: 'செவ்வாய் தோஷம் மற்றவரின் செவ்வாய் தோஷத்துடன் மட்டுமே, இருவருக்கும் ஒரே அளவுகோலில் ஒப்பிடப்படுகிறது.' },
  rahuKetu: { en: 'Rahu-Ketu dosham', ta: 'ராகு-கேது தோஷம்', cmpEn: 'Rahu-Ketu is compared only with Rahu-Ketu in the other chart, using the same reference points for both.', cmpTa: 'ராகு-கேது தோஷம் மற்றவரின் ராகு-கேது தோஷத்துடன் மட்டுமே, இருவருக்கும் ஒரே அளவுகோலில் ஒப்பிடப்படுகிறது.' },
};

/**
 * Dosha samyam: like-with-like only (Chevvai vs Chevvai, Rahu-Ketu vs Rahu-Ketu) — never one dosham
 * balanced by a different one. Symmetric: swapping the two charts gives the same key/status/ok;
 * only the side labels swap. Each note explains the comparison.
 */
export function doshaSamyam(girlD, boyD) {
  const notes = [];
  const sameProfile = (girlD.profile || null) === (boyD.profile || null);
  for (const [key, d] of Object.entries(SAMYAM)) {
    let g = girlD[key]?.present, b = boyD[key]?.present;
    // Like-with-like reference points: if only one chart has a Lagna, compare by the Moon reference on both.
    const mixed = !!girlD[key]?.needsBirthTime !== !!boyD[key]?.needsBirthTime;
    if (mixed) { g = girlD[key]?.references?.moon?.present ?? null; b = boyD[key]?.references?.moon?.present ?? null; }
    const base = sameProfile ? T(d.cmpEn, d.cmpTa)
      : T(`${d.cmpEn} Note: the two charts were evaluated under different profiles — re-run both under one profile.`, `${d.cmpTa} குறிப்பு: இரு ஜாதகங்களும் வெவ்வேறு முறைகளில் கணிக்கப்பட்டுள்ளன — ஒரே முறையில் மீண்டும் கணிக்கவும்.`);
    const comparison = mixed ? T(`${base.en} One birth time is unknown, so both are compared by the Moon reference only.`, `${base.ta} ஒருவரின் பிறந்த நேரம் தெரியாததால் இருவரும் சந்திர அடிப்படையில் மட்டும் ஒப்பிடப்படுகின்றனர்.`) : base;
    if (g == null || b == null) continue; // reference unavailable (no Lagna) — not compared, not a concern
    if (g && b) notes.push({ key, status: 'both', ok: true, comparison, en: `${d.en}: present in both — samyam (balanced)`, ta: `${d.ta}: இருவருக்கும் உள்ளது — சமம்` });
    else if (g || b) notes.push({ key, status: 'one', ok: false, comparison, side: g ? 'first' : 'second', en: `${d.en}: present only for the ${g ? 'bride' : 'groom'} — discuss with your astrologer; it is common and not a cause for fear`, ta: `${d.ta}: ${g ? 'பெண்ணுக்கு' : 'மாப்பிள்ளைக்கு'} மட்டும் உள்ளது — ஜோதிடருடன் கலந்து பேசுங்கள்; இது பொதுவானது, பயம் வேண்டாம்` });
    else notes.push({ key, status: 'none', ok: true, comparison, en: `${d.en}: none`, ta: `${d.ta}: இல்லை` });
  }
  return notes;
}
