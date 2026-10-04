// Deep marriage checks beyond the 10 poruthams (முழுமையான திருமணப் பொருத்தம்):
// Ayul Balam (long-life strength), Papa Samyam, Dasa Sandhi, Lagna porutham and the
// marriage-related bhavas (2, 5, 7, 8) of each person. Rule-based and explainable.
// Ayul is reported only as strength (strong / medium / needs care) — never as a number of years.
import { RASIS, PLANETS } from './astro.js';
import { grahaStrength } from './remedies.js';
import { bhavaAnalysis } from './analysis.js';

const T = (en, ta) => ({ en, ta });
const DAY = 86400000;
const houseOf = (lagnaRasi, rasi) => ((rasi - lagnaRasi + 12) % 12) + 1;
const lordOf = (lagnaRasi, h) => RASIS[(lagnaRasi + h - 1) % 12].lord;
const FRIENDS = {
  Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'], Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus'],
};
const ENEMIES = {
  Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'], Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars'],
};
const rel = (a, b) => (a === b || FRIENDS[a].includes(b) ? 1 : ENEMIES[a].includes(b) ? -1 : 0);
const level = (s) => (s >= 62 ? 'strong' : s >= 47 ? 'medium' : 'care');
const bound = (s) => Math.max(15, Math.min(95, Math.round(s)));

/** Ayul Balam — long-life strength from lagna lord, 8th lord, Saturn (ayush karaka), Moon and Jupiter's protection. */
export function ayulBalam(chart) {
  const P = chart.planets;
  const L = P.Lagna.rasi;
  const st = Object.fromEntries(grahaStrength(P).map((g) => [g.planet, g.score]));
  const reasons = [];
  let s = 50;
  const add = (pts, en, ta) => { s += pts; reasons.push(T(en, ta)); };
  const lagnaLord = lordOf(L, 1), eighthLord = lordOf(L, 8);
  s += (st[lagnaLord] - 55) / 3;
  reasons.push(T(`Lagna lord ${lagnaLord}: strength ${st[lagnaLord]}`, `லக்னாதிபதி ${PLANETS[lagnaLord].ta}: பலம் ${st[lagnaLord]}`));
  if (eighthLord !== lagnaLord) {
    s += (st[eighthLord] - 55) / 4;
    reasons.push(T(`8th lord (ayul sthanam) ${eighthLord}: strength ${st[eighthLord]}`, `8-ம் அதிபதி (ஆயுள் ஸ்தானம்) ${PLANETS[eighthLord].ta}: பலம் ${st[eighthLord]}`));
  }
  s += (st.Saturn - 55) / 5;
  reasons.push(T(`Saturn (karaka of longevity): strength ${st.Saturn}`, `சனி (ஆயுள் காரகன்): பலம் ${st.Saturn}`));
  s += (st.Moon - 55) / 6;
  const jh = houseOf(L, P.Jupiter.rasi);
  if ([1, 5, 7, 9].includes(jh)) add(8, 'Jupiter protects the lagna by aspect', 'குரு லக்னத்தைப் பார்க்கிறார் — பாதுகாப்பு');
  if ([1, 4, 7, 10].includes(jh)) add(5, 'Jupiter in a kendra — a shield for health', 'குரு கேந்திரத்தில் — ஆரோக்கியக் கவசம்');
  const mal8 = ['Mars', 'Saturn', 'Rahu', 'Ketu', 'Sun'].filter((k) => houseOf(L, P[k].rasi) === 8);
  if (mal8.length) add(-5 * mal8.length, `${mal8.join(', ')} in the 8th — be careful with health and travel`, `8-ல் ${mal8.map((k) => PLANETS[k].ta).join(', ')} — ஆரோக்கியம், பயணத்தில் கவனம்`);
  const lagnaLordHouse = houseOf(L, P[lagnaLord].rasi);
  if ([6, 8, 12].includes(lagnaLordHouse)) add(-6, `Lagna lord in the ${lagnaLordHouse}th house`, `லக்னாதிபதி ${lagnaLordHouse}-ம் வீட்டில்`);
  else if ([1, 4, 5, 7, 9, 10].includes(lagnaLordHouse)) add(5, `Lagna lord well placed in the ${lagnaLordHouse}th`, `லக்னாதிபதி ${lagnaLordHouse}-ல் நன்று`);
  const score = bound(s);
  const lv = level(score);
  const text = {
    strong: T('Strong ayul balam — good vitality; keep healthy habits.', 'வலுவான ஆயுள் பலம் — நல்ல உயிர்ச்சக்தி; நல்ல பழக்கங்களைத் தொடருங்கள்.'),
    medium: T('Medium ayul balam — regular health check-ups and daily prayer keep it steady.', 'நடுத்தர ஆயுள் பலம் — வழக்கமான மருத்துவப் பரிசோதனையும் தினசரி வழிபாடும் உறுதியாக்கும்.'),
    care: T('Ayul balam needs care — annual health check-ups, disciplined food and sleep, and Mrityunjaya prayer are advised.', 'ஆயுள் பலத்திற்குக் கவனம் தேவை — ஆண்டுதோறும் மருத்துவப் பரிசோதனை, ஒழுங்கான உணவு, உறக்கம், மிருத்யுஞ்ஜய வழிபாடு நல்லது.'),
  }[lv];
  return { score, level: lv, text, reasons };
}

/** Papa Samyam — malefic weight in houses 1, 2, 4, 7, 8, 12 counted from Lagna, Moon and Venus. */
export function papaPoints(chart) {
  const P = chart.planets;
  const W = { Mars: 1, Saturn: 1, Rahu: 1, Ketu: 1, Sun: 0.5 };
  const refs = [['Lagna', P.Lagna.rasi], ['Moon', P.Moon.rasi], ['Venus', P.Venus.rasi]];
  let total = 0;
  const detail = [];
  for (const [ref, r] of refs) {
    let sub = 0;
    for (const [k, w] of Object.entries(W)) if ([1, 2, 4, 7, 8, 12].includes(houseOf(r, P[k].rasi))) sub += w;
    // Moon and Venus references carry slightly less weight than Lagna.
    const weighted = ref === 'Lagna' ? sub : sub * 0.5;
    total += weighted;
    detail.push({ ref, points: sub });
  }
  return { total: Math.round(total * 10) / 10, detail };
}

/** Dasa Sandhi: Maha Dasa changes of both falling close together (or close to the wedding). */
export function dasaSandhi(a, b, weddingDate, years = 20) {
  const end = weddingDate.getTime() + years * 365.25 * DAY;
  const changes = (c) => c.dasa.periods.map((p) => p.start.getTime()).filter((t) => t > weddingDate.getTime() - 180 * DAY && t < end);
  const ca = changes(a), cb = changes(b);
  const clashes = [];
  for (const x of ca) for (const y of cb) if (Math.abs(x - y) < 183 * DAY) clashes.push(new Date(Math.min(x, y)));
  const nearWedding = [...ca, ...cb].filter((t) => Math.abs(t - weddingDate.getTime()) < 183 * DAY).map((t) => new Date(t));
  return { clashes, nearWedding, ok: !clashes.length && !nearWedding.length };
}

/** Lagna porutham: relation of lagna lords and distance between the two lagnas (and moons). */
export function lagnaPorutham(a, b) {
  const la = a.planets.Lagna.rasi, lb = b.planets.Lagna.rasi;
  const reasons = [];
  let s = 55;
  const r1 = rel(RASIS[la].lord, RASIS[lb].lord), r2 = rel(RASIS[lb].lord, RASIS[la].lord);
  s += 8 * (r1 + r2);
  reasons.push(T(`Lagna lords ${RASIS[la].lord} & ${RASIS[lb].lord}: ${r1 + r2 > 0 ? 'friendly' : r1 + r2 < 0 ? 'unfriendly' : 'neutral'}`,
    `லக்னாதிபதிகள் ${PLANETS[RASIS[la].lord].ta} & ${PLANETS[RASIS[lb].lord].ta}: ${r1 + r2 > 0 ? 'நட்பு' : r1 + r2 < 0 ? 'பகை' : 'சமம்'}`));
  const h = houseOf(la, lb);
  if ([1, 5, 7, 9].includes(h)) { s += 10; reasons.push(T('The two lagnas are in harmony (1/5/7/9)', 'இரு லக்னங்களும் இணக்கம் (1/5/7/9)')); }
  if ([6, 8].includes(h) || h === 12 || h === 2) { s -= 8; reasons.push(T(`The lagnas are ${h === 6 || h === 8 ? '6/8 (shashtashtakam)' : '2/12'} apart — patience needed`, `லக்னங்கள் ${h === 6 || h === 8 ? '6/8 (சஷ்டாஷ்டகம்)' : '2/12'} — பொறுமை தேவை`)); }
  // One's Moon in the other's 7th = natural attraction.
  if (houseOf(la, b.planets.Moon.rasi) === 7 || houseOf(lb, a.planets.Moon.rasi) === 7) { s += 8; reasons.push(T('Moon of one falls in the other\'s 7th — natural attraction', 'ஒருவரின் சந்திரன் மற்றவரின் 7-ல் — இயல்பான ஈர்ப்பு')); }
  return { score: bound(s), reasons };
}

const HOUSE_CHECKS = [
  { house: 7, en: 'Married life (7th house)', ta: 'மண வாழ்க்கை (7-ம் பாவம்)', karaka: 'Venus' },
  { house: 2, en: 'Family & speech (2nd)', ta: 'குடும்பம், வாக்கு (2-ம்)', karaka: 'Jupiter' },
  { house: 5, en: 'Children (5th)', ta: 'புத்திர பாக்கியம் (5-ம்)', karaka: 'Jupiter' },
  { house: 8, en: 'Mangalyam & long life (8th)', ta: 'மாங்கல்யம், ஆயுள் (8-ம்)', karaka: 'Saturn' },
  { house: 11, en: 'Income & gains (11th)', ta: 'வருமானம், லாபம் (11-ம்)', karaka: 'Jupiter' },
];

/** Bhava checks for one person: the houses that decide a happy marriage. */
export function marriageHouses(chart) {
  const bh = bhavaAnalysis(chart);
  const st = Object.fromEntries(grahaStrength(chart.planets).map((g) => [g.planet, g.score]));
  return HOUSE_CHECKS.map((c) => {
    const b = bh[c.house - 1];
    const score = bound(b.score * 0.75 + st[c.karaka] * 0.25);
    const notes = [...b.notes];
    if (b.occupants.length) notes.push(T(`Planets here: ${b.occupants.join(', ')}`, `இங்கு உள்ள கிரகங்கள்: ${b.occupants.map((k) => PLANETS[k].ta).join(', ')}`));
    notes.push(T(`Karaka ${c.karaka}: strength ${st[c.karaka]}`, `காரகன் ${PLANETS[c.karaka].ta}: பலம் ${st[c.karaka]}`));
    return { house: c.house, name: T(c.en, c.ta), score, level: level(score), notes };
  });
}

/** All deep checks for a couple. */
export function deepMarriageChecks(bride, groom, weddingDate = new Date()) {
  const ayul = { bride: ayulBalam(bride), groom: ayulBalam(groom) };
  const papa = { bride: papaPoints(bride), groom: papaPoints(groom) };
  const papaOk = papa.groom.total >= papa.bride.total - 0.5;
  const sandhi = dasaSandhi(bride, groom, weddingDate);
  const lagna = lagnaPorutham(bride, groom);
  const houses = { bride: marriageHouses(bride), groom: marriageHouses(groom) };
  const checks = [
    {
      id: 'ayul', name: T('Ayul Balam (long-life strength) of both', 'இருவரின் ஆயுள் பலம்'),
      ok: ayul.bride.level !== 'care' && ayul.groom.level !== 'care',
      note: ayul.bride.level === 'care' || ayul.groom.level === 'care'
        ? T('One chart needs health care — check the full horoscope with your family astrologer and do Mrityunjaya prayer together.', 'ஒரு ஜாதகத்தில் ஆரோக்கியக் கவனம் தேவை — குடும்ப ஜோதிடரிடம் முழு ஜாதகம் பார்த்து, சேர்ந்து மிருத்யுஞ்ஜய வழிபாடு செய்யுங்கள்.')
        : T('Both charts show good vitality.', 'இரு ஜாதகங்களிலும் நல்ல உயிர்ச்சக்தி.'),
    },
    {
      id: 'papa', name: T('Papa Samyam (balance of malefics)', 'பாப சாம்யம்'),
      ok: papaOk,
      note: papaOk
        ? T(`Balanced — groom ${papa.groom.total}, bride ${papa.bride.total} points.`, `சமநிலை — மணமகன் ${papa.groom.total}, மணப்பெண் ${papa.bride.total} புள்ளிகள்.`)
        : T(`Bride ${papa.bride.total} vs groom ${papa.groom.total} — the bride's malefic weight is higher; parigaram and careful matching advised.`, `மணப்பெண் ${papa.bride.total} / மணமகன் ${papa.groom.total} — மணப்பெண்ணின் பாபம் அதிகம்; பரிகாரமும் கவனமான பொருத்தமும் தேவை.`),
    },
    {
      id: 'sandhi', name: T('Dasa Sandhi (both dasas changing together)', 'தசா சந்தி'),
      ok: sandhi.ok,
      note: sandhi.ok
        ? T('No Maha Dasa clash near the wedding or between the two.', 'திருமண நேரத்திலோ இருவருக்கும் இடையிலோ தசா சந்தி இல்லை.')
        : T(`Dasa change close together in ${[...sandhi.nearWedding, ...sandhi.clashes].map((d) => d.getUTCFullYear()).filter((y, i, a) => a.indexOf(y) === i).join(', ')} — plan big decisions calmly in those years and pray together.`,
          `${[...sandhi.nearWedding, ...sandhi.clashes].map((d) => d.getUTCFullYear()).filter((y, i, a) => a.indexOf(y) === i).join(', ')} ஆண்டுகளில் தசை மாற்றம் அருகருகே — அப்போது பெரிய முடிவுகளை நிதானமாக எடுங்கள், சேர்ந்து வழிபடுங்கள்.`),
    },
    {
      id: 'lagna', name: T('Lagna Porutham', 'லக்னப் பொருத்தம்'),
      ok: lagna.score >= 50,
      note: T(`${lagna.score}/100 — ${lagna.reasons.map((r) => r.en).join('; ')}`, `${lagna.score}/100 — ${lagna.reasons.map((r) => r.ta).join('; ')}`),
    },
    ...HOUSE_CHECKS.map((c, i) => {
      const b = houses.bride[i], g = houses.groom[i];
      return {
        id: `h${c.house}`, name: T(c.en, c.ta), ok: b.level !== 'care' && g.level !== 'care',
        note: T(`Bride ${b.score}, groom ${g.score}`, `மணப்பெண் ${b.score}, மணமகன் ${g.score}`),
      };
    }),
  ];
  const passed = checks.filter((c) => c.ok).length;
  const score = Math.round(
    (ayul.bride.score + ayul.groom.score) / 2 * 0.25
    + lagna.score * 0.15
    + (papaOk ? 80 : 45) * 0.15
    + (sandhi.ok ? 80 : 55) * 0.1
    + HOUSE_CHECKS.reduce((s, _, i) => s + (houses.bride[i].score + houses.groom[i].score) / 2, 0) / HOUSE_CHECKS.length * 0.35,
  );
  return { ayul, papa, papaOk, sandhi, lagna, houses, checks, passed, score };
}
